import { describe, expect, it, vi } from "vitest";
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

// Mock finDb
vi.mock("../server/finDb", () => ({
  listFinCategories: vi.fn().mockResolvedValue([]),
  createFinCategory: vi.fn().mockResolvedValue(1),
  updateFinCategory: vi.fn().mockResolvedValue(undefined),
  listFinTransactions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getFinTransaction: vi.fn().mockResolvedValue({
    id: 1, type: "payable", description: "Conta Especial", amount: "1500.00",
    dueDate: Date.now() + 86400000, status: "pending", needsApproval: true,
    approvalStatus: "pending", createdByName: "Rafaela",
  }),
  createFinTransaction: vi.fn().mockResolvedValue(1),
  updateFinTransaction: vi.fn().mockResolvedValue(undefined),
  deleteFinTransaction: vi.fn().mockResolvedValue(undefined),
  markAsPaid: vi.fn().mockResolvedValue(undefined),
  getFinDashboard: vi.fn().mockResolvedValue({
    totalPayable: 0, totalPaid: 0, pendingPayable: 0,
    totalReceivable: 0, totalReceived: 0, pendingReceivable: 0,
    overdue: 0, upcomingDue: [],
  }),
  getOverdueTransactions: vi.fn().mockResolvedValue([]),
  getUpcomingDueTransactions: vi.fn().mockResolvedValue([]),
  parseDocumentWithLLM: vi.fn().mockResolvedValue("prompt"),
  autoUpdateOverdueStatus: vi.fn().mockResolvedValue(0),
}));

// Mock db (for saleDocuments)
vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  listAllSaleDocuments: vi.fn().mockResolvedValue([
    { id: 1, sellerId: 1, vehicleModel: "Civic 2023", docStatus: "pendente", dispatchStatus: "aguardando_docs" },
    { id: 2, sellerId: 2, vehicleModel: "Corolla 2024", docStatus: "completo", dispatchStatus: "docs_enviados" },
  ]),
  updateSaleDocNotes: vi.fn().mockResolvedValue(undefined),
  deleteSaleDocument: vi.fn().mockResolvedValue(undefined),
  listSaleDocumentsBySeller: vi.fn().mockResolvedValue([]),
  countPendingDocsBySeller: vi.fn().mockResolvedValue(0),
  uploadSaleDocCnh: vi.fn().mockResolvedValue({ docStatus: "parcial" }),
  uploadSaleDocComprovante: vi.fn().mockResolvedValue({ docStatus: "parcial" }),
  markSaleDocInTransfer: vi.fn().mockResolvedValue(undefined),
  markSaleDocTransferred: vi.fn().mockResolvedValue(undefined),
  getSaleDocumentById: vi.fn().mockResolvedValue({ id: 1, sellerId: 1 }),
  getSellerById: vi.fn().mockResolvedValue({ id: 1, name: "Vendedor 1" }),
  createNotification: vi.fn().mockResolvedValue(1),
  AVAILABLE_MODULES: [],
  getManagerPermissions: vi.fn().mockResolvedValue([]),
  setManagerPermissions: vi.fn().mockResolvedValue(undefined),
}));

// Mock notification
vi.mock("../server/_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("Financial Approval Workflow", () => {
  it("creates a transaction with needsApproval flag", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.create({
      type: "payable",
      description: "Conta Especial - Fornecedor",
      amount: "2500.00",
      dueDate: Date.now() + 86400000 * 5,
      supplier: "Fornecedor Especial",
      needsApproval: true,
      createdByName: "Rafaela",
    });
    expect(result).toHaveProperty("id");
  });

  it("creates a transaction without needsApproval (operational)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.create({
      type: "payable",
      description: "Aluguel Mensal",
      amount: "3000.00",
      dueDate: Date.now() + 86400000 * 5,
      supplier: "Imobiliária",
      needsApproval: false,
    });
    expect(result).toHaveProperty("id");
  });

  it("approves a transaction", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.approveTransaction({
      id: 1,
      approved: true,
      approvedBy: "Admin Nathan",
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects a transaction", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.finTransactions.approveTransaction({
      id: 1,
      approved: false,
      approvedBy: "Admin Nathan",
    });
    expect(result).toEqual({ success: true });
  });
});

describe("Sale Documents CRUD", () => {
  it("lists all sale documents", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.saleDocuments.listAll({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("updates document notes", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.saleDocuments.updateNotes({
      id: 1,
      notes: "Documentos recebidos, aguardando conferência",
    });
    expect(result).toEqual({ success: true });
  });

  it("deletes a document record", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.saleDocuments.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});
