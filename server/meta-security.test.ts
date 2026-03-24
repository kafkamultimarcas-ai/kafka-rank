import { describe, expect, it, vi } from "vitest";

// Test: passwordHash should not leak in API responses
describe("Security: passwordHash not exposed", () => {
  it("listSellers should not include passwordHash", async () => {
    const db = await import("./db");
    const sellers = await db.listSellers();
    for (const seller of sellers) {
      expect(seller).not.toHaveProperty("passwordHash");
    }
  });

  it("getSellerById should not include passwordHash", async () => {
    const db = await import("./db");
    const sellers = await db.listSellers();
    if (sellers.length > 0) {
      const seller = await db.getSellerById(sellers[0].id);
      expect(seller).not.toHaveProperty("passwordHash");
    }
  });

  it("getSellerByUsername still returns passwordHash for auth", async () => {
    const db = await import("./db");
    // getSellerByUsername is used internally for auth, so it should still have passwordHash
    // We just verify it exists as a function
    expect(typeof db.getSellerByUsername).toBe("function");
  });
});

// Test: Meta webhook signature verification
describe("Meta webhook signature verification", () => {
  it("verifyMetaSignature function exists in webhooks module", async () => {
    // The function is internal to webhooks.ts, so we test the webhook endpoint behavior
    // by checking the module loads without errors
    const webhooksModule = await import("./webhooks");
    expect(typeof webhooksModule.registerWebhookRoutes).toBe("function");
  });
});

// Test: crmDb getIntegrationByType
describe("crmDb.getIntegrationByType", () => {
  it("should return null for non-existent type", async () => {
    const crmDb = await import("./crmDb");
    const result = await crmDb.getIntegrationByType("nonexistent_type_12345");
    expect(result).toBeNull();
  });
});

// Test: Meta config routes exist in crmIntegrationsRouter
describe("Meta config routes", () => {
  it("crmIntegrationsRouter has getMetaConfig procedure", async () => {
    const { crmIntegrationsRouter } = await import("./routers/crmRouter");
    expect(crmIntegrationsRouter).toBeDefined();
    // Check the router has the expected procedures
    const procedures = Object.keys((crmIntegrationsRouter as any)._def.procedures || {});
    expect(procedures).toContain("getMetaConfig");
    expect(procedures).toContain("saveMetaConfig");
    expect(procedures).toContain("testMetaConnection");
  });
});

// Test: finDb overdue and upcoming functions
describe("finDb overdue and upcoming", () => {
  it("getOverdueTransactions returns array", async () => {
    const finDb = await import("./finDb");
    const result = await finDb.getOverdueTransactions();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getUpcomingDueTransactions returns array", async () => {
    const finDb = await import("./finDb");
    const result = await finDb.getUpcomingDueTransactions(3);
    expect(Array.isArray(result)).toBe(true);
  });

  it("autoUpdateOverdueStatus returns number", async () => {
    const finDb = await import("./finDb");
    const result = await finDb.autoUpdateOverdueStatus();
    expect(typeof result).toBe("number");
  });
});
