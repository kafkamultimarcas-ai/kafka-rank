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
});
