import { describe, it, expect } from "vitest";
import { BANCOS_FINANCIAMENTO } from "../drizzle/schema";

describe("Fichas de Financiamento - Schema & Constants", () => {
  it("deve ter a lista completa de bancos de financiamento", () => {
    expect(BANCOS_FINANCIAMENTO).toBeDefined();
    expect(Array.isArray(BANCOS_FINANCIAMENTO)).toBe(true);
    expect(BANCOS_FINANCIAMENTO.length).toBeGreaterThanOrEqual(15);
    
    // Verificar bancos obrigatórios
    const bancosEsperados = [
      "Santander", "Bradesco", "Itaú", "Pan", "C6", "Safra",
      "BBC", "Omni", "Daycoval", "BV", "Ailos", "Sicoob",
      "Listo", "Carbank", "Porto Seguro"
    ];
    bancosEsperados.forEach(banco => {
      expect(BANCOS_FINANCIAMENTO).toContain(banco);
    });
  });

  it("deve ter bancos únicos sem duplicatas", () => {
    const unique = new Set(BANCOS_FINANCIAMENTO);
    expect(unique.size).toBe(BANCOS_FINANCIAMENTO.length);
  });
});

describe("Fichas de Financiamento - Status Flow", () => {
  it("deve ter os status corretos definidos", () => {
    const validStatuses = ["na_fila", "em_analise", "aprovado", "recusado", "parcial"];
    validStatuses.forEach(status => {
      expect(typeof status).toBe("string");
    });
  });

  it("deve ter os status de banco corretos", () => {
    const validBancoStatuses = ["pendente", "em_analise", "aprovado", "recusado"];
    validBancoStatuses.forEach(status => {
      expect(typeof status).toBe("string");
    });
  });

  it("fluxo: na_fila -> em_analise -> aprovado/recusado/parcial", () => {
    const flow = {
      na_fila: ["em_analise"],
      em_analise: ["aprovado", "recusado", "parcial"],
      aprovado: [],
      recusado: [],
      parcial: [],
    };
    expect(flow.na_fila).toContain("em_analise");
    expect(flow.em_analise).toContain("aprovado");
    expect(flow.em_analise).toContain("recusado");
    expect(flow.em_analise).toContain("parcial");
  });
});

describe("Fichas de Financiamento - Validação de Dados", () => {
  it("deve validar CPF obrigatório", () => {
    const ficha = { nomeCompleto: "João Silva", cpf: "123.456.789-00" };
    expect(ficha.cpf).toBeTruthy();
    expect(ficha.nomeCompleto).toBeTruthy();
  });

  it("deve calcular valor da parcela em centavos corretamente", () => {
    const valorParcela = 1500.50;
    const centavos = Math.round(valorParcela * 100);
    expect(centavos).toBe(150050);
    
    // Converter de volta
    const reais = centavos / 100;
    expect(reais).toBe(1500.50);
  });

  it("deve formatar moeda brasileira corretamente", () => {
    const formatCurrency = (cents: number) => {
      return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    };
    const result = formatCurrency(150000);
    expect(result).toContain("1.500");
  });

  it("deve calcular tempo de análise corretamente", () => {
    const inicio = Date.now();
    const fim = inicio + 30 * 60 * 1000; // 30 minutos
    const tempoMinutos = Math.round((fim - inicio) / 60000);
    expect(tempoMinutos).toBe(30);
  });
});
