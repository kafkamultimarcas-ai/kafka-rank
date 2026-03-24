import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock bcrypt
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed_${pw}`),
    compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
  },
}));

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function createPublicContext(cookieHeader?: string): { ctx: TrpcContext; setCookies: CookieCall[]; clearedCookies: any[] } {
  const setCookies: CookieCall[] = [];
  const clearedCookies: any[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {
        cookie: cookieHeader || "",
      },
    } as any,
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as any,
  };

  return { ctx, setCookies, clearedCookies };
}

// Mock db functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getSellerByUsername: vi.fn(async (username: string) => {
      if (username === "leo") {
        return {
          id: 1,
          name: "Leonardo",
          nickname: "Leo",
          username: "leo",
          passwordHash: "hashed_1234",
          active: true,
          department: "vendas",
          photoUrl: null,
          photoKey: null,
          phone: null,
          email: null,
          totalSales: 5,
          totalPoints: 5,
          lastAccess: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      if (username === "blocked") {
        return {
          id: 2,
          name: "Blocked User",
          nickname: "Blocked",
          username: "blocked",
          passwordHash: "hashed_pass",
          active: false,
          department: "vendas",
          photoUrl: null,
          photoKey: null,
          phone: null,
          email: null,
          totalSales: 0,
          totalPoints: 0,
          lastAccess: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return undefined;
    }),
    getSellerById: vi.fn(async (id: number) => {
      if (id === 1) {
        return {
          id: 1,
          name: "Leonardo",
          nickname: "Leo",
          username: "leo",
          active: true,
          department: "vendas",
          photoUrl: null,
          photoKey: null,
          phone: null,
          email: null,
          totalSales: 5,
          totalPoints: 5,
          lastAccess: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return undefined;
    }),
    updateSellerLastAccess: vi.fn(async () => {}),
    listSellers: vi.fn(async () => []),
    listCompetitions: vi.fn(async () => []),
  };
});

describe("sellers.login", () => {
  it("rejects login with wrong username", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sellers.login({ username: "nonexistent", password: "1234" })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });

  it("rejects login with wrong password", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sellers.login({ username: "leo", password: "wrong" })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });

  it("rejects login for inactive/blocked seller", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sellers.login({ username: "blocked", password: "pass" })
    ).rejects.toThrow("Usuário ou senha inválidos");
  });

  it("succeeds with correct credentials and sets cookie", async () => {
    const { ctx, setCookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sellers.login({ username: "leo", password: "1234" });

    expect(result).toMatchObject({
      success: true,
      sellerId: 1,
      name: "Leonardo",
      nickname: "Leo",
    });

    // Should set seller_session cookie
    expect(setCookies.length).toBeGreaterThanOrEqual(1);
    const sellerCookie = setCookies.find(c => c.name === "seller_session");
    expect(sellerCookie).toBeDefined();
    expect(sellerCookie!.value).toBeTruthy();
    expect(sellerCookie!.options).toMatchObject({
      httpOnly: true,
      path: "/",
    });
  });
});

describe("sellers.me", () => {
  it("returns null when no cookie is present", async () => {
    const { ctx } = createPublicContext("");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sellers.me();
    expect(result).toBeNull();
  });
});

describe("sellers.logout", () => {
  it("clears the seller_session cookie", async () => {
    const { ctx, clearedCookies } = createPublicContext("seller_session=sometoken");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sellers.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies.length).toBeGreaterThanOrEqual(1);
    const cleared = clearedCookies.find((c: any) => c.name === "seller_session");
    expect(cleared).toBeDefined();
  });
});
