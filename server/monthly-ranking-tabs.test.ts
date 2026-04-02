import { describe, it, expect } from "vitest";
import * as schema from "../drizzle/schema";
import { appRouter } from "./routers";

describe("Monthly Ranking Tabs Feature", () => {
  // Schema tests
  it("should have monthlySnapshots table with required fields", () => {
    const table = schema.monthlySnapshots;
    expect(table).toBeDefined();
    // Check required columns exist
    const cols = Object.keys(table);
    expect(cols).toContain("sellerId");
    expect(cols).toContain("sellerName");
    expect(cols).toContain("month");
    expect(cols).toContain("year");
    expect(cols).toContain("totalSales");
    expect(cols).toContain("totalPoints");
    expect(cols).toContain("department");
    expect(cols).toContain("rank");
    expect(cols).toContain("totalFei");
    expect(cols).toContain("totalAgendamentos");
    expect(cols).toContain("tenantId");
  });

  // Router tests
  it("should have goals.monthlyRanking procedure for current month ranking", () => {
    expect(appRouter._def.procedures).toHaveProperty("goals.monthlyRanking");
  });

  it("should have monthTurnover.getSnapshot procedure for previous month data", () => {
    expect(appRouter._def.procedures).toHaveProperty("monthTurnover.getSnapshot");
  });

  it("should have monthTurnover.availableMonths procedure", () => {
    expect(appRouter._def.procedures).toHaveProperty("monthTurnover.availableMonths");
  });

  it("should have monthTurnover.execute procedure for admin month turnover", () => {
    expect(appRouter._def.procedures).toHaveProperty("monthTurnover.execute");
  });

  it("should have monthTurnover.resetCounters procedure", () => {
    expect(appRouter._def.procedures).toHaveProperty("monthTurnover.resetCounters");
  });

  // DB function existence tests
  it("should export getMonthlyRanking from db", async () => {
    const db = await import("./db");
    expect(typeof db.getMonthlyRanking).toBe("function");
  });

  it("should export getMonthlySnapshots from db", async () => {
    const db = await import("./db");
    expect(typeof db.getMonthlySnapshots).toBe("function");
  });

  it("should export createMonthlySnapshot from db", async () => {
    const db = await import("./db");
    expect(typeof db.createMonthlySnapshot).toBe("function");
  });

  it("should export resetMonthlyCounters from db", async () => {
    const db = await import("./db");
    expect(typeof db.resetMonthlyCounters).toBe("function");
  });

  it("should export executeMonthTurnover from db", async () => {
    const db = await import("./db");
    expect(typeof db.executeMonthTurnover).toBe("function");
  });

  it("should export listAvailableMonths from db", async () => {
    const db = await import("./db");
    expect(typeof db.listAvailableMonths).toBe("function");
  });
});
