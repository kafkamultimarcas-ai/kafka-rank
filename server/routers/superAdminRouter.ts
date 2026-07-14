import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb, withRetry } from "../db";
import { tenants, superAdmins, sellers, admins, sales, crmLeads, competitions, crmPipelineStages, finCategories, crmMessages, crmIntegrations, inventoryVehicles, finTransactions, integrationSyncLogs, subscriptionEvents } from "../../drizzle/schema";
import * as zapi from "../zapi-service";
import { eq, sql, desc, and, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getPublicTenantBySlug, clearTenantLimitsCache } from "../tenantService";
import { encryptSecret } from "../_core/secretCrypto";
import { clearCredentialsCache as clearZapiCredentialsCache } from "../zapi-service";
import { provisionTenant, checkSignupAvailability } from "../tenantProvisioning";
import { signSuperToken, verifySuperToken } from "../superAdminAuth";
import { TRIAL_PLAN_LIMITS } from "../../shared/plans";

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
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      address: z.string().optional(),
      plan: z.enum(["trial", "basic", "pro", "enterprise"]).default("trial"),
      maxSellers: z.number().default(TRIAL_PLAN_LIMITS.maxSellers),
      maxAdmins: z.number().default(TRIAL_PLAN_LIMITS.maxAdmins),
      adminEmail: z.string().email("E-mail do administrador inválido"),
      adminPassword: z.string().min(4),
      adminName: z.string().min(2),
    }))
    .mutation(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");

      const { tenantId, slug } = await provisionTenant({
        name: input.name,
        slug: input.slug || input.name,
        phone: input.phone,
        email: input.email,
        city: input.city,
        state: input.state,
        address: input.address,
        plan: input.plan,
        maxSellers: input.maxSellers,
        maxAdmins: input.maxAdmins,
        adminEmail: input.adminEmail,
        adminPassword: input.adminPassword,
        adminName: input.adminName,
      });

      return { tenantId, slug, message: `Loja "${input.name}" criada com sucesso!` };
    }),

  checkAvailability: publicProcedure
    .input(z.object({
      token: z.string(),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
      adminEmail: z.string().min(3).optional(),
      tenantId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");

      return checkSignupAvailability({
        slug: input.slug,
        adminEmail: input.adminEmail,
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
  // Alertas de cobrança (webhook/API ASAAS) foram unificados na tela de Logs
  // do Super Admin — ver server/routers/platformLogsRouter.ts (listagem já
  // centralizada com e-mail/assinatura, mesma tela em client/src/pages/SuperAdmin.tsx).

  /** Dashboard completo do Super Admin com métricas agregadas */
  dashboardStats: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = verifySuperToken(input.token);
      if (!payload) throw new Error("Não autorizado");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allTenants = await withRetry(() => db.select().from(tenants).orderBy(desc(tenants.createdAt)));

      // Contagens gerais
      const [[{ value: totalSellers }]] = await Promise.all([
        db.select({ value: count() }).from(sellers).where(eq(sellers.active, true)),
      ]);
      const [[{ value: totalVehicles }]] = await Promise.all([
        db.select({ value: count() }).from(inventoryVehicles),
      ]);
      const [[{ value: totalLeads }]] = await Promise.all([
        db.select({ value: count() }).from(crmLeads),
      ]);
      const [[{ value: totalMessages }]] = await Promise.all([
        db.select({ value: count() }).from(crmMessages),
      ]);
      const [[{ value: activeCompetitions }]] = await Promise.all([
        db.select({ value: count() }).from(competitions).where(eq(competitions.status, "active")),
      ]);

      // Financeiro interno das lojas
      const [finStats] = await db.execute(sql`
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as faturamento_total,
          COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END), 0) as faturamento_aberto,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pagamentos_pendentes,
          COALESCE(SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END), 0) as pagamentos_atrasados,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) as pagamentos_pagos
        FROM fin_transactions
      `);
      const finRow = ((finStats as unknown) as any[])[0] || {};

      // Vendas por mês (últimos 6 meses)
      const [salesByMonth] = await db.execute(sql`
        SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as total, tenantId
        FROM sales WHERE status = 'approved' AND createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY month, tenantId ORDER BY month ASC
      `);

      // Faturamento por mês (últimos 6 meses)
      const [finByMonth] = await db.execute(sql`
        SELECT DATE_FORMAT(FROM_UNIXTIME(dueDate/1000), '%Y-%m') as month,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as pago,
          COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END), 0) as aberto,
          tenantId
        FROM fin_transactions WHERE dueDate >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 6 MONTH)) * 1000
        GROUP BY month, tenantId ORDER BY month ASC
      `);

      // Dados por loja
      const [vehiclesByTenant] = await db.execute(sql`SELECT tenantId, COUNT(*) as total FROM inventory_vehicles GROUP BY tenantId`);
      const [leadsByTenant] = await db.execute(sql`SELECT tenantId, COUNT(*) as total FROM crm_leads GROUP BY tenantId`);
      const [sellersByTenant] = await db.execute(sql`SELECT tenantId, COUNT(*) as total FROM sellers WHERE active = 1 GROUP BY tenantId`);
      const [integrationsByTenant] = await db.execute(sql`SELECT tenantId, COUNT(*) as total FROM crm_integrations WHERE active = 1 GROUP BY tenantId`);

      // Pagamentos da plataforma (subscription_events)
      const [platformPayments] = await db.execute(sql`
        SELECT COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status = 'CONFIRMED' OR status = 'RECEIVED' THEN 1 ELSE 0 END), 0) as confirmados,
          COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) as pendentes,
          COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END), 0) as atrasados,
          COALESCE(SUM(CASE WHEN (status = 'CONFIRMED' OR status = 'RECEIVED') THEN value ELSE 0 END), 0) as valor_recebido,
          COALESCE(SUM(CASE WHEN status = 'PENDING' OR status = 'OVERDUE' THEN value ELSE 0 END), 0) as valor_pendente
        FROM subscription_events
      `);
      const platRow = ((platformPayments as unknown) as any[])[0] || {};

      // Mensagens por loja
      const [messagesByTenant] = await db.execute(sql`SELECT tenantId, COUNT(*) as total FROM crm_messages GROUP BY tenantId`);
      // Mensagens por mês (últimos 6 meses)
      const [messagesByMonth] = await db.execute(sql`
        SELECT DATE_FORMAT(FROM_UNIXTIME(createdAt/1000), '%Y-%m') as month, COUNT(*) as total
        FROM crm_messages WHERE createdAt >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 6 MONTH)) * 1000
        GROUP BY month ORDER BY month ASC
      `);
      // Competições ativas por loja
      const [competitionsByTenant] = await db.execute(sql`SELECT tenantId, COUNT(*) as total FROM competitions WHERE status = 'active' GROUP BY tenantId`);

      // Distribuições
      const planDistribution = (allTenants as any[]).reduce((acc: any, t: any) => {
        acc[t.plan] = (acc[t.plan] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const statusDistribution = (allTenants as any[]).reduce((acc: any, t: any) => {
        acc[t.tenant_status] = (acc[t.tenant_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Detalhes por loja
      const tenantDetails = (allTenants as any[]).map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        status: t.tenant_status,
        monthlyPrice: t.monthlyPrice || 0,
        vehicles: (((vehiclesByTenant as unknown) as any[]).find((v: any) => v.tenantId === t.id)?.total) || 0,
        leads: (((leadsByTenant as unknown) as any[]).find((l: any) => l.tenantId === t.id)?.total) || 0,
        sellers: (((sellersByTenant as unknown) as any[]).find((s: any) => s.tenantId === t.id)?.total) || 0,
        integrations: (((integrationsByTenant as unknown) as any[]).find((i: any) => i.tenantId === t.id)?.total) || 0,
      }));

      return {
        totalTenants: (allTenants as any[]).length,
        activeTenants: (allTenants as any[]).filter((t: any) => t.tenant_status === "active" || t.tenant_status === "trial").length,
        totalSellers,
        totalVehicles,
        totalLeads,
        totalMessages,
        activeCompetitions,
        faturamentoTotal: Number(finRow.faturamento_total) || 0,
        faturamentoAberto: Number(finRow.faturamento_aberto) || 0,
        pagamentosPendentes: Number(finRow.pagamentos_pendentes) || 0,
        pagamentosAtrasados: Number(finRow.pagamentos_atrasados) || 0,
        pagamentosPagos: Number(finRow.pagamentos_pagos) || 0,
        totalTransactions: Number(finRow.total_transactions) || 0,
        platformPaymentsTotal: Number(platRow.total) || 0,
        platformPaymentsConfirmados: Number(platRow.confirmados) || 0,
        platformPaymentsPendentes: Number(platRow.pendentes) || 0,
        platformPaymentsAtrasados: Number(platRow.atrasados) || 0,
        platformValorRecebido: Number(platRow.valor_recebido) || 0,
        platformValorPendente: Number(platRow.valor_pendente) || 0,
        planDistribution,
        statusDistribution,
        salesByMonth: (salesByMonth as unknown) as any[],
        finByMonth: (finByMonth as unknown) as any[],
        tenantDetails,
        messagesByTenant: (messagesByTenant as unknown) as any[],
        competitionsByTenant: (competitionsByTenant as unknown) as any[],
        messagesByMonth: (messagesByMonth as unknown) as any[],
      };
    }),
});


