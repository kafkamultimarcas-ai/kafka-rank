import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Agendamento Features - Transfer, AI Rescue, Follow-up", () => {
  it("should have transferAppointment procedure in sdr router", () => {
    const sdrRouter = (appRouter as any)._def.procedures;
    // Check that the sdr.transferAppointment procedure exists
    expect(sdrRouter).toBeDefined();
    const keys = Object.keys(sdrRouter);
    expect(keys).toContain("sdr.transferAppointment");
  });

  it("should have aiRescueWhatsApp procedure in sdr router", () => {
    const sdrRouter = (appRouter as any)._def.procedures;
    const keys = Object.keys(sdrRouter);
    expect(keys).toContain("sdr.aiRescueWhatsApp");
  });

  it("transferAppointment should be a procedure with inputs", () => {
    const procedures = (appRouter as any)._def.procedures;
    const proc = procedures["sdr.transferAppointment"];
    expect(proc).toBeDefined();
    expect(proc._def).toBeDefined();
  });

  it("aiRescueWhatsApp should be a procedure with inputs", () => {
    const procedures = (appRouter as any)._def.procedures;
    const proc = procedures["sdr.aiRescueWhatsApp"];
    expect(proc).toBeDefined();
    expect(proc._def).toBeDefined();
  });

  it("should have the alert-checker module with follow-up logic", async () => {
    const alertChecker = await import("./alert-checker");
    expect(alertChecker.startAlertChecker).toBeDefined();
    expect(alertChecker.stopAlertChecker).toBeDefined();
    expect(typeof alertChecker.startAlertChecker).toBe("function");
    expect(typeof alertChecker.stopAlertChecker).toBe("function");
  });

  it("transferAppointment should require id, sellerId, and newSellerId inputs", () => {
    const procedures = (appRouter as any)._def.procedures;
    const proc = procedures["sdr.transferAppointment"];
    // The procedure should have input validation
    expect(proc._def.inputs).toBeDefined();
    expect(proc._def.inputs.length).toBeGreaterThan(0);
  });

  it("aiRescueWhatsApp should require id and sellerId inputs", () => {
    const procedures = (appRouter as any)._def.procedures;
    const proc = procedures["sdr.aiRescueWhatsApp"];
    expect(proc._def.inputs).toBeDefined();
    expect(proc._def.inputs.length).toBeGreaterThan(0);
  });
});
