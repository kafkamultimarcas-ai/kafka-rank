import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

const { createSellerAdvance, createBonusVehicle } = vi.hoisted(() => ({
  createSellerAdvance: vi.fn(async () => {}),
  createBonusVehicle: vi.fn(async () => {}),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    createSellerAdvance,
    createBonusVehicle,
  };
});

import { appRouter } from "./routers";

function createTenantContext(tenantId: number, tenantSlug: string): TrpcContext {
  return {
    user: null,
    tenantId,
    tenantSlug,
    req: { protocol: "https", headers: { cookie: "" } } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  } as TrpcContext;
}

describe("sellerResults - gravações tenant-aware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createAdvance usa o tenant resolvido na request", async () => {
    const caller = appRouter.createCaller(createTenantContext(7, "loja-sete"));

    await caller.sellerResults.createAdvance({
      sellerId: 10,
      amount: 500,
      description: "Vale combustível",
      date: Date.now(),
      month: 7,
      year: 2026,
    });

    expect(createSellerAdvance).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 10,
        tenantId: 7,
      }),
    );
  });

  it("createBonusVehicle usa o tenant resolvido na request", async () => {
    const caller = appRouter.createCaller(createTenantContext(9, "loja-nove"));

    await caller.sellerResults.createBonusVehicle({
      vehicleModel: "Tiguan",
      plate: "ABC1D23",
      bonusAmount: 1000,
      campaignName: "Campanha Julho",
      campaignRules: "Fechar venda do estoque alvo",
      startDate: Date.now(),
      endDate: Date.now() + 86400000,
    });

    expect(createBonusVehicle).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicleModel: "Tiguan",
        tenantId: 9,
        active: true,
      }),
    );
  });
});
