import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, like, or, desc, asc, sql, gte, lte, isNull, ne } from "drizzle-orm";
import {
  admins, InsertAdmin,
  crmLeads, InsertCrmLead,
  crmPipelineStages, InsertCrmPipelineStage,
  crmActivities, InsertCrmActivity,
  crmInventory, InsertCrmInventory,
  crmInventoryAlerts, InsertCrmInventoryAlert,
  crmIntegrations, InsertCrmIntegration,
  crmCampaigns, InsertCrmCampaign,
  sellers,
} from "../drizzle/schema";
import { getDb } from "./db";

// ===== ADMINS =====

export async function getAdminByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
  return rows[0] || null;
}

export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return rows[0] || null;
}

export async function createAdmin(data: { username: string; passwordHash: string; name: string; role?: "owner" | "admin"; permissions?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(admins).values({
    username: data.username,
    passwordHash: data.passwordHash,
    name: data.name,
    role: data.role || "admin",
    permissions: data.permissions || JSON.stringify({vendas:true,pre_vendas:false,consignacao:false,fei:false,marketing:false,financeiro:false,estoque:false,configuracoes:false,gerenciar_admins:false}),
  });
  return Number(result[0].insertId);
}

export async function listAdmins() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: admins.id, username: admins.username, name: admins.name, role: admins.role, active: admins.active, permissions: admins.permissions, createdAt: admins.createdAt }).from(admins).orderBy(desc(admins.createdAt));
}

export async function updateAdmin(id: number, data: Partial<{ name: string; passwordHash: string; active: boolean; role: "owner" | "admin"; permissions: string }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(admins).set(data).where(eq(admins.id, id));
}

export async function deleteAdmin(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(admins).where(eq(admins.id, id));
}

// ===== CRM LEADS =====

export async function createLead(data: InsertCrmLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmLeads).values(data);
  return Number(result[0].insertId);
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmLeads).where(eq(crmLeads.id, id)).limit(1);
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
  return db.select().from(crmLeads).where(and(...conditions)).orderBy(desc(crmLeads.updatedAt));
}

export async function listLeadsByDepartment(department: string, opts?: { archived?: boolean; stage?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(crmLeads.department, department)];
  if (opts?.archived !== undefined) conditions.push(eq(crmLeads.archived, opts.archived));
  if (opts?.stage) conditions.push(eq(crmLeads.stage, opts.stage));
  return db.select().from(crmLeads).where(and(...conditions)).orderBy(desc(crmLeads.updatedAt));
}

export async function listAllLeads(opts?: { archived?: boolean; department?: string; sellerId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (opts?.archived !== undefined) conditions.push(eq(crmLeads.archived, opts.archived));
  if (opts?.department) conditions.push(eq(crmLeads.department, opts.department));
  if (opts?.sellerId) conditions.push(eq(crmLeads.sellerId, opts.sellerId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(crmLeads).where(where).orderBy(desc(crmLeads.updatedAt));
}

export async function updateLead(id: number, data: Partial<InsertCrmLead>) {
  const db = await getDb();
  if (!db) return;
  await db.update(crmLeads).set(data).where(eq(crmLeads.id, id));
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
  return db.select().from(crmLeads).where(conditions).orderBy(desc(crmLeads.updatedAt)).limit(50);
}

export async function getLeadsNeedingFollowUp(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
  return db.select().from(crmLeads).where(
    and(
      eq(crmLeads.sellerId, sellerId),
      eq(crmLeads.archived, false),
      eq(crmLeads.convertedToSale, false),
      or(
        lte(crmLeads.lastContactDate, twoDaysAgo),
        isNull(crmLeads.lastContactDate),
      ),
    )
  ).orderBy(asc(crmLeads.lastContactDate));
}

export async function getLeadsByVehicleInterest(vehicleQuery: string) {
  const db = await getDb();
  if (!db) return [];
  const searchPattern = `%${vehicleQuery}%`;
  return db.select().from(crmLeads).where(
    and(
      eq(crmLeads.archived, false),
      eq(crmLeads.convertedToSale, false),
      like(crmLeads.vehicleInterest, searchPattern),
    )
  ).orderBy(desc(crmLeads.updatedAt));
}

export async function getLeadStats(sellerId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, hot: 0, warm: 0, cold: 0, converted: 0, bySource: [] as any[], byStage: [] as any[] };

  const conditions = sellerId ? and(eq(crmLeads.sellerId, sellerId), eq(crmLeads.archived, false)) : eq(crmLeads.archived, false);

  const rows = await db.select({
    score: crmLeads.score,
    convertedToSale: crmLeads.convertedToSale,
    count: sql<number>`COUNT(*)`,
  }).from(crmLeads).where(conditions).groupBy(crmLeads.score, crmLeads.convertedToSale);

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
  }).from(crmLeads).where(conditions).groupBy(crmLeads.source);

  const byStage = await db.select({
    stage: crmLeads.stage,
    count: sql<number>`COUNT(*)`,
  }).from(crmLeads).where(conditions).groupBy(crmLeads.stage);

  return { total, hot, warm, cold, converted, bySource, byStage };
}

// ===== CRM PIPELINE STAGES =====

export async function listPipelineStages(department?: string) {
  const db = await getDb();
  if (!db) return [];
  const where = department ? eq(crmPipelineStages.department, department) : undefined;
  return db.select().from(crmPipelineStages).where(where).orderBy(asc(crmPipelineStages.department), asc(crmPipelineStages.displayOrder));
}

export async function getDefaultStage(department: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmPipelineStages).where(
    and(eq(crmPipelineStages.department, department), eq(crmPipelineStages.isDefault, true))
  ).limit(1);
  return rows[0] || null;
}

// ===== CRM ACTIVITIES =====

export async function createActivity(data: InsertCrmActivity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmActivities).values(data);
  return Number(result[0].insertId);
}

export async function listActivitiesByLead(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmActivities).where(eq(crmActivities.leadId, leadId)).orderBy(desc(crmActivities.createdAt));
}

// ===== CRM INVENTORY =====

export async function createInventoryItem(data: InsertCrmInventory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmInventory).values(data);
  return Number(result[0].insertId);
}

export async function getInventoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmInventory).where(eq(crmInventory.id, id)).limit(1);
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
  return db.select().from(crmInventory).where(where).orderBy(desc(crmInventory.createdAt));
}

export async function updateInventoryItem(id: number, data: Partial<InsertCrmInventory>) {
  const db = await getDb();
  if (!db) return;
  await db.update(crmInventory).set(data).where(eq(crmInventory.id, id));
}

export async function deleteInventoryItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(crmInventory).where(eq(crmInventory.id, id));
}

// ===== CRM INVENTORY ALERTS =====

export async function createInventoryAlert(data: InsertCrmInventoryAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(crmInventoryAlerts).values(data);
}

export async function listInventoryAlertsBySeller(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmInventoryAlerts).where(
    and(eq(crmInventoryAlerts.sellerId, sellerId), eq(crmInventoryAlerts.dismissed, false))
  ).orderBy(desc(crmInventoryAlerts.createdAt));
}

export async function dismissInventoryAlert(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(crmInventoryAlerts).set({ dismissed: true }).where(eq(crmInventoryAlerts.id, id));
}

// ===== CRM INTEGRATIONS =====

export async function listIntegrations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmIntegrations).orderBy(desc(crmIntegrations.createdAt));
}

export async function getIntegrationByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(crmIntegrations).where(
    and(eq(crmIntegrations.apiToken, token), eq(crmIntegrations.active, true))
  ).limit(1);
  return rows[0] || null;
}

export async function createIntegration(data: InsertCrmIntegration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmIntegrations).values(data);
  return Number(result[0].insertId);
}

export async function updateIntegration(id: number, data: Partial<InsertCrmIntegration>) {
  const db = await getDb();
  if (!db) return;
  await db.update(crmIntegrations).set(data).where(eq(crmIntegrations.id, id));
}

export async function deleteIntegration(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(crmIntegrations).where(eq(crmIntegrations.id, id));
}

// ===== CRM CAMPAIGNS =====

export async function createCampaign(data: InsertCrmCampaign) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(crmCampaigns).values(data);
  return Number(result[0].insertId);
}

export async function listCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crmCampaigns).orderBy(desc(crmCampaigns.createdAt));
}

export async function updateCampaign(id: number, data: Partial<InsertCrmCampaign>) {
  const db = await getDb();
  if (!db) return;
  await db.update(crmCampaigns).set(data).where(eq(crmCampaigns.id, id));
}

export async function deleteCampaign(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(crmCampaigns).where(eq(crmCampaigns.id, id));
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
  }).from(crmLeads).where(where).groupBy(crmLeads.source);

  const byDepartment = await db.select({
    department: crmLeads.department,
    total: sql<number>`COUNT(*)`,
    converted: sql<number>`SUM(CASE WHEN ${crmLeads.convertedToSale} = true THEN 1 ELSE 0 END)`,
  }).from(crmLeads).where(where).groupBy(crmLeads.department);

  const totals = await db.select({
    total: sql<number>`COUNT(*)`,
    converted: sql<number>`SUM(CASE WHEN ${crmLeads.convertedToSale} = true THEN 1 ELSE 0 END)`,
  }).from(crmLeads).where(where);

  const totalLeads = Number(totals[0]?.total || 0);
  const totalConverted = Number(totals[0]?.converted || 0);
  const conversionRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0;

  return { bySource, byDepartment, conversionRate, totalLeads, totalConverted };
}
