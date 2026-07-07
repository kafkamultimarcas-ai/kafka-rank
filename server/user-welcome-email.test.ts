import { describe, it, expect, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { tenants, sellers, managers, emailLogs } from "../drizzle/schema";

function createAdminContext(tenantId: number, tenantSlug: string): TrpcContext {
  return {
    user: {
      id: -2000001, openId: "crm_admin_1", email: null, name: "Admin Teste",
      loginMethod: "crm_admin", role: "admin",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    } as any,
    tenantId,
    tenantSlug,
    req: {
      protocol: "https", headers: {},
      get: (name: string) => (name.toLowerCase() === "host" ? "loja.kafkarank.com" : undefined),
    } as any,
    res: { clearCookie: () => {} } as any,
  };
}

const createdTenantIds: number[] = [];

async function createTenant() {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");
  const [result] = await db.insert(tenants).values({
    name: "Loja Teste Boas-Vindas",
    slug: `teste-welcome-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    plan: "trial", status: "trial",
  } as any);
  const tenantId = (result as any).insertId;
  createdTenantIds.push(tenantId);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  return { tenantId, slug: tenant.slug };
}

afterEach(async () => {
  const db = await getDb();
  while (createdTenantIds.length > 0) {
    const id = createdTenantIds.pop()!;
    if (!db) continue;
    await db.delete(emailLogs).where(eq(emailLogs.tenantId, id));
    await db.delete(sellers).where(eq(sellers.tenantId, id));
    await db.delete(managers).where(eq(managers.tenantId, id));
    await db.delete(tenants).where(eq(tenants.id, id));
  }
});

describe("sellers.create - e-mail de boas-vindas", () => {
  it("envia e-mail de boas-vindas quando o vendedor tem e-mail", async () => {
    const { tenantId, slug } = await createTenant();
    const caller = appRouter.createCaller(createAdminContext(tenantId, slug));
    const email = `vendedor${Date.now()}@teste.com`;

    await caller.sellers.create({ name: "Vendedor Teste", email });

    const db = await getDb();
    const [log] = await db!.select().from(emailLogs).where(eq(emailLogs.toEmail, email)).limit(1);
    expect(log).toBeDefined();
    expect(log.emailType).toBe("user_welcome");
  });

  it("não envia e-mail quando o vendedor não tem e-mail", async () => {
    const { tenantId, slug } = await createTenant();
    const caller = appRouter.createCaller(createAdminContext(tenantId, slug));

    await caller.sellers.create({ name: "Vendedor Sem Email" });

    const db = await getDb();
    const logs = await db!.select().from(emailLogs).where(eq(emailLogs.tenantId, tenantId));
    expect(logs).toHaveLength(0);
  });
});

describe("managers.create - e-mail de boas-vindas", () => {
  it("envia e-mail de boas-vindas quando o gerente tem e-mail", async () => {
    const { tenantId, slug } = await createTenant();
    const caller = appRouter.createCaller(createAdminContext(tenantId, slug));
    const email = `gerente${Date.now()}@teste.com`;

    await caller.managers.create({ username: `gerente${Date.now()}`, password: "senha1234", name: "Gerente Teste", email });

    const db = await getDb();
    const [log] = await db!.select().from(emailLogs).where(eq(emailLogs.toEmail, email)).limit(1);
    expect(log).toBeDefined();
    expect(log.emailType).toBe("user_welcome");

    const [manager] = await db!.select().from(managers).where(eq(managers.tenantId, tenantId));
    expect(manager.email).toBe(email);
  });
});
