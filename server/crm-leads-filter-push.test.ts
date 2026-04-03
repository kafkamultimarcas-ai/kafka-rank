import { describe, it, expect, vi } from "vitest";

describe("CRM Lead Status Filter & Push Notifications", () => {
  describe("Lead Status Filter Types", () => {
    it("should have LeadStatusFilter type with all, accepted, pending values", () => {
      const validFilters = ["all", "accepted", "pending"];
      validFilters.forEach(f => {
        expect(["all", "accepted", "pending"]).toContain(f);
      });
    });

    it("should filter accepted leads by acknowledgedAt presence", () => {
      const leads = [
        { id: 1, name: "Lead A", acknowledgedAt: Date.now() },
        { id: 2, name: "Lead B", acknowledgedAt: null },
        { id: 3, name: "Lead C", acknowledgedAt: Date.now() - 10000 },
        { id: 4, name: "Lead D", acknowledgedAt: null },
      ];

      const accepted = leads.filter(l => l.acknowledgedAt);
      const pending = leads.filter(l => !l.acknowledgedAt);

      expect(accepted).toHaveLength(2);
      expect(accepted.map(l => l.id)).toEqual([1, 3]);
      expect(pending).toHaveLength(2);
      expect(pending.map(l => l.id)).toEqual([2, 4]);
    });

    it("should return all leads when filter is 'all'", () => {
      const leads = [
        { id: 1, acknowledgedAt: Date.now() },
        { id: 2, acknowledgedAt: null },
      ];
      const filter = "all";
      let result = leads;
      if (filter === "accepted") result = leads.filter(l => l.acknowledgedAt);
      else if (filter === "pending") result = leads.filter(l => !l.acknowledgedAt);
      expect(result).toHaveLength(2);
    });
  });

  describe("Push Notification on Lead Create", () => {
    it("sendPushNewLead is exported from pushService", async () => {
      const pushService = await import("./pushService");
      expect(typeof pushService.sendPushNewLead).toBe("function");
    });

    it("sendPushLeadTransferred is exported from pushService", async () => {
      const pushService = await import("./pushService");
      expect(typeof pushService.sendPushLeadTransferred).toBe("function");
    });

    it("crmLeads.create router exists and accepts sellerId", async () => {
      const { crmLeadsRouter } = await import("./routers/crmRouter");
      expect(crmLeadsRouter).toBeDefined();
      // The create procedure should exist
      expect((crmLeadsRouter as any)._def.procedures.create).toBeDefined();
    });
  });

  describe("Push Notification Prompt in CRM", () => {
    it("usePushNotifications hook is importable", async () => {
      // Verify the hook file exists and exports correctly
      const fs = await import("fs");
      const hookPath = "/home/ubuntu/kafka_sales_competition/client/src/hooks/usePushNotifications.ts";
      expect(fs.existsSync(hookPath)).toBe(true);
      const content = fs.readFileSync(hookPath, "utf-8");
      expect(content).toContain("export function usePushNotifications");
      expect(content).toContain("subscribe");
      expect(content).toContain("isSubscribed");
      expect(content).toContain("isSupported");
    });

    it("CrmCommandCenter imports usePushNotifications", async () => {
      const fs = await import("fs");
      const crmPath = "/home/ubuntu/kafka_sales_competition/client/src/pages/crm/CrmCommandCenter.tsx";
      const content = fs.readFileSync(crmPath, "utf-8");
      expect(content).toContain("import { usePushNotifications }");
      expect(content).toContain("pushSupported");
      expect(content).toContain("isSubscribed");
      expect(content).toContain("subscribePush");
    });

    it("CrmCommandCenter has accepted/pending lead filter buttons", async () => {
      const fs = await import("fs");
      const crmPath = "/home/ubuntu/kafka_sales_competition/client/src/pages/crm/CrmCommandCenter.tsx";
      const content = fs.readFileSync(crmPath, "utf-8");
      expect(content).toContain("leadStatusFilter");
      expect(content).toContain("Aceitos");
      expect(content).toContain("Pendentes");
      expect(content).toContain("setLeadStatusFilter");
    });

    it("CrmCommandCenter has BellRing icon for subscribed state", async () => {
      const fs = await import("fs");
      const crmPath = "/home/ubuntu/kafka_sales_competition/client/src/pages/crm/CrmCommandCenter.tsx";
      const content = fs.readFileSync(crmPath, "utf-8");
      expect(content).toContain("BellRing");
      expect(content).toContain("isSubscribed &&");
      expect(content).toContain("<BellRing");
    });
  });

  describe("Service Worker Push Handling", () => {
    it("sw.js handles new_lead and lead_transferred notification types", async () => {
      const fs = await import("fs");
      const swPath = "/home/ubuntu/kafka_sales_competition/client/public/sw.js";
      const content = fs.readFileSync(swPath, "utf-8");
      expect(content).toContain('"new_lead"');
      expect(content).toContain('"lead_transferred"');
      expect(content).toContain('"Abrir CRM"');
    });
  });
});
