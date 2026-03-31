import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as crmDb from "../crmDb";
import * as db from "../db";
import { getDb } from "../db";
import {
  crmMessageTemplates, InsertCrmMessageTemplate,
  crmFollowUpTasks, InsertCrmFollowUpTask,
  crmLeadDistribution,
  crmLeads,
  sellers,
  admins,
} from "../../drizzle/schema";
import { eq, and, desc, asc, lte, sql, or, like, ne } from "drizzle-orm";
import { sendPushNewLead, sendPushLeadTransferred } from "../pushService";
import { createNotification } from "../db";

// ===== MESSAGE TEMPLATES =====
export const crmTemplatesRouter = router({
  list: publicProcedure.input(z.object({
    department: z.string().optional(),
    category: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const database = await getDb();
    if (!database) return [];
    const conditions: any[] = [eq(crmMessageTemplates.active, true)];
    if (input?.department) conditions.push(eq(crmMessageTemplates.department, input.department));
    if (input?.category) conditions.push(eq(crmMessageTemplates.category, input.category));
    return database.select().from(crmMessageTemplates).where(and(...conditions)).orderBy(asc(crmMessageTemplates.category));
  }),

  create: adminProcedure.input(z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    message: z.string().min(1),
    department: z.string().optional(),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new Error("DB not available");
    const result = await database.insert(crmMessageTemplates).values(input);
    return { id: Number(result[0].insertId) };
  }),

  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    category: z.string().optional(),
    message: z.string().optional(),
    department: z.string().optional(),
    active: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new Error("DB not available");
    const { id, ...data } = input;
    await database.update(crmMessageTemplates).set(data as any).where(eq(crmMessageTemplates.id, id));
    return { success: true };
  }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new Error("DB not available");
    await database.delete(crmMessageTemplates).where(eq(crmMessageTemplates.id, input.id));
    return { success: true };
  }),

  // Render template with lead data
  render: publicProcedure.input(z.object({
    templateId: z.number(),
    leadId: z.number(),
    sellerId: z.number(),
  })).query(async ({ input }) => {
    const database = await getDb();
    if (!database) return { text: "" };
    const [template] = await database.select().from(crmMessageTemplates).where(eq(crmMessageTemplates.id, input.templateId)).limit(1);
    if (!template) return { text: "" };
    const lead = await crmDb.getLeadById(input.leadId);
    const sellerRows = await database.select().from(sellers).where(eq(sellers.id, input.sellerId)).limit(1);
    const seller = sellerRows[0];
    let text = template.message;
    text = text.replace(/\{nome\}/g, lead?.name || "Cliente");
    text = text.replace(/\{veiculo\}/g, lead?.vehicleInterest || "veiculo");
    text = text.replace(/\{vendedor\}/g, seller?.name || "vendedor");
    text = text.replace(/\{loja\}/g, "Kafka Multimarcas");
    text = text.replace(/\{telefone\}/g, lead?.phone || "");
    return { text, templateName: template.name };
  }),
});

// ===== FOLLOW-UP TASKS =====
export const crmFollowUpRouter = router({
  // List tasks for a seller
  listBySeller: publicProcedure.input(z.object({
    sellerId: z.number(),
    completed: z.boolean().optional(),
  })).query(async ({ input }) => {
    const database = await getDb();
    if (!database) return [];
    const conditions: any[] = [eq(crmFollowUpTasks.sellerId, input.sellerId)];
    if (input.completed !== undefined) conditions.push(eq(crmFollowUpTasks.completed, input.completed));
    return database.select().from(crmFollowUpTasks).where(and(...conditions)).orderBy(asc(crmFollowUpTasks.dueDate));
  }),

  // List overdue tasks
  listOverdue: publicProcedure.input(z.object({
    sellerId: z.number(),
  })).query(async ({ input }) => {
    const database = await getDb();
    if (!database) return [];
    return database.select().from(crmFollowUpTasks).where(
      and(
        eq(crmFollowUpTasks.sellerId, input.sellerId),
        eq(crmFollowUpTasks.completed, false),
        lte(crmFollowUpTasks.dueDate, Date.now()),
      )
    ).orderBy(asc(crmFollowUpTasks.dueDate));
  }),

  // Create a follow-up task
  create: publicProcedure.input(z.object({
    leadId: z.number(),
    sellerId: z.number(),
    type: z.string(),
    description: z.string().optional(),
    dueDate: z.number(),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new Error("DB not available");
    const result = await database.insert(crmFollowUpTasks).values(input);
    return { id: Number(result[0].insertId) };
  }),

  // Complete a task
  complete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new Error("DB not available");
    await database.update(crmFollowUpTasks).set({ completed: true, completedAt: Date.now() }).where(eq(crmFollowUpTasks.id, input.id));
    return { success: true };
  }),

  // Auto-create follow-up sequence when lead is created
  createSequence: publicProcedure.input(z.object({
    leadId: z.number(),
    sellerId: z.number(),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new Error("DB not available");
    const now = Date.now();
    const tasks = [
      { leadId: input.leadId, sellerId: input.sellerId, type: "whatsapp", description: "Primeiro contato - enviar mensagem de boas-vindas", dueDate: now + 5 * 60 * 1000 }, // 5 min
      { leadId: input.leadId, sellerId: input.sellerId, type: "ligacao", description: "Ligar para o cliente se nao respondeu WhatsApp", dueDate: now + 30 * 60 * 1000 }, // 30 min
      { leadId: input.leadId, sellerId: input.sellerId, type: "whatsapp", description: "Follow-up: perguntar se tem duvidas", dueDate: now + 24 * 60 * 60 * 1000 }, // 24h
      { leadId: input.leadId, sellerId: input.sellerId, type: "ligacao", description: "Ligar para reforcar interesse e agendar visita", dueDate: now + 48 * 60 * 60 * 1000 }, // 48h
      { leadId: input.leadId, sellerId: input.sellerId, type: "whatsapp", description: "Ultimo follow-up: oferecer condicao especial", dueDate: now + 5 * 24 * 60 * 60 * 1000 }, // 5 dias
    ];
    for (const task of tasks) {
      await database.insert(crmFollowUpTasks).values(task);
    }
    return { created: tasks.length };
  }),
});

// ===== LEAD DISTRIBUTION (Round Robin) =====
export const crmDistributionRouter = router({
  // Get distribution config (accessible by SDR and admin)
  getConfig: publicProcedure.query(async () => {
    const database = await getDb();
    if (!database) return [];
    return database.select().from(crmLeadDistribution).orderBy(asc(crmLeadDistribution.department));
  }),

  // Update distribution config (accessible by SDR and admin)
  updateConfig: publicProcedure.input(z.object({
    department: z.string(),
    enabled: z.boolean(),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new Error("DB not available");
    const existing = await database.select().from(crmLeadDistribution).where(eq(crmLeadDistribution.department, input.department)).limit(1);
    if (existing.length > 0) {
      await database.update(crmLeadDistribution).set({ enabled: input.enabled }).where(eq(crmLeadDistribution.department, input.department));
    } else {
      await database.insert(crmLeadDistribution).values(input);
    }
    return { success: true };
  }),

  // SDR: Auto-distribute all unassigned leads to vendedores via round-robin
  autoDistributeToSellers: publicProcedure.input(z.object({
    department: z.string().default("vendas"),
    sdrSellerId: z.number(),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new Error("DB not available");

    // Get unassigned leads
    const unassigned = await crmDb.listAllLeads({ sellerId: 0, department: input.department });
    if (unassigned.length === 0) return { distributed: 0, total: 0, assignments: [] };

    // Get active vendedores (not gerente, not SDR)
    const vendedores = await database.select().from(sellers).where(
      and(eq(sellers.department, input.department), eq(sellers.active, true), ne(sellers.sellerRole, "gerente"))
    ).orderBy(asc(sellers.id));

    if (vendedores.length === 0) return { distributed: 0, total: unassigned.length, assignments: [] };

    // Get last assigned index
    const [config] = await database.select().from(crmLeadDistribution).where(eq(crmLeadDistribution.department, input.department)).limit(1);
    let startIdx = 0;
    if (config?.lastAssignedSellerId) {
      const idx = vendedores.findIndex(s => s.id === config.lastAssignedSellerId);
      startIdx = (idx + 1) % vendedores.length;
    }

    // Distribute round-robin
    const assignments: { leadId: number; leadName: string; sellerId: number; sellerName: string }[] = [];
    for (let i = 0; i < unassigned.length; i++) {
      const lead = unassigned[i];
      const seller = vendedores[(startIdx + i) % vendedores.length];
      await crmDb.updateLead(lead.id, { sellerId: seller.id });
      await crmDb.createActivity({
        leadId: lead.id,
        sellerId: input.sdrSellerId,
        type: "transferencia",
        description: `Lead distribuído automaticamente para ${seller.name} (round-robin pelo SDR)`,
      });
      assignments.push({ leadId: lead.id, leadName: lead.name || 'Lead', sellerId: seller.id, sellerName: seller.name || '' });
    }

    // Update last assigned
    const lastSeller = vendedores[(startIdx + unassigned.length - 1) % vendedores.length];
    if (config) {
      await database.update(crmLeadDistribution).set({ lastAssignedSellerId: lastSeller.id }).where(eq(crmLeadDistribution.department, input.department));
    }

    // Notify each seller about their new leads
    const sellerCounts: Record<number, { name: string; count: number }> = {};
    for (const a of assignments) {
      if (!sellerCounts[a.sellerId]) sellerCounts[a.sellerId] = { name: a.sellerName, count: 0 };
      sellerCounts[a.sellerId].count++;
    }
    for (const [sid, info] of Object.entries(sellerCounts)) {
      sendPushNewLead(Number(sid), `${info.count} leads`, null, 'distribuição SDR', null).catch(console.error);
      createNotification({
        title: '\ud83d\udea8 NOVOS LEADS!',
        message: `Você recebeu ${info.count} lead(s) novo(s) do SDR. Responda rápido!`,
        type: 'urgent',
        sellerId: Number(sid),
        targetType: 'seller',
      }).catch(console.error);
    }

    return { distributed: assignments.length, total: unassigned.length, assignments };
  }),

  // Assign lead to next seller (round robin)
  assignNext: publicProcedure.input(z.object({
    department: z.string(),
    leadId: z.number(),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new Error("DB not available");

    // Get distribution config
    const [config] = await database.select().from(crmLeadDistribution).where(eq(crmLeadDistribution.department, input.department)).limit(1);
    if (!config || !config.enabled) return { assigned: false, reason: "Distribution not enabled" };

    // Get active sellers in department (exclude gerentes)
    const deptSellers = await database.select().from(sellers).where(
      and(eq(sellers.department, input.department), eq(sellers.active, true), ne(sellers.sellerRole, "gerente"))
    ).orderBy(asc(sellers.id));

    if (deptSellers.length === 0) return { assigned: false, reason: "No sellers in department" };

    // Find next seller after lastAssigned
    let nextSeller;
    if (config.lastAssignedSellerId) {
      const idx = deptSellers.findIndex(s => s.id === config.lastAssignedSellerId);
      nextSeller = deptSellers[(idx + 1) % deptSellers.length];
    } else {
      nextSeller = deptSellers[0];
    }

    // Assign lead
    await crmDb.updateLead(input.leadId, { sellerId: nextSeller.id });

    // Update last assigned
    await database.update(crmLeadDistribution).set({ lastAssignedSellerId: nextSeller.id }).where(eq(crmLeadDistribution.department, input.department));

    // Notify seller about new lead
    const leadInfo = await crmDb.getLeadById(input.leadId);
    sendPushNewLead(nextSeller.id, leadInfo?.name || 'Novo Lead', leadInfo?.phone || null, leadInfo?.source || null, leadInfo?.vehicleInterest || null).catch(console.error);
    createNotification({
      title: '\ud83d\udea8 NOVO LEAD!',
      message: `Voc\u00ea recebeu o lead ${leadInfo?.name || 'Novo Lead'}${leadInfo?.phone ? ' - ' + leadInfo.phone : ''}. Responda r\u00e1pido!`,
      type: 'urgent',
      sellerId: nextSeller.id,
      targetType: 'seller',
    }).catch(console.error);

    return { assigned: true, sellerId: nextSeller.id, sellerName: nextSeller.name };
  }),
});

// ===== LEAD TIME ALERTS (5min / 20min) =====
export const crmTimeAlertsRouter = router({
  // Get leads that need urgent attention (no activity within 5 min of creation)
  getUrgent: publicProcedure.input(z.object({
    sellerId: z.number(),
  })).query(async ({ input }) => {
    const database = await getDb();
    if (!database) return [];
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const twentyMinAgo = Date.now() - 20 * 60 * 1000;

    // Leads created in last 20 min that haven't been contacted
    const urgentLeads = await database.select().from(crmLeads).where(
      and(
        eq(crmLeads.sellerId, input.sellerId),
        eq(crmLeads.archived, false),
        eq(crmLeads.convertedToSale, false),
        // Created recently but lastContactDate is still the creation time (no real contact)
        sql`${crmLeads.createdAt} >= DATE_SUB(NOW(), INTERVAL 20 MINUTE)`,
      )
    ).orderBy(asc(crmLeads.createdAt));

    return urgentLeads.map(lead => {
      const createdTs = new Date(lead.createdAt!).getTime();
      const elapsed = Date.now() - createdTs;
      const minutesElapsed = Math.floor(elapsed / 60000);
      return {
        ...lead,
        minutesElapsed,
        urgencyLevel: minutesElapsed >= 20 ? "critical" : minutesElapsed >= 5 ? "warning" : "ok",
        shouldTransfer: minutesElapsed >= 20,
      };
    });
  }),

  // Auto-transfer lead after 20 min without response
  autoTransfer: publicProcedure.input(z.object({
    leadId: z.number(),
    currentSellerId: z.number(),
    department: z.string(),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new Error("DB not available");

    // Get other active sellers in same department
    const deptSellers = await database.select().from(sellers).where(
      and(
        eq(sellers.department, input.department),
        eq(sellers.active, true),
        sql`${sellers.id} != ${input.currentSellerId}`,
      )
    ).orderBy(sql`RAND()`).limit(1);

    if (deptSellers.length === 0) return { transferred: false, reason: "No other sellers available" };

    const newSeller = deptSellers[0];
    await crmDb.updateLead(input.leadId, { sellerId: newSeller.id });

    // Log activity
    await crmDb.createActivity({
      leadId: input.leadId,
      sellerId: newSeller.id,
      type: "transferencia",
      description: `Lead transferido automaticamente (sem resposta em 20min)`,
    });

    // Notify new seller about transferred lead
    const transferredLead = await crmDb.getLeadById(input.leadId);
    sendPushLeadTransferred(newSeller.id, transferredLead?.name || 'Lead', null).catch(console.error);
    createNotification({
      title: '\ud83d\udcf2 LEAD TRANSFERIDO!',
      message: `${transferredLead?.name || 'Lead'} foi transferido para voc\u00ea. Responda agora!`,
      type: 'urgent',
      sellerId: newSeller.id,
      targetType: 'seller',
    }).catch(console.error);

    return { transferred: true, newSellerId: newSeller.id, newSellerName: newSeller.name };
  }),
});

// ===== ADMIN PERMISSIONS =====
export const crmPermissionsRouter = router({
  // Get admin permissions
  getPermissions: publicProcedure.input(z.object({ adminId: z.number() })).query(async ({ input }) => {
    const admin = await crmDb.getAdminById(input.adminId);
    if (!admin) return null;
    try {
      return admin.permissions ? JSON.parse(admin.permissions) : getDefaultPermissions(admin.role);
    } catch {
      return getDefaultPermissions(admin.role);
    }
  }),

  // Update admin permissions
  updatePermissions: adminProcedure.input(z.object({
    adminId: z.number(),
    permissions: z.object({
      vendas: z.boolean(),
      pre_vendas: z.boolean(),
      consignacao: z.boolean(),
      fei: z.boolean(),
      marketing: z.boolean(),
      financeiro: z.boolean(),
      estoque: z.boolean(),
      configuracoes: z.boolean(),
      gerenciar_admins: z.boolean(),
    }),
  })).mutation(async ({ input }) => {
    await crmDb.updateAdmin(input.adminId, { permissions: JSON.stringify(input.permissions) } as any);
    return { success: true };
  }),
});

function getDefaultPermissions(role: string) {
  if (role === "owner") {
    return { vendas: true, pre_vendas: true, consignacao: true, fei: true, marketing: true, financeiro: true, estoque: true, configuracoes: true, gerenciar_admins: true };
  }
  return { vendas: true, pre_vendas: false, consignacao: false, fei: false, marketing: false, financeiro: false, estoque: false, configuracoes: false, gerenciar_admins: false };
}

// ===== FIPE TABLE =====
export const crmFipeRouter = router({
  // Search FIPE brands
  getBrands: publicProcedure.input(z.object({
    vehicleType: z.enum(["carros", "motos", "caminhoes"]).optional(),
  }).optional()).query(async ({ input }) => {
    try {
      const type = input?.vehicleType || "carros";
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${type}/marcas`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }),

  // Get models by brand
  getModels: publicProcedure.input(z.object({
    brandCode: z.string(),
    vehicleType: z.string().optional(),
  })).query(async ({ input }) => {
    try {
      const type = input.vehicleType || "carros";
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${type}/marcas/${input.brandCode}/modelos`);
      if (!res.ok) return { modelos: [], anos: [] };
      return res.json();
    } catch {
      return { modelos: [], anos: [] };
    }
  }),

  // Get years by model
  getYears: publicProcedure.input(z.object({
    brandCode: z.string(),
    modelCode: z.string(),
    vehicleType: z.string().optional(),
  })).query(async ({ input }) => {
    try {
      const type = input.vehicleType || "carros";
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${type}/marcas/${input.brandCode}/modelos/${input.modelCode}/anos`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  }),

  // Get price
  getPrice: publicProcedure.input(z.object({
    brandCode: z.string(),
    modelCode: z.string(),
    yearCode: z.string(),
    vehicleType: z.string().optional(),
  })).query(async ({ input }) => {
    try {
      const type = input.vehicleType || "carros";
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${type}/marcas/${input.brandCode}/modelos/${input.modelCode}/anos/${input.yearCode}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }),
});

// ===== SELLER STATS (Dashboard Individual) =====
export const crmSellerStatsRouter = router({
  getDashboard: publicProcedure.input(z.object({
    sellerId: z.number(),
  })).query(async ({ input }) => {
    const database = await getDb();
    if (!database) return null;

    const now = Date.now();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthStart = startOfMonth.getTime();

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek.getTime();

    // All active leads
    const allLeads = await database.select().from(crmLeads).where(
      and(eq(crmLeads.sellerId, input.sellerId), eq(crmLeads.archived, false))
    );

    // Converted this month
    const convertedMonth = allLeads.filter(l => l.convertedToSale && l.updatedAt && new Date(l.updatedAt).getTime() >= monthStart).length;

    // Leads this week
    const leadsThisWeek = allLeads.filter(l => l.createdAt && new Date(l.createdAt).getTime() >= weekStart).length;

    // Score breakdown
    const hot = allLeads.filter(l => l.score === "hot").length;
    const warm = allLeads.filter(l => l.score === "warm").length;
    const cold = allLeads.filter(l => l.score === "cold").length;

    // Conversion rate
    const totalActive = allLeads.length;
    const totalConverted = allLeads.filter(l => l.convertedToSale).length;
    const conversionRate = totalActive > 0 ? Math.round((totalConverted / totalActive) * 100) : 0;

    // Pending follow-ups
    const pendingTasks = await database.select().from(crmFollowUpTasks).where(
      and(
        eq(crmFollowUpTasks.sellerId, input.sellerId),
        eq(crmFollowUpTasks.completed, false),
        lte(crmFollowUpTasks.dueDate, now),
      )
    );

    // Average response time (simplified - time between creation and first activity)
    const avgResponseMinutes = 0; // Would need more data to calculate

    return {
      totalActive,
      hot,
      warm,
      cold,
      convertedMonth,
      leadsThisWeek,
      conversionRate,
      pendingFollowUps: pendingTasks.length,
      totalConverted,
    };
  }),
});
