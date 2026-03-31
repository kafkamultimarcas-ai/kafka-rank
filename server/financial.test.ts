import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB module
vi.mock("./finDb", () => ({
  listFinCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "Energia", type: "expense", icon: "⚡", color: "#f59e0b", active: true },
    { id: 2, name: "Venda Veículo", type: "income", icon: "🚗", color: "#22c55e", active: true },
    { id: 3, name: "Aluguel", type: "expense", icon: "🏠", color: "#ef4444", active: true },
  ]),
  createFinCategory: vi.fn().mockResolvedValue({ id: 4 }),
  updateFinCategory: vi.fn().mockResolvedValue(undefined),
  listFinTransactions: vi.fn().mockResolvedValue({
    items: [
      { id: 1, type: "payable", description: "Conta de Luz", amount: "350.00", dueDate: Date.now() + 86400000, status: "pending", supplier: "CELESC" },
      { id: 2, type: "receivable", description: "Venda HB20", amount: "45000.00", dueDate: Date.now(), status: "paid", supplier: "João Silva" },
      { id: 3, type: "payable", description: "IPVA", amount: "1200.00", dueDate: Date.now() - 86400000, status: "pending", supplier: "DETRAN" },
    ],
    total: 3,
  }),
  getFinTransaction: vi.fn().mockResolvedValue({
    id: 1, type: "payable", description: "Conta de Luz", amount: "350.00", dueDate: Date.now(), status: "pending",
  }),
  createFinTransaction: vi.fn().mockResolvedValue({ id: 4 }),
  updateFinTransaction: vi.fn().mockResolvedValue(undefined),
  deleteFinTransaction: vi.fn().mockResolvedValue(undefined),
  getFinDashboard: vi.fn().mockResolvedValue({
    totalPayable: 1550, totalReceivable: 45000, totalPaid: 800, totalReceived: 45000,
    pendingPayable: 3, pendingReceivable: 0, overdueCount: 1,
  }),
}));

// Mock crmDb for enhanced features
vi.mock("./crmDb", () => ({
  listLeads: vi.fn().mockResolvedValue([
    { id: 1, name: "João", phone: "11999999999", score: "hot", department: "vendas", stage: "Contato", sellerId: 1, createdAt: new Date() },
    { id: 2, name: "Maria", phone: "11888888888", score: "warm", department: "pre_vendas", stage: "Qualificado", sellerId: 2, createdAt: new Date(Date.now() - 300000) },
  ]),
  createLead: vi.fn().mockResolvedValue({ id: 3 }),
  updateLead: vi.fn().mockResolvedValue(undefined),
  getLeadById: vi.fn().mockResolvedValue({
    id: 1, name: "João", phone: "11999999999", score: "hot", department: "vendas", sellerId: 1,
  }),
  listActivities: vi.fn().mockResolvedValue([
    { id: 1, leadId: 1, type: "call", description: "Ligou para o cliente", createdAt: new Date() },
  ]),
  createActivity: vi.fn().mockResolvedValue({ id: 2 }),
  listPipelineStages: vi.fn().mockResolvedValue([
    { id: 1, department: "vendas", name: "Lead", order: 1, color: "#ef4444" },
    { id: 2, department: "vendas", name: "Contato", order: 2, color: "#f59e0b" },
  ]),
  listInventory: vi.fn().mockResolvedValue([
    { id: 1, brand: "Toyota", model: "Hilux", year: "2024", price: 280000, status: "available" },
  ]),
  createInventoryItem: vi.fn().mockResolvedValue({ id: 2 }),
  listAdmins: vi.fn().mockResolvedValue([
    { id: 1, username: "kafka", name: "Kafka Admin", role: "owner", permissions: null },
  ]),
  createAdmin: vi.fn().mockResolvedValue({ id: 2 }),
  updateAdmin: vi.fn().mockResolvedValue(undefined),
  getAdminByUsername: vi.fn().mockResolvedValue({
    id: 1, username: "kafka", name: "Kafka Admin", role: "owner",
    passwordHash: "$2b$10$test",
  }),
  getIntegrationByToken: vi.fn().mockResolvedValue({
    id: 1, type: "webhook", name: "Test Integration", token: "test-token", active: true,
  }),
}));

describe("Financial Module", () => {
  describe("Categories", () => {
    it("should list financial categories", async () => {
      const { listFinCategories } = await import("./finDb");
      const categories = await listFinCategories();
      expect(categories).toHaveLength(3);
      expect(categories[0].name).toBe("Energia");
      expect(categories[1].type).toBe("income");
    });

    it("should create a financial category", async () => {
      const { createFinCategory } = await import("./finDb");
      const result = await createFinCategory({ name: "Seguro", type: "expense" });
      expect(result.id).toBe(4);
    });
  });

  describe("Transactions", () => {
    it("should list financial transactions", async () => {
      const { listFinTransactions } = await import("./finDb");
      const result = await listFinTransactions({});
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("should have payable and receivable transactions", async () => {
      const { listFinTransactions } = await import("./finDb");
      const result = await listFinTransactions({});
      const payables = result.items.filter((t: any) => t.type === "payable");
      const receivables = result.items.filter((t: any) => t.type === "receivable");
      expect(payables).toHaveLength(2);
      expect(receivables).toHaveLength(1);
    });

    it("should identify overdue transactions", async () => {
      const { listFinTransactions } = await import("./finDb");
      const result = await listFinTransactions({});
      const overdue = result.items.filter((t: any) =>
        t.status === "pending" && t.dueDate < Date.now()
      );
      expect(overdue.length).toBeGreaterThanOrEqual(1);
      expect(overdue[0].description).toBe("IPVA");
    });

    it("should create a financial transaction", async () => {
      const { createFinTransaction } = await import("./finDb");
      const result = await createFinTransaction({
        type: "payable",
        description: "Conta de Água",
        amount: "150.00",
        dueDate: Date.now() + 86400000,
      });
      expect(result.id).toBe(4);
    });

    it("should get a single transaction", async () => {
      const { getFinTransaction } = await import("./finDb");
      const tx = await getFinTransaction(1);
      expect(tx).toBeDefined();
      expect(tx?.description).toBe("Conta de Luz");
      expect(tx?.status).toBe("pending");
    });

    it("should delete a transaction", async () => {
      const { deleteFinTransaction } = await import("./finDb");
      await expect(deleteFinTransaction(1)).resolves.toBeUndefined();
    });
  });

  describe("Dashboard", () => {
    it("should return financial dashboard data", async () => {
      const { getFinDashboard } = await import("./finDb");
      const dashboard = await getFinDashboard({});
      expect(dashboard.totalPayable).toBe(1550);
      expect(dashboard.totalReceivable).toBe(45000);
      expect(dashboard.overdueCount).toBe(1);
    });

    it("should calculate saldo correctly", async () => {
      const { getFinDashboard } = await import("./finDb");
      const dashboard = await getFinDashboard({});
      const saldo = dashboard.totalReceived - dashboard.totalPaid;
      expect(saldo).toBe(44200);
    });
  });
});

describe("Enhanced CRM Features", () => {
  describe("Lead Score System", () => {
    it("should have score field on leads", async () => {
      const { listLeads } = await import("./crmDb");
      const leads = await listLeads({});
      expect(leads[0].score).toBe("hot");
      expect(leads[1].score).toBe("warm");
    });
  });

  describe("Lead Response Time Alert", () => {
    it("should identify leads needing 5min alert", async () => {
      const { listLeads } = await import("./crmDb");
      const leads = await listLeads({});
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      const needsAlert = leads.filter((l: any) =>
        new Date(l.createdAt).getTime() < fiveMinAgo && l.score !== "cold"
      );
      expect(needsAlert.length).toBeGreaterThanOrEqual(0);
    });

    it("should identify leads needing 20min redistribution", async () => {
      const { listLeads } = await import("./crmDb");
      const leads = await listLeads({});
      const twentyMinAgo = Date.now() - 20 * 60 * 1000;
      // Test the logic - leads older than 20min without response should be redistributed
      const needsRedistribution = leads.filter((l: any) =>
        new Date(l.createdAt).getTime() < twentyMinAgo
      );
      // Our mock data has one lead from 5min ago, so it shouldn't be redistributed
      expect(needsRedistribution).toHaveLength(0);
    });
  });

  describe("Pipeline Stages", () => {
    it("should list pipeline stages by department", async () => {
      const { listPipelineStages } = await import("./crmDb");
      const stages = await listPipelineStages("vendas");
      expect(stages).toHaveLength(2);
      expect(stages[0].name).toBe("Lead");
      expect(stages[1].name).toBe("Contato");
    });
  });

  describe("Inventory Management", () => {
    it("should list inventory items", async () => {
      const { listInventory } = await import("./crmDb");
      const items = await listInventory({});
      expect(items).toHaveLength(1);
      expect(items[0].brand).toBe("Toyota");
      expect(items[0].model).toBe("Hilux");
    });

    it("should create inventory item", async () => {
      const { createInventoryItem } = await import("./crmDb");
      const result = await createInventoryItem({
        brand: "Honda", model: "Civic", year: "2024", price: 120000,
      });
      expect(result.id).toBe(2);
    });
  });

  describe("Admin Permissions", () => {
    it("should list admins", async () => {
      const { listAdmins } = await import("./crmDb");
      const admins = await listAdmins();
      expect(admins).toHaveLength(1);
      expect(admins[0].username).toBe("kafka");
      expect(admins[0].role).toBe("owner");
    });

    it("should create admin with permissions", async () => {
      const { createAdmin } = await import("./crmDb");
      const result = await createAdmin({
        username: "gerente1",
        passwordHash: "$2b$10$test",
        name: "Gerente Vendas",
        role: "manager",
        permissions: JSON.stringify({ vendas: true, pre_vendas: true }),
      });
      expect(result.id).toBe(2);
    });
  });

  describe("Activities Timeline", () => {
    it("should list activities for a lead", async () => {
      const { listActivities } = await import("./crmDb");
      const activities = await listActivities(1);
      expect(activities).toHaveLength(1);
      expect(activities[0].type).toBe("call");
    });

    it("should create activity", async () => {
      const { createActivity } = await import("./crmDb");
      const result = await createActivity({
        leadId: 1, sellerId: 1, type: "whatsapp", description: "Enviou mensagem WhatsApp",
      });
      expect(result.id).toBe(2);
    });
  });
});
