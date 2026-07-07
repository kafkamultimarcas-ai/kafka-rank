import { describe, expect, it, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { tenants, admins, crmPipelineStages, finCategories } from "../drizzle/schema";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    tenantId: 0,
    tenantSlug: null,
    req: {
      protocol: "https", headers: {},
      get: (name: string) => (name.toLowerCase() === "host" ? "kafkarank.com" : undefined),
    } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const createdTenantIds: number[] = [];

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
    const id = createdTenantIds.pop()!;
    await cleanupTenant(id);
  }
});

function randomSlug() {
  return `signup-test-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

describe("publicSignup.create", () => {
  it("cria loja em trial com limites apertados, admin owner e dados padrão", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const slug = randomSlug();

    const result = await caller.publicSignup.create({
      name: "Loja Teste Signup",
      slug,
      email: "signup@teste.com",
      adminName: "Admin Signup",
      adminUsername: `admin-${slug}`,
      adminPassword: "senha123",
      acceptedTerms: true,
    });
    createdTenantIds.push(result.tenantId);

    expect(result.slug).toBe(slug);
    expect(result.redirectPath).toBe("/crm/admin");
    expect(result.token).toBeTruthy();

    const db = await getDb();
    const [tenant] = await db!.select().from(tenants).where(eq(tenants.id, result.tenantId));
    expect(tenant.plan).toBe("trial");
    expect(tenant.status).toBe("trial");
    expect(tenant.maxSellers).toBe(5);
    expect(tenant.maxAdmins).toBe(1);
    expect(tenant.trialEndsAt).toBeTruthy();

    const stages = await db!.select().from(crmPipelineStages).where(eq(crmPipelineStages.tenantId, result.tenantId));
    expect(stages.length).toBe(5);

    const categories = await db!.select().from(finCategories).where(eq(finCategories.tenantId, result.tenantId));
    expect(categories.length).toBe(8);

    const [admin] = await db!.select().from(admins).where(eq(admins.tenantId, result.tenantId));
    expect(admin.role).toBe("owner");
    expect(admin.active).toBe(true);

    // O token devolvido deve autenticar como o admin recém-criado, no tenant certo.
    const payload = jwt.verify(result.token, ENV.cookieSecret) as any;
    expect(payload.adminId).toBe(admin.id);
    expect(payload.tenantId).toBe(result.tenantId);
    expect(payload.tenantSlug).toBe(slug);
  });

  it("rejeita slug já usado por outra loja", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const slug = randomSlug();

    const first = await caller.publicSignup.create({
      name: "Loja Original",
      slug,
      email: "original@teste.com",
      adminName: "Admin Original",
      adminUsername: `admin-${slug}`,
      adminPassword: "senha123",
      acceptedTerms: true,
    });
    createdTenantIds.push(first.tenantId);

    await expect(
      caller.publicSignup.create({
        name: "Loja Duplicada",
        slug,
        email: "duplicada@teste.com",
        adminName: "Admin Duplicado",
        adminUsername: `admin-dup-${slug}`,
        adminPassword: "senha123",
        acceptedTerms: true,
      })
    ).rejects.toThrow(/Slug já existe/);
  });

  it("rejeita cadastro com honeypot preenchido", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const slug = randomSlug();

    await expect(
      caller.publicSignup.create({
        name: "Loja Bot",
        slug,
        email: "bot@teste.com",
        adminName: "Bot",
        adminUsername: `admin-${slug}`,
        adminPassword: "senha123",
        acceptedTerms: true,
        honeypot: "eu-sou-um-bot",
      } as any)
    ).rejects.toThrow();
  });

  it("rejeita cadastro sem aceitar os termos", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const slug = randomSlug();

    await expect(
      caller.publicSignup.create({
        name: "Loja Sem Termos",
        slug,
        email: "semtermos@teste.com",
        adminName: "Admin",
        adminUsername: `admin-${slug}`,
        adminPassword: "senha123",
        acceptedTerms: false,
      } as any)
    ).rejects.toThrow();
  });
});

describe("publicSignup.checkAvailability", () => {
  it("reflete slug e username já usados após um cadastro real", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const slug = randomSlug();
    const adminUsername = `admin-${slug}`;

    const created = await caller.publicSignup.create({
      name: "Loja Disponibilidade",
      slug,
      email: "disp@teste.com",
      adminName: "Admin",
      adminUsername,
      adminPassword: "senha123",
      acceptedTerms: true,
    });
    createdTenantIds.push(created.tenantId);

    const check = await caller.publicSignup.checkAvailability({ slug, adminUsername });
    expect(check.slug?.available).toBe(false);
    expect(check.adminUsername?.available).toBe(false);

    const checkFree = await caller.publicSignup.checkAvailability({ slug: randomSlug() });
    expect(checkFree.slug?.available).toBe(true);
  });
});
