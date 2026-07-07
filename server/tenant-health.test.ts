import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

vi.mock("./zapi-service", async () => {
  const actual = await vi.importActual<typeof import("./zapi-service")>("./zapi-service");
  return {
    ...actual,
    getStatus: vi.fn(async () => ({ connected: true, smartphoneConnected: true })),
  };
});

import { appRouter } from "./routers";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { tenants } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

const SUPER_SECRET = process.env.JWT_SECRET ? process.env.JWT_SECRET + "_super" : "super_secret_key";

function fakeCtx(): TrpcContext {
  return {
    user: null,
    tenantId: 1,
    tenantSlug: null,
    req: { protocol: "https", headers: { cookie: "" } } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  } as TrpcContext;
}

let testTenantId: number;

describe("superAdmin.getTenantHealth", () => {
  beforeAll(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("DB indisponível");
    const [result] = await conn.insert(tenants).values({
      name: "Tenant Health Teste",
      slug: `teste-health-${Date.now()}`,
      maxSellers: 10,
      maxAdmins: 2,
      zapiInstanceId: "instance-teste",
      zapiToken: "token-teste",
    } as any);
    testTenantId = (result as any).insertId;
  });

  afterAll(async () => {
    const conn = await getDb();
    if (!conn || !testTenantId) return;
    await conn.delete(tenants).where(eq(tenants.id, testTenantId));
  });

  it("retorna status operacional consolidado da loja", async () => {
    const token = jwt.sign({ superAdminId: 1, role: "owner" }, SUPER_SECRET, { expiresIn: "24h" });
    const caller = appRouter.createCaller(fakeCtx());

    const health = await caller.superAdmin.getTenantHealth({ token, tenantId: testTenantId });

    expect(health.sellers.max).toBe(10);
    expect(health.admins.max).toBe(2);
    expect(health.whatsapp.configured).toBe(true);
    expect(health.whatsapp.connected).toBe(true);
  });

  it("rejeita sem token válido", async () => {
    const caller = appRouter.createCaller(fakeCtx());
    await expect(
      caller.superAdmin.getTenantHealth({ token: "token-invalido", tenantId: testTenantId })
    ).rejects.toThrow(/Não autorizado/);
  });
});
