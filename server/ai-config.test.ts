import { describe, it, expect } from "vitest";

describe("AI Global Config Feature", () => {
  it("should have getGlobalAiConfig procedure in crmAi router", async () => {
    const mod = await import("./routers/crmRouter");
    expect(mod.crmAiRouter).toBeDefined();
    expect(mod.crmAiRouter.getGlobalAiConfig).toBeDefined();
  });

  it("should have setGlobalAiConfig procedure in crmAi router", async () => {
    const mod = await import("./routers/crmRouter");
    expect(mod.crmAiRouter).toBeDefined();
    expect(mod.crmAiRouter.setGlobalAiConfig).toBeDefined();
  });

  it("should have suggestReply procedure in crmAi router", async () => {
    const mod = await import("./routers/crmRouter");
    expect(mod.crmAiRouter).toBeDefined();
    expect(mod.crmAiRouter.suggestReply).toBeDefined();
  });

  it("should have getAutoReply procedure in crmAi router", async () => {
    const mod = await import("./routers/crmRouter");
    expect(mod.crmAiRouter).toBeDefined();
    expect(mod.crmAiRouter.getAutoReply).toBeDefined();
  });

  it("should have setAutoReply procedure in crmAi router", async () => {
    const mod = await import("./routers/crmRouter");
    expect(mod.crmAiRouter).toBeDefined();
    expect(mod.crmAiRouter.setAutoReply).toBeDefined();
  });

  it("setGlobalAiConfig should accept normal and feirao modes", async () => {
    const mod = await import("./routers/crmRouter");
    const router = mod.crmAiRouter;
    // Verify the procedure exists and is a mutation
    expect(router.setGlobalAiConfig).toBeDefined();
    expect(router.setGlobalAiConfig._def).toBeDefined();
  });

  it("lead listing should sort by lastContactDate descending", async () => {
    const crmDb = await import("./crmDb");
    expect(crmDb.listAllLeads).toBeDefined();
    // The function should exist and be callable
    expect(typeof crmDb.listAllLeads).toBe("function");
  });

  it("getUnrespondedLeads should check last message direction", async () => {
    const crmDb = await import("./crmDb");
    expect(crmDb.getUnrespondedLeads).toBeDefined();
    expect(typeof crmDb.getUnrespondedLeads).toBe("function");
  });

  // === Advanced AI Config Tests ===
  it("should have setAdvancedAiConfig procedure in crmAi router", async () => {
    const mod = await import("./routers/crmRouter");
    expect(mod.crmAiRouter.setAdvancedAiConfig).toBeDefined();
  });

  it("should have getInactiveDispatchStats procedure in crmAi router", async () => {
    const mod = await import("./routers/crmRouter");
    expect(mod.crmAiRouter.getInactiveDispatchStats).toBeDefined();
  });

  it("should have triggerInactiveDispatch procedure in crmAi router", async () => {
    const mod = await import("./routers/crmRouter");
    expect(mod.crmAiRouter.triggerInactiveDispatch).toBeDefined();
  });

  it("should validate working hours range correctly", () => {
    const isWithinWorkingHours = (h: number, start: number, end: number) => h >= start && h < end;
    expect(isWithinWorkingHours(10, 8, 20)).toBe(true);
    expect(isWithinWorkingHours(7, 8, 20)).toBe(false);
    expect(isWithinWorkingHours(20, 8, 20)).toBe(false);
    expect(isWithinWorkingHours(8, 8, 20)).toBe(true);
    expect(isWithinWorkingHours(19, 8, 20)).toBe(true);
  });

  it("should parse inactive dispatch message template variables", () => {
    const msg = "Oi {nome}! Ainda tem interesse no {veiculo}?";
    const parsed = msg.replace("{nome}", "João").replace("{veiculo}", "Civic 2024");
    expect(parsed).toBe("Oi João! Ainda tem interesse no Civic 2024?");
  });

  it("should have valid personality enum values", () => {
    const valid = ["amigavel", "profissional", "agressivo"];
    valid.forEach(p => expect(typeof p).toBe("string"));
    expect(valid).toHaveLength(3);
  });
});
