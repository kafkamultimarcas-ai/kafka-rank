import { describe, expect, it, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { tenants, admins, crmPipelineStages, finCategories } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { TRIAL_PERIOD_DAYS, TRIAL_PLAN_LIMITS } from "../shared/plans";

const DAY_MS = 24 * 60 * 60 * 1000;
const createdTenantIds: number[] = [];

function createPublicContext(): TrpcContext {
  return {
    user: null,
    tenantId: 0,
    tenantSlug: null,
    req: {
      protocol: "https",
      headers: {},
      get: (name: string) => (name.toLowerCase() === "host" ? "kafkarank.com" : undefined),
    } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

async function cleanupTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(crmPipelineStages).where(eq(crmPipelineStages.tenantId, tenantId));
  await db.delete(finCategories).where(eq(finCategories.tenantId, tenantId));
  await db.delete(admins).where(eq(admins.tenantId, tenantId));
  await db.delete(tenants).where(eq(tenants.id, tenantId));
}

afterEach(async () => {
  while (createdTenantIds.length > 0) {
    await cleanupTenant(createdTenantIds.pop()!);
  }
});

function randomId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

describe("publicSignup.create", () => {
  it("cria loja em trial com limites novos, admin owner e trial de 10 dias", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const id = randomId();

    const result = await caller.publicSignup.create({
      name: `Loja Teste Signup ${id}`,
      email: `loja-${id}@teste.com`,
      adminName: "Admin Signup",
      adminEmail: `admin-${id}@teste.com`,
      adminPassword: "senha123",
      acceptedTerms: true,
    });
    createdTenantIds.push(result.tenantId);

    expect(result.redirectPath).toBe("/crm/admin");
    expect(result.token).toBeTruthy();

    const db = await getDb();
    const [tenant] = await db!.select().from(tenants).where(eq(tenants.id, result.tenantId));
    expect(tenant.plan).toBe("trial");
    expect(tenant.status).toBe("trial");
    expect(tenant.maxSellers).toBe(TRIAL_PLAN_LIMITS.maxSellers);
    expect(tenant.maxAdmins).toBe(TRIAL_PLAN_LIMITS.maxAdmins);
    expect(tenant.trialEndsAt).toBeGreaterThan(Date.now() + (TRIAL_PERIOD_DAYS - 1) * DAY_MS);
    expect(tenant.trialEndsAt).toBeLessThanOrEqual(Date.now() + TRIAL_PERIOD_DAYS * DAY_MS + 10_000);

    const stages = await db!.select().from(crmPipelineStages).where(eq(crmPipelineStages.tenantId, result.tenantId));
    expect(stages.length).toBe(5);

    const categories = await db!.select().from(finCategories).where(eq(finCategories.tenantId, result.tenantId));
    expect(categories.length).toBe(8);

    const [admin] = await db!.select().from(admins).where(eq(admins.tenantId, result.tenantId));
    expect(admin.role).toBe("owner");
    expect(admin.active).toBe(true);
    expect(admin.email).toBe(`admin-${id}@teste.com`);

    const payload = jwt.verify(result.token, ENV.cookieSecret) as any;
    expect(payload.adminId).toBe(admin.id);
    expect(payload.tenantId).toBe(result.tenantId);
    expect(payload.tenantSlug).toBe(result.slug);
  });

  it("rejeita cadastro com e-mail de admin já em uso globalmente", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const id = randomId();
    const adminEmail = `admin-repetido-${id}@teste.com`;

    const first = await caller.publicSignup.create({
      name: `Loja Original ${id}`,
      email: `original-${id}@teste.com`,
      adminName: "Admin Original",
      adminEmail,
      adminPassword: "senha123",
      acceptedTerms: true,
    });
    createdTenantIds.push(first.tenantId);

    await expect(
      caller.publicSignup.create({
        name: `Loja Duplicada ${id}`,
        email: `duplicada-${id}@teste.com`,
        adminName: "Admin Duplicado",
        adminEmail,
        adminPassword: "senha123",
        acceptedTerms: true,
      })
    ).rejects.toThrow(/e-mail/i);
  });

  it("rejeita cadastro com honeypot preenchido", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const id = randomId();

    await expect(
      caller.publicSignup.create({
        name: `Loja Bot ${id}`,
        email: `bot-${id}@teste.com`,
        adminName: "Bot",
        adminEmail: `admin-bot-${id}@teste.com`,
        adminPassword: "senha123",
        acceptedTerms: true,
        honeypot: "eu-sou-um-bot",
      } as any)
    ).rejects.toThrow();
  });

  it("rejeita cadastro sem aceitar os termos", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const id = randomId();

    await expect(
      caller.publicSignup.create({
        name: `Loja Sem Termos ${id}`,
        email: `sem-termos-${id}@teste.com`,
        adminName: "Admin",
        adminEmail: `admin-sem-termos-${id}@teste.com`,
        adminPassword: "senha123",
        acceptedTerms: false,
      } as any)
    ).rejects.toThrow();
  });
});

describe("publicSignup.checkAvailability", () => {
  it("reflete slug e e-mail de admin já usados após um cadastro real", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const id = randomId();

    const created = await caller.publicSignup.create({
      name: `Loja Disponibilidade ${id}`,
      email: `disp-loja-${id}@teste.com`,
      adminName: "Admin",
      adminEmail: `disp-admin-${id}@teste.com`,
      adminPassword: "senha123",
      acceptedTerms: true,
    });
    createdTenantIds.push(created.tenantId);

    const check = await caller.publicSignup.checkAvailability({
      slug: created.slug,
      adminEmail: `disp-admin-${id}@teste.com`,
    });
    expect(check.slug?.available).toBe(false);
    expect(check.adminEmail?.available).toBe(false);

    const checkFree = await caller.publicSignup.checkAvailability({
      slug: `slug-livre-${id}`,
      adminEmail: `livre-${id}@teste.com`,
    });
    expect(checkFree.slug?.available).toBe(true);
    expect(checkFree.adminEmail?.available).toBe(true);
  });
});
