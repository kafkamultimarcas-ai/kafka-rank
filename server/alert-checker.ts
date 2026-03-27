import * as crmDb from "./crmDb";

const SDR_THRESHOLD_MINUTES = 5;
const SELLER_THRESHOLD_MINUTES = 10;

/** Check for unresponded leads and auto-reassign if needed */
async function checkAlerts() {
  try {
    // 1. Check SDR alerts (leads with sellerId=0 unresponded for 5+ min)
    const sdrAlerts = await crmDb.getUnrespondedLeads(SDR_THRESHOLD_MINUTES);
    const sdrUnresponded = sdrAlerts.filter(l => l.sellerId === 0);
    if (sdrUnresponded.length > 0) {
      console.log(`[Alert Checker] ${sdrUnresponded.length} leads aguardando SDR há mais de ${SDR_THRESHOLD_MINUTES} min`);
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
