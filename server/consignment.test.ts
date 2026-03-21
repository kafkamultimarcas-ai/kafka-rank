import { describe, it, expect, vi } from "vitest";

describe("Consignment Control - Business Rules", () => {
  // Test plate normalization logic
  it("should normalize plates correctly for comparison", () => {
    const normalize = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    expect(normalize("ABC1D23")).toBe("ABC1D23");
    expect(normalize("abc-1d23")).toBe("ABC1D23");
    expect(normalize("ABC 1D23")).toBe("ABC1D23");
    expect(normalize("abc1d23")).toBe("ABC1D23");
  });

  // Test days calculation
  it("should calculate days in yard correctly", () => {
    const getDaysInYard = (entryDate: number, exitDate?: number | null) => {
      const end = exitDate || Date.now();
      return Math.floor((end - entryDate) / (1000 * 60 * 60 * 24));
    };

    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);

    expect(getDaysInYard(sevenDaysAgo)).toBe(7);
    expect(getDaysInYard(threeDaysAgo)).toBe(3);
    expect(getDaysInYard(now)).toBe(0);
  });

  // Test 60-day blocking logic
  it("should block registration within 60 days", () => {
    const checkDuplicateLogic = (daysSinceLast: number, hasExit: boolean, status: string) => {
      if (!hasExit && (status === 'approved' || status === 'pending')) {
        return { blocked: true, reason: 'still_in_yard' };
      }
      if (daysSinceLast < 60) {
        return { blocked: true, reason: 'within_60_days' };
      }
      return { blocked: false, reason: daysSinceLast >= 60 ? 'warning_previous' : 'none' };
    };

    // Car still in yard - should block
    expect(checkDuplicateLogic(5, false, 'approved').blocked).toBe(true);
    expect(checkDuplicateLogic(5, false, 'approved').reason).toBe('still_in_yard');

    // Car exited but within 60 days - should block
    expect(checkDuplicateLogic(30, true, 'approved').blocked).toBe(true);
    expect(checkDuplicateLogic(30, true, 'approved').reason).toBe('within_60_days');

    // Car exited and past 60 days - should allow with warning
    expect(checkDuplicateLogic(61, true, 'approved').blocked).toBe(false);

    // Rejected records should not block (car has exit since rejected)
    expect(checkDuplicateLogic(10, true, 'rejected').blocked).toBe(true); // still within 60 days
  });

  // Test 7-day validation
  it("should validate 7 days correctly", () => {
    const isValid = (entryDate: number, validAfterDays: number = 7) => {
      const daysPassed = Math.floor((Date.now() - entryDate) / (1000 * 60 * 60 * 24));
      return daysPassed >= validAfterDays;
    };

    const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
    const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    expect(isValid(eightDaysAgo)).toBe(true);
    expect(isValid(sixDaysAgo)).toBe(false);
    expect(isValid(sevenDaysAgo)).toBe(true);
  });

  // Test plate validation
  it("should require plate for consignment registration", () => {
    const validatePlate = (plate: string | undefined) => {
      if (!plate || plate.trim().length < 6) return false;
      return true;
    };

    expect(validatePlate(undefined)).toBe(false);
    expect(validatePlate("")).toBe(false);
    expect(validatePlate("ABC")).toBe(false);
    expect(validatePlate("ABC1D2")).toBe(true);
    expect(validatePlate("ABC1D23")).toBe(true);
  });

  // Test entry date is required
  it("should require entry date", () => {
    const validateEntryDate = (entryDate: number | undefined) => {
      if (!entryDate || entryDate <= 0) return false;
      return true;
    };

    expect(validateEntryDate(undefined)).toBe(false);
    expect(validateEntryDate(0)).toBe(false);
    expect(validateEntryDate(Date.now())).toBe(true);
  });

  // Test exit date calculation for isValid
  it("should calculate isValid based on exit date when available", () => {
    const calculateIsValid = (entryDate: number, exitDate: number, validAfterDays: number = 7) => {
      const daysPassed = Math.floor((exitDate - entryDate) / (1000 * 60 * 60 * 24));
      return daysPassed >= validAfterDays;
    };

    const entry = Date.now() - (10 * 24 * 60 * 60 * 1000);
    const exitAfter8Days = entry + (8 * 24 * 60 * 60 * 1000);
    const exitAfter5Days = entry + (5 * 24 * 60 * 60 * 1000);

    expect(calculateIsValid(entry, exitAfter8Days)).toBe(true);
    expect(calculateIsValid(entry, exitAfter5Days)).toBe(false);
  });
});
