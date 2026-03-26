import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  getAppSetting: vi.fn().mockImplementation(async (key: string) => {
    if (key === "access_code_hash") return null;
    if (key === "access_code") return "kafka2024";
    return null;
  }),
  setAppSetting: vi.fn().mockResolvedValue(undefined),
  listSaleDocumentsBySeller: vi.fn().mockResolvedValue([]),
  countPendingDocsBySeller: vi.fn().mockResolvedValue(0),
  uploadSaleDocCnh: vi.fn().mockResolvedValue({ docStatus: "parcial" }),
  uploadSaleDocComprovante: vi.fn().mockResolvedValue({ docStatus: "completo", vehicleModel: "Civic" }),
  listAllSaleDocuments: vi.fn().mockResolvedValue([]),
  markSaleDocInTransfer: vi.fn().mockResolvedValue(undefined),
  markSaleDocTransferred: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(1),
  getAllPendingCount: vi.fn().mockResolvedValue({ sales: 0, fei: 0, consignment: 0, dispatch: 0, total: 0 }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/doc.jpg", key: "sale-docs/1/cnh.jpg" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({ choices: [{ message: { content: "{}" } }] }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./pushService", () => ({
  sendPushNewSale: vi.fn(),
  sendPushSaleApproved: vi.fn(),
  sendPushOvertake: vi.fn(),
  sendPushNewCompetition: vi.fn(),
  sendPushPendingSale: vi.fn(),
  sendPushPendingRecord: vi.fn(),
  sendPushAppointmentExpiring: vi.fn(),
  sendPushRescueAlert: vi.fn(),
  sendPushInactivityAlert: vi.fn(),
  sendPushAttendanceApproved: vi.fn(),
  sendPushToAll: vi.fn(),
  sendPushToSeller: vi.fn(),
  sendPushDocsPendentes: vi.fn(),
  sendPushDocTransferido: vi.fn(),
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

describe("Security: Input Validation", () => {
  it("should reject oversized base64 uploads in saleDocuments.uploadCnh", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const oversizedBase64 = "A".repeat(11 * 1024 * 1024); // 11MB, exceeds 10MB limit
    await expect(
      caller.saleDocuments.uploadCnh({
        id: 1,
        sellerId: 1,
        base64: oversizedBase64,
        filename: "cnh.jpg",
      })
    ).rejects.toThrow();
  });

  it("should accept valid-sized base64 uploads", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const validBase64 = Buffer.from("small file content").toString("base64");
    const result = await caller.saleDocuments.uploadCnh({
      id: 1,
      sellerId: 1,
      base64: validBase64,
      filename: "cnh.jpg",
    });
    expect(result.success).toBe(true);
  });
});

describe("Security: Access Control", () => {
  it("should protect admin-only saleDocuments routes", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // listAll should require admin
    await expect(caller.saleDocuments.listAll()).rejects.toThrow();
  });

  it("should protect markInTransfer from public access", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.saleDocuments.markInTransfer({ id: 1 })).rejects.toThrow();
  });

  it("should protect markTransferred from public access", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.saleDocuments.markTransferred({ id: 1, base64: "dGVzdA==", filename: "doc.pdf" })
    ).rejects.toThrow();
  });

  it("should allow admin to access listAll", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.saleDocuments.listAll();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Security: Access Code Hashing", () => {
  it("should verify correct access code via legacy fallback", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.access.verify({ code: "kafka2024" });
    expect(result.valid).toBe(true);
  });

  it("should reject incorrect access code", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.access.verify({ code: "wrongcode" });
    expect(result.valid).toBe(false);
  });

  it("should trigger hash migration on successful legacy verify", async () => {
    const db = await import("./db");
    const caller = appRouter.createCaller(createPublicContext());
    await caller.access.verify({ code: "kafka2024" });
    // setAppSetting should have been called to store the hash
    expect(db.setAppSetting).toHaveBeenCalledWith("access_code_hash", expect.any(String));
  });
});

describe("Security: Rate Limiting Configuration", () => {
  it("should have helmet and rate-limit packages installed", async () => {
    // Verify packages exist
    const helmet = await import("helmet");
    expect(helmet).toBeDefined();
    const rateLimit = await import("express-rate-limit");
    expect(rateLimit).toBeDefined();
  });
});
