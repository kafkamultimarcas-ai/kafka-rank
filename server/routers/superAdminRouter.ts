import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb, withRetry } from "../db";
import { tenants, superAdmins, sellers, admins, sales, crmLeads, competitions, crmPipelineStages, finCategories } from "../../drizzle/schema";
import { eq, sql, desc, and, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Super admin JWT secret (separate from regular auth)
const SUPER_SECRET = process.env.JWT_SECRET ? process.env.JWT_SECRET + "_super" : "super_secret_key";

function signSuperToken(adminId: number, role: string) {
  return jwt.sign({ superAdminId: adminId, role }, SUPER_SECRET, { expiresIn: "24h" });
}

function verifySuperToken(token: string): { superAdminId: number; role: string } | null {
  try {
    return jwt.verify(token, SUPER_SECRET) as any;
  } catch {
    return null;
  }
}

export const superAdminRouter = router({
  // ========== AUTH ==========
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [rows] = await withRetry(() =>
        db.select().from(superAdmins).where(eq(superAdmins.username, input.username)).limit(1)
      );
      const admin = (rows as any)?.[0] || rows;
      if (!admin?.id) throw new Error("Credenciais inválidas");

      const valid = await bcrypt.compare(input.password, admin.passwordHash);
      if (!valid) throw new Error("Credenciais inválidas");
      if (!admin.active) throw new Error("Conta desativada");

      // Update last access
      await withRetry(() =>
        db.update(superAdmins).set({ lastAccess: Date.now() }).where(eq(superAdmins.id, admin.id))
      );

      const token = signSuperToken(admin.id, admin.role || "support");
      return { token, admin: { id: admin.id, name: admin.name, role: admin.role, username: admin.username } };
    }),

  me: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) return null;

      const db = await getDb();
      if (!db) return null;

      const [rows] = await withRetry(() =>
        db.select({ id: superAdmins.id, name: superAdmins.name, username: superAdmins.username, role: superAdmins.role, email: superAdmins.email })
          .from(superAdmins).where(eq(superAdmins.id, payload.superAdminId)).limit(1)
      );
      return (rows as any)?.[0] || rows || null;
    }),

  // ========== DASHBOARD ==========
  dashboard: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all tenants with stats
      const allTenants = await withRetry(() => db.select().from(tenants).orderBy(desc(tenants.createdAt)));

      // Count sellers per tenant
      const sellerCounts = await withRetry(() =>
        db.select({ tenantId: sellers.tenantId, count: count() }).from(sellers).where(eq(sellers.active, true)).groupBy(sellers.tenantId)
      );

      // Count sales per tenant (this month)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const salesCounts = await withRetry(() =>
        db.select({ tenantId: sales.tenantId, count: count() }).from(sales)
          .where(and(eq(sales.status, "approved"), sql`${sales.createdAt} >= FROM_UNIXTIME(${monthStart / 1000})`))
          .groupBy(sales.tenantId)
      );

      // Count leads per tenant
      const leadCounts = await withRetry(() =>
        db.select({ tenantId: crmLeads.tenantId, count: count() }).from(crmLeads).groupBy(crmLeads.tenantId)
      );

      const sellerMap = new Map((sellerCounts as any[]).map((r: any) => [r.tenantId, Number(r.count)]));
      const salesMap = new Map((salesCounts as any[]).map((r: any) => [r.tenantId, Number(r.count)]));
      const leadMap = new Map((leadCounts as any[]).map((r: any) => [r.tenantId, Number(r.count)]));

      const tenantsWithStats = (allTenants as any[]).map((t: any) => ({
        ...t,
        sellerCount: sellerMap.get(t.id) || 0,
        salesThisMonth: salesMap.get(t.id) || 0,
        leadCount: leadMap.get(t.id) || 0,
      }));

      return {
        totalTenants: (allTenants as any[]).length,
        activeTenants: (allTenants as any[]).filter((t: any) => t.tenant_status === "active").length,
        trialTenants: (allTenants as any[]).filter((t: any) => t.tenant_status === "trial").length,
        totalSellers: Array.from(sellerMap.values()).reduce((a, b) => a + b, 0),
        totalSalesThisMonth: Array.from(salesMap.values()).reduce((a, b) => a + b, 0),
        totalLeads: Array.from(leadMap.values()).reduce((a, b) => a + b, 0),
        tenants: tenantsWithStats,
      };
    }),

  // ========== TENANT CRUD ==========
  createTenant: publicProcedure
    .input(z.object({
      token: z.string(),
      name: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
      phone: z.string().optional(),
      email: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      address: z.string().optional(),
      plan: z.enum(["trial", "basic", "pro", "enterprise"]).default("trial"),
      maxSellers: z.number().default(10),
      maxAdmins: z.number().default(2),
      // Admin credentials for the new tenant
      adminUsername: z.string().min(3),
      adminPassword: z.string().min(4),
      adminName: z.string().min(2),
    }))
    .mutation(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check slug uniqueness
      const existing = await withRetry(() =>
        db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, input.slug)).limit(1)
      );
      if ((existing as any[]).length > 0) throw new Error("Slug já existe. Escolha outro.");

      // Create tenant
      const allModules = JSON.stringify(["ranking", "crm", "financeiro", "pos_venda", "consignacao", "mesa_credito", "marketing", "estoque", "iam", "treinamentos", "competicoes", "mata_mata"]);
      const trialEnds = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days trial

      const [result] = await withRetry(() =>
        db.insert(tenants).values({
          name: input.name,
          slug: input.slug,
          phone: input.phone || "",
          email: input.email || "",
          city: input.city || "",
          state: input.state || "",
          address: input.address || "",
          plan: input.plan,
          maxSellers: input.maxSellers,
          maxAdmins: input.maxAdmins,
          enabledModules: allModules,
          status: input.plan === "trial" ? "trial" : "active",
          trialEndsAt: input.plan === "trial" ? trialEnds : null,
        })
      );

      const tenantId = (result as any).insertId;

      // Create admin for the new tenant
      const hash = await bcrypt.hash(input.adminPassword, 10);
      await withRetry(() =>
        db.insert(admins).values({
          username: input.adminUsername,
          passwordHash: hash,
          name: input.adminName,
          role: "owner",
          active: true,
          tenantId,
        })
      );

      // Create default pipeline stages for the new tenant
      const defaultStages = [
        { department: "vendas", name: "Novo", displayOrder: 1, color: "#3B82F6", isDefault: true, isFinal: false },
        { department: "vendas", name: "Contato", displayOrder: 2, color: "#F59E0B", isDefault: false, isFinal: false },
        { department: "vendas", name: "Agendado", displayOrder: 3, color: "#8B5CF6", isDefault: false, isFinal: false },
        { department: "vendas", name: "Negociação", displayOrder: 4, color: "#EC4899", isDefault: false, isFinal: false },
        { department: "vendas", name: "Fechado", displayOrder: 5, color: "#10B981", isDefault: false, isFinal: true },
      ];

      for (const stage of defaultStages) {
        await withRetry(() =>
          db.insert(crmPipelineStages).values({ ...stage, tenantId } as any)
        ).catch(() => {});
      }

      // Create default financial categories
      const defaultCategories = [
        { name: "Aluguel", type: "expense" as const, color: "#EF4444" },
        { name: "Energia", type: "expense" as const, color: "#F59E0B" },
        { name: "Água", type: "expense" as const, color: "#3B82F6" },
        { name: "Internet", type: "expense" as const, color: "#8B5CF6" },
        { name: "Salários", type: "expense" as const, color: "#EC4899" },
        { name: "Comissões", type: "expense" as const, color: "#10B981" },
        { name: "Venda de Veículo", type: "income" as const, color: "#22C55E" },
        { name: "Financiamento", type: "income" as const, color: "#06B6D4" },
      ];

      for (const cat of defaultCategories) {
        await withRetry(() =>
          db.insert(finCategories).values({ ...cat, tenantId } as any)
        ).catch(() => {});
      }

      return { tenantId, slug: input.slug, message: `Loja "${input.name}" criada com sucesso!` };
    }),

  updateTenant: publicProcedure
    .input(z.object({
      token: z.string(),
      tenantId: z.number(),
      name: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      address: z.string().optional(),
      plan: z.enum(["trial", "basic", "pro", "enterprise"]).optional(),
      maxSellers: z.number().optional(),
      maxAdmins: z.number().optional(),
      status: z.enum(["active", "suspended", "cancelled", "trial"]).optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      enabledModules: z.string().optional(),
      zapiInstanceId: z.string().optional(),
      zapiToken: z.string().optional(),
      zapiClientToken: z.string().optional(),
      inventoryUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { token, tenantId, ...updates } = input;
      const cleanUpdates: Record<string, any> = {};
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) cleanUpdates[k] = v;
      }

      if (Object.keys(cleanUpdates).length > 0) {
        await withRetry(() =>
          db.update(tenants).set(cleanUpdates).where(eq(tenants.id, tenantId))
        );
      }

      return { success: true };
    }),

  deleteTenant: publicProcedure
    .input(z.object({ token: z.string(), tenantId: z.number() }))
    .mutation(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload || payload.role !== "owner") throw new Error("Apenas o dono pode excluir lojas");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Soft delete - just mark as cancelled
      await withRetry(() =>
        db.update(tenants).set({ status: "cancelled" }).where(eq(tenants.id, input.tenantId))
      );

      return { success: true };
    }),

  getTenant: publicProcedure
    .input(z.object({ token: z.string(), tenantId: z.number() }))
    .query(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [rows] = await withRetry(() =>
        db.select().from(tenants).where(eq(tenants.id, input.tenantId)).limit(1)
      );
      const tenant = (rows as any)?.[0] || rows;
      if (!tenant?.id) throw new Error("Loja não encontrada");

      // Get admin count
      const adminCount = await withRetry(() =>
        db.select({ count: count() }).from(admins).where(and(eq(admins.tenantId, input.tenantId), eq(admins.active, true)))
      );

      // Get seller count
      const sellerCount = await withRetry(() =>
        db.select({ count: count() }).from(sellers).where(and(eq(sellers.tenantId, input.tenantId), eq(sellers.active, true)))
      );

      return {
        ...tenant,
        adminCount: Number((adminCount as any)?.[0]?.count || 0),
        sellerCount: Number((sellerCount as any)?.[0]?.count || 0),
      };
    }),

  // ========== TENANT ADMINS ==========
  listTenantAdmins: publicProcedure
    .input(z.object({ token: z.string(), tenantId: z.number() }))
    .query(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rows = await withRetry(() =>
        db.select({
          id: admins.id,
          username: admins.username,
          name: admins.name,
          role: admins.role,
          active: admins.active,
          createdAt: admins.createdAt,
        }).from(admins).where(eq(admins.tenantId, input.tenantId))
      );

      return rows;
    }),

  resetTenantAdminPassword: publicProcedure
    .input(z.object({ token: z.string(), adminId: z.number(), newPassword: z.string().min(4) }))
    .mutation(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const hash = await bcrypt.hash(input.newPassword, 10);
      await withRetry(() =>
        db.update(admins).set({ passwordHash: hash }).where(eq(admins.id, input.adminId))
      );

      return { success: true };
    }),

  // ========== LOOKUP TENANT BY SLUG ==========
  getTenantBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [rows] = await withRetry(() =>
        db.select({
          id: tenants.id,
          name: tenants.name,
          slug: tenants.slug,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          secondaryColor: tenants.secondaryColor,
          status: tenants.status,
        }).from(tenants).where(eq(tenants.slug, input.slug)).limit(1)
      );

      const tenant = (rows as any)?.[0] || rows;
      if (!tenant?.id || tenant.status === "cancelled") return null;

      return tenant;
    }),

  // ========== LIST ALL TENANTS (for login selector) ==========
  listActiveTenants: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const rows = await withRetry(() =>
      db.select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        logoUrl: tenants.logoUrl,
        primaryColor: tenants.primaryColor,
        city: tenants.city,
        state: tenants.state,
        status: tenants.status,
      }).from(tenants)
        .where(sql`${tenants.status} IN ('active', 'trial')`)
        .orderBy(tenants.name)
    );

    return rows;
  }),
});
