import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";
import { assertTenantMatch } from "./tenantMiddleware";

vi.mock("./tenantMiddleware", async () => {
  const actual = await vi.importActual<typeof import("./tenantMiddleware")>("./tenantMiddleware");
  return {
    ...actual,
    resolveTenantContext: vi.fn(async () => ({ tenantId: 3, tenantSlug: "loja-c", source: "path" as const })),
  };
});

vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getSellerById: vi.fn(async (id: number) =>
      id === 10 ? { id: 10, name: "Vendedor B", active: true, sellerRole: "vendedor", email: null, createdAt: new Date(), updatedAt: new Date() } : undefined
    ),
    getManagerById: vi.fn(async (id: number) =>
      id === 5 ? { id: 5, name: "Gerente B", active: true, createdAt: new Date(), updatedAt: new Date() } : undefined
    ),
  };
});

vi.mock("./crmDb", async () => {
  const actual = await vi.importActual("./crmDb");
  return {
    ...actual,
    getAdminById: vi.fn(async (id: number) =>
      id === 1 ? { id: 1, name: "Admin B", active: true, createdAt: new Date(), updatedAt: new Date() } : undefined
    ),
  };
});

import { createContext } from "./_core/context";

function fakeReq(headers: Record<string, string>) {
  return {
    protocol: "https",
    headers: { cookie: "", ...headers },
    originalUrl: "/api/trpc/foo",
    url: "/api/trpc/foo",
  } as any;
}

function fakeRes() {
  return { cookie: vi.fn(), clearCookie: vi.fn() } as any;
}

describe("assertTenantMatch", () => {
  it("tolera token legado sem tenantId", () => {
    expect(assertTenantMatch(undefined, 5)).toBe(true);
    expect(assertTenantMatch(null, 5)).toBe(true);
  });

  it("aceita quando tenantId bate", () => {
    expect(assertTenantMatch(5, 5)).toBe(true);
  });

  it("rejeita quando tenantId diverge", () => {
    expect(assertTenantMatch(2, 5)).toBe(false);
  });
});

describe("createContext - coerência entre sessão e tenant da URL", () => {
  it("ignora seller_session de outra loja (request resolvida para tenantId=3)", async () => {
    const token = jwt.sign({ sellerId: 10, username: "vendedorB", tenantId: 2 }, ENV.cookieSecret, { expiresIn: "30d" });
    const req = fakeReq({ cookie: `seller_session=${token}` });
    const ctx = await createContext({ req, res: fakeRes() } as any);
    expect(ctx.user).toBeNull();
  });

  it("aceita seller_session quando o tenantId do token bate com o resolvido", async () => {
    const token = jwt.sign({ sellerId: 10, username: "vendedorB", tenantId: 3 }, ENV.cookieSecret, { expiresIn: "30d" });
    const req = fakeReq({ cookie: `seller_session=${token}` });
    const ctx = await createContext({ req, res: fakeRes() } as any);
    expect(ctx.user).not.toBeNull();
    expect(ctx.user?.name).toBe("Vendedor B");
  });

  it("tolera seller_session legado sem tenantId no payload", async () => {
    const token = jwt.sign({ sellerId: 10, username: "vendedorB" }, ENV.cookieSecret, { expiresIn: "30d" });
    const req = fakeReq({ cookie: `seller_session=${token}` });
    const ctx = await createContext({ req, res: fakeRes() } as any);
    expect(ctx.user).not.toBeNull();
  });

  it("ignora manager_session de outra loja", async () => {
    const token = jwt.sign({ managerId: 5, username: "gerenteB", tenantId: 99 }, ENV.cookieSecret, { expiresIn: "30d" });
    const req = fakeReq({ cookie: `manager_session=${token}` });
    const ctx = await createContext({ req, res: fakeRes() } as any);
    expect(ctx.user).toBeNull();
  });

  it("ignora admin bearer token de outra loja", async () => {
    const token = jwt.sign({ adminId: 1, role: "owner", type: "admin_auth", tenantId: 99 }, ENV.cookieSecret, { expiresIn: "30d" });
    const req = fakeReq({ authorization: `Bearer ${token}` });
    const ctx = await createContext({ req, res: fakeRes() } as any);
    expect(ctx.user).toBeNull();
  });

  it("aceita admin bearer token quando tenantId bate", async () => {
    const token = jwt.sign({ adminId: 1, role: "owner", type: "admin_auth", tenantId: 3 }, ENV.cookieSecret, { expiresIn: "30d" });
    const req = fakeReq({ authorization: `Bearer ${token}` });
    const ctx = await createContext({ req, res: fakeRes() } as any);
    expect(ctx.user).not.toBeNull();
    expect(ctx.user?.name).toBe("Admin B");
  });
});
