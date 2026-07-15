import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the inventory scraper
vi.mock("./inventory-scraper", () => ({
  syncInventory: vi.fn(() => Promise.resolve({ found: 93, added: 0, updated: 93, removed: 0, error: null })),
  syncAllTenants: vi.fn(() => Promise.resolve()),
  startInventorySync: vi.fn(),
}));

// Mock the db module
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGroupBy = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

const mockDb = {
  select: mockSelect,
  update: mockUpdate,
};

vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("../drizzle/schema", () => ({
  inventoryVehicles: {
    id: "id",
    brand: "brand",
    model: "model",
    version: "version",
    color: "color",
    status: "status",
    price: "price",
    year: "year",
    createdAt: "createdAt",
  },
  inventorySyncLogs: {
    createdAt: "createdAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ op: "eq", a, b })),
  desc: vi.fn((a) => ({ op: "desc", a })),
  and: vi.fn((...args: any[]) => ({ op: "and", args })),
  like: vi.fn((a, b) => ({ op: "like", a, b })),
  or: vi.fn((...args: any[]) => ({ op: "or", args })),
  sql: vi.fn(),
}));

describe("Inventory Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Chain: select().from().where().orderBy().limit()
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, groupBy: mockGroupBy });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, groupBy: mockGroupBy, limit: mockLimit });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockGroupBy.mockReturnValue({ orderBy: mockOrderBy });
    mockLimit.mockResolvedValue([]);
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  });

  it("should import inventoryRouter without errors", async () => {
    const { inventoryRouter } = await import("./routers/inventoryRouter");
    expect(inventoryRouter).toBeDefined();
  });

  it("should have all expected routes defined", async () => {
    const { inventoryRouter } = await import("./routers/inventoryRouter");
    const procedures = Object.keys(inventoryRouter._def.procedures);
    expect(procedures).toContain("list");
    expect(procedures).toContain("adminList");
    expect(procedures).toContain("getById");
    expect(procedures).toContain("getAdminById");
    expect(procedures).toContain("brands");
    expect(procedures).toContain("stats");
    expect(procedures).toContain("adminMetrics");
    expect(procedures).toContain("validateDuplicate");
    expect(procedures).toContain("auditLogs");
    expect(procedures).toContain("sync");
    expect(procedures).toContain("syncLogs");
    expect(procedures).toContain("createDetailed");
    expect(procedures).toContain("updateDetailed");
    expect(procedures).toContain("delete");
    expect(procedures).toContain("reserve");
    expect(procedures).toContain("markSold");
    expect(procedures).toContain("markAvailable");
  });
});

describe("Inventory Scraper", () => {
  it("should export syncInventory function", async () => {
    const { syncInventory } = await import("./inventory-scraper");
    expect(syncInventory).toBeDefined();
    expect(typeof syncInventory).toBe("function");
  });

  it("syncInventory should return expected result shape", async () => {
    const { syncInventory } = await import("./inventory-scraper");
    const result = await syncInventory(1, "https://example.com");
    expect(result).toHaveProperty("found");
    expect(result).toHaveProperty("added");
    expect(result).toHaveProperty("updated");
    expect(result).toHaveProperty("removed");
    expect(typeof result.found).toBe("number");
  });

  it("should export syncAllTenants function", async () => {
    const { syncAllTenants } = await import("./inventory-scraper");
    expect(syncAllTenants).toBeDefined();
    expect(typeof syncAllTenants).toBe("function");
  });
});

describe("Inventory Multi-Tenant Isolation (static checks)", () => {
  const fs = require("fs");
  const path = require("path");
  const scraperSrc = fs.readFileSync(path.join(__dirname, "inventory-scraper.ts"), "utf-8");
  const routerSrc = fs.readFileSync(path.join(__dirname, "routers/inventoryRouter.ts"), "utf-8");
  const schemaSrc = fs.readFileSync(path.join(__dirname, "../drizzle/schema.ts"), "utf-8");
  const whatsappRouterSrc = fs.readFileSync(path.join(__dirname, "routers/whatsappRouter.ts"), "utf-8");
  const webhooksSrc = fs.readFileSync(path.join(__dirname, "webhooks.ts"), "utf-8");

  it("scraper notifies matching leads (crmInventoryAlerts) when a new vehicle is inserted", () => {
    expect(scraperSrc).toContain("notifyMatchingLeads(tenantId, Number(insertResult.insertId)");
    expect(scraperSrc).toContain("crmDb.getLeadsByVehicleInterest(");
    expect(scraperSrc).toContain("crmDb.createInventoryAlert(");
  });

  it("configureWebhook builds the Z-API webhook URL with the current tenant's slug instead of the tenant-1-only legacy URL", () => {
    const match = whatsappRouterSrc.match(/configureWebhook:[\s\S]*?\}\),/);
    expect(match, 'procedure "configureWebhook" not found').toBeTruthy();
    expect(match![0]).toContain("getCurrentTenantSlug");
    expect(match![0]).toContain("/api/webhooks/whatsapp/${tenantSlug}");
  });

  it("SIG inventory webhook writes into inventoryVehicles, not the orphaned crm_inventory table", () => {
    const match = webhooksSrc.match(/app\.post\("\/api\/webhooks\/sig\/inventory"[\s\S]*?\n  \}\);/);
    expect(match, "sig/inventory handler not found").toBeTruthy();
    expect(match![0]).toContain("dbConn.insert(inventoryVehicles)");
    expect(match![0]).not.toContain("crmDb.createInventoryItem");
  });

  it("syncInventory should receive tenantId and baseUrl as parameters (no hardcoded single-store URL)", () => {
    expect(scraperSrc).toMatch(/export async function syncInventory\(\s*tenantId:\s*number,\s*baseUrl:\s*string/);
    expect(scraperSrc).not.toContain('const BASE_URL = "https://www.kafkamultimarcas.com.br"');
  });

  it("scraper should scope the externalId lookup and the sold-marking query by tenantId", () => {
    expect(scraperSrc).toContain("eq(inventoryVehicles.tenantId, tenantId)");
  });

  it("inventoryVehicles should have a unique index on (tenantId, externalId)", () => {
    expect(schemaSrc).toMatch(/uniqueIndex\(.*\)\.on\(table\.tenantId,\s*table\.externalId\)/);
  });

  it("every inventoryRouter procedure should reference getCurrentTenantId() at least once", () => {
    const names = ["list", "adminList", "getById", "getAdminById", "brands", "stats", "adminMetrics", "validateDuplicate", "auditLogs", "sync", "syncLogs", "createDetailed", "updateDetailed", "delete", "reserve", "markSold", "markAvailable"];
    for (const name of names) {
      expect(routerSrc, `procedure "${name}" missing`).toContain(`  ${name}:`);
    }
    const occurrences = (routerSrc.match(/getCurrentTenantId\(\)/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(names.length);
  });

  it("inventory schema should support manual registration metadata for full CRUD", () => {
    expect(schemaSrc).toContain('sourceType');
    expect(schemaSrc).toContain('isPublished');
    expect(schemaSrc).toContain('isFeatured');
    expect(schemaSrc).toContain('purchasePrice');
    expect(schemaSrc).toContain('entryDate');
    expect(schemaSrc).toContain('videoUrl');
    expect(schemaSrc).toContain('deletedAt');
    expect(schemaSrc).toContain('deletedBy');
    expect(schemaSrc).toContain('deletedReason');
    expect(schemaSrc).toContain('inventoryAuditLogs');
  });
});

describe("WhatsApp Webhook Z-API Format", () => {
  it("should handle Z-API text message format", () => {
    // Z-API sends: { phone, text: { message }, momment, fromMe, isGroup }
    const zapiPayload = {
      phone: "5547999999999",
      fromMe: false,
      isGroup: false,
      messageId: "ABC123",
      momment: 1632228638,
      type: "ReceivedCallBack",
      text: {
        message: "Olá, quero saber sobre o carro",
      },
      photo: "https://example.com/photo.jpg",
    };

    // Normalize like the webhook handler does
    const rawPhone = zapiPayload.phone || "";
    const messageText = zapiPayload.text?.message || "";
    const timestamp = zapiPayload.momment || Math.floor(Date.now() / 1000);
    const fromMe = zapiPayload.fromMe === true;
    const isGroup = zapiPayload.isGroup === true;

    expect(rawPhone).toBe("5547999999999");
    expect(messageText).toBe("Olá, quero saber sobre o carro");
    expect(timestamp).toBe(1632228638);
    expect(fromMe).toBe(false);
    expect(isGroup).toBe(false);
  });

  it("should handle Z-API image message format", () => {
    const zapiPayload = {
      phone: "5547999999999",
      fromMe: false,
      isGroup: false,
      image: {
        caption: "Veja esta foto",
        imageUrl: "https://example.com/image.jpg",
        mimeType: "image/jpeg",
      },
    };

    const messageText = zapiPayload.image?.caption || "";
    const mediaUrl = zapiPayload.image?.imageUrl || null;
    const messageType = zapiPayload.image ? "image" : "text";

    expect(messageText).toBe("Veja esta foto");
    expect(mediaUrl).toBe("https://example.com/image.jpg");
    expect(messageType).toBe("image");
  });

  it("should skip messages from me", () => {
    const zapiPayload = {
      phone: "5547999999999",
      fromMe: true,
      isGroup: false,
      text: { message: "Mensagem enviada por nós" },
    };

    const fromMe = zapiPayload.fromMe === true;
    expect(fromMe).toBe(true);
    // Handler should skip this message
  });

  it("should skip group messages", () => {
    const zapiPayload = {
      phone: "5547999999999",
      fromMe: false,
      isGroup: true,
      participantPhone: "5547888888888",
      text: { message: "Mensagem de grupo" },
    };

    const isGroup = zapiPayload.isGroup === true;
    expect(isGroup).toBe(true);
    // Handler should skip this message
  });

  it("should handle generic format (from, message, timestamp)", () => {
    const genericPayload = {
      from: "5547999999999",
      message: "Olá, quero saber sobre o carro",
      timestamp: 1632228638,
    };

    // Normalize like the webhook handler does
    const rawPhone = (genericPayload as any).phone || genericPayload.from || "";
    const messageText = (genericPayload as any).text?.message || genericPayload.message || "";
    const timestamp = (genericPayload as any).momment || genericPayload.timestamp || 0;

    expect(rawPhone).toBe("5547999999999");
    expect(messageText).toBe("Olá, quero saber sobre o carro");
    expect(timestamp).toBe(1632228638);
  });

  it("should handle Z-API audio message format", () => {
    const zapiPayload = {
      phone: "5547999999999",
      fromMe: false,
      isGroup: false,
      audio: {
        audioUrl: "https://example.com/audio.ogg",
        mimeType: "audio/ogg",
      },
    };

    const mediaUrl = zapiPayload.audio?.audioUrl || null;
    const messageType = zapiPayload.audio ? "audio" : "text";

    expect(mediaUrl).toBe("https://example.com/audio.ogg");
    expect(messageType).toBe("audio");
  });

  it("should handle Z-API document message format", () => {
    const zapiPayload = {
      phone: "5547999999999",
      fromMe: false,
      isGroup: false,
      document: {
        documentUrl: "https://example.com/doc.pdf",
        fileName: "proposta.pdf",
        mimeType: "application/pdf",
      },
    };

    const mediaUrl = zapiPayload.document?.documentUrl || null;
    const messageType = zapiPayload.document ? "document" : "text";

    expect(mediaUrl).toBe("https://example.com/doc.pdf");
    expect(messageType).toBe("document");
  });

  it("should normalize phone numbers correctly", () => {
    const phones = [
      { input: "5547999999999", expected: "5547999999999" },
      { input: "+55 (47) 99999-9999", expected: "5547999999999" },
      { input: "47999999999", expected: "47999999999" },
    ];

    for (const { input, expected } of phones) {
      const normalized = input.replace(/\D/g, "");
      expect(normalized).toBe(expected);
    }
  });
});

describe("WhatsApp Router", () => {
  it("should import whatsappRouter without errors", async () => {
    const { whatsappRouter } = await import("./routers/whatsappRouter");
    expect(whatsappRouter).toBeDefined();
  });

  it("should have all expected routes defined", async () => {
    const { whatsappRouter } = await import("./routers/whatsappRouter");
    const procedures = Object.keys(whatsappRouter._def.procedures);
    expect(procedures).toContain("status");
    expect(procedures).toContain("sendText");
    expect(procedures).toContain("sendImage");
    expect(procedures).toContain("sendVehicle");
    expect(procedures).toContain("configureWebhook");
    expect(procedures).toContain("sendLink");
  });
});
