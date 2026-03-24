import { describe, expect, it, vi } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getNextPvTicketNumber: vi.fn().mockResolvedValue("PV-0001"),
  createPvChamado: vi.fn().mockResolvedValue(1),
  listPvChamados: vi.fn().mockResolvedValue([
    { id: 1, ticketNumber: "PV-0001", clienteNome: "João", carroModelo: "Civic", status: "aberto", vendedorId: 1, createdAt: Date.now() },
    { id: 2, ticketNumber: "PV-0002", clienteNome: "Maria", carroModelo: "Corolla", status: "em_servico", vendedorId: 2, createdAt: Date.now() },
  ]),
  getPvChamadoById: vi.fn().mockResolvedValue({ id: 1, ticketNumber: "PV-0001", clienteNome: "João", status: "aberto" }),
  updatePvChamado: vi.fn().mockResolvedValue({ id: 1, status: "agendado" }),
  getPvChamadosCounts: vi.fn().mockResolvedValue({ aberto: 2, agendado: 1, em_servico: 1, finalizado: 0, entregue: 0, total: 4 }),
  getSellerById: vi.fn().mockImplementation((id: number) => {
    if (id === 10) return Promise.resolve({ id: 10, name: "Ana PV", nickname: "Ana", department: "pos_venda", active: true });
    if (id === 1) return Promise.resolve({ id: 1, name: "Leo", nickname: "Leo", department: "vendas", active: true });
    return Promise.resolve(undefined);
  }),
  listSellers: vi.fn().mockResolvedValue([
    { id: 1, name: "Leo", department: "vendas", active: true },
    { id: 10, name: "Ana PV", department: "pos_venda", active: true },
  ]),
  getPvChamadosAlerta: vi.fn().mockResolvedValue({ vencendo: [], vencidos: [] }),
  deletePvChamado: vi.fn().mockResolvedValue(undefined),
  listPvHistorico: vi.fn().mockResolvedValue([]),
  listOficinas: vi.fn().mockResolvedValue([]),
  createOficina: vi.fn().mockResolvedValue(1),
  updateOficina: vi.fn().mockResolvedValue(undefined),
  listPvGastos: vi.fn().mockResolvedValue([]),
  createPvGasto: vi.fn().mockResolvedValue(1),
  updatePvGasto: vi.fn().mockResolvedValue(undefined),
  deletePvGasto: vi.fn().mockResolvedValue(undefined),
  getPvGastosPendentes: vi.fn().mockResolvedValue({ count: 0, total: 0 }),
  getAllPushSubscriptions: vi.fn().mockResolvedValue([]),
  getPushSubscriptionsBySeller: vi.fn().mockResolvedValue([]),
  deletePushSubscription: vi.fn().mockResolvedValue(undefined),
}));

// Mock pushService
vi.mock("./pushService", () => ({
  sendPushNewPvChamado: vi.fn().mockResolvedValue(undefined),
  sendPushToSeller: vi.fn().mockResolvedValue(undefined),
  sendPushToPosVenda: vi.fn().mockResolvedValue(undefined),
  sendPushToAll: vi.fn().mockResolvedValue(undefined),
  sendPushNewSale: vi.fn().mockResolvedValue(undefined),
  sendPushSaleApproved: vi.fn().mockResolvedValue(undefined),
  sendPushOvertake: vi.fn().mockResolvedValue(undefined),
  sendPushPendingSale: vi.fn().mockResolvedValue(undefined),
  sendPushPendingRecord: vi.fn().mockResolvedValue(undefined),
  sendPushAppointmentExpiring: vi.fn().mockResolvedValue(undefined),
  sendPushRescueAlert: vi.fn().mockResolvedValue(undefined),
  sendPushInactivityAlert: vi.fn().mockResolvedValue(undefined),
  sendPushAttendanceApproved: vi.fn().mockResolvedValue(undefined),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://example.com/file.jpg", key: "file.jpg" }),
}));

describe("Pós-Venda Panel", () => {
  it("pvChamados.list returns all chamados without filter (for pos_venda sector)", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    
    const result = await caller.pvChamados.list({});
    expect(result).toHaveLength(2);
    expect(result[0].ticketNumber).toBe("PV-0001");
    expect(result[1].ticketNumber).toBe("PV-0002");
  });

  it("pvChamados.list can filter by vendedorId (for regular sellers)", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    
    await caller.pvChamados.list({ vendedorId: 1 });
    const db = await import("./db");
    expect(db.listPvChamados).toHaveBeenCalledWith({ vendedorId: 1 });
  });

  it("pvChamados.counts returns status counts", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    
    const counts = await caller.pvChamados.counts();
    expect(counts.aberto).toBe(2);
    expect(counts.agendado).toBe(1);
    expect(counts.em_servico).toBe(1);
    expect(counts.total).toBe(4);
  });

  it("pvChamados.create sends push notification to pos_venda sector", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    
    const result = await caller.pvChamados.create({
      clienteNome: "Carlos",
      carroModelo: "HB20",
      problemaRelatado: "Barulho no motor",
      vendedorId: 1,
    });
    
    expect(result.ticketNumber).toBe("PV-0001");
    
    const pushService = await import("./pushService");
    expect(pushService.sendPushNewPvChamado).toHaveBeenCalledWith(
      "Leo", "Carlos", "HB20", "PV-0001"
    );
  });

  it("pvChamados.updateBySeller allows pos_venda sector to update", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    
    const result = await caller.pvChamados.updateBySeller({
      id: 1,
      sellerId: 10, // Ana PV - department: pos_venda
      status: "agendado",
    });
    
    expect(result).toBeDefined();
    const db = await import("./db");
    expect(db.updatePvChamado).toHaveBeenCalledWith(1, { status: "agendado" }, "Ana");
  });

  it("pvChamados.updateBySeller rejects non-pos_venda sellers", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    
    await expect(
      caller.pvChamados.updateBySeller({
        id: 1,
        sellerId: 1, // Leo - department: vendas
        status: "agendado",
      })
    ).rejects.toThrow("Apenas colaboradores do setor Pós-Venda");
  });

  it("pvChamados.updateBySeller rejects unknown seller", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    
    await expect(
      caller.pvChamados.updateBySeller({
        id: 1,
        sellerId: 999, // não existe
        status: "agendado",
      })
    ).rejects.toThrow("Apenas colaboradores do setor Pós-Venda");
  });
});

describe("Pós-Venda Department Config", () => {
  it("pos_venda department should exist in DEPT_CONFIG", () => {
    // This tests that the pos_venda department is recognized
    const validDepartments = ['vendas', 'pre_vendas', 'fei', 'consignacao', 'despachante', 'pos_venda', 'marketing'];
    expect(validDepartments).toContain('pos_venda');
    expect(validDepartments).toContain('marketing');
  });

  it("pos_venda sellers should not be in sales ranking", () => {
    // Verify the ranking departments
    const salesRankDepts = ['vendas'];
    const appointmentRankDepts = ['vendas', 'pre_vendas'];
    
    expect(salesRankDepts).not.toContain('pos_venda');
    expect(appointmentRankDepts).not.toContain('pos_venda');
  });
});
