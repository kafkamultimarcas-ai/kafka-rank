import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as crmDb from "./crmDb";
import bcrypt from "bcryptjs";
import { withTenantAsync } from "./tenantDb";

const TEST_TENANT_ID = 1;

// Helper to create a context without user (public)
function createPublicContext(): TrpcContext {
  return {
    user: null,
    tenantId: TEST_TENANT_ID,
    tenantSlug: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// Helper to create an admin context (Manus owner)
function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "owner-id",
      email: "owner@example.com",
      name: "Owner",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    tenantId: TEST_TENANT_ID,
    tenantSlug: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("CRM Pipeline", () => {
  it("returns pipeline stages for vendas department", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const stages = await caller.crmPipeline.getStages({ department: "vendas" });
    expect(stages).toBeDefined();
    expect(Array.isArray(stages)).toBe(true);
    expect(stages.length).toBeGreaterThan(0);
    const first = stages[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("department");
    expect(first.department).toBe("vendas");
  });

  it("returns pipeline stages for pre_vendas department", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const stages = await caller.crmPipeline.getStages({ department: "pre_vendas" });
    expect(stages).toBeDefined();
    expect(Array.isArray(stages)).toBe(true);
    expect(stages.length).toBeGreaterThan(0);
  });

  it("returns pipeline stages for consignacao department", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const stages = await caller.crmPipeline.getStages({ department: "consignacao" });
    expect(stages).toBeDefined();
    expect(Array.isArray(stages)).toBe(true);
    expect(stages.length).toBeGreaterThan(0);
  });
});

describe("CRM Admin Auth", () => {
  let testAdminUsername: string;
  let testAdminId: number;

  beforeAll(async () => {
    const hash = await bcrypt.hash("testpass123", 10);
    testAdminUsername = "testadmin_" + Date.now();
    testAdminId = await withTenantAsync(TEST_TENANT_ID, () => crmDb.createAdmin({
      username: testAdminUsername,
      passwordHash: hash,
      name: "Test Admin",
      role: "admin",
    }));
  });

  afterAll(async () => {
    if (testAdminId) await withTenantAsync(TEST_TENANT_ID, () => crmDb.deleteAdmin(testAdminId));
  });

  it("admin login returns token on valid credentials", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.adminAuth.login({
      username: testAdminUsername,
      password: "testpass123",
    });
    expect(result).toHaveProperty("token");
    expect(result.token.length).toBeGreaterThan(10);
    expect(result.admin).toHaveProperty("name", "Test Admin");
  });

  it("admin login fails with wrong password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.adminAuth.login({ username: testAdminUsername, password: "wrongpass" })
    ).rejects.toThrow();
  });

  it("admin me returns null for invalid token", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.adminAuth.me({ token: "invalid_token_123" });
    expect(result).toBeNull();
  });

  it("admin me returns admin data for valid token", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const loginResult = await caller.adminAuth.login({
      username: testAdminUsername,
      password: "testpass123",
    });
    const meResult = await caller.adminAuth.me({ token: loginResult.token });
    expect(meResult).toBeDefined();
    expect(meResult!.name).toBe("Test Admin");
  });
});

describe("CRM Leads", () => {
  // sellerId is required - use a dummy value
  const testSellerId = 999;
  let testLeadId: number;

  it("creates a new lead", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.crmLeads.create({
      sellerId: testSellerId,
      name: "Cliente Teste CRM",
      phone: "11999998888",
      department: "vendas",
      source: "manual",
      vehicleInterest: "HB20 2023",
    });
    expect(result).toHaveProperty("id");
    expect(result.id).toBeGreaterThan(0);
    testLeadId = result.id;
  });

  it("gets lead by id", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const lead = await caller.crmLeads.getById({ id: testLeadId });
    expect(lead).toBeDefined();
    expect(lead!.name).toBe("Cliente Teste CRM");
    expect(lead!.phone).toBe("11999998888");
    expect(lead!.vehicleInterest).toBe("HB20 2023");
  });

  it("searches leads by name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const results = await caller.crmLeads.search({ query: "Cliente Teste CRM" });
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(l => l.name === "Cliente Teste CRM")).toBe(true);
  });

  it("searches leads by phone", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const results = await caller.crmLeads.search({ query: "11999998888" });
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });

  it("moves lead to a new stage", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.crmLeads.moveStage({
      id: testLeadId,
      newStage: "Em Negociacao",
      sellerId: testSellerId,
    });
    expect(result.success).toBe(true);

    const lead = await caller.crmLeads.getById({ id: testLeadId });
    expect(lead!.stage).toBe("Em Negociacao");
  });

  it("adds activity to a lead", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.crmLeads.addActivity({
      leadId: testLeadId,
      sellerId: testSellerId,
      type: "ligacao",
      description: "Ligacao de teste",
    });
    expect(result).toHaveProperty("id");
  });

  it("lists activities for a lead", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const activities = await caller.crmLeads.getActivities({ leadId: testLeadId });
    expect(activities).toBeDefined();
    expect(activities.length).toBeGreaterThan(0);
    expect(activities.some(a => a.type === "ligacao")).toBe(true);
  });

  it("updates lead score", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.crmLeads.update({
      id: testLeadId,
      score: "hot",
    });
    expect(result.success).toBe(true);

    const lead = await caller.crmLeads.getById({ id: testLeadId });
    expect(lead!.score).toBe("hot");
  });

  it("gets lead stats for seller", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const stats = await caller.crmLeads.getStats({ sellerId: testSellerId });
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("hot");
    expect(stats).toHaveProperty("warm");
    expect(stats).toHaveProperty("cold");
    expect(stats.total).toBeGreaterThan(0);
  });
});

describe("CRM Inventory", () => {
  let testVehicleId: number;

  it("creates a vehicle in inventory", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.crmInventory.create({
      brand: "Hyundai",
      model: "HB20",
      year: "2023",
      color: "Branco",
      price: 75000,
      plate: "ABC1234",
    });
    expect(result).toHaveProperty("id");
    testVehicleId = result.id;
  });

  it("lists inventory", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const inventory = await caller.crmInventory.list({});
    expect(inventory).toBeDefined();
    expect(inventory.length).toBeGreaterThan(0);
    expect(inventory.some(v => v.brand === "Hyundai")).toBe(true);
  });

  it("gets vehicle by id", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const vehicle = await caller.crmInventory.getById({ id: testVehicleId });
    expect(vehicle).toBeDefined();
    expect(vehicle!.brand).toBe("Hyundai");
    expect(vehicle!.model).toBe("HB20");
  });

  it("updates vehicle status", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.crmInventory.update({
      id: testVehicleId,
      status: "reserved",
    });
    expect(result.success).toBe(true);

    const caller2 = appRouter.createCaller(createPublicContext());
    const vehicle = await caller2.crmInventory.getById({ id: testVehicleId });
    expect(vehicle!.status).toBe("reserved");
  });
});

describe("CRM Integrations", () => {
  let testIntegrationId: number;
  let testApiToken: string;

  it("creates an integration", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.crmIntegrations.create({
      type: "olx",
      name: "OLX Integration",
    });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("apiToken");
    expect(result.apiToken.startsWith("kafka_")).toBe(true);
    testIntegrationId = result.id;
    testApiToken = result.apiToken;
  });

  it("lists integrations", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const integrations = await caller.crmIntegrations.list();
    expect(integrations).toBeDefined();
    expect(integrations.length).toBeGreaterThan(0);
    expect(integrations.some(i => i.name === "OLX Integration")).toBe(true);
  });

  it("regenerates token", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.crmIntegrations.regenerateToken({ id: testIntegrationId });
    expect(result.apiToken).toBeDefined();
    expect(result.apiToken).not.toBe(testApiToken);
    expect(result.apiToken.startsWith("kafka_")).toBe(true);
  });
});
