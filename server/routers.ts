import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, managerOrAdminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";

// ===== SECURITY: Constantes de validação =====
const MAX_BASE64_SIZE = 10 * 1024 * 1024; // 10MB em base64 (~7.5MB arquivo real)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const base64Schema = z.string().max(MAX_BASE64_SIZE, 'Arquivo muito grande. Máximo 7.5MB.');
const filenameSchema = z.string().max(255).regex(/^[a-zA-Z0-9._\-\s\u00C0-\u024F]+$/, 'Nome de arquivo inválido');
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { getTenantLimits, getTenantById } from "./tenantService";
import { sendUserWelcomeEmail } from "./emailService";
import { getRequestOrigin } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { adminAuthRouter, crmLeadsRouter, crmPipelineRouter, crmInventoryRouter, crmIntegrationsRouter, crmCampaignsRouter, crmMarketingRouter, crmVoiceRouter, crmChatRouter, crmPerformanceRouter, crmAiRouter, aiMetricsRouter } from "./routers/crmRouter";
import { crmTemplatesRouter, crmFollowUpRouter, crmDistributionRouter, crmTimeAlertsRouter, crmPermissionsRouter, crmFipeRouter, crmSellerStatsRouter } from "./routers/crmEnhanced";
import { finCategoriesRouter, finTransactionsRouter, fuelRouter } from "./routers/finRouter";
import { getFinancialAlerts } from "./finDb";
import { pvChamadosRouter, pvGastosRouter, pvOficinasRouter, pvOrcamentosRouter } from "./routers/pvRouter";
import { mktStrategiesRouter, mktTasksRouter } from "./routers/mktRouter";
import { fichaRouter } from "./routers/fichaRouter";
import { inventoryRouter } from "./routers/inventoryRouter";
import { whatsappRouter } from "./routers/whatsappRouter";
import { managerMentorRouter } from "./routers/managerMentorRouter";
import { superAdminRouter } from "./routers/superAdminRouter";
import { tenantPublicRouter } from "./routers/tenantPublicRouter";
import { tenantAuthRouter } from "./routers/tenantAuthRouter";
import { passwordResetRouter } from "./routers/passwordResetRouter";
import { publicSignupRouter } from "./routers/publicSignupRouter";
import { billingRouter } from "./routers/billingRouter";
import { subscriptionLogsRouter } from "./routers/subscriptionLogsRouter";
import { platformLogsRouter } from "./routers/platformLogsRouter";
import { vehicleCostRouter } from "./routers/vehicleCostRouter";
import { supplierRouter } from "./routers/supplierRouter";
import * as zapi from "./zapi-service";
import { sendPushNewSale, sendPushSaleApproved, sendPushOvertake, sendPushPendingSale, sendPushPendingRecord, sendPushAppointmentExpiring, sendPushRescueAlert, sendPushInactivityAlert, sendPushAttendanceApproved, sendPushToSeller, sendPushDocsPendentes, sendPushDocTransferido } from "./pushService";
import { buildCurrentTenantPath, buildSellerTenantPath } from "./tenantUrls";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";
import { getPrivacySellerId } from "./authHelpers";

function extractAssistantTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("\n")
      .trim();

    if (text) return text;
  }

  throw new Error("Resposta da IA veio sem conteúdo textual.");
}

function extractStructuredLlmPayload<T extends Record<string, unknown>>(response: Awaited<ReturnType<typeof invokeLLM>>): T {
  const firstChoice = response.choices?.[0];
  if (!firstChoice?.message) {
    throw new Error("Resposta da IA veio sem choices válidas.");
  }

  const rawText = extractAssistantTextContent(firstChoice.message.content);

  try {
    return JSON.parse(rawText) as T;
  } catch {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    throw new Error(`Resposta da IA não veio em JSON válido: ${rawText.slice(0, 240)}`);
  }
}

export const appRouter = router({
  system: systemRouter,
  fichas: fichaRouter,
  tenantPublic: tenantPublicRouter,
  tenantAuth: tenantAuthRouter,
  passwordReset: passwordResetRouter,
  publicSignup: publicSignupRouter,
  billing: billingRouter,
  subscriptionLogs: subscriptionLogsRouter,
  platformLogs: platformLogsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== SELLERS =====
  sellers: router({
    list: publicProcedure.input(z.object({ activeOnly: z.boolean().optional() }).optional()).query(async ({ input }) => {
      return db.listSellers(input?.activeOnly ?? false);
    }),
    // Listagem paginada server-side (admin) — filtros ativos/depto + contadores
    listPaged: adminProcedure.input(z.object({
      active: z.enum(["ativos", "inativos"]).default("ativos"),
      dept: z.string().default("todos"),
      role: z.enum(["todos", "gerente", "vendedor"]).default("todos"),
      search: z.string().default(""),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(100).default(20),
    })).query(async ({ input }) => {
      const all = await db.listSellers(false);
      const statusCounts = {
        ativos: all.filter((s: any) => s.active).length,
        inativos: all.filter((s: any) => !s.active).length,
      };
      const scoped = all.filter((s: any) => (input.active === "ativos" ? s.active : !s.active));
      // Role counts (based on status-scoped list)
      const roleCounts: Record<string, number> = {
        todos: scoped.length,
        gerente: scoped.filter((s: any) => s.sellerRole === 'gerente').length,
        vendedor: scoped.filter((s: any) => s.sellerRole !== 'gerente').length,
      };
      // Apply role filter
      const roleFiltered = input.role === "todos" ? scoped
        : input.role === "gerente" ? scoped.filter((s: any) => s.sellerRole === 'gerente')
        : scoped.filter((s: any) => s.sellerRole !== 'gerente');
      const deptCounts: Record<string, number> = { todos: roleFiltered.length };
      for (const s of roleFiltered) {
        const dept = (s as any).department || "vendas";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      }
      let filtered = input.dept === "todos" ? roleFiltered : roleFiltered.filter((s: any) => ((s as any).department || "vendas") === input.dept);
      // Apply search filter
      if (input.search.trim()) {
        const q = input.search.trim().toLowerCase();
        filtered = filtered.filter((s: any) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.nickname && s.nickname.toLowerCase().includes(q))
        );
      }
      filtered = [...filtered].sort((a: any, b: any) => (b.id ?? 0) - (a.id ?? 0));
      return { items: filtered.slice(input.offset, input.offset + input.limit), total: filtered.length, deptCounts, statusCounts, roleCounts };
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getSellerById(input.id);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      nickname: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email("E-mail do vendedor inválido"),
      department: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const inviteToken = nanoid(24);
      const id = await db.createSeller({ ...input, inviteToken });

      let loginUrl: string | null = null;
      const tenant = await getTenantById(ctx.tenantId);
      if (tenant) {
        // Link precisa do slug do tenant para o login por email resolver a loja correta.
        loginUrl = `${getRequestOrigin(ctx.req)}/t/${tenant.slug}/login?invite=${inviteToken}`;
        await sendUserWelcomeEmail(input.email, tenant.name, "vendedor", loginUrl, ctx.tenantId);
      }

      return { id, inviteToken, loginUrl };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nickname: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      department: z.string().optional(),
      active: z.boolean().optional(),
      sellerRole: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateSeller(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteSeller(input.id);
      return { success: true };
    }),
    uploadPhoto: adminProcedure.input(z.object({
      id: z.number(),
      base64: base64Schema,
      mimeType: z.string(),
    })).mutation(async ({ input }) => {
      const ext = input.mimeType.split("/")[1] || "jpg";
      const fileKey = `sellers/${input.id}-${nanoid(8)}.${ext}`;
      const buffer = Buffer.from(input.base64, "base64");
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      await db.updateSeller(input.id, { photoUrl: url, photoKey: fileKey });
      return { url };
    }),

    // === BLOQUEAR/BANIR VENDEDOR DE RECEBER LEADS ===
    toggleLeadBlock: adminProcedure.input(z.object({
      sellerId: z.number(),
      blocked: z.boolean(),
    })).mutation(async ({ input }) => {
      await db.updateSeller(input.sellerId, { leadReceiveBlocked: input.blocked });
      return { success: true };
    }),
    banFromLeads: adminProcedure.input(z.object({
      sellerId: z.number(),
      days: z.number().min(1).max(365),
      reason: z.string().optional(),
    })).mutation(async ({ input }) => {
      const banUntil = Date.now() + (input.days * 24 * 60 * 60 * 1000);
      await db.updateSeller(input.sellerId, {
        leadBanUntil: banUntil,
        leadBanReason: input.reason || `Ban de ${input.days} dia(s) por não responder leads`,
      });
      return { success: true, banUntil };
    }),
    removeBan: adminProcedure.input(z.object({
      sellerId: z.number(),
    })).mutation(async ({ input }) => {
      await db.updateSeller(input.sellerId, {
        leadBanUntil: null as any,
        leadBanReason: null as any,
      });
      return { success: true };
    }),

    // === LOGIN DE VENDEDOR POR SENHA ===
    login: publicProcedure.input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      // SECURITY: Only match by exact username (no name/nickname fallback)
      const seller = await db.getSellerByUsername(input.username);
      if (!seller || !seller.active || !seller.passwordHash) {
        throw new Error("Usu\u00e1rio ou senha inv\u00e1lidos");
      }
      const valid = await bcrypt.compare(input.password, seller.passwordHash);
      if (!valid) {
        throw new Error("Usu\u00e1rio ou senha inv\u00e1lidos");
      }
      // SECURITY: Verify seller.username matches input exactly (prevent any collation tricks)
      if (!seller.username || seller.username.toLowerCase() !== input.username.toLowerCase()) {
        console.warn(`[SECURITY] Login attempt with username '${input.username}' matched seller #${seller.id} with username '${seller.username}' - BLOCKED`);
        throw new Error("Usu\u00e1rio ou senha inv\u00e1lidos");
      }
      // Atualizar lastAccess
      await db.updateSellerLastAccess(seller.id);
      // SECURITY: Clear any existing seller_session cookie before setting new one
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("seller_session", { ...cookieOptions, maxAge: -1 });
      // Gerar JWT e setar cookie com sellerId + username para dupla verificação
      const token = jwt.sign(
        { sellerId: seller.id, username: seller.username, tenantId: (seller as any).tenantId, tenantSlug: ctx.tenantSlug },
        ENV.cookieSecret,
        { expiresIn: "30d" }
      );
      ctx.res.cookie("seller_session", token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      console.log(`[AUTH] Seller #${seller.id} (${seller.username}) logged in successfully`);
      // Generate bill notifications for financeiro users on login
      if (seller.department === 'financeiro') {
        generateBillNotifications(seller.id).catch(err => console.error('[NOTIF] Error generating bill notifications:', err));
      }
      return { success: true, sellerId: seller.id, name: seller.name, nickname: seller.nickname, sellerRole: seller.sellerRole || 'vendedor', department: seller.department || 'vendas' };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("seller_session", { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    // Verificar se est\u00e1 logado como vendedor
    me: publicProcedure.query(async ({ ctx }) => {
      // SECURITY: Always use the seller_session JWT cookie as the single source of truth
      // This prevents any mismatch between ctx.user and the actual seller session
      try {
        const { parse: parseCookie } = await import("cookie");
        const cookies = parseCookie(ctx.req.headers.cookie || "");
        const sellerToken = cookies.seller_session;
        if (sellerToken) {
          const payload = jwt.verify(sellerToken, ENV.cookieSecret) as { sellerId: number; username: string };
          const seller = await db.getSellerById(payload.sellerId);
          if (seller && seller.active) {
            // SECURITY: Verify that the seller's username still matches the JWT
            // This prevents stale tokens from accessing wrong profiles
            if (
              seller.username &&
              payload.username &&
              seller.username.toLowerCase() !== payload.username.toLowerCase()
            ) {
              console.warn(`[SECURITY] JWT username mismatch for seller #${payload.sellerId}: JWT=${payload.username}, DB=${seller.username}. Clearing session.`);
              const cookieOptions = getSessionCookieOptions(ctx.req);
              ctx.res.clearCookie("seller_session", { ...cookieOptions, maxAge: -1 });
              return null;
            }
            await db.updateSellerLastAccess(seller.id);
            const limits = await getTenantLimits(ctx.tenantId);
            return {
              id: seller.id, name: seller.name, nickname: seller.nickname, photoUrl: seller.photoUrl,
              department: seller.department, sellerRole: seller.sellerRole || 'vendedor',
              trialEndsAt: limits?.trialEndsAt ?? null, trialExpired: limits?.trialExpired ?? false,
              subscriptionSuspended: limits?.status === "suspended",
            };
          }
        }
      } catch (e) {
        // Token inválido ou expirado - limpar cookie
        try {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.clearCookie("seller_session", { ...cookieOptions, maxAge: -1 });
        } catch { /* ignore */ }
      }
      return null;
    }),

    // Primeiro acesso: vendedor cria seu próprio login
    firstAccess: publicProcedure.input(z.object({
      sellerId: z.number(),
      inviteToken: z.string().min(1, 'Código de convite obrigatório'),
      username: z.string().min(3),
      password: z.string().min(4),
      department: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const seller = await db.getSellerByIdInternal(input.sellerId);
      if (!seller || !seller.active) throw new Error('Vendedor não encontrado ou inativo');
      if (seller.username && seller.passwordHash) throw new Error('Este vendedor já possui login. Use a tela de login.');
      // SECURITY: exige o código de convite gerado pelo admin ao cadastrar o vendedor —
      // sem isso, qualquer pessoa que soubesse o sellerId (lista pública) poderia
      // criar login pra outra pessoa. Ver server/routers.ts sellers.create.
      if (!seller.inviteToken || seller.inviteToken !== input.inviteToken) {
        throw new Error('Código de convite inválido. Peça o link correto pro seu gerente/admin.');
      }
      // Verificar username único
      const existing = await db.getSellerByUsername(input.username);
      if (existing) throw new Error('Este nome de usuário já está em uso');
      const passwordHash = await bcrypt.hash(input.password, 10);
      const updateData: any = { username: input.username, passwordHash, inviteToken: null };
      if (input.department) updateData.department = input.department;
      await db.updateSeller(input.sellerId, updateData);
      await db.updateSellerLastAccess(input.sellerId);
      // SECURITY: Clear any existing seller_session before setting new one
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie('seller_session', { ...cookieOptions, maxAge: -1 });
      // Auto-login
      const token = jwt.sign(
        { sellerId: seller.id, username: input.username, tenantId: ctx.tenantId, tenantSlug: ctx.tenantSlug },
        ENV.cookieSecret,
        { expiresIn: '30d' }
      );
      ctx.res.cookie('seller_session', token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      console.log(`[AUTH] Seller #${seller.id} (${input.username}) first access completed`);
      return { success: true, sellerId: seller.id, name: seller.name, nickname: seller.nickname, sellerRole: seller.sellerRole || 'vendedor', department: seller.department || 'vendas' };
    }),

    // Admin define/reseta login do vendedor. Login agora \u00e9 por EMAIL:
    // salvamos email + passwordHash (e username = email para compatibilidade
    // com o login legado por username e o indicador de "j\u00e1 tem login").
    setPassword: adminProcedure.input(z.object({
      id: z.number(),
      email: z.string().email("E-mail inv\u00e1lido"),
      password: z.string().min(4),
    })).mutation(async ({ input }) => {
      const email = input.email.trim().toLowerCase();
      // E-mail deve ser \u00fanico (login por email resolve o vendedor por esse campo).
      const existing = await db.getSellerByEmail(email);
      if (existing && existing.id !== input.id) {
        throw new Error("Este e-mail j\u00e1 est\u00e1 em uso por outro colaborador");
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      await db.updateSeller(input.id, { email, username: email, passwordHash });
      return { success: true };
    }),

    // Primeiro acesso por EMAIL: dados resolvidos pelo token do convite.
    getInvite: publicProcedure.input(z.object({
      inviteToken: z.string().min(1),
    })).query(async ({ input }) => {
      const seller = await db.getSellerByInviteToken(input.inviteToken);
      if (!seller || !seller.active) return null;
      // Se j\u00e1 tem login definido, o convite n\u00e3o \u00e9 mais v\u00e1lido.
      if (seller.passwordHash) return null;
      return {
        sellerId: seller.id,
        name: seller.name,
        email: seller.email,
        department: seller.department || "vendas",
      };
    }),

    // Vendedor define a pr\u00f3pria senha via link de convite (login por email).
    firstAccessByEmail: publicProcedure.input(z.object({
      inviteToken: z.string().min(1, "C\u00f3digo de convite obrigat\u00f3rio"),
      email: z.string().email("E-mail inv\u00e1lido"),
      password: z.string().min(4),
    })).mutation(async ({ input, ctx }) => {
      const seller = await db.getSellerByInviteToken(input.inviteToken);
      if (!seller || !seller.active) {
        throw new Error("Convite inv\u00e1lido ou expirado. Pe\u00e7a o link novamente pro seu gerente/admin.");
      }
      if (seller.passwordHash) {
        throw new Error("Este colaborador j\u00e1 possui login. Use a tela de login por e-mail.");
      }
      const email = input.email.trim().toLowerCase();
      const existing = await db.getSellerByEmail(email);
      if (existing && existing.id !== seller.id) {
        throw new Error("Este e-mail j\u00e1 est\u00e1 em uso por outro colaborador");
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      await db.updateSeller(seller.id, { email, username: email, passwordHash, inviteToken: null });
      await db.updateSellerLastAccess(seller.id);
      // Auto-login
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("seller_session", { ...cookieOptions, maxAge: -1 });
      const token = jwt.sign(
        { sellerId: seller.id, username: email, tenantId: (seller as any).tenantId ?? ctx.tenantId, tenantSlug: ctx.tenantSlug },
        ENV.cookieSecret,
        { expiresIn: "30d" }
      );
      ctx.res.cookie("seller_session", token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      const department = seller.department || "vendas";
      const sellerRole = seller.sellerRole || "vendedor";
      return {
        success: true,
        sellerId: seller.id,
        name: seller.name,
        nickname: seller.nickname,
        sellerRole,
        department,
      };
    }),
    // === RESET ALL PASSWORDS (ADMIN) ===
    resetAllPasswords: adminProcedure.mutation(async () => {
      const allSellers = await db.listSellers();
      let resetCount = 0;
      for (const seller of allSellers) {
        if (seller.username) {
          await db.updateSeller(seller.id, { username: null as any, passwordHash: null as any });
          resetCount++;
        }
      }
      console.log(`[SECURITY] Admin reset ALL passwords: ${resetCount} sellers affected`);
      return { success: true, resetCount };
    }),

    // === PERMISSÕES DE VENDEDOR ===
    getPermissions: publicProcedure.input(z.object({
      sellerId: z.number(),
    })).query(async ({ input }) => {
      return db.getSellerPermissions(input.sellerId);
    }),
    setPermissions: adminProcedure.input(z.object({
      sellerId: z.number(),
      permissions: z.array(z.object({
        module: z.string(),
        canView: z.boolean(),
        canEdit: z.boolean(),
      })),
    })).mutation(async ({ input }) => {
      await db.setSellerPermissionsBulk(input.sellerId, input.permissions);
      return { success: true };
    }),
    initPermissions: adminProcedure.input(z.object({
      sellerId: z.number(),
      department: z.string(),
    })).mutation(async ({ input }) => {
      await db.initDefaultSellerPermissions(input.sellerId, input.department);
      return { success: true };
    }),
    permissionModules: publicProcedure.query(() => {
      return db.SELLER_PERMISSION_MODULES;
    }),
    // === VENDEDOR TROCA SUA PRÓPRIA FOTO ===
    uploadMyPhoto: publicProcedure.input(z.object({
      base64: base64Schema,
      mimeType: z.string(),
    })).mutation(async ({ input, ctx }) => {
      let sellerId: number | null = null;
      if (ctx.user && ctx.user.actorType === 'seller') {
        sellerId = ctx.user.id;
      }
      if (!sellerId) {
        try {
          const { parse: parseCookie } = await import('cookie');
          const cookies = parseCookie(ctx.req.headers.cookie || '');
          const sellerToken = cookies.seller_session;
          if (sellerToken) {
            const payload = jwt.verify(sellerToken, ENV.cookieSecret) as { sellerId: number };
            sellerId = payload.sellerId;
          }
        } catch (e) {}
      }
      if (!sellerId) throw new Error('Você precisa estar logado como vendedor');
      const seller = await db.getSellerById(sellerId);
      if (!seller || !seller.active) throw new Error('Vendedor não encontrado');
      const ext = input.mimeType.split('/')[1] || 'jpg';
      const fileKey = `sellers/${sellerId}-competition-${nanoid(8)}.${ext}`;
      const buffer = Buffer.from(input.base64, 'base64');
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      // Salvar como foto principal do perfil E da competição
      await db.updateSeller(sellerId, { photoUrl: url, photoKey: fileKey, competitionPhotoUrl: url, competitionPhotoKey: fileKey });
      return { url };
    }),
  }),
  // ===== COMPETITIONS ======
  competitions: router({
    list: publicProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.listCompetitions(input?.status);
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getCompetitionById(input.id);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().default("vendas"),
      type: z.enum(["individual", "team", "group", "1v1"]),
      pointsPerSale: z.number().min(1).default(1),
      goalTarget: z.number().optional(),
      startDate: z.number(),
      endDate: z.number(),
    })).mutation(async ({ input }) => {
      const id = await db.createCompetition({ ...input, status: "draft" });
      return { id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      type: z.enum(["individual", "team", "group", "1v1"]).optional(),
      status: z.enum(["draft", "active", "finished"]).optional(),
      pointsPerSale: z.number().optional(),
      goalTarget: z.number().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCompetition(id, data);
      // Auto-add all eligible sellers when competition is activated
      if (data.status === "active") {
        const comp = await db.getCompetitionById(id);
        if (comp && comp.type === "individual") {
          const existingParticipants = await db.listParticipants(id);
          const existingSellerIds = new Set(existingParticipants.map(p => p.sellerId));
          const allSellers = await db.listSellers(true);
          // Filter sellers by competition category (vendas = vendas+pre_vendas, others = exact match)
          const category = comp.category || "vendas";
          const eligibleSellers = allSellers.filter(s => {
            if (category === "vendas") return s.department === "vendas" || s.department === "pre_vendas";
            return s.department === category;
          });
          // Add sellers not already participating
          for (const seller of eligibleSellers) {
            if (!existingSellerIds.has(seller.id)) {
              await db.addParticipant({ competitionId: id, sellerId: seller.id });
            }
          }
          console.log(`[Competition] Auto-added ${eligibleSellers.filter(s => !existingSellerIds.has(s.id)).length} sellers to competition #${id}`);
        }
      }
      if (data.status === "finished") {
        const comp = await db.getCompetitionById(id);
        if (comp) {
          await notifyOwner({
            title: `Competição "${comp.name}" finalizada!`,
            content: `A competição "${comp.name}" foi encerrada. Confira os resultados no painel.`,
          });
        }
      }
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteCompetition(input.id);
      return { success: true };
    }),
    ranking: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getCompetitionRanking(input.id);
    }),
    teamRanking: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getTeamRanking(input.id);
    }),
  }),

  // ===== TEAMS =====
  teams: router({
    list: publicProcedure.input(z.object({ competitionId: z.number() })).query(async ({ input }) => {
      return db.listTeamsByCompetition(input.competitionId);
    }),
    create: adminProcedure.input(z.object({
      competitionId: z.number(),
      name: z.string().min(1),
      color: z.string().default("#3B82F6"),
    })).mutation(async ({ input }) => {
      const id = await db.createTeam(input);
      return { id };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteTeam(input.id);
      return { success: true };
    }),
  }),

  // ===== PARTICIPANTS =====
  participants: router({
    list: publicProcedure.input(z.object({ competitionId: z.number() })).query(async ({ input }) => {
      return db.listParticipants(input.competitionId);
    }),
    add: adminProcedure.input(z.object({
      competitionId: z.number(),
      sellerId: z.number(),
      teamId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.addParticipant(input);
      return { id };
    }),
    remove: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.removeParticipant(input.id);
      return { success: true };
    }),
  }),

  // ===== BRACKET (MATA-MATA) =====
  bracket: router({
    list: publicProcedure.input(z.object({ competitionId: z.number() })).query(async ({ input }) => {
      // Sincronizar placares com vendas reais antes de retornar
      try {
        await db.syncBracketScores(input.competitionId);
      } catch (e) {
        console.error('[BracketSync] Erro ao sincronizar:', e);
      }
      const matches = await db.listBracketMatches(input.competitionId);
      const sellersList = await db.listSellers();
      const teamsList = await db.listTeamsByCompetition(input.competitionId);
      const sellersMap = new Map(sellersList.map(s => [s.id, s]));
      const teamsMap = new Map(teamsList.map(t => [t.id, t]));
      return matches.map(m => ({
        ...m,
        teamA: m.teamAId ? teamsMap.get(m.teamAId) : null,
        teamB: m.teamBId ? teamsMap.get(m.teamBId) : null,
        sellerA: m.sellerAId ? sellersMap.get(m.sellerAId) : null,
        sellerB: m.sellerBId ? sellersMap.get(m.sellerBId) : null,
      }));
    }),
    // Sortear chaves automaticamente (embaralha equipes/participantes e cria confrontos)
    sortear: adminProcedure.input(z.object({
      competitionId: z.number(),
    })).mutation(async ({ input }) => {
      const comp = await db.getCompetitionById(input.competitionId);
      if (!comp) throw new Error("Competição não encontrada");
      // Limpar confrontos antigos
      await db.deleteBracketMatchesByCompetition(input.competitionId);
      const isTeamType = comp.type === "team" || comp.type === "group";
      if (isTeamType) {
        // Sortear por equipes
        const teamsList = await db.listTeamsByCompetition(input.competitionId);
        if (teamsList.length < 2) throw new Error("Precisa de pelo menos 2 equipes");
        // Embaralhar
        const shuffled = [...teamsList].sort(() => Math.random() - 0.5);
        const round = 1;
        const matches = [];
        for (let i = 0; i < shuffled.length; i += 2) {
          const teamA = shuffled[i];
          const teamB = shuffled[i + 1] || null; // bye se ímpar
          const matchId = await db.createBracketMatch({
            competitionId: input.competitionId,
            round,
            matchOrder: Math.floor(i / 2) + 1,
            teamAId: teamA.id,
            teamBId: teamB?.id || null,
            status: teamB ? "active" : "finished",
            winnerId: teamB ? null : teamA.id,
            winnerType: teamB ? null : "team",
            startedAt: Date.now(),
          });
          matches.push(matchId);
        }
        return { matches: matches.length, type: "team" };
      } else {
        // Sortear por vendedores individuais
        const participants = await db.listParticipants(input.competitionId);
        if (participants.length < 2) throw new Error("Precisa de pelo menos 2 participantes");
        const shuffled = [...participants].sort(() => Math.random() - 0.5);
        const round = 1;
        const matches = [];
        for (let i = 0; i < shuffled.length; i += 2) {
          const sellerA = shuffled[i];
          const sellerB = shuffled[i + 1] || null;
          const matchId = await db.createBracketMatch({
            competitionId: input.competitionId,
            round,
            matchOrder: Math.floor(i / 2) + 1,
            sellerAId: sellerA.sellerId,
            sellerBId: sellerB?.sellerId || null,
            status: sellerB ? "active" : "finished",
            winnerId: sellerB ? null : sellerA.sellerId,
            winnerType: sellerB ? null : "seller",
            startedAt: Date.now(),
          });
          matches.push(matchId);
        }
        return { matches: matches.length, type: "individual" };
      }
    }),
    // Montar confronto manual
    criarConfronto: adminProcedure.input(z.object({
      competitionId: z.number(),
      round: z.number().default(1),
      matchOrder: z.number().default(1),
      teamAId: z.number().optional(),
      teamBId: z.number().optional(),
      sellerAId: z.number().optional(),
      sellerBId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createBracketMatch({
        ...input,
        status: "active",
        startedAt: Date.now(),
      });
      return { id };
    }),
    // Atualizar placar manualmente
    atualizarPlacar: adminProcedure.input(z.object({
      matchId: z.number(),
      scoreA: z.number(),
      scoreB: z.number(),
    })).mutation(async ({ input }) => {
      await db.updateBracketMatch(input.matchId, {
        scoreA: input.scoreA,
        scoreB: input.scoreB,
      });
      return { success: true };
    }),
    // Definir vencedor e encerrar confronto
    definirVencedor: adminProcedure.input(z.object({
      matchId: z.number(),
      winnerId: z.number(),
      winnerType: z.enum(["team", "seller"]),
    })).mutation(async ({ input }) => {
      await db.updateBracketMatch(input.matchId, {
        winnerId: input.winnerId,
        winnerType: input.winnerType,
        status: "finished",
        finishedAt: Date.now(),
      });
      return { success: true };
    }),
    // Trocar participantes entre dois slots de confrontos diferentes
    swapParticipants: adminProcedure.input(z.object({
      matchIdFrom: z.number(),
      sideFrom: z.enum(["A", "B"]),
      matchIdTo: z.number(),
      sideTo: z.enum(["A", "B"]),
    })).mutation(async ({ input }) => {
      const matchFrom = await db.getBracketMatch(input.matchIdFrom);
      const matchTo = await db.getBracketMatch(input.matchIdTo);
      if (!matchFrom || !matchTo) throw new Error("Confronto não encontrado");
      // Get the entity IDs from each side
      const fromTeamKey = input.sideFrom === "A" ? "teamAId" : "teamBId";
      const fromSellerKey = input.sideFrom === "A" ? "sellerAId" : "sellerBId";
      const toTeamKey = input.sideTo === "A" ? "teamAId" : "teamBId";
      const toSellerKey = input.sideTo === "A" ? "sellerAId" : "sellerBId";
      // Swap values
      const tempTeam = (matchFrom as any)[fromTeamKey];
      const tempSeller = (matchFrom as any)[fromSellerKey];
      await db.updateBracketMatch(input.matchIdFrom, {
        [fromTeamKey]: (matchTo as any)[toTeamKey],
        [fromSellerKey]: (matchTo as any)[toSellerKey],
      } as any);
      await db.updateBracketMatch(input.matchIdTo, {
        [toTeamKey]: tempTeam,
        [toSellerKey]: tempSeller,
      } as any);
      return { success: true };
    }),
    // Editar um confronto específico - trocar um participante por outro
    editMatch: adminProcedure.input(z.object({
      matchId: z.number(),
      side: z.enum(["A", "B"]),
      newSellerId: z.number().optional(),
      newTeamId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const match = await db.getBracketMatch(input.matchId);
      if (!match) throw new Error("Confronto não encontrado");
      const updateData: any = {};
      if (input.side === "A") {
        if (input.newSellerId !== undefined) updateData.sellerAId = input.newSellerId;
        if (input.newTeamId !== undefined) updateData.teamAId = input.newTeamId;
      } else {
        if (input.newSellerId !== undefined) updateData.sellerBId = input.newSellerId;
        if (input.newTeamId !== undefined) updateData.teamBId = input.newTeamId;
      }
      await db.updateBracketMatch(input.matchId, updateData);
      return { success: true };
    }),
    // Limpar todos os confrontos de uma competição
    limpar: adminProcedure.input(z.object({
      competitionId: z.number(),
    })).mutation(async ({ input }) => {
      await db.deleteBracketMatchesByCompetition(input.competitionId);
      return { success: true };
    }),
    // Alertas motivacionais para vendedor que está perdendo no mata-mata
    meusAlertas: publicProcedure.input(z.object({
      sellerId: z.number(),
    })).query(async ({ input }) => {
      // Buscar todas as competições ativas
      const activeComps = await db.listCompetitions("active");
      const alerts: Array<{
        competitionName: string;
        opponentName: string;
        myScore: number;
        opponentScore: number;
        matchId: number;
      }> = [];
      for (const comp of activeComps) {
        const matches = await db.listBracketMatches(comp.id);
        for (const match of matches) {
          if (match.status !== "active") continue;
          const isTeamType = comp.type === "team" || comp.type === "group";
          let mySide: "A" | "B" | null = null;
          if (isTeamType) {
            // Check if seller is in teamA or teamB
            if (match.teamAId || match.teamBId) {
              const participants = await db.listParticipants(comp.id);
              const myParticipant = participants.find(p => p.sellerId === input.sellerId);
              if (myParticipant?.teamId === match.teamAId) mySide = "A";
              else if (myParticipant?.teamId === match.teamBId) mySide = "B";
            }
          } else {
            if (match.sellerAId === input.sellerId) mySide = "A";
            else if (match.sellerBId === input.sellerId) mySide = "B";
          }
          if (!mySide) continue;
          const myScore = mySide === "A" ? match.scoreA : match.scoreB;
          const opponentScore = mySide === "A" ? match.scoreB : match.scoreA;
          if (opponentScore > myScore) {
            // Resolve opponent name
            let opponentName = "Adversário";
            if (isTeamType) {
              const oppTeamId = mySide === "A" ? match.teamBId : match.teamAId;
              if (oppTeamId) {
                const teams = await db.listTeamsByCompetition(comp.id);
                const oppTeam = teams.find(t => t.id === oppTeamId);
                opponentName = oppTeam?.name || "Adversário";
              }
            } else {
              const oppSellerId = mySide === "A" ? match.sellerBId : match.sellerAId;
              if (oppSellerId) {
                const oppSeller = await db.getSellerById(oppSellerId);
                opponentName = oppSeller?.name || "Adversário";
              }
            }
            alerts.push({
              competitionName: comp.name,
              opponentName,
              myScore,
              opponentScore,
              matchId: match.id,
            });
          }
        }
      }
      return alerts;
    }),
  }),

  // ===== SALES =====
  sales: router({
    list: publicProcedure.input(z.object({
      competitionId: z.number().optional(),
      sellerId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      // Vendedor logado só vê seus próprios registros (gerente vê tudo)
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId) return db.listSales(input?.competitionId, privacySellerId);
      return db.listSales(input?.competitionId, input?.sellerId);
    }),
    // Listagem paginada server-side (admin) — com filtros e contadores
    listPaged: adminProcedure.input(z.object({
      month: z.number().int().min(0).max(11).optional(),
      year: z.number().int().optional(),
      showAll: z.boolean().default(false),
      status: z.string().optional(),
      sellerId: z.number().optional(),
      search: z.string().optional(),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(100).default(20),
    })).query(async ({ input }) => {
      const all = await db.listSales();
      const sellers = await db.listSellers(false);
      const nameById = new Map<number, string>(sellers.map((s: any) => [s.id, `${s.name || ""} ${s.nickname || ""}`.toLowerCase()]));
      const inMonth = (createdAt: any) => {
        if (input.showAll || input.month == null || input.year == null) return true;
        const d = new Date(createdAt);
        return d.getMonth() === input.month && d.getFullYear() === input.year;
      };
      const base = all.filter((s: any) => inMonth(s.createdAt));
      const counts = {
        total: base.length,
        approved: base.filter((s: any) => (s.status || "approved") === "approved").length,
        pending: base.filter((s: any) => s.status === "pending").length,
        rejected: base.filter((s: any) => s.status === "rejected").length,
      };
      let filtered = base;
      if (input.status && input.status !== "todos") filtered = filtered.filter((s: any) => (s.status || "approved") === input.status);
      if (input.sellerId) filtered = filtered.filter((s: any) => s.sellerId === input.sellerId);
      const q = input.search?.toLowerCase().trim();
      if (q) {
        filtered = filtered.filter((s: any) =>
          (nameById.get(s.sellerId) || "").includes(q) ||
          (s.vehicleModel || "").toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q)
        );
      }
      return { items: filtered.slice(input.offset, input.offset + input.limit), total: filtered.length, counts };
    }),
    // Admin cria vendas já aprovadas
    create: adminProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      description: z.string().optional(),
      vehicleModel: z.string().optional(),
      vehiclePlate: z.string().optional(),
      value: z.number().optional(),
      points: z.number().default(1),
    })).mutation(async ({ input }) => {
      const id = await db.createSale({ ...input, status: 'approved' });
      // Auto-incrementar meta da loja (venda criada pelo admin já é aprovada)
      const now = new Date();
      const comp = input.competitionId ? await db.getCompetitionById(input.competitionId) : null;
      const saleCategory = comp?.category || 'vendas';
      await db.autoUpdateStoreGoal(saleCategory, now.getMonth() + 1, now.getFullYear(), 1);
      // Cruzar placa com consignação
      let consignmentMatch = null;
      if (input.vehiclePlate) {
        consignmentMatch = await db.crossReferenceConsignmentWithSale(id, input.vehiclePlate);
      }
      const seller = await db.getSellerById(input.sellerId);
      if (seller && input.value && input.value >= 50000) {
        await notifyOwner({
          title: `Venda importante registrada!`,
          content: `${seller.name} registrou uma venda de R$ ${(input.value).toLocaleString("pt-BR")} - ${input.vehicleModel || "Ve\u00edculo"}`,
        });
      }
      // AUTO-UPDATE BRACKET SCORE: incrementar placar do mata-mata (venda criada pelo admin já aprovada)
      if (input.competitionId) {
        try {
          const bracketMatches = await db.listBracketMatches(input.competitionId);
          const isTeamComp = comp && (comp.type === 'team' || comp.type === 'group');
          for (const match of bracketMatches) {
            if (match.status !== 'active') continue;
            if (isTeamComp) {
              const participants = await db.listParticipants(input.competitionId);
              const sellerParticipant = participants.find(p => p.sellerId === input.sellerId);
              if (sellerParticipant?.teamId === match.teamAId) {
                await db.incrementBracketScore(match.id, 'A');
              } else if (sellerParticipant?.teamId === match.teamBId) {
                await db.incrementBracketScore(match.id, 'B');
              }
            } else {
              if (match.sellerAId === input.sellerId) {
                await db.incrementBracketScore(match.id, 'A');
              } else if (match.sellerBId === input.sellerId) {
                await db.incrementBracketScore(match.id, 'B');
              }
            }
          }
        } catch (e) { console.error('[Bracket] Erro ao atualizar placar (admin create):', e); }
      }
      return { id, consignmentMatch };
    }),
    // Vendedor registra venda (fica pendente de aprovação)
    registerBySeller: protectedProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      vehicleModel: z.string().min(1),
      vehiclePlate: z.string().optional(),
      value: z.number().optional(),
      description: z.string().optional(),
      leadSource: z.enum(['lead_loja', 'lead_vendedor']),
      customerPhone: z.string().optional(),
      customerName: z.string().optional(),
      customerEmail: z.string().optional(),
      customerCpf: z.string().optional(),
      customerBirthday: z.string().optional(),
      retroDate: z.string().optional(), // Data retroativa YYYY-MM-DD
    })).mutation(async ({ input, ctx }) => {
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId && input.sellerId !== privacySellerId) {
        throw new Error('Você só pode registrar vendas como você mesmo');
      }
      input.sellerId = privacySellerId ?? input.sellerId;
      const seller = await db.getSellerById(input.sellerId);
      if (!seller) throw new Error("Vendedor não encontrado");
      
      // Verificar duplicados antes de criar
      const dupCheck = await db.checkDuplicateSale(input.vehiclePlate, input.customerCpf, input.customerName);
      if (dupCheck.isDuplicate) {
        throw new Error(`⚠️ DUPLICADO: ${dupCheck.reason}`);
      }
      
      const comp = input.competitionId ? await db.getCompetitionById(input.competitionId) : null;
      const points = comp ? comp.pointsPerSale : 1;
      
      // Cruzamento automático: buscar agendamento pelo telefone
      let sdrRecordId: number | undefined = undefined;
      let sdrSellerName: string | undefined = undefined;
      if (input.customerPhone) {
        const matchedRecords = await db.findSdrRecordByPhone(input.customerPhone);
        if (matchedRecords.length > 0) {
          sdrRecordId = matchedRecords[0].id;
          const sdrSeller = await db.getSellerById(matchedRecords[0].sellerId);
          sdrSellerName = sdrSeller?.name;
        }
      }
      
      // Se retroDate fornecido, usar como createdAt
      const saleData: any = { ...input, points, status: 'pending', sdrRecordId };
      if (input.retroDate) {
        saleData.createdAt = new Date(input.retroDate + 'T12:00:00');
        delete saleData.retroDate;
      } else {
        delete saleData.retroDate;
      }
      const id = await db.createSale(saleData);
      
      // Se encontrou agendamento vinculado, marcar como convertido e notificar SDR
      if (sdrRecordId && sdrSellerName) {
        await db.linkSaleToSdrRecord(id, sdrRecordId);
        // Notificar o SDR que seu agendamento virou venda
        const matchedRecords = await db.findSdrRecordByPhone(input.customerPhone!);
        if (matchedRecords.length > 0) {
          const sdrRecord = matchedRecords[0];
          await db.createNotification({
            targetType: 'seller',
            sellerId: sdrRecord.sellerId,
            type: 'sale_from_appointment',
            title: 'Seu agendamento virou venda!',
            message: `O cliente ${sdrRecord.customerName || input.customerPhone} que você agendou foi atendido por ${seller.name} e fechou a compra de ${input.vehicleModel}!`,
            actionUrl: await buildSellerTenantPath(sdrRecord.sellerId, `/minha-area/${sdrRecord.sellerId}`),
          });
        }
      }
      
      // Notifica o dono
      const sdrInfo = sdrSellerName ? ` | Agendamento de: ${sdrSellerName}` : '';
      await notifyOwner({
        title: `Nova venda para aprovar!`,
        content: `${seller.name} registrou uma venda: ${input.vehicleModel}${input.value ? ` - R$ ${input.value.toLocaleString("pt-BR")}` : ''}${sdrInfo}. Acesse o painel para aprovar.`,
      });
      const leadLabel = input.leadSource === 'lead_loja' ? 'Lead Loja' : 'Lead Vendedor';
      // Notificação persistente para admin/gerente
      await db.createNotification({
        targetType: 'admin',
        type: 'pending_sale',
        title: 'Nova venda para aprovar!',
        message: `${seller.name} registrou: ${input.vehicleModel}${input.value ? ` - R$ ${input.value.toLocaleString("pt-BR")}` : ''} | ${leadLabel}${sdrInfo}`,
        actionUrl: await buildCurrentTenantPath('/admin/aprovacoes'),
      });
      // Push notification para admin/gerente
      sendPushPendingSale(seller.name, input.vehicleModel, 'Venda').catch(console.error);
      return { 
        id, 
        message: "Venda registrada! Aguardando aprovação do gerente.",
        linkedSdr: sdrRecordId ? { sdrRecordId, sdrSellerName } : null,
      };
    }),
    // Listar vendas pendentes (admin/gerente)
    listPending: managerOrAdminProcedure.query(async () => {
      return db.listPendingSales();
    }),
    // Aprovar venda (admin/gerente)
    approve: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const sale = await db.approveSale(input.id);
      const seller = await db.getSellerById(sale.sellerId);
      // Auto-incrementar meta da loja
      const saleDate = new Date(sale.createdAt);
      const comp = sale.competitionId ? await db.getCompetitionById(sale.competitionId) : null;
      const saleCategory = comp?.category || 'vendas';
      await db.autoUpdateStoreGoal(saleCategory, saleDate.getMonth() + 1, saleDate.getFullYear(), 1);
      // Criar notificação para o vendedor
      if (seller) {
        await db.createNotification({
          sellerId: sale.sellerId,
          type: 'sale_approved',
          title: 'Venda aprovada!',
          message: `Sua venda de ${sale.vehicleModel || 'veículo'} foi aprovada e já conta no ranking!`,
        });
      }
      // Push notification de venda aprovada
      if (seller) {
        sendPushSaleApproved(seller.name, sale.vehicleModel || 've\u00edculo').catch(console.error);
        // Push de documentos pendentes para o vendedor (lembrar de enviar CNH + Comprovante)
        sendPushDocsPendentes(seller.id, seller.name, sale.vehicleModel || 'veículo').catch(console.error);
      }
      // Criar registro de documentos pendentes para esta venda
      try {
        const existingDoc = await db.getSaleDocumentBySaleId(input.id);
        if (!existingDoc) {
          await db.createSaleDocument({
            saleId: input.id,
            sellerId: sale.sellerId,
            clienteNome: sale.description || null,
            vehicleModel: sale.vehicleModel || null,
            docStatus: 'pendente',
            dispatchStatus: 'aguardando_docs',
          });
        }
      } catch (e) { console.error('Erro ao criar sale_document:', e); }
      // AUTO-UPDATE BRACKET SCORE: incrementar placar do mata-mata quando venda é aprovada
      if (sale.competitionId) {
        try {
          const bracketMatches = await db.listBracketMatches(sale.competitionId);
          const isTeamComp = comp && (comp.type === 'team' || comp.type === 'group');
          for (const match of bracketMatches) {
            if (match.status !== 'active') continue;
            if (isTeamComp) {
              // Check if seller is in teamA or teamB
              const participants = await db.listParticipants(sale.competitionId);
              const sellerParticipant = participants.find(p => p.sellerId === sale.sellerId);
              if (sellerParticipant?.teamId === match.teamAId) {
                await db.incrementBracketScore(match.id, 'A');
                console.log(`[Bracket] +1 para Time A (match ${match.id}) - venda de ${seller?.name}`);
              } else if (sellerParticipant?.teamId === match.teamBId) {
                await db.incrementBracketScore(match.id, 'B');
                console.log(`[Bracket] +1 para Time B (match ${match.id}) - venda de ${seller?.name}`);
              }
            } else {
              // Individual match
              if (match.sellerAId === sale.sellerId) {
                await db.incrementBracketScore(match.id, 'A');
                console.log(`[Bracket] +1 para Lado A (match ${match.id}) - venda de ${seller?.name}`);
              } else if (match.sellerBId === sale.sellerId) {
                await db.incrementBracketScore(match.id, 'B');
                console.log(`[Bracket] +1 para Lado B (match ${match.id}) - venda de ${seller?.name}`);
              }
            }
          }
        } catch (e) { console.error('[Bracket] Erro ao atualizar placar:', e); }
      }
      // Cruzar placa com consignação ao aprovar
      if (sale.vehiclePlate) {
        try {
          const consignmentMatch = await db.crossReferenceConsignmentWithSale(input.id, sale.vehiclePlate);
          if (consignmentMatch) {
            console.log(`[Sale Approved] Consignação #${consignmentMatch.consignmentId} marcada como vendida (placa ${consignmentMatch.vehiclePlate})`);
          }
        } catch (e) { console.error('Erro ao cruzar consignação:', e); }
      }
      // AUTO-LAUNCH BÔNUS: verificar se veículo vendido tem bônus ativo
      try {
        const bonusResult = await db.autoLaunchBonus(input.id, sale.sellerId, sale.vehiclePlate || null, sale.vehicleModel || null);
        if (bonusResult) {
          console.log(`[Bonus] Bônus automático lançado para vendedor ${sale.sellerId} - venda #${input.id}`);
          if (seller) {
            await db.createNotification({
              sellerId: sale.sellerId,
              type: 'bonus_earned',
              title: '🎉 Bônus de Carro!',
              message: `Você ganhou um bônus pela venda! Aguardando aprovação.`,
            });
          }
        }
      } catch (e) { console.error('[Bonus] Erro ao lançar bônus automático:', e); }
      return { success: true };
    }),
    // Rejeitar venda (admin/gerente)
    reject: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      // Buscar venda antes de rejeitar para ter os dados
      const sales = await db.listSales(undefined, undefined);
      const sale = sales.find((s: any) => s.id === input.id);
      await db.rejectSale(input.id);
      if (sale) {
        const seller = await db.getSellerById(sale.sellerId);
        if (seller) {
          await db.createNotification({
            sellerId: sale.sellerId,
            type: 'sale_rejected',
            title: 'Venda rejeitada',
            message: `Sua venda de ${sale.vehicleModel || 've\u00edculo'} foi rejeitada. Verifique os dados.`,
          });
          sendPushToSeller(sale.sellerId, {
            title: '\u274c Venda Rejeitada',
            body: `Sua venda de ${sale.vehicleModel || 've\u00edculo'} foi rejeitada.`,
            tag: `sale-rejected-${input.id}`,
            data: { type: 'sale_rejected', url: await buildSellerTenantPath(sale.sellerId, `/minha-area/${sale.sellerId}`) },
          }).catch(console.error);
        }
      }
      return { success: true };
    }),
    // Editar venda (admin/gerente) - ajusta pontos automaticamente
    edit: managerOrAdminProcedure.input(z.object({
      id: z.number(),
      vehicleModel: z.string().optional(),
      value: z.number().optional(),
      sellerId: z.number().optional(),
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      leadSource: z.string().optional(),
      createdAt: z.number().optional(), // timestamp para alterar data da venda
    })).mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const oldSalesList = await db.listSales(undefined, undefined);
      const oldSale = oldSalesList.find((s: any) => s.id === id);
      const result = await db.editSale(id, data);
      // Audit trail - registrar quem editou
      const editorName = (ctx as any).editorName || 'Admin';
      try {
        await db.rawQuery(`UPDATE sales SET lastEditedBy = ?, lastEditedAt = NOW() WHERE id = ?`, [editorName, id]);
      } catch (e) { console.error('Erro ao registrar auditoria:', e); }
      // Atualizar meta se status mudou
      if (oldSale && data.status && data.status !== oldSale.status) {
        const saleDate = new Date(oldSale.createdAt);
        const comp = oldSale.competitionId ? await db.getCompetitionById(oldSale.competitionId) : null;
        const saleCategory = comp?.category || 'vendas';
        if (oldSale.status === 'approved' && data.status !== 'approved') {
          await db.autoUpdateStoreGoal(saleCategory, saleDate.getMonth() + 1, saleDate.getFullYear(), -1);
        } else if (oldSale.status !== 'approved' && data.status === 'approved') {
          await db.autoUpdateStoreGoal(saleCategory, saleDate.getMonth() + 1, saleDate.getFullYear(), 1);
        }
      }
      return { success: true, sale: result };
    }),
    // Vendedor edita valor de venda pendente
    editValue: publicProcedure.input(z.object({
      saleId: z.number(),
      value: z.number().min(1),
      vehicleModel: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Verificar se a venda existe
      const salesList = await db.listSales(undefined, undefined);
      const sale = salesList.find((s: any) => s.id === input.saleId);
      if (!sale) throw new Error('Venda não encontrada');
      const updateData: any = { value: input.value };
      if (input.vehicleModel) updateData.vehicleModel = input.vehicleModel;
      await db.editSale(input.saleId, updateData);
      return { success: true };
    }),
    // Aprovar TODAS as vendas pendentes de uma vez
    approveAll: managerOrAdminProcedure.mutation(async () => {
      const pending = await db.listPendingSales();
      const results = [];
      for (const sale of pending) {
        try {
          const approved = await db.approveSale(sale.id);
          const seller = await db.getSellerById(approved.sellerId);
          const saleDate = new Date(approved.createdAt);
          const comp = approved.competitionId ? await db.getCompetitionById(approved.competitionId) : null;
          const saleCategory = comp?.category || 'vendas';
          await db.autoUpdateStoreGoal(saleCategory, saleDate.getMonth() + 1, saleDate.getFullYear(), 1);
          if (seller) {
            await db.createNotification({
              sellerId: approved.sellerId,
              type: 'sale_approved',
              title: 'Venda aprovada!',
              message: `Sua venda de ${approved.vehicleModel || 'veículo'} foi aprovada e já conta no ranking!`,
            });
          }
          results.push({ id: sale.id, success: true });
        } catch (e) { results.push({ id: sale.id, success: false }); }
      }
      return { success: true, count: results.filter(r => r.success).length, total: pending.length };
    }),
    // Excluir venda (qualquer setor) - reverte pontos e meta se aprovada
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      // Buscar venda antes de deletar para decrementar meta
      const salesList = await db.listSales(undefined, undefined);
      const sale = salesList.find((s: any) => s.id === input.id);
      if (sale && sale.status === 'approved') {
        const saleDate = new Date(sale.createdAt);
        const comp = sale.competitionId ? await db.getCompetitionById(sale.competitionId) : null;
        const saleCategory = comp?.category || 'vendas';
        await db.autoUpdateStoreGoal(saleCategory, saleDate.getMonth() + 1, saleDate.getFullYear(), -1);
      }
      await db.deleteSale(input.id);
      return { success: true };
    }),
  }),

  // ===== TRAININGS =====
  trainings: router({
    list: publicProcedure.input(z.object({ activeOnly: z.boolean().optional() }).optional()).query(async ({ input }) => {
      return db.listTrainings(input?.activeOnly ?? true);
    }),
    create: adminProcedure.input(z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      category: z.string().optional(),
      videoUrl: z.string().optional(), // URL externa (YouTube, Vimeo, etc.)
    })).mutation(async ({ input }) => {
      const id = await db.createTraining(input);
      return { id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      category: z.string().optional(),
      active: z.boolean().optional(),
      videoUrl: z.string().nullable().optional(), // URL externa ou null para remover
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateTraining(id, data);
      return { success: true };
    }),
    // Upload de vídeo direto para S3
    uploadVideo: adminProcedure.input(z.object({
      id: z.number(),
      fileName: z.string(),
      fileBase64: base64Schema,
      mimeType: z.string(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, 'base64');
      const ext = input.fileName.split('.').pop() || 'mp4';
      const key = `trainings/${input.id}-${nanoid(8)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db.updateTraining(input.id, { videoUrl: url, videoKey: key });
      return { success: true, videoUrl: url };
    }),
    // Remover vídeo sem excluir o treinamento
    removeVideo: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.updateTraining(input.id, { videoUrl: null, videoKey: null });
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteTraining(input.id);
      return { success: true };
    }),
  }),

  // ===== ACTION PLANS =====
  actionPlans: router({
    list: publicProcedure.input(z.object({ sellerId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.listActionPlans(input?.sellerId);
    }),
    create: adminProcedure.input(z.object({
      sellerId: z.number(),
      title: z.string().min(1),
      content: z.string().min(1),
      dueDate: z.number().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createActionPlan(input);
      // Criar notificação para o vendedor
      const seller = await db.getSellerById(input.sellerId);
      await db.createNotification({
        sellerId: input.sellerId,
        type: 'action_plan',
        title: 'Novo Plano de Ação!',
        message: `Você recebeu um novo plano de ação: "${input.title}". Acesse sua área para conferir.`,
        actionUrl: await buildSellerTenantPath(input.sellerId, `/minha-area/${input.sellerId}`),
      });
      // Push notification para o vendedor
      sendPushToSeller(input.sellerId, {
        title: '📋 Novo Plano de Ação!',
        body: `Você recebeu: "${input.title}". Confira na sua área!`,
        tag: `action-plan-${input.sellerId}`,
        data: { type: 'action_plan', url: await buildSellerTenantPath(input.sellerId, `/minha-area/${input.sellerId}`) },
        requireInteraction: true,
      }).catch(console.error);
      return { id, message: `Plano enviado para ${seller?.nickname || seller?.name || 'vendedor'}!` };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      status: z.enum(["pending", "in_progress", "completed"]).optional(),
      dueDate: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateActionPlan(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteActionPlan(input.id);
      return { success: true };
    }),
    generateWithAI: adminProcedure.input(z.object({ sellerId: z.number() })).mutation(async ({ input }) => {
      const seller = await db.getSellerById(input.sellerId);
      if (!seller) throw new Error("Vendedor não encontrado");
      const salesList = await db.listSales(undefined, input.sellerId);
      const recentSales = salesList.slice(0, 20);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um consultor de vendas automotivas especializado. Crie um plano de ação personalizado e prático para o vendedor melhorar sua performance. Responda em português do Brasil. Seja direto e objetivo com dicas acionáveis." },
          { role: "user", content: `Vendedor: ${seller.name}\nTotal de vendas: ${seller.totalSales}\nPontos totais: ${seller.totalPoints}\nVendas recentes: ${recentSales.map(s => `${s.vehicleModel || 'Veículo'} - R$${s.value || 0}`).join(', ') || 'Nenhuma'}\n\nCrie um plano de ação com título e conteúdo detalhado para melhorar a performance deste vendedor.` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "action_plan",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string", description: "Título do plano de ação" },
                content: { type: "string", description: "Conteúdo detalhado do plano com passos práticos" },
              },
              required: ["title", "content"],
              additionalProperties: false,
            },
          },
        },
      });
      const parsed = extractStructuredLlmPayload<{ title: string; content: string }>(response);
      const id = await db.createActionPlan({ sellerId: input.sellerId, title: parsed.title, content: parsed.content });
      // Notificar vendedor sobre plano gerado por IA
      await db.createNotification({
        sellerId: input.sellerId,
        type: 'action_plan',
        title: 'Novo Plano de Ação (IA)!',
        message: `Você recebeu um plano de ação personalizado: "${parsed.title}". Acesse sua área para conferir.`,
        actionUrl: await buildSellerTenantPath(input.sellerId, `/minha-area/${input.sellerId}`),
      });
      sendPushToSeller(input.sellerId, {
        title: '🤖 Plano de Ação Personalizado!',
        body: `Novo plano gerado para você: "${parsed.title}". Confira!`,
        tag: `action-plan-ai-${input.sellerId}`,
        data: { type: 'action_plan', url: await buildSellerTenantPath(input.sellerId, `/minha-area/${input.sellerId}`) },
        requireInteraction: true,
      }).catch(console.error);
      return { id, title: parsed.title, content: parsed.content };
    }),
  }),

  // ===== MOTIVATIONAL QUOTES =====
  quotes: router({
    latest: publicProcedure.query(async () => {
      const quote = await db.getLatestQuote();
      return quote ?? null;
    }),
    list: publicProcedure.query(async () => {
      return db.listQuotes();
    }),
    generate: adminProcedure.mutation(async () => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um motivador de equipes de vendas automotivas. Gere uma frase motivacional poderosa e inspiradora para vendedores de veículos. A frase deve ser curta, impactante e usar metáforas de corrida/velocidade quando possível. Responda em português do Brasil." },
          { role: "user", content: "Gere uma frase motivacional para a equipe de vendas da Kafka Multimarcas. Use metáforas de corrida e velocidade." },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "quote",
            strict: true,
            schema: {
              type: "object",
              properties: {
                quote: { type: "string", description: "A frase motivacional" },
                author: { type: "string", description: "Autor fictício ou 'Kafka Multimarcas'" },
              },
              required: ["quote", "author"],
              additionalProperties: false,
            },
          },
        },
      });
      const parsed = extractStructuredLlmPayload<{ quote: string; author: string }>(response);
      if (!parsed.quote?.trim()) {
        throw new Error("A IA retornou a frase vazia.");
      }
      if (!parsed.author?.trim()) {
        throw new Error("A IA retornou o autor vazio.");
      }
      const id = await db.createQuote({ quote: parsed.quote, author: parsed.author });
      return { id, ...parsed };
    }),
  }),

  // ===== NOTIFICATIONS =====
  notifications: router({
    list: publicProcedure.input(z.object({ sellerId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.listNotifications(input?.sellerId);
    }),
    adminList: adminProcedure.query(async () => {
      return db.listAdminNotifications();
    }),
    unreadCountAdmin: adminProcedure.query(async () => {
      const count = await db.countUnreadAdminNotifications();
      return { count };
    }),
    unreadCountSeller: protectedProcedure.input(z.object({ sellerId: z.number() })).query(async ({ input, ctx }) => {
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId && input.sellerId !== privacySellerId) {
        throw new Error('Você só pode acessar suas próprias notificações');
      }
      const count = await db.countUnreadSellerNotifications(privacySellerId ?? input.sellerId);
      return { count };
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markNotificationRead(input.id);
      return { success: true };
    }),
    markAllRead: protectedProcedure.input(z.object({
      targetType: z.string(),
      sellerId: z.number().optional(),
    })).mutation(async ({ input }) => {
      await db.markAllNotificationsRead(input.targetType, input.sellerId);
      return { success: true };
    }),
  }),

  // ===== AI INSIGHTS =====
  ai: router({
    analyzePerformance: adminProcedure.input(z.object({ sellerId: z.number() })).mutation(async ({ input }) => {
      const seller = await db.getSellerById(input.sellerId);
      if (!seller) throw new Error("Vendedor não encontrado");
      const salesList = await db.listSales(undefined, input.sellerId);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um analista de performance de vendas automotivas. Analise os dados do vendedor e forneça insights práticos sobre tendências, pontos fortes, áreas de melhoria e sugestões. Use metáforas de corrida. Responda em português do Brasil." },
          { role: "user", content: `Vendedor: ${seller.name}\nTotal vendas: ${seller.totalSales}\nPontos: ${seller.totalPoints}\nHistórico recente (últimas ${Math.min(salesList.length, 30)} vendas):\n${salesList.slice(0, 30).map(s => `- ${s.vehicleModel || 'Veículo'} | R$${s.value || 0} | ${new Date(s.createdAt).toLocaleDateString('pt-BR')}`).join('\n') || 'Sem vendas registradas'}\n\nForneça uma análise detalhada com insights e sugestões.` },
        ],
      });
      return { analysis: response.choices[0].message.content as string };
    }),
  }),

  // ===== LIVE FEED =====
  feed: router({
    // Retorna vendas recentes aprovadas (últimos 30 min) para alertas em tempo real
    recent: publicProcedure.input(z.object({
      since: z.number(), // timestamp em ms
    })).query(async ({ input }) => {
      return db.getRecentApprovedSales(input.since);
    }),
  }),

  // ===== PUSH NOTIFICATIONS =====
  push: router({
    subscribe: publicProcedure.input(z.object({
      endpoint: z.string(),
      p256dh: z.string(),
      auth: z.string(),
      sellerId: z.number().optional(),
    })).mutation(async ({ input }) => {
      await db.savePushSubscription(input);
      return { success: true };
    }),
    unsubscribe: publicProcedure.input(z.object({
      endpoint: z.string(),
    })).mutation(async ({ input }) => {
      await db.deletePushSubscription(input.endpoint);
      return { success: true };
    }),
    getVapidKey: publicProcedure.query(() => {
      return { key: process.env.VITE_VAPID_PUBLIC_KEY || "" };
    }),
  }),

  // ===== F&I (Financiamento) =====
  fei: router({
    list: publicProcedure.input(z.object({
      competitionId: z.number().optional(),
      sellerId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      // Vendedor logado só vê seus próprios registros (gerente vê tudo)
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId) return db.listFeiRecords(input?.competitionId, privacySellerId);
      return db.listFeiRecords(input?.competitionId, input?.sellerId);
    }),
    // Listagem paginada server-side (admin) — filtros, contadores e totais
    listPaged: adminProcedure.input(z.object({
      month: z.number().int().min(0).max(11).optional(),
      year: z.number().int().optional(),
      showAll: z.boolean().default(false),
      status: z.string().optional(),
      sellerId: z.number().optional(),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(100).default(20),
    })).query(async ({ input }) => {
      const all = await db.listFeiRecords();
      const inMonth = (createdAt: any) => {
        if (input.showAll || input.month == null || input.year == null) return true;
        const d = new Date(createdAt);
        return d.getMonth() === input.month && d.getFullYear() === input.year;
      };
      const base = all.filter((r: any) => inMonth(r.createdAt));
      const sumBy = (st: string) => base.filter((r: any) => r.status === st).reduce((s: number, r: any) => s + (r.financedValue || 0), 0);
      const counts = {
        total: base.length,
        approved: base.filter((r: any) => r.status === "approved").length,
        pending: base.filter((r: any) => r.status === "pending").length,
        rejected: base.filter((r: any) => r.status === "rejected").length,
        totalApproved: sumBy("approved"),
        totalPending: sumBy("pending"),
      };
      const sellerIds = Array.from(new Set(base.map((r: any) => r.sellerId as number)));
      let filtered = base;
      if (input.status && input.status !== "todos") filtered = filtered.filter((r: any) => r.status === input.status);
      if (input.sellerId) filtered = filtered.filter((r: any) => r.sellerId === input.sellerId);
      return { items: filtered.slice(input.offset, input.offset + input.limit), total: filtered.length, counts, sellerIds };
    }),
    register: publicProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      customerCpf: z.string().optional(),
      customerName: z.string().min(1, "Nome do cliente é obrigatório"),
      vehiclePlate: z.string().optional(),
      bankName: z.string().min(1),
      financedValue: z.number().optional(),
      returnType: z.string().min(1),
      paymentDate: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const seller = await db.getSellerById(input.sellerId);
      if (!seller) throw new Error("Colaborador n\u00e3o encontrado");
      
      // Verificar duplicados antes de criar
      const dupCheck = await db.checkDuplicateFei(input.vehiclePlate, input.customerCpf);
      if (dupCheck.isDuplicate) {
        throw new Error(`\u26a0\ufe0f DUPLICADO: ${dupCheck.reason}`);
      }
      
      const comp = input.competitionId ? await db.getCompetitionById(input.competitionId) : null;
      const points = comp ? comp.pointsPerSale : 1;
      const id = await db.createFeiRecord({ ...input, points, status: 'pending' });
      await notifyOwner({
        title: `Novo registro F&I para aprovar!`,
        content: `${seller.name} registrou F&I: Banco ${input.bankName} | ${input.returnType} | R$ ${(input.financedValue || 0).toLocaleString("pt-BR")}`,
      });
      // Notificação persistente para admin
      await db.createNotification({
        targetType: 'admin',
        type: 'pending_fei',
        title: 'Novo F&I para aprovar!',
        message: `${seller.name}: Banco ${input.bankName} | ${input.returnType}`,
        actionUrl: await buildCurrentTenantPath('/admin/aprovacoes'),
      });
      sendPushPendingRecord(seller.name, 'F&I', `Banco ${input.bankName} | ${input.returnType}`).catch(console.error);
      return { id, message: "F&I registrado! Aguardando aprovação." };
    }),
    listPending: managerOrAdminProcedure.query(async () => {
      return db.listPendingFeiRecords();
    }),
    approve: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const record = await db.approveFeiRecord(input.id);
      const seller = await db.getSellerById(record.sellerId);
      if (seller) {
        await db.createNotification({
          sellerId: record.sellerId,
          type: 'fei_approved',
          title: 'F&I aprovado!',
          message: `Seu registro F&I (${record.bankName} - ${record.returnType}) foi aprovado!`,
        });
        sendPushToSeller(record.sellerId, {
          title: '\u2705 F&I Aprovado!',
          body: `Seu registro F&I (${record.bankName} - ${record.returnType}) foi aprovado! +${record.points} pts`,
          tag: `fei-approved-${record.id}`,
          data: { type: 'fei_approved', url: await buildSellerTenantPath(record.sellerId, `/minha-area/${record.sellerId}`) },
          vibrate: [200, 100, 200],
        }).catch(console.error);
      }
      return { success: true };
    }),
    // Aprovar TODOS os registros F&I pendentes de uma vez
    approveAll: managerOrAdminProcedure.mutation(async () => {
      const pending = await db.listPendingFeiRecords();
      const results = [];
      for (const record of pending) {
        try {
          await db.approveFeiRecord(record.id);
          const seller = await db.getSellerById(record.sellerId);
          if (seller) {
            await db.createNotification({
              sellerId: record.sellerId,
              type: 'fei_approved',
              title: 'F&I aprovado!',
              message: `Seu registro F&I (${record.bankName} - ${record.returnType}) foi aprovado!`,
            });
          }
          results.push({ id: record.id, success: true });
        } catch (e) { results.push({ id: record.id, success: false }); }
      }
      return { success: true, count: results.filter(r => r.success).length, total: pending.length };
    }),
    reject: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      // Buscar registro antes de rejeitar para ter os dados
      const records = await db.listFeiRecords();
      const record = records.find((r: any) => r.id === input.id);
      await db.rejectFeiRecord(input.id);
      if (record) {
        const seller = await db.getSellerById(record.sellerId);
        if (seller) {
          await db.createNotification({
            sellerId: record.sellerId,
            type: 'fei_rejected',
            title: 'F&I rejeitado',
            message: `Seu registro F&I (${record.bankName} - ${record.returnType}) foi rejeitado. Verifique os dados e tente novamente.`,
          });
          sendPushToSeller(record.sellerId, {
            title: '\u274c F&I Rejeitado',
            body: `Seu registro F&I (${record.bankName} - ${record.returnType}) foi rejeitado.`,
            tag: `fei-rejected-${record.id}`,
            data: { type: 'fei_rejected', url: await buildSellerTenantPath(record.sellerId, `/minha-area/${record.sellerId}`) },
          }).catch(console.error);
        }
      }
      return { success: true };
    }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteFeiRecord(input.id);
      return { success: true };
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      customerCpf: z.string().optional(),
      customerName: z.string().optional(),
      vehiclePlate: z.string().optional(),
      bankName: z.string().optional(),
      financedValue: z.number().optional(),
      returnType: z.string().optional(),
      paymentDate: z.number().nullable().optional(),
      notes: z.string().optional(),
      editReason: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const { id, editReason, ...data } = input;
      const editorName = ctx.user?.name || 'Usuário';
      const updated = await db.updateFeiRecord(id, data, editorName, editReason);
      return updated;
    }),
    // Audit log for a specific F&I record
    auditLogs: publicProcedure.input(z.object({
      feiRecordId: z.number(),
    })).query(async ({ input }) => {
      return db.listFeiAuditLogs(input.feiRecordId);
    }),
    // Busca veículo por placa no inventário
    lookupPlate: publicProcedure.input(z.object({
      plate: z.string().min(6).max(8),
    })).query(async ({ input }) => {
      const { inventoryVehicles } = await import("../drizzle/schema");
      const { getDb } = await import("./db");
      const { eq, like, and } = await import("drizzle-orm");
      const { getCurrentTenantId } = await import("./tenantDb");
      const dbConn = await getDb();
      if (!dbConn) return { found: false, brand: null, model: null, year: null, fipePrice: null, version: null };
      const plate = input.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      // Try exact match first
      const rows = await dbConn.select().from(inventoryVehicles)
        .where(and(like(inventoryVehicles.plate, `%${plate}%`), eq(inventoryVehicles.tenantId, getCurrentTenantId())));
      const found = rows.find((v: any) => {
        const vPlate = (v.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return vPlate === plate;
      });
      if (found) {
        return { found: true, brand: found.brand, model: found.model, year: found.year, fipePrice: found.fipePrice, version: found.version };
      }
      return { found: false, brand: null, model: null, year: null, fipePrice: null, version: null };
    }),
    // Busca CEP via ViaCEP
    lookupCep: publicProcedure.input(z.object({
      cep: z.string().min(8).max(9),
    })).query(async ({ input }) => {
      const cep = input.cep.replace(/\D/g, '');
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (data.erro) return { found: false, logradouro: null, bairro: null, localidade: null, uf: null };
        return { found: true, logradouro: data.logradouro, bairro: data.bairro, localidade: data.localidade, uf: data.uf };
      } catch {
        return { found: false, logradouro: null, bairro: null, localidade: null, uf: null };
      }
    }),
  }),

  // ===== CONSIGNA\u00c7\u00c3O =====
  consignment: router({
    list: publicProcedure.input(z.object({
      competitionId: z.number().optional(),
      sellerId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      // Vendedor logado só vê seus próprios registros (gerente vê tudo)
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId) return db.listConsignmentRecords(input?.competitionId, privacySellerId);
      return db.listConsignmentRecords(input?.competitionId, input?.sellerId);
    }),
    // Verificar placa antes de registrar (duplicidade 60 dias)
    checkPlate: publicProcedure.input(z.object({
      plate: z.string().min(1),
    })).query(async ({ input }) => {
      return db.checkConsignmentPlate(input.plate);
    }),
    // Listar veículos no pátio (sem saída)
    yard: publicProcedure.query(async () => {
      return db.listVehiclesInYard();
    }),
    // Listar veículos que completaram 7 dias
    completed7Days: publicProcedure.input(z.object({
      month: z.number().optional(),
      year: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.listVehiclesCompleted7Days(input?.month, input?.year);
    }),
    // Listar veículos que já saíram (histórico)
    exited: publicProcedure.input(z.object({
      month: z.number().optional(),
      year: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.listVehiclesExited(input?.month, input?.year);
    }),
    register: publicProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      vehiclePlate: z.string().min(1, "Placa é obrigatória"),
      vehicleModel: z.string().min(1),
      consignorId: z.number().optional(),
      ownerName: z.string().min(1),
      ownerPhone: z.string().optional(),
      entryDate: z.number(),
      hasAuction: z.boolean().optional(),
      vehicleStatus: z.string().optional(),
      payoffValue: z.number().optional(),
      costValue: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Verificar duplicidade de placa
      const plateCheck = await db.checkConsignmentPlate(input.vehiclePlate);
      if (plateCheck.blocked) {
        throw new Error(plateCheck.message);
      }
      const seller = await db.getSellerById(input.sellerId);
      if (!seller) throw new Error("Colaborador não encontrado");
      const comp = input.competitionId ? await db.getCompetitionById(input.competitionId) : null;
      const points = comp ? comp.pointsPerSale : 1;
      const id = await db.createConsignmentRecord({ ...input, points, status: 'pending' });
      const warningMsg = plateCheck.warning ? ` \u26a0️ ${plateCheck.message}` : '';
      await notifyOwner({
        title: `Nova consignação para aprovar!`,
        content: `${seller.name} registrou consignação: ${input.vehicleModel} | Dono: ${input.ownerName} | Tel: ${input.ownerPhone || 'N/I'} | Placa: ${input.vehiclePlate}${warningMsg}`,
      });
      await db.createNotification({
        targetType: 'admin',
        type: 'pending_consignment',
        title: 'Nova consignação para aprovar!',
        message: `${seller.name}: ${input.vehicleModel} | Dono: ${input.ownerName} | Placa: ${input.vehiclePlate}`,
        actionUrl: await buildCurrentTenantPath('/admin/aprovacoes'),
      });
      sendPushPendingRecord(seller.name, 'Consignação', `${input.vehicleModel} | Dono: ${input.ownerName}`).catch(console.error);
      return { id, message: `Consignação registrada! Aguardando aprovação. O carro precisa ficar 7 dias no pátio para contar pontos.${warningMsg}` };
    }),
    listPending: managerOrAdminProcedure.query(async () => {
      return db.listPendingConsignmentRecords();
    }),
    approve: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const result = await db.approveConsignmentRecord(input.id);
      const seller = await db.getSellerById(result.sellerId);
      if (seller) {
        await db.createNotification({
          sellerId: result.sellerId,
          type: 'consignment_approved',
          title: 'Consignação aprovada!',
          message: result.isValid
            ? `Sua consignação de ${result.vehicleModel} foi aprovada e já conta pontos!`
            : `Sua consignação de ${result.vehicleModel} foi aprovada. Os pontos serão contados após 7 dias no pátio.`,
        });
        sendPushToSeller(result.sellerId, {
          title: '\u2705 Consignação Aprovada!',
          body: result.isValid
            ? `Sua consignação de ${result.vehicleModel} foi aprovada e já conta pontos!`
            : `Sua consignação de ${result.vehicleModel} foi aprovada. Pontos após 7 dias.`,
          tag: `consignment-approved-${input.id}`,
          data: { type: 'consignment_approved', url: await buildSellerTenantPath(result.sellerId, `/minha-area/${result.sellerId}`) },
          vibrate: [200, 100, 200],
        }).catch(console.error);
      }
      return { success: true, isValid: result.isValid };
    }),
    // Aprovar TODAS as consignações pendentes de uma vez
    approveAll: managerOrAdminProcedure.mutation(async () => {
      const pending = await db.listPendingConsignmentRecords();
      const results = [];
      for (const record of pending) {
        try {
          const result = await db.approveConsignmentRecord(record.id);
          const seller = await db.getSellerById(result.sellerId);
          if (seller) {
            await db.createNotification({
              sellerId: result.sellerId,
              type: 'consignment_approved',
              title: 'Consignação aprovada!',
              message: result.isValid
                ? `Sua consignação de ${result.vehicleModel} foi aprovada e já conta pontos!`
                : `Sua consignação de ${result.vehicleModel} foi aprovada. Pontos após 7 dias.`,
            });
          }
          results.push({ id: record.id, success: true });
        } catch (e) { results.push({ id: record.id, success: false }); }
      }
      return { success: true, count: results.filter(r => r.success).length, total: pending.length };
    }),
    reject: managerOrAdminProcedure.input(z.object({ 
      id: z.number(),
      reason: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Buscar registro antes de rejeitar
      const records = await db.listConsignmentRecords();
      const record = records.find((r: any) => r.id === input.id);
      await db.rejectConsignmentRecord(input.id, input.reason);
      if (record) {
        const reasonMsg = input.reason ? ` Motivo: ${input.reason}` : '';
        await db.createNotification({
          sellerId: record.sellerId,
          type: 'consignment_rejected',
          title: 'Consignação rejeitada',
          message: `Sua consignação de ${record.vehicleModel} foi rejeitada.${reasonMsg}`,
        });
        sendPushToSeller(record.sellerId, {
          title: '\u274c Consignação Rejeitada',
          body: `Sua consignação de ${record.vehicleModel} foi rejeitada.${reasonMsg}`,
          tag: `consignment-rejected-${input.id}`,
          data: { type: 'consignment_rejected', url: await buildSellerTenantPath(record.sellerId, `/minha-area/${record.sellerId}`) },
        }).catch(console.error);
      }
      return { success: true };
    }),
    // Excluir consignação (qualquer setor)
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const deleted = await db.deleteConsignmentRecord(input.id);
      return { success: true, deleted };
    }),
    // Editar consignação (qualquer setor)
    update: publicProcedure.input(z.object({
      id: z.number(),
      vehiclePlate: z.string().optional(),
      vehicleModel: z.string().optional(),
      consignorId: z.number().nullable().optional(),
      ownerName: z.string().optional(),
      ownerPhone: z.string().optional(),
      entryDate: z.number().optional(),
      hasAuction: z.boolean().optional(),
      vehicleStatus: z.string().optional(),
      payoffValue: z.number().optional(),
      costValue: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await db.updateConsignmentRecord(id, data);
      return { success: true, record: updated };
    }),
    // Registrar saída do carro do pátio (admin, gerente, ou setor consignação)
    updateExit: protectedProcedure.input(z.object({
      id: z.number(),
      exitDate: z.number(),
    })).mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === 'admin';
      const isCrmAdmin = ctx.user.actorType === 'crm_admin';
      const isGerente = ctx.user.sellerRole === 'gerente';
      const isConsignacao = ctx.user.sellerDepartment === 'consignacao';
      if (!isAdmin && !isCrmAdmin && !isGerente && !isConsignacao) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores, gerentes e setor de consignação' });
      }
      const result = await db.updateConsignmentExitDate(input.id, input.exitDate);
      return { success: true, isValid: result.isValid };
    }),
  }),

  // ===== CONSIGNADORES (Pessoa) =====
  consignors: router({
    list: publicProcedure.input(z.object({ activeOnly: z.boolean().optional() }).optional()).query(async ({ input }) => {
      return db.listConsignors(input?.activeOnly !== false);
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getConsignorById(input.id);
    }),
    create: publicProcedure.input(z.object({
      name: z.string().min(1, "Nome é obrigatório"),
      cpf: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createConsignor(input);
      return { id, success: true };
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      cpf: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
      active: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateConsignor(id, data);
      return { success: true };
    }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteConsignor(input.id);
      return { success: true };
    }),
    vehicleCounts: publicProcedure.query(async () => {
      return db.getConsignorVehicleCounts();
    }),
    vehiclesByConsignor: publicProcedure.input(z.object({ consignorId: z.number() })).query(async ({ input }) => {
      return db.getVehiclesByConsignor(input.consignorId);
    }),
  }),

  // ===== DESPACHANTE =====
  dispatch: router({
    list: publicProcedure.input(z.object({
      competitionId: z.number().optional(),
      sellerId: z.number().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      // Vendedor logado só vê seus próprios registros (gerente vê tudo)
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId) return db.listDispatchRecords(input?.competitionId, privacySellerId);
      return db.listDispatchRecords(input?.competitionId, input?.sellerId);
    }),
    register: publicProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      vehiclePlate: z.string().optional(),
      documentType: z.string().min(1),
      customerPaid: z.boolean().default(false),
      transferValue: z.number().optional(),
    })).mutation(async ({ input }) => {
      const seller = await db.getSellerById(input.sellerId);
      if (!seller) throw new Error("Colaborador n\u00e3o encontrado");
      
      // Verificar duplicados antes de criar
      const dupCheck = await db.checkDuplicateDispatch(input.vehiclePlate);
      if (dupCheck.isDuplicate) {
        throw new Error(`\u26a0\ufe0f DUPLICADO: ${dupCheck.reason}`);
      }
      
      const comp = input.competitionId ? await db.getCompetitionById(input.competitionId) : null;
      const points = comp ? comp.pointsPerSale : 1;
      const bonusPoints = input.customerPaid ? Math.max(1, Math.floor(points * 0.5)) : 0;
      const id = await db.createDispatchRecord({ ...input, points, bonusPoints, status: 'pending' });
      await notifyOwner({
        title: `Novo registro de despachante para aprovar!`,
        content: `${seller.name} registrou: ${input.documentType} | Placa: ${input.vehiclePlate || 'N/I'}${input.customerPaid ? ' | CLIENTE PAGOU (bônus!)' : ''}`,
      });
      await db.createNotification({
        targetType: 'admin',
        type: 'pending_dispatch',
        title: 'Novo despachante para aprovar!',
        message: `${seller.name}: ${input.documentType} | Placa: ${input.vehiclePlate || 'N/I'}`,
        actionUrl: await buildCurrentTenantPath('/admin/aprovacoes'),
      });
      sendPushPendingRecord(seller.name, 'Despachante', `${input.documentType} | Placa: ${input.vehiclePlate || 'N/I'}`).catch(console.error);
      return { id, message: "Registro de despachante enviado! Aguardando aprovação." };
    }),
    listPending: managerOrAdminProcedure.query(async () => {
      return db.listPendingDispatchRecords();
    }),
    approve: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const record = await db.approveDispatchRecord(input.id);
      const seller = await db.getSellerById(record.sellerId);
      if (seller) {
        const totalPts = record.points + record.bonusPoints;
        await db.createNotification({
          sellerId: record.sellerId,
          type: 'dispatch_approved',
          title: 'Documento aprovado!',
          message: `Seu registro de ${record.documentType} foi aprovado! +${totalPts} pontos${record.bonusPoints > 0 ? ' (inclui bônus por cobrança do cliente!)' : ''}.`,
        });
        sendPushToSeller(record.sellerId, {
          title: '\u2705 Documento Aprovado!',
          body: `Seu registro de ${record.documentType} foi aprovado! +${totalPts} pontos.`,
          tag: `dispatch-approved-${input.id}`,
          data: { type: 'dispatch_approved', url: await buildSellerTenantPath(record.sellerId, `/minha-area/${record.sellerId}`) },
          vibrate: [200, 100, 200],
        }).catch(console.error);
      }
      return { success: true };
    }),
    // Aprovar TODOS os registros de despachante pendentes de uma vez
    approveAll: managerOrAdminProcedure.mutation(async () => {
      const pending = await db.listPendingDispatchRecords();
      const results = [];
      for (const record of pending) {
        try {
          await db.approveDispatchRecord(record.id);
          const seller = await db.getSellerById(record.sellerId);
          if (seller) {
            const totalPts = record.points + (record.bonusPoints || 0);
            await db.createNotification({
              sellerId: record.sellerId,
              type: 'dispatch_approved',
              title: 'Documento aprovado!',
              message: `Seu registro de ${record.documentType} foi aprovado! +${totalPts} pontos.`,
            });
          }
          results.push({ id: record.id, success: true });
        } catch (e) { results.push({ id: record.id, success: false }); }
      }
      return { success: true, count: results.filter(r => r.success).length, total: pending.length };
    }),
    reject: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const records = await db.listDispatchRecords();
      const record = records.find((r: any) => r.id === input.id);
      await db.rejectDispatchRecord(input.id);
      if (record) {
        await db.createNotification({
          sellerId: record.sellerId,
          type: 'dispatch_rejected',
          title: 'Documento rejeitado',
          message: `Seu registro de ${record.documentType} foi rejeitado.`,
        });
        sendPushToSeller(record.sellerId, {
          title: '\u274c Documento Rejeitado',
          body: `Seu registro de ${record.documentType} foi rejeitado.`,
          tag: `dispatch-rejected-${input.id}`,
          data: { type: 'dispatch_rejected', url: await buildSellerTenantPath(record.sellerId, `/minha-area/${record.sellerId}`) },
        }).catch(console.error);
      }
      return { success: true };
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      vehiclePlate: z.string().optional(),
      documentType: z.string().optional(),
      customerPaid: z.boolean().optional(),
      transferValue: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await db.updateDispatchRecord(id, data);
      return { success: true, record: updated };
    }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteDispatchRecord(input.id);
      return { success: true };
    }),
  }),

  // ===== SDR / PRÉ-VENDAS / AGENDAMENTOS =====
  sdr: router({
    // Rota protegida: vendedor lista APENAS seus próprios agendamentos
    myAppointments: publicProcedure.input(z.object({
      sellerId: z.number(),
    })).query(async ({ input, ctx }) => {
      // Se vendedor logado, só pode ver seus próprios dados (gerente vê tudo)
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId && input.sellerId !== privacySellerId) {
        throw new Error('Você só pode acessar seus próprios agendamentos');
      }
      return db.listSdrRecords(undefined, input.sellerId);
    }),
    // Rota pública: vendedor cria agendamento individual
    createAppointment: publicProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      customerName: z.string().min(1),
      customerPhone: z.string().optional(),
      customerEmail: z.string().optional(),
      vehicleInterest: z.string().optional(),
      scheduledDate: z.number().optional(),
      notes: z.string().optional(),
      isFeirão: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      // Se for feirão, vincular à edição ativa automaticamente
      let feiraoEditionId: number | null = null;
      if (input.isFeirão) {
        const activeEdition = await db.getActiveFeiraoEdition();
        if (!activeEdition) throw new Error('Nenhuma edição de feirão ativa no momento. Peça ao gerente para criar uma nova edição.');
        feiraoEditionId = activeEdition.id;
        // Validar que a data do agendamento está dentro do período da edição
        if (input.scheduledDate && activeEdition.startDate && activeEdition.endDate) {
          if (!db.isDateWithinEdition(input.scheduledDate, activeEdition)) {
            const start = new Date(activeEdition.startDate).toLocaleDateString('pt-BR');
            const end = new Date(activeEdition.endDate).toLocaleDateString('pt-BR');
            throw new Error(`A data do agendamento deve estar dentro do período do feirão (${start} a ${end})`);
          }
        }
      }
      const result = await db.createSdrRecord({
        sellerId: input.sellerId,
        competitionId: input.competitionId ?? null,
        type: 'agendamento',
        customerName: input.customerName,
        customerPhone: input.customerPhone ?? null,
        customerEmail: input.customerEmail ?? null,
        vehicleInterest: input.vehicleInterest ?? null,
        source: null,
        scheduledDate: input.scheduledDate ?? null,
        converted: false,
        isFeirão: input.isFeirão ?? false,
        feiraoEditionId,
        notes: input.notes ?? null,
        points: 1,
      });
      // Auto-aprovar agendamento (não precisa de aprovação do admin)
      await db.approveSdrRecord(result.id);
      return { id: result.id, ticketNumber: result.ticketNumber, message: `Agendamento ${result.ticketNumber || ''} criado com sucesso!` };
    }),
    // Rota pública: vendedor marca que cliente compareceu (sem precisar de login admin)
    markAttendancePublic: publicProcedure.input(z.object({ id: z.number(), sellerId: z.number() })).mutation(async ({ input }) => {
      // Verificar que o agendamento pertence ao vendedor
      const records = await db.listSdrRecords(undefined, input.sellerId);
      const record = records.find((r: any) => r.id === input.id);
      if (!record) throw new Error('Agendamento não encontrado ou não pertence a este vendedor');
      if (record.attendanceStatus !== 'pending') throw new Error('Este agendamento já foi marcado');
      const result = await db.markAttendance(input.id);
      return { success: true, record: result };
    }),
    register: protectedProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      type: z.enum(["agendamento", "lead_convertido"]),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      customerEmail: z.string().optional(),
      vehicleInterest: z.string().optional(),
      source: z.string().optional(),
      scheduledDate: z.number().optional(),
      converted: z.boolean().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const result = await db.createSdrRecord({
        sellerId: input.sellerId,
        competitionId: input.competitionId ?? null,
        type: input.type,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        customerEmail: input.customerEmail ?? null,
        vehicleInterest: input.vehicleInterest ?? null,
        source: input.source ?? null,
        scheduledDate: input.scheduledDate ?? null,
        converted: input.converted ?? false,
        notes: input.notes ?? null,
        points: input.type === 'lead_convertido' ? 3 : 1,
      });
      const msg = input.type === 'lead_convertido' ? 'Lead convertido registrado!' : `Agendamento ${result.ticketNumber || ''} registrado!`;
      // Auto-aprovar agendamentos (não precisa de aprovação do admin)
      if (input.type === 'agendamento') {
        await db.approveSdrRecord(result.id);
      }
      const msg2 = input.type === 'lead_convertido' ? 'Lead convertido registrado! Aguardando aprovação.' : `Agendamento ${result.ticketNumber || ''} criado com sucesso!`;
      return { id: result.id, ticketNumber: result.ticketNumber, message: msg2 };
    }),
    list: adminProcedure.input(z.object({
      competitionId: z.number().optional(),
      sellerId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.listSdrRecords(input?.competitionId, input?.sellerId);
    }),
    pending: managerOrAdminProcedure.query(async () => {
      return db.listPendingSdrRecords();
    }),
    approve: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const record = await db.approveSdrRecord(input.id);
      return { success: true, record };
    }),
    // Aprovar TODOS os registros SDR pendentes de uma vez
    approveAll: managerOrAdminProcedure.mutation(async () => {
      const pending = await db.listPendingSdrRecords();
      const results = [];
      for (const record of pending) {
        try {
          await db.approveSdrRecord(record.id);
          results.push({ id: record.id, success: true });
        } catch (e) { results.push({ id: record.id, success: false }); }
      }
      return { success: true, count: results.filter(r => r.success).length, total: pending.length };
    }),
    reject: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.rejectSdrRecord(input.id);
      return { success: true };
    }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteSdrRecord(input.id);
      return { success: true };
    }),
    // Vendedor marca que cliente compareceu
    markAttendance: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const record = await db.markAttendance(input.id);
      return { success: true, record };
    }),
    // Listar agendamentos pendentes de aprovação de comparecimento
    pendingAttendance: managerOrAdminProcedure.query(async () => {
      return db.listPendingAttendance();
    }),
    // Gerente aprova comparecimento
    approveAttendance: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const record = await db.approveAttendance(input.id);
      // Push para vendedor que comparecimento foi aprovado
      if (record && record.sellerId) {
        sendPushAttendanceApproved(record.sellerId, record.customerName || 'Cliente').catch(console.error);
      }
      return { success: true, record };
    }),
    // Aprovar TODOS os comparecimentos pendentes de uma vez
    approveAllAttendance: managerOrAdminProcedure.mutation(async () => {
      const pending = await db.listPendingAttendance();
      const results = [];
      for (const record of pending) {
        try {
          const approved = await db.approveAttendance(record.id);
          if (approved && approved.sellerId) {
            sendPushAttendanceApproved(approved.sellerId, approved.customerName || 'Cliente').catch(console.error);
          }
          results.push({ id: record.id, success: true });
        } catch (e) { results.push({ id: record.id, success: false }); }
      }
      return { success: true, count: results.filter(r => r.success).length, total: pending.length };
    }),
    // Gerente reprova comparecimento
    rejectAttendance: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.rejectAttendance(input.id);
      return { success: true };
    }),
    // Gerente marca como não compareceu
    markNoShow: managerOrAdminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markNoShow(input.id);
      return { success: true };
    }),
    // Alternar comparecimento: permite corrigir status errado (veio <-> não veio)
    toggleAttendance: publicProcedure.input(z.object({
      id: z.number(),
      sellerId: z.number(),
      newStatus: z.enum(['attended', 'no_show', 'pending']),
    })).mutation(async ({ input }) => {
      // Verificar que o agendamento pertence ao vendedor
      const records = await db.listSdrRecords(undefined, input.sellerId);
      const record = records.find((r: any) => r.id === input.id);
      if (!record) throw new Error('Agendamento n\u00e3o encontrado ou n\u00e3o pertence a este vendedor');
      await db.updateSdrRecord(input.id, { attendanceStatus: input.newStatus, attendanceMarkedAt: input.newStatus === 'attended' ? Date.now() : null });
      const statusLabel = input.newStatus === 'attended' ? 'Compareceu' : input.newStatus === 'no_show' ? 'N\u00e3o compareceu' : 'Pendente';
      return { success: true, message: `Status alterado para: ${statusLabel}` };
    }),
    // Rota pública: vendedor reagenda cliente que não veio
    reschedule: publicProcedure.input(z.object({
      id: z.number(),
      sellerId: z.number(),
      newDate: z.number(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Verificar que o agendamento pertence ao vendedor
      const records = await db.listSdrRecords(undefined, input.sellerId);
      const record = records.find((r: any) => r.id === input.id);
      if (!record) throw new Error('Agendamento não encontrado');
      if (record.attendanceStatus !== 'no_show' && record.attendanceStatus !== 'pending') throw new Error('Só é possível reagendar agendamentos pendentes ou não comparecidos');
      await db.rescheduleSdrRecord(input.id, input.newDate, input.notes);
      return { success: true, message: 'Cliente reagendado com sucesso!' };
    }),
    // Vendedor marca/desmarca como feirão
    toggleFeirao: publicProcedure.input(z.object({
      id: z.number(),
      sellerId: z.number(),
      isFeirão: z.boolean(),
    })).mutation(async ({ input }) => {
      const records = await db.listSdrRecords(undefined, input.sellerId);
      const record = records.find((r: any) => r.id === input.id);
      if (!record) throw new Error('Agendamento não encontrado ou não pertence a este vendedor');
      let feiraoEditionId: number | null = null;
      if (input.isFeirão) {
        const activeEdition = await db.getActiveFeiraoEdition();
        if (!activeEdition) throw new Error('Nenhuma edição de feirão ativa no momento.');
        feiraoEditionId = activeEdition.id;
        // Validar data do agendamento dentro do período
        if ((record as any).scheduledDate && activeEdition.startDate && activeEdition.endDate) {
          if (!db.isDateWithinEdition((record as any).scheduledDate, activeEdition)) {
            const start = new Date(activeEdition.startDate).toLocaleDateString('pt-BR');
            const end = new Date(activeEdition.endDate).toLocaleDateString('pt-BR');
            throw new Error(`A data deste agendamento está fora do período do feirão (${start} a ${end})`);
          }
        }
      }
      await db.updateSdrRecord(input.id, { isFeirão: input.isFeirão, feiraoEditionId } as any);
      return { success: true, message: input.isFeirão ? 'Marcado como Feirão!' : 'Removido do Feirão!' };
    }),
    // Vendedor edita/reagenda agendamento (nome, telefone, carro, data, notas)
    editByVendedor: publicProcedure.input(z.object({
      id: z.number(),
      sellerId: z.number(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      customerEmail: z.string().optional(),
      vehicleInterest: z.string().optional(),
      scheduledDate: z.number().optional(),
      notes: z.string().optional(),
      isFeirão: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const records = await db.listSdrRecords(undefined, input.sellerId);
      const record = records.find((r: any) => r.id === input.id);
      if (!record) throw new Error('Agendamento não encontrado ou não pertence a este vendedor');
      const { id, sellerId, ...data } = input;
      await db.updateSdrRecord(id, data as any);
      return { success: true, message: 'Agendamento atualizado com sucesso!' };
    }),
    // Editar agendamento (qualquer setor)
    update: publicProcedure.input(z.object({
      id: z.number(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      customerEmail: z.string().optional(),
      vehicleInterest: z.string().optional(),
      scheduledDate: z.number().optional(),
      notes: z.string().optional(),
      attendanceStatus: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateSdrRecord(id, data);
      return { success: true };
    }),
    // Listar agendamentos aprovados para sorteio
    approvedAppointments: adminProcedure.input(z.object({
      competitionId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.listApprovedAppointments(input?.competitionId);
    }),
    // ===== FEIRÃO =====
    // Ranking do feirão: quem mais agendou (com filtro por edição)
    rankingFeirao: publicProcedure.input(z.object({
      competitionId: z.number().optional(),
      editionId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const ranking = await db.getRankingFeirao(input?.competitionId, input?.editionId);
      const sellersList = await db.listSellers();
      return ranking.map((r: any) => {
        const seller = sellersList.find((s: any) => s.id === r.sellerId);
        return {
          ...r,
          sellerName: seller?.name || 'Desconhecido',
          department: seller?.department || 'vendas',
          avatarUrl: seller?.photoUrl || null,
        };
      });
    }),
    // Listar todos agendamentos de feirão (com filtro por edição)
    listFeirao: publicProcedure.input(z.object({
      competitionId: z.number().optional(),
      editionId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const agendamentos = await db.listFeiraoAgendamentos(input?.competitionId, input?.editionId);
      const sellersList = await db.listSellers();
      return agendamentos.map((a: any) => ({
        ...a,
        sellerName: sellersList.find((s: any) => s.id === a.sellerId)?.name || 'Desconhecido',
      }));
    }),
    // ===== EDIÇÕES DE FEIRÃO =====
    listEditions: publicProcedure.query(async () => {
      return db.listFeiraoEditions();
    }),
    activeEdition: publicProcedure.query(async () => {
      return db.getActiveFeiraoEdition();
    }),
    createEdition: adminProcedure.input(z.object({
      editionNumber: z.number(),
      name: z.string().min(1),
      startDate: z.number(),
      endDate: z.number(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Validar que endDate >= startDate
      if (input.endDate < input.startDate) throw new Error('Data de fim não pode ser antes da data de início');
      // Validar sobreposição com edições existentes
      const hasOverlap = await db.checkEditionOverlap(input.startDate, input.endDate);
      if (hasOverlap) throw new Error('Já existe uma edição com datas sobrepostas. Ajuste as datas.');
      // Finalizar edição ativa anterior
      const active = await db.getActiveFeiraoEdition();
      if (active) await db.finishFeiraoEdition(active.id);
      const result = await db.createFeiraoEdition(input);
      return { success: true, result };
    }),
    updateEdition: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
      status: z.enum(['active', 'finished']).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      // Se está atualizando datas, validar sobreposição
      if (data.startDate && data.endDate) {
        if (data.endDate < data.startDate) throw new Error('Data de fim não pode ser antes da data de início');
        const hasOverlap = await db.checkEditionOverlap(data.startDate, data.endDate, id);
        if (hasOverlap) throw new Error('Já existe uma edição com datas sobrepostas. Ajuste as datas.');
      }
      await db.updateFeiraoEdition(id, data as any);
      return { success: true };
    }),
    finishEdition: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.finishFeiraoEdition(input.id);
      return { success: true };
    }),
    // Buscar agendamento por telefone (para cruzamento com venda)
    findByPhone: publicProcedure.input(z.object({
      phone: z.string().min(8),
    })).query(async ({ input }) => {
      const records = await db.findSdrRecordByPhone(input.phone);
      const sellersList = await db.listSellers();
      return records.map((r: any) => ({
        ...r,
        sellerName: sellersList.find((s: any) => s.id === r.sellerId)?.name || 'Desconhecido',
      }));
    }),
    // Vincular venda a agendamento
    linkToSale: adminProcedure.input(z.object({
      saleId: z.number(),
      sdrRecordId: z.number(),
    })).mutation(async ({ input }) => {
      await db.linkSaleToSdrRecord(input.saleId, input.sdrRecordId);
      return { success: true, message: 'Venda vinculada ao agendamento!' };
    }),
    // Conversões do SDR (para controle de comissão)
    myConversions: publicProcedure.input(z.object({
      sellerId: z.number(),
    })).query(async ({ input }) => {
      return db.getSdrConversions(input.sellerId);
    }),
    // Vendas vinculadas a agendamentos de um SDR
    salesLinkedToSdr: publicProcedure.input(z.object({
      sellerId: z.number(),
    })).query(async ({ input }) => {
      return db.listSalesLinkedToSdr(input.sellerId);
    }),

    // ===== TRANSFERIR AGENDAMENTO PARA OUTRO VENDEDOR =====
    transferAppointment: publicProcedure.input(z.object({
      id: z.number(),
      sellerId: z.number(), // vendedor atual
      newSellerId: z.number(), // novo vendedor
    })).mutation(async ({ input }) => {
      const records = await db.listSdrRecords(undefined, input.sellerId);
      const record = records.find((r: any) => r.id === input.id);
      if (!record) throw new Error('Agendamento não encontrado ou não pertence a este vendedor');
      // Update sellerId directly in DB
      const database = await db.getDb();
      if (!database) throw new Error('DB not available');
      const { sdrRecords } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await database.update(sdrRecords).set({ sellerId: input.newSellerId }).where(eq(sdrRecords.id, input.id));
      const newSeller = await db.getSellerById(input.newSellerId);
      return { success: true, message: `Agendamento transferido para ${newSeller?.name || 'vendedor'}!` };
    }),

    // ===== RESGATE AUTOMÁTICO VIA IA NO WHATSAPP =====
    aiRescueWhatsApp: publicProcedure.input(z.object({
      id: z.number(),
      sellerId: z.number(),
    })).mutation(async ({ input }) => {
      const records = await db.listSdrRecords(undefined, input.sellerId);
      const record = records.find((r: any) => r.id === input.id);
      if (!record) throw new Error('Agendamento não encontrado');
      if (!record.customerPhone) throw new Error('Cliente não tem telefone cadastrado');
      const seller = await db.getSellerById(input.sellerId);
      const sellerName = seller?.name || 'nosso consultor';
      const vehicleInfo = record.vehicleInterest ? ` sobre o ${record.vehicleInterest}` : '';
      const scheduledInfo = record.scheduledDate ? ` para ${new Date(Number(record.scheduledDate)).toLocaleDateString('pt-BR')}` : '';
      // Use AI to generate a personalized rescue message
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `Você é um assistente de vendas de uma loja de veículos chamada Kafka. Gere uma mensagem curta e amigável de resgate para um cliente que tinha um agendamento mas não compareceu. A mensagem deve:
- Ser informal e acolhedora (usar emoji com moderação)
- Mencionar o nome do cliente
- Perguntar se está tudo bem e se ainda tem interesse
- Oferecer reagendar
- Ser curta (máximo 3 linhas)
- NÃO incluir saudação formal, NÃO incluir assinatura
- Responder APENAS com o texto da mensagem, nada mais`
          },
          {
            role: 'user',
            content: `Cliente: ${record.customerName}\nVendedor: ${sellerName}\nInteresse: ${record.vehicleInterest || 'veículo'}\nAgendamento original: ${scheduledInfo || 'não definido'}\nObservações: ${record.notes || 'nenhuma'}`
          }
        ],
      });
      const rawMsg = response.choices?.[0]?.message?.content;
      const aiMessage = (typeof rawMsg === 'string' ? rawMsg : `Olá ${record.customerName}! Tudo bem? Notamos que não conseguimos nos encontrar${scheduledInfo}. Ainda tem interesse${vehicleInfo}? Podemos reagendar! 😊`);
      // Send via WhatsApp
      const result = await zapi.sendText(record.customerPhone, aiMessage);
      if (!result.success) throw new Error(`Erro ao enviar WhatsApp: ${result.error}`);
      return { success: true, message: 'Mensagem de resgate enviada pelo WhatsApp!', sentMessage: aiMessage };
    }),

    // ===== EXPORTAR PDF DE AGENDAMENTOS =====
    exportPdfData: publicProcedure.input(z.object({
      sellerId: z.number(),
      filter: z.enum(['all', 'rescue', 'active', 'completed']).optional(),
    })).query(async ({ input }) => {
      const records = await db.listSdrRecords(undefined, input.sellerId);
      const agendamentos = records.filter((r: any) => r.type === 'agendamento');
      const seller = await db.getSellerById(input.sellerId);
      const sellerName = seller?.name || 'Vendedor';
      const now = Date.now();
      const categorized = agendamentos.map((apt: any) => {
        const scheduled = apt.scheduledDate ? Number(apt.scheduledDate) : null;
        const diff = scheduled ? scheduled - now : null;
        let category = 'active';
        if (apt.attendanceStatus === 'approved') category = 'completed';
        else if (apt.attendanceStatus === 'no_show') category = 'rescue';
        else if (diff !== null && diff < -3600000) category = 'rescue'; // overdue > 1h
        return { ...apt, category };
      });
      let filtered = categorized;
      if (input.filter && input.filter !== 'all') {
        filtered = categorized.filter((a: any) => a.category === input.filter);
      }
      return {
        sellerName,
        generatedAt: Date.now(),
        appointments: filtered.map((a: any) => ({
          ticketNumber: a.ticketNumber || '-',
          customerName: a.customerName || '-',
          customerPhone: a.customerPhone || '-',
          vehicleInterest: a.vehicleInterest || '-',
          scheduledDate: a.scheduledDate ? new Date(Number(a.scheduledDate)).toLocaleString('pt-BR') : '-',
          status: a.status,
          attendanceStatus: a.attendanceStatus || 'pending',
          category: a.category,
          notes: a.notes || '',
          isFeirão: a.isFeirão || false,
        })),
      };
    }),
  }),

  // ===== VOZ - Reconhecimento de voz com IA =====
  voice: router({
    parseVoice: publicProcedure.input(z.object({
      transcript: z.string(),
      category: z.string().optional(),
    })).mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que extrai dados de vendas de veículos a partir de fala transcrita. Extraia os campos disponíveis do texto. Retorne JSON com os campos encontrados. Use null para campos não encontrados. Campos: vehicleModel (modelo do carro), value (valor em centavos, ex: 45000 reais = 4500000), customerName (nome do cliente), vehiclePlate (placa), description (descrição), bankName (banco), customerPhone (telefone), customerEmail (email), customerCpf (CPF). Sempre retorne JSON válido com todos os campos (use null se não encontrar).`
          },
          { role: 'user', content: input.transcript }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'voice_sale_data',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                vehicleModel: { type: ['string', 'null'], description: 'Modelo do veículo' },
                value: { type: ['number', 'null'], description: 'Valor em centavos' },
                customerName: { type: ['string', 'null'], description: 'Nome do cliente' },
                vehiclePlate: { type: ['string', 'null'], description: 'Placa do veículo' },
                description: { type: ['string', 'null'], description: 'Descrição da venda' },
                bankName: { type: ['string', 'null'], description: 'Nome do banco' },
                customerPhone: { type: ['string', 'null'], description: 'Telefone' },
                customerEmail: { type: ['string', 'null'], description: 'Email' },
                customerCpf: { type: ['string', 'null'], description: 'CPF' },
              },
              required: ['vehicleModel', 'value', 'customerName', 'vehiclePlate', 'description', 'bankName', 'customerPhone', 'customerEmail', 'customerCpf'],
              additionalProperties: false,
            },
          },
        },
      });
      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : '{}';
      try {
        const parsed = JSON.parse(content);
        // Remover campos null para manter compatibilidade
        const cleaned: Record<string, any> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (v !== null && v !== undefined) cleaned[k] = v;
        }
        return { success: true, data: cleaned };
      } catch {
        return { success: true, data: {} };
      }
    }),
  }),

  // ===== DISPARO WHATSAPP PARA AGENDAMENTOS =====
  vehicleCosts: vehicleCostRouter,

  appointmentDispatch: router({
    // Preview: buscar destinatários com filtros
    preview: adminProcedure
      .input(z.object({
        type: z.enum(['feirao', 'normal', 'all']).default('all'),
        editionId: z.number().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
        status: z.enum(['attended', 'no_show', 'pending', 'all']).default('all'),
        sellerId: z.number().optional(),
        excludeBuyers: z.boolean().default(true),
      }))
      .query(async ({ input }) => {
        const records = await db.getAppointmentsForDispatch(input);
        // Buscar nomes dos vendedores
        const allSellers = await db.listSellers();
        const sellerMap = new Map(allSellers.map(s => [s.id, s.name]));
        return records.map(r => ({
          id: r.id,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          vehicleInterest: r.vehicleInterest,
          sellerName: sellerMap.get(r.sellerId) || 'Desconhecido',
          scheduledDate: r.scheduledDate,
          attendanceStatus: r.attendanceStatus,
          isFeirão: r.isFeirão,
        }));
      }),

    // Disparar mensagens
    send: adminProcedure
      .input(z.object({
        type: z.enum(['feirao', 'normal', 'all']).default('all'),
        editionId: z.number().optional(),
        startDate: z.number().optional(),
        endDate: z.number().optional(),
        status: z.enum(['attended', 'no_show', 'pending', 'all']).default('all'),
        sellerId: z.number().optional(),
        excludeBuyers: z.boolean().default(true),
        message: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const records = await db.getAppointmentsForDispatch(input);
        if (records.length === 0) throw new Error('Nenhum destinatário encontrado com esses filtros');
        if (records.length > 500) throw new Error('Máximo de 500 destinatários por disparo. Refine os filtros.');

        const phones = records.map(r => r.customerPhone!.replace(/\D/g, '')).filter(p => p.length >= 10);
        if (phones.length === 0) throw new Error('Nenhum telefone válido encontrado');

        // Buscar nomes dos vendedores uma vez
        const allSellersForMsg = await db.listSellers();
        const sellerMapForMsg = new Map(allSellersForMsg.map(s => [s.id, s.name]));

        // Personalizar mensagem para cada destinatário
        const results: { sent: number; failed: number; errors: string[] } = { sent: 0, failed: 0, errors: [] };
        const { sendText } = await import('./zapi-service');

        for (let i = 0; i < records.length; i++) {
          const r = records[i];
          const phone = r.customerPhone?.replace(/\D/g, '');
          if (!phone || phone.length < 10) { results.failed++; continue; }

          let msg = input.message;
          msg = msg.replace(/\{nome\}/gi, r.customerName || 'Cliente');
          msg = msg.replace(/\{veiculo\}/gi, r.vehicleInterest || 'veículo');
          msg = msg.replace(/\{vendedor\}/gi, sellerMapForMsg.get(r.sellerId) || 'consultor');

          try {
            const res = await sendText(phone, msg);
            if (res.success) results.sent++;
            else { results.failed++; results.errors.push(`${phone}: ${(res as any).error || 'erro'}`) }
          } catch (e: any) {
            results.failed++;
            results.errors.push(`${phone}: ${e.message}`);
          }

          // Anti-ban: intervalo de 45s entre mensagens (com jitter +-20%)
          if (i < records.length - 1) {
            const baseDelay = 45000;
            const jitter = baseDelay * 0.2;
            const delay = baseDelay + (Math.random() * jitter * 2 - jitter);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        // Log do disparo
        try {
          const dbConn = await db.getDbInstance();
          if (dbConn) {
            const { crmBulkSendLogs } = await import('../drizzle/schema');
            await dbConn.insert(crmBulkSendLogs).values({
              message: input.message,
              totalRecipients: records.length,
              sent: results.sent,
              failed: results.failed,
              errors: JSON.stringify(results.errors.slice(0, 20)),
              createdAt: Date.now(),
            });
          }
        } catch (e) { console.error('[DispatchLog]', e); }

        return results;
      }),

    // Listar edições disponíveis para filtro
    editions: adminProcedure.query(async () => {
      return db.listFeiraoEditions();
    }),

    // Listar vendedores para filtro
    sellers: adminProcedure.query(async () => {
      return db.listSellers();
    }),
  }),

  // ===== GOALS (METAS) =====
  goals: router({
    list: publicProcedure.input(z.object({
      month: z.number().optional(),
      year: z.number().optional(),
      type: z.string().optional(),
      sellerId: z.number().optional(),
      category: z.string().optional(),
    }).optional()).query(async ({ input, ctx }) => {
      const allGoals = await db.listGoals(input || {});
      // Sincronizar metas da loja com vendas reais (garante que currentValue esteja sempre correto)
      const storeGoals = allGoals.filter((g: any) => g.type === 'store');
      for (const sg of storeGoals) {
        try {
          const synced = await db.syncStoreGoalProgress(sg.id, sg.month, sg.year, sg.category);
          if (synced && synced.currentValue !== sg.currentValue) {
            (sg as any).currentValue = synced.currentValue;
            (sg as any).achieved = synced.achieved;
          }
        } catch (e) {
          console.error(`[GoalSync] Erro ao sincronizar meta ${sg.id}:`, e);
        }
      }
      // Se o usuário é vendedor logado, filtrar: mostra metas da loja + apenas a meta individual dele (gerente vê tudo)
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId) {
        return allGoals.filter((g: any) => g.type === 'store' || (g.type === 'individual' && g.sellerId === privacySellerId));
      }
      // Se não é admin/gerente, esconder metas individuais (ranking público)
      if (!ctx.user || ctx.user.role !== 'admin') {
        return allGoals.filter((g: any) => g.type === 'store');
      }
      // Admin vê tudo
      return allGoals;
    }),
    create: adminProcedure.input(z.object({
      type: z.enum(["store", "individual"]),
      sellerId: z.number().optional(),
      month: z.number().min(1).max(12),
      year: z.number(),
      category: z.string().default("vendas"),
      targetValue: z.number().min(1),
      bonusDescription: z.string().optional(),
      bonusValue: z.number().optional(),
      deadlineHours: z.number().optional().default(48),
    })).mutation(async ({ input }) => {
      const { deadlineHours, ...goalData } = input;
      const deadline = goalData.type === 'individual' && goalData.sellerId
        ? Date.now() + (deadlineHours || 48) * 60 * 60 * 1000
        : undefined;
      const id = await db.createGoal({ ...goalData, deadline } as any);
      // Enviar push para o colaborador se for meta individual
      if (goalData.type === 'individual' && goalData.sellerId) {
        const catLabel = goalData.category === 'vendas' ? 'Vendas' : goalData.category === 'fei' ? 'F&I' : goalData.category === 'consignacao' ? 'Consignação' : goalData.category === 'despachante' ? 'Despachante' : goalData.category === 'pre_vendas' ? 'Pré-Vendas' : goalData.category;
        try {
          await sendPushToSeller(goalData.sellerId, {
            title: '🎯 Nova Meta Individual!',
            body: `Você recebeu uma meta de ${catLabel} (${goalData.targetValue} unidades). Aceite em até ${deadlineHours || 48}h!`,
            tag: `goal-new-${id}`,
          });
        } catch {}
      }
      return { id, message: "Meta criada!" };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      targetValue: z.number().optional(),
      currentValue: z.number().optional(),
      bonusDescription: z.string().optional(),
      bonusValue: z.number().optional(),
      achieved: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateGoal(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteGoal(input.id);
      return { success: true };
    }),
    // Metas pendentes de aceitação para o vendedor logado
    myPendingGoals: publicProcedure.query(async ({ ctx }) => {
      const privacySellerId = await getPrivacySellerId(ctx);
      if (!privacySellerId) return [];
      const allGoals = await db.listGoals({});
      return allGoals.filter((g: any) => g.type === 'individual' && g.sellerId === privacySellerId && !g.accepted);
    }),
    // Aceitar meta individual
    accept: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const privacySellerId = await getPrivacySellerId(ctx);
      if (!privacySellerId) throw new Error('Apenas colaboradores podem aceitar metas');
      const allGoals = await db.listGoals({});
      const goal = allGoals.find((g: any) => g.id === input.id);
      if (!goal) throw new Error('Meta n\u00e3o encontrada');
      if (goal.sellerId !== privacySellerId) throw new Error('Esta meta n\u00e3o \u00e9 sua');
      if (goal.accepted) throw new Error('Meta j\u00e1 aceita');
      await db.updateGoal(input.id, { accepted: true, acceptedAt: Date.now(), acceptedBy: privacySellerId });
      // Notificar admin que meta foi aceita
      const seller = await db.getSellerById(privacySellerId);
      const sellerName = seller?.nickname || seller?.name || 'Colaborador';
      try {
        await notifyOwner({ title: 'Meta Aceita!', content: `${sellerName} aceitou a meta de ${goal.category} (${goal.targetValue} unidades)` });
      } catch {}
      return { success: true, message: 'Meta aceita!' };
    }),
    // Reenviar notificação de meta pendente para o colaborador
    resendNotification: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const allGoals = await db.listGoals({});
      const goal = allGoals.find((g: any) => g.id === input.id);
      if (!goal) throw new Error('Meta não encontrada');
      if (goal.accepted) throw new Error('Meta já foi aceita');
      if (!goal.sellerId) throw new Error('Meta sem colaborador associado');
      const seller = await db.getSellerById(goal.sellerId);
      if (!seller) throw new Error('Colaborador não encontrado');
      const catLabel = goal.category === 'vendas' ? 'Vendas' : goal.category === 'fei' ? 'F&I' : goal.category === 'consignacao' ? 'Consignação' : goal.category === 'despachante' ? 'Despachante' : goal.category === 'pre_vendas' ? 'Pré-Vendas' : goal.category;
      try {
        await sendPushToSeller(goal.sellerId!, {
          title: '🎯 Meta Pendente de Aceitação!',
          body: `Você tem uma meta de ${catLabel} (${goal.targetValue} unidades) aguardando aceitação. Acesse o app e aceite!`,
          tag: `goal-reminder-${goal.id}`,
        });
      } catch {}
      // Atualizar contagem de lembretes
      await db.updateGoal(goal.id, { reminderSentAt: Date.now(), reminderCount: (goal.reminderCount || 0) + 1 } as any);
      return { success: true, message: `Notificação reenviada para ${seller.nickname || seller.name}!` };
    }),
    // Verificar metas expiradas (prazo 48h) e notificar admin
    checkExpiredGoals: publicProcedure.query(async () => {
      const allGoals = await db.listGoals({});
      const now = Date.now();
      const expired = allGoals.filter((g: any) => 
        g.type === 'individual' && !g.accepted && g.deadline && now > g.deadline
      );
      const pending = allGoals.filter((g: any) =>
        g.type === 'individual' && !g.accepted && g.deadline && now <= g.deadline
      );
      return { expired: expired.length, pending: pending.length, expiredGoals: expired };
    }),
    // Ranking mensal de vendas (separado da campanha)
    monthlyRanking: publicProcedure.input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
      category: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getMonthlyRanking(input.month, input.year, input.category);
    }),
    // Ranking de agendamentos (quem mais agendou e compareceu)
    appointmentRanking: publicProcedure.input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
    })).query(async ({ input }) => {
      return db.getAppointmentRanking(input.month, input.year);
    }),
    consignmentRanking: publicProcedure.input(z.object({
      month: z.number().min(1).max(12),
      year: z.number(),
    })).query(async ({ input }) => {
      return db.getConsignmentRanking(input.month, input.year);
    }),
  }),

  // ===== PENDING COUNT (all sectors) =====
  pendingCount: router({
    getAll: adminProcedure.query(async () => {
      return db.getAllPendingCount();
    }),
  }),

  // ===== ACCESS CONTROL =====
  access: router({
    verify: publicProcedure.input(z.object({ code: z.string() })).mutation(async ({ input }) => {
      const storedHash = await db.getAppSetting("access_code_hash");
      // Fallback: se não tem hash, tenta código legado em texto plano
      if (!storedHash) {
        const legacyCode = await db.getAppSetting("access_code");
        if (!legacyCode) return { valid: true };
        const valid = input.code === legacyCode;
        // Migrar para hash se validou
        if (valid) {
          const hash = await bcrypt.hash(legacyCode, 10);
          await db.setAppSetting("access_code_hash", hash);
        }
        return { valid };
      }
      const valid = await bcrypt.compare(input.code, storedHash);
      return { valid };
    }),
    getCode: adminProcedure.query(async () => {
      const code = await db.getAppSetting("access_code");
      return { code: code || "" };
    }),
    setCode: adminProcedure.input(z.object({ code: z.string().min(1) })).mutation(async ({ input }) => {
      // Salvar código em texto (para admin ver) E hash (para verificação segura)
      await db.setAppSetting("access_code", input.code);
      const hash = await bcrypt.hash(input.code, 10);
      await db.setAppSetting("access_code_hash", hash);
      return { success: true };
    }),
  }),

  // ===== MANAGERS (DEPRECATED - backward compat stub) =====
  // All gerentes are now in the sellers table with sellerRole='gerente'.
  // This router is kept as a stub so old frontend code doesn't break.
  managers: router({
    // Login: redirect to sellers.login (same logic)
    login: publicProcedure.input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      // Resolve via sellers table (all managers migrated to sellers-gerente)
      const seller = await db.getSellerByUsername(input.username);
      if (!seller || !seller.active || !seller.passwordHash) {
        throw new Error("Usuário ou senha inválidos");
      }
      const valid = await bcrypt.compare(input.password, seller.passwordHash);
      if (!valid) {
        throw new Error("Usuário ou senha inválidos");
      }
      // Set seller_session cookie (unified)
      await db.updateSellerLastAccess(seller.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("manager_session", { ...cookieOptions, maxAge: -1 });
      const token = jwt.sign(
        { sellerId: seller.id, username: seller.username, tenantId: (seller as any).tenantId, tenantSlug: ctx.tenantSlug },
        ENV.cookieSecret,
        { expiresIn: "30d" }
      );
      ctx.res.cookie("seller_session", token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      return { success: true, name: seller.name };
    }),

    // Logout: clear both cookies for backward compat
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("manager_session", { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("seller_session", { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    // me: returns seller-gerente data in manager-compatible shape
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      if (ctx.user.actorType === "seller" && ctx.user.sellerRole === "gerente") {
        const limits = await getTenantLimits(ctx.tenantId);
        return {
          id: ctx.user.id, name: ctx.user.name, role: "manager" as const,
          trialEndsAt: limits?.trialEndsAt ?? null, trialExpired: limits?.trialExpired ?? false,
          subscriptionSuspended: limits?.status === "suspended",
        };
      }
      return null;
    }),

    // CRUD stubs - redirect to sellers
    list: adminProcedure.query(async () => {
      // Return sellers with sellerRole='gerente' in manager-compatible shape
      const allSellers = await db.listSellers(false);
      return allSellers
        .filter((s: any) => s.sellerRole === 'gerente')
        .map((s: any) => ({ id: s.id, name: s.name, username: s.username, email: s.email, active: s.active, createdAt: s.createdAt }));
    }),

    create: adminProcedure.input(z.object({
      username: z.string().min(3).optional(),
      password: z.string().min(4),
      name: z.string().min(1),
      email: z.string().email("E-mail do gerente inválido"),
    })).mutation(async ({ input, ctx }) => {
      // Create as seller-gerente instead
      const passwordHash = await bcrypt.hash(input.password, 10);
      const username = input.username || input.email.split("@")[0];
      const id = await db.createSeller({ name: input.name, email: input.email, department: 'vendas' });
      await db.updateSeller(id, { username, passwordHash, sellerRole: 'gerente' } as any);

      const tenant = await getTenantById(ctx.tenantId);
      if (tenant) {
        const loginUrl = `${getRequestOrigin(ctx.req)}/login`;
        await sendUserWelcomeEmail(input.email, tenant.name, "gerente", loginUrl, ctx.tenantId);
      }

      return { id };
    }),

    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      password: z.string().min(4).optional(),
      active: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const data: any = {};
      if (input.name) data.name = input.name;
      if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);
      if (input.active !== undefined) data.active = input.active;
      await db.updateSeller(input.id, data);
      return { success: true };
    }),

    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.updateSeller(input.id, { active: false });
      return { success: true };
    }),
  }),

  // ===== ALERTAS AUTOMÁTICOS =====
  alerts: router({
    // Verificar agendamentos expirando (chamado pelo frontend periodicamente)
    checkExpiringAppointments: publicProcedure.input(z.object({
      sellerId: z.number(),
    })).query(async ({ input }) => {
      const records = await db.listSdrRecords(undefined, input.sellerId);
      const now = Date.now();
      const expiring: { id: number; customerName: string; minutesLeft: number; status: string }[] = [];
      for (const r of records) {
        if (!r.scheduledDate || r.attendanceStatus !== 'pending') continue;
        const diff = r.scheduledDate - now;
        const minutesLeft = Math.floor(diff / 60000);
        // Alertar se faltam menos de 30 minutos ou já passou
        if (minutesLeft <= 30) {
          expiring.push({
            id: r.id,
            customerName: r.customerName || 'Cliente',
            minutesLeft,
            status: minutesLeft <= 0 ? 'expired' : 'expiring',
          });
        }
      }
      return expiring;
    }),
    // Verificar se vendedor está inativo (chamado pelo backend scheduler)
    checkInactivity: adminProcedure.query(async () => {
      // Retorna vendedores ativos para o admin poder ver quem está inativo
      const allSellers = await db.listSellers(true);
      return allSellers.map(s => ({
        id: s.id,
        name: s.nickname || s.name,
        totalPoints: s.totalPoints,
        totalSales: s.totalSales,
      }));
    }),
   }),

  // ===== CRM MODULE =====
  adminAuth: adminAuthRouter,
  crmLeads: crmLeadsRouter,
  crmPipeline: crmPipelineRouter,
  crmInventory: crmInventoryRouter,
  crmIntegrations: crmIntegrationsRouter,
  crmCampaigns: crmCampaignsRouter,
  crmMarketing: crmMarketingRouter,
  crmVoice: crmVoiceRouter,
  crmChat: crmChatRouter,
  crmPerformance: crmPerformanceRouter,
  crmAi: crmAiRouter,
  aiMetrics: aiMetricsRouter,
  crmTemplates: crmTemplatesRouter,
  crmFollowUp: crmFollowUpRouter,
  crmDistribution: crmDistributionRouter,
  crmTimeAlerts: crmTimeAlertsRouter,
  crmPermissions: crmPermissionsRouter,
  crmFipe: crmFipeRouter,
  crmSellerStats: crmSellerStatsRouter,
  finCategories: finCategoriesRouter,
  finTransactions: finTransactionsRouter,
  fuel: fuelRouter,
  suppliers: supplierRouter,
  pvChamados: pvChamadosRouter,
  pvGastos: pvGastosRouter,
  pvOrcamentos: pvOrcamentosRouter,
  pvOficinas: pvOficinasRouter,
  mktStrategies: mktStrategiesRouter,
  mktTasks: mktTasksRouter,

  // ===== DASHBOARD (Painel Administrativo — resumo agregado do mês) =====
  dashboard: router({
    summary: adminProcedure
      .input(z.object({ month: z.number().int().min(0).max(11), year: z.number().int() }))
      .query(async ({ input }) => {
        const { month, year } = input;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const inMonth = (createdAt: any, m: number, y: number) => {
          if (!createdAt) return false;
          const d = new Date(createdAt);
          return d.getMonth() === m && d.getFullYear() === y;
        };
        const pct = (cur: number, prev: number) =>
          prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

        const [allSales, allFei, allSellers, allPv] = await Promise.all([
          db.listSales(),
          db.listFeiRecords(),
          db.listSellers(false),
          db.listPvChamados({}),
        ]);

        const salesMonth = allSales.filter((s: any) => inMonth(s.createdAt, month, year));
        const salesPrev = allSales.filter((s: any) => inMonth(s.createdAt, prevMonth, prevYear));
        const feiMonth = allFei.filter((f: any) => inMonth(f.createdAt, month, year));
        const pvMonth = allPv.filter((c: any) => inMonth(c.createdAt, month, year));

        const revenueOf = (rows: any[]) =>
          rows.filter((s) => s.status === "approved").reduce((sum, s) => sum + (Number(s.value) || 0), 0);
        const currentRevenue = revenueOf(salesMonth);
        const previousRevenue = revenueOf(salesPrev);
        const salesApproved = salesMonth.filter((s: any) => s.status === "approved").length;
        const salesApprovedPrev = salesPrev.filter((s: any) => s.status === "approved").length;

        const activeSellers = allSellers.filter((s: any) => s.active);
        const vendedores = activeSellers.filter((s: any) => !s.department || s.department === "vendas");
        const nameById = new Map<number, string>(allSellers.map((s: any) => [s.id, s.nickname || s.name]));
        const sellerNameOf = (id: number) => nameById.get(id) || `#${id}`;

        // KPIs por vendedor no mês (vendas aprovadas, fichas F&I, pontos)
        const salesBySeller: Record<number, number> = {};
        const pointsBySeller: Record<number, number> = {};
        salesMonth.filter((s: any) => s.status === "approved").forEach((s: any) => {
          salesBySeller[s.sellerId] = (salesBySeller[s.sellerId] || 0) + 1;
          pointsBySeller[s.sellerId] = (pointsBySeller[s.sellerId] || 0) + (Number(s.points) || 0);
        });
        const feiBySeller: Record<number, number> = {};
        feiMonth.forEach((f: any) => { feiBySeller[f.sellerId] = (feiBySeller[f.sellerId] || 0) + 1; });

        const topEquipe = vendedores.map((v: any) => ({
          id: v.id,
          name: v.name,
          nickname: v.nickname ?? null,
          photoUrl: v.photoUrl ?? null,
          vendas: salesBySeller[v.id] || 0,
          fei: feiBySeller[v.id] || 0,
          pontos: pointsBySeller[v.id] || 0,
        }));

        return {
          month,
          year,
          vendas: {
            approved: salesApproved,
            pending: salesMonth.filter((s: any) => s.status === "pending").length,
            total: salesMonth.length,
            revenue: currentRevenue,
            items: salesMonth.map((s: any) => ({
              id: s.id, customerName: s.customerName, vehicleModel: s.vehicleModel,
              sellerId: s.sellerId, sellerName: sellerNameOf(s.sellerId),
              value: Number(s.value) || 0, status: s.status, createdAt: s.createdAt,
            })),
          },
          fei: {
            approved: feiMonth.filter((f: any) => f.status === "approved").length,
            pending: feiMonth.filter((f: any) => f.status === "pending").length,
            total: feiMonth.length,
            // financedValue está em centavos no banco — normaliza para reais
            financedTotal: Math.round(
              feiMonth.filter((f: any) => f.status === "approved").reduce((sum: number, f: any) => sum + (Number(f.financedValue) || 0), 0) / 100
            ),
            items: feiMonth.map((f: any) => ({
              id: f.id, customerName: f.customerName, bankName: f.bankName, vehiclePlate: f.vehiclePlate,
              financedValue: Math.round((Number(f.financedValue) || 0) / 100),
              sellerId: f.sellerId, sellerName: sellerNameOf(f.sellerId), status: f.status, createdAt: f.createdAt,
            })),
          },
          posvenda: {
            total: pvMonth.length,
            abertos: pvMonth.filter((c: any) => c.status === "aberto").length,
            emServico: pvMonth.filter((c: any) => c.status === "em_servico").length,
            finalizados: pvMonth.filter((c: any) => c.status === "finalizado" || c.status === "entregue").length,
            items: pvMonth.map((c: any) => ({
              id: c.id, ticketNumber: c.ticketNumber, clienteNome: c.clienteNome,
              carroModelo: c.carroModelo, carroPlaca: c.carroPlaca, status: c.status, createdAt: c.createdAt,
            })),
          },
          equipe: {
            vendedoresAtivos: vendedores.length,
            totalAtivos: activeSellers.length,
            sellers: activeSellers.map((s: any) => ({
              id: s.id, name: s.name, nickname: s.nickname ?? null,
              department: s.department ?? null, active: s.active, photoUrl: s.photoUrl ?? null,
            })),
          },
          topEquipe,
          trend: {
            revenue: { current: currentRevenue, previous: previousRevenue, pct: pct(currentRevenue, previousRevenue) },
            vendas: { current: salesApproved, previous: salesApprovedPrev, pct: pct(salesApproved, salesApprovedPrev) },
          },
        };
      }),
  }),

  // ===== IAM CONFIG (Admin) =====
  iamConfig: router({
    get: publicProcedure.query(async () => {
      return await db.getIamConfig();
    }),
    update: adminProcedure.input(z.object({
      dayContext: z.enum(["normal", "feirao", "movimento_fraco", "meta_apertada", "fim_de_mes", "inicio_de_mes", "promocao", "lancamento", "treinamento"]).optional(),
      dayContextCustom: z.string().nullable().optional(),
      customGreeting: z.string().nullable().optional(),
      extraInstructions: z.string().nullable().optional(),
      alertMessage: z.string().nullable().optional(),
      alertActive: z.boolean().optional(),
      weeklyFocus: z.string().nullable().optional(),
      financingRate: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      return await db.updateIamConfig({ ...input, updatedBy: ctx.user.name || "admin" } as any);
    }),
  }),

  // ===== IAM - SUPER AGENTE IA AUTOMOTIVO =====
  aiSales: router({
    analyzeConversation: publicProcedure.input(z.object({
      sellerId: z.number(),
      imageUrl: z.string().optional(),
      textMessage: z.string().optional(),
      context: z.string().optional(),
      category: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Buscar contexto configurado pelo admin
      const iamCfg = await db.getIamConfig();
      const adminContext = iamCfg ? `\n\n=== CONTEXTO ATUAL DA LOJA (definido pelo gerente) ===\nSituação: ${iamCfg.dayContext === "normal" ? "Dia normal" : iamCfg.dayContext === "feirao" ? "FEIRÃO em andamento! Urgência máxima!" : iamCfg.dayContext === "movimento_fraco" ? "Movimento FRACO - precisa acelerar!" : iamCfg.dayContext === "meta_apertada" ? "META APERTADA - foco total em fechar!" : iamCfg.dayContext === "fim_de_mes" ? "FIM DE MÊS - últimos dias pra bater meta!" : iamCfg.dayContext === "inicio_de_mes" ? "INÍCIO DE MÊS - hora de plantar pra colher!" : iamCfg.dayContext === "promocao" ? "PROMOÇÃO ativa! Use isso como argumento!" : iamCfg.dayContext === "lancamento" ? "LANÇAMENTO de veículos! Destaque as novidades!" : "TREINAMENTO - foco em aprender e melhorar!"}\n${iamCfg.dayContextCustom ? "Detalhes: " + iamCfg.dayContextCustom : ""}\n${iamCfg.extraInstructions ? "Instruções do gerente: " + iamCfg.extraInstructions : ""}\n${iamCfg.weeklyFocus ? "Foco da semana: " + iamCfg.weeklyFocus : ""}` : "";

      const systemPrompt = `Você é o IAM - Inteligência Artificial Master do universo automotivo. Você é o agente MAIS COMPLETO e INTELIGENTE do mercado de carros, dominando TODAS as áreas abaixo com maestria absoluta.${adminContext}

=== SUAS ESPECIALIDADES ===

1. VENDAS DE ALTA PERFORMANCE
- Vendedor de carros com 20+ anos de experiência em usados, seminovos e 0km
- Mestre em análise de perfil comportamental DISC (Dominante, Influente, Estável, Conforme)
- Expert em técnicas de fechamento: urgência, escassez, ancoragem, espelhamento
- Quebra de QUALQUER objeção: preço, troca, financiamento, "vou pensar", concorrência
- Identifica sinais de compra e orienta o momento exato de fechar
- Scripts prontos para copiar e enviar no WhatsApp

2. MARKETING E CONTEÚDO VIRAL
- Estrategista de marketing digital para lojas de carros
- Criador de conteúdos virais para Instagram, TikTok, YouTube, Facebook
- Roteirista de vídeos que vendem (Reels, Stories, vídeos longos)
- Ideias de campanhas criativas e sazonais
- Copywriting persuasivo para anúncios
- Estratégias de tráfego pago e orgânico
- Criação de headlines, CTAs e textos que convertem

3. CONSIGNAÇÃO DE VEÍCULOS
- Expert em negociação com proprietários de veículos
- Argumentos para convencer o dono a consignar
- Quebra de objeções do proprietário (preço, prazo, confiança)
- Contratos e termos de consignação
- Estratégias de captação de veículos
- Precificação e margem de lucro

4. FINANCIAMENTO AUTOMOTIVO
- Conhecimento profundo de financiamento CDC, leasing, consórcio
- Simulação de parcelas e argumentos de venda com financiamento
- Bancos e financeiras (Santander, BV, Itaú, Bradesco, Pan, Omni)
- Estratégias para aprovar clientes com score baixo
- Como usar o financiamento como ferramenta de fechamento
- Entrada, parcelas, taxa de juros - como apresentar ao cliente

5. DESPACHANTE E DOCUMENTAÇÃO
- Transferência de veículos (CRV-e, ATPV-e)
- Emplacamento, licenciamento, IPVA
- Multas, débitos, restrições
- Vistoria cautelar e laudo
- Documentos necessários para compra/venda
- Prazos legais e procedimentos

6. GESTÃO DE EQUIPE
- Motivação de vendedores e SDRs
- Definição de metas realistas e desafiadoras
- Técnicas de liderança para gerentes de loja
- Reuniões de equipe produtivas
- Feedback construtivo
- Como lidar com vendedor desmotivado
- Gamificação e competições internas

7. AGENDAMENTO E RESGATE DE LEADS
- Scripts de ligação para agendar visitas
- Técnicas de follow-up que funcionam
- Resgate de leads frios e inativos
- Gatilhos mentais para fazer o cliente ir à loja
- Mensagens de WhatsApp que geram resposta
- Estratégias de reaquecimento

8. PÓS-VENDA E FIDELIZAÇÃO
- Programa de indicação (como pedir indicação sem ser chato)
- Pesquisa de satisfação
- Manutenção do relacionamento pós-compra
- Resolução de problemas e reclamações
- Garantia e responsabilidades legais
- Como transformar cliente em fã da loja

9. GATILHOS MENTAIS AVANÇADOS
- Urgência: "Só hoje", "Última unidade"
- Escassez: "Muita procura", "Já tem gente interessado"
- Prova social: "Vendemos 50 carros esse mês"
- Autoridade: "Somos referência na região"
- Reciprocidade: "Vou fazer algo especial pra você"
- Compromisso: "Você gostou do carro, certo?"
- Ancoragem de preço: como apresentar valores
- Storytelling: histórias que vendem

10. LEGISLAÇÃO E SAÚDE DO VEÍCULO
- Código de Defesa do Consumidor aplicado a veículos
- Garantia legal (90 dias usados, 1 ano novos)
- Vícios ocultos e aparentes
- Recall e responsabilidades
- Dicas de manutenção preventiva
- Como explicar a saúde do carro ao cliente

=== REGRAS DE COMPORTAMENTO ===
- SEMPRE responda em português brasileiro
- Seja DIRETO e PRÁTICO - o vendedor precisa de resposta rápida
- Dê exemplos de FRASES PRONTAS para copiar e enviar
- Use linguagem HUMANIZADA - como se fosse um mentor experiente
- Adapte o tom: informal mas profissional
- Use emojis com moderação para facilitar a leitura
- Quando analisar print de conversa: identifique o perfil do cliente e sugira a resposta exata
- Quando for sobre marketing: dê ideias ESPECÍFICAS com roteiros prontos
- Quando for sobre gestão: seja motivador e estratégico
- Quando for sobre documentação: seja preciso e claro
- SEMPRE termine com uma dica extra ou insight poderoso

=== FORMATO DA RESPOSTA ===
Adapte o formato conforme o assunto, mas sempre inclua:
- Análise da situação
- Estratégia recomendada
- Ação prática (frase, script, roteiro, ou passo a passo)
- Dica extra de mestre`;

      const userContent: any[] = [];
      
      if (input.imageUrl) {
        userContent.push({
          type: "image_url" as const,
          image_url: { url: input.imageUrl, detail: "high" as const },
        });
        userContent.push({
          type: "text" as const,
          text: "Analise esta imagem (pode ser print de conversa, anúncio, documento, etc). Identifique o contexto e dê a melhor orientação possível.",
        });
      }
      
      if (input.textMessage) {
        userContent.push({
          type: "text" as const,
          text: input.textMessage,
        });
      }
      
      if (input.context) {
        userContent.push({
          type: "text" as const,
          text: `Contexto adicional: ${input.context}`,
        });
      }

      if (input.category) {
        userContent.push({
          type: "text" as const,
          text: `Categoria da consulta: ${input.category}. Foque sua resposta nesta área de especialidade.`,
        });
      }

      if (userContent.length === 0) {
        return { response: "Envie um print da conversa, descreva a situação ou escolha uma categoria para eu ajudar!" };
      }

      const finalContent = userContent.length === 1 && userContent[0].type === "text" 
        ? userContent[0].text 
        : userContent;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalContent },
        ],
      });

      return { response: result.choices[0]?.message?.content || "Não foi possível analisar. Tente novamente." };
    }),

    uploadImage: publicProcedure.input(z.object({
      sellerId: z.number(),
      base64: base64Schema,
      filename: z.string(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const key = `ai-sales/${input.sellerId}/${Date.now()}-${input.filename}`;
      const { url } = await storagePut(key, buffer, "image/jpeg");
      return { url };
    }),
  }),

  // ===== DOCUMENTOS DE VENDA (Vendedor ↔ Despachante) =====
  saleDocuments: router({
    // Vendedor: listar seus documentos de venda
    myDocs: protectedProcedure.input(z.object({ sellerId: z.number() })).query(async ({ input, ctx }) => {
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId && input.sellerId !== privacySellerId) {
        throw new Error('Voc\u00ea s\u00f3 pode acessar seus pr\u00f3prios documentos');
      }
      return db.listSaleDocumentsBySeller(privacySellerId ?? input.sellerId);
    }),
    // Vendedor: contar documentos pendentes
    pendingCount: protectedProcedure.input(z.object({ sellerId: z.number() })).query(async ({ input, ctx }) => {
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId && input.sellerId !== privacySellerId) {
        throw new Error('Voc\u00ea s\u00f3 pode acessar seus pr\u00f3prios documentos');
      }
      return db.countPendingDocsBySeller(privacySellerId ?? input.sellerId);
    }),
    // Vendedor: upload de CNH
    uploadCnh: protectedProcedure.input(z.object({
      id: z.number(),
      sellerId: z.number(),
      base64: base64Schema,
      filename: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const privacySellerId = await getPrivacySellerId(ctx);
      const effectiveSellerId = privacySellerId ?? input.sellerId;
      if (privacySellerId && input.sellerId !== privacySellerId) {
        throw new Error('Voc\u00ea s\u00f3 pode enviar documentos como voc\u00ea mesmo');
      }
      const doc = await db.getSaleDocumentById(input.id);
      if (!doc || doc.sellerId !== effectiveSellerId) {
        throw new Error('Documento n\u00e3o encontrado ou n\u00e3o pertence a este vendedor');
      }
      const buffer = Buffer.from(input.base64, 'base64');
      const key = `sale-docs/${effectiveSellerId}/cnh-${Date.now()}-${input.filename}`;
      const { url } = await storagePut(key, buffer, 'image/jpeg');
      const result = await db.uploadSaleDocCnh(input.id, url, key);
      // Se ficou completo, notificar despachante
      if (result.docStatus === 'completo') {
        await db.createNotification({
          targetType: 'admin',
          type: 'docs_complete',
          title: 'Documentos completos para transfer\u00eancia!',
          message: `Vendedor enviou CNH e Comprovante para ${result.vehicleModel || 've\u00edculo'} - Pronto para despachante!`,
          actionUrl: await buildCurrentTenantPath('/admin/documentos'),
        });
      }
      return { success: true, docStatus: result.docStatus };
    }),
    // Vendedor: upload de Comprovante de Resid\u00eancia
    uploadComprovante: protectedProcedure.input(z.object({
      id: z.number(),
      sellerId: z.number(),
      base64: base64Schema,
      filename: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const privacySellerId = await getPrivacySellerId(ctx);
      const effectiveSellerId = privacySellerId ?? input.sellerId;
      if (privacySellerId && input.sellerId !== privacySellerId) {
        throw new Error('Voc\u00ea s\u00f3 pode enviar documentos como voc\u00ea mesmo');
      }
      const doc = await db.getSaleDocumentById(input.id);
      if (!doc || doc.sellerId !== effectiveSellerId) {
        throw new Error('Documento n\u00e3o encontrado ou n\u00e3o pertence a este vendedor');
      }
      const buffer = Buffer.from(input.base64, 'base64');
      const key = `sale-docs/${effectiveSellerId}/comprovante-${Date.now()}-${input.filename}`;
      const { url } = await storagePut(key, buffer, 'image/jpeg');
      const result = await db.uploadSaleDocComprovante(input.id, url, key);
      if (result.docStatus === 'completo') {
        await db.createNotification({
          targetType: 'admin',
          type: 'docs_complete',
          title: 'Documentos completos para transfer\u00eancia!',
          message: `Vendedor enviou CNH e Comprovante para ${result.vehicleModel || 've\u00edculo'} - Pronto para despachante!`,
          actionUrl: await buildCurrentTenantPath('/admin/documentos'),
        });
      }
      return { success: true, docStatus: result.docStatus };
    }),
    // Admin/Despachante: listar todos os documentos
    listAll: adminProcedure
      .input(z.object({
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        dispatchStatus: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const all = await db.listAllSaleDocuments();
        const counts = {
          total: all.length,
          aguardando: all.filter((d: any) => d.dispatchStatus === "aguardando_docs").length,
          recebidos: all.filter((d: any) => d.dispatchStatus === "docs_enviados").length,
          emTransferencia: all.filter((d: any) => d.dispatchStatus === "em_transferencia").length,
          transferidos: all.filter((d: any) => d.dispatchStatus === "transferido").length,
        };
        const status = input?.dispatchStatus;
        let filtered = status && status !== "todos" ? all.filter((d: any) => d.dispatchStatus === status) : all;
        const search = input?.search?.toLowerCase().trim();
        if (search) {
          filtered = filtered.filter((d: any) =>
            (d.clienteNome || "").toLowerCase().includes(search) ||
            (d.vehicleModel || "").toLowerCase().includes(search) ||
            (d.vehiclePlate || "").toLowerCase().includes(search)
          );
        }
        const offset = input?.offset ?? 0;
        const limit = input?.limit ?? 20;
        return { items: filtered.slice(offset, offset + limit), total: filtered.length, counts };
      }),
    // Despachante: marcar como em transfer\u00eancia
    markInTransfer: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markSaleDocInTransfer(input.id);
      return { success: true };
    }),
    // Despachante: marcar como transferido com documento emitido
    markTransferred: adminProcedure.input(z.object({
      id: z.number(),
      base64: base64Schema,
      filename: z.string(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, 'base64');
      const key = `sale-docs/emitidos/${Date.now()}-${input.filename}`;
      const { url } = await storagePut(key, buffer, 'application/pdf');
      await db.markSaleDocTransferred(input.id, url, key);
      // Enviar push para o vendedor informando que o documento foi transferido
      try {
        // Buscar o documento pelo id do sale_document
        const doc = await db.getSaleDocumentById(input.id);
        if (doc && doc.sellerId) {
          const seller = await db.getSellerById(doc.sellerId);
          if (seller) {
            sendPushDocTransferido(seller.id, doc.vehicleModel || 'veículo').catch(console.error);
          }
        }
      } catch (e) { console.error('Erro ao enviar push doc transferido:', e); }
      return { success: true };
    }),
    // Admin: update notes on a document
    updateNotes: adminProcedure.input(z.object({
      id: z.number(),
      notes: z.string().nullable(),
    })).mutation(async ({ input }) => {
      await db.updateSaleDocNotes(input.id, input.notes);
      return { success: true };
    }),
    // Admin: delete a document record
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteSaleDocument(input.id);
      return { success: true };
    }),
  }),

  // ===== ESTOQUE DE VEÍCULOS =====
  inventory: inventoryRouter,

  // ===== WHATSAPP (Z-API) =====
  whatsapp: whatsappRouter,

  managerMentor: managerMentorRouter,

  managerPerms: router({
    // Listar módulos disponíveis
    modules: publicProcedure.query(() => db.AVAILABLE_MODULES),
    // Buscar permissões de um gerente
    get: adminProcedure.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
      return db.getManagerPermissions(input.sellerId);
    }),
    // Definir permissões de um gerente (admin)
    set: adminProcedure.input(z.object({
      sellerId: z.number(),
      permissions: z.array(z.object({
        module: z.string(),
        canView: z.boolean(),
        canEdit: z.boolean(),
      })),
    })).mutation(async ({ input }) => {
      await db.setManagerPermissions(input.sellerId, input.permissions);
      return { success: true };
    }),
    // Gerente verifica suas próprias permissões
    myPermissions: publicProcedure.query(async ({ ctx }) => {
      try {
        const { parse: parseCookie } = await import("cookie");
        const cookies = parseCookie(ctx.req.headers.cookie || "");
        const sellerToken = cookies.seller_session;
        if (sellerToken) {
          const payload = jwt.verify(sellerToken, ENV.cookieSecret) as { sellerId: number; username: string };
          const seller = await db.getSellerById(payload.sellerId);
          if (seller && seller.active && seller.sellerRole === 'gerente') {
            return db.getManagerPermissions(seller.id);
          }
        }
      } catch (e) {}
      return [];
    }),
  }),

  // ===== VIRADA DE MÊS / HISTÓRICO =====
  monthTurnover: router({
    // Executar virada de mês (admin only)
    execute: adminProcedure.input(z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2024).max(2030),
    })).mutation(async ({ input }) => {
      return db.executeMonthTurnover(input.month, input.year);
    }),

    // Consultar snapshot de um mês específico
    getSnapshot: publicProcedure.input(z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2024).max(2030),
    })).query(async ({ input }) => {
      const sellers = await db.getMonthlySnapshots(input.month, input.year);
      const competitions = await db.getCompetitionSnapshotsByMonth(input.month, input.year);
      
      // Fallback: se não há snapshot, buscar dados de vendas ao vivo do mês
      if (!sellers || sellers.length === 0) {
        const liveRanking = await db.getMonthlyRanking(input.month, input.year);
        if (liveRanking && liveRanking.length > 0) {
          // Buscar F&I e agendamentos do mês para enriquecer o fallback
          const startStr = `${input.year}-${String(input.month).padStart(2, '0')}-01 00:00:00`;
          const endMonth = input.month === 12 ? 1 : input.month + 1;
          const endYear = input.month === 12 ? input.year + 1 : input.year;
          const endStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01 00:00:00`;
          
          const feiMap = new Map<number, number>();
          const agendMap = new Map<number, number>();
          try {
            const dbConn = await db.getDbInstance();
            if (dbConn) {
              const { feiRecords, sdrRecords } = await import('../drizzle/schema');
              const { and: andOp, eq: eqOp, sql: sqlOp, gte: gteOp, lt: ltOp } = await import('drizzle-orm');
              const feiRows = await dbConn.select({ sellerId: feiRecords.sellerId, cnt: sqlOp`COUNT(*)`.as('cnt') })
                .from(feiRecords)
                .where(andOp(eqOp(feiRecords.status, 'approved'), gteOp(feiRecords.createdAt, new Date(startStr)), ltOp(feiRecords.createdAt, new Date(endStr))))
                .groupBy(feiRecords.sellerId);
              for (const row of feiRows) feiMap.set(row.sellerId, Number(row.cnt));
              const sdrRows = await dbConn.select({ sellerId: sdrRecords.sellerId, cnt: sqlOp`COUNT(*)`.as('cnt') })
                .from(sdrRecords)
                .where(andOp(eqOp(sdrRecords.status, 'approved'), eqOp(sdrRecords.type, 'agendamento'), gteOp(sdrRecords.createdAt, new Date(startStr)), ltOp(sdrRecords.createdAt, new Date(endStr))))
                .groupBy(sdrRecords.sellerId);
              for (const row of sdrRows) agendMap.set(row.sellerId, Number(row.cnt));
            }
          } catch (e) { /* ignore - F&I/agendamento data is optional */ }
          
          const liveSellers = liveRanking.map((r, idx) => ({
            id: r.seller.id,
            sellerId: r.seller.id,
            sellerName: r.seller.name,
            sellerNickname: r.seller.nickname || '',
            sellerPhotoUrl: r.seller.competitionPhotoUrl || r.seller.photoUrl || null,
            department: r.seller.department,
            totalSales: r.salesCount,
            totalPoints: r.points,
            totalFei: feiMap.get(r.seller.id) || 0,
            totalAgendamentos: agendMap.get(r.seller.id) || 0,
            rank: idx + 1,
            month: input.month,
            year: input.year,
          }));
          return { sellers: liveSellers, competitions, isFallback: true };
        }
      }
      return { sellers, competitions, isFallback: false };
    }),

    // Listar meses disponíveis com snapshot
    availableMonths: publicProcedure.query(async () => {
      return db.listAvailableMonths();
    }),

    // Resetar contadores manualmente (admin only)
    resetCounters: adminProcedure.mutation(async () => {
      return db.resetMonthlyCounters();
    }),
  }),

  // ===== ANIVERSARIANTES =====
  birthday: router({
    // Buscar aniversariantes do dia (de sales + crmLeads)
    todayBirthdays: adminProcedure.query(async () => {
      const database = await db.getDbInstance();
      if (!database) return [];
      const { sales, crmLeads } = await import('../drizzle/schema');
      const { sql: sqlOp } = await import('drizzle-orm');
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const pattern = `${dd}/${mm}`;
      
      // Buscar de sales
      const salesBdays = await database.select({
        id: sales.id, name: sales.customerName, phone: sales.customerPhone,
        email: sales.customerEmail, birthday: sales.customerBirthday,
        vehicleModel: sales.vehicleModel,
      }).from(sales).where(sqlOp`${sales.customerBirthday} LIKE ${pattern + '%'}`);
      
      // Buscar de crmLeads
      const leadBdays = await database.select({
        id: crmLeads.id, name: crmLeads.name, phone: crmLeads.phone,
        email: crmLeads.email, birthday: crmLeads.birthday,
      }).from(crmLeads).where(sqlOp`${crmLeads.birthday} LIKE ${pattern + '%'}`);
      
      const results: Array<{ id: number; name: string | null; phone: string | null; email: string | null; birthday: string | null; source: string; vehicleModel?: string | null; sent?: boolean }> = [];
      const seenPhones = new Set<string>();
      
      for (const s of salesBdays) {
        const key = s.phone?.replace(/\D/g, '') || `sale-${s.id}`;
        if (!seenPhones.has(key)) {
          seenPhones.add(key);
          results.push({ ...s, source: 'venda', vehicleModel: s.vehicleModel });
        }
      }
      for (const l of leadBdays) {
        const key = l.phone?.replace(/\D/g, '') || `lead-${l.id}`;
        if (!seenPhones.has(key)) {
          seenPhones.add(key);
          results.push({ ...l, source: 'lead' });
        }
      }
      return results;
    }),

    // Enviar parabéns via WhatsApp
    sendBirthdayMessage: adminProcedure.input(z.object({
      phone: z.string(),
      name: z.string(),
      customMessage: z.string().optional(),
    })).mutation(async ({ input }) => {
      const name = input.name.split(' ')[0]; // Primeiro nome
      const message = input.customMessage || 
        `\u{1F382} Parabéns, ${name}! \u{1F389}\n\nA equipe *Kafka Multimarcas* deseja a você um feliz aniversário! \u{1F31F}\n\nQue este novo ciclo seja repleto de conquistas, saúde e muita prosperidade! \u{1F680}\n\nConte sempre conosco! \u{2764}\uFE0F\n\n_Kafka Multimarcas - Onde seus sonhos ganham rodas!_`;
      
      const result = await zapi.sendText(input.phone, message);
      if (!result.success) throw new Error(result.error || 'Erro ao enviar mensagem');
      return { success: true, message: 'Parabéns enviado com sucesso!' };
    }),

    // Enviar parabéns em massa para todos os aniversariantes
    sendBulkBirthday: adminProcedure.input(z.object({
      contacts: z.array(z.object({
        phone: z.string(),
        name: z.string(),
      })),
      customMessage: z.string().optional(),
    })).mutation(async ({ input }) => {
      let sent = 0;
      let failed = 0;
      for (const contact of input.contacts) {
        try {
          const name = contact.name.split(' ')[0];
          const message = input.customMessage?.replace('{nome}', name) || 
            `\u{1F382} Parabéns, ${name}! \u{1F389}\n\nA equipe *Kafka Multimarcas* deseja a você um feliz aniversário! \u{1F31F}\n\nQue este novo ciclo seja repleto de conquistas, saúde e muita prosperidade! \u{1F680}\n\nConte sempre conosco! \u{2764}\uFE0F\n\n_Kafka Multimarcas - Onde seus sonhos ganham rodas!_`;
          const result = await zapi.sendText(contact.phone, message);
          if (result.success) sent++;
          else failed++;
          // Delay entre mensagens para evitar ban
          await new Promise(r => setTimeout(r, 3000));
        } catch {
          failed++;
        }
      }
      return { sent, failed, total: input.contacts.length };
    }),
  }),

  // ===== SUPER ADMIN (MULTI-TENANT) =====
  superAdmin: superAdminRouter,

  // ===== CENTRAL DE RESULTADOS (VENDEDOR) =====
  sellerResults: router({
    // Dashboard completo do vendedor
    getDashboard: protectedProcedure.input(z.object({
      sellerId: z.number(),
      month: z.number().min(1).max(12).optional(),
      year: z.number().optional(),
    })).query(async ({ input, ctx }) => {
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId && input.sellerId !== privacySellerId) {
        throw new Error('Você só pode acessar seus próprios resultados');
      }
      input.sellerId = privacySellerId ?? input.sellerId;
      const now = new Date();
      const month = input.month || (now.getMonth() + 1);
      const year = input.year || now.getFullYear();
      
      // 1. Vendas aprovadas do mês
      const monthSales = await db.getApprovedSalesForMonth(input.sellerId, month, year);
      const salesCount = monthSales.length;
      
      // 2. Regras de comissão
      const rules = await db.getCommissionRules();
      const commission = db.calculateCommission(salesCount, rules);
      
      // 3. Vales do mês
      const advances = await db.getSellerAdvances(input.sellerId, month, year);
      const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
      
      // 4. Ranking
      const ranking = await db.getSalesRankingForMonth(month, year);
      const myPosition = ranking.find(r => r.sellerId === input.sellerId);
      const leader = ranking[0] || null;
      
      // 5. Meta individual
      const allGoals = await db.getGoalsForMonth(month, year);
      const myGoal = allGoals.find((g: any) => g.type === 'individual' && g.sellerId === input.sellerId && g.category === 'vendas');
      
      // 5.5 Bônus do vendedor (carros bônus, campanhas, premiações)
      const sellerBonusList = await db.listSellerBonuses({ sellerId: input.sellerId, month, year });
      const approvedBonuses = sellerBonusList.filter((b: any) => b.status === 'approved' || b.status === 'paid');
      const pendingBonuses = sellerBonusList.filter((b: any) => b.status === 'pending');
      const totalApprovedBonuses = approvedBonuses.reduce((sum: number, b: any) => sum + b.amount, 0);
      
      // 5.6 Campanhas ativas (carros bônus disponíveis)
      const activeBonusVehicles = await db.listBonusVehicles(true);
      
      // 6. Cálculo do ganho previsto (com bônus de carro)
      const netEarnings = commission.helpAllowance + commission.totalCommission + commission.bonus + totalApprovedBonuses - totalAdvances;
      
      // 7. Simulação: se vender +1, +2, etc
      const simulations = [];
      for (let extra = 1; extra <= 3; extra++) {
        const simCount = salesCount + extra;
        const simComm = db.calculateCommission(simCount, rules);
        simulations.push({
          extraSales: extra,
          totalSales: simCount,
          netEarnings: simComm.helpAllowance + simComm.commissionPerSale * simCount + simComm.bonus - totalAdvances,
          bonus: simComm.bonus,
          bonusDescription: simComm.bonusDescription,
          newTier: simComm.commissionPerSale !== commission.commissionPerSale || simComm.helpAllowance !== commission.helpAllowance,
        });
      }
      
      // 8. Bônus desbloqueáveis
      const unlockableBonuses = rules.filter(r => r.bonus > 0 && r.minSales > salesCount).map(r => ({
        salesNeeded: r.minSales,
        remaining: r.minSales - salesCount,
        bonus: r.bonus,
        description: r.bonusDescription,
      }));
      
      // 9. Medalhas
      const badges = [];
      if (salesCount >= 5) badges.push({ level: 'bronze', title: 'Vendedor em Evolução', icon: '🥉', threshold: 5 });
      if (salesCount >= 8) badges.push({ level: 'silver', title: 'Alta Performance', icon: '🥈', threshold: 8 });
      if (salesCount >= 10) badges.push({ level: 'gold', title: 'Elite Kafka', icon: '🥇', threshold: 10 });
      if (salesCount >= 12) badges.push({ level: 'legend', title: 'Lenda Kafka', icon: '👑', threshold: 12 });
      
      // Próxima medalha
      const allBadges = [
        { level: 'bronze', title: 'Vendedor em Evolução', icon: '🥉', threshold: 5 },
        { level: 'silver', title: 'Alta Performance', icon: '🥈', threshold: 8 },
        { level: 'gold', title: 'Elite Kafka', icon: '🥇', threshold: 10 },
        { level: 'legend', title: 'Lenda Kafka', icon: '👑', threshold: 12 },
      ];
      const nextBadge = allBadges.find(b => b.threshold > salesCount) || null;
      
      return {
        month,
        year,
        salesCount,
        // Card 1 - Ganho Previsto
        earnings: {
          helpAllowance: commission.helpAllowance,
          totalCommission: commission.totalCommission,
          commissionPerSale: commission.commissionPerSale,
          bonus: commission.bonus,
          bonusDescription: commission.bonusDescription,
          totalAdvances,
          netEarnings,
        },
        // Card 2 - Performance
        performance: {
          salesCount,
          goalTarget: myGoal?.targetValue || 0,
          goalProgress: myGoal ? Math.round((salesCount / myGoal.targetValue) * 100) : 0,
          remaining: myGoal ? Math.max(0, myGoal.targetValue - salesCount) : 0,
        },
        // Card 3 - Ranking
        ranking: {
          myPosition: myPosition?.position || 0,
          mySales: salesCount,
          leader: leader ? { name: leader.name, salesCount: leader.salesCount, position: 1 } : null,
          top5: ranking.slice(0, 5),
          totalSellers: ranking.length,
          gapToLeader: leader ? leader.salesCount - salesCount : 0,
        },
        // Card 4 - Simulador
        simulations,
        unlockableBonuses,
        // Card 5 - Vales
        advances: {
          total: totalAdvances,
          items: advances,
        },
        // Card 6 - Resumo Financeiro
        summary: {
          helpAllowance: commission.helpAllowance,
          totalCommission: commission.totalCommission,
          bonus: commission.bonus,
          totalAdvances,
          netEarnings,
        },
        // Gamificação
        badges,
        nextBadge,
        // Bônus de carros/campanhas
        sellerBonuses: {
          approved: approvedBonuses,
          pending: pendingBonuses,
          totalApproved: totalApprovedBonuses,
          all: sellerBonusList,
        },
        // Campanhas ativas
        activeCampaigns: activeBonusVehicles.map(bv => ({
          id: bv.id,
          vehicleModel: bv.vehicleModel,
          plate: bv.plate,
          bonusAmount: bv.bonusAmount,
          campaignName: bv.campaignName,
          campaignRules: bv.campaignRules,
          startDate: bv.startDate,
          endDate: bv.endDate,
        })),
      };
    }),

    // CRUD de vales (admin/gerente)
    createAdvance: publicProcedure.input(z.object({
      sellerId: z.number(),
      amount: z.number().min(1),
      description: z.string().optional(),
      date: z.number(),
      month: z.number(),
      year: z.number(),
    })).mutation(async ({ input, ctx }) => {
      await db.createSellerAdvance({ ...input, tenantId: ctx.tenantId });
      return { success: true };
    }),

    deleteAdvance: publicProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      await db.deleteSellerAdvance(input.id);
      return { success: true };
    }),

    // Listar vales
    listAdvances: protectedProcedure.input(z.object({
      sellerId: z.number(),
      month: z.number(),
      year: z.number(),
    })).query(async ({ input, ctx }) => {
      const privacySellerId = await getPrivacySellerId(ctx);
      if (privacySellerId && input.sellerId !== privacySellerId) {
        throw new Error('Você só pode acessar seus próprios vales');
      }
      return db.getSellerAdvances(privacySellerId ?? input.sellerId, input.month, input.year);
    }),

    // Regras de comissão
    getCommissionRules: publicProcedure.query(async () => {
      return db.getCommissionRules();
    }),

    // ===== BONUS VEHICLES (CARROS BÔNUS) =====
    listBonusVehicles: publicProcedure.input(z.object({
      activeOnly: z.boolean().optional(),
    }).optional()).query(async ({ input }) => {
      return db.listBonusVehicles(input?.activeOnly || false);
    }),

    createBonusVehicle: publicProcedure.input(z.object({
      vehicleModel: z.string(),
      plate: z.string().optional(),
      bonusAmount: z.number().min(1),
      campaignName: z.string(),
      campaignRules: z.string().optional(),
      startDate: z.number(),
      endDate: z.number(),
      inventoryId: z.number().optional(), // ID do veículo no estoque
    })).mutation(async ({ input, ctx }) => {
      await db.createBonusVehicle({ ...input, active: true, tenantId: ctx.tenantId });
      return { success: true };
    }),

    updateBonusVehicle: publicProcedure.input(z.object({
      id: z.number(),
      vehicleModel: z.string().optional(),
      plate: z.string().optional(),
      bonusAmount: z.number().optional(),
      campaignName: z.string().optional(),
      campaignRules: z.string().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
      active: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateBonusVehicle(id, data);
      return { success: true };
    }),

    deleteBonusVehicle: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteBonusVehicle(input.id);
      return { success: true };
    }),

    // ===== SELLER BONUSES (BÔNUS LANÇADOS) =====
    listSellerBonuses: publicProcedure.input(z.object({
      sellerId: z.number().optional(),
      month: z.number().optional(),
      year: z.number().optional(),
      status: z.string().optional(),
    })).query(async ({ input }) => {
      return db.listSellerBonuses(input);
    }),

    updateBonusStatus: publicProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['pending', 'approved', 'rejected', 'paid']),
      rejectionReason: z.string().optional(),
    })).mutation(async ({ input }) => {
      await db.updateSellerBonusStatus(input.id, input.status, undefined, input.rejectionReason);
      return { success: true };
    }),

    // Dashboard financeiro para gestão (todos vendedores)
    financialOverview: publicProcedure.input(z.object({
      month: z.number().optional(),
      year: z.number().optional(),
    })).query(async ({ input }) => {
      const now = new Date();
      const month = input.month || (now.getMonth() + 1);
      const year = input.year || now.getFullYear();
      
      // Vendedores do dept vendas + qualquer colaborador que tenha vale/bônus no mês
      // (ex.: um Vale lançado pelo Financeiro para um colaborador de outro setor).
      const allSellers = await db.listSellers(true);
      const rules = await db.getCommissionRules();

      const fullOverview = await Promise.all(allSellers.map(async (seller: any) => {
        const monthSales = await db.getApprovedSalesForMonth(seller.id, month, year);
        const salesCount = monthSales.length;
        const commission = db.calculateCommission(salesCount, rules);
        const advances = await db.getSellerAdvances(seller.id, month, year);
        const totalAdvances = advances.reduce((sum: number, a: any) => sum + a.amount, 0);
        const bonuses = await db.listSellerBonuses({ sellerId: seller.id, month, year });
        const approvedBonuses = bonuses.filter((b: any) => b.status === 'approved' || b.status === 'paid');
        const totalBonuses = approvedBonuses.reduce((sum: number, b: any) => sum + b.amount, 0);
        const pendingBonuses = bonuses.filter((b: any) => b.status === 'pending');
        
        const netEarnings = commission.helpAllowance + commission.totalCommission + commission.bonus + totalBonuses - totalAdvances;
        
        return {
          sellerId: seller.id,
          name: seller.nickname || seller.name,
          photoUrl: seller.photoUrl,
          department: seller.department || 'vendas',
          salesCount,
          helpAllowance: commission.helpAllowance,
          totalCommission: commission.totalCommission,
          commissionBonus: commission.bonus,
          totalBonuses,
          totalAdvances,
          netEarnings,
          pendingBonusCount: pendingBonuses.length,
          advances: advances.map((a: any) => ({ id: a.id, amount: a.amount, description: a.description, date: a.date })),
        };
      }));

      // Mostra vendedores do setor de vendas + colaboradores com movimento financeiro no mês.
      const overview = fullOverview.filter((o) =>
        o.department === 'vendas' || o.totalAdvances > 0 || o.totalBonuses > 0 || o.salesCount > 0
      );

      return {
        month,
        year,
        sellers: overview.sort((a, b) => b.salesCount - a.salesCount),
        totals: {
          totalSellers: overview.length,
          totalSales: overview.reduce((s, o) => s + o.salesCount, 0),
          totalToPay: overview.reduce((s, o) => s + Math.max(0, o.netEarnings), 0),
          totalAdvances: overview.reduce((s, o) => s + o.totalAdvances, 0),
          totalBonuses: overview.reduce((s, o) => s + o.totalBonuses, 0),
        },
      };
    }),
  }),

  // ===== BUSCA GERAL POR VEÍCULO (CROSS-SETOR) =====
  vehicleSearch: router({
    byPlate: publicProcedure.input(z.object({
      plate: z.string().min(3),
    })).query(async ({ input }) => {
      const results = await db.searchAllByPlate(input.plate);
      // Enriquecer com nomes dos vendedores
      const sellersList = await db.listSellers();
      const getSeller = (id: number) => sellersList.find(s => s.id === id);
      return {
        sales: results.sales.map((s: any) => ({ ...s, sellerName: getSeller(s.sellerId)?.name || 'Desconhecido' })),
        fei: results.fei.map((f: any) => ({ ...f, sellerName: getSeller(f.sellerId)?.name || 'Desconhecido' })),
        dispatch: results.dispatch.map((d: any) => ({ ...d, sellerName: getSeller(d.sellerId)?.name || 'Desconhecido' })),
        consignment: results.consignment.map((c: any) => ({ ...c, sellerName: getSeller(c.sellerId)?.name || 'Desconhecido' })),
        sdr: results.sdr.map((s: any) => ({ ...s, sellerName: getSeller(s.sellerId)?.name || 'Desconhecido' })),
      };
    }),
  }),
});
export type AppRouter = typeof appRouter;

// ===== BILL NOTIFICATION GENERATOR =====
async function generateBillNotifications(sellerId: number) {
  try {
    const alerts = await getFinancialAlerts();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Check if we already generated notifications today for this seller
    const existingNotifs = await db.listNotifications(sellerId);
    const todayBillNotifs = existingNotifs.filter((n: any) => {
      if (!n.type?.startsWith('bill_')) return false;
      const created = new Date(n.createdAt);
      const createdStr = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
      return createdStr === todayStr;
    });

    // If already generated today, skip
    if (todayBillNotifs.length > 0) {
      console.log(`[NOTIF] Bill notifications already generated today for seller #${sellerId}, skipping`);
      return;
    }

    const tenantPath = await buildCurrentTenantPath('/financeiro');

    // Generate notifications for overdue bills
    for (const bill of alerts.overdue.slice(0, 10)) {
      const dueDate = new Date(Number(bill.dueDate));
      const dueDateFormatted = `${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
      await db.createNotification({
        sellerId,
        targetType: 'seller',
        type: 'bill_overdue',
        title: `Conta vencida: ${bill.description || 'Sem descrição'}`,
        message: `Venceu em ${dueDateFormatted} - R$ ${Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${bill.supplier ? ` (${bill.supplier})` : ''}`,
        actionUrl: `${tenantPath}?tab=contas&contaId=${bill.id}`,
      });
    }

    // Generate notifications for bills due today
    for (const bill of alerts.dueToday) {
      await db.createNotification({
        sellerId,
        targetType: 'seller',
        type: 'bill_due_today',
        title: `Conta vence HOJE: ${bill.description || 'Sem descrição'}`,
        message: `R$ ${Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${bill.supplier ? ` (${bill.supplier})` : ''}`,
        actionUrl: `${tenantPath}?tab=contas&contaId=${bill.id}`,
      });
    }

    // Generate a summary notification for bills due tomorrow
    if (alerts.dueTomorrow.length > 0) {
      const totalTomorrow = alerts.dueTomorrow.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);
      await db.createNotification({
        sellerId,
        targetType: 'seller',
        type: 'bill_due_tomorrow',
        title: `${alerts.dueTomorrow.length} conta(s) vencem amanhã`,
        message: `Total: R$ ${totalTomorrow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        actionUrl: `${tenantPath}?tab=contas`,
      });
    }

    const totalNotifs = Math.min(alerts.overdue.length, 10) + alerts.dueToday.length + (alerts.dueTomorrow.length > 0 ? 1 : 0);
    if (totalNotifs > 0) {
      console.log(`[NOTIF] Generated ${totalNotifs} bill notifications for seller #${sellerId}`);
    }
  } catch (err) {
    console.error('[NOTIF] generateBillNotifications error:', err);
  }
}
