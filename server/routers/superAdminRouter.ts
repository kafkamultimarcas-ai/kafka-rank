import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb, withRetry } from "../db";
import { tenants, superAdmins, sellers, admins, sales, crmLeads, competitions, crmPipelineStages, finCategories, crmMessages, crmIntegrations } from "../../drizzle/schema";
import * as zapi from "../zapi-service";
import { eq, sql, desc, and, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getPublicTenantBySlug, clearTenantLimitsCache } from "../tenantService";
import { encryptSecret } from "../_core/secretCrypto";
import { clearCredentialsCache as clearZapiCredentialsCache } from "../zapi-service";
import { provisionTenant, checkSlugAndUsernameAvailability } from "../tenantProvisioning";
import { signSuperToken, verifySuperToken } from "../superAdminAuth";

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

      const tenantsWithStats = (allTenants as any[]).map((t: any) => {
        const { zapiToken, zapiClientToken, ...tSafe } = t;
        return {
          ...tSafe,
          zapiConfigured: !!zapiToken,
          sellerCount: sellerMap.get(t.id) || 0,
          salesThisMonth: salesMap.get(t.id) || 0,
          leadCount: leadMap.get(t.id) || 0,
        };
      });

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

      const { tenantId } = await provisionTenant({
        name: input.name,
        slug: input.slug,
        phone: input.phone,
        email: input.email,
        city: input.city,
        state: input.state,
        address: input.address,
        plan: input.plan,
        maxSellers: input.maxSellers,
        maxAdmins: input.maxAdmins,
        adminUsername: input.adminUsername,
        adminPassword: input.adminPassword,
        adminName: input.adminName,
      });

      return { tenantId, slug: input.slug, message: `Loja "${input.name}" criada com sucesso!` };
    }),

  checkAvailability: publicProcedure
    .input(z.object({
      token: z.string(),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
      adminUsername: z.string().min(3).optional(),
      tenantId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");

      return checkSlugAndUsernameAvailability({
        slug: input.slug,
        adminUsername: input.adminUsername,
        tenantId: input.tenantId,
      });
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

      // Credenciais Z-API são criptografadas em repouso (nunca gravar em texto plano)
      if (cleanUpdates.zapiToken) cleanUpdates.zapiToken = encryptSecret(cleanUpdates.zapiToken);
      if (cleanUpdates.zapiClientToken) cleanUpdates.zapiClientToken = encryptSecret(cleanUpdates.zapiClientToken);

      if (Object.keys(cleanUpdates).length > 0) {
        await withRetry(() =>
          db.update(tenants).set(cleanUpdates).where(eq(tenants.id, tenantId))
        );
      }

      // Invalida caches para que a mudança tenha efeito imediato (não esperar TTL)
      clearTenantLimitsCache(tenantId);
      clearZapiCredentialsCache(tenantId);

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

      const { zapiToken, zapiClientToken, ...tenantSafe } = tenant;
      return {
        ...tenantSafe,
        zapiConfigured: !!zapiToken,
        adminCount: Number((adminCount as any)?.[0]?.count || 0),
        sellerCount: Number((sellerCount as any)?.[0]?.count || 0),
      };
    }),

  // ========== TENANT HEALTH (status operacional) ==========
  getTenantHealth: publicProcedure
    .input(z.object({ token: z.string(), tenantId: z.number() }))
    .query(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [tenant] = await withRetry(() =>
        db.select({
          maxSellers: tenants.maxSellers,
          maxAdmins: tenants.maxAdmins,
          zapiInstanceId: tenants.zapiInstanceId,
        }).from(tenants).where(eq(tenants.id, input.tenantId)).limit(1)
      );
      if (!tenant) throw new Error("Loja não encontrada");

      const [sellerCountRow] = await withRetry(() =>
        db.select({ count: count() }).from(sellers).where(and(eq(sellers.tenantId, input.tenantId), eq(sellers.active, true)))
      );
      const [adminCountRow] = await withRetry(() =>
        db.select({ count: count() }).from(admins).where(and(eq(admins.tenantId, input.tenantId), eq(admins.active, true)))
      );
      const [activeIntegrationsRow] = await withRetry(() =>
        db.select({ count: count() }).from(crmIntegrations).where(and(eq(crmIntegrations.tenantId, input.tenantId), eq(crmIntegrations.active, true)))
      );
      const [lastMessage] = await withRetry(() =>
        db.select({ timestamp: crmMessages.timestamp, direction: crmMessages.direction })
          .from(crmMessages)
          .innerJoin(crmLeads, eq(crmMessages.leadId, crmLeads.id))
          .where(eq(crmLeads.tenantId, input.tenantId))
          .orderBy(desc(crmMessages.timestamp))
          .limit(1)
      );

      const zapiStatus = tenant.zapiInstanceId
        ? await zapi.getStatus(input.tenantId)
        : { connected: false, smartphoneConnected: false, error: "Z-API não configurado para esta loja" };

      return {
        sellers: { active: Number(sellerCountRow?.count || 0), max: tenant.maxSellers },
        admins: { active: Number(adminCountRow?.count || 0), max: tenant.maxAdmins },
        activeIntegrations: Number(activeIntegrationsRow?.count || 0),
        whatsapp: {
          configured: !!tenant.zapiInstanceId,
          connected: zapiStatus.connected,
          smartphoneConnected: zapiStatus.smartphoneConnected,
          error: zapiStatus.error || null,
          lastMessageAt: lastMessage?.timestamp ? Number(lastMessage.timestamp) : null,
        },
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
      return getPublicTenantBySlug(input.slug.trim().toLowerCase());
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


