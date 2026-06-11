import { describe, it, expect } from "vitest";
import { searchAllByPlate } from "./db";

describe("searchAllByPlate", () => {
  it("should return results object with all sector keys", async () => {
    const results = await searchAllByPlate("ABC1234");
    expect(results).toHaveProperty("sales");
    expect(results).toHaveProperty("fei");
    expect(results).toHaveProperty("dispatch");
    expect(results).toHaveProperty("consignment");
    expect(results).toHaveProperty("sdr");
    expect(Array.isArray(results.sales)).toBe(true);
    expect(Array.isArray(results.fei)).toBe(true);
    expect(Array.isArray(results.dispatch)).toBe(true);
    expect(Array.isArray(results.consignment)).toBe(true);
    expect(Array.isArray(results.sdr)).toBe(true);
  });

  it("should return empty arrays for non-existent plate", async () => {
    const results = await searchAllByPlate("ZZZ9999");
    expect(results.sales.length).toBe(0);
    expect(results.fei.length).toBe(0);
    expect(results.dispatch.length).toBe(0);
    expect(results.consignment.length).toBe(0);
    expect(results.sdr.length).toBe(0);
  });

  it("should handle empty search term", async () => {
    const results = await searchAllByPlate("");
    expect(results.sales.length).toBe(0);
    expect(results.fei.length).toBe(0);
    expect(results.dispatch.length).toBe(0);
    expect(results.consignment.length).toBe(0);
    expect(results.sdr.length).toBe(0);
  });
});
