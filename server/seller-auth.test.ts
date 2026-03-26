import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db") as any;
  return {
    ...actual,
    getSellerByUsername: vi.fn(),
    getSellerByIdInternal: vi.fn(),
    getSellerById: vi.fn(),
    updateSeller: vi.fn(),
    updateSellerLastAccess: vi.fn(),
    listSellers: vi.fn().mockResolvedValue([]),
  };
});

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("$2a$10$hashedpassword"),
  },
}));

import * as db from "./db";
import bcrypt from "bcryptjs";

function createPublicContext() {
  const cookies: { name: string; value: string; options: any }[] = [];
  const clearedCookies: { name: string; options: any }[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: any) => {
        cookies.push({ name, value, options });
      },
      clearCookie: (name: string, options: any) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, cookies, clearedCookies };
}

describe("sellers.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects login with invalid username", async () => {
    (db.getSellerByUsername as any).mockResolvedValue(null);
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sellers.login({ username: "nonexistent", password: "test123" })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });

  it("rejects login with wrong password", async () => {
    (db.getSellerByUsername as any).mockResolvedValue({
      id: 1,
      name: "Test Seller",
      active: true,
      passwordHash: "$2a$10$existinghash",
      username: "testuser",
    });
    (bcrypt.compare as any).mockResolvedValue(false);
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sellers.login({ username: "testuser", password: "wrongpass" })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });

  it("accepts login with correct credentials and sets cookie", async () => {
    (db.getSellerByUsername as any).mockResolvedValue({
      id: 1,
      name: "Test Seller",
      nickname: "Tester",
      active: true,
      passwordHash: "$2a$10$existinghash",
      username: "testuser",
    });
    (bcrypt.compare as any).mockResolvedValue(true);
    (db.updateSellerLastAccess as any).mockResolvedValue(undefined);
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sellers.login({ username: "testuser", password: "correct" });

    expect(result.success).toBe(true);
    expect(result.sellerId).toBe(1);
    expect(result.name).toBe("Test Seller");
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("seller_session");
  });

  it("rejects login for inactive seller", async () => {
    (db.getSellerByUsername as any).mockResolvedValue({
      id: 1,
      name: "Inactive Seller",
      active: false,
      passwordHash: "$2a$10$existinghash",
      username: "inactive",
    });
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sellers.login({ username: "inactive", password: "test123" })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });
});

describe("sellers.firstAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates login for seller without existing credentials", async () => {
    (db.getSellerByIdInternal as any).mockResolvedValue({
      id: 5,
      name: "New Seller",
      nickname: "Newbie",
      active: true,
      username: null,
      passwordHash: null,
    });
    (db.getSellerByUsername as any).mockResolvedValue(null);
    (db.updateSeller as any).mockResolvedValue(undefined);
    (db.updateSellerLastAccess as any).mockResolvedValue(undefined);
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sellers.firstAccess({
      sellerId: 5,
      username: "newseller",
      password: "mypass",
      department: "vendas",
    });

    expect(result.success).toBe(true);
    expect(result.sellerId).toBe(5);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe("seller_session");
    // Verify updateSeller was called with department
    expect(db.updateSeller).toHaveBeenCalledWith(5, expect.objectContaining({
      username: "newseller",
      department: "vendas",
    }));
  });

  it("rejects first access for seller that already has login", async () => {
    (db.getSellerByIdInternal as any).mockResolvedValue({
      id: 5,
      name: "Existing Seller",
      active: true,
      username: "existing",
      passwordHash: "$2a$10$hash",
    });
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sellers.firstAccess({
        sellerId: 5,
        username: "newuser",
        password: "mypass",
      })
    ).rejects.toThrow("Este vendedor já possui login");
  });

  it("rejects first access with duplicate username", async () => {
    (db.getSellerByIdInternal as any).mockResolvedValue({
      id: 5,
      name: "New Seller",
      active: true,
      username: null,
      passwordHash: null,
    });
    (db.getSellerByUsername as any).mockResolvedValue({
      id: 3,
      username: "taken",
    });
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sellers.firstAccess({
        sellerId: 5,
        username: "taken",
        password: "mypass",
      })
    ).rejects.toThrow("Este nome de usuário já está em uso");
  });

  it("rejects first access for inactive seller", async () => {
    (db.getSellerByIdInternal as any).mockResolvedValue({
      id: 5,
      name: "Inactive",
      active: false,
      username: null,
      passwordHash: null,
    });
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sellers.firstAccess({
        sellerId: 5,
        username: "newuser",
        password: "mypass",
      })
    ).rejects.toThrow("Vendedor não encontrado ou inativo");
  });
});

describe("sellers.logout", () => {
  it("clears seller_session cookie", async () => {
    const { ctx, clearedCookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sellers.logout();

    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0].name).toBe("seller_session");
  });
});
