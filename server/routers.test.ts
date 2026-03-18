import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  savePushSubscription: vi.fn().mockResolvedValue(1),
  deletePushSubscription: vi.fn().mockResolvedValue(undefined),
  getAllPushSubscriptions: vi.fn().mockResolvedValue([]),
  getRecentApprovedSales: vi.fn().mockResolvedValue([]),
  listPendingSales: vi.fn().mockResolvedValue([]),
  approveSale: vi.fn().mockResolvedValue({ id: 1, sellerId: 1, vehicleModel: 'Civic', points: 1, status: 'approved', competitionId: 1 }),
  rejectSale: vi.fn().mockResolvedValue(undefined),
  deleteSale: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(1),
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
  getAppSetting: vi.fn().mockResolvedValue("kafka2024"),
  setAppSetting: vi.fn().mockResolvedValue(undefined),
  // F&I
  listFeiRecords: vi.fn().mockResolvedValue([]),
  createFeiRecord: vi.fn().mockResolvedValue(1),
  listPendingFeiRecords: vi.fn().mockResolvedValue([]),
  approveFeiRecord: vi.fn().mockResolvedValue({ id: 1, sellerId: 1, bankName: 'Santander', returnType: 'R1', points: 1, competitionId: null }),
  rejectFeiRecord: vi.fn().mockResolvedValue(undefined),
  deleteFeiRecord: vi.fn().mockResolvedValue(undefined),
  // Consignment
  listConsignmentRecords: vi.fn().mockResolvedValue([]),
  createConsignmentRecord: vi.fn().mockResolvedValue(1),
  listPendingConsignmentRecords: vi.fn().mockResolvedValue([]),
  approveConsignmentRecord: vi.fn().mockResolvedValue({ id: 1, sellerId: 1, vehicleModel: 'Corolla', isValid: true, points: 1, competitionId: null }),
  rejectConsignmentRecord: vi.fn().mockResolvedValue(undefined),
  updateConsignmentExitDate: vi.fn().mockResolvedValue({ id: 1, exitDate: Date.now(), isValid: true }),
  // Dispatch
  listDispatchRecords: vi.fn().mockResolvedValue([]),
  createDispatchRecord: vi.fn().mockResolvedValue(1),
  listPendingDispatchRecords: vi.fn().mockResolvedValue([]),
  approveDispatchRecord: vi.fn().mockResolvedValue({ id: 1, sellerId: 1, documentType: 'Transfer\u00eancia', points: 1, bonusPoints: 0, competitionId: null }),
  rejectDispatchRecord: vi.fn().mockResolvedValue(undefined),
  deleteDispatchRecord: vi.fn().mockResolvedValue(undefined),
  // Pending count
  getAllPendingCount: vi.fn().mockResolvedValue({ sales: 2, fei: 1, consignment: 0, dispatch: 3, total: 6 }),
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

vi.mock("./pushService", () => ({
  sendPushNewSale: vi.fn().mockResolvedValue(undefined),
  sendPushSaleApproved: vi.fn().mockResolvedValue(undefined),
  sendPushOvertake: vi.fn().mockResolvedValue(undefined),
  sendPushNewCompetition: vi.fn().mockResolvedValue(undefined),
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

  it("creates training with video URL as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.trainings.create({
      title: "Treinamento com Vídeo",
      content: "Assista o vídeo abaixo",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(result.id).toBe(1);
  });

  it("uploads video to training as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.trainings.uploadVideo({
      id: 1,
      fileName: "treinamento.mp4",
      fileBase64: "dGVzdA==",
      mimeType: "video/mp4",
    });
    expect(result.success).toBe(true);
    expect(result.videoUrl).toBe("https://cdn.example.com/photo.jpg");
  });

  it("removes video from training as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.trainings.removeVideo({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects video upload for non-admin", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.trainings.uploadVideo({
      id: 1, fileName: "test.mp4", fileBase64: "dGVzdA==", mimeType: "video/mp4",
    })).rejects.toThrow();
  });

  it("rejects video removal for non-admin", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.trainings.removeVideo({ id: 1 })).rejects.toThrow();
  });

  it("updates training with video URL as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.trainings.update({
      id: 1,
      videoUrl: "https://vimeo.com/123456789",
    });
    expect(result.success).toBe(true);
  });

  it("removes video URL by setting null as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.trainings.update({
      id: 1,
      videoUrl: null,
    });
    expect(result.success).toBe(true);
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

describe("push notifications router", () => {
  it("subscribes to push notifications publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.push.subscribe({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
      p256dh: "test-p256dh-key",
      auth: "test-auth-key",
    });
    expect(result.success).toBe(true);
  });

  it("subscribes with optional sellerId", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.push.subscribe({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-2",
      p256dh: "test-p256dh-key-2",
      auth: "test-auth-key-2",
      sellerId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("unsubscribes from push notifications", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.push.unsubscribe({
      endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
    });
    expect(result.success).toBe(true);
  });

  it("returns VAPID public key", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.push.getVapidKey();
    expect(result).toHaveProperty("key");
    expect(typeof result.key).toBe("string");
  });
});

describe("sales approval with push", () => {
  it("approves sale as admin and sends push", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sales.approve({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects sale approval for non-admin", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.sales.approve({ id: 1 })).rejects.toThrow();
  });

  it("lists pending sales as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sales.listPending();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects listing pending sales for non-admin", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.sales.listPending()).rejects.toThrow();
  });
});

describe("live feed router", () => {
  it("gets recent approved sales", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.feed.recent({ since: Date.now() - 60000 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("access control router", () => {
  it("verifies correct access code", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.access.verify({ code: "kafka2024" });
    expect(result.valid).toBe(true);
  });

  it("rejects incorrect access code", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.access.verify({ code: "wrongcode" });
    expect(result.valid).toBe(false);
  });

  it("gets access code as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.access.getCode();
    expect(result.code).toBe("kafka2024");
  });

  it("rejects getting access code for non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.access.getCode()).rejects.toThrow();
  });

  it("sets access code as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.access.setCode({ code: "newcode123" });
    expect(result.success).toBe(true);
  });

  it("rejects setting access code for public user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.access.setCode({ code: "hack" })).rejects.toThrow();
  });
});

describe("F&I router", () => {
  it("lists F&I records publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.fei.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("registers F&I record publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.fei.register({
      sellerId: 1, bankName: "Santander", returnType: "R1",
      financedValue: 5000000, paymentDate: Date.now(),
    });
    expect(result.id).toBe(1);
    expect(result.message).toContain("F&I");
  });

  it("lists pending F&I as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.fei.listPending();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects listing pending F&I for public", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.fei.listPending()).rejects.toThrow();
  });

  it("approves F&I as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.fei.approve({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects F&I as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.fei.reject({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects F&I approval for non-admin", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.fei.approve({ id: 1 })).rejects.toThrow();
  });
});

describe("Consignment router", () => {
  it("lists consignment records publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.consignment.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("registers consignment publicly with ownerPhone", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.consignment.register({
      sellerId: 1, vehicleModel: "Corolla 2023", ownerName: "Jo\u00e3o Silva",
      ownerPhone: "(11) 99999-9999",
      entryDate: Date.now() - 8 * 24 * 60 * 60 * 1000,
    });
    expect(result.id).toBe(1);
    expect(result.message).toContain("Consigna\u00e7\u00e3o");
  });

  it("lists pending consignments as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.consignment.listPending();
    expect(Array.isArray(result)).toBe(true);
  });

  it("approves consignment as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.consignment.approve({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects consignment as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.consignment.reject({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects consignment approval for non-admin", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.consignment.approve({ id: 1 })).rejects.toThrow();
  });

  it("updates exit date as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.consignment.updateExit({ id: 1, exitDate: Date.now() });
    expect(result.success).toBe(true);
    expect(result.isValid).toBe(true);
  });

  it("rejects exit date update for non-admin", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.consignment.updateExit({ id: 1, exitDate: Date.now() })).rejects.toThrow();
  });
});

describe("Dispatch router", () => {
  it("lists dispatch records publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.dispatch.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("registers dispatch publicly", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.dispatch.register({
      sellerId: 1, documentType: "Transfer\u00eancia", customerPaid: true,
    });
    expect(result.id).toBe(1);
    expect(result.message).toContain("despachante");
  });

  it("registers dispatch with bonus when customer paid", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.dispatch.register({
      sellerId: 1, documentType: "Transfer\u00eancia", customerPaid: true,
      vehiclePlate: "ABC1D23", transferValue: 35000,
    });
    expect(result.id).toBe(1);
  });

  it("lists pending dispatch as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dispatch.listPending();
    expect(Array.isArray(result)).toBe(true);
  });

  it("approves dispatch as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dispatch.approve({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects dispatch as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dispatch.reject({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects dispatch approval for non-admin", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.dispatch.approve({ id: 1 })).rejects.toThrow();
  });
});

describe("Pending count router", () => {
  it("gets all pending counts as admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pendingCount.getAll();
    expect(result.total).toBe(6);
    expect(result.sales).toBe(2);
    expect(result.fei).toBe(1);
    expect(result.dispatch).toBe(3);
  });

  it("rejects pending count for non-admin", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.pendingCount.getAll()).rejects.toThrow();
  });
});
