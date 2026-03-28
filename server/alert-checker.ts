import * as crmDb from "./crmDb";
import { getDb } from "./db";
import { crmLeadDistribution, sellers } from "../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";

const SDR_THRESHOLD_MINUTES = 5;
const SELLER_THRESHOLD_MINUTES = 10;

/** Auto-assign an unassigned lead to the next SDR via round-robin */
async function autoAssignToSDR(leadId: number, department: string): Promise<boolean> {
  try {
    const database = await getDb();
    if (!database) return false;

    const [config] = await database.select().from(crmLeadDistribution)
      .where(eq(crmLeadDistribution.department, department)).limit(1);
    if (!config || !config.enabled) return false;

    const deptSellers = await database.select().from(sellers)
      .where(and(eq(sellers.department, department), eq(sellers.active, true)))
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

    console.log(`[Alert Checker] Lead #${leadId} atribuído ao SDR ${nextSeller.name} (ID: ${nextSeller.id})`);
    return true;
  } catch (err) {
    console.error("[Alert Checker] Erro ao atribuir SDR:", err);
    return false;
  }
}

/** Check for unresponded leads and auto-reassign if needed */
async function checkAlerts() {
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

    // 2. Check seller alerts (leads with sellerId>0 unresponded for 10+ min) and auto-reassign
    const sellerAlerts = await crmDb.getUnrespondedLeads(SELLER_THRESHOLD_MINUTES);
    const sellerUnresponded = sellerAlerts.filter(l => l.sellerId > 0);
    
    for (const lead of sellerUnresponded) {
      console.log(`[Alert Checker] Lead #${lead.id} (${lead.name}) sem resposta do vendedor #${lead.sellerId} por ${SELLER_THRESHOLD_MINUTES}+ min. Auto-reatribuindo...`);
      const result = await crmDb.autoReassignLead(lead.id);
      if (result) {
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

  console.log(`[Alert Checker] Scheduled every ${intervalMinutes} minutes (SDR: ${SDR_THRESHOLD_MINUTES}min, Vendedor: ${SELLER_THRESHOLD_MINUTES}min)`);
}

export function stopAlertChecker() {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
}
