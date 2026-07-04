import { describe, it, expect, vi, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { tenants, subscriptionEvents, admins, emailLogs } from "../drizzle/schema";
import { signSuperToken } from "./superAdminAuth";

vi.mock("./asaasService", () => ({
  createCustomer: vi.fn(async () => ({ id: "cus_mock_123" })),
  createSubscription: vi.fn(async () => ({ id: "sub_mock_123", status: "ACTIVE" })),
  updateSubscription: vi.fn(async (subscriptionId: string) => ({ id: subscriptionId, status: "ACTIVE" })),
  getCheckoutUrl: vi.fn(async () => "https://sandbox.asaas.com/checkout/mock"),
  cancelSubscription: vi.fn(async () => {}),
}));

import * as asaas from "./asaasService";

function createAdminContext(tenantId: number): TrpcContext {
  return {
    user: {
      id: -2000001, openId: "crm_admin_1", email: null, name: "Admin Teste",
      loginMethod: "crm_admin", role: "admin",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    } as any,
    tenantId,
    tenantSlug: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

const createdTenantIds: number[] = [];

async function createTenant() {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");
  const [result] = await db.insert(tenants).values({
    name: "Loja Teste Billing",
    slug: `teste-billing-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    plan: "trial",
    status: "trial",
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
    await db.delete(admins).where(eq(admins.tenantId, id));
    await db.delete(tenants).where(eq(tenants.id, id));
  }
});

describe("billing.subscribe", () => {
  it("cria customer/assinatura (mock), salva no tenant e devolve checkoutUrl", async () => {
    const tenantId = await createTenant();
    const caller = appRouter.createCaller(createAdminContext(tenantId));

    const result = await caller.billing.subscribe({
      plan: "pro",
      billingName: "Loja Teste LTDA",
      cpfCnpj: "11222333000181",
      email: "financeiro@loja.com",
    });

    expect(result.checkoutUrl).toBe("https://sandbox.asaas.com/checkout/mock");

    const db = await getDb();
    const [tenant] = await db!.select().from(tenants).where(eq(tenants.id, tenantId));
    expect(tenant.asaasCustomerId).toBe("cus_mock_123");
    expect(tenant.subscriptionId).toBe("sub_mock_123");
    expect(tenant.plan).toBe("pro");
  });
});

describe("billing.subscribe - proteção contra assinatura duplicada", () => {
  it("com assinatura já ativa, troca de plano chama updateSubscription (PUT) em vez de criar uma nova", async () => {
    const tenantId = await createTenant();
    const db = await getDb();
    await db!.update(tenants).set({ asaasCustomerId: "cus_existente", subscriptionId: "sub_existente", plan: "basic" }).where(eq(tenants.id, tenantId));

    const caller = appRouter.createCaller(createAdminContext(tenantId));
    const createSpy = vi.mocked(asaas.createSubscription);
    const updateSpy = vi.mocked(asaas.updateSubscription);
    createSpy.mockClear();
    updateSpy.mockClear();

    const billingEmail = `troca${Date.now()}@teste.com`;
    const result = await caller.billing.subscribe({
      plan: "pro",
      billingName: "Loja Teste LTDA",
      cpfCnpj: "11144477735",
      email: billingEmail,
    });

    expect(updateSpy).toHaveBeenCalledWith("sub_existente", { plan: "pro" });
    expect(createSpy).not.toHaveBeenCalled();
    expect(result.planChanged).toBe(true);

    const [tenant] = await db!.select().from(tenants).where(eq(tenants.id, tenantId));
    expect(tenant.plan).toBe("pro");
    expect(tenant.subscriptionId).toBe("sub_existente");

    const [emailLog] = await db!.select().from(emailLogs).where(eq(emailLogs.toEmail, billingEmail)).limit(1);
    expect(emailLog).toBeDefined();
    expect(emailLog.emailType).toBe("plan_changed");
  });

  it("rejeita tentar assinar de novo o mesmo plano que a loja já tem", async () => {
    const tenantId = await createTenant();
    const db = await getDb();
    await db!.update(tenants).set({ asaasCustomerId: "cus_existente", subscriptionId: "sub_existente", plan: "pro" }).where(eq(tenants.id, tenantId));

    const caller = appRouter.createCaller(createAdminContext(tenantId));
    await expect(
      caller.billing.subscribe({ plan: "pro", billingName: "Loja Teste LTDA", cpfCnpj: "11144477735" })
    ).rejects.toThrow("já está no plano");
  });

  it("rejeita CPF/CNPJ inválido (checksum) antes de chamar a ASAAS", async () => {
    const tenantId = await createTenant();
    const caller = appRouter.createCaller(createAdminContext(tenantId));
    await expect(
      caller.billing.subscribe({ plan: "basic", billingName: "Loja Teste LTDA", cpfCnpj: "11111111111" })
    ).rejects.toThrow();
  });
});

describe("billing.cancelSubscription", () => {
  it("cancela na ASAAS e limpa o subscriptionId local", async () => {
    const tenantId = await createTenant();
    const db = await getDb();
    await db!.update(tenants).set({ subscriptionId: "sub_para_cancelar", plan: "pro" }).where(eq(tenants.id, tenantId));

    const caller = appRouter.createCaller(createAdminContext(tenantId));
    await caller.billing.cancelSubscription();

    const [tenant] = await db!.select().from(tenants).where(eq(tenants.id, tenantId));
    expect(tenant.subscriptionId).toBeNull();
  });
});

describe("billing.getMyPaymentHistory - isolamento por tenant", () => {
  it("uma loja não vê eventos de pagamento de outra loja", async () => {
    const tenantA = await createTenant();
    const tenantB = await createTenant();
    const db = await getDb();

    await db!.insert(subscriptionEvents).values({
      tenantId: tenantA, eventType: "PAYMENT_CONFIRMED", asaasPaymentId: "pay_a1", status: "CONFIRMED",
    } as any);
    await db!.insert(subscriptionEvents).values({
      tenantId: tenantB, eventType: "PAYMENT_CONFIRMED", asaasPaymentId: "pay_b1", status: "CONFIRMED",
    } as any);

    const callerA = appRouter.createCaller(createAdminContext(tenantA));
    const historyA = await callerA.billing.getMyPaymentHistory({ limit: 10, offset: 0 });

    expect(historyA.total).toBe(1);
    expect(historyA.items[0].asaasPaymentId).toBe("pay_a1");
  });
});

describe("subscriptionLogs.list - acesso restrito ao Super Admin", () => {
  it("rejeita sem token válido", async () => {
    const tenantId = await createTenant();
    const caller = appRouter.createCaller(createAdminContext(tenantId));
    await expect(
      caller.subscriptionLogs.list({ token: "token-invalido", limit: 10, offset: 0 })
    ).rejects.toThrow("Não autorizado");
  });

  it("com token de super admin válido, lista eventos de todas as lojas", async () => {
    const tenantA = await createTenant();
    const db = await getDb();
    await db!.insert(subscriptionEvents).values({
      tenantId: tenantA, eventType: "PAYMENT_OVERDUE", asaasPaymentId: "pay_super_1", status: "OVERDUE",
    } as any);

    const token = signSuperToken(1, "owner");
    const caller = appRouter.createCaller(createAdminContext(tenantA));
    const result = await caller.subscriptionLogs.list({ token, tenantId: tenantA, limit: 10, offset: 0 });

    expect(result.items.some((i: any) => i.asaasPaymentId === "pay_super_1")).toBe(true);
  });
});
