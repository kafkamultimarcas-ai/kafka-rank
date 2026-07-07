import { describe, it, expect, afterEach } from "vitest";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { tenants, emailLogs, notifications } from "../drizzle/schema";
import { runTrialReminderSweep } from "./trialReminderJob";

const DAY_MS = 24 * 60 * 60 * 1000;
const createdTenantIds: number[] = [];

async function createTrialTenant(overrides: Partial<{ trialEndsAt: number; email: string | null; status: "trial" | "active"; trialReminderDaysSent: string | null }>) {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");
  const [result] = await db.insert(tenants).values({
    name: "Loja Teste Trial Reminder",
    slug: `teste-trial-reminder-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    plan: "trial",
    status: overrides.status ?? "trial",
    email: overrides.email === undefined ? `trial${Date.now()}@teste.com` : overrides.email,
    trialEndsAt: overrides.trialEndsAt,
    trialReminderDaysSent: overrides.trialReminderDaysSent ?? null,
  } as any);
  const tenantId = (result as any).insertId;
  createdTenantIds.push(tenantId);
  return tenantId;
}

afterEach(async () => {
  const db = await getDb();
  while (createdTenantIds.length > 0) {
    const id = createdTenantIds.pop()!;
    if (!db) continue;
    await db.delete(emailLogs).where(eq(emailLogs.tenantId, id));
    await db.delete(notifications).where(eq(notifications.tenantId, id));
    await db.delete(tenants).where(eq(tenants.id, id));
  }
});

describe("runTrialReminderSweep", () => {
  it("envia aviso quando faltam exatamente 5 dias e marca como enviado", async () => {
    const tenantId = await createTrialTenant({ trialEndsAt: Date.now() + 5 * DAY_MS });
    await runTrialReminderSweep();

    const db = await getDb();
    const [emailLog] = await db!.select().from(emailLogs).where(and(eq(emailLogs.tenantId, tenantId), eq(emailLogs.emailType, "trial_ending"))).limit(1);
    expect(emailLog).toBeDefined();

    const [notif] = await db!.select().from(notifications).where(and(eq(notifications.tenantId, tenantId), eq(notifications.type, "trial_ending"))).limit(1);
    expect(notif).toBeDefined();

    const [tenant] = await db!.select().from(tenants).where(eq(tenants.id, tenantId));
    expect(tenant.trialReminderDaysSent).toBe("5");
  });

  it("não reenvia o mesmo aviso numa segunda varredura no mesmo dia (idempotência)", async () => {
    const tenantId = await createTrialTenant({ trialEndsAt: Date.now() + 5 * DAY_MS });
    await runTrialReminderSweep();
    await runTrialReminderSweep();

    const db = await getDb();
    const logs = await db!.select().from(emailLogs).where(and(eq(emailLogs.tenantId, tenantId), eq(emailLogs.emailType, "trial_ending")));
    expect(logs).toHaveLength(1);
  });

  it("não envia nada quando os dias restantes não batem com nenhum limiar (5/3/1)", async () => {
    const tenantId = await createTrialTenant({ trialEndsAt: Date.now() + 10 * DAY_MS });
    await runTrialReminderSweep();

    const db = await getDb();
    const logs = await db!.select().from(emailLogs).where(eq(emailLogs.tenantId, tenantId));
    expect(logs).toHaveLength(0);
  });

  it("pula loja sem e-mail cadastrado (não quebra)", async () => {
    const tenantId = await createTrialTenant({ trialEndsAt: Date.now() + 3 * DAY_MS, email: null });
    await expect(runTrialReminderSweep()).resolves.toBeDefined();

    const db = await getDb();
    const logs = await db!.select().from(emailLogs).where(eq(emailLogs.tenantId, tenantId));
    expect(logs).toHaveLength(0);
  });

  it("pula loja que já não está mais em trial", async () => {
    const tenantId = await createTrialTenant({ trialEndsAt: Date.now() + 1 * DAY_MS, status: "active" });
    await runTrialReminderSweep();

    const db = await getDb();
    const logs = await db!.select().from(emailLogs).where(eq(emailLogs.tenantId, tenantId));
    expect(logs).toHaveLength(0);
  });
});
