import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, like, or, desc, asc, sql, gte, lte, gt, isNull, ne } from "drizzle-orm";
import {
  admins, InsertAdmin,
  crmLeads, InsertCrmLead,
  crmPipelineStages, InsertCrmPipelineStage,
  crmActivities, InsertCrmActivity,
  crmInventory, InsertCrmInventory,
  crmInventoryAlerts, InsertCrmInventoryAlert,
  crmIntegrations, InsertCrmIntegration,
  crmCampaigns, InsertCrmCampaign,
  crmMessages, InsertCrmMessage,
  sellers,
} from "../drizzle/schema";
import { getDb } from "./db";

import { getCurrentTenantId } from "./tenantDb";
import { getTenantLimits } from "./tenantService";

// ===== ADMINS =====

export async function getAdminByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(admins).where(and(eq(admins.tenantId, getCurrentTenantId()), eq(admins.username, username))).limit(1);
  return rows[0] || null;
}

export async function getAdminByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(admins).where(and(eq(admins.tenantId, getCurrentTenantId()), eq(admins.email, email))).limit(1);
  return rows[0] || null;
}

export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(admins).where(and(eq(admins.tenantId, getCurrentTenantId()), eq(admins.id, id))).limit(1);
  return rows[0] || null;
}

export async function createAdmin(data: { username: string; passwordHash: string; name: string; role?: "owner" | "admin"; permissions?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const tenantId = getCurrentTenantId();
  const limits = await getTenantLimits(tenantId);
  if (limits) {
    const [{ count }] = await db.select({ count: sql<number>`COUNT(*)` }).from(admins).where(and(eq(admins.tenantId, tenantId), eq(admins.active, true)));
    if (Number(count) >= limits.maxAdmins) {
      throw new Error(`Limite de administradores do plano atingido (${limits.maxAdmins}). Fale com o suporte para aumentar seu plano.`);
    }
  }
  const result = await db.insert(admins).values({
    username: data.username,
    passwordHash: data.passwordHash,
    name: data.name,
    role: data.role || "admin",
    permissions: data.permissions || JSON.stringify({vendas:true,pre_vendas:false,consignacao:false,fei:false,marketing:false,financeiro:false,estoque:false,configuracoes:false,gerenciar_admins:false}),
    tenantId,
  });
  return Number(result[0].insertId);
}

export async function listAdmins() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: admins.id, username: admins.username, name: admins.name, email: admins.email, role: admins.role, active: admins.active, permissions: admins.permissions, createdAt: admins.createdAt }).from(admins).where(eq(admins.tenantId, getCurrentTenantId())).orderBy(desc(admins.createdAt));
}

export async function updateAdmin(id: number, data: Partial<{ name: string; passwordHash: string; active: boolean; role: "owner" | "admin"; permissions: string }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(admins).set(data).where(and(eq(admins.tenantId, getCurrentTenantId()), eq(admins.id, id)));
}

export async function deleteAdmin(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(admins).where(and(eq(admins.tenantId, getCurrentTenantId()), eq(admins.id, id)));
}

// ===== CRM LEADS =====

export async function createLead(data: InsertCrmLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmLeads).values({...data, tenantId: getCurrentTenantId()});
  return Number(result[0].insertId);
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), eq(crmLeads.id, id))).limit(1);
  return rows[0] || null;
}

export async function listLeadsBySeller(sellerId: number, opts?: { department?: string; archived?: boolean; stage?: string; score?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(crmLeads.sellerId, sellerId)];
  if (opts?.department) conditions.push(eq(crmLeads.department, opts.department));
  if (opts?.archived !== undefined) conditions.push(eq(crmLeads.archived, opts.archived));
  if (opts?.stage) conditions.push(eq(crmLeads.stage, opts.stage));
  if (opts?.score) conditions.push(eq(crmLeads.score, opts.score as "hot" | "warm" | "cold"));
  return db.select().from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(crmLeads.updatedAt));
}
export async function listLeadsByDepartment(department: string, opts?: { archived?: boolean; stage?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(crmLeads.department, department)];
  if (opts?.archived !== undefined) conditions.push(eq(crmLeads.archived, opts.archived));
  if (opts?.stage) conditions.push(eq(crmLeads.stage, opts.stage));
  return db.select().from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(crmLeads.updatedAt));
}

export async function listAllLeads(opts?: { archived?: boolean; department?: string; sellerId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (opts?.archived !== undefined) conditions.push(eq(crmLeads.archived, opts.archived));
  if (opts?.department) conditions.push(eq(crmLeads.department, opts.department));
  if (opts?.sellerId !== undefined) conditions.push(eq(crmLeads.sellerId, opts.sellerId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const tid = getCurrentTenantId();
  const queryLimit = opts?.limit || 100;
  const queryOffset = opts?.offset || 0;
  // Optimized: use lastMessageAt column for ordering (indexed), limit subqueries to paginated results only
  const leads = await db.select({
    id: crmLeads.id,
    sellerId: crmLeads.sellerId,
    department: crmLeads.department,
    name: crmLeads.name,
    phone: crmLeads.phone,
    email: crmLeads.email,
    vehicleInterest: crmLeads.vehicleInterest,
    vehiclePlate: crmLeads.vehiclePlate,
    source: crmLeads.source,
    stage: crmLeads.stage,
    score: crmLeads.score,
    cpf: crmLeads.cpf,
    birthday: crmLeads.birthday,
    notes: crmLeads.notes,
    nextContactDate: crmLeads.nextContactDate,
    lastContactDate: crmLeads.lastContactDate,
    archived: crmLeads.archived,
    convertedToSale: crmLeads.convertedToSale,
    saleValue: crmLeads.saleValue,
    acknowledgedAt: crmLeads.acknowledgedAt,
    lastAutoTransferAt: crmLeads.lastAutoTransferAt,
    aiHandled: crmLeads.aiHandled,
    aiDataCollected: crmLeads.aiDataCollected,
    aiCreditAppId: crmLeads.aiCreditAppId,
    aiAppointmentId: crmLeads.aiAppointmentId,
    createdAt: crmLeads.createdAt,
    updatedAt: crmLeads.updatedAt,
    tenantId: crmLeads.tenantId,
    lastMessageAt: crmLeads.lastMessageAt,
    lastCampaignId: crmLeads.lastCampaignId,
    isCampaignResponse: crmLeads.isCampaignResponse,
    lastMessageContent: sql<string | null>`(SELECT content FROM crm_messages WHERE crm_messages.leadId = crm_leads.id ORDER BY timestamp DESC LIMIT 1)`,
    lastMessageDirection: sql<string | null>`(SELECT direction FROM crm_messages WHERE crm_messages.leadId = crm_leads.id ORDER BY timestamp DESC LIMIT 1)`,
    lastMessageTimestamp: sql<number | null>`(SELECT timestamp FROM crm_messages WHERE crm_messages.leadId = crm_leads.id ORDER BY timestamp DESC LIMIT 1)`,
    lastMessageType: sql<string | null>`(SELECT messageType FROM crm_messages WHERE crm_messages.leadId = crm_leads.id ORDER BY timestamp DESC LIMIT 1)`,
    lastMessageSender: sql<string | null>`(SELECT senderName FROM crm_messages WHERE crm_messages.leadId = crm_leads.id ORDER BY timestamp DESC LIMIT 1)`,
    unreadCount: sql<number>`(SELECT COUNT(*) FROM crm_messages WHERE crm_messages.leadId = crm_leads.id AND crm_messages.direction = 'inbound' AND crm_messages.timestamp > COALESCE(crm_leads.acknowledgedAt, crm_leads.lastAutoTransferAt, 0))`,
  }).from(crmLeads).where(and(eq(crmLeads.tenantId, tid), where)).orderBy(
    desc(crmLeads.lastMessageAt),
    desc(crmLeads.updatedAt)
  ).limit(queryLimit).offset(queryOffset);
  return leads;
}

export async function updateLead(id: number, data: Partial<InsertCrmLead>) {
  const db = await getDb();
  if (!db) return;
  await db.update(crmLeads).set(data).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), eq(crmLeads.id, id)));
}

export async function searchLeads(query: string, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const searchPattern = `%${query}%`;
  const searchConditions = or(
    like(crmLeads.name, searchPattern),
    like(crmLeads.phone, searchPattern),
    like(crmLeads.email, searchPattern),
    like(crmLeads.vehicleInterest, searchPattern),
    like(crmLeads.vehiclePlate, searchPattern),
  );
  const conditions = sellerId
    ? and(eq(crmLeads.sellerId, sellerId), searchConditions)
    : searchConditions;
  return db.select().from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), conditions)).orderBy(desc(crmLeads.updatedAt)).limit(50);
}

export async function getLeadsNeedingFollowUp(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
  return db.select().from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()),
      eq(crmLeads.sellerId, sellerId),
      eq(crmLeads.archived, false),
      eq(crmLeads.convertedToSale, false),
      or(
        lte(crmLeads.lastContactDate, twoDaysAgo),
        isNull(crmLeads.lastContactDate),
      ),
  )).orderBy(asc(crmLeads.lastContactDate));
}

export async function getLeadsByVehicleInterest(vehicleQuery: string) {
  const db = await getDb();
  if (!db) return [];
  const searchPattern = `%${vehicleQuery}%`;
  return db.select().from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()),
      eq(crmLeads.archived, false),
      eq(crmLeads.convertedToSale, false),
      like(crmLeads.vehicleInterest, searchPattern),
  )).orderBy(desc(crmLeads.updatedAt));
}

export async function getLeadStats(sellerId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, hot: 0, warm: 0, cold: 0, converted: 0, bySource: [] as any[], byStage: [] as any[] };

  const conditions = sellerId ? and(eq(crmLeads.sellerId, sellerId), eq(crmLeads.archived, false)) : eq(crmLeads.archived, false);

  const rows = await db.select({
    score: crmLeads.score,
    convertedToSale: crmLeads.convertedToSale,
    count: sql<number>`COUNT(*)`,
  }).from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), conditions)).groupBy(crmLeads.score, crmLeads.convertedToSale);

  let total = 0, hot = 0, warm = 0, cold = 0, converted = 0;
  for (const r of rows) {
    const c = Number(r.count);
    total += c;
    if (r.convertedToSale) converted += c;
    if (r.score === "hot") hot += c;
    else if (r.score === "warm") warm += c;
    else cold += c;
  }

  const bySource = await db.select({
    source: crmLeads.source,
    count: sql<number>`COUNT(*)`,
  }).from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), conditions)).groupBy(crmLeads.source);

  const byStage = await db.select({
    stage: crmLeads.stage,
    count: sql<number>`COUNT(*)`,
  }).from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), conditions)).groupBy(crmLeads.stage);

  return { total, hot, warm, cold, converted, bySource, byStage };
}

// ===== CRM PIPELINE STAGES =====

export async function listPipelineStages(department?: string) {
  const db = await getDb();
  if (!db) return [];
  const where = department ? eq(crmPipelineStages.department, department) : undefined;
  return db.select().from(crmPipelineStages).where(and(eq(crmPipelineStages.tenantId, getCurrentTenantId()), where)).orderBy(asc(crmPipelineStages.department), asc(crmPipelineStages.displayOrder));
}

export async function getDefaultStage(department: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmPipelineStages).where(and(eq(crmPipelineStages.tenantId, getCurrentTenantId()),
    eq(crmPipelineStages.department, department), eq(crmPipelineStages.isDefault, true)
  )).limit(1);
  return rows[0] || null;
}

// ===== CRM ACTIVITIES =====

export async function createActivity(data: InsertCrmActivity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmActivities).values({...data, tenantId: getCurrentTenantId()});
  return Number(result[0].insertId);
}

export async function listActivitiesByLead(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmActivities).where(and(eq(crmActivities.tenantId, getCurrentTenantId()), eq(crmActivities.leadId, leadId))).orderBy(desc(crmActivities.createdAt));
}

// ===== CRM INVENTORY =====

export async function createInventoryItem(data: InsertCrmInventory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmInventory).values({...data, tenantId: getCurrentTenantId()});
  return Number(result[0].insertId);
}

export async function getInventoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmInventory).where(and(eq(crmInventory.tenantId, getCurrentTenantId()), eq(crmInventory.id, id))).limit(1);
  return rows[0] || null;
}

export async function listInventory(opts?: { status?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (opts?.status) conditions.push(eq(crmInventory.status, opts.status as any));
  if (opts?.search) {
    const p = `%${opts.search}%`;
    conditions.push(or(
      like(crmInventory.brand, p),
      like(crmInventory.model, p),
      like(crmInventory.plate, p),
      like(crmInventory.color, p),
    ));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(crmInventory).where(and(eq(crmInventory.tenantId, getCurrentTenantId()), where)).orderBy(desc(crmInventory.createdAt));
}

export async function updateInventoryItem(id: number, data: Partial<InsertCrmInventory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(crmInventory).set(data).where(and(eq(crmInventory.tenantId, getCurrentTenantId()), eq(crmInventory.id, id)));
}

export async function deleteInventoryItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(crmInventory).where(and(eq(crmInventory.tenantId, getCurrentTenantId()), eq(crmInventory.id, id)));
}

// ===== CRM INVENTORY ALERTS =====

export async function createInventoryAlert(data: InsertCrmInventoryAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(crmInventoryAlerts).values({...data, tenantId: getCurrentTenantId()});
}

export async function listInventoryAlertsBySeller(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmInventoryAlerts).where(and(eq(crmInventoryAlerts.tenantId, getCurrentTenantId()),
    eq(crmInventoryAlerts.sellerId, sellerId), eq(crmInventoryAlerts.dismissed, false)
  )).orderBy(desc(crmInventoryAlerts.createdAt));
}

export async function dismissInventoryAlert(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(crmInventoryAlerts).set({ dismissed: true }).where(and(eq(crmInventoryAlerts.tenantId, getCurrentTenantId()), eq(crmInventoryAlerts.id, id)));
}

// ===== CRM INTEGRATIONS =====

export async function listIntegrations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmIntegrations).where(eq(crmIntegrations.tenantId, getCurrentTenantId())).orderBy(desc(crmIntegrations.createdAt));
}

export async function getIntegrationByType(type: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmIntegrations).where(and(eq(crmIntegrations.tenantId, getCurrentTenantId()),
    eq(crmIntegrations.type, type), eq(crmIntegrations.active, true)
  )).limit(1);
  return rows[0] || null;
}

export async function getIntegrationByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmIntegrations).where(and(eq(crmIntegrations.tenantId, getCurrentTenantId()),
    eq(crmIntegrations.apiToken, token), eq(crmIntegrations.active, true)
  )).limit(1);
  return rows[0] || null;
}

/**
 * Busca uma integração pelo token SEM filtrar por tenant atual — usada nos webhooks
 * públicos (fora do contexto tRPC/ALS) para descobrir a qual loja o token pertence
 * antes de abrir o contexto de tenant correto.
 */
export async function getIntegrationByTokenGlobal(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmIntegrations).where(and(
    eq(crmIntegrations.apiToken, token), eq(crmIntegrations.active, true)
  )).limit(1);
  return rows[0] || null;
}

export async function createIntegration(data: InsertCrmIntegration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmIntegrations).values({...data, tenantId: getCurrentTenantId()});
  return Number(result[0].insertId);
}

export async function updateIntegration(id: number, data: Partial<InsertCrmIntegration>) {
  const db = await getDb();
  if (!db) return;
  await db.update(crmIntegrations).set(data).where(and(eq(crmIntegrations.tenantId, getCurrentTenantId()), eq(crmIntegrations.id, id)));
}

export async function deleteIntegration(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(crmIntegrations).where(and(eq(crmIntegrations.tenantId, getCurrentTenantId()), eq(crmIntegrations.id, id)));
}

// ===== CRM CAMPAIGNS =====

export async function createCampaign(data: InsertCrmCampaign) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmCampaigns).values({...data, tenantId: getCurrentTenantId()});
  return Number(result[0].insertId);
}

export async function listCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmCampaigns).where(eq(crmCampaigns.tenantId, getCurrentTenantId())).orderBy(desc(crmCampaigns.createdAt));
}

export async function updateCampaign(id: number, data: Partial<InsertCrmCampaign>) {
  const db = await getDb();
  if (!db) return;
  await db.update(crmCampaigns).set(data).where(and(eq(crmCampaigns.tenantId, getCurrentTenantId()), eq(crmCampaigns.id, id)));
}

export async function deleteCampaign(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(crmCampaigns).where(and(eq(crmCampaigns.tenantId, getCurrentTenantId()), eq(crmCampaigns.id, id)));
}

// ===== MARKETING STATS =====

export async function getMarketingStats(startDate?: number, endDate?: number) {
  const db = await getDb();
  if (!db) return { bySource: [], byDepartment: [], conversionRate: 0, totalLeads: 0, totalConverted: 0 };

  const conditions: any[] = [eq(crmLeads.archived, false)];
  if (startDate) conditions.push(gte(crmLeads.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(crmLeads.createdAt, new Date(endDate)));
  const where = and(...conditions);

  const bySource = await db.select({
    source: crmLeads.source,
    total: sql<number>`COUNT(*)`,
    converted: sql<number>`SUM(CASE WHEN ${crmLeads.convertedToSale} = true THEN 1 ELSE 0 END)`,
    totalValue: sql<number>`SUM(CASE WHEN ${crmLeads.convertedToSale} = true THEN ${crmLeads.saleValue} ELSE 0 END)`,
  }).from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), where)).groupBy(crmLeads.source);

  const byDepartment = await db.select({
    department: crmLeads.department,
    total: sql<number>`COUNT(*)`,
    converted: sql<number>`SUM(CASE WHEN ${crmLeads.convertedToSale} = true THEN 1 ELSE 0 END)`,
  }).from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), where)).groupBy(crmLeads.department);

  const totals = await db.select({
    total: sql<number>`COUNT(*)`,
    converted: sql<number>`SUM(CASE WHEN ${crmLeads.convertedToSale} = true THEN 1 ELSE 0 END)`,
  }).from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), where));

  const totalLeads = Number(totals[0]?.total || 0);
  const totalConverted = Number(totals[0]?.converted || 0);
  const conversionRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0;

  return { bySource, byDepartment, conversionRate, totalLeads, totalConverted };
}

// ===== MESSAGES =====

export async function createMessage(data: InsertCrmMessage) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.insert(crmMessages).values({...data, tenantId: getCurrentTenantId()}).$returningId();
  return result.id;
}

export async function listMessagesByLead(leadId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmMessages).where(and(eq(crmMessages.tenantId, getCurrentTenantId()), eq(crmMessages.leadId, leadId))).orderBy(asc(crmMessages.timestamp)).limit(limit);
}

export async function listMessagesByPhone(phone: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmMessages).where(and(eq(crmMessages.tenantId, getCurrentTenantId()), eq(crmMessages.phone, phone))).orderBy(asc(crmMessages.timestamp)).limit(limit);
}

export async function getLastMessageByLead(leadId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmMessages).where(and(eq(crmMessages.tenantId, getCurrentTenantId()), eq(crmMessages.leadId, leadId))).orderBy(desc(crmMessages.timestamp)).limit(1);
  return rows[0] || null;
}

// ===== PERFORMANCE & ALERTS =====

/** Get leads that haven't been responded to within a time threshold */
export async function getUnrespondedLeads(thresholdMinutes: number, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = Date.now() - thresholdMinutes * 60 * 1000;
  const conditions: any[] = [
    eq(crmLeads.archived, false),
    gt(crmLeads.sellerId, 0), // only assigned leads
  ];
  if (sellerId !== undefined) {
    conditions.push(eq(crmLeads.sellerId, sellerId));
  }
  const leads = await db.select().from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), and(...conditions)));
  // Filter: leads where the LAST message is inbound and older than threshold
  // This means the client sent a message and nobody responded yet
  const result = [];
  for (const lead of leads) {
    // Get the last message for this lead
    const lastMsg = await db.select().from(crmMessages)
      .where(eq(crmMessages.leadId, lead.id))
      .orderBy(desc(crmMessages.timestamp)).limit(1);
    if (lastMsg.length === 0) continue; // no messages at all, skip
    const last = lastMsg[0];
    // If last message is inbound (from client) and older than threshold → unresponded
    if (last.direction === "inbound" && last.timestamp && last.timestamp < cutoff) {
      result.push(lead);
    }
  }
  return result;
}

/** Get average response time for a seller (in minutes) */
export async function getSellerResponseStats(sellerId: number) {
  const db = await getDb();
  if (!db) return { avgResponseMinutes: 0, totalLeads: 0, respondedLeads: 0, conversionRate: 0 };
  
  const sellerLeads = await db.select().from(crmLeads).where(and(eq(crmLeads.tenantId, getCurrentTenantId()), eq(crmLeads.sellerId, sellerId)));
  let totalResponseTime = 0;
  let respondedCount = 0;
  let convertedCount = 0;
  
  for (const lead of sellerLeads) {
    if (lead.convertedToSale) convertedCount++;
    // Find first inbound and first outbound message
    const firstInbound = await db.select().from(crmMessages)
      .where(and(eq(crmMessages.leadId, lead.id), eq(crmMessages.direction, "inbound")))
      .orderBy(asc(crmMessages.timestamp)).limit(1);
    if (firstInbound.length === 0) continue;
    
    const firstOutbound = await db.select().from(crmMessages)
      .where(and(
        eq(crmMessages.leadId, lead.id),
        eq(crmMessages.direction, "outbound"),
        gte(crmMessages.timestamp, firstInbound[0].timestamp)
      ))
      .orderBy(asc(crmMessages.timestamp)).limit(1);
    if (firstOutbound.length > 0) {
      const diff = (firstOutbound[0].timestamp - firstInbound[0].timestamp) / 60000; // minutes
      totalResponseTime += diff;
      respondedCount++;
    }
  }
  
  return {
    avgResponseMinutes: respondedCount > 0 ? Math.round(totalResponseTime / respondedCount) : 0,
    totalLeads: sellerLeads.length,
    respondedLeads: respondedCount,
    conversionRate: sellerLeads.length > 0 ? Math.round((convertedCount / sellerLeads.length) * 100) : 0,
  };
}

/** Auto-reassign lead to next available seller in same department */
export async function autoReassignLead(leadId: number) {
  const db = await getDb();
  if (!db) return null;
  const lead = await getLeadById(leadId);
  if (!lead || lead.sellerId === 0) return null;
  
  // Get all active sellers in same department, excluding current, gerentes, blocked, banned
  const allSellersRaw = await db.select().from(sellers)
    .where(and(
      eq(sellers.department, lead.department),
      eq(sellers.active, true),
      ne(sellers.id, lead.sellerId),
      ne(sellers.sellerRole, "gerente")
    ));
  const nowMs = Date.now();
  const allSellers = allSellersRaw.filter(s => 
    !s.leadReceiveBlocked && (!s.leadBanUntil || s.leadBanUntil < nowMs)
  );
  if (allSellers.length === 0) return null;
  
  // Pick seller with fewest active leads (round-robin by load)
  let minLeads = Infinity;
  let targetSeller = allSellers[0];
  for (const s of allSellers) {
    const count = await db.select({ cnt: sql<number>`COUNT(*)` }).from(crmLeads)
      .where(and(eq(crmLeads.sellerId, s.id), eq(crmLeads.archived, false)));
    const cnt = Number(count[0]?.cnt || 0);
    if (cnt < minLeads) {
      minLeads = cnt;
      targetSeller = s;
    }
  }
  
  const oldSellerId = lead.sellerId;
  await updateLead(leadId, { sellerId: targetSeller.id });
  await createActivity({
    leadId,
    sellerId: targetSeller.id,
    type: "observacao",
    description: `Lead transferido automaticamente (vendedor anterior não respondeu em 10 min). De vendedor #${oldSellerId} para ${targetSeller.name}.`,
  });
  
  return { newSellerId: targetSeller.id, newSellerName: targetSeller.name, oldSellerId };
}
