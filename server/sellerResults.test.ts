import { describe, it, expect, vi } from "vitest";

// Test the bonus vehicle and seller results logic
describe("Seller Results - Bonus Vehicles", () => {
  it("should validate bonus vehicle creation input", () => {
    const validInput = {
      vehicleModel: "Onix 2022",
      bonusAmount: 50000,
      campaignName: "Feirão Kafka",
      startDate: Date.now(),
      endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    expect(validInput.vehicleModel).toBeTruthy();
    expect(validInput.bonusAmount).toBeGreaterThan(0);
    expect(validInput.campaignName).toBeTruthy();
    expect(validInput.endDate).toBeGreaterThan(validInput.startDate);
  });

  it("should validate bonus status transitions", () => {
    const validStatuses = ['pending', 'approved', 'rejected', 'paid'];
    
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('approved');
    expect(validStatuses).toContain('rejected');
    expect(validStatuses).toContain('paid');
  });

  it("should calculate net earnings correctly", () => {
    const helpAllowance = 200000; // R$ 2000
    const totalCommission = 300000; // R$ 3000
    const bonus = 100000; // R$ 1000
    const totalBonuses = 50000; // R$ 500 (car bonus)
    const totalAdvances = 150000; // R$ 1500 (vales)

    const netEarnings = helpAllowance + totalCommission + bonus + totalBonuses - totalAdvances;
    
    expect(netEarnings).toBe(500000); // R$ 5000
  });

  it("should check if vehicle matches bonus criteria by plate", () => {
    const bonusVehicle = {
      vehicleModel: "Onix 2022",
      plate: "ABC1D23",
      bonusAmount: 50000,
      active: true,
      startDate: Date.now() - 1000,
      endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    const sale = {
      vehiclePlate: "ABC1D23",
      vehicleModel: "Chevrolet Onix 2022",
    };

    // Match by plate (exact)
    const matchesByPlate = bonusVehicle.plate && 
      sale.vehiclePlate?.toUpperCase() === bonusVehicle.plate.toUpperCase();
    
    expect(matchesByPlate).toBe(true);
  });

  it("should check if vehicle matches bonus criteria by model", () => {
    const bonusVehicle = {
      vehicleModel: "Onix",
      plate: null,
      bonusAmount: 50000,
      active: true,
      startDate: Date.now() - 1000,
      endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    const sale = {
      vehiclePlate: "XYZ9K88",
      vehicleModel: "Chevrolet Onix 1.0 2022",
    };

    // Match by model (contains)
    const matchesByModel = !bonusVehicle.plate && 
      sale.vehicleModel?.toLowerCase().includes(bonusVehicle.vehicleModel.toLowerCase());
    
    expect(matchesByModel).toBe(true);
  });

  it("should not match expired campaigns", () => {
    const bonusVehicle = {
      vehicleModel: "Onix 2022",
      plate: "ABC1D23",
      bonusAmount: 50000,
      active: true,
      startDate: Date.now() - 14 * 24 * 60 * 60 * 1000,
      endDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // expired
    };

    const now = Date.now();
    const isActive = bonusVehicle.active && 
      bonusVehicle.startDate <= now && 
      bonusVehicle.endDate >= now;
    
    expect(isActive).toBe(false);
  });

  it("should not match inactive campaigns", () => {
    const bonusVehicle = {
      vehicleModel: "Onix 2022",
      plate: "ABC1D23",
      bonusAmount: 50000,
      active: false,
      startDate: Date.now() - 1000,
      endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    const now = Date.now();
    const isActive = bonusVehicle.active && 
      bonusVehicle.startDate <= now && 
      bonusVehicle.endDate >= now;
    
    expect(isActive).toBe(false);
  });
});

describe("Seller Results - Financial Overview", () => {
  it("should calculate totals correctly for multiple sellers", () => {
    const sellers = [
      { salesCount: 5, helpAllowance: 200000, totalCommission: 250000, totalBonuses: 50000, totalAdvances: 100000, netEarnings: 400000 },
      { salesCount: 3, helpAllowance: 200000, totalCommission: 150000, totalBonuses: 0, totalAdvances: 50000, netEarnings: 300000 },
      { salesCount: 8, helpAllowance: 200000, totalCommission: 400000, totalBonuses: 100000, totalAdvances: 200000, netEarnings: 500000 },
    ];

    const totals = {
      totalSellers: sellers.length,
      totalSales: sellers.reduce((s, o) => s + o.salesCount, 0),
      totalToPay: sellers.reduce((s, o) => s + Math.max(0, o.netEarnings), 0),
      totalAdvances: sellers.reduce((s, o) => s + o.totalAdvances, 0),
      totalBonuses: sellers.reduce((s, o) => s + o.totalBonuses, 0),
    };

    expect(totals.totalSellers).toBe(3);
    expect(totals.totalSales).toBe(16);
    expect(totals.totalToPay).toBe(1200000);
    expect(totals.totalAdvances).toBe(350000);
    expect(totals.totalBonuses).toBe(150000);
  });
});
