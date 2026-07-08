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

vi.mock("./emailPolicy", async () => {
  const actual = await vi.importActual("./emailPolicy");
  return {
    ...actual,
    findIdentityByEmail: vi.fn(async (email: string) => {
      const norm = email.trim().toLowerCase();
      if (norm === "admin@kafka-multimarcas.local") {
        return {
          userType: "admin", userId: 101, tenantId: 1, tenantSlug: "kafka-multimarcas",
          tenantName: "Kafka Multimarcas",
          passwordHash: "hashed_senha123", active: true, name: "PEDROFELIPE",
          role: "owner", mustChangePassword: false, email: norm,
        };
      }
      if (norm === "admin@loja-demo.local") {
        return {
          userType: "admin", userId: 1, tenantId: 2, tenantSlug: "loja-demo",
          tenantName: "Loja Demo Multi",
          passwordHash: "hashed_senha123", active: true, name: "Admin Demo",
          role: "owner", mustChangePassword: false, email: norm,
        };
      }
      if (norm === "pedrofelipe@loja-sp.local") {
        return {
          userType: "admin", userId: 301, tenantId: 4, tenantSlug: "loja-sp",
          tenantName: "Loja SP",
          passwordHash: "hashed_senha123", active: true, name: "pedro felipe",
          role: "owner", mustChangePassword: false, email: norm,
        };
      }
      if (norm === "admin@auto-veloz.local") {
        return {
          userType: "admin", userId: 201, tenantId: 3, tenantSlug: "auto-veloz",
          tenantName: "Auto Veloz Motors",
          passwordHash: "hashed_senha123", active: true, name: "Admin Auto Veloz",
          role: "owner", mustChangePassword: false, email: norm,
        };
      }
      if (norm === "admin-firstaccess@loja-demo.local") {
        return {
          userType: "admin", userId: 2, tenantId: 2, tenantSlug: "loja-demo",
          tenantName: "Loja Demo Multi",
          passwordHash: "hashed_temp123", active: true, name: "Admin Novo",
          role: "admin", mustChangePassword: true, email: norm,
        };
      }
      if (norm === "gerente@loja-demo.local") {
        return {
          userType: "manager", userId: 5, tenantId: 2, tenantSlug: "loja-demo",
          tenantName: "Loja Demo Multi",
          passwordHash: "hashed_senha123", active: true, name: "Gerente Demo", email: norm,
        };
      }
      if (norm === "gerente@auto-veloz.local") {
        return {
          userType: "manager", userId: 205, tenantId: 3, tenantSlug: "auto-veloz",
          tenantName: "Auto Veloz Motors",
          passwordHash: "hashed_senha123", active: true, name: "Gerente Auto Veloz", email: norm,
        };
      }
      if (norm === "vendedor@loja-demo.local") {
        return {
          userType: "seller", userId: 10, tenantId: 2, tenantSlug: "loja-demo",
          tenantName: "Loja Demo Multi",
          passwordHash: "hashed_senha123", active: true, name: "Vendedor Demo",
          department: "vendas", sellerRole: "vendedor", email: norm,
        };
      }
      if (norm === "gerente-painel@loja-demo.local") {
        return {
          userType: "seller", userId: 11, tenantId: 2, tenantSlug: "loja-demo",
          tenantName: "Loja Demo Multi",
          passwordHash: "hashed_senha123", active: true, name: "Gerente Painel Demo",
          department: "vendas", sellerRole: "gerente", email: norm,
        };
      }
      if (norm === "financeiro@loja-demo.local") {
        return {
          userType: "seller", userId: 12, tenantId: 2, tenantSlug: "loja-demo",
          tenantName: "Loja Demo Multi",
          passwordHash: "hashed_senha123", active: true, name: "Financeiro Demo",
          department: "financeiro", sellerRole: "vendedor", email: norm,
        };
      }
      if (norm === "posvenda@loja-demo.local") {
        return {
          userType: "seller", userId: 13, tenantId: 2, tenantSlug: "loja-demo",
          tenantName: "Loja Demo Multi",
          passwordHash: "hashed_senha123", active: true, name: "Pós-venda Demo",
          department: "pos_venda", sellerRole: "vendedor", email: norm,
        };
      }
      if (norm === "vendedor@auto-veloz.local") {
        return {
          userType: "seller", userId: 210, tenantId: 3, tenantSlug: "auto-veloz",
          tenantName: "Auto Veloz Motors",
          passwordHash: "hashed_senha123", active: true, name: "Vendedor Auto Veloz",
          department: "vendas", sellerRole: "vendedor", email: norm,
        };
      }
      if (norm === "gerente-painel@auto-veloz.local") {
        return {
          userType: "seller", userId: 211, tenantId: 3, tenantSlug: "auto-veloz",
          tenantName: "Auto Veloz Motors",
          passwordHash: "hashed_senha123", active: true, name: "Gerente Painel Auto Veloz",
          department: "vendas", sellerRole: "gerente", email: norm,
        };
      }
      if (norm === "inativo@loja-demo.local") {
        return {
          userType: "seller", userId: 99, tenantId: 2, tenantSlug: "loja-demo",
          tenantName: "Loja Demo Multi",
          passwordHash: "hashed_senha123", active: false, name: "Inativo",
          department: "vendas", sellerRole: "vendedor", email: norm,
        };
      }
      return null;
    }),
  };
});

vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getDb: vi.fn(async () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => ([{
              id: 77,
              email: "super@local.test",
              passwordHash: "hashed_senha123",
              name: "Super Admin",
              role: "owner",
              active: true,
            }]),
          }),
        }),
      }),
    })),
    withRetry: vi.fn(async (fn: () => Promise<unknown>) => await fn()),
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

describe("tenantAuth.loginByEmail - resolução automática de tenant por email", () => {
  it("resolve preview de super admin pelo mesmo email login", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginPreviewByEmail({ email: "super@local.test" });

    expect(result).toEqual({
      userType: "super_admin",
      name: "Super Admin",
      tenantName: "Portal Super Admin",
      tenantSlug: null,
      roleLabel: "Super Admin",
    });
  });

  it("resolve preview do login por email com loja e nome do usuário", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginPreviewByEmail({ email: "vendedor@loja-demo.local" });

    expect(result).toEqual({
      userType: "seller",
      name: "Vendedor Demo",
      tenantName: "Loja Demo Multi",
      tenantSlug: "loja-demo",
      roleLabel: "Vendedor",
    });
  });

  it("autentica admin por email e devolve tenantSlug + redirect", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "admin@loja-demo.local", password: "senha123" });

    expect(result.userType).toBe("admin");
    expect(result.tenantSlug).toBe("loja-demo");
    expect(result.tenantId).toBe(2);
    expect(result.redirectPath).toBe("/admin");
    expect(result.token).toBeTruthy();
    expect(result.mustChangePassword).toBe(false);
  });

  it("autentica admin da kafka-multimarcas e envia para o menu /admin", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "admin@kafka-multimarcas.local", password: "senha123" });

    expect(result.userType).toBe("admin");
    expect(result.tenantSlug).toBe("kafka-multimarcas");
    expect(result.redirectPath).toBe("/admin");
  });

  it("autentica admin da loja-sp e envia para o menu /admin", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "pedrofelipe@loja-sp.local", password: "senha123" });

    expect(result.userType).toBe("admin");
    expect(result.tenantSlug).toBe("loja-sp");
    expect(result.redirectPath).toBe("/admin");
  });

  it("autentica super admin pelo mesmo login por email", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "super@local.test", password: "senha123" });

    expect(result.userType).toBe("super_admin");
    expect(result.redirectPath).toBe("/super-admin");
    expect(result.token).toBeTruthy();
    expect(result.tenantSlug).toBeNull();
    expect(result.tenantId).toBeNull();
  });

  it("sinaliza mustChangePassword no primeiro acesso do admin via email", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "admin-firstaccess@loja-demo.local", password: "temp123" });

    expect(result.userType).toBe("admin");
    expect(result.mustChangePassword).toBe(true);
  });

  it("autentica manager por email e seta cookie manager_session", async () => {
    const { ctx, setCookies } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "gerente@loja-demo.local", password: "senha123" });

    expect(result.userType).toBe("manager");
    expect(result.tenantSlug).toBe("loja-demo");
    expect(result.redirectPath).toBe("/gerente");
    expect(setCookies.find(c => c.name === "manager_session")).toBeDefined();
  });

  it("autentica seller comum por email e vai para /minha-area/:id", async () => {
    const { ctx, setCookies } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "vendedor@loja-demo.local", password: "senha123" });

    expect(result.userType).toBe("seller");
    expect(result.redirectPath).toBe("/minha-area/10");
    expect(setCookies.find(c => c.name === "seller_session")).toBeDefined();
  });

  it("autentica seller-gerente e vai para /gerente", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "gerente-painel@loja-demo.local", password: "senha123" });
    expect(result.redirectPath).toBe("/gerente");
  });

  it("autentica seller do financeiro e vai para /financeiro", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "financeiro@loja-demo.local", password: "senha123" });
    expect(result.redirectPath).toBe("/financeiro");
  });

  it("autentica seller de pós-venda e vai para /pos-venda", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "posvenda@loja-demo.local", password: "senha123" });
    expect(result.redirectPath).toBe("/pos-venda");
  });

  it("autentica manager da auto-veloz e seta cookie manager_session", async () => {
    const { ctx, setCookies } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "gerente@auto-veloz.local", password: "senha123" });

    expect(result.userType).toBe("manager");
    expect(result.tenantSlug).toBe("auto-veloz");
    expect(result.redirectPath).toBe("/gerente");
    expect(setCookies.find(c => c.name === "manager_session")).toBeDefined();
  });

  it("autentica vendedor da auto-veloz e vai para /minha-area/:id", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "vendedor@auto-veloz.local", password: "senha123" });
    expect(result.redirectPath).toBe("/minha-area/210");
  });

  it("autentica gerente-painel da auto-veloz e vai para /gerente", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "gerente-painel@auto-veloz.local", password: "senha123" });
    expect(result.redirectPath).toBe("/gerente");
  });

  it("normaliza email (trim + lowercase) antes de buscar", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.tenantAuth.loginByEmail({ email: "  ADMIN@Loja-Demo.Local  ", password: "senha123" });
    expect(result.userType).toBe("admin");
  });

  it("rejeita email inexistente com mensagem genérica", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tenantAuth.loginByEmail({ email: "ninguem@lugar.com", password: "1234" })
    ).rejects.toThrow("E-mail ou senha inválidos");
  });

  it("rejeita senha errada com mensagem genérica", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tenantAuth.loginByEmail({ email: "admin@loja-demo.local", password: "errada" })
    ).rejects.toThrow("E-mail ou senha inválidos");
  });

  it("rejeita identidade inativa (fallback pra super admin também não bate)", async () => {
    const { ctx } = createTenantContext(null, null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tenantAuth.loginByEmail({ email: "inativo@loja-demo.local", password: "senha-errada" })
    ).rejects.toThrow("E-mail ou senha inválidos");
  });
});
