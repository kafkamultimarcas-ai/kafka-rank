import { describe, expect, it, vi, beforeEach } from "vitest";
import { withTenantAsync } from "./tenantDb";

const fakeTenantRow = {
  zapiInstanceId: "tenant2-instance",
  zapiToken: "tenant2-token",
  zapiClientToken: "tenant2-client",
};

const chain = {
  select: () => chain,
  from: () => chain,
  where: () => chain,
  limit: () => Promise.resolve([fakeTenantRow]),
};

vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return { ...actual, getDb: vi.fn(async () => chain) };
});

import * as zapi from "./zapi-service";

describe("zapi-service - fallback automático de tenant via ALS", () => {
  beforeEach(() => {
    zapi.clearCredentialsCache();
  });

  it("usa credenciais do tenant resolvido via AsyncLocalStorage quando tenantId não é passado", async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(url.toString());
      return { ok: true, json: async () => ({ messageId: "abc" }) } as any;
    }) as any;

    await withTenantAsync(2, () => zapi.sendText("47999999999", "oi"));

    expect(calls[0]).toContain("tenant2-instance");
    expect(calls[0]).toContain("tenant2-token");
  });

  it("usa credenciais globais quando não há contexto de tenant explícito (default = 1)", async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(url.toString());
      return { ok: true, json: async () => ({ messageId: "abc" }) } as any;
    }) as any;

    await zapi.sendText("47999999999", "oi");

    expect(calls[0]).not.toContain("tenant2-instance");
  });

  it("tenantId explícito continua tendo prioridade sobre o ALS", async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(url.toString());
      return { ok: true, json: async () => ({ messageId: "abc" }) } as any;
    }) as any;

    // ALS diz tenant 1 (default), mas passamos explicitamente tenantId=2
    await zapi.sendText("47999999999", "oi", 2);

    expect(calls[0]).toContain("tenant2-instance");
  });
});
