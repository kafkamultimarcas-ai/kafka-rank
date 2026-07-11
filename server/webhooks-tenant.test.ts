import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentTenantId } from "./tenantDb";

const integrationsByToken: Record<string, { id: number; tenantId: number; active: boolean }> = {
  "token-tenant-5": { id: 1, tenantId: 5, active: true },
  "token-tenant-7": { id: 2, tenantId: 7, active: true },
  "token-disabled": { id: 3, tenantId: 5, active: false },
};

const createLeadCalls: { tenantIdAtCallTime: number }[] = [];

vi.mock("./crmDb", () => ({
  getIntegrationByTokenGlobal: vi.fn(async (token: string) => integrationsByToken[token] || null),
  getDefaultStage: vi.fn(async () => ({ id: 1, name: "Novo Lead", department: "vendas", displayOrder: 1, color: "#3B82F6", isDefault: true, isFinal: false, createdAt: new Date() })),
  createLead: vi.fn(async () => {
    createLeadCalls.push({ tenantIdAtCallTime: getCurrentTenantId() });
    return 42;
  }),
  createActivity: vi.fn(async () => {}),
  listInventory: vi.fn(async () => []),
}));

vi.mock("./db", () => ({
  getDb: vi.fn(async () => null),
}));

vi.mock("../drizzle/schema", () => ({
  sellers: {},
  crmLeadDistribution: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  ne: vi.fn(),
}));

vi.mock("./tenantService", () => ({
  getTenantBySlug: vi.fn(async (slug: string) => {
    if (slug === "loja-b") return { id: 9, name: "Loja B", slug: "loja-b", status: "active" };
    return null;
  }),
}));

function buildMockApp() {
  const handlers: Record<string, Function> = {};
  const mockApp = {
    get: vi.fn((path: string, handler: Function) => { handlers[`GET ${path}`] = handler; }),
    post: vi.fn((path: string, handler: Function) => { handlers[`POST ${path}`] = handler; }),
    options: vi.fn((path: string, handler: Function) => { handlers[`OPTIONS ${path}`] = handler; }),
  };
  return { mockApp, handlers };
}

function fakeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    header: vi.fn(),
    status: vi.fn(function (this: any, code: number) { this.statusCode = code; return this; }),
    json: vi.fn(function (this: any, payload: any) { this.body = payload; return this; }),
  };
  return res;
}

describe("Webhooks - resolução de tenant por token/slug", () => {
  beforeEach(() => {
    createLeadCalls.length = 0;
    vi.clearAllMocks();
  });

  it("cria o lead no tenant dono do token, mesmo sem contexto de tenant prévio na request", async () => {
    const { registerWebhookRoutes } = await import("./webhooks");
    const { mockApp, handlers } = buildMockApp();
    registerWebhookRoutes(mockApp as any);

    const req = { headers: { "x-api-token": "token-tenant-5" }, body: { name: "Cliente A" } } as any;
    const res = fakeRes();
    await handlers["POST /api/webhooks/lead"](req, res);

    expect(res.statusCode).toBe(201);
    expect(createLeadCalls).toHaveLength(1);
    expect(createLeadCalls[0].tenantIdAtCallTime).toBe(5);
  });

  it("dois tokens de tenants diferentes nunca vazam pontuação de tenant entre si", async () => {
    const { registerWebhookRoutes } = await import("./webhooks");
    const { mockApp, handlers } = buildMockApp();
    registerWebhookRoutes(mockApp as any);

    const reqA = { headers: { "x-api-token": "token-tenant-5" }, body: { name: "Cliente A" } } as any;
    const reqB = { headers: { "x-api-token": "token-tenant-7" }, body: { name: "Cliente B" } } as any;

    await handlers["POST /api/webhooks/lead"](reqA, fakeRes());
    await handlers["POST /api/webhooks/lead"](reqB, fakeRes());

    expect(createLeadCalls.map(c => c.tenantIdAtCallTime)).toEqual([5, 7]);
  });

  it("rejeita token inexistente sem chamar createLead", async () => {
    const { registerWebhookRoutes } = await import("./webhooks");
    const { mockApp, handlers } = buildMockApp();
    registerWebhookRoutes(mockApp as any);

    const req = { headers: { "x-api-token": "token-que-nao-existe" }, body: { name: "Cliente" } } as any;
    const res = fakeRes();
    await handlers["POST /api/webhooks/lead"](req, res);

    expect(res.statusCode).toBe(403);
    expect(createLeadCalls).toHaveLength(0);
  });

  it("rejeita token de integração desativada", async () => {
    const { registerWebhookRoutes } = await import("./webhooks");
    const { mockApp, handlers } = buildMockApp();
    registerWebhookRoutes(mockApp as any);

    const req = { headers: { "x-api-token": "token-disabled" }, body: { name: "Cliente" } } as any;
    const res = fakeRes();
    await handlers["POST /api/webhooks/lead"](req, res);

    expect(res.statusCode).toBe(403);
    expect(createLeadCalls).toHaveLength(0);
  });

  it("widget/lead usa o tenantSlug do body para resolver a loja", async () => {
    const { registerWebhookRoutes } = await import("./webhooks");
    const { mockApp, handlers } = buildMockApp();
    registerWebhookRoutes(mockApp as any);

    const req = { headers: {}, body: { name: "Lead do site", tenantSlug: "loja-b" } } as any;
    const res = fakeRes();
    await handlers["POST /api/webhooks/widget/lead"](req, res);

    expect(res.statusCode).toBe(201);
    expect(createLeadCalls).toHaveLength(1);
    expect(createLeadCalls[0].tenantIdAtCallTime).toBe(9);
  });

  it("widget/lead sem tenantSlug cai no tenant padrão (1), sem quebrar", async () => {
    const { registerWebhookRoutes } = await import("./webhooks");
    const { mockApp, handlers } = buildMockApp();
    registerWebhookRoutes(mockApp as any);

    const req = { headers: {}, body: { name: "Lead do site" } } as any;
    const res = fakeRes();
    await handlers["POST /api/webhooks/widget/lead"](req, res);

    expect(res.statusCode).toBe(201);
    expect(createLeadCalls[0].tenantIdAtCallTime).toBe(1);
  });

  it("registra a rota /api/webhooks/whatsapp/:tenantSlug", async () => {
    const { registerWebhookRoutes } = await import("./webhooks");
    const { mockApp, handlers } = buildMockApp();
    registerWebhookRoutes(mockApp as any);

    expect(handlers["POST /api/webhooks/whatsapp/:tenantSlug"]).toBeDefined();
    expect(handlers["POST /api/webhooks/whatsapp"]).toBeDefined();
  });

  it("whatsapp/:tenantSlug com loja inexistente retorna 404", async () => {
    const { registerWebhookRoutes } = await import("./webhooks");
    const { mockApp, handlers } = buildMockApp();
    registerWebhookRoutes(mockApp as any);

    const req = { headers: {}, body: {}, params: { tenantSlug: "loja-que-nao-existe" } } as any;
    const res = fakeRes();
    await handlers["POST /api/webhooks/whatsapp/:tenantSlug"](req, res);

    expect(res.statusCode).toBe(404);
  });
});
