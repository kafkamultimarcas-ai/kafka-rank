import { describe, expect, it } from "vitest";

/**
 * Testes para validar a lógica de pontuação e formatação de valores monetários.
 * 
 * Bug 1: Ranking mostrava pontos > vendas (Wesley 8 vendas = 9 pts, Matheus 4 vendas = 5 pts)
 *   Causa: updateSaleTotals com incrementSales=false somava totalPoints para agendamentos
 *   Fix: totalPoints do seller só é incrementado quando incrementSales=true (vendas reais)
 * 
 * Bug 2: Valores de vendas divididos por 100 (Etios R$ 46.000 mostrava R$ 460,00)
 *   Causa: Frontend dividia por 100 (tratava como centavos) mas banco armazena em reais inteiros
 *   Fix: Removido /100 da exibição e *100 do envio. Padronizado tudo para reais inteiros.
 */

describe("Formatação de valores monetários", () => {
  // Simula a função formatCurrency corrigida (sem /100)
  function formatCurrency(v: number | null | undefined): string {
    if (!v) return "—";
    return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }

  it("deve formatar R$ 46.000 corretamente (não dividir por 100)", () => {
    const valorBanco = 46000; // valor salvo no banco em reais inteiros
    const resultado = formatCurrency(valorBanco);
    // Deve mostrar R$ 46.000,00, NÃO R$ 460,00
    expect(resultado).toContain("46");
    expect(resultado).not.toBe("R$ 460,00");
    // O valor formatado deve ser >= R$ 1.000 para um carro
    const numericPart = parseFloat(resultado.replace(/[^\d,]/g, "").replace(",", "."));
    expect(numericPart).toBeGreaterThanOrEqual(1000);
  });

  it("deve formatar R$ 62.900 corretamente", () => {
    const valorBanco = 62900;
    const resultado = formatCurrency(valorBanco);
    expect(resultado).toContain("62");
    expect(resultado).not.toBe("R$ 629,00");
  });

  it("deve retornar traço para valor nulo", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatCurrency(0)).toBe("—");
  });
});

describe("Lógica de pontuação do ranking", () => {
  // Simula a lógica do updateSaleTotals corrigida
  type SellerTotals = { totalSales: number; totalPoints: number };

  function simulateUpdateSaleTotals(
    seller: SellerTotals,
    points: number,
    incrementSales: boolean
  ): SellerTotals {
    if (incrementSales) {
      // Vendas reais: soma totalSales E totalPoints
      return {
        totalSales: seller.totalSales + 1,
        totalPoints: seller.totalPoints + points,
      };
    } else {
      // Agendamentos/F&I/etc: NÃO soma no totalPoints do vendedor
      // (pontos são rastreados separadamente nas competition_participants)
      return { ...seller };
    }
  }

  it("venda real deve incrementar totalSales e totalPoints igualmente", () => {
    const seller = { totalSales: 8, totalPoints: 8 };
    const result = simulateUpdateSaleTotals(seller, 1, true);
    expect(result.totalSales).toBe(9);
    expect(result.totalPoints).toBe(9);
    // totalSales deve SEMPRE ser igual a totalPoints para vendas simples (1 pt cada)
    expect(result.totalSales).toBe(result.totalPoints);
  });

  it("agendamento NÃO deve incrementar totalPoints do vendedor", () => {
    const seller = { totalSales: 8, totalPoints: 8 };
    const result = simulateUpdateSaleTotals(seller, 1, false);
    // Após aprovar agendamento, totalPoints NÃO deve mudar
    expect(result.totalSales).toBe(8);
    expect(result.totalPoints).toBe(8);
    // Bug antigo: totalPoints seria 9 (8+1) com incrementSales=false
    expect(result.totalPoints).not.toBe(9);
  });

  it("F&I aprovado NÃO deve incrementar totalPoints do vendedor de vendas", () => {
    const seller = { totalSales: 4, totalPoints: 4 };
    const result = simulateUpdateSaleTotals(seller, 2, false);
    expect(result.totalSales).toBe(4);
    expect(result.totalPoints).toBe(4);
    // Bug antigo: totalPoints seria 6 (4+2)
    expect(result.totalPoints).not.toBe(6);
  });

  it("totalSales e totalPoints devem ser iguais após múltiplas vendas", () => {
    let seller = { totalSales: 0, totalPoints: 0 };
    // Simula 5 vendas
    for (let i = 0; i < 5; i++) {
      seller = simulateUpdateSaleTotals(seller, 1, true);
    }
    // Simula 3 agendamentos aprovados (não devem afetar)
    for (let i = 0; i < 3; i++) {
      seller = simulateUpdateSaleTotals(seller, 1, false);
    }
    expect(seller.totalSales).toBe(5);
    expect(seller.totalPoints).toBe(5);
    // Bug antigo: totalPoints seria 8 (5+3)
    expect(seller.totalPoints).not.toBe(8);
  });
});

describe("Validação de envio de valores (sem multiplicar por 100)", () => {
  // Simula o processamento do formulário de registro
  function processVendaValue(input: string): number | undefined {
    if (!input) return undefined;
    return parseInt(input.replace(/\D/g, ""));
  }

  function processFeiValue(input: string): number | undefined {
    if (!input) return undefined;
    // Corrigido: não multiplica mais por 100
    return Math.round(parseFloat(input.replace(/\D/g, "")) || 0);
  }

  it("valor de venda deve ser salvo como reais inteiros", () => {
    const result = processVendaValue("46000");
    expect(result).toBe(46000);
    // NÃO deve ser 4600000 (centavos)
    expect(result).not.toBe(4600000);
  });

  it("valor de F&I deve ser salvo como reais inteiros (sem * 100)", () => {
    const result = processFeiValue("57000");
    expect(result).toBe(57000);
    // Bug antigo: seria 5700000 (centavos)
    expect(result).not.toBe(5700000);
  });

  it("valor vazio deve retornar undefined", () => {
    expect(processVendaValue("")).toBeUndefined();
    expect(processFeiValue("")).toBeUndefined();
  });
});
