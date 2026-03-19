import webpush from "web-push";
import { getAllPushSubscriptions, deletePushSubscription, getPushSubscriptionsBySeller } from "./db";

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:kafka@kafkarank.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
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
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payloadStr,
          { TTL: 3600 }
        );
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`[Push] Removing expired subscription: ${sub.endpoint.substring(0, 50)}...`);
          await deletePushSubscription(sub.endpoint);
        } else {
          console.error(`[Push] Error sending to ${sub.endpoint.substring(0, 50)}:`, error.message);
        }
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  console.log(`[Push] Sent ${sent}/${subscriptions.length} notifications`);
}

// ===== ENVIAR PARA TODOS =====
export async function sendPushToAll(payload: PushPayload) {
  const subscriptions = await getAllPushSubscriptions();
  await sendToSubscriptions(subscriptions, payload);
}

// ===== ENVIAR PARA UM VENDEDOR ESPECÍFICO =====
export async function sendPushToSeller(sellerId: number, payload: PushPayload) {
  const subscriptions = await getPushSubscriptionsBySeller(sellerId);
  await sendToSubscriptions(subscriptions, payload);
}

// ===== NOTIFICAÇÕES ESPECÍFICAS =====

// Admin/Gerente: nova venda pendente para aprovar
export async function sendPushPendingSale(sellerName: string, vehicleModel: string, category: string) {
  await sendPushToAll({
    title: "📋 Nova venda para aprovar!",
    body: `${sellerName} registrou: ${vehicleModel} (${category}). Acesse o painel para aprovar.`,
    tag: "pending-sale",
    data: { type: "pending_sale", url: "/admin/aprovacoes" },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
  });
}

// Admin/Gerente: novo registro F&I/Consignação/Despachante pendente
export async function sendPushPendingRecord(sellerName: string, recordType: string, details: string) {
  await sendPushToAll({
    title: `📋 Novo ${recordType} para aprovar!`,
    body: `${sellerName}: ${details}`,
    tag: `pending-${recordType.toLowerCase()}`,
    data: { type: "pending_record", url: "/admin/aprovacoes" },
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
  });
}

// Vendedor: venda aprovada
export async function sendPushSaleApproved(sellerName: string, vehicleModel: string) {
  await sendPushToAll({
    title: "✅ Venda Aprovada!",
    body: `A venda de ${sellerName} (${vehicleModel}) foi aprovada! Ranking atualizado.`,
    tag: "sale-approved",
    data: { type: "approved" },
    vibrate: [200, 100, 200],
  });
}

// Todos: nova venda registrada (alerta geral)
export async function sendPushNewSale(sellerName: string, vehicleModel: string, value: number) {
  await sendPushToAll({
    title: "🏎️ Nova Venda Registrada!",
    body: `${sellerName} vendeu um ${vehicleModel}${value ? ` por R$ ${value.toLocaleString("pt-BR")}` : ''}!`,
    tag: "new-sale",
    data: { type: "sale" },
    vibrate: [200, 100, 200],
  });
}

// Vendedor específico: agendamento expirando
export async function sendPushAppointmentExpiring(sellerId: number, customerName: string, minutesLeft: number) {
  await sendPushToSeller(sellerId, {
    title: "⏰ Agendamento expirando!",
    body: minutesLeft <= 0
      ? `O cliente ${customerName} não compareceu! Ligue agora para reagendar.`
      : `O cliente ${customerName} chega em ${minutesLeft} minutos! Prepare-se.`,
    tag: `appointment-${sellerId}`,
    data: { type: "appointment_expiring", url: `/agendamentos/${sellerId}` },
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
  });
}

// Vendedor específico: cliente no resgate (48h+)
export async function sendPushRescueAlert(sellerId: number, customerName: string) {
  await sendPushToSeller(sellerId, {
    title: "🚨 RESGATE URGENTE!",
    body: `O cliente ${customerName} não compareceu há mais de 48h! Ligue AGORA para não perder essa venda.`,
    tag: `rescue-${sellerId}`,
    data: { type: "rescue", url: `/agendamentos/${sellerId}` },
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500],
  });
}

// Todos: ultrapassagem no ranking
export async function sendPushOvertake(sellerName: string, overtakenName: string, position: number) {
  await sendPushToAll({
    title: "🔥 Ultrapassagem no Ranking!",
    body: `${sellerName} ultrapassou ${overtakenName} e agora está em ${position}º lugar!`,
    tag: "overtake",
    data: { type: "overtake" },
    vibrate: [200, 100, 200, 100, 200],
  });
}

// Todos: nova competição
export async function sendPushNewCompetition(competitionName: string) {
  await sendPushToAll({
    title: "🏁 Nova Competição!",
    body: `A competição "${competitionName}" começou! Acesse o app e confira.`,
    tag: "new-competition",
    data: { type: "competition" },
    vibrate: [200, 100, 200],
  });
}

// Vendedor específico: alerta de inatividade (8h sem acessar)
export async function sendPushInactivityAlert(sellerId: number, sellerName: string) {
  await sendPushToSeller(sellerId, {
    title: "👋 Sentimos sua falta!",
    body: `${sellerName}, faz tempo que você não acessa o Kafka Rank! Confira o ranking e não fique para trás.`,
    tag: `inactivity-${sellerId}`,
    data: { type: "inactivity", url: "/" },
    requireInteraction: true,
    vibrate: [200, 100, 200],
  });
}

// Vendedor específico: comparecimento aprovado pelo gerente
export async function sendPushAttendanceApproved(sellerId: number, customerName: string) {
  await sendPushToSeller(sellerId, {
    title: "✅ Comparecimento Aprovado!",
    body: `O comparecimento do cliente ${customerName} foi aprovado pelo gerente! +1 ponto.`,
    tag: `attendance-${sellerId}`,
    data: { type: "attendance_approved", url: `/agendamentos/${sellerId}` },
    vibrate: [200, 100, 200],
  });
}
