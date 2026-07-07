import { eq, and } from "drizzle-orm";
import { getDb, createNotification } from "./db";
import { tenants } from "../drizzle/schema";
import { withTenantAsync } from "./tenantDb";
import { sendTrialEndingEmail } from "./emailService";
import { ENV } from "./_core/env";

const REMINDER_THRESHOLDS = [5, 3, 1];

// Roda a cada 6h em vez de uma vez por dia fixa — não existe scheduler exato
// no projeto (sem node-cron), e como o envio é idempotente via
// trialReminderDaysSent, rodar mais de uma vez no mesmo dia é seguro (a
// segunda checagem só encontra o dia já registrado e pula).
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function daysRemaining(trialEndsAt: number): number {
  return Math.ceil((trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000));
}

export async function runTrialReminderSweep(): Promise<{ checked: number; sent: number }> {
  const db = await getDb();
  if (!db) return { checked: 0, sent: 0 };

  const trialTenants = await db.select().from(tenants).where(eq(tenants.status, "trial"));
  let sent = 0;

  for (const tenant of trialTenants) {
    if (!tenant.trialEndsAt || !tenant.email) continue;

    const remaining = daysRemaining(tenant.trialEndsAt);
    if (!REMINDER_THRESHOLDS.includes(remaining)) continue;

    const alreadySent = (tenant.trialReminderDaysSent || "").split(",").filter(Boolean).map(Number);
    if (alreadySent.includes(remaining)) continue;

    await withTenantAsync(tenant.id, async () => {
      const billingUrl = `${ENV.appUrl}/t/${tenant.slug}/assinatura`;
      await sendTrialEndingEmail(tenant.email!, tenant.name, remaining, billingUrl, tenant.id);
      await createNotification({
        sellerId: null, targetType: "admin", type: "trial_ending",
        title: `Trial acaba em ${remaining} dia${remaining === 1 ? "" : "s"}`,
        message: `Contrate um plano pra continuar usando ${tenant.name} sem interrupção.`,
        actionUrl: "/assinatura",
      } as any);

      await db.update(tenants)
        .set({ trialReminderDaysSent: [...alreadySent, remaining].join(",") })
        .where(and(eq(tenants.id, tenant.id)));
    });
    sent++;
  }

  return { checked: trialTenants.length, sent };
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

// Chamado uma vez na subida do servidor (server/_core/index.ts) — roda a
// primeira varredura imediatamente e depois a cada CHECK_INTERVAL_MS.
export function startTrialReminderScheduler() {
  if (intervalHandle) return;

  setTimeout(() => runTrialReminderSweep().catch((err) => console.error("[TrialReminder] Falha na varredura inicial:", err.message)), 30000);
  intervalHandle = setInterval(() => {
    runTrialReminderSweep().catch((err) => console.error("[TrialReminder] Falha na varredura:", err.message));
  }, CHECK_INTERVAL_MS);

  console.log(`[Trial Reminder] Agendado a cada ${CHECK_INTERVAL_MS / (60 * 60 * 1000)}h (avisos em ${REMINDER_THRESHOLDS.join("/")} dias)`);
}
