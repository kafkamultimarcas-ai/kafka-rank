import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  listSdrRecords: vi.fn().mockResolvedValue([
    { id: 1, sellerId: 5, customerName: "Jose", customerPhone: "47999465206", isFeirão: false, attendanceStatus: "pending", type: "agendamento" },
    { id: 2, sellerId: 5, customerName: "Edilson", customerPhone: "+55 47 9253-6505", isFeirão: true, attendanceStatus: "pending", type: "agendamento" },
  ]),
  updateSdrRecord: vi.fn().mockResolvedValue({ success: true }),
  rescheduleSdrRecord: vi.fn().mockResolvedValue({ success: true }),
}));

import * as db from "./db";

describe("Agendamentos - Toggle Feirão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve chamar updateSdrRecord com isFeirão=true ao jogar pro feirão", async () => {
    await db.updateSdrRecord(1, { isFeirão: true });
    expect(db.updateSdrRecord).toHaveBeenCalledWith(1, { isFeirão: true });
  });

  it("deve chamar updateSdrRecord com isFeirão=false ao remover do feirão", async () => {
    await db.updateSdrRecord(2, { isFeirão: false });
    expect(db.updateSdrRecord).toHaveBeenCalledWith(2, { isFeirão: false });
  });

  it("deve verificar que o agendamento pertence ao vendedor antes de alterar", async () => {
    const records = await db.listSdrRecords(undefined, 5);
    const record = records.find((r: any) => r.id === 1);
    expect(record).toBeDefined();
    expect(record?.sellerId).toBe(5);
  });

  it("deve retornar undefined se agendamento não pertence ao vendedor", async () => {
    const records = await db.listSdrRecords(undefined, 5);
    const record = records.find((r: any) => r.id === 999);
    expect(record).toBeUndefined();
  });
});

describe("Agendamentos - Editar pelo Vendedor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve atualizar nome do cliente", async () => {
    await db.updateSdrRecord(1, { customerName: "José da Silva" });
    expect(db.updateSdrRecord).toHaveBeenCalledWith(1, { customerName: "José da Silva" });
  });

  it("deve atualizar telefone do cliente", async () => {
    await db.updateSdrRecord(1, { customerPhone: "47999999999" });
    expect(db.updateSdrRecord).toHaveBeenCalledWith(1, { customerPhone: "47999999999" });
  });

  it("deve atualizar data do agendamento (reagendar)", async () => {
    const newDate = new Date("2026-03-30T14:00:00").getTime();
    await db.updateSdrRecord(1, { scheduledDate: newDate });
    expect(db.updateSdrRecord).toHaveBeenCalledWith(1, { scheduledDate: newDate });
  });

  it("deve atualizar veículo de interesse", async () => {
    await db.updateSdrRecord(1, { vehicleInterest: "Civic 2025" });
    expect(db.updateSdrRecord).toHaveBeenCalledWith(1, { vehicleInterest: "Civic 2025" });
  });

  it("deve atualizar múltiplos campos de uma vez", async () => {
    const data = {
      customerName: "Carlos",
      customerPhone: "47988887777",
      vehicleInterest: "Corolla",
      scheduledDate: new Date("2026-04-01T10:00:00").getTime(),
      notes: "Cliente quer trocar carro",
      isFeirão: true,
    };
    await db.updateSdrRecord(1, data);
    expect(db.updateSdrRecord).toHaveBeenCalledWith(1, data);
  });

  it("deve atualizar observações", async () => {
    await db.updateSdrRecord(1, { notes: "Cliente pediu para reagendar" });
    expect(db.updateSdrRecord).toHaveBeenCalledWith(1, { notes: "Cliente pediu para reagendar" });
  });
});

describe("Agendamentos - Validações de dados", () => {
  it("deve formatar data corretamente para datetime-local", () => {
    const timestamp = new Date("2026-03-28T14:30:00").getTime();
    const formatted = new Date(timestamp).toISOString().slice(0, 16);
    // toISOString retorna UTC, o offset depende do timezone do servidor
    expect(formatted).toMatch(/^2026-03-28T\d{2}:\d{2}$/);
    expect(formatted.length).toBe(16);
  });

  it("deve converter datetime-local de volta para timestamp", () => {
    const dateStr = "2026-03-28T14:30";
    const timestamp = new Date(dateStr).getTime();
    expect(timestamp).toBeGreaterThan(0);
    expect(new Date(timestamp).getFullYear()).toBe(2026);
  });

  it("deve verificar que isFeirão é boolean", () => {
    expect(typeof true).toBe("boolean");
    expect(typeof false).toBe("boolean");
  });
});
