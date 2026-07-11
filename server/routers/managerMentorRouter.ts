import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb, getManagerById } from "../db";
import { invokeLLM } from "../_core/llm";
import {
  sellers, sales, managerTasks, managerAlerts, managerMentorMessages,
  crmLeads, crmMessages, goals, sdrRecords
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql, ne, asc, count } from "drizzle-orm";

// Helper: verify the gerente identity used by the panel.
// Positive IDs represent seller-gerente records from `sellers`.
// Negative IDs represent manager records from `managers`.
async function verifyGerente(sellerId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  if (sellerId < 0) {
    const managerId = Math.abs(sellerId);
    const manager = await getManagerById(managerId);
    if (!manager || !manager.active) throw new Error("Acesso restrito a gerentes");
    return {
      db,
      manager: {
        id: -manager.id,
        name: manager.name,
        nickname: manager.name,
        sellerRole: "gerente",
      },
    };
  }

  const [seller] = await db.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1);
  if (!seller || seller.sellerRole !== "gerente") throw new Error("Acesso restrito a gerentes");
  return { db, manager: seller };
}

export const managerMentorRouter = router({

  // ===== TEAM ANALYTICS =====
  getTeamAnalytics: publicProcedure.input(z.object({
    managerId: z.number(),
    period: z.enum(["today", "week", "month"]).default("today"),
  })).query(async ({ input }) => {
    const { db, manager } = await verifyGerente(input.managerId);

    const now = Date.now();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart); monthStart.setDate(1);

    const periodStart = input.period === "today" ? todayStart.getTime()
      : input.period === "week" ? weekStart.getTime()
      : monthStart.getTime();

    // Get all active vendedores
    const allSellers = await db.select().from(sellers).where(
      and(eq(sellers.department, "vendas"), eq(sellers.active, true), ne(sellers.sellerRole, "gerente"))
    );

    // Get sales in period
    const allSales = await db.select().from(sales).where(
      and(eq(sales.status, "approved"), gte(sales.createdAt, new Date(periodStart)))
    );

    // Get leads in period
    const allLeads = await db.select().from(crmLeads).where(
      and(eq(crmLeads.archived, false))
    );

    // Get goals (current month)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const currentGoals = await db.select().from(goals).where(
      and(eq(goals.month, currentMonth), eq(goals.year, currentYear))
    );
    const storeGoal = currentGoals.find((g: any) => !g.sellerId || g.sellerId === 0) as any;

    // Build per-seller stats
    const sellerStats = await Promise.all(allSellers.map(async (seller) => {
      const sellerSales = allSales.filter((s: any) => s.sellerId === seller.id);
      const sellerLeads = allLeads.filter((l: any) => l.sellerId === seller.id);
      const respondedLeads = sellerLeads.filter((l: any) => l.lastContactDate && l.lastContactDate > 0);

      // Average response time (from messages)
      let avgResponseMin = 0;
      let respondedCount = 0;
      const recentLeads = sellerLeads.slice(0, 20); // limit for performance
      for (const lead of recentLeads) {
        const firstIn = await db.select().from(crmMessages)
          .where(and(eq(crmMessages.leadId, lead.id), eq(crmMessages.direction, "inbound")))
          .orderBy(asc(crmMessages.timestamp)).limit(1);
        if (firstIn.length === 0) continue;
        const firstOut = await db.select().from(crmMessages)
          .where(and(eq(crmMessages.leadId, lead.id), eq(crmMessages.direction, "outbound"), gte(crmMessages.timestamp, firstIn[0].timestamp)))
          .orderBy(asc(crmMessages.timestamp)).limit(1);
        if (firstOut.length > 0) {
          avgResponseMin += (firstOut[0].timestamp - firstIn[0].timestamp) / 60000;
          respondedCount++;
        }
      }
      avgResponseMin = respondedCount > 0 ? Math.round(avgResponseMin / respondedCount) : 0;

      // Individual goal
      const individualGoal = currentGoals.find((g: any) => g.sellerId === seller.id);

      // Unresponded leads (no outbound after last inbound)
      let unrespondedCount = 0;
      for (const lead of sellerLeads.slice(0, 30)) {
        const lastMsg = await db.select().from(crmMessages)
          .where(eq(crmMessages.leadId, lead.id))
          .orderBy(desc(crmMessages.timestamp)).limit(1);
        if (lastMsg.length > 0 && lastMsg[0].direction === "inbound") {
          const timeSince = (now - lastMsg[0].timestamp) / 60000;
          if (timeSince > 10) unrespondedCount++;
        }
      }

      return {
        id: seller.id,
        name: seller.nickname || seller.name,
        photoUrl: seller.photoUrl,
        totalSales: sellerSales.length,
        salesValue: sellerSales.reduce((sum: number, s: any) => sum + (s.value || 0), 0),
        totalLeads: sellerLeads.length,
        respondedLeads: respondedCount,
        avgResponseMin,
        unrespondedLeads: unrespondedCount,
        conversionRate: sellerLeads.length > 0 ? Math.round((sellerSales.length / sellerLeads.length) * 100) : 0,
        totalPoints: seller.totalPoints ?? 0,
        goalTarget: (individualGoal as any)?.targetValue || 0,
        goalProgress: individualGoal ? sellerSales.length : 0,
        lastAccess: seller.lastAccess,
        status: seller.lastAccess && (now - seller.lastAccess) < 30 * 60000 ? "online" : "offline",
      };
    }));

    // Sort by sales desc
    sellerStats.sort((a, b) => b.totalSales - a.totalSales);

    // Team totals
    const totalSales = sellerStats.reduce((s, v) => s + v.totalSales, 0);
    const totalRevenue = sellerStats.reduce((s, v) => s + v.salesValue, 0);
    const totalLeads = sellerStats.reduce((s, v) => s + v.totalLeads, 0);
    const avgTeamResponse = sellerStats.filter(s => s.avgResponseMin > 0).length > 0
      ? Math.round(sellerStats.reduce((s, v) => s + v.avgResponseMin, 0) / sellerStats.filter(s => s.avgResponseMin > 0).length)
      : 0;
    const totalUnresponded = sellerStats.reduce((s, v) => s + v.unrespondedLeads, 0);

    return {
      team: {
        totalSellers: sellerStats.length,
        totalSales,
        totalRevenue,
        totalLeads,
        avgTeamResponse,
        totalUnresponded,
        storeGoalTarget: storeGoal?.targetValue || 0,
        storeGoalProgress: totalSales,
      },
      sellers: sellerStats,
      period: input.period,
    };
  }),

  // ===== TASKS =====
  getTasks: publicProcedure.input(z.object({
    managerId: z.number(),
    includeCompleted: z.boolean().default(false),
  })).query(async ({ input }) => {
    const { db } = await verifyGerente(input.managerId);
    const conditions = [eq(managerTasks.managerId, input.managerId)];
    if (!input.includeCompleted) conditions.push(eq(managerTasks.completed, false));
    const tasks = await db.select().from(managerTasks)
      .where(and(...conditions))
      .orderBy(desc(managerTasks.createdAt))
      .limit(50);
    return tasks;
  }),

  completeTask: publicProcedure.input(z.object({
    taskId: z.number(),
    managerId: z.number(),
  })).mutation(async ({ input }) => {
    const { db } = await verifyGerente(input.managerId);
    await db.update(managerTasks)
      .set({ completed: true, completedAt: Date.now() })
      .where(and(eq(managerTasks.id, input.taskId), eq(managerTasks.managerId, input.managerId)));
    return { success: true };
  }),

  // ===== ALERTS =====
  getAlerts: publicProcedure.input(z.object({
    managerId: z.number(),
    includeDismissed: z.boolean().default(false),
  })).query(async ({ input }) => {
    const { db } = await verifyGerente(input.managerId);
    const conditions = [eq(managerAlerts.managerId, input.managerId)];
    if (!input.includeDismissed) conditions.push(eq(managerAlerts.dismissed, false));
    const alerts = await db.select().from(managerAlerts)
      .where(and(...conditions))
      .orderBy(desc(managerAlerts.createdAt))
      .limit(50);
    return alerts;
  }),

  dismissAlert: publicProcedure.input(z.object({
    alertId: z.number(),
    managerId: z.number(),
  })).mutation(async ({ input }) => {
    const { db } = await verifyGerente(input.managerId);
    await db.update(managerAlerts)
      .set({ dismissed: true, dismissedAt: Date.now() })
      .where(and(eq(managerAlerts.id, input.alertId), eq(managerAlerts.managerId, input.managerId)));
    return { success: true };
  }),

  // ===== MENTOR MESSAGES =====
  getMentorMessages: publicProcedure.input(z.object({
    managerId: z.number(),
    limit: z.number().default(5),
  })).query(async ({ input }) => {
    const { db } = await verifyGerente(input.managerId);
    const messages = await db.select().from(managerMentorMessages)
      .where(eq(managerMentorMessages.managerId, input.managerId))
      .orderBy(desc(managerMentorMessages.createdAt))
      .limit(input.limit);
    return messages;
  }),

  markMessageRead: publicProcedure.input(z.object({
    messageId: z.number(),
    managerId: z.number(),
  })).mutation(async ({ input }) => {
    const { db } = await verifyGerente(input.managerId);
    await db.update(managerMentorMessages)
      .set({ read: true })
      .where(and(eq(managerMentorMessages.id, input.messageId), eq(managerMentorMessages.managerId, input.managerId)));
    return { success: true };
  }),

  // ===== GENERATE AI INSIGHTS =====
  generateDailyInsights: publicProcedure.input(z.object({
    managerId: z.number(),
  })).mutation(async ({ input }) => {
    const { db, manager } = await verifyGerente(input.managerId);

    const today = new Date().toISOString().split("T")[0];

    // Check if already generated today
    const existing = await db.select().from(managerMentorMessages)
      .where(and(eq(managerMentorMessages.managerId, input.managerId), eq(managerMentorMessages.generatedFor, today)))
      .limit(1);
    if (existing.length > 0) return { alreadyGenerated: true, message: existing[0] };

    // Gather data for AI context
    const allVendedores = await db.select().from(sellers).where(
      and(eq(sellers.department, "vendas"), eq(sellers.active, true), ne(sellers.sellerRole, "gerente"))
    );

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);

    const todaySales = await db.select().from(sales).where(
      and(eq(sales.status, "approved"), gte(sales.createdAt, todayStart))
    );
    const weekSales = await db.select().from(sales).where(
      and(eq(sales.status, "approved"), gte(sales.createdAt, weekStart))
    );

    // Build context
    const sellerSummaries = allVendedores.map(s => {
      const sTodaySales = todaySales.filter((sl: any) => sl.sellerId === s.id).length;
      const sWeekSales = weekSales.filter((sl: any) => sl.sellerId === s.id).length;
      return `${s.nickname || s.name}: ${sTodaySales} vendas hoje, ${sWeekSales} na semana, ${s.totalPoints} pts total`;
    }).join("\n");

    const currentGoals = await db.select().from(goals).where(
      and(eq(goals.month, new Date().getMonth() + 1), eq(goals.year, new Date().getFullYear()))
    );
    const storeGoal = currentGoals.find((g: any) => !g.sellerId || g.sellerId === 0) as any;

    const contextStr = `EQUIPE (${allVendedores.length} vendedores):\n${sellerSummaries}\n\nVENDAS HOJE: ${todaySales.length}\nVENDAS SEMANA: ${weekSales.length}\nMETA DA LOJA: ${storeGoal?.targetValue || "não definida"}\nPROGRESSO: ${todaySales.length} vendas hoje`;

    // Generate tasks
    const tasksPrompt = `Você é um mentor de gestão de vendas de uma loja de veículos multimarcas (Kafka Multimarcas).
Analise os dados da equipe e gere de 3 a 5 TAREFAS PRÁTICAS para o gerente ${manager.nickname || manager.name} executar HOJE.

DADOS:
${contextStr}

REGRAS:
- Cada tarefa deve ser ESPECÍFICA e ACIONÁVEL (não genérica)
- Mencione o NOME do vendedor quando aplicável
- Tipos: coaching (orientar vendedor), recognition (reconhecer performance), strategy (ação estratégica), followup (acompanhar algo)
- Prioridades: critical (urgente), high (importante), medium (normal), low (pode esperar)
- Formato JSON array: [{"type":"coaching","priority":"high","title":"Falar com Wesley sobre tempo de resposta","description":"Wesley está com tempo médio de 45min. Oriente sobre responder em até 5min.","targetSellerName":"Wesley","actionType":"talk"}]
- Responda APENAS o JSON array, sem markdown`;

    let tasks: any[] = [];
    try {
      const tasksResp = await invokeLLM({
        messages: [{ role: "system", content: tasksPrompt }, { role: "user", content: "Gere as tarefas do dia." }],
      });
      const tasksText = ((tasksResp.choices?.[0]?.message?.content as string) || "[]").trim();
      tasks = JSON.parse(tasksText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch (e) {
      console.error("[Mentor] Error generating tasks:", e);
      tasks = [{
        type: "strategy",
        priority: "medium",
        title: "Revisar performance da equipe",
        description: "Verifique o ranking e identifique quem precisa de apoio hoje.",
        actionType: "review"
      }];
    }

    // Save tasks
    for (const task of tasks) {
      const targetSeller = task.targetSellerName
        ? allVendedores.find(s => (s.nickname || s.name).toLowerCase().includes(task.targetSellerName.toLowerCase()))
        : null;
      await db.insert(managerTasks).values({
        managerId: input.managerId,
        type: task.type || "strategy",
        priority: task.priority || "medium",
        title: task.title,
        description: task.description || null,
        targetSellerId: targetSeller?.id || null,
        actionType: task.actionType || null,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // expires in 24h
      });
    }

    // Generate alerts
    const now = Date.now();
    const alertsToCreate: any[] = [];

    for (const seller of allVendedores) {
      // Check idle sellers (no access in 2+ hours during work hours)
      const hour = new Date().getHours();
      if (hour >= 8 && hour < 20 && seller.lastAccess && (now - seller.lastAccess) > 2 * 60 * 60 * 1000) {
        const hoursIdle = Math.round((now - seller.lastAccess) / (60 * 60 * 1000));
        alertsToCreate.push({
          managerId: input.managerId,
          type: "idle_seller",
          severity: hoursIdle > 4 ? "critical" : "warning",
          title: `${seller.nickname || seller.name} inativo há ${hoursIdle}h`,
          description: `Último acesso há ${hoursIdle} horas. Verifique se está tudo bem.`,
          targetSellerId: seller.id,
        });
      }

      // Check performance drop (0 sales this week vs team average)
      const sellerWeekSales = weekSales.filter((s: any) => s.sellerId === seller.id).length;
      const avgWeekSales = weekSales.length / Math.max(allVendedores.length, 1);
      if (sellerWeekSales === 0 && avgWeekSales > 0.5) {
        alertsToCreate.push({
          managerId: input.managerId,
          type: "performance_drop",
          severity: "warning",
          title: `${seller.nickname || seller.name} sem vendas na semana`,
          description: `Média da equipe: ${avgWeekSales.toFixed(1)} vendas/semana. ${seller.nickname || seller.name} tem 0.`,
          targetSellerId: seller.id,
        });
      }
    }

    // Check store goal at risk
    if (storeGoal && storeGoal.targetValue) {
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const dayOfMonth = new Date().getDate();
      const expectedProgress = (dayOfMonth / daysInMonth) * storeGoal.targetValue;
      const totalMonthSales = weekSales.length; // approximate
      if (totalMonthSales < expectedProgress * 0.7) {
        alertsToCreate.push({
          managerId: input.managerId,
          type: "goal_at_risk",
          severity: "critical",
          title: `Meta da loja em risco!`,
          description: `Meta: ${storeGoal.targetValue} vendas. Progresso: ${totalMonthSales}. Esperado para hoje: ${Math.round(expectedProgress)}.`,
        });
      }
    }

    // Clear old alerts (keep last 24h)
    await db.delete(managerAlerts).where(
      and(eq(managerAlerts.managerId, input.managerId), lte(managerAlerts.createdAt, new Date(now - 24 * 60 * 60 * 1000)))
    );

    // Save alerts
    for (const alert of alertsToCreate) {
      await db.insert(managerAlerts).values(alert);
    }

    // Generate mentor message
    const mentorPrompt = `Você é um mentor executivo de gestão de vendas automotivas. Gere UMA mensagem de mentoria para o gerente ${manager.nickname || manager.name} da Kafka Multimarcas.

DADOS DA EQUIPE:
${contextStr}

A mensagem deve:
- Ser motivacional mas com DIRECIONAMENTO ESTRATÉGICO concreto
- Ter no máximo 4-5 linhas
- Mencionar dados reais da equipe
- Dar UMA dica prática para o dia
- Tom: mentor experiente, direto, motivador
- NÃO usar formatação (sem negrito, asteriscos, markdown)
- NÃO usar emojis excessivos (máximo 1-2)

Formato JSON: {"title":"Título curto","content":"Mensagem completa","type":"daily_tip","icon":"🎯"}
Responda APENAS o JSON, sem markdown.`;

    let mentorMsg: any = null;
    try {
      const mentorResp = await invokeLLM({
        messages: [{ role: "system", content: mentorPrompt }, { role: "user", content: "Gere a mensagem de mentoria do dia." }],
      });
      const mentorText = ((mentorResp.choices?.[0]?.message?.content as string) || "").trim();
      mentorMsg = JSON.parse(mentorText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch (e) {
      console.error("[Mentor] Error generating message:", e);
      mentorMsg = {
        title: "Foco no resultado!",
        content: `Bom dia ${manager.nickname || manager.name}! Hoje é dia de fazer acontecer. Acompanhe de perto os vendedores e dê suporte onde precisar. Lembre-se: um gerente presente faz toda a diferença no resultado da equipe.`,
        type: "daily_tip",
        icon: "🎯",
      };
    }

    // Save mentor message
    const [inserted] = await db.insert(managerMentorMessages).values({
      managerId: input.managerId,
      type: mentorMsg.type || "daily_tip",
      title: mentorMsg.title,
      content: mentorMsg.content,
      icon: mentorMsg.icon || "🎯",
      generatedFor: today,
    }).$returningId();

    const savedMsg = await db.select().from(managerMentorMessages).where(eq(managerMentorMessages.id, inserted.id)).limit(1);

    return {
      alreadyGenerated: false,
      tasks: tasks.length,
      alerts: alertsToCreate.length,
      message: savedMsg[0] || null,
    };
  }),

  // ===== QUICK ACTIONS =====
  sendMotivationalMessage: publicProcedure.input(z.object({
    managerId: z.number(),
    sellerId: z.number(),
    customMessage: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { db, manager } = await verifyGerente(input.managerId);
    const [targetSeller] = await db.select().from(sellers).where(eq(sellers.id, input.sellerId)).limit(1);
    if (!targetSeller) throw new Error("Vendedor não encontrado");

    let message = input.customMessage;
    if (!message) {
      // Generate AI motivational message
      try {
        const resp = await invokeLLM({
          messages: [
            { role: "system", content: `Você é o gerente ${manager.nickname || manager.name} da Kafka Multimarcas. Gere uma mensagem motivacional curta (2-3 linhas) para o vendedor ${targetSeller.nickname || targetSeller.name}. Seja direto, motivador e pessoal. Sem formatação. Máximo 1 emoji.` },
            { role: "user", content: "Gere a mensagem motivacional." },
          ],
        });
        message = ((resp.choices?.[0]?.message?.content as string) || "").trim();
      } catch {
        message = `Oi ${targetSeller.nickname || targetSeller.name}! Estou acompanhando seu trabalho e sei que você tem potencial. Vamos fazer esse dia valer a pena! 💪`;
      }
    }

    return { success: true, message, sellerName: targetSeller.nickname || targetSeller.name };
  }),
});
