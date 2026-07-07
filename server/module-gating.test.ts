import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

const tenantRows: Record<number, { enabledModules: string | null; maxSellers: number; maxAdmins: number; plan: string; status: string }> = {
  10: { enabledModules: JSON.stringify(["ranking", "crm"]), maxSellers: 5, maxAdmins: 1, plan: "basic", status: "active" },
  20: { enabledModules: JSON.stringify(["ranking", "crm", "marketing"]), maxSellers: 5, maxAdmins: 1, plan: "pro", status: "active" },
  30: { enabledModules: null, maxSellers: 5, maxAdmins: 1, plan: "trial", status: "trial" },
};

vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              // O tenantId usado no teste é injetado via closure abaixo (ver mockTenantIdRef)
              const row = tenantRows[mockTenantIdRef.current];
              return row ? [row] : [];
            },
          }),
        }),
      }),
    })),
    listMktStrategies: vi.fn(async () => []),
  };
});

const mockTenantIdRef = { current: 10 };

vi.mock("../drizzle/schema", async () => {
  const actual = await vi.importActual("../drizzle/schema");
  return actual;
});

import { getTenantLimits, clearTenantLimitsCache } from "./tenantService";
import { appRouter } from "./routers";

function createTenantContext(tenantId: number): TrpcContext {
  return {
    user: null,
    tenantId,
    tenantSlug: `tenant-${tenantId}`,
    req: { protocol: "https", headers: { cookie: "" } } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  } as TrpcContext;
}

describe("getTenantLimits", () => {
  beforeEach(() => {
    clearTenantLimitsCache();
  });

  it("faz parse do enabledModules corretamente", async () => {
    mockTenantIdRef.current = 20;
    const limits = await getTenantLimits(20);
    expect(limits?.enabledModules).toEqual(["ranking", "crm", "marketing"]);
    expect(limits?.maxSellers).toBe(5);
  });

  it("retorna lista vazia quando enabledModules é null", async () => {
    mockTenantIdRef.current = 30;
    const limits = await getTenantLimits(30);
    expect(limits?.enabledModules).toEqual([]);
  });
});

describe("moduleRequiredProcedure - gating real via appRouter", () => {
  beforeEach(() => {
    clearTenantLimitsCache();
  });

  it("rejeita acesso ao módulo marketing quando não habilitado para o tenant", async () => {
    mockTenantIdRef.current = 10; // enabledModules = ["ranking", "crm"] — sem "marketing"
    const caller = appRouter.createCaller(createTenantContext(10));
    await expect(caller.mktStrategies.list()).rejects.toThrow(/marketing/i);
  });

  it("permite acesso quando o módulo marketing está habilitado", async () => {
    mockTenantIdRef.current = 20; // enabledModules inclui "marketing"
    const caller = appRouter.createCaller(createTenantContext(20));
    await expect(caller.mktStrategies.list()).resolves.toEqual([]);
  });

  it("permite acesso quando o tenant não tem enabledModules configurado (legado)", async () => {
    mockTenantIdRef.current = 30; // enabledModules = null
    const caller = appRouter.createCaller(createTenantContext(30));
    await expect(caller.mktStrategies.list()).resolves.toEqual([]);
  });
});
