import { describe, expect, it, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { tenants, admins } from "../drizzle/schema";
import { getTenantLimits, clearTenantLimitsCache } from "./tenantService";
import { TRIAL_PERIOD_DAYS } from "../shared/plans";

const DAY_MS = 24 * 60 * 60 * 1000;
const createdTenantIds: number[] = [];

async function createTenant(overrides: Partial<typeof tenants.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");
  const [result] = await db.insert(tenants).values({
    name: "Tenant Teste Trial",
    slug: `teste-trial-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    plan: "trial",
    status: "trial",
    ...overrides,
  } as any);
  const tenantId = (result as any).insertId;
  createdTenantIds.push(tenantId);
  clearTenantLimitsCache(tenantId);
  return tenantId;
}

async function cleanupTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(admins).where(eq(admins.tenantId, tenantId));
  await db.delete(tenants).where(eq(tenants.id, tenantId));
}

afterEach(async () => {
  while (createdTenantIds.length > 0) {
    const id = createdTenantIds.pop()!;
    await cleanupTenant(id);
  }
});

function createPublicContext(tenantId: number, tenantSlug: string): TrpcContext {
  return {
    user: null,
    tenantId,
    tenantSlug,
    req: { protocol: "https", headers: { cookie: "" } } as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
  };
}

describe("getTenantLimits - trialExpired", () => {
  it("marca trialExpired quando status=trial e trialEndsAt já passou", async () => {
    const tenantId = await createTenant({ trialEndsAt: Date.now() - DAY_MS });
    const limits = await getTenantLimits(tenantId);
    expect(limits?.trialExpired).toBe(true);
    expect(limits?.trialEndsAt).toBeTruthy();
  });

  it("não marca trialExpired quando o trial ainda não venceu", async () => {
    const tenantId = await createTenant({ trialEndsAt: Date.now() + (TRIAL_PERIOD_DAYS - 1) * DAY_MS });
    const limits = await getTenantLimits(tenantId);
    expect(limits?.trialExpired).toBe(false);
  });

  it("não marca trialExpired se o plano já foi migrado (status != trial), mesmo com trialEndsAt vencido", async () => {
    const tenantId = await createTenant({ status: "active", plan: "basic", trialEndsAt: Date.now() - DAY_MS });
    const limits = await getTenantLimits(tenantId);
    expect(limits?.trialExpired).toBe(false);
  });
});

describe("tenantAuth.login - trial expirado", () => {
  it("devolve trialExpired=true no login quando a loja está com trial vencido", async () => {
    const hash = await bcrypt.hash("senha123", 10);
    const tenantId = await createTenant({ trialEndsAt: Date.now() - DAY_MS });
    const db = await getDb();
    const username = `admin-trial-${tenantId}`;
    await db!.insert(admins).values({
      username, passwordHash: hash, name: "Admin Trial Vencido", email: `trial-vencido-${tenantId}@test.com`, role: "owner", active: true, tenantId,
    } as any);

    const [tenant] = await db!.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, tenantId));
    const caller = appRouter.createCaller(createPublicContext(tenantId, tenant.slug));
    const result = await caller.tenantAuth.login({ username, password: "senha123" });

    expect(result.trialExpired).toBe(true);
    expect(result.trialEndsAt).toBeTruthy();
  });

  it("devolve trialExpired=false no login quando a loja está dentro do trial", async () => {
    const hash = await bcrypt.hash("senha123", 10);
    const tenantId = await createTenant({ trialEndsAt: Date.now() + (TRIAL_PERIOD_DAYS - 1) * DAY_MS });
    const db = await getDb();
    const username = `admin-trial-ok-${tenantId}`;
    await db!.insert(admins).values({
      username, passwordHash: hash, name: "Admin Trial Ativo", email: `trial-ativo-${tenantId}@test.com`, role: "owner", active: true, tenantId,
    } as any);

    const [tenant] = await db!.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, tenantId));
    const caller = appRouter.createCaller(createPublicContext(tenantId, tenant.slug));
    const result = await caller.tenantAuth.login({ username, password: "senha123" });

    expect(result.trialExpired).toBe(false);
  });
});
