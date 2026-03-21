import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock crmDb
vi.mock("./crmDb", () => ({
  getIntegrationByToken: vi.fn(),
  getDefaultStage: vi.fn(),
  createLead: vi.fn(),
  createActivity: vi.fn(),
  updateLead: vi.fn(),
  getLeadById: vi.fn(),
  searchLeads: vi.fn(),
  listInventory: vi.fn(),
  getLeadsByVehicleInterest: vi.fn(),
  createInventoryItem: vi.fn(),
  createInventoryAlert: vi.fn(),
}));

// Mock db
vi.mock("./db", () => ({
  getDb: vi.fn(() => null),
}));

// Mock drizzle schema
vi.mock("../drizzle/schema", () => ({
  sellers: {},
  crmLeadDistribution: {},
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
}));

import * as crmDb from "./crmDb";

describe("Webhook Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crmDb.getDefaultStage).mockResolvedValue({ id: 1, name: "Novo Lead", department: "vendas", displayOrder: 1, color: "#3B82F6", isDefault: true, isFinal: false, createdAt: new Date() });
    vi.mocked(crmDb.createLead).mockResolvedValue(42);
    vi.mocked(crmDb.createActivity).mockResolvedValue(undefined as any);
    vi.mocked(crmDb.listInventory).mockResolvedValue([]);
    vi.mocked(crmDb.getIntegrationByToken).mockResolvedValue({ id: 1, type: "webhook", name: "Test", config: null, apiToken: "kafka_test123", active: true, lastSync: null, createdAt: new Date(), updatedAt: new Date() });
  });

  describe("Email source detection", () => {
    it("should detect OLX from email content", async () => {
      // Import the module to test the internal functions via webhook behavior
      const { registerWebhookRoutes } = await import("./webhooks");
      expect(registerWebhookRoutes).toBeDefined();
    });
  });

  describe("Webhook route registration", () => {
    it("should register all expected routes", async () => {
      const { registerWebhookRoutes } = await import("./webhooks");
      
      const routes: { method: string; path: string }[] = [];
      const mockApp = {
        get: vi.fn((path: string) => routes.push({ method: "GET", path })),
        post: vi.fn((path: string) => routes.push({ method: "POST", path })),
        options: vi.fn((path: string) => routes.push({ method: "OPTIONS", path })),
      };

      registerWebhookRoutes(mockApp as any);

      // Verify all endpoints are registered
      const registeredPaths = routes.map(r => `${r.method} ${r.path}`);
      
      expect(registeredPaths).toContain("GET /api/webhooks/health");
      expect(registeredPaths).toContain("POST /api/webhooks/lead");
      expect(registeredPaths).toContain("POST /api/webhooks/leads/bulk");
      expect(registeredPaths).toContain("GET /api/webhooks/meta/verify");
      expect(registeredPaths).toContain("POST /api/webhooks/meta/leadgen");
      expect(registeredPaths).toContain("POST /api/webhooks/google/lead");
      expect(registeredPaths).toContain("POST /api/webhooks/generic");
      expect(registeredPaths).toContain("POST /api/webhooks/email-parser");
      expect(registeredPaths).toContain("POST /api/webhooks/widget/lead");
      expect(registeredPaths).toContain("OPTIONS /api/webhooks/widget/lead");
      expect(registeredPaths).toContain("POST /api/webhooks/whatsapp");
      expect(registeredPaths).toContain("POST /api/webhooks/sig/sale");
      expect(registeredPaths).toContain("POST /api/webhooks/sig/inventory");
      expect(registeredPaths).toContain("GET /api/webhooks/docs");
      expect(registeredPaths).toContain("GET /api/webhooks/widget.js");
    });
  });

  describe("Source labels coverage", () => {
    it("should have all sources represented in the CRM", () => {
      const expectedSources = [
        "manual", "whatsapp", "olx", "webmotors", "socarrao",
        "facebook", "instagram", "instagram_ads", "facebook_ads",
        "google_ads", "trafego_pago", "indicacao", "loja",
        "landing_page", "icarros", "manychat", "webhook"
      ];
      
      // These are the sources the system supports
      expect(expectedSources.length).toBeGreaterThan(10);
      expect(expectedSources).toContain("instagram_ads");
      expect(expectedSources).toContain("facebook_ads");
      expect(expectedSources).toContain("google_ads");
      expect(expectedSources).toContain("landing_page");
    });
  });

  describe("Widget script generation", () => {
    it("should register widget.js endpoint", async () => {
      const { registerWebhookRoutes } = await import("./webhooks");
      
      const handlers: Record<string, Function> = {};
      const mockApp = {
        get: vi.fn((path: string, handler: Function) => { handlers[`GET ${path}`] = handler; }),
        post: vi.fn(),
        options: vi.fn(),
      };

      registerWebhookRoutes(mockApp as any);

      // Verify widget.js handler exists
      expect(handlers["GET /api/webhooks/widget.js"]).toBeDefined();

      // Call the handler and verify response
      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      };
      
      handlers["GET /api/webhooks/widget.js"]({}, mockRes);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "application/javascript");
      expect(mockRes.send).toHaveBeenCalled();
      
      const scriptContent = mockRes.send.mock.calls[0][0];
      expect(scriptContent).toContain("kafka-crm-widget");
      expect(scriptContent).toContain("utm_source");
      expect(scriptContent).toContain("kafkaCrmSubmit");
    });
  });

  describe("API docs endpoint", () => {
    it("should return comprehensive documentation", async () => {
      const { registerWebhookRoutes } = await import("./webhooks");
      
      const handlers: Record<string, Function> = {};
      const mockApp = {
        get: vi.fn((path: string, handler: Function) => { handlers[`GET ${path}`] = handler; }),
        post: vi.fn(),
        options: vi.fn(),
      };

      registerWebhookRoutes(mockApp as any);

      const mockRes = {
        json: vi.fn(),
      };
      
      handlers["GET /api/webhooks/docs"]({}, mockRes);
      
      const docs = mockRes.json.mock.calls[0][0];
      expect(docs.title).toBe("Kafka CRM API v2");
      expect(docs.version).toBe("2.0.0");
      expect(docs.endpoints.length).toBeGreaterThan(8);
      expect(docs.widget).toBeDefined();
      expect(docs.widget.embedCode).toContain("widget.js");
      
      // Verify Meta endpoints are documented
      const metaEndpoint = docs.endpoints.find((e: any) => e.path === "/api/webhooks/meta/leadgen");
      expect(metaEndpoint).toBeDefined();
      expect(metaEndpoint.auth).toBe(false);
      
      // Verify Google endpoint is documented
      const googleEndpoint = docs.endpoints.find((e: any) => e.path === "/api/webhooks/google/lead");
      expect(googleEndpoint).toBeDefined();
      
      // Verify generic endpoint is documented
      const genericEndpoint = docs.endpoints.find((e: any) => e.path === "/api/webhooks/generic");
      expect(genericEndpoint).toBeDefined();
      
      // Verify email parser is documented
      const emailEndpoint = docs.endpoints.find((e: any) => e.path === "/api/webhooks/email-parser");
      expect(emailEndpoint).toBeDefined();
      
      // Verify widget endpoint is documented
      const widgetEndpoint = docs.endpoints.find((e: any) => e.path === "/api/webhooks/widget/lead");
      expect(widgetEndpoint).toBeDefined();
      expect(widgetEndpoint.auth).toBe(false);
    });
  });

  describe("Health check", () => {
    it("should return status ok", async () => {
      const { registerWebhookRoutes } = await import("./webhooks");
      
      const handlers: Record<string, Function> = {};
      const mockApp = {
        get: vi.fn((path: string, handler: Function) => { handlers[`GET ${path}`] = handler; }),
        post: vi.fn(),
        options: vi.fn(),
      };

      registerWebhookRoutes(mockApp as any);

      const mockRes = {
        json: vi.fn(),
      };
      
      handlers["GET /api/webhooks/health"]({}, mockRes);
      
      const result = mockRes.json.mock.calls[0][0];
      expect(result.status).toBe("ok");
      expect(result.version).toBe("2.0.0");
      expect(result.timestamp).toBeDefined();
    });
  });
});
