import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ===== Helper: create admin context =====
function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-test",
      email: "admin@test.com",
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("vehicleCosts", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let vehicleId: number;

  beforeEach(() => {
    caller = appRouter.createCaller(createAdminContext());
  });

  // ===== CRUD VEÍCULOS =====
  it("creates a vehicle via manual registration", async () => {
    const result = await caller.vehicleCosts.create({
      plate: "TST-1234",
      brand: "Fiat",
      model: "Argo 1.0",
      year: 2023,
      color: "Branco",
      fuel: "flex",
      purchasePrice: "45000",
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
    vehicleId = result.id;
  });

  it("lists vehicles and finds the created one", async () => {
    // Create first
    const { id } = await caller.vehicleCosts.create({
      plate: "LST-5678",
      brand: "Toyota",
      model: "Corolla",
      year: 2024,
      purchasePrice: "120000",
    });

    const vehicles = await caller.vehicleCosts.list({});
    expect(Array.isArray(vehicles)).toBe(true);
    const found = vehicles.find((v) => v.id === id);
    expect(found).toBeDefined();
    expect(found?.plate).toBe("LST5678");
    expect(found?.brand).toBe("Toyota");
    expect(found?.totalExpenses).toBe(0);
  });

  it("gets vehicle by id with details", async () => {
    const { id } = await caller.vehicleCosts.create({
      plate: "DET-9999",
      brand: "Honda",
      model: "Civic",
      year: 2022,
      purchasePrice: "95000",
    });

    const vehicle = await caller.vehicleCosts.getById({ id });
    expect(vehicle.plate).toBe("DET9999");
    expect(vehicle.brand).toBe("Honda");
    expect(vehicle.model).toBe("Civic");
    expect(vehicle.year).toBe(2022);
    expect(vehicle.items).toBeDefined();
    expect(Array.isArray(vehicle.items)).toBe(true);
    expect(vehicle.totalExpenses).toBe(0);
    expect(vehicle.profit).toBeNull();
    expect(vehicle.margin).toBeNull();
  });

  it("updates vehicle data", async () => {
    const { id } = await caller.vehicleCosts.create({
      plate: "UPD-1111",
      brand: "VW",
      model: "Gol",
      year: 2020,
      purchasePrice: "35000",
    });

    await caller.vehicleCosts.update({
      id,
      salePrice: "42000",
      status: "sold",
    });

    const updated = await caller.vehicleCosts.getById({ id });
    expect(updated.status).toBe("sold");
    expect(parseFloat(String(updated.salePrice))).toBe(42000);
    expect(updated.profit).toBeGreaterThan(0);
    expect(updated.margin).toBeGreaterThan(0);
  });

  it("deletes a vehicle", async () => {
    const { id } = await caller.vehicleCosts.create({
      plate: "DEL-0000",
      brand: "Ford",
      model: "Ka",
      year: 2019,
    });

    const result = await caller.vehicleCosts.delete({ id });
    expect(result.success).toBe(true);

    await expect(caller.vehicleCosts.getById({ id })).rejects.toThrow();
  });

  // ===== ITENS DE CUSTO =====
  it("creates and lists cost items for a vehicle", async () => {
    const { id: vId } = await caller.vehicleCosts.create({
      plate: "ITM-2222",
      brand: "Hyundai",
      model: "HB20",
      year: 2021,
      purchasePrice: "55000",
    });

    const item1 = await caller.vehicleCosts.createItem({
      vehicleId: vId,
      description: "Troca de óleo",
      category: "mecanica",
      amount: "350",
    });
    expect(item1).toHaveProperty("id");

    const item2 = await caller.vehicleCosts.createItem({
      vehicleId: vId,
      description: "Polimento",
      category: "estetica",
      amount: "500",
    });
    expect(item2).toHaveProperty("id");

    const items = await caller.vehicleCosts.listItems({ vehicleId: vId });
    expect(items.length).toBe(2);

    // Check vehicle summary includes expenses
    const vehicle = await caller.vehicleCosts.getById({ id: vId });
    expect(vehicle.totalExpenses).toBe(850);
    expect(vehicle.expenseCount).toBe(2);
    expect(vehicle.totalCost).toBe(55850);
  });

  it("updates a cost item", async () => {
    const { id: vId } = await caller.vehicleCosts.create({
      plate: "UPI-3333",
      purchasePrice: "30000",
    });

    const { id: itemId } = await caller.vehicleCosts.createItem({
      vehicleId: vId,
      description: "Pneus",
      category: "pneus",
      amount: "1200",
    });

    const result = await caller.vehicleCosts.updateItem({
      id: itemId,
      amount: "1500",
      description: "Pneus novos",
    });
    expect(result.success).toBe(true);

    const items = await caller.vehicleCosts.listItems({ vehicleId: vId });
    const updated = items.find((i) => i.id === itemId);
    expect(updated?.description).toBe("Pneus novos");
    expect(parseFloat(String(updated?.amount))).toBe(1500);
  });

  it("deletes a cost item", async () => {
    const { id: vId } = await caller.vehicleCosts.create({
      plate: "DLI-4444",
      purchasePrice: "20000",
    });

    const { id: itemId } = await caller.vehicleCosts.createItem({
      vehicleId: vId,
      description: "Funilaria",
      category: "funilaria",
      amount: "2000",
    });

    const result = await caller.vehicleCosts.deleteItem({ id: itemId });
    expect(result.success).toBe(true);

    const items = await caller.vehicleCosts.listItems({ vehicleId: vId });
    expect(items.length).toBe(0);
  });

  // ===== PROFIT/MARGIN CALCULATION =====
  it("calculates profit and margin correctly", async () => {
    const { id } = await caller.vehicleCosts.create({
      plate: "PRF-5555",
      brand: "Chevrolet",
      model: "Onix",
      year: 2022,
      purchasePrice: "50000",
      salePrice: "59900",
    });

    await caller.vehicleCosts.createItem({
      vehicleId: id,
      description: "Revisão completa",
      amount: "3200",
    });

    const vehicle = await caller.vehicleCosts.getById({ id });
    // totalCost = 50000 + 3200 = 53200
    expect(vehicle.totalCost).toBe(53200);
    // profit = 59900 - 53200 = 6700
    expect(vehicle.profit).toBe(6700);
    // margin = (6700 / 59900) * 100 ≈ 11.185...
    expect(vehicle.margin).toBeGreaterThan(11);
    expect(vehicle.margin).toBeLessThan(12);
  });

  // ===== SEARCH FILTER =====
  it("filters vehicles by search term", async () => {
    await caller.vehicleCosts.create({
      plate: "SRC-1111",
      brand: "Fiat",
      model: "Strada",
      year: 2023,
    });

    const results = await caller.vehicleCosts.list({ search: "Strada" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((v) => v.model === "Strada")).toBe(true);

    const noResults = await caller.vehicleCosts.list({ search: "XYZNOTEXIST" });
    expect(noResults.length).toBe(0);
  });

  // ===== FIPE API =====
  it("fetches FIPE brands for cars", async () => {
    const brands = await caller.vehicleCosts.fipeBrands({ type: "carros" });
    expect(Array.isArray(brands)).toBe(true);
    expect(brands.length).toBeGreaterThan(0);
    expect(brands[0]).toHaveProperty("codigo");
    expect(brands[0]).toHaveProperty("nome");
  });

  // ===== AUTH GUARD =====
  it("rejects unauthenticated users", async () => {
    const unauthCaller = appRouter.createCaller(createUnauthContext());
    await expect(unauthCaller.vehicleCosts.list({})).rejects.toThrow();
  });

  // ===== PLATE NORMALIZATION =====
  it("normalizes plate format on create", async () => {
    const { id } = await caller.vehicleCosts.create({
      plate: "abc-1d23",
    });

    const vehicle = await caller.vehicleCosts.getById({ id });
    expect(vehicle.plate).toBe("ABC1D23");
  });
});
