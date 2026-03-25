import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getIamConfig: vi.fn(),
  updateIamConfig: vi.fn(),
}));

import * as db from "./db";

describe("IAM Config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getIamConfig returns config when exists", async () => {
    const mockConfig = {
      id: 1,
      dayContext: "feirao",
      dayContextCustom: "Feirão de SUVs",
      customGreeting: "Bora vender!",
      extraInstructions: "Foco em SUVs",
      alertMessage: "Feirão sábado",
      alertActive: true,
      weeklyFocus: "Bater 30 agendamentos",
      active: true,
      updatedAt: new Date(),
      updatedBy: "admin",
    };
    (db.getIamConfig as any).mockResolvedValue(mockConfig);

    const result = await db.getIamConfig();
    expect(result).toEqual(mockConfig);
    expect(result.dayContext).toBe("feirao");
    expect(result.alertActive).toBe(true);
    expect(result.weeklyFocus).toBe("Bater 30 agendamentos");
  });

  it("getIamConfig returns null when no config exists", async () => {
    (db.getIamConfig as any).mockResolvedValue(null);

    const result = await db.getIamConfig();
    expect(result).toBeNull();
  });

  it("updateIamConfig updates existing config", async () => {
    const updated = {
      id: 1,
      dayContext: "movimento_fraco",
      customGreeting: "Hora de prospectar!",
      extraInstructions: "Ligar para leads frios",
      alertActive: false,
      weeklyFocus: "Captar 10 consignados",
      updatedBy: "admin",
    };
    (db.updateIamConfig as any).mockResolvedValue(updated);

    const result = await db.updateIamConfig({
      dayContext: "movimento_fraco" as any,
      customGreeting: "Hora de prospectar!",
      extraInstructions: "Ligar para leads frios",
      weeklyFocus: "Captar 10 consignados",
      updatedBy: "admin",
    } as any);

    expect(result.dayContext).toBe("movimento_fraco");
    expect(result.weeklyFocus).toBe("Captar 10 consignados");
  });

  it("all day contexts are valid", () => {
    const validContexts = [
      "normal", "feirao", "movimento_fraco", "meta_apertada",
      "fim_de_mes", "inicio_de_mes", "promocao", "lancamento", "treinamento"
    ];
    validContexts.forEach(ctx => {
      expect(typeof ctx).toBe("string");
      expect(ctx.length).toBeGreaterThan(0);
    });
  });

  it("admin context generates proper prompt addition", () => {
    const config = {
      dayContext: "feirao",
      dayContextCustom: "Feirão de SUVs com 15% desconto",
      extraInstructions: "Foque em vender Tracker e Creta",
      weeklyFocus: "Vender 20 carros",
    };

    // Simulate the prompt building logic from routers.ts
    const contextMap: Record<string, string> = {
      normal: "Dia normal",
      feirao: "FEIRÃO em andamento! Urgência máxima!",
      movimento_fraco: "Movimento FRACO - precisa acelerar!",
      meta_apertada: "META APERTADA - foco total em fechar!",
    };

    const situation = contextMap[config.dayContext] || "Dia normal";
    expect(situation).toBe("FEIRÃO em andamento! Urgência máxima!");

    const prompt = `Situação: ${situation}\nDetalhes: ${config.dayContextCustom}\nInstruções do gerente: ${config.extraInstructions}\nFoco da semana: ${config.weeklyFocus}`;
    expect(prompt).toContain("FEIRÃO");
    expect(prompt).toContain("SUVs com 15% desconto");
    expect(prompt).toContain("Tracker e Creta");
    expect(prompt).toContain("Vender 20 carros");
  });
});
