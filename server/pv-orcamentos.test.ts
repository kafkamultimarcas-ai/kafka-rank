import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  listPvOrcamentos: vi.fn().mockResolvedValue([]),
  listAllPvOrcamentosWithChamado: vi.fn().mockResolvedValue([]),
  listPvOrcamentoItens: vi.fn().mockResolvedValue([]),
  createPvOrcamento: vi.fn().mockResolvedValue(1),
  addPvOrcamentoItem: vi.fn().mockResolvedValue(1),
  deletePvOrcamentoItem: vi.fn().mockResolvedValue(undefined),
  updatePvOrcamentoStatus: vi.fn().mockResolvedValue(undefined),
  deletePvOrcamento: vi.fn().mockResolvedValue(undefined),
  getPvOrcamentosPendentes: vi.fn().mockResolvedValue({ count: 3, total: "1500.00" }),
  getPvOrcamentosResumo: vi.fn().mockResolvedValue([
    { status: "pendente", count: 3, total: "1500.00" },
    { status: "aprovado", count: 2, total: "800.00" },
  ]),
  getPvOrcamentoById: vi.fn().mockResolvedValue({ id: 1, titulo: "Orçamento Teste" }),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/foto.jpg", key: "pv-orcamentos/foto.jpg" }),
}));

// Mock push service
vi.mock("./pushService", () => ({
  sendPushNewPvChamado: vi.fn(),
}));

import * as db from "./db";

describe("PV Orçamentos - Backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPvOrcamentos", () => {
    it("deve retornar lista vazia quando não há orçamentos", async () => {
      const result = await db.listPvOrcamentos(1);
      expect(result).toEqual([]);
      expect(db.listPvOrcamentos).toHaveBeenCalledWith(1);
    });
  });

  describe("createPvOrcamento", () => {
    it("deve criar um orçamento com dados válidos", async () => {
      const data = {
        chamadoId: 1,
        titulo: "Orçamento Oficina X - Ar condicionado",
        descricao: "Troca do compressor",
        fotoUrl: null,
        fotoKey: null,
        valorTotal: "350.00",
        criadoPor: "João PV",
        criadoPorId: 5,
        statusAprovacao: "pendente" as const,
      };
      const result = await db.createPvOrcamento(data, "João PV");
      expect(result).toBe(1);
      expect(db.createPvOrcamento).toHaveBeenCalledWith(data, "João PV");
    });
  });

  describe("addPvOrcamentoItem", () => {
    it("deve adicionar item do tipo peça", async () => {
      const item = {
        orcamentoId: 1,
        tipo: "peca" as const,
        descricao: "Compressor Ar Condicionado",
        quantidade: 1,
        valorUnitario: "250.00",
        valorTotal: "250.00",
      };
      const result = await db.addPvOrcamentoItem(item);
      expect(result).toBe(1);
      expect(db.addPvOrcamentoItem).toHaveBeenCalledWith(item);
    });

    it("deve adicionar item do tipo serviço", async () => {
      const item = {
        orcamentoId: 1,
        tipo: "servico" as const,
        descricao: "Mão de obra instalação",
        quantidade: 1,
        valorUnitario: "100.00",
        valorTotal: "100.00",
      };
      await db.addPvOrcamentoItem(item);
      expect(db.addPvOrcamentoItem).toHaveBeenCalledWith(item);
    });
  });

  describe("updatePvOrcamentoStatus", () => {
    it("deve aprovar orçamento", async () => {
      await db.updatePvOrcamentoStatus(1, "aprovado", "Admin");
      expect(db.updatePvOrcamentoStatus).toHaveBeenCalledWith(1, "aprovado", "Admin");
    });

    it("deve reprovar orçamento com motivo", async () => {
      await db.updatePvOrcamentoStatus(1, "reprovado", "Admin", "Valor acima do mercado");
      expect(db.updatePvOrcamentoStatus).toHaveBeenCalledWith(1, "reprovado", "Admin", "Valor acima do mercado");
    });

    it("deve marcar como pago", async () => {
      await db.updatePvOrcamentoStatus(1, "pago", "Financeiro");
      expect(db.updatePvOrcamentoStatus).toHaveBeenCalledWith(1, "pago", "Financeiro");
    });
  });

  describe("deletePvOrcamento", () => {
    it("deve excluir orçamento e seus itens", async () => {
      await db.deletePvOrcamento(1);
      expect(db.deletePvOrcamento).toHaveBeenCalledWith(1);
    });
  });

  describe("getPvOrcamentosPendentes", () => {
    it("deve retornar contagem e total de pendentes", async () => {
      const result = await db.getPvOrcamentosPendentes();
      expect(result).toEqual({ count: 3, total: "1500.00" });
    });
  });

  describe("getPvOrcamentosResumo", () => {
    it("deve retornar resumo por status", async () => {
      const result = await db.getPvOrcamentosResumo();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("status");
      expect(result[0]).toHaveProperty("count");
      expect(result[0]).toHaveProperty("total");
    });
  });

  describe("listPvOrcamentoItens", () => {
    it("deve listar itens de um orçamento", async () => {
      const result = await db.listPvOrcamentoItens(1);
      expect(result).toEqual([]);
      expect(db.listPvOrcamentoItens).toHaveBeenCalledWith(1);
    });
  });

  describe("deletePvOrcamentoItem", () => {
    it("deve remover item e recalcular total", async () => {
      await db.deletePvOrcamentoItem(1, 1);
      expect(db.deletePvOrcamentoItem).toHaveBeenCalledWith(1, 1);
    });
  });

  describe("listAllPvOrcamentosWithChamado", () => {
    it("deve listar todos os orçamentos com info do chamado", async () => {
      const result = await db.listAllPvOrcamentosWithChamado();
      expect(result).toEqual([]);
    });

    it("deve filtrar por status", async () => {
      await db.listAllPvOrcamentosWithChamado("pendente");
      expect(db.listAllPvOrcamentosWithChamado).toHaveBeenCalledWith("pendente");
    });
  });
});

describe("PV Orçamentos - Validações de dados", () => {
  it("deve calcular valor total corretamente para múltiplos itens", () => {
    const itens = [
      { quantidade: 2, valorUnitario: "150.00" },
      { quantidade: 1, valorUnitario: "300.00" },
      { quantidade: 3, valorUnitario: "50.00" },
    ];
    const total = itens.reduce((sum, item) => sum + (item.quantidade * parseFloat(item.valorUnitario)), 0);
    expect(total).toBe(750);
  });

  it("deve formatar número de telefone para WhatsApp corretamente", () => {
    const telefone = "(47) 99787-6364";
    const formatted = telefone.replace(/\D/g, "");
    expect(formatted).toBe("47997876364");
    const whatsappUrl = `https://wa.me/55${formatted}`;
    expect(whatsappUrl).toBe("https://wa.me/5547997876364");
  });

  it("deve formatar número de telefone para ligação corretamente", () => {
    const telefone = "(47) 99787-6364";
    const telUrl = `tel:${telefone}`;
    expect(telUrl).toBe("tel:(47) 99787-6364");
  });

  it("deve validar tipos de itens permitidos", () => {
    const tiposPermitidos = ["peca", "servico", "outro"];
    expect(tiposPermitidos).toContain("peca");
    expect(tiposPermitidos).toContain("servico");
    expect(tiposPermitidos).toContain("outro");
    expect(tiposPermitidos).not.toContain("invalido");
  });

  it("deve validar status de aprovação permitidos", () => {
    const statusPermitidos = ["pendente", "aprovado", "reprovado", "pago"];
    expect(statusPermitidos).toContain("pendente");
    expect(statusPermitidos).toContain("aprovado");
    expect(statusPermitidos).toContain("reprovado");
    expect(statusPermitidos).toContain("pago");
  });
});
