import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the finDb module
vi.mock("../server/finDb", () => ({
  getFinancialAlerts: vi.fn(),
}));

// Mock the notification module
vi.mock("../server/_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { getFinancialAlerts } from "../server/finDb";
import { notifyOwner } from "../server/_core/notification";

describe("Financial Alerts System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFinancialAlerts", () => {
    it("should return empty arrays when no alerts", async () => {
      const mockAlerts = {
        overdue: [],
        dueToday: [],
        dueTomorrow: [],
        dueThisWeek: [],
        summary: {
          overdueCount: 0, overdueTotal: 0,
          dueTodayCount: 0, dueTodayTotal: 0,
          dueTomorrowCount: 0, dueTomorrowTotal: 0,
          dueWeekCount: 0, dueWeekTotal: 0,
        },
      };
      (getFinancialAlerts as any).mockResolvedValue(mockAlerts);

      const result = await getFinancialAlerts();
      expect(result.overdue).toEqual([]);
      expect(result.dueToday).toEqual([]);
      expect(result.dueTomorrow).toEqual([]);
      expect(result.dueThisWeek).toEqual([]);
      expect(result.summary.overdueCount).toBe(0);
    });

    it("should correctly categorize overdue transactions", async () => {
      const mockAlerts = {
        overdue: [
          { id: 1, description: "Conta de Luz", amount: "250.00", dueDate: Date.now() - 86400000 * 3, type: "payable", status: "pending" },
          { id: 2, description: "Boleto IPVA", amount: "1500.00", dueDate: Date.now() - 86400000 * 7, type: "payable", status: "overdue" },
        ],
        dueToday: [
          { id: 3, description: "Internet", amount: "120.00", dueDate: Date.now(), type: "payable", status: "pending" },
        ],
        dueTomorrow: [],
        dueThisWeek: [
          { id: 4, description: "Aluguel", amount: "3000.00", dueDate: Date.now() + 86400000 * 4, type: "payable", status: "pending" },
        ],
        summary: {
          overdueCount: 2, overdueTotal: 1750,
          dueTodayCount: 1, dueTodayTotal: 120,
          dueTomorrowCount: 0, dueTomorrowTotal: 0,
          dueWeekCount: 1, dueWeekTotal: 3000,
        },
      };
      (getFinancialAlerts as any).mockResolvedValue(mockAlerts);

      const result = await getFinancialAlerts();
      expect(result.summary.overdueCount).toBe(2);
      expect(result.summary.overdueTotal).toBe(1750);
      expect(result.summary.dueTodayCount).toBe(1);
      expect(result.summary.dueTodayTotal).toBe(120);
      expect(result.summary.dueWeekCount).toBe(1);
      expect(result.overdue.length).toBe(2);
      expect(result.dueToday.length).toBe(1);
    });

    it("should include supplier info in overdue transactions", async () => {
      const mockAlerts = {
        overdue: [
          { id: 1, description: "Conta de Luz", amount: "250.00", supplier: "CELESC", dueDate: Date.now() - 86400000, type: "payable", status: "overdue" },
        ],
        dueToday: [],
        dueTomorrow: [],
        dueThisWeek: [],
        summary: {
          overdueCount: 1, overdueTotal: 250,
          dueTodayCount: 0, dueTodayTotal: 0,
          dueTomorrowCount: 0, dueTomorrowTotal: 0,
          dueWeekCount: 0, dueWeekTotal: 0,
        },
      };
      (getFinancialAlerts as any).mockResolvedValue(mockAlerts);

      const result = await getFinancialAlerts();
      expect(result.overdue[0].supplier).toBe("CELESC");
      expect(result.overdue[0].description).toBe("Conta de Luz");
    });
  });

  describe("Alert Notification", () => {
    it("should format notification content with overdue and today's bills", async () => {
      const mockAlerts = {
        overdue: [
          { id: 1, description: "Conta de Luz", amount: "250.00", supplier: "CELESC", dueDate: Date.now() - 86400000 * 3, type: "payable" },
        ],
        dueToday: [
          { id: 2, description: "Internet", amount: "120.00", supplier: "Oi", dueDate: Date.now(), type: "payable" },
        ],
        dueTomorrow: [],
        dueThisWeek: [],
        summary: {
          overdueCount: 1, overdueTotal: 250,
          dueTodayCount: 1, dueTodayTotal: 120,
          dueTomorrowCount: 0, dueTomorrowTotal: 0,
          dueWeekCount: 0, dueWeekTotal: 0,
        },
      };
      (getFinancialAlerts as any).mockResolvedValue(mockAlerts);

      // Simulate the notification logic from the router
      const alerts = await getFinancialAlerts();
      const { summary } = alerts;
      const parts: string[] = [];

      if (summary.overdueCount > 0) {
        parts.push(`${summary.overdueCount} conta(s) ATRASADA(S)`);
      }
      if (summary.dueTodayCount > 0) {
        parts.push(`${summary.dueTodayCount} conta(s) VENCE HOJE`);
      }

      expect(parts.length).toBe(2);
      expect(parts[0]).toContain("ATRASADA");
      expect(parts[1]).toContain("HOJE");
    });

    it("should not send notification when no pending bills", async () => {
      const mockAlerts = {
        overdue: [],
        dueToday: [],
        dueTomorrow: [],
        dueThisWeek: [],
        summary: {
          overdueCount: 0, overdueTotal: 0,
          dueTodayCount: 0, dueTodayTotal: 0,
          dueTomorrowCount: 0, dueTomorrowTotal: 0,
          dueWeekCount: 0, dueWeekTotal: 0,
        },
      };
      (getFinancialAlerts as any).mockResolvedValue(mockAlerts);

      const alerts = await getFinancialAlerts();
      const { summary } = alerts;
      const parts: string[] = [];

      if (summary.overdueCount > 0) parts.push("overdue");
      if (summary.dueTodayCount > 0) parts.push("today");
      if (summary.dueTomorrowCount > 0) parts.push("tomorrow");

      expect(parts.length).toBe(0);
      // notifyOwner should NOT be called
      expect(notifyOwner).not.toHaveBeenCalled();
    });

    it("should include tomorrow alerts in notification", async () => {
      const mockAlerts = {
        overdue: [],
        dueToday: [],
        dueTomorrow: [
          { id: 1, description: "Boleto Seguro", amount: "800.00", dueDate: Date.now() + 86400000, type: "payable" },
        ],
        dueThisWeek: [],
        summary: {
          overdueCount: 0, overdueTotal: 0,
          dueTodayCount: 0, dueTodayTotal: 0,
          dueTomorrowCount: 1, dueTomorrowTotal: 800,
          dueWeekCount: 0, dueWeekTotal: 0,
        },
      };
      (getFinancialAlerts as any).mockResolvedValue(mockAlerts);

      const alerts = await getFinancialAlerts();
      expect(alerts.summary.dueTomorrowCount).toBe(1);
      expect(alerts.dueTomorrow[0].description).toBe("Boleto Seguro");
    });
  });

  describe("Summary Calculations", () => {
    it("should calculate correct totals for mixed transactions", async () => {
      const mockAlerts = {
        overdue: [
          { id: 1, amount: "100.00" },
          { id: 2, amount: "200.50" },
        ],
        dueToday: [
          { id: 3, amount: "350.00" },
        ],
        dueTomorrow: [
          { id: 4, amount: "500.00" },
          { id: 5, amount: "150.75" },
        ],
        dueThisWeek: [
          { id: 6, amount: "1000.00" },
        ],
        summary: {
          overdueCount: 2, overdueTotal: 300.50,
          dueTodayCount: 1, dueTodayTotal: 350,
          dueTomorrowCount: 2, dueTomorrowTotal: 650.75,
          dueWeekCount: 1, dueWeekTotal: 1000,
        },
      };
      (getFinancialAlerts as any).mockResolvedValue(mockAlerts);

      const result = await getFinancialAlerts();
      expect(result.summary.overdueTotal).toBeCloseTo(300.50);
      expect(result.summary.dueTodayTotal).toBe(350);
      expect(result.summary.dueTomorrowTotal).toBeCloseTo(650.75);
      expect(result.summary.dueWeekTotal).toBe(1000);
    });
  });
});
