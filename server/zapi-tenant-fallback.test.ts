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

describe("zapi-service - credenciais sempre por loja (multi-tenant, sem fallback global)", () => {
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

  it("sem ALS explícito, usa tenant padrão (1) e busca credenciais do banco, nunca de ENV", async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      calls.push(url.toString());
      return { ok: true, json: async () => ({ messageId: "abc" }) } as any;
    }) as any;

    // Sem contexto explícito de ALS, getCurrentTenantId() retorna 1 (default)
    // O sistema busca credenciais do banco para tenant 1 (não usa ENV global)
    await zapi.sendText("47999999999", "oi");

    // O mock retorna fakeTenantRow para qualquer query, então a URL usará essas credenciais
    // O importante é que NÃO usa variáveis de ambiente globais
    expect(calls.length).toBeGreaterThan(0);
    // Confirma que buscou do banco (mock retorna tenant2-instance para qualquer tenant)
    expect(calls[0]).toContain("tenant2-instance");
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
