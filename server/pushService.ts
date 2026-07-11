import webpush from "web-push";
import { deletePushSubscription, getAllPushSubscriptions, getPushSubscriptionsBySeller } from "./db";
import { buildCurrentTenantPath, buildSellerTenantPath } from "./tenantUrls";

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails("mailto:kafka@kafkarank.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  vibrate?: number[];
}

async function sendToSubscriptions(subscriptions: any[], payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured, skipping push");
    return;
  }
  if (subscriptions.length === 0) return;

  const payloadStr = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payloadStr,
          { TTL: 3600 },
        );
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`[Push] Removing expired subscription: ${subscription.endpoint.substring(0, 50)}...`);
          await deletePushSubscription(subscription.endpoint);
        } else {
          console.error(`[Push] Error sending to ${subscription.endpoint.substring(0, 50)}:`, error.message);
        }
      }
    }),
  );

  const sent = results.filter((result) => result.status === "fulfilled").length;
  console.log(`[Push] Sent ${sent}/${subscriptions.length} notifications`);
}

export async function sendPushToAll(payload: PushPayload) {
  const subscriptions = await getAllPushSubscriptions();
  await sendToSubscriptions(subscriptions, payload);
}

export async function sendPushToSeller(sellerId: number, payload: PushPayload) {
  const subscriptions = await getPushSubscriptionsBySeller(sellerId);
  await sendToSubscriptions(subscriptions, payload);
}

export async function sendPushPendingSale(sellerName: string, vehicleModel: string, category: string) {
  await sendPushToAll({
    title: "Nova venda para aprovar!",
    body: `${sellerName} registrou: ${vehicleModel} (${category}). Acesse o painel para aprovar.`,
    tag: "pending-sale",
    data: { type: "pending_sale", url: await buildCurrentTenantPath("/admin/aprovacoes") },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
  });
}

export async function sendPushPendingRecord(sellerName: string, recordType: string, details: string) {
  await sendPushToAll({
    title: `Novo ${recordType} para aprovar!`,
    body: `${sellerName}: ${details}`,
    tag: `pending-${recordType.toLowerCase()}`,
    data: { type: "pending_record", url: await buildCurrentTenantPath("/admin/aprovacoes") },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
  });
}

export async function sendPushSaleApproved(sellerName: string, vehicleModel: string) {
  await sendPushToAll({
    title: "Venda aprovada!",
    body: `A venda de ${sellerName} (${vehicleModel}) foi aprovada! Ranking atualizado.`,
    tag: "sale-approved",
    data: { type: "approved" },
    vibrate: [200, 100, 200],
  });
}

export async function sendPushNewSale(sellerName: string, vehicleModel: string, value: number) {
  await sendPushToAll({
    title: "Nova venda registrada!",
    body: `${sellerName} vendeu um ${vehicleModel}${value ? ` por R$ ${value.toLocaleString("pt-BR")}` : ""}!`,
    tag: "new-sale",
    data: { type: "sale" },
    vibrate: [200, 100, 200],
  });
}

export async function sendPushAppointmentExpiring(sellerId: number, customerName: string, minutesLeft: number) {
  await sendPushToSeller(sellerId, {
    title: "Agendamento expirando!",
    body: minutesLeft <= 0
      ? `O cliente ${customerName} não compareceu. Ligue agora para reagendar.`
      : `O cliente ${customerName} chega em ${minutesLeft} minutos! Prepare-se.`,
    tag: `appointment-${sellerId}`,
    data: { type: "appointment_expiring", url: await buildSellerTenantPath(sellerId, `/agendamentos/${sellerId}`) },
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
  });
}

export async function sendPushRescueAlert(sellerId: number, customerName: string) {
  await sendPushToSeller(sellerId, {
    title: "Resgate urgente!",
    body: `O cliente ${customerName} não compareceu há mais de 48h. Ligue agora para não perder essa venda.`,
    tag: `rescue-${sellerId}`,
    data: { type: "rescue", url: await buildSellerTenantPath(sellerId, `/agendamentos/${sellerId}`) },
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500],
  });
}

export async function sendPushOvertake(sellerName: string, overtakenName: string, position: number) {
  await sendPushToAll({
    title: "Ultrapassagem no ranking!",
    body: `${sellerName} ultrapassou ${overtakenName} e agora está em ${position}º lugar!`,
    tag: "overtake",
    data: { type: "overtake" },
    vibrate: [200, 100, 200, 100, 200],
  });
}

export async function sendPushNewCompetition(competitionName: string) {
  await sendPushToAll({
    title: "Nova competição!",
    body: `A competição "${competitionName}" começou! Acesse o app e confira.`,
    tag: "new-competition",
    data: { type: "competition" },
    vibrate: [200, 100, 200],
  });
}

export async function sendPushInactivityAlert(sellerId: number, sellerName: string) {
  await sendPushToSeller(sellerId, {
    title: "Sentimos sua falta!",
    body: `${sellerName}, faz tempo que você não acessa o Kafka Rank. Confira o ranking e não fique para trás.`,
    tag: `inactivity-${sellerId}`,
    data: { type: "inactivity", url: await buildSellerTenantPath(sellerId, `/minha-area/${sellerId}`) },
    requireInteraction: true,
    vibrate: [200, 100, 200],
  });
}

export async function sendPushAttendanceApproved(sellerId: number, customerName: string) {
  await sendPushToSeller(sellerId, {
    title: "Comparecimento aprovado!",
    body: `O comparecimento do cliente ${customerName} foi aprovado pelo gerente! +1 ponto.`,
    tag: `attendance-${sellerId}`,
    data: { type: "attendance_approved", url: await buildSellerTenantPath(sellerId, `/agendamentos/${sellerId}`) },
    vibrate: [200, 100, 200],
  });
}

export async function sendPushToPosVenda(payload: PushPayload) {
  try {
    const { listSellers } = await import("./db");
    const allSellers = await listSellers(true);
    const pvSellers = allSellers.filter((seller: any) => seller.department === "pos_venda");
    for (const seller of pvSellers) {
      const subscriptions = await getPushSubscriptionsBySeller(seller.id);
      await sendToSubscriptions(subscriptions, payload);
    }
  } catch (error) {
    console.error("[Push] Error sending to pos_venda:", error);
  }
}

export async function sendPushDocsPendentes(sellerId: number, sellerName: string, vehicleModel: string) {
  await sendPushToSeller(sellerId, {
    title: "Documentos pendentes!",
    body: `${sellerName}, envie a CNH e o comprovante de residência da venda do ${vehicleModel}. Sua venda só fica 100% concluída com os documentos.`,
    tag: `docs-pendentes-${sellerId}`,
    data: { type: "docs_pendentes", url: await buildSellerTenantPath(sellerId, `/minha-area/${sellerId}`) },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
  });
}

export async function sendPushDocTransferido(sellerId: number, vehicleModel: string) {
  await sendPushToSeller(sellerId, {
    title: "Documento transferido!",
    body: `O documento do ${vehicleModel} foi transferido pelo despachante. Acesse sua área para ver.`,
    tag: `doc-transferido-${sellerId}`,
    data: { type: "doc_transferido", url: await buildSellerTenantPath(sellerId, `/minha-area/${sellerId}`) },
    vibrate: [200, 100, 200],
  });
}

export async function sendPushNewPvChamado(vendedorName: string, clienteNome: string, carroModelo: string, ticketNumber: string) {
  await sendPushToPosVenda({
    title: "Novo chamado de pós-venda!",
    body: `${vendedorName} abriu chamado #${ticketNumber}: ${clienteNome} - ${carroModelo}`,
    tag: `pv-chamado-${ticketNumber}`,
    data: { type: "pv_chamado", url: await buildCurrentTenantPath("/pos-venda") },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
  });

  await sendPushToAll({
    title: "Novo chamado de pós-venda!",
    body: `${vendedorName} abriu chamado #${ticketNumber}: ${clienteNome} - ${carroModelo}`,
    tag: `pv-chamado-admin-${ticketNumber}`,
    data: { type: "pv_chamado", url: await buildCurrentTenantPath("/admin/pos-venda") },
  });
}

export async function sendPushNewLead(
  sellerId: number,
  leadName: string,
  leadPhone: string | null,
  source: string | null,
  vehicleInterest: string | null,
) {
  const sourceLabel = source ? ` (${source})` : "";
  const vehicleLabel = vehicleInterest ? `\nInteresse: ${vehicleInterest}` : "";
  const phoneLabel = leadPhone ? `\nTel: ${leadPhone}` : "";

  await sendPushToSeller(sellerId, {
    title: "Novo lead recebido!",
    body: `${leadName}${sourceLabel}${phoneLabel}${vehicleLabel}\n\nResponda rápido para não perder essa venda.`,
    tag: `new-lead-${sellerId}-${Date.now()}`,
    data: { type: "new_lead", url: await buildSellerTenantPath(sellerId, "/crm") },
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500, 200, 500],
  });
}

export async function sendPushLeadTransferred(sellerId: number, leadName: string, fromSellerName: string | null) {
  const fromLabel = fromSellerName ? ` de ${fromSellerName}` : "";

  await sendPushToSeller(sellerId, {
    title: "Lead transferido para você!",
    body: `${leadName} foi transferido${fromLabel} para você.\nAbra o app e responda agora.`,
    tag: `lead-transferred-${sellerId}-${Date.now()}`,
    data: { type: "lead_transferred", url: await buildSellerTenantPath(sellerId, "/crm") },
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500],
  });
}
