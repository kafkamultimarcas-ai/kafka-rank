import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
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
import { notifyOwner } from "./_core/notification";
import { adminAuthRouter, crmLeadsRouter, crmPipelineRouter, crmInventoryRouter, crmIntegrationsRouter, crmCampaignsRouter, crmMarketingRouter, crmVoiceRouter } from "./routers/crmRouter";
import { crmTemplatesRouter, crmFollowUpRouter, crmDistributionRouter, crmTimeAlertsRouter, crmPermissionsRouter, crmFipeRouter, crmSellerStatsRouter } from "./routers/crmEnhanced";
import { finCategoriesRouter, finTransactionsRouter } from "./routers/finRouter";
import { pvChamadosRouter, pvGastosRouter, pvOficinasRouter, pvOrcamentosRouter } from "./routers/pvRouter";
import { mktStrategiesRouter, mktTasksRouter } from "./routers/mktRouter";
import { fichaRouter } from "./routers/fichaRouter";
import { inventoryRouter } from "./routers/inventoryRouter";
import { whatsappRouter } from "./routers/whatsappRouter";
import { sendPushNewSale, sendPushSaleApproved, sendPushOvertake, sendPushPendingSale, sendPushPendingRecord, sendPushAppointmentExpiring, sendPushRescueAlert, sendPushInactivityAlert, sendPushAttendanceApproved, sendPushToSeller, sendPushDocsPendentes, sendPushDocTransferido } from "./pushService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

// Helper: retorna sellerId logado ou null se for gerente/admin (que vê tudo)
async function getPrivacySellerId(ctx: any): Promise<number | null> {
  if (!ctx.user || (ctx.user as any).loginMethod !== 'seller_password') return null;
  const sellerId = -(ctx.user.id + 1000000);
  const seller = await db.getSellerById(sellerId);
  if (seller && seller.sellerRole === 'gerente') return null; // gerente vê tudo
  return sellerId;
}

export const appRouter = router({
  system: systemRouter,
  fichas: fichaRouter,
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
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getSellerById(input.id);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      nickname: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      department: z.string().optional(),
    })).mutation(async ({ input }) => {
      const id = await db.createSeller(input);
      return { id };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nickname: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
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

    // === LOGIN DE VENDEDOR POR SENHA ===
    login: publicProcedure.input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const seller = await db.getSellerByUsername(input.username);
      if (!seller || !seller.active || !seller.passwordHash) {
        throw new Error("Usu\u00e1rio ou senha inv\u00e1lidos");
      }
      const valid = await bcrypt.compare(input.password, seller.passwordHash);
      if (!valid) {
        throw new Error("Usu\u00e1rio ou senha inv\u00e1lidos");
      }
      // Atualizar lastAccess
      await db.updateSellerLastAccess(seller.id);
      // Gerar JWT e setar cookie
      const token = jwt.sign(
        { sellerId: seller.id, username: seller.username },
        ENV.cookieSecret,
        { expiresIn: "30d" }
      );
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie("seller_session", token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      return { success: true, sellerId: seller.id, name: seller.name, nickname: seller.nickname, sellerRole: seller.sellerRole || 'vendedor', department: seller.department || 'vendas' };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("seller_session", { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    // Verificar se est\u00e1 logado como vendedor
    me: publicProcedure.query(async ({ ctx }) => {
      // Primeiro tentar via ctx.user (quando não há conflito com OAuth)
      if (ctx.user && ctx.user.loginMethod === 'seller_password') {
        const sellerId = -(ctx.user.id + 1000000);
        const seller = await db.getSellerById(sellerId);
        if (seller) {
          await db.updateSellerLastAccess(sellerId);
          return { id: seller.id, name: seller.name, nickname: seller.nickname, photoUrl: seller.photoUrl, department: seller.department, sellerRole: seller.sellerRole || 'vendedor' };
        }
      }
      // Fallback: verificar cookie seller_session diretamente
      // (necessário quando OAuth ou manager token também está presente)
      try {
        const { parse: parseCookie } = await import("cookie");
        const cookies = parseCookie(ctx.req.headers.cookie || "");
        const sellerToken = cookies.seller_session;
        if (sellerToken) {
          const payload = jwt.verify(sellerToken, ENV.cookieSecret) as { sellerId: number; username: string };
          const seller = await db.getSellerById(payload.sellerId);
          if (seller && seller.active) {
            await db.updateSellerLastAccess(seller.id);
            return { id: seller.id, name: seller.name, nickname: seller.nickname, photoUrl: seller.photoUrl, department: seller.department, sellerRole: seller.sellerRole || 'vendedor' };
          }
        }
      } catch (e) {
        // Token inválido ou expirado
      }
      return null;
    }),

    // Primeiro acesso: vendedor cria seu próprio login
    firstAccess: publicProcedure.input(z.object({
      sellerId: z.number(),
      accessCode: z.string().optional(), // mantido para compatibilidade, não usado
      username: z.string().min(3),
      password: z.string().min(4),
      department: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      const seller = await db.getSellerByIdInternal(input.sellerId);
      if (!seller || !seller.active) throw new Error('Vendedor não encontrado ou inativo');
      if (seller.username && seller.passwordHash) throw new Error('Este vendedor já possui login. Use a tela de login.');
      // Verificar username único
      const existing = await db.getSellerByUsername(input.username);
      if (existing) throw new Error('Este nome de usuário já está em uso');
      const passwordHash = await bcrypt.hash(input.password, 10);
      const updateData: any = { username: input.username, passwordHash };
      if (input.department) updateData.department = input.department;
      await db.updateSeller(input.sellerId, updateData);
      await db.updateSellerLastAccess(input.sellerId);
      // Auto-login
      const token = jwt.sign(
        { sellerId: seller.id, username: input.username },
        ENV.cookieSecret,
        { expiresIn: '30d' }
      );
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie('seller_session', token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      return { success: true, sellerId: seller.id, name: seller.name, nickname: seller.nickname, sellerRole: seller.sellerRole || 'vendedor', department: seller.department || 'vendas' };
    }),

    // Admin define/reseta senha de vendedor
    setPassword: adminProcedure.input(z.object({
      id: z.number(),
      username: z.string().min(3),
      password: z.string().min(4),
    })).mutation(async ({ input }) => {
      // Verificar se username j\u00e1 existe em outro vendedor
      const existing = await db.getSellerByUsername(input.username);
      if (existing && existing.id !== input.id) {
        throw new Error("Este nome de usu\u00e1rio j\u00e1 est\u00e1 em uso por outro vendedor");
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      await db.updateSeller(input.id, { username: input.username, passwordHash });
      return { success: true };
    }),
  }),

  // ===== COMPETITIONS =====
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
      type: z.enum(["individual", "team", "group"]),
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
      status: z.enum(["draft", "active", "finished"]).optional(),
      pointsPerSale: z.number().optional(),
      goalTarget: z.number().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateCompetition(id, data);
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
    // Admin cria vendas já aprovadas
    create: adminProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      description: z.string().optional(),
      vehicleModel: z.string().optional(),
      value: z.number().optional(),
      points: z.number().default(1),
    })).mutation(async ({ input }) => {
      const id = await db.createSale({ ...input, status: 'approved' });
      // Auto-incrementar meta da loja (venda criada pelo admin já é aprovada)
      const now = new Date();
      const comp = input.competitionId ? await db.getCompetitionById(input.competitionId) : null;
      const saleCategory = comp?.category || 'vendas';
      await db.autoUpdateStoreGoal(saleCategory, now.getMonth() + 1, now.getFullYear(), 1);
      const seller = await db.getSellerById(input.sellerId);
      if (seller && input.value && input.value >= 50000) {
        await notifyOwner({
          title: `Venda importante registrada!`,
          content: `${seller.name} registrou uma venda de R$ ${(input.value).toLocaleString("pt-BR")} - ${input.vehicleModel || "Veículo"}`,
        });
      }
      return { id };
    }),
    // Vendedor registra venda (fica pendente de aprovação)
    registerBySeller: publicProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      vehicleModel: z.string().min(1),
      value: z.number().optional(),
      description: z.string().optional(),
      leadSource: z.enum(['lead_loja', 'lead_vendedor']),
      customerPhone: z.string().optional(),
    })).mutation(async ({ input }) => {
      const seller = await db.getSellerById(input.sellerId);
      if (!seller) throw new Error("Vendedor não encontrado");
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
      
      const id = await db.createSale({ ...input, points, status: 'pending', sdrRecordId });
      
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
            actionUrl: '/minha-area',
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
        actionUrl: '/admin/aprovacoes',
      });
      // Push notification para admin/gerente
      sendPushPendingSale(seller.name, input.vehicleModel, 'Venda').catch(console.error);
      return { 
        id, 
        message: "Venda registrada! Aguardando aprovação do gerente.",
        linkedSdr: sdrRecordId ? { sdrRecordId, sdrSellerName } : null,
      };
    }),
    // Listar vendas pendentes (admin)
    listPending: adminProcedure.query(async () => {
      return db.listPendingSales();
    }),
    // Aprovar venda (admin)
    approve: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
      return { success: true };
    }),
    // Rejeitar venda (admin)
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
            data: { type: 'sale_rejected', url: `/minha-area/${sale.sellerId}` },
          }).catch(console.error);
        }
      }
      return { success: true };
    }),
    // Editar venda (admin) - ajusta pontos automaticamente
    edit: adminProcedure.input(z.object({
      id: z.number(),
      vehicleModel: z.string().optional(),
      value: z.number().optional(),
      sellerId: z.number().optional(),
      status: z.enum(['pending', 'approved', 'rejected']).optional(),
      leadSource: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const oldSalesList = await db.listSales(undefined, undefined);
      const oldSale = oldSalesList.find((s: any) => s.id === id);
      const result = await db.editSale(id, data);
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
    // Excluir venda (admin) - reverte pontos e meta se aprovada
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
        actionUrl: `/minha-area/${input.sellerId}`,
      });
      // Push notification para o vendedor
      sendPushToSeller(input.sellerId, {
        title: '📋 Novo Plano de Ação!',
        body: `Você recebeu: "${input.title}". Confira na sua área!`,
        tag: `action-plan-${input.sellerId}`,
        data: { type: 'action_plan', url: `/minha-area/${input.sellerId}` },
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
      const parsed = JSON.parse(response.choices[0].message.content as string);
      const id = await db.createActionPlan({ sellerId: input.sellerId, title: parsed.title, content: parsed.content });
      // Notificar vendedor sobre plano gerado por IA
      await db.createNotification({
        sellerId: input.sellerId,
        type: 'action_plan',
        title: 'Novo Plano de Ação (IA)!',
        message: `Você recebeu um plano de ação personalizado: "${parsed.title}". Acesse sua área para conferir.`,
        actionUrl: `/minha-area/${input.sellerId}`,
      });
      sendPushToSeller(input.sellerId, {
        title: '🤖 Plano de Ação Personalizado!',
        body: `Novo plano gerado para você: "${parsed.title}". Confira!`,
        tag: `action-plan-ai-${input.sellerId}`,
        data: { type: 'action_plan', url: `/minha-area/${input.sellerId}` },
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
      const parsed = JSON.parse(response.choices[0].message.content as string);
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
    unreadCountSeller: publicProcedure.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
      const count = await db.countUnreadSellerNotifications(input.sellerId);
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
    register: publicProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      customerCpf: z.string().optional(),
      vehiclePlate: z.string().optional(),
      bankName: z.string().min(1),
      financedValue: z.number().optional(),
      returnType: z.string().min(1),
      paymentDate: z.number().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const seller = await db.getSellerById(input.sellerId);
      if (!seller) throw new Error("Colaborador n\u00e3o encontrado");
      const comp = input.competitionId ? await db.getCompetitionById(input.competitionId) : null;
      const points = comp ? comp.pointsPerSale : 1;
      const id = await db.createFeiRecord({ ...input, points, status: 'pending' });
      await notifyOwner({
        title: `Novo registro F&I para aprovar!`,
        content: `${seller.name} registrou F&I: Banco ${input.bankName} | ${input.returnType} | R$ ${((input.financedValue || 0) / 100).toLocaleString("pt-BR")}`,
      });
      // Notificação persistente para admin
      await db.createNotification({
        targetType: 'admin',
        type: 'pending_fei',
        title: 'Novo F&I para aprovar!',
        message: `${seller.name}: Banco ${input.bankName} | ${input.returnType}`,
        actionUrl: '/admin/aprovacoes',
      });
      sendPushPendingRecord(seller.name, 'F&I', `Banco ${input.bankName} | ${input.returnType}`).catch(console.error);
      return { id, message: "F&I registrado! Aguardando aprovação." };
    }),
    listPending: adminProcedure.query(async () => {
      return db.listPendingFeiRecords();
    }),
    approve: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
          data: { type: 'fei_approved', url: `/minha-area/${record.sellerId}` },
          vibrate: [200, 100, 200],
        }).catch(console.error);
      }
      return { success: true };
    }),
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
            data: { type: 'fei_rejected', url: `/minha-area/${record.sellerId}` },
          }).catch(console.error);
        }
      }
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteFeiRecord(input.id);
      return { success: true };
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      customerCpf: z.string().optional(),
      vehiclePlate: z.string().optional(),
      bankName: z.string().optional(),
      financedValue: z.number().optional(),
      returnType: z.string().optional(),
      paymentDate: z.number().nullable().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updated = await db.updateFeiRecord(id, data);
      return updated;
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
        actionUrl: '/admin/aprovacoes',
      });
      sendPushPendingRecord(seller.name, 'Consignação', `${input.vehicleModel} | Dono: ${input.ownerName}`).catch(console.error);
      return { id, message: `Consignação registrada! Aguardando aprovação. O carro precisa ficar 7 dias no pátio para contar pontos.${warningMsg}` };
    }),
    listPending: adminProcedure.query(async () => {
      return db.listPendingConsignmentRecords();
    }),
    approve: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
          data: { type: 'consignment_approved', url: `/minha-area/${result.sellerId}` },
          vibrate: [200, 100, 200],
        }).catch(console.error);
      }
      return { success: true, isValid: result.isValid };
    }),
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      // Buscar registro antes de rejeitar
      const records = await db.listConsignmentRecords();
      const record = records.find((r: any) => r.id === input.id);
      await db.rejectConsignmentRecord(input.id);
      if (record) {
        await db.createNotification({
          sellerId: record.sellerId,
          type: 'consignment_rejected',
          title: 'Consignação rejeitada',
          message: `Sua consignação de ${record.vehicleModel} foi rejeitada.`,
        });
        sendPushToSeller(record.sellerId, {
          title: '\u274c Consignação Rejeitada',
          body: `Sua consignação de ${record.vehicleModel} foi rejeitada.`,
          tag: `consignment-rejected-${input.id}`,
          data: { type: 'consignment_rejected', url: `/minha-area/${record.sellerId}` },
        }).catch(console.error);
      }
      return { success: true };
    }),
    // Registrar saída do carro do pátio
    updateExit: adminProcedure.input(z.object({
      id: z.number(),
      exitDate: z.number(),
    })).mutation(async ({ input }) => {
      const result = await db.updateConsignmentExitDate(input.id, input.exitDate);
      return { success: true, isValid: result.isValid };
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
        actionUrl: '/admin/aprovacoes',
      });
      sendPushPendingRecord(seller.name, 'Despachante', `${input.documentType} | Placa: ${input.vehiclePlate || 'N/I'}`).catch(console.error);
      return { id, message: "Registro de despachante enviado! Aguardando aprovação." };
    }),
    listPending: adminProcedure.query(async () => {
      return db.listPendingDispatchRecords();
    }),
    approve: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
          data: { type: 'dispatch_approved', url: `/minha-area/${record.sellerId}` },
          vibrate: [200, 100, 200],
        }).catch(console.error);
      }
      return { success: true };
    }),
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
          data: { type: 'dispatch_rejected', url: `/minha-area/${record.sellerId}` },
        }).catch(console.error);
      }
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
    pending: adminProcedure.query(async () => {
      return db.listPendingSdrRecords();
    }),
    approve: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const record = await db.approveSdrRecord(input.id);
      return { success: true, record };
    }),
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.rejectSdrRecord(input.id);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteSdrRecord(input.id);
      return { success: true };
    }),
    // Vendedor marca que cliente compareceu
    markAttendance: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const record = await db.markAttendance(input.id);
      return { success: true, record };
    }),
    // Listar agendamentos pendentes de aprovação de comparecimento
    pendingAttendance: adminProcedure.query(async () => {
      return db.listPendingAttendance();
    }),
    // Gerente aprova comparecimento
    approveAttendance: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const record = await db.approveAttendance(input.id);
      // Push para vendedor que comparecimento foi aprovado
      if (record && record.sellerId) {
        sendPushAttendanceApproved(record.sellerId, record.customerName || 'Cliente').catch(console.error);
      }
      return { success: true, record };
    }),
    // Gerente reprova comparecimento
    rejectAttendance: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.rejectAttendance(input.id);
      return { success: true };
    }),
    // Gerente marca como não compareceu
    markNoShow: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
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
      await db.updateSdrRecord(input.id, { isFeirão: input.isFeirão } as any);
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
    // Admin edita agendamento
    update: adminProcedure.input(z.object({
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
    // Ranking do feirão: quem mais agendou
    rankingFeirao: publicProcedure.input(z.object({
      competitionId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const ranking = await db.getRankingFeirao(input?.competitionId);
      // Enriquecer com nomes dos vendedores/SDRs
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
    // Listar todos agendamentos de feirão (para conferência)
    listFeirao: publicProcedure.input(z.object({
      competitionId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const agendamentos = await db.listFeiraoAgendamentos(input?.competitionId);
      const sellersList = await db.listSellers();
      return agendamentos.map((a: any) => ({
        ...a,
        sellerName: sellersList.find((s: any) => s.id === a.sellerId)?.name || 'Desconhecido',
      }));
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
    })).mutation(async ({ input }) => {
      const id = await db.createGoal(input);
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

  // ===== MANAGERS (Gerentes com login por senha) =====
  managers: router({
    // Login por senha - público
    login: publicProcedure.input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const manager = await db.getManagerByUsername(input.username);
      if (!manager || !manager.active) {
        throw new Error("Usuário ou senha inválidos");
      }
      const valid = await bcrypt.compare(input.password, manager.passwordHash);
      if (!valid) {
        throw new Error("Usuário ou senha inválidos");
      }
      // Gerar JWT e setar cookie
      const token = jwt.sign(
        { managerId: manager.id, username: manager.username },
        ENV.cookieSecret,
        { expiresIn: "30d" }
      );
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie("manager_session", token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      return { success: true, name: manager.name };
    }),

    // Logout gerente
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("manager_session", { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    // Verificar se está logado como gerente
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      // Se o ID é negativo, é um gerente
      if (ctx.user.id < 0) {
        return { id: -ctx.user.id, name: ctx.user.name, role: "manager" as const };
      }
      return null;
    }),

    // CRUD - só dono (user com openId == ownerOpenId) pode gerenciar
    list: adminProcedure.query(async () => {
      return db.listManagers();
    }),

    create: adminProcedure.input(z.object({
      username: z.string().min(3),
      password: z.string().min(4),
      name: z.string().min(1),
    })).mutation(async ({ input }) => {
      const existing = await db.getManagerByUsername(input.username);
      if (existing) throw new Error("Usuário já existe");
      const passwordHash = await bcrypt.hash(input.password, 10);
      const id = await db.createManager({ username: input.username, passwordHash, name: input.name });
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
      await db.updateManager(input.id, data);
      return { success: true };
    }),

    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteManager(input.id);
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
  crmTemplates: crmTemplatesRouter,
  crmFollowUp: crmFollowUpRouter,
  crmDistribution: crmDistributionRouter,
  crmTimeAlerts: crmTimeAlertsRouter,
  crmPermissions: crmPermissionsRouter,
  crmFipe: crmFipeRouter,
  crmSellerStats: crmSellerStatsRouter,
  finCategories: finCategoriesRouter,
  finTransactions: finTransactionsRouter,
  pvChamados: pvChamadosRouter,
  pvGastos: pvGastosRouter,
  pvOrcamentos: pvOrcamentosRouter,
  pvOficinas: pvOficinasRouter,
  mktStrategies: mktStrategiesRouter,
  mktTasks: mktTasksRouter,

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
    myDocs: publicProcedure.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
      return db.listSaleDocumentsBySeller(input.sellerId);
    }),
    // Vendedor: contar documentos pendentes
    pendingCount: publicProcedure.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
      return db.countPendingDocsBySeller(input.sellerId);
    }),
    // Vendedor: upload de CNH
    uploadCnh: publicProcedure.input(z.object({
      id: z.number(),
      sellerId: z.number(),
      base64: base64Schema,
      filename: z.string(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, 'base64');
      const key = `sale-docs/${input.sellerId}/cnh-${Date.now()}-${input.filename}`;
      const { url } = await storagePut(key, buffer, 'image/jpeg');
      const result = await db.uploadSaleDocCnh(input.id, url, key);
      // Se ficou completo, notificar despachante
      if (result.docStatus === 'completo') {
        await db.createNotification({
          targetType: 'admin',
          type: 'docs_complete',
          title: 'Documentos completos para transfer\u00eancia!',
          message: `Vendedor enviou CNH e Comprovante para ${result.vehicleModel || 've\u00edculo'} - Pronto para despachante!`,
          actionUrl: '/admin/documentos',
        });
      }
      return { success: true, docStatus: result.docStatus };
    }),
    // Vendedor: upload de Comprovante de Resid\u00eancia
    uploadComprovante: publicProcedure.input(z.object({
      id: z.number(),
      sellerId: z.number(),
      base64: base64Schema,
      filename: z.string(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, 'base64');
      const key = `sale-docs/${input.sellerId}/comprovante-${Date.now()}-${input.filename}`;
      const { url } = await storagePut(key, buffer, 'image/jpeg');
      const result = await db.uploadSaleDocComprovante(input.id, url, key);
      if (result.docStatus === 'completo') {
        await db.createNotification({
          targetType: 'admin',
          type: 'docs_complete',
          title: 'Documentos completos para transfer\u00eancia!',
          message: `Vendedor enviou CNH e Comprovante para ${result.vehicleModel || 've\u00edculo'} - Pronto para despachante!`,
          actionUrl: '/admin/documentos',
        });
      }
      return { success: true, docStatus: result.docStatus };
    }),
    // Admin/Despachante: listar todos os documentos
    listAll: adminProcedure.input(z.object({ filterStatus: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.listAllSaleDocuments(input?.filterStatus);
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
  }),

  // ===== ESTOQUE DE VEÍCULOS =====
  inventory: inventoryRouter,

  // ===== WHATSAPP (Z-API) =====
  whatsapp: whatsappRouter,

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
});
export type AppRouter = typeof appRouter;
