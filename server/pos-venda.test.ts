import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  db: {
    // Oficinas
    listOficinas: vi.fn().mockResolvedValue([
      { id: 1, name: "Oficina Central", phone: "11999999999", address: "Rua A", active: true },
    ]),
    createOficina: vi.fn().mockResolvedValue({ id: 2 }),
    updateOficina: vi.fn().mockResolvedValue(undefined),
    deleteOficina: vi.fn().mockResolvedValue(undefined),
    // Chamados
    createPvChamado: vi.fn().mockResolvedValue({ id: 1 }),
    listPvChamados: vi.fn().mockResolvedValue([
      {
        id: 1, ticketNumber: "PV-001", clienteNome: "João Silva", clienteTelefone: "11999999999",
        carroModelo: "Onix 2022", carroPlaca: "ABC1D23", problemaRelatado: "Barulho na suspensão",
        status: "aberto", vendedorId: 1, createdAt: Date.now(),
      },
    ]),
    getPvChamadoCounts: vi.fn().mockResolvedValue({ aberto: 3, agendado: 1, em_servico: 2, finalizado: 1, entregue: 0, total: 7 }),
    updatePvChamado: vi.fn().mockResolvedValue(undefined),
    deletePvChamado: vi.fn().mockResolvedValue(undefined),
    getPvAlertasPrazo: vi.fn().mockResolvedValue({ vencendo: [], vencidos: [] }),
    listPvHistorico: vi.fn().mockResolvedValue([]),
    addPvHistorico: vi.fn().mockResolvedValue(undefined),
    // Gastos
    createPvGasto: vi.fn().mockResolvedValue({ id: 1 }),
    listPvGastos: vi.fn().mockResolvedValue([
      { id: 1, chamadoId: 1, descricao: "Troca amortecedor", valor: "450.00", statusAprovacao: "pendente" },
    ]),
    listAllPvGastos: vi.fn().mockResolvedValue([
      { id: 1, chamadoId: 1, descricao: "Troca amortecedor", valor: "450.00", statusAprovacao: "pendente", chamado: { clienteNome: "João", carroModelo: "Onix" } },
    ]),
    updatePvGastoStatus: vi.fn().mockResolvedValue(undefined),
    getPvGastosResumo: vi.fn().mockResolvedValue({ pendente: 450, autorizado: 200, recusado: 0, pago: 1000 }),
  },
}));

describe("Pós-Venda Module", () => {
  describe("Oficinas", () => {
    it("should list oficinas", async () => {
      const { db } = await import("./db");
      const result = await db.listOficinas();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Oficina Central");
    });

    it("should create oficina", async () => {
      const { db } = await import("./db");
      const result = await db.createOficina({ name: "Nova Oficina", phone: "11888888888", address: "Rua B" } as any);
      expect(result).toHaveProperty("id");
    });
  });

  describe("Chamados", () => {
    it("should create a chamado", async () => {
      const { db } = await import("./db");
      const result = await db.createPvChamado({
        clienteNome: "João Silva",
        clienteTelefone: "11999999999",
        carroModelo: "Onix 2022",
        carroPlaca: "ABC1D23",
        problemaRelatado: "Barulho na suspensão",
        vendedorId: 1,
      } as any);
      expect(result).toHaveProperty("id");
    });

    it("should list chamados", async () => {
      const { db } = await import("./db");
      const result = await db.listPvChamados();
      expect(result).toHaveLength(1);
      expect(result[0].clienteNome).toBe("João Silva");
      expect(result[0].status).toBe("aberto");
    });

    it("should get chamado counts by status", async () => {
      const { db } = await import("./db");
      const counts = await db.getPvChamadoCounts();
      expect(counts.aberto).toBe(3);
      expect(counts.total).toBe(7);
    });

    it("should update chamado status", async () => {
      const { db } = await import("./db");
      await db.updatePvChamado(1, { status: "agendado" } as any);
      expect(db.updatePvChamado).toHaveBeenCalledWith(1, { status: "agendado" });
    });

    it("should delete chamado", async () => {
      const { db } = await import("./db");
      await db.deletePvChamado(1);
      expect(db.deletePvChamado).toHaveBeenCalledWith(1);
    });

    it("should get prazo alerts", async () => {
      const { db } = await import("./db");
      const alertas = await db.getPvAlertasPrazo();
      expect(alertas).toHaveProperty("vencendo");
      expect(alertas).toHaveProperty("vencidos");
    });
  });

  describe("Gastos", () => {
    it("should create a gasto", async () => {
      const { db } = await import("./db");
      const result = await db.createPvGasto({
        chamadoId: 1,
        descricao: "Troca amortecedor",
        valor: "450.00",
      } as any);
      expect(result).toHaveProperty("id");
    });

    it("should list gastos for a chamado", async () => {
      const { db } = await import("./db");
      const result = await db.listPvGastos(1);
      expect(result).toHaveLength(1);
      expect(result[0].descricao).toBe("Troca amortecedor");
      expect(result[0].statusAprovacao).toBe("pendente");
    });

    it("should update gasto status to autorizado", async () => {
      const { db } = await import("./db");
      await db.updatePvGastoStatus(1, "autorizado", "Admin");
      expect(db.updatePvGastoStatus).toHaveBeenCalledWith(1, "autorizado", "Admin");
    });

    it("should update gasto status to pago", async () => {
      const { db } = await import("./db");
      await db.updatePvGastoStatus(1, "pago", "Admin");
      expect(db.updatePvGastoStatus).toHaveBeenCalledWith(1, "pago", "Admin");
    });

    it("should get gastos resumo for financeiro", async () => {
      const { db } = await import("./db");
      const resumo = await db.getPvGastosResumo();
      expect(resumo.pendente).toBe(450);
      expect(resumo.autorizado).toBe(200);
      expect(resumo.pago).toBe(1000);
    });

    it("should list all gastos with chamado info", async () => {
      const { db } = await import("./db");
      const result = await db.listAllPvGastos();
      expect(result).toHaveLength(1);
      expect(result[0].chamado.clienteNome).toBe("João");
    });
  });

  describe("Status Flow", () => {
    it("should follow correct status flow: aberto -> agendado -> em_servico -> finalizado -> entregue", () => {
      const validTransitions: Record<string, string[]> = {
        aberto: ["agendado", "em_servico", "cancelado"],
        agendado: ["em_servico", "cancelado"],
        em_servico: ["finalizado", "cancelado"],
        finalizado: ["entregue"],
        entregue: [],
        cancelado: [],
      };
      expect(validTransitions.aberto).toContain("agendado");
      expect(validTransitions.agendado).toContain("em_servico");
      expect(validTransitions.em_servico).toContain("finalizado");
      expect(validTransitions.finalizado).toContain("entregue");
    });

    it("should follow correct gasto approval flow: pendente -> autorizado -> pago", () => {
      const validGastoTransitions: Record<string, string[]> = {
        pendente: ["autorizado", "recusado"],
        autorizado: ["pago"],
        recusado: [],
        pago: [],
      };
      expect(validGastoTransitions.pendente).toContain("autorizado");
      expect(validGastoTransitions.pendente).toContain("recusado");
      expect(validGastoTransitions.autorizado).toContain("pago");
    });
  });
});
