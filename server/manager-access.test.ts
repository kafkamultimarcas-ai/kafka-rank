import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext, AuthActor } from "./_core/context";
import { resolveTenantId } from "./tenantMiddleware";
import { getPrivacySellerId } from "./authHelpers";
import { getDb } from "./db";
import { tenants, sellers, managers, admins } from "../drizzle/schema";

// Estes testes rodavam contra reimplementações locais da lógica de decodificação
// de id (arithmetic com offsets 1000000/2000000) em vez de importar as funções
// de produção — o que significa que uma regressão real em resolveTenantId ou em
// managerOrAdminProcedure não seria pega aqui. Reescrito pra exercitar as
// funções de verdade (server/tenantMiddleware.ts, server/_core/trpc.ts,
// server/authHelpers.ts) contra dados reais no banco de teste.

let tenantId: number;
let managerId: number;
let adminId: number;
let sellerId: number;
let sellerGerenteId: number;

beforeAll(async () => {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível para o teste");

  const [tenantResult] = await db.insert(tenants).values({
    name: "Loja Teste Manager Access",
    slug: `teste-manager-access-${Date.now()}`,
    plan: "basic",
    status: "active",
  } as any);
  tenantId = (tenantResult as any).insertId;

  const [managerResult] = await db.insert(managers).values({
    username: `manager-${Date.now()}`,
    passwordHash: "hash",
    name: "Gerente Teste",
    tenantId,
  });
  managerId = (managerResult as any).insertId;

  const [adminResult] = await db.insert(admins).values({
    username: `admin-${Date.now()}`,
    passwordHash: "hash",
    name: "Admin Teste",
    role: "admin",
    tenantId,
  });
  adminId = (adminResult as any).insertId;

  const [sellerResult] = await db.insert(sellers).values({
    name: "Vendedor Teste",
    sellerRole: "vendedor",
    tenantId,
  });
  sellerId = (sellerResult as any).insertId;

  const [sellerGerenteResult] = await db.insert(sellers).values({
    name: "Vendedor Gerente Teste",
    sellerRole: "gerente",
    tenantId,
  });
  sellerGerenteId = (sellerGerenteResult as any).insertId;
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  await db.delete(sellers).where(eq(sellers.tenantId, tenantId));
  await db.delete(managers).where(eq(managers.tenantId, tenantId));
  await db.delete(admins).where(eq(admins.tenantId, tenantId));
  await db.delete(tenants).where(eq(tenants.id, tenantId));
});

function buildContext(user: AuthActor | null): TrpcContext {
  return {
    user,
    tenantId,
    tenantSlug: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

function managerActor(): AuthActor {
  return {
    id: managerId, actorType: "manager", openId: `manager_${managerId}`, name: "Gerente Teste",
    email: null, loginMethod: "password", role: "admin",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  } as AuthActor;
}

function crmAdminActor(): AuthActor {
  return {
    id: adminId, actorType: "crm_admin", openId: `crm_admin_${adminId}`, name: "Admin Teste",
    email: null, loginMethod: "crm_admin", role: "admin",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  } as AuthActor;
}

function sellerActor(id: number, sellerRole: "vendedor" | "gerente"): AuthActor {
  return {
    id, actorType: "seller", openId: `seller_${id}`, name: "Vendedor Teste",
    email: null, loginMethod: "seller_password", role: "user", sellerRole,
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  } as AuthActor;
}

describe("resolveTenantId — resolve o tenant certo por actorType, sem aritmética de id", () => {
  it("resolve pelo tenant do manager quando actorType=manager", async () => {
    expect(await resolveTenantId(managerActor())).toBe(tenantId);
  });

  // Regressão do bug real encontrado: antes, `user.id < -1000000` capturava
  // qualquer crm_admin (id codificado como -(2000000+adminId)) ANTES do branch
  // "loginMethod === crm_admin" ser avaliado, então todo admin de CRM caía no
  // branch de seller e o tenant nunca era resolvido corretamente.
  it("resolve pelo tenant do admin quando actorType=crm_admin", async () => {
    expect(await resolveTenantId(crmAdminActor())).toBe(tenantId);
  });

  it("resolve pelo tenant do seller quando actorType=seller", async () => {
    expect(await resolveTenantId(sellerActor(sellerId, "vendedor"))).toBe(tenantId);
  });

  it("sem usuário, não quebra (cai no tenant padrão)", async () => {
    expect(typeof (await resolveTenantId(null))).toBe("number");
  });
});

describe("managerOrAdminProcedure — acesso a sales.listPending", () => {
  it("permite manager", async () => {
    const caller = appRouter.createCaller(buildContext(managerActor()));
    await expect(caller.sales.listPending()).resolves.toBeDefined();
  });

  it("permite crm_admin", async () => {
    const caller = appRouter.createCaller(buildContext(crmAdminActor()));
    await expect(caller.sales.listPending()).resolves.toBeDefined();
  });

  it("permite seller-gerente", async () => {
    const caller = appRouter.createCaller(buildContext(sellerActor(sellerGerenteId, "gerente")));
    await expect(caller.sales.listPending()).resolves.toBeDefined();
  });

  it("rejeita vendedor comum", async () => {
    const caller = appRouter.createCaller(buildContext(sellerActor(sellerId, "vendedor")));
    await expect(caller.sales.listPending()).rejects.toThrow();
  });

  it("rejeita requisição sem sessão", async () => {
    const caller = appRouter.createCaller(buildContext(null));
    await expect(caller.sales.listPending()).rejects.toThrow();
  });
});

describe("getPrivacySellerId", () => {
  it("retorna o sellerId real da sessão pra vendedor comum", async () => {
    expect(await getPrivacySellerId(buildContext(sellerActor(sellerId, "vendedor")))).toBe(sellerId);
  });

  it("retorna null pra seller-gerente (vê os dados de todo mundo)", async () => {
    expect(await getPrivacySellerId(buildContext(sellerActor(sellerGerenteId, "gerente")))).toBeNull();
  });

  it("retorna null pra manager e crm_admin (não são sellers)", async () => {
    expect(await getPrivacySellerId(buildContext(managerActor()))).toBeNull();
    expect(await getPrivacySellerId(buildContext(crmAdminActor()))).toBeNull();
  });

  it("retorna null sem sessão", async () => {
    expect(await getPrivacySellerId(buildContext(null))).toBeNull();
  });
});
