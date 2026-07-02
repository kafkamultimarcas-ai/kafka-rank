import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed_${pw}`),
    compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
  },
}));

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function createTenantContext(tenantId: number | null, tenantSlug: string | null): {
  ctx: TrpcContext;
  setCookies: CookieCall[];
  clearedCookies: any[];
} {
  const setCookies: CookieCall[] = [];
  const clearedCookies: any[] = [];

  const ctx = {
    user: null,
    tenantId: tenantId as any,
    tenantSlug,
    req: { protocol: "https", headers: { cookie: "" } } as any,
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as any,
  } as TrpcContext;

  return { ctx, setCookies, clearedCookies };
}

vi.mock("./crmDb", async () => {
  const actual = await vi.importActual("./crmDb");
  return {
    ...actual,
    getAdminByUsername: vi.fn(async (username: string) => {
      if (username === "admin-lojademo") {
        return {
          id: 1, name: "Admin Demo", username: "admin-lojademo",
          passwordHash: "hashed_senha123", active: true, role: "owner",
          tenantId: 2, mustChangePassword: false,
        };
      }
      if (username === "admin-firstaccess") {
        return {
          id: 2, name: "Admin Novo", username: "admin-firstaccess",
          passwordHash: "hashed_temp123", active: true, role: "admin",
          tenantId: 2, mustChangePassword: true,
        };
      }
      return null;
    }),
    updateAdmin: vi.fn(async () => {}),
  };
});

vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getManagerByUsername: vi.fn(async (username: string) => {
      if (username === "gerente-lojademo") {
        return { id: 5, name: "Gerente Demo", username: "gerente-lojademo", passwordHash: "hashed_senha123", active: true, tenantId: 2 };
      }
      return null;
    }),
    getSellerByUsername: vi.fn(async (username: string) => {
      if (username === "vendedor-lojademo") {
        return { id: 10, name: "Vendedor Demo", username: "vendedor-lojademo", passwordHash: "hashed_senha123", active: true, department: "vendas", sellerRole: "vendedor", tenantId: 2 };
      }
      if (username === "gerente-seller-lojademo") {
        return { id: 11, name: "Gerente Painel Demo", username: "gerente-seller-lojademo", passwordHash: "hashed_senha123", active: true, department: "vendas", sellerRole: "gerente", tenantId: 2 };
      }
      if (username === "financeiro-lojademo") {
        return { id: 12, name: "Financeiro Demo", username: "financeiro-lojademo", passwordHash: "hashed_senha123", active: true, department: "financeiro", sellerRole: "vendedor", tenantId: 2 };
      }
      if (username === "posvenda-lojademo") {
        return { id: 13, name: "Pós-venda Demo", username: "posvenda-lojademo", passwordHash: "hashed_senha123", active: true, department: "pos_venda", sellerRole: "vendedor", tenantId: 2 };
      }
      return undefined;
    }),
    updateSellerLastAccess: vi.fn(async () => {}),
  };
});

describe("tenantAuth.login - resolução de tenant", () => {
  it("rejeita quando o tenant não foi resolvido pela URL", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tenantAuth.login({ username: "admin-lojademo", password: "senha123" })
    ).rejects.toThrow(/Loja não encontrada/);
  });

  it("rejeita quando o slug não corresponde a nenhuma loja (tenantId -1)", async () => {
    const { ctx } = createTenantContext(-1, "loja-inexistente");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tenantAuth.login({ username: "admin-lojademo", password: "senha123" })
    ).rejects.toThrow(/Loja não encontrada/);
  });
});

describe("tenantAuth.login - admin", () => {
  it("autentica admin e retorna token com redirect para /crm/admin", async () => {
    const { ctx } = createTenantContext(2, "loja-demo");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.login({ username: "admin-lojademo", password: "senha123" });

    expect(result.userType).toBe("admin");
    expect(result.redirectPath).toBe("/crm/admin");
    expect(result.mustChangePassword).toBe(false);
    expect(result.token).toBeTruthy();
  });

  it("sinaliza mustChangePassword no primeiro acesso do admin", async () => {
    const { ctx } = createTenantContext(2, "loja-demo");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.login({ username: "admin-firstaccess", password: "temp123" });

    expect(result.userType).toBe("admin");
    expect(result.mustChangePassword).toBe(true);
    expect(result.token).toBeTruthy();
  });
});

describe("tenantAuth.login - manager", () => {
  it("autentica manager, seta cookie manager_session e redireciona para /gerente", async () => {
    const { ctx, setCookies } = createTenantContext(2, "loja-demo");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.login({ username: "gerente-lojademo", password: "senha123" });

    expect(result.userType).toBe("manager");
    expect(result.redirectPath).toBe("/gerente");
    const managerCookie = setCookies.find(c => c.name === "manager_session");
    expect(managerCookie).toBeDefined();
    expect(managerCookie!.options).toMatchObject({ httpOnly: true, path: "/" });
  });
});

describe("tenantAuth.login - seller", () => {
  it("vendedor comum vai para /minha-area/:id", async () => {
    const { ctx, setCookies } = createTenantContext(2, "loja-demo");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.login({ username: "vendedor-lojademo", password: "senha123" });

    expect(result.userType).toBe("seller");
    expect(result.redirectPath).toBe("/minha-area/10");
    expect(setCookies.find(c => c.name === "seller_session")).toBeDefined();
  });

  it("seller com sellerRole=gerente vai para /gerente", async () => {
    const { ctx } = createTenantContext(2, "loja-demo");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.login({ username: "gerente-seller-lojademo", password: "senha123" });
    expect(result.redirectPath).toBe("/gerente");
  });

  it("seller do financeiro vai para /financeiro", async () => {
    const { ctx } = createTenantContext(2, "loja-demo");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.login({ username: "financeiro-lojademo", password: "senha123" });
    expect(result.redirectPath).toBe("/financeiro");
  });

  it("seller de pós-venda vai para /pos-venda", async () => {
    const { ctx } = createTenantContext(2, "loja-demo");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.login({ username: "posvenda-lojademo", password: "senha123" });
    expect(result.redirectPath).toBe("/pos-venda");
  });
});

describe("tenantAuth.login - credenciais inválidas", () => {
  it("rejeita usuário inexistente", async () => {
    const { ctx } = createTenantContext(2, "loja-demo");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tenantAuth.login({ username: "ninguem", password: "1234" })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });

  it("rejeita senha errada para admin", async () => {
    const { ctx } = createTenantContext(2, "loja-demo");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tenantAuth.login({ username: "admin-lojademo", password: "errada" })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });

  it("rejeita senha errada para seller", async () => {
    const { ctx } = createTenantContext(2, "loja-demo");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tenantAuth.login({ username: "vendedor-lojademo", password: "errada" })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });
});
