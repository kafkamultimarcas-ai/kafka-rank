import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@test.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

// Mock the finDb module
vi.mock("../server/finDb", () => ({
  listFinCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "Energia", type: "expense", icon: "zap", color: "#ef4444", active: true, createdAt: new Date() },
    { id: 2, name: "Vendas", type: "income", icon: "receipt", color: "#22c55e", active: true, createdAt: new Date() },
  ]),
  createFinCategory: vi.fn().mockResolvedValue(3),
  updateFinCategory: vi.fn().mockResolvedValue(undefined),
  listFinTransactions: vi.fn().mockResolvedValue({
    items: [
      { id: 1, type: "payable", description: "Boleto Energia", amount: "350.00", dueDate: Date.now() + 86400000, status: "pending", categoryId: 1, supplier: "CEMIG", createdAt: new Date() },
    ],
    total: 1,
  }),
  getFinTransaction: vi.fn().mockResolvedValue({
    id: 1, type: "payable", description: "Boleto Energia", amount: "350.00", dueDate: Date.now() + 86400000, status: "pending", categoryId: 1, supplier: "CEMIG",
  }),
  createFinTransaction: vi.fn().mockResolvedValue(1),
  updateFinTransaction: vi.fn().mockResolvedValue(undefined),
  deleteFinTransaction: vi.fn().mockResolvedValue(undefined),
  markAsPaid: vi.fn().mockResolvedValue(undefined),
  getFinDashboard: vi.fn().mockResolvedValue({
    totalPayable: 350, totalPaid: 0, pendingPayable: 350,
    totalReceivable: 0, totalReceived: 0, pendingReceivable: 0,
    overdue: 0, upcomingDue: [],
  }),
  getOverdueTransactions: vi.fn().mockResolvedValue([]),
  getUpcomingDueTransactions: vi.fn().mockResolvedValue([]),
  parseDocumentWithLLM: vi.fn().mockResolvedValue("prompt"),
  autoUpdateOverdueStatus: vi.fn().mockResolvedValue(0),
}));

describe("finCategories router", () => {
  it("lists categories", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finCategories.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("creates a category", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finCategories.create({
      name: "Teste Cat",
      type: "expense",
      icon: "receipt",
      color: "#3b82f6",
    });
    expect(result).toHaveProperty("id");
  });

  it("updates a category", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finCategories.update({
      id: 1,
      name: "Energia Atualizada",
    });
    expect(result).toEqual({ success: true });
  });

  it("deletes (deactivates) a category", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finCategories.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("finTransactions router", () => {
  it("lists transactions with filters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.list({
      startDate: Date.now() - 86400000 * 30,
      endDate: Date.now() + 86400000,
    });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("creates a transaction", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.create({
      type: "payable",
      description: "Boleto Teste",
      amount: "500.00",
      dueDate: Date.now() + 86400000 * 5,
      supplier: "Fornecedor X",
    });
    expect(result).toHaveProperty("id");
  });

  it("gets a single transaction", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.get({ id: 1 });
    expect(result).toHaveProperty("description");
    expect(result.description).toBe("Boleto Energia");
  });

  it("marks a transaction as paid", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.markPaid({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("deletes a transaction", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("gets dashboard data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.dashboard({
      month: 3,
      year: 2026,
    });
    expect(result).toHaveProperty("totalPayable");
    expect(result).toHaveProperty("totalPaid");
    expect(result).toHaveProperty("pendingPayable");
  });

  it("gets overdue transactions", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.overdue();
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets upcoming due transactions", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.upcomingDue({ days: 3 });
    expect(Array.isArray(result)).toBe(true);
  });
});
