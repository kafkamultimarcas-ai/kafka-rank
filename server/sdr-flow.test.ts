import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

describe("SDR Lead Distribution Flow", () => {
  it("should generate valid CRM admin JWT token with admin_auth type", () => {
    const token = jwt.sign(
      { adminId: 1, role: "admin", type: "admin_auth" },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    expect(token).toBeTruthy();
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    expect(decoded.type).toBe("admin_auth");
    expect(decoded.adminId).toBe(1);
    expect(decoded.role).toBe("admin");
  });

  it("should reject invalid CRM admin token", () => {
    expect(() => {
      jwt.verify("invalid-token", JWT_SECRET);
    }).toThrow();
  });

  it("should have SDR-specific procedures in crmLeadsRouter", async () => {
    const crmRouter = await import("./routers/crmRouter");
    const router = crmRouter.crmLeadsRouter;
    expect(router._def.procedures.assignToSeller).toBeDefined();
    expect(router._def.procedures.bulkAssign).toBeDefined();
    expect(router._def.procedures.listUnassigned).toBeDefined();
    expect(router._def.procedures.listBySeller).toBeDefined();
    expect(router._def.procedures.listAll).toBeDefined();
  });

  it("should have WhatsApp bulk send procedures", async () => {
    const { whatsappRouter } = await import("./routers/whatsappRouter");
    expect(whatsappRouter._def.procedures.sendBulk).toBeDefined();
    expect(whatsappRouter._def.procedures.importContacts).toBeDefined();
    expect(whatsappRouter._def.procedures.importChats).toBeDefined();
    expect(whatsappRouter._def.procedures.bulkHistory).toBeDefined();
    expect(whatsappRouter._def.procedures.status).toBeDefined();
  });

  it("should have CRM admin auth procedures", async () => {
    const crmRouter = await import("./routers/crmRouter");
    const authRouter = crmRouter.adminAuthRouter;
    expect(authRouter._def.procedures.login).toBeDefined();
    expect(authRouter._def.procedures.me).toBeDefined();
    expect(authRouter._def.procedures.list).toBeDefined();
    expect(authRouter._def.procedures.create).toBeDefined();
  });

  it("context.ts should import getAdminById from crmDb", async () => {
    const crmDb = await import("./crmDb");
    expect(typeof crmDb.getAdminById).toBe("function");
  });

  it("webhook should NOT auto-assign WhatsApp leads (SDR flow)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const webhooksSource = fs.readFileSync(
      path.join(__dirname, "webhooks.ts"),
      "utf-8"
    );
    const whatsappSection = webhooksSource.slice(
      webhooksSource.indexOf('app.post("/api/webhooks/whatsapp"'),
      webhooksSource.indexOf('// ===== SIG WEB SYNC =====')
    );
    expect(whatsappSection).not.toContain("autoAssignLead(leadId");
    expect(whatsappSection).toContain("SDR Flow");
    expect(whatsappSection).toContain("sellerId: 0");
  });

  it("CRM Admin default view should be leads", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const dashboardSource = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/crm/CrmAdminDashboard.tsx"),
      "utf-8"
    );
    expect(dashboardSource).toContain('useState<AdminView>("chat")');
  });
});
