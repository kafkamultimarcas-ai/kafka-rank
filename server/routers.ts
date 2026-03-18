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
      type: z.enum(["individual", "team", "group"]),
      pointsPerSale: z.number().min(1).default(1),
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
      status: z.enum(["draft", "active", "finished"]).optional(),
      pointsPerSale: z.number().optional(),
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
    create: adminProcedure.input(z.object({
      sellerId: z.number(),
      competitionId: z.number().optional(),
      description: z.string().optional(),
      vehicleModel: z.string().optional(),
      value: z.number().optional(),
      points: z.number().default(1),
    })).mutation(async ({ input }) => {
      const id = await db.createSale(input);
      const seller = await db.getSellerById(input.sellerId);
      if (seller && input.value && input.value >= 50000) {
        await notifyOwner({
          title: `Venda importante registrada!`,
          content: `${seller.name} registrou uma venda de R$ ${(input.value).toLocaleString("pt-BR")} - ${input.vehicleModel || "Veículo"}`,
        });
      }
      return { id };
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
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateTraining(id, data);
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
      return db.getLatestQuote();
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
    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.markNotificationRead(input.id);
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
});

export type AppRouter = typeof appRouter;
