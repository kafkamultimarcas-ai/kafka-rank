import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ===== Mock de db =====
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getAppointmentsForDispatch: vi.fn(),
    listSellers: vi.fn(),
    listFeiraoEditions: vi.fn(),
  };
});

import * as db from "./db";

const mockGetAppointmentsForDispatch = vi.mocked(db.getAppointmentsForDispatch);
const mockListSellers = vi.mocked(db.listSellers);
const mockListFeiraoEditions = vi.mocked(db.listFeiraoEditions);

// ===== Mock de zapi-service =====
vi.mock("./zapi-service", () => ({
  sendText: vi.fn().mockResolvedValue({ success: true }),
}));

// ===== Helpers =====
function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-test",
      email: "admin@kafka.com",
      name: "Admin Test",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as any,
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as any,
  };
}

const mockSellers = [
  { id: 1, name: "Wesley", nickname: "Wesley", active: true },
  { id: 2, name: "Leo", nickname: "Leo", active: true },
  { id: 3, name: "Emanuel", nickname: "Emanuel", active: true },
];

const mockAppointments = [
  {
    id: 100,
    customerName: "Andre",
    customerPhone: "+55 47 9970-5721",
    vehicleInterest: "Civic",
    sellerId: 3,
    scheduledDate: Date.now(),
    attendanceStatus: "pending",
    isFeirão: true,
    feiraoEditionId: 40,
    createdAt: Date.now(),
  },
  {
    id: 101,
    customerName: "Gilson",
    customerPhone: "47992705540",
    vehicleInterest: "Corolla",
    sellerId: 3,
    scheduledDate: Date.now(),
    attendanceStatus: "pending",
    isFeirão: true,
    feiraoEditionId: 40,
    createdAt: Date.now(),
  },
  {
    id: 102,
    customerName: "Joao",
    customerPhone: "47984912578",
    vehicleInterest: null,
    sellerId: 1,
    scheduledDate: Date.now(),
    attendanceStatus: "pending",
    isFeirão: false,
    feiraoEditionId: null,
    createdAt: Date.now(),
  },
];

const mockEditions = [
  { id: 40, editionNumber: 40, name: "Feirão Kafka Ed. 40", status: "active", tenantId: 1 },
  { id: 39, editionNumber: 39, name: "Feirão Kafka Ed. 39", status: "finished", tenantId: 1 },
];

// ===== TESTES =====
describe("appointmentDispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("preview", () => {
    it("retorna destinatários com nomes de vendedores mapeados", async () => {
      mockGetAppointmentsForDispatch.mockResolvedValue(mockAppointments as any);
      mockListSellers.mockResolvedValue(mockSellers as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.appointmentDispatch.preview({
        type: "all",
        excludeBuyers: true,
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        id: 100,
        customerName: "Andre",
        customerPhone: "+55 47 9970-5721",
        sellerName: "Emanuel",
        isFeirão: true,
      });
      expect(result[2]).toMatchObject({
        id: 102,
        customerName: "Joao",
        sellerName: "Wesley",
        isFeirão: false,
      });
    });

    it("passa filtros corretamente para getAppointmentsForDispatch", async () => {
      mockGetAppointmentsForDispatch.mockResolvedValue([]);
      mockListSellers.mockResolvedValue(mockSellers as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await caller.appointmentDispatch.preview({
        type: "feirao",
        editionId: 40,
        status: "pending",
        sellerId: 3,
        excludeBuyers: false,
      });

      expect(mockGetAppointmentsForDispatch).toHaveBeenCalledWith({
        type: "feirao",
        editionId: 40,
        status: "pending",
        sellerId: 3,
        excludeBuyers: false,
      });
    });

    it("retorna lista vazia quando não há agendamentos", async () => {
      mockGetAppointmentsForDispatch.mockResolvedValue([]);
      mockListSellers.mockResolvedValue(mockSellers as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.appointmentDispatch.preview({ type: "all" });
      expect(result).toHaveLength(0);
    });

    it("rejeita acesso de usuário não-admin", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointmentDispatch.preview({ type: "all" })
      ).rejects.toThrow();
    });

    it("mapeia vendedor desconhecido como 'Desconhecido'", async () => {
      const appointmentWithUnknownSeller = [{
        ...mockAppointments[0],
        sellerId: 999, // vendedor que não existe
      }];
      mockGetAppointmentsForDispatch.mockResolvedValue(appointmentWithUnknownSeller as any);
      mockListSellers.mockResolvedValue(mockSellers as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.appointmentDispatch.preview({ type: "all" });
      expect(result[0].sellerName).toBe("Desconhecido");
    });
  });

  describe("send", () => {
    it("lança erro quando não há destinatários", async () => {
      mockGetAppointmentsForDispatch.mockResolvedValue([]);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointmentDispatch.send({
          type: "all",
          message: "Olá {nome}!",
        })
      ).rejects.toThrow("Nenhum destinatário encontrado com esses filtros");
    });

    it("lança erro quando há mais de 500 destinatários", async () => {
      const manyRecords = Array.from({ length: 501 }, (_, i) => ({
        ...mockAppointments[0],
        id: i,
        customerPhone: `4799${String(i).padStart(7, "0")}`,
      }));
      mockGetAppointmentsForDispatch.mockResolvedValue(manyRecords as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointmentDispatch.send({
          type: "all",
          message: "Olá {nome}!",
        })
      ).rejects.toThrow("Máximo de 500 destinatários por disparo");
    });

    it("rejeita acesso de usuário não-admin", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointmentDispatch.send({
          type: "all",
          message: "Olá!",
        })
      ).rejects.toThrow();
    });

    it("rejeita mensagem vazia", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointmentDispatch.send({
          type: "all",
          message: "",
        })
      ).rejects.toThrow();
    });
  });

  describe("editions", () => {
    it("retorna lista de edições do feirão", async () => {
      mockListFeiraoEditions.mockResolvedValue(mockEditions as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.appointmentDispatch.editions();
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 40, name: "Feirão Kafka Ed. 40" });
    });

    it("rejeita acesso de usuário não-admin", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.appointmentDispatch.editions()
      ).rejects.toThrow();
    });
  });

  describe("sellers", () => {
    it("retorna lista de vendedores para filtro", async () => {
      mockListSellers.mockResolvedValue(mockSellers as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.appointmentDispatch.sellers();
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ id: 1, name: "Wesley" });
    });
  });
});
