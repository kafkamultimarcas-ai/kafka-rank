import { describe, it, expect } from "vitest";
import {
  notifications,
  sellers,
  crmLeads,
} from "../drizzle/schema";

describe("New Lead Notification Feature", () => {
  describe("Schema validation", () => {
    it("notifications table has required columns for new lead alerts", () => {
      const cols = Object.keys(notifications);
      expect(cols).toContain("id");
      expect(cols).toContain("sellerId");
      expect(cols).toContain("targetType");
      expect(cols).toContain("type");
      expect(cols).toContain("title");
      expect(cols).toContain("message");
      expect(cols).toContain("read");
      expect(cols).toContain("actionUrl");
      expect(cols).toContain("createdAt");
    });

    it("sellers table has sellerRole field for gerente filtering", () => {
      const cols = Object.keys(sellers);
      expect(cols).toContain("sellerRole");
    });

    it("crmLeads table has sellerId for lead assignment", () => {
      const cols = Object.keys(crmLeads);
      expect(cols).toContain("sellerId");
      expect(cols).toContain("name");
      expect(cols).toContain("phone");
    });
  });

  describe("Push service functions exist", () => {
    it("sendPushNewLead is exported from pushService", async () => {
      const pushService = await import("./pushService");
      expect(typeof pushService.sendPushNewLead).toBe("function");
    });

    it("sendPushLeadTransferred is exported from pushService", async () => {
      const pushService = await import("./pushService");
      expect(typeof pushService.sendPushLeadTransferred).toBe("function");
    });
  });

  describe("Notification creation helper", () => {
    it("createNotification is exported from db", async () => {
      const db = await import("./db");
      expect(typeof db.createNotification).toBe("function");
    });
  });
});
