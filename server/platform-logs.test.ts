import { describe, it, expect, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { tenants, subscriptionEvents, emailLogs } from "../drizzle/schema";
import { signSuperToken } from "./superAdminAuth";

function createContext(): TrpcContext {
  return {
    user: null as any,
    tenantId: 0,
    tenantSlug: null,
    req: { protocol: "https", headers: {}, get: () => undefined } as any,
    res: { clearCookie: () => {} } as any,
  };
}

const createdTenantIds: number[] = [];

async function createTenant() {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");
  const [result] = await db.insert(tenants).values({
    name: "Loja Teste Logs", slug: `teste-logs-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    plan: "trial", status: "trial",
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
    await db.delete(subscriptionEvents).where(eq(subscriptionEvents.tenantId, id));
    await db.delete(emailLogs).where(eq(emailLogs.tenantId, id));
    await db.delete(tenants).where(eq(tenants.id, id));
  }
});

describe("platformLogs.list", () => {
  it("rejeita sem token de super admin válido", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.platformLogs.list({ token: "token-invalido", limit: 10, offset: 0 })).rejects.toThrow("Não autorizado");
  });

  it("logType=email só devolve logs de e-mail", async () => {
    const tenantId = await createTenant();
    const db = await getDb();
    await db!.insert(emailLogs).values({ tenantId, emailType: "signup_welcome", toEmail: "a@b.com", subject: "Oi", status: "sent" } as any);
    await db!.insert(subscriptionEvents).values({ tenantId, eventType: "PAYMENT_CONFIRMED", asaasPaymentId: "pay_1", status: "CONFIRMED" } as any);

    const token = signSuperToken(1, "owner");
    const caller = appRouter.createCaller(createContext());
    const result = await caller.platformLogs.list({ token, logType: "email", tenantId, limit: 10, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].logType).toBe("email");
  });

  it("logType=subscription só devolve logs de assinatura", async () => {
    const tenantId = await createTenant();
    const db = await getDb();
    await db!.insert(emailLogs).values({ tenantId, emailType: "signup_welcome", toEmail: "a@b.com", subject: "Oi", status: "sent" } as any);
    await db!.insert(subscriptionEvents).values({ tenantId, eventType: "PAYMENT_CONFIRMED", asaasPaymentId: "pay_1", status: "CONFIRMED" } as any);

    const token = signSuperToken(1, "owner");
    const caller = appRouter.createCaller(createContext());
    const result = await caller.platformLogs.list({ token, logType: "subscription", tenantId, limit: 10, offset: 0 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].logType).toBe("subscription");
  });

  it("sem logType (Todos) mescla e-mail e assinatura ordenado por data", async () => {
    const tenantId = await createTenant();
    const db = await getDb();
    await db!.insert(emailLogs).values({ tenantId, emailType: "signup_welcome", toEmail: "a@b.com", subject: "Oi", status: "sent" } as any);
    await db!.insert(subscriptionEvents).values({ tenantId, eventType: "PAYMENT_CONFIRMED", asaasPaymentId: "pay_1", status: "CONFIRMED" } as any);

    const token = signSuperToken(1, "owner");
    const caller = appRouter.createCaller(createContext());
    const result = await caller.platformLogs.list({ token, tenantId, limit: 10, offset: 0 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    const types = result.items.map((i: any) => i.logType).sort();
    expect(types).toEqual(["email", "subscription"]);
  });

  it("filtro de intervalo de data exclui logs fora da janela", async () => {
    const tenantId = await createTenant();
    const db = await getDb();
    await db!.insert(emailLogs).values({ tenantId, emailType: "signup_welcome", toEmail: "a@b.com", subject: "Oi", status: "sent" } as any);

    const token = signSuperToken(1, "owner");
    const caller = appRouter.createCaller(createContext());

    const futureOnly = await caller.platformLogs.list({
      token, tenantId, logType: "email", startDate: Date.now() + 60 * 60 * 1000, limit: 10, offset: 0,
    });
    expect(futureOnly.items).toHaveLength(0);

    const includingNow = await caller.platformLogs.list({
      token, tenantId, logType: "email", startDate: Date.now() - 60 * 60 * 1000, limit: 10, offset: 0,
    });
    expect(includingNow.items).toHaveLength(1);
  });

  it("getRareEventsCount conta eventos raros (chargeback/reembolso) recentes", async () => {
    const tenantId = await createTenant();
    const db = await getDb();
    await db!.insert(subscriptionEvents).values({ tenantId, eventType: "PAYMENT_REFUNDED", asaasPaymentId: "pay_refund", status: "REFUNDED" } as any);
    await db!.insert(subscriptionEvents).values({ tenantId, eventType: "PAYMENT_CONFIRMED", asaasPaymentId: "pay_ok", status: "CONFIRMED" } as any);

    const token = signSuperToken(1, "owner");
    const caller = appRouter.createCaller(createContext());
    const result = await caller.platformLogs.getRareEventsCount({ token });
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it("getRareEventsCount rejeita sem token válido", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.platformLogs.getRareEventsCount({ token: "invalido" })).rejects.toThrow("Não autorizado");
  });

  it("getById devolve o log certo por tipo", async () => {
    const tenantId = await createTenant();
    const db = await getDb();
    const [result] = await db!.insert(emailLogs).values({ tenantId, emailType: "signup_welcome", toEmail: "a@b.com", subject: "Oi", status: "sent" } as any);
    const emailLogId = (result as any).insertId;

    const token = signSuperToken(1, "owner");
    const caller = appRouter.createCaller(createContext());
    const log = await caller.platformLogs.getById({ token, logType: "email", id: emailLogId });

    expect(log?.logType).toBe("email");
    expect((log as any).toEmail).toBe("a@b.com");
  });
});
