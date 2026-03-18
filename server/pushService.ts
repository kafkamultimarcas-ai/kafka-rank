import webpush from "web-push";
import { getAllPushSubscriptions, deletePushSubscription } from "./db";

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
}

export async function sendPushToAll(payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured, skipping push");
    return;
  }

  const subscriptions = await getAllPushSubscriptions();
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
        // Se a subscription expirou ou foi revogada, remover
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

export async function sendPushNewSale(sellerName: string, vehicleModel: string, value: number) {
  await sendPushToAll({
    title: "🏎️ Nova Venda Registrada!",
    body: `${sellerName} vendeu um ${vehicleModel} por R$ ${value.toLocaleString("pt-BR")}!`,
    tag: "new-sale",
    data: { type: "sale" },
  });
}

export async function sendPushSaleApproved(sellerName: string, vehicleModel: string) {
  await sendPushToAll({
    title: "✅ Venda Aprovada!",
    body: `A venda de ${sellerName} (${vehicleModel}) foi aprovada! Ranking atualizado.`,
    tag: "sale-approved",
    data: { type: "approved" },
  });
}

export async function sendPushOvertake(sellerName: string, overtakenName: string, position: number) {
  await sendPushToAll({
    title: "🔥 Ultrapassagem no Ranking!",
    body: `${sellerName} ultrapassou ${overtakenName} e agora está em ${position}º lugar!`,
    tag: "overtake",
    data: { type: "overtake" },
  });
}

export async function sendPushNewCompetition(competitionName: string) {
  await sendPushToAll({
    title: "🏁 Nova Competição!",
    body: `A competição "${competitionName}" começou! Acesse o app e confira.`,
    tag: "new-competition",
    data: { type: "competition" },
  });
}
