import * as crmDb from "./crmDb";
import { getDb, listSdrRecords, getSellerById } from "./db";
import { crmLeadDistribution, sellers, sdrRecords } from "../drizzle/schema";
import { eq, and, asc, gt, isNull, lt, sql } from "drizzle-orm";
import * as zapi from "./zapi-service";
import { invokeLLM } from "./_core/llm";

const SDR_THRESHOLD_MINUTES = 5;
const SELLER_THRESHOLD_MINUTES = 10;
const APPOINTMENT_FOLLOWUP_MINUTES = 20;

// Track which appointments already got a follow-up to avoid duplicates
const sentFollowUps = new Set<number>();

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

/** Check appointments that are 20+ min past scheduled time and send AI follow-up via WhatsApp */
async function checkAppointmentFollowUp() {
  try {
    const database = await getDb();
    if (!database) return;

    const now = Date.now();
    const cutoff = now - APPOINTMENT_FOLLOWUP_MINUTES * 60 * 1000;

    // Get all appointments with status pending and scheduledDate that is 20+ min in the past
    const pendingAppointments = await database.select().from(sdrRecords)
      .where(and(
        eq(sdrRecords.type, 'agendamento'),
        eq(sdrRecords.status, 'approved'),
        eq(sdrRecords.attendanceStatus, 'pending'),
      ));

    for (const apt of pendingAppointments) {
      // Only process if scheduled date is 20+ min in the past
      const scheduledDate = apt.scheduledDate ? Number(apt.scheduledDate) : null;
      if (!scheduledDate || scheduledDate > cutoff) continue;
      // Only process if not too old (within 24h)
      if (scheduledDate < now - 24 * 60 * 60 * 1000) continue;

      // Skip if already sent follow-up for this appointment
      if (sentFollowUps.has(apt.id)) continue;

      // Must have a phone number
      if (!apt.customerPhone) continue;

      // Mark as sent before sending to avoid duplicates
      sentFollowUps.add(apt.id);

      try {
        const seller = await getSellerById(apt.sellerId);
        const sellerName = seller?.name || 'nosso consultor';

        // Use AI to generate a follow-up message
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: `Você é um assistente de vendas da loja de veículos Kafka. Gere uma mensagem curta e simpática de follow-up para um cliente que tinha um agendamento. A mensagem deve:
- Ser informal e amigável (emoji com moderação)
- Mencionar o nome do cliente
- Perguntar se o vendedor já entrou em contato
- Se não, oferecer ajuda para conectar
- Ser curta (máximo 3 linhas)
- NÃO incluir saudação formal, NÃO incluir assinatura
- Responder APENAS com o texto da mensagem`
            },
            {
              role: 'user',
              content: `Cliente: ${apt.customerName}\nVendedor responsável: ${sellerName}\nInteresse: ${apt.vehicleInterest || 'veículo'}\nHorário agendado: ${new Date(scheduledDate).toLocaleString('pt-BR')}`
            }
          ],
        });

        const rawMsg = response.choices?.[0]?.message?.content;
        const followUpMsg = typeof rawMsg === 'string' ? rawMsg : `Olá ${apt.customerName}! 😊 Tudo certo? O ${sellerName} já entrou em contato com você? Se precisar de algo, estamos aqui para ajudar!`;

        const result = await zapi.sendText(apt.customerPhone, followUpMsg);
        if (result.success) {
          console.log(`[Follow-Up] Mensagem de follow-up enviada para ${apt.customerName} (${apt.customerPhone}) - Agendamento #${apt.ticketNumber}`);
        } else {
          console.error(`[Follow-Up] Erro ao enviar para ${apt.customerPhone}: ${result.error}`);
          // Remove from set so it can retry next cycle
          sentFollowUps.delete(apt.id);
        }
      } catch (err) {
        console.error(`[Follow-Up] Erro ao processar agendamento #${apt.id}:`, err);
        sentFollowUps.delete(apt.id);
      }
    }
  } catch (err) {
    console.error("[Follow-Up] Error:", err);
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

    // 3. Check appointment follow-ups (20 min after scheduled time)
    await checkAppointmentFollowUp();
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

  console.log(`[Alert Checker] Scheduled every ${intervalMinutes} minutes (SDR: ${SDR_THRESHOLD_MINUTES}min, Vendedor: ${SELLER_THRESHOLD_MINUTES}min, Follow-up: ${APPOINTMENT_FOLLOWUP_MINUTES}min)`);
}

export function stopAlertChecker() {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
}
