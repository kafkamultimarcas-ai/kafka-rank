import * as crmDb from "./crmDb";
import { getDb, withRetry, createNotification } from "./db";
import { crmLeadDistribution, sellers, crmLeads } from "../drizzle/schema";
import { eq, and, asc, ne, sql } from "drizzle-orm";
import { sendPushLeadTransferred } from "./pushService";

const SDR_THRESHOLD_MINUTES = 5;
const SELLER_THRESHOLD_MINUTES = 10;
const SDR_TRANSFER_WARNING_MINUTES = 8; // Aviso ao SDR que lead será transferido em 2min

/** Auto-assign an unassigned lead to the next SDR via round-robin */
async function autoAssignToSDR(leadId: number, department: string): Promise<boolean> {
  try {
    const database = await getDb();
    if (!database) return false;

    const [config] = await database.select().from(crmLeadDistribution)
      .where(eq(crmLeadDistribution.department, department)).limit(1);
    if (!config || !config.enabled) return false;

    const deptSellers = await database.select().from(sellers)
      .where(and(eq(sellers.department, department), eq(sellers.active, true), ne(sellers.sellerRole, "gerente")))
      .orderBy(asc(sellers.id));

    if (deptSellers.length === 0) return false;

    let nextSeller;
    if (config.lastAssignedSellerId) {
      const idx = deptSellers.findIndex(s => s.id === config.lastAssignedSellerId);
      nextSeller = deptSellers[(idx + 1) % deptSellers.length];
    } else {
      nextSeller = deptSellers[0];
    }

    await crmDb.updateLead(leadId, { sellerId: nextSeller.id });
    await database.update(crmLeadDistribution)
      .set({ lastAssignedSellerId: nextSeller.id })
      .where(eq(crmLeadDistribution.department, department));

    await crmDb.createActivity({
      leadId,
      sellerId: nextSeller.id,
      type: "observacao",
      description: `Lead atribuído automaticamente ao SDR/vendedor ${nextSeller.name} (sem resposta por ${SDR_THRESHOLD_MINUTES}+ min).`,
    });

    // Notificar o vendedor que recebeu o lead
    const lead = await crmDb.getLeadById(leadId);
    sendPushLeadTransferred(nextSeller.id, lead?.name || 'Lead', null).catch(console.error);
    createNotification({
      title: '🚨 NOVO LEAD AUTOMÁTICO!',
      message: `${lead?.name || 'Lead'} foi atribuído a você automaticamente. Responda em até ${SELLER_THRESHOLD_MINUTES} minutos!`,
      type: 'urgent',
      sellerId: nextSeller.id,
      targetType: 'seller',
    }).catch(console.error);

    console.log(`[Alert Checker] Lead #${leadId} atribuído ao SDR ${nextSeller.name} (ID: ${nextSeller.id})`);
    return true;
  } catch (err) {
    console.error("[Alert Checker] Erro ao atribuir SDR:", err);
    return false;
  }
}

/** Send warning to SDR that lead will be transferred soon */
async function sendTransferWarning(lead: any): Promise<void> {
  try {
    if (!lead.sellerId || lead.sellerId === 0) return;
    
    const minutesLeft = SELLER_THRESHOLD_MINUTES - SDR_TRANSFER_WARNING_MINUTES;
    
    // Create notification for the current seller
    await createNotification({
      title: '⚠️ LEAD SERÁ TRANSFERIDO!',
      message: `${lead.name || 'Lead'} será transferido para outro vendedor em ${minutesLeft} minutos se não responder! Responda AGORA!`,
      type: 'urgent',
      sellerId: lead.sellerId,
      targetType: 'seller',
    });

    // Log activity
    await crmDb.createActivity({
      leadId: lead.id,
      sellerId: lead.sellerId,
      type: "observacao",
      description: `⚠️ Aviso: lead será transferido em ${minutesLeft}min se não houver resposta.`,
    });

    console.log(`[Alert Checker] Aviso de transferência enviado para vendedor #${lead.sellerId} sobre lead #${lead.id}`);
  } catch (err) {
    console.error("[Alert Checker] Erro ao enviar aviso de transferência:", err);
  }
}

/** Check for unresponded leads and auto-reassign if needed. */
async function checkAlerts() {
  try {
    await withRetry(async () => { await _checkAlertsInner(); });
  } catch (err) {
    console.error("[Alert Checker] Error:", err);
  }
}

// Track which leads already received transfer warning to avoid spam
const warnedLeads = new Set<number>();

async function _checkAlertsInner() {
  try {
    // 1. Check SDR alerts (leads with sellerId=0 unresponded for 5+ min) - try to auto-assign
    const sdrAlerts = await crmDb.getUnrespondedLeads(SDR_THRESHOLD_MINUTES);
    const sdrUnresponded = sdrAlerts.filter(l => l.sellerId === 0);
    if (sdrUnresponded.length > 0) {
      console.log(`[Alert Checker] ${sdrUnresponded.length} leads aguardando SDR há mais de ${SDR_THRESHOLD_MINUTES} min`);
      for (const lead of sdrUnresponded) {
        await autoAssignToSDR(lead.id, lead.department || "vendas");
      }
    }

    // 2. Send transfer warnings (8min without response - 2min before transfer)
    const warningAlerts = await crmDb.getUnrespondedLeads(SDR_TRANSFER_WARNING_MINUTES);
    const warningLeads = warningAlerts.filter(l => l.sellerId > 0);
    for (const lead of warningLeads) {
      if (!warnedLeads.has(lead.id)) {
        // Check if this lead is NOT yet at the transfer threshold
        const createdTs = typeof lead.createdAt === 'number' ? lead.createdAt : new Date(lead.createdAt!).getTime();
        const minutesSinceCreation = (Date.now() - createdTs) / 60000;
        if (minutesSinceCreation < SELLER_THRESHOLD_MINUTES) {
          await sendTransferWarning(lead);
          warnedLeads.add(lead.id);
          // Clean up old entries after 30 minutes
          setTimeout(() => warnedLeads.delete(lead.id), 30 * 60 * 1000);
        }
      }
    }

    // 3. Check seller alerts (leads with sellerId>0 unresponded for 10+ min) and auto-reassign
    const sellerAlerts = await crmDb.getUnrespondedLeads(SELLER_THRESHOLD_MINUTES);
    const sellerUnresponded = sellerAlerts.filter(l => l.sellerId > 0);
    
    for (const lead of sellerUnresponded) {
      // Check if lead is in active negotiation - don't transfer
      if (lead.stage === 'Em Negociacao' || lead.stage === 'Em Negociação') {
        console.log(`[Alert Checker] Lead #${lead.id} em negociação ativa - não transferir`);
        continue;
      }
      
      console.log(`[Alert Checker] Lead #${lead.id} (${lead.name}) sem resposta do vendedor #${lead.sellerId} por ${SELLER_THRESHOLD_MINUTES}+ min. Auto-reatribuindo...`);
      const result = await crmDb.autoReassignLead(lead.id);
      if (result) {
        // Notify old seller that lead was taken
        createNotification({
          title: '📤 LEAD TRANSFERIDO',
          message: `${lead.name || 'Lead'} foi transferido para ${result.newSellerName} por falta de resposta em ${SELLER_THRESHOLD_MINUTES} minutos.`,
          type: 'info',
          sellerId: lead.sellerId,
          targetType: 'seller',
        }).catch(console.error);

        // Notify new seller
        sendPushLeadTransferred(result.newSellerId, lead.name || 'Lead', null).catch(console.error);
        createNotification({
          title: '📲 LEAD TRANSFERIDO PARA VOCÊ!',
          message: `${lead.name || 'Lead'} foi transferido para você. Responda agora!`,
          type: 'urgent',
          sellerId: result.newSellerId,
          targetType: 'seller',
        }).catch(console.error);

        // Clean up warning tracker
        warnedLeads.delete(lead.id);
        
        console.log(`[Alert Checker] Lead #${lead.id} transferido para ${result.newSellerName} (ID: ${result.newSellerId})`);
      } else {
        console.log(`[Alert Checker] Não foi possível reatribuir lead #${lead.id} (sem vendedores disponíveis)`);
      }
    }
  } catch (err) {
    console.error("[Alert Checker] Error:", err);
  }
}

let alertInterval: ReturnType<typeof setInterval> | null = null;

export function startAlertChecker(intervalMinutes: number = 2) {
  // Run first check after 30 seconds (give server time to start)
  setTimeout(() => checkAlerts().catch(console.error), 30000);
  
  // Then run periodically
  alertInterval = setInterval(() => {
    checkAlerts().catch(console.error);
  }, intervalMinutes * 60 * 1000);

  console.log(`[Alert Checker] Scheduled every ${intervalMinutes} minutes (SDR: ${SDR_THRESHOLD_MINUTES}min, Vendedor: ${SELLER_THRESHOLD_MINUTES}min, Warning: ${SDR_TRANSFER_WARNING_MINUTES}min)`);
}

export function stopAlertChecker() {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
}
