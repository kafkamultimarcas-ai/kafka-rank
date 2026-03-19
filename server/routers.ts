import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { sendPushNewSale, sendPushSaleApproved, sendPushOvertake, sendPushPendingSale, sendPushPendingRecord, sendPushAppointmentExpiring, sendPushRescueAlert, sendPushInactivityAlert, sendPushAttendanceApproved } from "./pushService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

export const appRouter = router({
  system: systemRouter,
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
      active: z.boolean().optional(),
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
      base64: z.string(),
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
      return { success: true, sellerId: seller.id, name: seller.name, nickname: seller.nickname };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("seller_session", { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    // Verificar se est\u00e1 logado como vendedor
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.loginMethod !== 'seller_password') return null;
      const sellerId = -(ctx.user.id + 1000000);
      const seller = await db.getSellerById(sellerId);
      if (!seller) return null;
      // Atualizar lastAccess
      await db.updateSellerLastAccess(sellerId);
      return { id: seller.id, name: seller.name, nickname: seller.nickname, photoUrl: seller.photoUrl, department: seller.department };
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
    }).optional()).query(async ({ input }) => {
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
    })).mutation(async ({ input }) => {
      const seller = await db.getSellerById(input.sellerId);
      if (!seller) throw new Error("Vendedor não encontrado");
      const comp = input.competitionId ? await db.getCompetitionById(input.competitionId) : null;
      const points = comp ? comp.pointsPerSale : 1;
      const id = await db.createSale({ ...input, points, status: 'pending' });
      // Notifica o dono
      await notifyOwner({
        title: `Nova venda para aprovar!`,
        content: `${seller.name} registrou uma venda: ${input.vehicleModel}${input.value ? ` - R$ ${input.value.toLocaleString("pt-BR")}` : ''}. Acesse o painel para aprovar.`,
      });
      const leadLabel = input.leadSource === 'lead_loja' ? 'Lead Loja' : 'Lead Vendedor';
      // Notificação persistente para admin/gerente
      await db.createNotification({
        targetType: 'admin',
        type: 'pending_sale',
        title: 'Nova venda para aprovar!',
        message: `${seller.name} registrou: ${input.vehicleModel}${input.value ? ` - R$ ${input.value.toLocaleString("pt-BR")}` : ''} | ${leadLabel}`,
        actionUrl: '/admin/aprovacoes',
      });
      // Push notification para admin/gerente
      sendPushPendingSale(seller.name, input.vehicleModel, 'Venda').catch(console.error);
      return { id, message: "Venda registrada! Aguardando aprovação do gerente." };
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
        sendPushSaleApproved(seller.name, sale.vehicleModel || 'veículo').catch(console.error);
      }
      return { success: true };
    }),
    // Rejeitar venda (admin)
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.rejectSale(input.id);
      return { success: true };
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
      fileBase64: z.string(),
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
      return { id };
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
    }).optional()).query(async ({ input }) => {
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
      }
      return { success: true };
    }),
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.rejectFeiRecord(input.id);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteFeiRecord(input.id);
      return { success: true };
    }),
  }),

  // ===== CONSIGNA\u00c7\u00c3O =====
  consignment: router({
    list: publicProcedure.input(z.object({
      competitionId: z.number().optional(),
      sellerId: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      return db.listConsignmentRecords(input?.competitionId, input?.sellerId);
    }),
    register: publicProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      vehiclePlate: z.string().optional(),
      vehicleModel: z.string().min(1),
      ownerName: z.string().min(1),
      ownerPhone: z.string().optional(),
      entryDate: z.number(),
    })).mutation(async ({ input }) => {
      const seller = await db.getSellerById(input.sellerId);
      if (!seller) throw new Error("Colaborador n\u00e3o encontrado");
      const comp = input.competitionId ? await db.getCompetitionById(input.competitionId) : null;
      const points = comp ? comp.pointsPerSale : 1;
        const id = await db.createConsignmentRecord({ ...input, points, status: 'pending' });
      await notifyOwner({
        title: `Nova consignação para aprovar!`,
        content: `${seller.name} registrou consignação: ${input.vehicleModel} | Dono: ${input.ownerName} | Tel: ${input.ownerPhone || 'N/I'} | Placa: ${input.vehiclePlate || 'N/I'}`,
      });
      await db.createNotification({
        targetType: 'admin',
        type: 'pending_consignment',
        title: 'Nova consignação para aprovar!',
        message: `${seller.name}: ${input.vehicleModel} | Dono: ${input.ownerName}`,
        actionUrl: '/admin/aprovacoes',
      });
      sendPushPendingRecord(seller.name, 'Consignação', `${input.vehicleModel} | Dono: ${input.ownerName}`).catch(console.error);
      return { id, message: "Consignação registrada! Aguardando aprovação. Lembre-se: o carro precisa ficar 7 dias no pátio para contar pontos." };
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
          title: 'Consigna\u00e7\u00e3o aprovada!',
          message: result.isValid
            ? `Sua consigna\u00e7\u00e3o de ${result.vehicleModel} foi aprovada e j\u00e1 conta pontos!`
            : `Sua consigna\u00e7\u00e3o de ${result.vehicleModel} foi aprovada. Os pontos ser\u00e3o contados ap\u00f3s 7 dias no p\u00e1tio.`,
        });
      }
      return { success: true, isValid: result.isValid };
    }),
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.rejectConsignmentRecord(input.id);
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
    }).optional()).query(async ({ input }) => {
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
          message: `Seu registro de ${record.documentType} foi aprovado! +${totalPts} pontos${record.bonusPoints > 0 ? ' (inclui b\u00f4nus por cobran\u00e7a do cliente!)' : ''}.`,
        });
      }
      return { success: true };
    }),
    reject: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.rejectDispatchRecord(input.id);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteDispatchRecord(input.id);
      return { success: true };
    }),
  }),

  // ===== SDR / PRÉ-VENDAS / AGENDAMENTOS =====
  sdr: router({
    // Rota pública: vendedor lista seus próprios agendamentos
    myAppointments: publicProcedure.input(z.object({
      sellerId: z.number(),
    })).query(async ({ input }) => {
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
    }).optional()).query(async ({ input }) => {
      return db.listGoals(input || {});
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
      const storedCode = await db.getAppSetting("access_code");
      if (!storedCode) return { valid: true };
      return { valid: input.code === storedCode };
    }),
    getCode: adminProcedure.query(async () => {
      const code = await db.getAppSetting("access_code");
      return { code: code || "" };
    }),
    setCode: adminProcedure.input(z.object({ code: z.string().min(1) })).mutation(async ({ input }) => {
      await db.setAppSetting("access_code", input.code);
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
});

export type AppRouter = typeof appRouter;
