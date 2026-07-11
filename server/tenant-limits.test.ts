import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { withTenantAsync } from "./tenantDb";
import { clearTenantLimitsCache } from "./tenantService";
import { getDb } from "./db";
import { tenants, sellers, admins } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as db from "./db";
import * as crmDb from "./crmDb";

let testTenantId: number;

describe("Enforcement de limites de plano (maxSellers/maxAdmins) - integração real", () => {
  beforeAll(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB indisponível para o teste de integração");
    const [result] = await conn.insert(tenants).values({
      name: "Tenant Teste Limites",
      slug: `teste-limites-${Date.now()}`,
      maxSellers: 1,
      maxAdmins: 1,
      plan: "trial",
      status: "trial",
    } as any);
    testTenantId = (result as any).insertId;
  });

  afterAll(async () => {
    const conn = await getDb();
    if (!conn || !testTenantId) return;
    await conn.delete(sellers).where(eq(sellers.tenantId, testTenantId));
    await conn.delete(admins).where(eq(admins.tenantId, testTenantId));
    await conn.delete(tenants).where(eq(tenants.id, testTenantId));
  });

  it("permite criar o primeiro vendedor dentro do limite do plano", async () => {
    clearTenantLimitsCache();
    await withTenantAsync(testTenantId, async () => {
      const id = await db.createSeller({ name: "Vendedor 1", username: `v1-${Date.now()}` } as any);
      expect(id).toBeTruthy();
    });
  });

  it("bloqueia o segundo vendedor ao atingir maxSellers=1", async () => {
    clearTenantLimitsCache();
    await withTenantAsync(testTenantId, async () => {
      await expect(
        db.createSeller({ name: "Vendedor 2", username: `v2-${Date.now()}` } as any)
      ).rejects.toThrow(/Limite de vendedores/);
    });
  });

  it("permite criar o primeiro admin dentro do limite do plano e grava o tenantId correto", async () => {
    clearTenantLimitsCache();
    await withTenantAsync(testTenantId, async () => {
      const id = await crmDb.createAdmin({ username: `a1-${Date.now()}`, passwordHash: "hash", name: "Admin 1" });
      expect(id).toBeTruthy();
      const created = await crmDb.getAdminById(id);
      expect(created?.tenantId).toBe(testTenantId);
    });
  });

  it("bloqueia o segundo admin ao atingir maxAdmins=1", async () => {
    clearTenantLimitsCache();
    await withTenantAsync(testTenantId, async () => {
      await expect(
        crmDb.createAdmin({ username: `a2-${Date.now()}`, passwordHash: "hash", name: "Admin 2" })
      ).rejects.toThrow(/Limite de administradores/);
    });
  });
});
