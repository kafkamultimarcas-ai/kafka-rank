import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { tenants, subscriptionEvents, admins, emailLogs, notifications } from "../drizzle/schema";

const { TEST_TOKEN } = vi.hoisted(() => ({ TEST_TOKEN: "test-asaas-webhook-token" }));

vi.mock("./_core/env", async () => {
  const actual = await vi.importActual<typeof import("./_core/env")>("./_core/env");
  return {
    ENV: { ...actual.ENV, asaasWebhookToken: TEST_TOKEN },
  };
});

function fakeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status: vi.fn(function (this: any, code: number) { this.statusCode = code; return this; }),
    json: vi.fn(function (this: any, payload: any) { this.body = payload; return this; }),
  };
  return res;
}

function buildMockApp() {
  const handlers: Record<string, Function> = {};
  const mockApp = {
    get: vi.fn((path: string, handler: Function) => { handlers[`GET ${path}`] = handler; }),
    post: vi.fn((path: string, handler: Function) => { handlers[`POST ${path}`] = handler; }),
    options: vi.fn(),
  };
  return { mockApp, handlers };
}

async function getHandler() {
  const { registerWebhookRoutes } = await import("./webhooks");
  const { mockApp, handlers } = buildMockApp();
  registerWebhookRoutes(mockApp as any);
  return handlers["POST /api/webhooks/asaas"];
}

const ASAAS_CUSTOMER_ID = `cus_test_${Date.now()}`;
const TENANT_EMAIL = `webhook${Date.now()}@teste.com`;
let tenantId: number;

function fakeReq(body: any, withToken = true) {
  return {
    headers: withToken ? { "asaas-access-token": TEST_TOKEN } : {},
    body,
    get: (name: string) => (name.toLowerCase() === "host" ? "kafkarank.com" : undefined),
  } as any;
}

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível para o teste");
  const [result] = await db.insert(tenants).values({
    name: "Loja Teste Webhook ASAAS",
    slug: `teste-asaas-webhook-${Date.now()}`,
    plan: "basic",
    status: "trial",
    email: TENANT_EMAIL,
    asaasCustomerId: ASAAS_CUSTOMER_ID,
    trialEndsAt: Date.now() - 24 * 60 * 60 * 1000,
  } as any);
  tenantId = (result as any).insertId;
});

afterAll(async () => {
  const db = await getDb();
  if (!db || !tenantId) return;
  await db.delete(subscriptionEvents).where(eq(subscriptionEvents.tenantId, tenantId));
  await db.delete(emailLogs).where(eq(emailLogs.tenantId, tenantId));
  await db.delete(notifications).where(eq(notifications.tenantId, tenantId));
  await db.delete(admins).where(eq(admins.tenantId, tenantId));
  await db.delete(tenants).where(eq(tenants.id, tenantId));
});

describe("POST /api/webhooks/asaas", () => {
  it("rejeita sem o token correto", async () => {
    const handler = await getHandler();
    const req = fakeReq({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", customer: ASAAS_CUSTOMER_ID } }, false);
    const res = fakeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("ativa a loja (status=active, trialEndsAt=null) em PAYMENT_CONFIRMED, grava o evento, envia e-mail e notifica in-app", async () => {
    const handler = await getHandler();
    const req = fakeReq({
      event: "PAYMENT_CONFIRMED",
      payment: { id: "pay_confirm_1", customer: ASAAS_CUSTOMER_ID, status: "CONFIRMED", value: 499, billingType: "PIX" },
    });
    const res = fakeRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);

    const db = await getDb();
    const [tenant] = await db!.select().from(tenants).where(eq(tenants.id, tenantId));
    expect(tenant.status).toBe("active");
    expect(tenant.trialEndsAt).toBeNull();

    const events = await db!.select().from(subscriptionEvents).where(eq(subscriptionEvents.tenantId, tenantId));
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe("PAYMENT_CONFIRMED");
    expect(events[0].asaasPaymentId).toBe("pay_confirm_1");

    const [emailLog] = await db!.select().from(emailLogs).where(and(eq(emailLogs.tenantId, tenantId), eq(emailLogs.emailType, "subscription_confirmed"))).limit(1);
    expect(emailLog).toBeDefined();
    expect(emailLog.toEmail).toBe(TENANT_EMAIL);

    const [notif] = await db!.select().from(notifications).where(and(eq(notifications.tenantId, tenantId), eq(notifications.type, "subscription_confirmed"))).limit(1);
    expect(notif).toBeDefined();
    expect(notif.targetType).toBe("admin");
  });

  it("não duplica o evento se o webhook for reenviado (idempotência)", async () => {
    const handler = await getHandler();
    const req = fakeReq({
      event: "PAYMENT_CONFIRMED",
      payment: { id: "pay_confirm_1", customer: ASAAS_CUSTOMER_ID, status: "CONFIRMED", value: 499, billingType: "PIX" },
    });
    await handler(req, fakeRes());
    await handler(req, fakeRes());

    const db = await getDb();
    const events = await db!.select().from(subscriptionEvents).where(eq(subscriptionEvents.tenantId, tenantId));
    expect(events).toHaveLength(1);
  });

  it("suspende a loja em PAYMENT_OVERDUE e envia e-mail + notificação de atraso", async () => {
    const handler = await getHandler();
    const req = fakeReq({
      event: "PAYMENT_OVERDUE",
      payment: { id: "pay_overdue_1", customer: ASAAS_CUSTOMER_ID, status: "OVERDUE", value: 499, billingType: "PIX" },
    });
    await handler(req, fakeRes());

    const db = await getDb();
    const [tenant] = await db!.select().from(tenants).where(eq(tenants.id, tenantId));
    expect(tenant.status).toBe("suspended");

    const [emailLog] = await db!.select().from(emailLogs).where(and(eq(emailLogs.tenantId, tenantId), eq(emailLogs.emailType, "subscription_suspended"))).limit(1);
    expect(emailLog).toBeDefined();

    const [notif] = await db!.select().from(notifications).where(and(eq(notifications.tenantId, tenantId), eq(notifications.type, "subscription_suspended"))).limit(1);
    expect(notif).toBeDefined();
  });

  it("ignora silenciosamente (200) evento de um customer que não existe na nossa base", async () => {
    const handler = await getHandler();
    const req = fakeReq({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_orfao", customer: "cus_desconhecido_123" } });
    const res = fakeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ignored).toBe(true);
  });
});
