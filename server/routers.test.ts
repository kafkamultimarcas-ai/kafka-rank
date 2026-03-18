import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  listSellers: vi.fn().mockResolvedValue([
    { id: 1, name: "João", nickname: "Trovão", active: true, totalSales: 5, totalPoints: 50, photoUrl: null, photoKey: null, phone: null, email: null, createdAt: new Date() },
    { id: 2, name: "Maria", nickname: "Relâmpago", active: true, totalSales: 8, totalPoints: 80, photoUrl: null, photoKey: null, phone: null, email: null, createdAt: new Date() },
  ]),
  getSellerById: vi.fn().mockResolvedValue({ id: 1, name: "João", nickname: "Trovão", active: true, totalSales: 5, totalPoints: 50, photoUrl: null, photoKey: null, phone: null, email: null, createdAt: new Date() }),
  createSeller: vi.fn().mockResolvedValue(3),
  updateSeller: vi.fn().mockResolvedValue(undefined),
  deleteSeller: vi.fn().mockResolvedValue(undefined),
  listCompetitions: vi.fn().mockResolvedValue([
    { id: 1, name: "GP Março", type: "individual", status: "active", pointsPerSale: 1, startDate: new Date(), endDate: new Date(), description: null, createdAt: new Date() },
  ]),
  getCompetitionById: vi.fn().mockResolvedValue({ id: 1, name: "GP Março", type: "individual", status: "active", pointsPerSale: 1, startDate: new Date(), endDate: new Date(), description: null, createdAt: new Date() }),
  createCompetition: vi.fn().mockResolvedValue(2),
  updateCompetition: vi.fn().mockResolvedValue(undefined),
  deleteCompetition: vi.fn().mockResolvedValue(undefined),
  getCompetitionRanking: vi.fn().mockResolvedValue([]),
  getTeamRanking: vi.fn().mockResolvedValue([]),
  listTeamsByCompetition: vi.fn().mockResolvedValue([]),
  createTeam: vi.fn().mockResolvedValue(1),
  deleteTeam: vi.fn().mockResolvedValue(undefined),
  listParticipants: vi.fn().mockResolvedValue([]),
  addParticipant: vi.fn().mockResolvedValue(1),
  removeParticipant: vi.fn().mockResolvedValue(undefined),
  listSales: vi.fn().mockResolvedValue([]),
  createSale: vi.fn().mockResolvedValue(1),
  listTrainings: vi.fn().mockResolvedValue([]),
  createTraining: vi.fn().mockResolvedValue(1),
  updateTraining: vi.fn().mockResolvedValue(undefined),
  deleteTraining: vi.fn().mockResolvedValue(undefined),
  listActionPlans: vi.fn().mockResolvedValue([]),
  createActionPlan: vi.fn().mockResolvedValue(1),
  updateActionPlan: vi.fn().mockResolvedValue(undefined),
  deleteActionPlan: vi.fn().mockResolvedValue(undefined),
  getLatestQuote: vi.fn().mockResolvedValue({ id: 1, quote: "Acelere!", author: "Kafka", createdAt: new Date() }),
  listQuotes: vi.fn().mockResolvedValue([]),
  createQuote: vi.fn().mockResolvedValue(1),
  listNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/photo.jpg", key: "sellers/1-abc.jpg" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ title: "Plano IA", content: "Conteúdo gerado", quote: "Frase motivacional", author: "Kafka" }) } }],
  }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "admin-user", email: "admin@kafka.com", name: "Admin",
    loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2, openId: "regular-user", email: "user@kafka.com", name: "Vendedor",
    loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("sellers router", () => {
  it("lists sellers publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sellers.list({});
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("João");
  });

  it("gets seller by id publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sellers.getById({ id: 1 });
    expect(result).toBeDefined();
    expect(result?.name).toBe("João");
  });

  it("creates seller as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sellers.create({ name: "Novo Vendedor" });
    expect(result.id).toBe(3);
  });

  it("rejects seller creation for non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.sellers.create({ name: "Teste" })).rejects.toThrow();
  });

  it("updates seller as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sellers.update({ id: 1, name: "João Atualizado" });
    expect(result.success).toBe(true);
  });

  it("deletes seller as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sellers.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects seller deletion for public user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.sellers.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("competitions router", () => {
  it("lists competitions publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.competitions.list({});
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("GP Março");
  });

  it("gets competition by id", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.competitions.getById({ id: 1 });
    expect(result?.name).toBe("GP Março");
  });

  it("creates competition as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.competitions.create({
      name: "GP Abril", type: "individual", pointsPerSale: 2,
      startDate: Date.now(), endDate: Date.now() + 86400000,
    });
    expect(result.id).toBe(2);
  });

  it("rejects competition creation for regular user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.competitions.create({
      name: "GP Teste", type: "individual", pointsPerSale: 1,
      startDate: Date.now(), endDate: Date.now() + 86400000,
    })).rejects.toThrow();
  });

  it("gets ranking publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.competitions.ranking({ id: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("teams router", () => {
  it("lists teams publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.teams.list({ competitionId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates team as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.teams.create({ competitionId: 1, name: "Equipe A", color: "#FF0000" });
    expect(result.id).toBe(1);
  });
});

describe("sales router", () => {
  it("lists sales publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sales.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates sale as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sales.create({ sellerId: 1, points: 10 });
    expect(result.id).toBe(1);
  });

  it("rejects sale creation for public user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.sales.create({ sellerId: 1, points: 5 })).rejects.toThrow();
  });
});

describe("trainings router", () => {
  it("lists trainings publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.trainings.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates training as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.trainings.create({ title: "Técnicas de Fechamento", content: "Conteúdo..." });
    expect(result.id).toBe(1);
  });
});

describe("action plans router", () => {
  it("lists action plans publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.actionPlans.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates action plan as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.actionPlans.create({ sellerId: 1, title: "Plano A", content: "Detalhes..." });
    expect(result.id).toBe(1);
  });
});

describe("quotes router", () => {
  it("gets latest quote publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.quotes.latest();
    expect(result).toBeDefined();
    expect(result?.quote).toBe("Acelere!");
  });
});

describe("notifications router", () => {
  it("lists notifications publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.notifications.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("auth", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("Admin");
  });
});
