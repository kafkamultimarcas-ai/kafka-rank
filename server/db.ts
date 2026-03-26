import { eq, desc, and, or, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  sellers, InsertSeller,
  competitions, InsertCompetition,
  competitionParticipants, InsertCompetitionParticipant,
  teams, InsertTeam,
  sales, InsertSale,
  feiRecords, InsertFeiRecord,
  consignmentRecords, InsertConsignmentRecord,
  dispatchRecords, InsertDispatchRecord,
  trainings, InsertTraining,
  actionPlans, InsertActionPlan,
  motivationalQuotes, InsertMotivationalQuote,
  notifications, InsertNotification,
  pushSubscriptions, InsertPushSubscription,
  sdrRecords, InsertSdrRecord,
  goals, InsertGoal,
  managers, InsertManager,
  mktStrategies, InsertMktStrategy,
  mktTasks, InsertMktTask,
  saleDocuments, InsertSaleDocument,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== SELLERS =====
// Safe columns (excludes passwordHash)
const safeSellerColumns = {
  id: sellers.id,
  name: sellers.name,
  nickname: sellers.nickname,
  photoUrl: sellers.photoUrl,
  photoKey: sellers.photoKey,
  phone: sellers.phone,
  email: sellers.email,
  department: sellers.department,
  active: sellers.active,
  totalSales: sellers.totalSales,
  totalPoints: sellers.totalPoints,
  username: sellers.username,
  lastAccess: sellers.lastAccess,
  createdAt: sellers.createdAt,
  updatedAt: sellers.updatedAt,
};

export async function listSellers(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) return db.select(safeSellerColumns).from(sellers).where(eq(sellers.active, true)).orderBy(desc(sellers.totalPoints));
  return db.select(safeSellerColumns).from(sellers).orderBy(desc(sellers.totalPoints));
}

export async function getSellerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select(safeSellerColumns).from(sellers).where(eq(sellers.id, id)).limit(1);
  return result[0];
}

// Internal use only - includes passwordHash for auth
export async function getSellerByIdInternal(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sellers).where(eq(sellers.id, id)).limit(1);
  return result[0];
}

export async function getSellerByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sellers).where(eq(sellers.username, username)).limit(1);
  return result[0];
}

export async function updateSellerLastAccess(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(sellers).set({ lastAccess: Date.now() }).where(eq(sellers.id, id));
}

export async function createSeller(data: InsertSeller) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sellers).values(data);
  return result[0].insertId;
}

export async function updateSeller(id: number, data: Partial<InsertSeller>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sellers).set(data).where(eq(sellers.id, id));
}

export async function deleteSeller(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(sellers).where(eq(sellers.id, id));
}

// ===== COMPETITIONS =====
export async function listCompetitions(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) return db.select().from(competitions).where(eq(competitions.status, status as any)).orderBy(desc(competitions.createdAt));
  return db.select().from(competitions).orderBy(desc(competitions.createdAt));
}

export async function getCompetitionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(competitions).where(eq(competitions.id, id)).limit(1);
  return result[0];
}

export async function createCompetition(data: InsertCompetition) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(competitions).values(data);
  return result[0].insertId;
}

export async function updateCompetition(id: number, data: Partial<InsertCompetition>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(competitions).set(data).where(eq(competitions.id, id));
}

export async function deleteCompetition(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(competitionParticipants).where(eq(competitionParticipants.competitionId, id));
  await db.delete(teams).where(eq(teams.competitionId, id));
  await db.delete(competitions).where(eq(competitions.id, id));
}

// ===== TEAMS =====
export async function listTeamsByCompetition(competitionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).where(eq(teams.competitionId, competitionId));
}

export async function createTeam(data: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(teams).values(data);
  return result[0].insertId;
}

export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(teams).where(eq(teams.id, id));
}

// ===== PARTICIPANTS =====
export async function listParticipants(competitionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(competitionParticipants).where(eq(competitionParticipants.competitionId, competitionId)).orderBy(desc(competitionParticipants.points));
}

export async function addParticipant(data: InsertCompetitionParticipant) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(competitionParticipants).values(data);
  return result[0].insertId;
}

export async function removeParticipant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(competitionParticipants).where(eq(competitionParticipants.id, id));
}

export async function updateParticipantPoints(id: number, points: number, salesCount: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(competitionParticipants).set({ points, salesCount }).where(eq(competitionParticipants.id, id));
}

// ===== SALES =====
export async function listSales(competitionId?: number, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (competitionId) conditions.push(eq(sales.competitionId, competitionId));
  if (sellerId) conditions.push(eq(sales.sellerId, sellerId));
  if (conditions.length > 0) return db.select().from(sales).where(and(...conditions)).orderBy(desc(sales.createdAt));
  return db.select().from(sales).orderBy(desc(sales.createdAt));
}

export async function createSale(data: InsertSale) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Vendas criadas pelo admin são aprovadas direto, vendas dos vendedores ficam pendentes
  const saleData = { ...data, status: data.status || 'pending' as const };
  const result = await db.insert(sales).values(saleData);
  // Se aprovada direto (admin), atualiza totais
  if (saleData.status === 'approved') {
    await updateSaleTotals(data.sellerId, data.competitionId, data.points ?? 1);
  }
  return result[0].insertId;
}

// Departamentos que participam do ranking de vendas
const SALES_RANKING_DEPARTMENTS = ['vendas'];
// Departamentos que participam do ranking de agendamentos
const APPOINTMENT_RANKING_DEPARTMENTS = ['vendas', 'pre_vendas'];

// incrementSales = true para vendas reais, false para agendamentos/SDR que não devem contar como venda
async function updateSaleTotals(sellerId: number, competitionId: number | null | undefined, points: number, incrementSales: boolean = true) {
  const db = await getDb();
  if (!db) return;
  
  // Verificar departamento do vendedor - só vendedores somam pontos de venda
  const sellerResult = await db.select({ department: sellers.department }).from(sellers).where(eq(sellers.id, sellerId)).limit(1);
  const sellerDept = sellerResult[0]?.department || 'vendas';
  
  if (incrementSales) {
    // Vendas: só departamento vendas soma pontos e vendas
    if (!SALES_RANKING_DEPARTMENTS.includes(sellerDept)) {
      return; // Outros setores não somam pontos de venda
    }
    await db.update(sellers).set({
      totalSales: sql`totalSales + 1`,
      totalPoints: sql`totalPoints + ${points}`,
    }).where(eq(sellers.id, sellerId));
  } else {
    // Agendamentos/SDR: só vendedores e SDR somam pontos
    if (!APPOINTMENT_RANKING_DEPARTMENTS.includes(sellerDept)) {
      return; // Outros setores não somam pontos de agendamento
    }
    await db.update(sellers).set({
      totalPoints: sql`totalPoints + ${points}`,
    }).where(eq(sellers.id, sellerId));
  }
  if (competitionId) {
    await db.update(competitionParticipants).set({
      points: sql`points + ${points}`,
      salesCount: incrementSales ? sql`salesCount + 1` : sql`salesCount`,
    }).where(and(
      eq(competitionParticipants.competitionId, competitionId),
      eq(competitionParticipants.sellerId, sellerId),
    ));
  }
}

export async function listPendingSales() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sales).where(eq(sales.status, 'pending')).orderBy(desc(sales.createdAt));
}

export async function approveSale(saleId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const saleResult = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
  const sale = saleResult[0];
  if (!sale || sale.status !== 'pending') throw new Error("Venda não encontrada ou já processada");
  await db.update(sales).set({ status: 'approved' }).where(eq(sales.id, saleId));
  await updateSaleTotals(sale.sellerId, sale.competitionId, sale.points);
  return sale;
}

export async function rejectSale(saleId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sales).set({ status: 'rejected' }).where(eq(sales.id, saleId));
}

export async function deleteSale(saleId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const saleResult = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
  const sale = saleResult[0];
  if (!sale) throw new Error("Venda não encontrada");
  // Se a venda estava aprovada, reverter os pontos
  if (sale.status === 'approved') {
    await db.update(sellers).set({
      totalSales: sql`GREATEST(totalSales - 1, 0)`,
      totalPoints: sql`GREATEST(totalPoints - ${sale.points}, 0)`,
    }).where(eq(sellers.id, sale.sellerId));
    if (sale.competitionId) {
      await db.update(competitionParticipants).set({
        points: sql`GREATEST(points - ${sale.points}, 0)`,
        salesCount: sql`GREATEST(salesCount - 1, 0)`,
      }).where(and(
        eq(competitionParticipants.competitionId, sale.competitionId),
        eq(competitionParticipants.sellerId, sale.sellerId),
      ));
    }
  }
  await db.delete(sales).where(eq(sales.id, saleId));
  return sale;
}

export async function editSale(saleId: number, data: { vehicleModel?: string; value?: number; sellerId?: number; status?: 'pending' | 'approved' | 'rejected'; leadSource?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const saleResult = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
  const oldSale = saleResult[0];
  if (!oldSale) throw new Error("Venda não encontrada");

  const updates: any = {};
  if (data.vehicleModel !== undefined) updates.vehicleModel = data.vehicleModel;
  if (data.value !== undefined) updates.value = data.value;
  if (data.leadSource !== undefined) updates.leadSource = data.leadSource;

  // Se mudou o status, precisa ajustar pontos
  const oldStatus = oldSale.status;
  const newStatus = data.status ?? oldStatus;
  const oldSellerId = oldSale.sellerId;
  const newSellerId = data.sellerId ?? oldSellerId;

  // Se mudou vendedor E estava aprovada, reverter pontos do antigo
  if (newSellerId !== oldSellerId && oldStatus === 'approved') {
    await db.update(sellers).set({
      totalSales: sql`GREATEST(totalSales - 1, 0)`,
      totalPoints: sql`GREATEST(totalPoints - ${oldSale.points}, 0)`,
    }).where(eq(sellers.id, oldSellerId));
    if (oldSale.competitionId) {
      await db.update(competitionParticipants).set({
        points: sql`GREATEST(points - ${oldSale.points}, 0)`,
        salesCount: sql`GREATEST(salesCount - 1, 0)`,
      }).where(and(
        eq(competitionParticipants.competitionId, oldSale.competitionId),
        eq(competitionParticipants.sellerId, oldSellerId),
      ));
    }
    // Dar pontos pro novo vendedor
    await updateSaleTotals(newSellerId, oldSale.competitionId, oldSale.points);
    updates.sellerId = newSellerId;
  } else if (newSellerId !== oldSellerId) {
    updates.sellerId = newSellerId;
  }

  // Se status mudou
  if (newStatus !== oldStatus) {
    updates.status = newStatus;
    if (oldStatus === 'approved' && newStatus !== 'approved') {
      // Estava aprovada, agora não está mais → reverter pontos
      await db.update(sellers).set({
        totalSales: sql`GREATEST(totalSales - 1, 0)`,
        totalPoints: sql`GREATEST(totalPoints - ${oldSale.points}, 0)`,
      }).where(eq(sellers.id, newSellerId));
      if (oldSale.competitionId) {
        await db.update(competitionParticipants).set({
          points: sql`GREATEST(points - ${oldSale.points}, 0)`,
          salesCount: sql`GREATEST(salesCount - 1, 0)`,
        }).where(and(
          eq(competitionParticipants.competitionId, oldSale.competitionId),
          eq(competitionParticipants.sellerId, newSellerId),
        ));
      }
    } else if (oldStatus !== 'approved' && newStatus === 'approved') {
      // Não estava aprovada, agora está → dar pontos
      await updateSaleTotals(newSellerId, oldSale.competitionId, oldSale.points);
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(sales).set(updates).where(eq(sales.id, saleId));
  }
  return { ...oldSale, ...updates };
}

// ===== LIVE FEED =====
export async function getRecentApprovedSales(sinceTimestamp: number) {
  const db = await getDb();
  if (!db) return [];
  const sinceDate = new Date(sinceTimestamp);
  const result = await db.select({
    id: sales.id,
    sellerId: sales.sellerId,
    vehicleModel: sales.vehicleModel,
    value: sales.value,
    points: sales.points,
    createdAt: sales.createdAt,
    sellerName: sellers.name,
    sellerNickname: sellers.nickname,
    sellerPhoto: sellers.photoUrl,
  })
    .from(sales)
    .innerJoin(sellers, eq(sales.sellerId, sellers.id))
    .where(and(
      eq(sales.status, 'approved'),
      sql`${sales.createdAt} > ${sinceDate}`
    ))
    .orderBy(desc(sales.createdAt))
    .limit(20);
  return result;
}

// ===== TRAININGS =====
export async function listTrainings(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) return db.select().from(trainings).where(eq(trainings.active, true)).orderBy(desc(trainings.createdAt));
  return db.select().from(trainings).orderBy(desc(trainings.createdAt));
}

export async function createTraining(data: InsertTraining) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(trainings).values(data);
  return result[0].insertId;
}

export async function updateTraining(id: number, data: Partial<InsertTraining>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(trainings).set(data).where(eq(trainings.id, id));
}

export async function deleteTraining(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(trainings).where(eq(trainings.id, id));
}

// ===== ACTION PLANS =====
export async function listActionPlans(sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (sellerId) return db.select().from(actionPlans).where(eq(actionPlans.sellerId, sellerId)).orderBy(desc(actionPlans.createdAt));
  return db.select().from(actionPlans).orderBy(desc(actionPlans.createdAt));
}

export async function createActionPlan(data: InsertActionPlan) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(actionPlans).values(data);
  return result[0].insertId;
}

export async function updateActionPlan(id: number, data: Partial<InsertActionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(actionPlans).set(data).where(eq(actionPlans.id, id));
}

export async function deleteActionPlan(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(actionPlans).where(eq(actionPlans.id, id));
}

// ===== MOTIVATIONAL QUOTES =====
export async function listQuotes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(motivationalQuotes).where(eq(motivationalQuotes.active, true)).orderBy(desc(motivationalQuotes.generatedAt));
}

export async function createQuote(data: InsertMotivationalQuote) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(motivationalQuotes).values(data);
  return result[0].insertId;
}

export async function getLatestQuote() {
  const db = await getDb();
  if (!db) return undefined;
  // Primeiro tenta buscar a frase do dia baseada no dayOfYear
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const dailyResult = await db.select().from(motivationalQuotes)
    .where(and(eq(motivationalQuotes.active, true), eq(motivationalQuotes.dayOfYear, dayOfYear)))
    .limit(1);
  if (dailyResult.length > 0) return dailyResult[0];
  
  // Fallback: busca a mais recente
  const result = await db.select().from(motivationalQuotes)
    .where(eq(motivationalQuotes.active, true))
    .orderBy(desc(motivationalQuotes.generatedAt))
    .limit(1);
  return result[0];
}

// ===== NOTIFICATIONS =====
export async function listNotifications(sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (sellerId) {
    return db.select().from(notifications)
      .where(or(
        eq(notifications.sellerId, sellerId),
        eq(notifications.targetType, 'all')
      ))
      .orderBy(desc(notifications.createdAt)).limit(50);
  }
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function listAdminNotifications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(or(
      eq(notifications.targetType, 'admin'),
      eq(notifications.targetType, 'all')
    ))
    .orderBy(desc(notifications.createdAt)).limit(100);
}

export async function countUnreadAdminNotifications() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(notifications)
    .where(and(
      or(eq(notifications.targetType, 'admin'), eq(notifications.targetType, 'all')),
      eq(notifications.read, false)
    ));
  return result[0]?.count ?? 0;
}

export async function countUnreadSellerNotifications(sellerId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(notifications)
    .where(and(
      or(
        eq(notifications.sellerId, sellerId),
        eq(notifications.targetType, 'all')
      ),
      eq(notifications.read, false)
    ));
  return result[0]?.count ?? 0;
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(targetType: string, sellerId?: number) {
  const db = await getDb();
  if (!db) return;
  if (targetType === 'admin') {
    await db.update(notifications).set({ read: true })
      .where(and(
        or(eq(notifications.targetType, 'admin'), eq(notifications.targetType, 'all')),
        eq(notifications.read, false)
      ));
  } else if (sellerId) {
    await db.update(notifications).set({ read: true })
      .where(and(
        or(
          eq(notifications.sellerId, sellerId),
          eq(notifications.targetType, 'all')
        ),
        eq(notifications.read, false)
      ));
  }
}

// Push subscriptions por vendedor
export async function getPushSubscriptionsBySeller(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.sellerId, sellerId));
}

// ===== PUSH SUBSCRIPTIONS =====
export async function savePushSubscription(data: { endpoint: string; p256dh: string; auth: string; sellerId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Verificar se já existe essa subscription
  const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, data.endpoint)).limit(1);
  if (existing.length > 0) {
    // Atualizar
    await db.update(pushSubscriptions).set({
      p256dh: data.p256dh,
      auth: data.auth,
      sellerId: data.sellerId ?? null,
    }).where(eq(pushSubscriptions.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(pushSubscriptions).values(data);
  return result[0].insertId;
}

export async function getAllPushSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions);
}

export async function deletePushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

// ===== GOALS (METAS) =====
export async function listGoals(filters?: { month?: number; year?: number; type?: string; sellerId?: number; category?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.month) conditions.push(eq(goals.month, filters.month));
  if (filters?.year) conditions.push(eq(goals.year, filters.year));
  if (filters?.type) conditions.push(eq(goals.type, filters.type as any));
  if (filters?.sellerId) conditions.push(eq(goals.sellerId, filters.sellerId));
  if (filters?.category) conditions.push(eq(goals.category, filters.category));
  if (conditions.length > 0) return db.select().from(goals).where(and(...conditions)).orderBy(desc(goals.createdAt));
  return db.select().from(goals).orderBy(desc(goals.createdAt));
}

export async function createGoal(data: InsertGoal) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(goals).values(data);
  return result[0].insertId;
}

export async function updateGoal(id: number, data: Partial<InsertGoal>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(goals).set(data).where(eq(goals.id, id));
}

export async function deleteGoal(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(goals).where(eq(goals.id, id));
}

export async function incrementGoalProgress(goalId: number, amount: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(goals).set({
    currentValue: sql`currentValue + ${amount}`,
  }).where(eq(goals.id, goalId));
  // Check if achieved
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
  if (goal && goal.currentValue >= goal.targetValue && !goal.achieved) {
    await db.update(goals).set({ achieved: true }).where(eq(goals.id, goalId));
    return { achieved: true, goal };
  }
  return { achieved: false, goal };
}

// Auto-incrementar meta da loja quando venda é aprovada
// Determina a categoria da venda pela competição associada ou default "vendas"
export async function autoUpdateStoreGoal(saleCategory: string, month: number, year: number, amount: number = 1) {
  const db = await getDb();
  if (!db) return;
  // Buscar meta da loja do mês/ano/categoria
  const [goal] = await db.select().from(goals)
    .where(and(
      eq(goals.type, 'store'),
      eq(goals.month, month),
      eq(goals.year, year),
      eq(goals.category, saleCategory)
    ))
    .limit(1);
  if (!goal) return; // Sem meta cadastrada para essa categoria/mês
  const newValue = Math.max(0, goal.currentValue + amount);
  const achieved = newValue >= goal.targetValue;
  await db.update(goals).set({
    currentValue: newValue,
    achieved,
  }).where(eq(goals.id, goal.id));
  return { goalId: goal.id, newValue, achieved };
}

// ===== RANKING / DASHBOARD =====
export async function getCompetitionRanking(competitionId: number) {
  const db = await getDb();
  if (!db) return [];
  const participants = await db.select().from(competitionParticipants).where(eq(competitionParticipants.competitionId, competitionId)).orderBy(desc(competitionParticipants.points));
  const sellerIds = participants.map(p => p.sellerId);
  if (sellerIds.length === 0) return [];
  const sellersList = await db.select().from(sellers).where(inArray(sellers.id, sellerIds));
  const sellersMap = new Map(sellersList.map(s => [s.id, s]));
  return participants.map((p, idx) => ({
    position: idx + 1,
    participant: p,
    seller: sellersMap.get(p.sellerId),
  }));
}

export async function getTeamRanking(competitionId: number) {
  const db = await getDb();
  if (!db) return [];
  const teamsList = await db.select().from(teams).where(eq(teams.competitionId, competitionId));
  const participants = await db.select().from(competitionParticipants).where(eq(competitionParticipants.competitionId, competitionId));
  const sellerIds = participants.map(p => p.sellerId);
  const sellersList = sellerIds.length > 0 ? await db.select().from(sellers).where(inArray(sellers.id, sellerIds)) : [];
  const sellersMap = new Map(sellersList.map(s => [s.id, s]));

  return teamsList.map(team => {
    const teamParticipants = participants.filter(p => p.teamId === team.id);
    const totalPoints = teamParticipants.reduce((sum, p) => sum + p.points, 0);
    const totalSales = teamParticipants.reduce((sum, p) => sum + p.salesCount, 0);
    return {
      team,
      totalPoints,
      totalSales,
      members: teamParticipants.map(p => ({
        participant: p,
        seller: sellersMap.get(p.sellerId),
      })),
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints);
}

// ===== F&I RECORDS =====
export async function listFeiRecords(competitionId?: number, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (competitionId) conditions.push(eq(feiRecords.competitionId, competitionId));
  if (sellerId) conditions.push(eq(feiRecords.sellerId, sellerId));
  if (conditions.length > 0) return db.select().from(feiRecords).where(and(...conditions)).orderBy(desc(feiRecords.createdAt));
  return db.select().from(feiRecords).orderBy(desc(feiRecords.createdAt));
}

export async function createFeiRecord(data: InsertFeiRecord) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(feiRecords).values(data);
  return result[0].insertId;
}

export async function listPendingFeiRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feiRecords).where(eq(feiRecords.status, 'pending')).orderBy(desc(feiRecords.createdAt));
}

export async function approveFeiRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(feiRecords).where(eq(feiRecords.id, id)).limit(1);
  const record = result[0];
  if (!record || record.status !== 'pending') throw new Error("Registro F&I não encontrado ou já processado");
  await db.update(feiRecords).set({ status: 'approved' }).where(eq(feiRecords.id, id));
  // F&I NÃO é venda de veículo - incrementSales=false para não contar no ranking de vendas
  await updateSaleTotals(record.sellerId, record.competitionId, record.points, false);
  return record;
}

export async function rejectFeiRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(feiRecords).set({ status: 'rejected' }).where(eq(feiRecords.id, id));
}

export async function deleteFeiRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(feiRecords).where(eq(feiRecords.id, id)).limit(1);
  const record = result[0];
  if (!record) throw new Error("Registro não encontrado");
  if (record.status === 'approved') {
    // F&I NÃO decrementa totalSales (não é venda de veículo)
    await db.update(sellers).set({
      totalPoints: sql`GREATEST(totalPoints - ${record.points}, 0)`,
    }).where(eq(sellers.id, record.sellerId));
    if (record.competitionId) {
      await db.update(competitionParticipants).set({
        points: sql`GREATEST(points - ${record.points}, 0)`,
      }).where(and(
        eq(competitionParticipants.competitionId, record.competitionId),
        eq(competitionParticipants.sellerId, record.sellerId),
      ));
    }
  }
  await db.delete(feiRecords).where(eq(feiRecords.id, id));
}

// ===== CONSIGNMENT RECORDS =====
export async function listConsignmentRecords(competitionId?: number, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (competitionId) conditions.push(eq(consignmentRecords.competitionId, competitionId));
  if (sellerId) conditions.push(eq(consignmentRecords.sellerId, sellerId));
  if (conditions.length > 0) return db.select().from(consignmentRecords).where(and(...conditions)).orderBy(desc(consignmentRecords.createdAt));
  return db.select().from(consignmentRecords).orderBy(desc(consignmentRecords.createdAt));
}

// Verificar se placa já está no pátio (sem saída) ou foi consignada nos últimos 60 dias
export async function checkConsignmentPlate(plate: string): Promise<{ blocked: boolean; warning: boolean; message: string; previousDate?: number }> {
  const db = await getDb();
  if (!db) return { blocked: false, warning: false, message: '' };
  if (!plate || plate.trim().length === 0) return { blocked: false, warning: false, message: '' };
  
  const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Buscar todos os registros com essa placa (não rejeitados)
  const records = await db.select().from(consignmentRecords)
    .where(and(
      sql`UPPER(REPLACE(${consignmentRecords.vehiclePlate}, '-', '')) = ${normalizedPlate}`,
      sql`${consignmentRecords.status} != 'rejected'`,
    ))
    .orderBy(desc(consignmentRecords.createdAt));
  
  if (records.length === 0) return { blocked: false, warning: false, message: '' };
  
  const latest = records[0];
  const daysSinceLast = Math.floor((Date.now() - latest.entryDate) / (1000 * 60 * 60 * 24));
  
  // Se o carro ainda está no pátio (sem saída e aprovado/pendente), bloqueia
  if (!latest.exitDate && (latest.status === 'approved' || latest.status === 'pending')) {
    return {
      blocked: true,
      warning: false,
      message: `Este veículo já está no pátio! Placa registrada em ${new Date(latest.entryDate).toLocaleDateString('pt-BR')}. Dê saída primeiro antes de registrar novamente.`,
      previousDate: latest.entryDate,
    };
  }
  
  // Se foi consignado nos últimos 60 dias, bloqueia
  if (daysSinceLast < 60) {
    return {
      blocked: true,
      warning: false,
      message: `Este veículo foi consignado há ${daysSinceLast} dias (${new Date(latest.entryDate).toLocaleDateString('pt-BR')}). Só pode ser consignado novamente após 60 dias.`,
      previousDate: latest.entryDate,
    };
  }
  
  // Após 60 dias, permite mas com aviso
  return {
    blocked: false,
    warning: true,
    message: `Atenção: este veículo já foi consignado anteriormente. Primeira consignação em ${new Date(records[records.length - 1].entryDate).toLocaleDateString('pt-BR')}. Última em ${new Date(latest.entryDate).toLocaleDateString('pt-BR')}.`,
    previousDate: latest.entryDate,
  };
}

// Listar veículos atualmente no pátio (aprovados, sem saída)
export async function listVehiclesInYard() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consignmentRecords)
    .where(and(
      eq(consignmentRecords.status, 'approved'),
      sql`${consignmentRecords.exitDate} IS NULL`,
    ))
    .orderBy(consignmentRecords.entryDate);
}

// Listar veículos que completaram 7 dias (meta consignação)
export async function listVehiclesCompleted7Days(month?: number, year?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(consignmentRecords.status, 'approved'),
    eq(consignmentRecords.isValid, true),
  ];
  if (month && year) {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01 00:00:00`;
    conditions.push(sql`CAST(${consignmentRecords.createdAt} AS CHAR) >= ${startStr}`);
    conditions.push(sql`CAST(${consignmentRecords.createdAt} AS CHAR) < ${endStr}`);
  }
  return db.select().from(consignmentRecords)
    .where(and(...conditions))
    .orderBy(desc(consignmentRecords.createdAt));
}

// Listar veículos que já saíram do pátio (histórico)
export async function listVehiclesExited(month?: number, year?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(consignmentRecords.status, 'approved'),
    sql`${consignmentRecords.exitDate} IS NOT NULL`,
  ];
  if (month && year) {
    const startStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01 00:00:00`;
    conditions.push(sql`CAST(${consignmentRecords.createdAt} AS CHAR) >= ${startStr}`);
    conditions.push(sql`CAST(${consignmentRecords.createdAt} AS CHAR) < ${endStr}`);
  }
  return db.select().from(consignmentRecords)
    .where(and(...conditions))
    .orderBy(desc(consignmentRecords.exitDate));
}

export async function createConsignmentRecord(data: InsertConsignmentRecord) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(consignmentRecords).values(data);
  return result[0].insertId;
}

export async function listPendingConsignmentRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consignmentRecords).where(eq(consignmentRecords.status, 'pending')).orderBy(desc(consignmentRecords.createdAt));
}

export async function approveConsignmentRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(consignmentRecords).where(eq(consignmentRecords.id, id)).limit(1);
  const record = result[0];
  if (!record || record.status !== 'pending') throw new Error("Registro de consignação não encontrado ou já processado");
  // Verificar se já passou os dias mínimos
  const daysPassed = Math.floor((Date.now() - record.entryDate) / (1000 * 60 * 60 * 24));
  const isValid = daysPassed >= record.validAfterDays;
  await db.update(consignmentRecords).set({ status: 'approved', isValid }).where(eq(consignmentRecords.id, id));
  if (isValid) {
    // Consignação NÃO é venda de veículo - incrementSales=false
    await updateSaleTotals(record.sellerId, record.competitionId, record.points, false);
  }
  return { ...record, isValid };
}

export async function rejectConsignmentRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(consignmentRecords).set({ status: 'rejected' }).where(eq(consignmentRecords.id, id));
}

export async function updateConsignmentExitDate(id: number, exitDate: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(consignmentRecords).where(eq(consignmentRecords.id, id)).limit(1);
  const record = result[0];
  if (!record) throw new Error("Registro n\u00e3o encontrado");
  // Calcular se é válido baseado na diferença entre saída e entrada
  const daysPassed = Math.floor((exitDate - record.entryDate) / (1000 * 60 * 60 * 24));
  const isValid = daysPassed >= record.validAfterDays;
  await db.update(consignmentRecords).set({ exitDate, isValid }).where(eq(consignmentRecords.id, id));
  // Se ficou válido agora e já estava aprovado, atualizar pontos
  if (isValid && record.status === 'approved' && !record.isValid) {
    await updateSaleTotals(record.sellerId, record.competitionId, record.points, false);
  }
  return { ...record, exitDate, isValid };
}

export async function validateConsignmentDays() {
  // Valida consignações aprovadas que completaram os 7 dias
  const db = await getDb();
  if (!db) return;
  const records = await db.select().from(consignmentRecords).where(and(
    eq(consignmentRecords.status, 'approved'),
    eq(consignmentRecords.isValid, false),
  ));
  for (const record of records) {
    const daysPassed = Math.floor((Date.now() - record.entryDate) / (1000 * 60 * 60 * 24));
    if (daysPassed >= record.validAfterDays) {
      await db.update(consignmentRecords).set({ isValid: true }).where(eq(consignmentRecords.id, record.id));
      // Consignação NÃO é venda de veículo - incrementSales=false
      await updateSaleTotals(record.sellerId, record.competitionId, record.points, false);
    }
  }
}

// ===== DISPATCH RECORDS =====
export async function listDispatchRecords(competitionId?: number, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (competitionId) conditions.push(eq(dispatchRecords.competitionId, competitionId));
  if (sellerId) conditions.push(eq(dispatchRecords.sellerId, sellerId));
  if (conditions.length > 0) return db.select().from(dispatchRecords).where(and(...conditions)).orderBy(desc(dispatchRecords.createdAt));
  return db.select().from(dispatchRecords).orderBy(desc(dispatchRecords.createdAt));
}

export async function createDispatchRecord(data: InsertDispatchRecord) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(dispatchRecords).values(data);
  return result[0].insertId;
}

export async function listPendingDispatchRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dispatchRecords).where(eq(dispatchRecords.status, 'pending')).orderBy(desc(dispatchRecords.createdAt));
}

export async function approveDispatchRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(dispatchRecords).where(eq(dispatchRecords.id, id)).limit(1);
  const record = result[0];
  if (!record || record.status !== 'pending') throw new Error("Registro de despachante não encontrado ou já processado");
  await db.update(dispatchRecords).set({ status: 'approved' }).where(eq(dispatchRecords.id, id));
  const totalPoints = record.points + record.bonusPoints;
  // Despachante NÃO é venda de veículo - incrementSales=false
  await updateSaleTotals(record.sellerId, record.competitionId, totalPoints, false);
  return record;
}

export async function rejectDispatchRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(dispatchRecords).set({ status: 'rejected' }).where(eq(dispatchRecords.id, id));
}

export async function deleteDispatchRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(dispatchRecords).where(eq(dispatchRecords.id, id)).limit(1);
  const record = result[0];
  if (!record) throw new Error("Registro não encontrado");
  if (record.status === 'approved') {
    const totalPoints = record.points + record.bonusPoints;
    // Despachante NÃO decrementa totalSales (não é venda de veículo)
    await db.update(sellers).set({
      totalPoints: sql`GREATEST(totalPoints - ${totalPoints}, 0)`,
    }).where(eq(sellers.id, record.sellerId));
    if (record.competitionId) {
      await db.update(competitionParticipants).set({
        points: sql`GREATEST(points - ${totalPoints}, 0)`,
      }).where(and(
        eq(competitionParticipants.competitionId, record.competitionId),
        eq(competitionParticipants.sellerId, record.sellerId),
      ));
    }
  }
  await db.delete(dispatchRecords).where(eq(dispatchRecords.id, id));
}

// Despachante: marcar como transferido com documento emitido
export async function markDispatchTransferred(id: number, documentUrl: string, documentKey: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(dispatchRecords).where(eq(dispatchRecords.id, id)).limit(1);
  const record = result[0];
  if (!record) throw new Error("Registro de despachante n\u00e3o encontrado");
  await db.update(dispatchRecords).set({
    documentUrl,
    documentKey,
    transferredAt: Date.now(),
  }).where(eq(dispatchRecords.id, id));
  return { ...record, documentUrl, documentKey, transferredAt: Date.now() };
}

// Listar documentos transferidos para um vendedor (pelo originalSellerId)
export async function listTransferredDocumentsForSeller(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dispatchRecords)
    .where(and(
      eq(dispatchRecords.originalSellerId, sellerId),
      sql`${dispatchRecords.transferredAt} IS NOT NULL`
    ))
    .orderBy(desc(dispatchRecords.transferredAt));
}

// Listar todos os documentos transferidos (para admin/despachante)
export async function listAllTransferredDocuments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dispatchRecords)
    .where(sql`${dispatchRecords.transferredAt} IS NOT NULL`)
    .orderBy(desc(dispatchRecords.transferredAt));
}

// ===== SDR / PRÉ-VENDAS / AGENDAMENTOS =====
export async function getNextTicketNumber() {
  const db = await getDb();
  if (!db) return '#A001';
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(sdrRecords).where(eq(sdrRecords.type, 'agendamento'));
  const num = Number(result?.count || 0) + 1;
  return `#A${String(num).padStart(3, '0')}`;
}

export async function createSdrRecord(data: InsertSdrRecord) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Gerar ticket number automático para agendamentos
  if (data.type === 'agendamento' && !data.ticketNumber) {
    data.ticketNumber = await getNextTicketNumber();
  }
  const result = await db.insert(sdrRecords).values(data);
  return { id: result[0].insertId, ticketNumber: data.ticketNumber };
}

export async function listSdrRecords(competitionId?: number, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (competitionId) conditions.push(eq(sdrRecords.competitionId, competitionId));
  if (sellerId) conditions.push(eq(sdrRecords.sellerId, sellerId));
  if (conditions.length > 0) return db.select().from(sdrRecords).where(and(...conditions)).orderBy(desc(sdrRecords.createdAt));
  return db.select().from(sdrRecords).orderBy(desc(sdrRecords.createdAt));
}

export async function listPendingSdrRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sdrRecords).where(eq(sdrRecords.status, 'pending')).orderBy(desc(sdrRecords.createdAt));
}

export async function approveSdrRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(sdrRecords).where(eq(sdrRecords.id, id)).limit(1);
  const record = result[0];
  if (!record || record.status !== 'pending') throw new Error("Registro SDR não encontrado ou já processado");
  await db.update(sdrRecords).set({ status: 'approved' }).where(eq(sdrRecords.id, id));
  // Para agendamentos: NÃO dar pontos aqui. Pontos só são dados quando gerente aprova comparecimento (approveAttendance).
  // Para lead_convertido: dar pontos na aprovação do registro.
  // incrementSales=false pois SDR/pré-vendas NÃO são vendas de veículos
  if (record.type !== 'agendamento') {
    await updateSaleTotals(record.sellerId, record.competitionId, record.points, false);
  }
  return record;
}

export async function rejectSdrRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sdrRecords).set({ status: 'rejected' }).where(eq(sdrRecords.id, id));
}

// Vendedor marca que cliente compareceu
export async function markAttendance(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(sdrRecords).where(eq(sdrRecords.id, id)).limit(1);
  const record = result[0];
  if (!record) throw new Error("Agendamento não encontrado");
  await db.update(sdrRecords).set({
    attendanceStatus: 'attended',
    attendanceMarkedAt: Date.now(),
  }).where(eq(sdrRecords.id, id));
  return record;
}

// Listar agendamentos pendentes de aprovação de comparecimento
export async function listPendingAttendance() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sdrRecords).where(
    eq(sdrRecords.attendanceStatus, 'attended')
  ).orderBy(desc(sdrRecords.createdAt));
}

// Gerente aprova comparecimento
export async function approveAttendance(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(sdrRecords).where(eq(sdrRecords.id, id)).limit(1);
  const record = result[0];
  if (!record) throw new Error("Agendamento não encontrado");
  if (record.attendanceStatus === 'approved') throw new Error("Comparecimento já foi aprovado");
  await db.update(sdrRecords).set({ attendanceStatus: 'approved' }).where(eq(sdrRecords.id, id));
  // Só gera ponto quando gerente aprova comparecimento do cliente
  // Para agendamentos: este é o único momento que dá ponto (1pt)
  // incrementSales=false pois agendamento NÃO é venda
  await updateSaleTotals(record.sellerId, record.competitionId, record.points || 1, false);
  return record;
}

// Gerente reprova comparecimento
export async function rejectAttendance(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sdrRecords).set({ attendanceStatus: 'rejected' }).where(eq(sdrRecords.id, id));
}

// Gerente marca como não compareceu
export async function markNoShow(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sdrRecords).set({ attendanceStatus: 'no_show' }).where(eq(sdrRecords.id, id));
}

// Reagendar agendamento (vendedor tenta resgate)
export async function rescheduleSdrRecord(id: number, newDate: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = {
    scheduledDate: newDate,
    attendanceStatus: 'pending',
  };
  if (notes) updateData.notes = notes;
  await db.update(sdrRecords).set(updateData).where(eq(sdrRecords.id, id));
}

// Listar agendamentos aprovados para sorteio
export async function listApprovedAppointments(competitionId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(sdrRecords.type, 'agendamento'),
    eq(sdrRecords.status, 'approved'),
  ];
  if (competitionId) conditions.push(eq(sdrRecords.competitionId, competitionId));
  return db.select().from(sdrRecords).where(and(...conditions)).orderBy(desc(sdrRecords.createdAt));
}

export async function deleteSdrRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(sdrRecords).where(eq(sdrRecords.id, id)).limit(1);
  const record = result[0];
  if (!record) throw new Error("Registro não encontrado");
  if (record.status === 'approved') {
    // SDR/Agendamento NÃO decrementa totalSales (não é venda de veículo)
    await db.update(sellers).set({
      totalPoints: sql`GREATEST(totalPoints - ${record.points}, 0)`,
    }).where(eq(sellers.id, record.sellerId));
    if (record.competitionId) {
      await db.update(competitionParticipants).set({
        points: sql`GREATEST(points - ${record.points}, 0)`,
      }).where(and(
        eq(competitionParticipants.competitionId, record.competitionId),
        eq(competitionParticipants.sellerId, record.sellerId),
      ));
    }
  }
  await db.delete(sdrRecords).where(eq(sdrRecords.id, id));
}

// ===== UPDATE SDR RECORD (admin edit) =====
export async function updateSdrRecord(id: number, data: {
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  vehicleInterest?: string | null;
  scheduledDate?: number | null;
  notes?: string | null;
  attendanceStatus?: string;
  isFeirão?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = {};
  if (data.customerName !== undefined) updateData.customerName = data.customerName;
  if (data.customerPhone !== undefined) updateData.customerPhone = data.customerPhone;
  if (data.customerEmail !== undefined) updateData.customerEmail = data.customerEmail;
  if (data.vehicleInterest !== undefined) updateData.vehicleInterest = data.vehicleInterest;
  if (data.scheduledDate !== undefined) updateData.scheduledDate = data.scheduledDate;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.attendanceStatus !== undefined) updateData.attendanceStatus = data.attendanceStatus;
  if (data.isFeirão !== undefined) updateData.isFeirão = data.isFeirão;
  if (Object.keys(updateData).length > 0) {
    await db.update(sdrRecords).set(updateData).where(eq(sdrRecords.id, id));
  }
  return { success: true };
}

// ===== ALL PENDING (cross-sector) =====
export async function getAllPendingCount() {
  const db = await getDb();
  if (!db) return { sales: 0, fei: 0, consignment: 0, dispatch: 0, sdr: 0, total: 0 };
  const [s] = await db.select({ count: sql<number>`count(*)` }).from(sales).where(eq(sales.status, 'pending'));
  const [f] = await db.select({ count: sql<number>`count(*)` }).from(feiRecords).where(eq(feiRecords.status, 'pending'));
  const [c] = await db.select({ count: sql<number>`count(*)` }).from(consignmentRecords).where(eq(consignmentRecords.status, 'pending'));
  const [d] = await db.select({ count: sql<number>`count(*)` }).from(dispatchRecords).where(eq(dispatchRecords.status, 'pending'));
  const [sdr] = await db.select({ count: sql<number>`count(*)` }).from(sdrRecords).where(eq(sdrRecords.status, 'pending'));
  const salesCount = Number(s?.count || 0);
  const feiCount = Number(f?.count || 0);
  const consignmentCount = Number(c?.count || 0);
  const dispatchCount = Number(d?.count || 0);
  const sdrCount = Number(sdr?.count || 0);
  return { sales: salesCount, fei: feiCount, consignment: consignmentCount, dispatch: dispatchCount, sdr: sdrCount, total: salesCount + feiCount + consignmentCount + dispatchCount + sdrCount };
}

// ===== APP SETTINGS =====
import { appSettings } from "../drizzle/schema";

export async function getAppSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appSettings).where(eq(appSettings.settingKey, key)).limit(1);
  return result[0]?.settingValue;
}

export async function setAppSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(appSettings).values({ settingKey: key, settingValue: value })
    .onDuplicateKeyUpdate({ set: { settingValue: value } });
}


// ===== MANAGERS (Gerentes com login por senha) =====

export async function createManager(data: { username: string; passwordHash: string; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(managers).values(data);
  return result[0].insertId;
}

export async function getManagerByUsername(username: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(managers).where(eq(managers.username, username)).limit(1);
  return result[0] || null;
}

export async function getManagerById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(managers).where(eq(managers.id, id)).limit(1);
  return result[0] || null;
}

export async function listManagers() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.select({
    id: managers.id,
    username: managers.username,
    name: managers.name,
    active: managers.active,
    createdAt: managers.createdAt,
  }).from(managers).orderBy(managers.name);
}

export async function updateManager(id: number, data: { name?: string; passwordHash?: string; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(managers).set(data).where(eq(managers.id, id));
}

export async function deleteManager(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(managers).where(eq(managers.id, id));
}

// ===== RANKING MENSAL DE VENDAS (sem campanha) =====
export async function getMonthlyRanking(month: number, year: number, category?: string) {
  const db = await getDb();
  if (!db) return [];
  // Calcular início e fim do mês como strings para MySQL
  const startStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01 00:00:00`;
  
  // Buscar todas as vendas aprovadas do mês
  const monthSales = await db.select().from(sales)
    .where(and(
      eq(sales.status, 'approved'),
      sql`CAST(${sales.createdAt} AS CHAR) >= ${startStr}`,
      sql`CAST(${sales.createdAt} AS CHAR) < ${endStr}`,
    ));
  
  // Agrupar por vendedor
  const sellerMap = new Map<number, { count: number; totalValue: number; points: number }>();
  for (const sale of monthSales) {
    const existing = sellerMap.get(sale.sellerId) || { count: 0, totalValue: 0, points: 0 };
    existing.count += 1;
    existing.totalValue += sale.value || 0;
    existing.points += sale.points || 1;
    sellerMap.set(sale.sellerId, existing);
  }
  
  // Determinar qual departamento filtrar baseado na categoria da meta
  // vendas e feirao = department vendas; fei = department fei; etc.
  const deptFilter = (!category || category === 'vendas' || category === 'feirao') ? 'vendas' : category;
  
  // Buscar vendedores ativos filtrados por departamento
  const allSellers = await db.select().from(sellers).where(
    and(eq(sellers.active, true), eq(sellers.department, deptFilter))
  );
  
  if (allSellers.length === 0) {
    return [];
  }
  
  // Montar ranking apenas com vendedores do departamento correto
  const ranking = allSellers.map(s => {
    const stats = sellerMap.get(s.id) || { count: 0, totalValue: 0, points: 0 };
    return {
      seller: s,
      salesCount: stats.count,
      totalValue: stats.totalValue,
      points: stats.points,
    };
  });
  
  // Ordenar por quantidade de vendas (decrescente)
  ranking.sort((a, b) => b.salesCount - a.salesCount || b.totalValue - a.totalValue);
  
  return ranking.map((r, idx) => ({
    position: idx + 1,
    ...r,
  }));
}

// ===== RANKING DE AGENDAMENTOS =====
export async function getAppointmentRanking(month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  
  const startStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01 00:00:00`;
  
  // Buscar todos os agendamentos do mês (aprovados pelo gerente)
  const monthAppointments = await db.select().from(sdrRecords)
    .where(and(
      eq(sdrRecords.type, 'agendamento'),
      eq(sdrRecords.status, 'approved'),
      sql`CAST(${sdrRecords.createdAt} AS CHAR) >= ${startStr}`,
      sql`CAST(${sdrRecords.createdAt} AS CHAR) < ${endStr}`,
    ));
  
  // Agrupar por vendedor: total agendados e total comparecidos
  const sellerMap = new Map<number, { scheduled: number; attended: number }>();
  for (const appt of monthAppointments) {
    const existing = sellerMap.get(appt.sellerId) || { scheduled: 0, attended: 0 };
    existing.scheduled += 1;
    if (appt.attendanceStatus === 'approved') {
      existing.attended += 1;
    }
    sellerMap.set(appt.sellerId, existing);
  }
  
  // Buscar vendedores ativos dos departamentos vendas e pré-vendas (SDR)
  const allSellers = await db.select().from(sellers).where(
    and(eq(sellers.active, true), or(eq(sellers.department, 'vendas'), eq(sellers.department, 'pre_vendas')))
  );
  
  // Montar ranking com todos que têm agendamentos
  const ranking = allSellers
    .filter(s => sellerMap.has(s.id))
    .map(s => {
      const stats = sellerMap.get(s.id)!;
      return {
        seller: s,
        scheduledCount: stats.scheduled,
        attendedCount: stats.attended,
        conversionRate: stats.scheduled > 0 ? Math.round((stats.attended / stats.scheduled) * 100) : 0,
      };
    });
  
  // Ordenar por comparecidos (decrescente), depois por agendados
  ranking.sort((a, b) => b.attendedCount - a.attendedCount || b.scheduledCount - a.scheduledCount);
  
  return ranking.map((r, idx) => ({
    position: idx + 1,
    ...r,
  }));
}


// ===== MÓDULO PÓS-VENDA =====
import { pvOficinas, pvChamados, pvGastos, pvHistorico, pvOrcamentos, pvOrcamentoItens, InsertPvOficina, InsertPvChamado, InsertPvGasto, InsertPvHistorico, InsertPvOrcamento, InsertPvOrcamentoItem } from "../drizzle/schema";

// --- Oficinas Parceiras ---
export async function listOficinas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pvOficinas).where(eq(pvOficinas.active, true)).orderBy(pvOficinas.name);
}

export async function createOficina(data: InsertPvOficina) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pvOficinas).values(data);
  return result[0].insertId;
}

export async function updateOficina(id: number, data: { name?: string; phone?: string; address?: string; notes?: string; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(pvOficinas).set(data).where(eq(pvOficinas.id, id));
}

export async function deleteOficina(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(pvOficinas).set({ active: false }).where(eq(pvOficinas.id, id));
}

// --- Chamados Pós-Venda ---
export async function getNextPvTicketNumber() {
  const db = await getDb();
  if (!db) return "#PV001";
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(pvChamados);
  const num = Number(result?.count || 0) + 1;
  return `#PV${String(num).padStart(3, '0')}`;
}

export async function createPvChamado(data: InsertPvChamado) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pvChamados).values(data);
  const chamadoId = result[0].insertId;
  // Registrar no histórico
  await db.insert(pvHistorico).values({
    chamadoId,
    acao: 'abertura',
    descricao: `Chamado aberto: ${data.problemaRelatado}`,
    usuario: 'Vendedor',
  });
  return chamadoId;
}

export async function listPvChamados(filters?: { status?: string; vendedorId?: number; responsavelPvId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status && filters.status !== 'todos') {
    conditions.push(eq(pvChamados.status, filters.status as any));
  }
  if (filters?.vendedorId) {
    conditions.push(eq(pvChamados.vendedorId, filters.vendedorId));
  }
  if (filters?.responsavelPvId) {
    conditions.push(eq(pvChamados.responsavelPvId, filters.responsavelPvId));
  }
  if (conditions.length > 0) {
    return db.select().from(pvChamados).where(and(...conditions)).orderBy(desc(pvChamados.updatedAt));
  }
  return db.select().from(pvChamados).orderBy(desc(pvChamados.updatedAt));
}

export async function getPvChamadoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(pvChamados).where(eq(pvChamados.id, id)).limit(1);
  return result[0] || null;
}

export async function updatePvChamado(id: number, data: {
  status?: string;
  responsavelPvId?: number;
  oficinaId?: number;
  oficinaNome?: string;
  dataEntradaAgendada?: number;
  dataEntradaReal?: number;
  prazoEntrega?: number;
  dataEntregaReal?: number;
  observacoes?: string;
  servicoRealizado?: string;
  clienteNome?: string;
  clienteTelefone?: string;
  carroModelo?: string;
  carroPlaca?: string;
  problemaRelatado?: string;
}, usuario: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) updateData[key] = value;
  }
  if (Object.keys(updateData).length > 0) {
    await db.update(pvChamados).set(updateData).where(eq(pvChamados.id, id));
  }
  // Registrar ação no histórico
  let acao = 'atualizacao';
  let descricao = 'Chamado atualizado';
  if (data.status === 'agendado') { acao = 'agendamento'; descricao = `Entrada agendada`; }
  else if (data.status === 'em_servico') { acao = 'servico'; descricao = 'Veículo em serviço'; }
  else if (data.status === 'finalizado') { acao = 'finalizacao'; descricao = 'Serviço finalizado'; }
  else if (data.status === 'entregue') { acao = 'entrega'; descricao = 'Veículo entregue ao cliente'; }
  else if (data.status === 'cancelado') { acao = 'cancelamento'; descricao = 'Chamado cancelado'; }
  else if (data.servicoRealizado) { acao = 'servico_obs'; descricao = `Observação do serviço: ${data.servicoRealizado.substring(0, 100)}`; }
  else if (data.oficinaId || data.oficinaNome) { acao = 'oficina'; descricao = `Oficina vinculada: ${data.oficinaNome || 'ID ' + data.oficinaId}`; }
  else if (data.prazoEntrega) { acao = 'prazo'; descricao = `Prazo de entrega definido: ${new Date(data.prazoEntrega).toLocaleDateString('pt-BR')}`; }
  await db.insert(pvHistorico).values({ chamadoId: id, acao, descricao, usuario });
  return { success: true };
}

export async function deletePvChamado(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Deletar gastos e histórico associados
  await db.delete(pvGastos).where(eq(pvGastos.chamadoId, id));
  await db.delete(pvHistorico).where(eq(pvHistorico.chamadoId, id));
  await db.delete(pvChamados).where(eq(pvChamados.id, id));
}

// --- Gastos Pós-Venda ---
export async function listPvGastos(chamadoId?: number, statusAprovacao?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (chamadoId) conditions.push(eq(pvGastos.chamadoId, chamadoId));
  if (statusAprovacao && statusAprovacao !== 'todos') conditions.push(eq(pvGastos.statusAprovacao, statusAprovacao as any));
  if (conditions.length > 0) {
    return db.select().from(pvGastos).where(and(...conditions)).orderBy(desc(pvGastos.createdAt));
  }
  return db.select().from(pvGastos).orderBy(desc(pvGastos.createdAt));
}

export async function createPvGasto(data: InsertPvGasto, usuario: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pvGastos).values(data);
  // Registrar no histórico do chamado
  await db.insert(pvHistorico).values({
    chamadoId: data.chamadoId,
    acao: 'gasto',
    descricao: `Gasto registrado: ${data.descricao} - R$ ${data.valor}`,
    usuario,
  });
  return result[0].insertId;
}

export async function updatePvGastoStatus(id: number, statusAprovacao: string, autorizadoPor?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = { statusAprovacao };
  if (statusAprovacao === 'autorizado' || statusAprovacao === 'recusado') {
    updateData.autorizadoPor = autorizadoPor || 'Admin';
    updateData.autorizadoEm = Date.now();
  }
  if (statusAprovacao === 'pago') {
    updateData.pagoEm = Date.now();
  }
  await db.update(pvGastos).set(updateData).where(eq(pvGastos.id, id));
  // Registrar no histórico
  const gasto = await db.select().from(pvGastos).where(eq(pvGastos.id, id)).limit(1);
  if (gasto[0]) {
    const statusLabel = statusAprovacao === 'autorizado' ? 'Autorizado' : statusAprovacao === 'recusado' ? 'Recusado' : statusAprovacao === 'pago' ? 'Pago' : statusAprovacao;
    await db.insert(pvHistorico).values({
      chamadoId: gasto[0].chamadoId,
      acao: 'gasto_status',
      descricao: `Gasto "${gasto[0].descricao}" - Status: ${statusLabel} por ${autorizadoPor || 'Admin'}`,
      usuario: autorizadoPor || 'Admin',
    });
  }
}

export async function deletePvGasto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(pvGastos).where(eq(pvGastos.id, id));
}

// --- Histórico ---
export async function listPvHistorico(chamadoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pvHistorico).where(eq(pvHistorico.chamadoId, chamadoId)).orderBy(desc(pvHistorico.createdAt));
}

// --- Contadores e Alertas ---
export async function getPvChamadosCounts() {
  const db = await getDb();
  if (!db) return { aberto: 0, agendado: 0, em_servico: 0, finalizado: 0, entregue: 0, total: 0 };
  const all = await db.select({ status: pvChamados.status, count: sql<number>`count(*)` }).from(pvChamados).groupBy(pvChamados.status);
  const counts: any = { aberto: 0, agendado: 0, em_servico: 0, finalizado: 0, entregue: 0, cancelado: 0, total: 0 };
  for (const row of all) {
    counts[row.status] = Number(row.count);
    if (row.status !== 'cancelado') counts.total += Number(row.count);
  }
  return counts;
}

export async function getPvGastosPendentes() {
  const db = await getDb();
  if (!db) return { count: 0, total: 0 };
  const result = await db.select({
    count: sql<number>`count(*)`,
    total: sql<string>`COALESCE(SUM(valor), 0)`,
  }).from(pvGastos).where(eq(pvGastos.statusAprovacao, 'pendente'));
  return { count: Number(result[0]?.count || 0), total: parseFloat(String(result[0]?.total || '0')) };
}

// Chamados com prazo vencendo (próximas 24h) ou vencidos
export async function getPvChamadosAlerta() {
  const db = await getDb();
  if (!db) return { vencendo: [], vencidos: [] };
  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;
  
  // Chamados com prazo vencido (não entregues/cancelados)
  const vencidos = await db.select().from(pvChamados).where(and(
    sql`${pvChamados.prazoEntrega} IS NOT NULL`,
    sql`${pvChamados.prazoEntrega} < ${now}`,
    sql`${pvChamados.status} NOT IN ('entregue', 'cancelado')`,
  )).orderBy(pvChamados.prazoEntrega);
  
  // Chamados com prazo nas próximas 24h
  const vencendo = await db.select().from(pvChamados).where(and(
    sql`${pvChamados.prazoEntrega} IS NOT NULL`,
    sql`${pvChamados.prazoEntrega} >= ${now}`,
    sql`${pvChamados.prazoEntrega} <= ${in24h}`,
    sql`${pvChamados.status} NOT IN ('entregue', 'cancelado')`,
  )).orderBy(pvChamados.prazoEntrega);
  
  return { vencendo, vencidos };
}

// Resumo financeiro de gastos pós-venda
export async function getPvGastosResumo() {
  const db = await getDb();
  if (!db) return { pendente: 0, autorizado: 0, recusado: 0, pago: 0 };
  const all = await db.select({
    status: pvGastos.statusAprovacao,
    total: sql<string>`COALESCE(SUM(valor), 0)`,
  }).from(pvGastos).groupBy(pvGastos.statusAprovacao);
  const resumo: any = { pendente: 0, autorizado: 0, recusado: 0, pago: 0 };
  for (const row of all) {
    resumo[row.status] = parseFloat(String(row.total));
  }
  return resumo;
}

// Listar todos os gastos com info do chamado (para tela financeira)
export async function listAllPvGastosWithChamado(statusAprovacao?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (statusAprovacao && statusAprovacao !== 'todos') {
    conditions.push(eq(pvGastos.statusAprovacao, statusAprovacao as any));
  }
  const gastos = conditions.length > 0
    ? await db.select().from(pvGastos).where(and(...conditions)).orderBy(desc(pvGastos.createdAt))
    : await db.select().from(pvGastos).orderBy(desc(pvGastos.createdAt));
  
  // Buscar chamados associados
  const chamadoIds = Array.from(new Set(gastos.map(g => g.chamadoId)));
  if (chamadoIds.length === 0) return [];
  const chamados = await db.select().from(pvChamados).where(inArray(pvChamados.id, chamadoIds));
  const chamadoMap = new Map(chamados.map(c => [c.id, c]));
  
  return gastos.map(g => ({
    ...g,
    chamado: chamadoMap.get(g.chamadoId) || null,
  }));
}

// ============ MARKETING ============

export async function listMktStrategies() {
  const db = await getDb();
  return db!.select().from(mktStrategies).orderBy(desc(mktStrategies.createdAt));
}

export async function createMktStrategy(data: InsertMktStrategy) {
  const db = await getDb();
  const result = await db!.insert(mktStrategies).values(data);
  return { id: result[0].insertId };
}

export async function updateMktStrategy(id: number, data: Partial<InsertMktStrategy>) {
  const db = await getDb();
  await db!.update(mktStrategies).set(data).where(eq(mktStrategies.id, id));
}

export async function deleteMktStrategy(id: number) {
  const db = await getDb();
  // Delete associated tasks first
  await db!.delete(mktTasks).where(eq(mktTasks.strategyId, id));
  await db!.delete(mktStrategies).where(eq(mktStrategies.id, id));
}

export async function listMktTasks(strategyId?: number) {
  const db = await getDb();
  if (strategyId) {
    return db!.select().from(mktTasks).where(eq(mktTasks.strategyId, strategyId)).orderBy(desc(mktTasks.createdAt));
  }
  return db!.select().from(mktTasks).orderBy(desc(mktTasks.createdAt));
}

export async function createMktTask(data: InsertMktTask) {
  const db = await getDb();
  const result = await db!.insert(mktTasks).values(data);
  return { id: result[0].insertId };
}

export async function updateMktTask(id: number, data: Partial<InsertMktTask>) {
  const db = await getDb();
  await db!.update(mktTasks).set(data).where(eq(mktTasks.id, id));
}

export async function deleteMktTask(id: number) {
  const db = await getDb();
  await db!.delete(mktTasks).where(eq(mktTasks.id, id));
}


// ===== IAM CONFIG =====
import { iamConfig, InsertIamConfig } from "../drizzle/schema";

export async function getIamConfig() {
  const db = await getDb();
  const rows = await db!.select().from(iamConfig).limit(1);
  return rows[0] || null;
}

export async function updateIamConfig(data: Partial<InsertIamConfig>) {
  const db = await getDb();
  const existing = await getIamConfig();
  if (existing) {
    await db!.update(iamConfig).set(data).where(eq(iamConfig.id, existing.id));
    return { ...existing, ...data };
  } else {
    const [result] = await db!.insert(iamConfig).values({ ...data } as InsertIamConfig);
    return { id: result.insertId, ...data };
  }
}


// ===== DOCUMENTOS DE VENDA (Vendedor → Despachante) =====

// Criar registro de documentos para uma venda (chamado automaticamente quando venda é aprovada)
export async function createSaleDocument(data: Partial<InsertSaleDocument> & { saleId: number; sellerId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(saleDocuments).values(data as InsertSaleDocument);
  return result[0].insertId;
}

// Buscar documento de venda pelo saleId
export async function getSaleDocumentBySaleId(saleId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(saleDocuments).where(eq(saleDocuments.saleId, saleId)).limit(1);
  return result[0] || null;
}

// Listar documentos de venda por vendedor
export async function listSaleDocumentsBySeller(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(saleDocuments).where(eq(saleDocuments.sellerId, sellerId)).orderBy(desc(saleDocuments.createdAt));
}

// Listar todos os documentos de venda (para despachante/admin)
export async function listAllSaleDocuments(filterStatus?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filterStatus) conditions.push(eq(saleDocuments.docStatus, filterStatus as any));
  if (conditions.length > 0) return db.select().from(saleDocuments).where(and(...conditions)).orderBy(desc(saleDocuments.createdAt));
  return db.select().from(saleDocuments).orderBy(desc(saleDocuments.createdAt));
}

// Vendedor faz upload de CNH
export async function uploadSaleDocCnh(id: number, cnhUrl: string, cnhKey: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const doc = await db.select().from(saleDocuments).where(eq(saleDocuments.id, id)).limit(1);
  if (!doc[0]) throw new Error("Documento de venda não encontrado");
  const hasComprovante = !!doc[0].comprovanteUrl;
  const newStatus = hasComprovante ? 'completo' : 'parcial';
  const newDispatchStatus = hasComprovante ? 'docs_enviados' : doc[0].dispatchStatus;
  await db.update(saleDocuments).set({
    cnhUrl, cnhKey,
    docStatus: newStatus,
    dispatchStatus: newDispatchStatus === 'aguardando_docs' ? (newStatus === 'completo' ? 'docs_enviados' : 'aguardando_docs') : newDispatchStatus,
  }).where(eq(saleDocuments.id, id));
  return { ...doc[0], cnhUrl, cnhKey, docStatus: newStatus };
}

// Vendedor faz upload de Comprovante de Residência
export async function uploadSaleDocComprovante(id: number, comprovanteUrl: string, comprovanteKey: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const doc = await db.select().from(saleDocuments).where(eq(saleDocuments.id, id)).limit(1);
  if (!doc[0]) throw new Error("Documento de venda não encontrado");
  const hasCnh = !!doc[0].cnhUrl;
  const newStatus = hasCnh ? 'completo' : 'parcial';
  const newDispatchStatus = hasCnh ? 'docs_enviados' : doc[0].dispatchStatus;
  await db.update(saleDocuments).set({
    comprovanteUrl, comprovanteKey,
    docStatus: newStatus,
    dispatchStatus: newDispatchStatus === 'aguardando_docs' ? (newStatus === 'completo' ? 'docs_enviados' : 'aguardando_docs') : newDispatchStatus,
  }).where(eq(saleDocuments.id, id));
  return { ...doc[0], comprovanteUrl, comprovanteKey, docStatus: newStatus };
}

// Despachante marca como em transferência
export async function markSaleDocInTransfer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(saleDocuments).set({ dispatchStatus: 'em_transferencia' }).where(eq(saleDocuments.id, id));
}

// Despachante marca como transferido e inclui documento emitido
export async function markSaleDocTransferred(id: number, documentoEmitidoUrl: string, documentoEmitidoKey: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(saleDocuments).set({
    dispatchStatus: 'transferido',
    documentoEmitidoUrl,
    documentoEmitidoKey,
    transferredAt: Date.now(),
  }).where(eq(saleDocuments.id, id));
}

// Contar documentos pendentes por vendedor
export async function countPendingDocsBySeller(sellerId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(saleDocuments)
    .where(and(
      eq(saleDocuments.sellerId, sellerId),
      sql`${saleDocuments.docStatus} != 'completo'`
    ));
  return Number(result?.count || 0);
}

// Buscar documento de venda pelo id do documento
export async function getSaleDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(saleDocuments).where(eq(saleDocuments.id, id)).limit(1);
  return result[0] || null;
}


// ===== MÓDULO ORÇAMENTOS PÓS-VENDA =====

// Listar orçamentos de um chamado
export async function listPvOrcamentos(chamadoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pvOrcamentos).where(eq(pvOrcamentos.chamadoId, chamadoId)).orderBy(desc(pvOrcamentos.createdAt));
}

// Listar todos os orçamentos (para financeiro)
export async function listAllPvOrcamentos(statusAprovacao?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusAprovacao && statusAprovacao !== 'todos') {
    return db.select().from(pvOrcamentos).where(eq(pvOrcamentos.statusAprovacao, statusAprovacao as any)).orderBy(desc(pvOrcamentos.createdAt));
  }
  return db.select().from(pvOrcamentos).orderBy(desc(pvOrcamentos.createdAt));
}

// Listar todos os orçamentos com info do chamado (para financeiro)
export async function listAllPvOrcamentosWithChamado(statusAprovacao?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (statusAprovacao && statusAprovacao !== 'todos') {
    conditions.push(eq(pvOrcamentos.statusAprovacao, statusAprovacao as any));
  }
  const query = db.select({
    orcamento: pvOrcamentos,
    chamado: {
      id: pvChamados.id,
      ticketNumber: pvChamados.ticketNumber,
      clienteNome: pvChamados.clienteNome,
      clienteTelefone: pvChamados.clienteTelefone,
      carroModelo: pvChamados.carroModelo,
      carroPlaca: pvChamados.carroPlaca,
      status: pvChamados.status,
    },
  }).from(pvOrcamentos)
    .leftJoin(pvChamados, eq(pvOrcamentos.chamadoId, pvChamados.id));
  
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(pvOrcamentos.createdAt));
  }
  return query.orderBy(desc(pvOrcamentos.createdAt));
}

// Criar orçamento
export async function createPvOrcamento(data: Omit<InsertPvOrcamento, 'id' | 'createdAt' | 'updatedAt'>, usuario: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pvOrcamentos).values(data as any);
  const orcamentoId = result[0].insertId;
  
  // Registrar no histórico do chamado
  await db.insert(pvHistorico).values({
    chamadoId: data.chamadoId,
    acao: 'orcamento',
    descricao: `Orçamento "${data.titulo}" lançado - ${Number(data.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    usuario,
  });
  
  return orcamentoId;
}

// Adicionar item ao orçamento
export async function addPvOrcamentoItem(data: Omit<InsertPvOrcamentoItem, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pvOrcamentoItens).values(data as any);
  
  // Recalcular total do orçamento
  await recalcPvOrcamentoTotal(data.orcamentoId);
  
  return result[0].insertId;
}

// Listar itens de um orçamento
export async function listPvOrcamentoItens(orcamentoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pvOrcamentoItens).where(eq(pvOrcamentoItens.orcamentoId, orcamentoId)).orderBy(pvOrcamentoItens.createdAt);
}

// Remover item do orçamento
export async function deletePvOrcamentoItem(id: number, orcamentoId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(pvOrcamentoItens).where(eq(pvOrcamentoItens.id, id));
  await recalcPvOrcamentoTotal(orcamentoId);
}

// Recalcular total do orçamento
async function recalcPvOrcamentoTotal(orcamentoId: number) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.select({
    total: sql<string>`COALESCE(SUM(${pvOrcamentoItens.valorTotal}), 0)`,
  }).from(pvOrcamentoItens).where(eq(pvOrcamentoItens.orcamentoId, orcamentoId));
  
  await db.update(pvOrcamentos).set({ valorTotal: String(result?.total || '0') }).where(eq(pvOrcamentos.id, orcamentoId));
}

// Aprovar/Reprovar orçamento (financeiro)
export async function updatePvOrcamentoStatus(id: number, statusAprovacao: string, aprovadoPor: string, motivoReprovacao?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  const updateData: any = { statusAprovacao, aprovadoPor };
  if (statusAprovacao === 'aprovado' || statusAprovacao === 'pago') {
    updateData.aprovadoEm = Date.now();
  }
  if (motivoReprovacao) {
    updateData.motivoReprovacao = motivoReprovacao;
  }
  
  await db.update(pvOrcamentos).set(updateData).where(eq(pvOrcamentos.id, id));
  
  // Registrar no histórico do chamado
  const orc = await db.select().from(pvOrcamentos).where(eq(pvOrcamentos.id, id)).limit(1);
  if (orc[0]) {
    const statusLabel = statusAprovacao === 'aprovado' ? 'APROVADO' : statusAprovacao === 'reprovado' ? 'REPROVADO' : statusAprovacao === 'pago' ? 'PAGO' : statusAprovacao;
    await db.insert(pvHistorico).values({
      chamadoId: orc[0].chamadoId,
      acao: 'orcamento_status',
      descricao: `Orçamento "${orc[0].titulo}" ${statusLabel} por ${aprovadoPor}${motivoReprovacao ? ` - Motivo: ${motivoReprovacao}` : ''}`,
      usuario: aprovadoPor,
    });
  }
}

// Deletar orçamento inteiro
export async function deletePvOrcamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Deletar itens primeiro
  await db.delete(pvOrcamentoItens).where(eq(pvOrcamentoItens.orcamentoId, id));
  await db.delete(pvOrcamentos).where(eq(pvOrcamentos.id, id));
}

// Contagem de orçamentos pendentes
export async function getPvOrcamentosPendentes() {
  const db = await getDb();
  if (!db) return { count: 0, total: '0' };
  const [result] = await db.select({
    count: sql<number>`count(*)`,
    total: sql<string>`COALESCE(SUM(${pvOrcamentos.valorTotal}), 0)`,
  }).from(pvOrcamentos).where(eq(pvOrcamentos.statusAprovacao, 'pendente'));
  return { count: Number(result?.count || 0), total: String(result?.total || '0') };
}

// Resumo de orçamentos por status
export async function getPvOrcamentosResumo() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    status: pvOrcamentos.statusAprovacao,
    count: sql<number>`count(*)`,
    total: sql<string>`COALESCE(SUM(${pvOrcamentos.valorTotal}), 0)`,
  }).from(pvOrcamentos).groupBy(pvOrcamentos.statusAprovacao);
}

// Buscar orçamento por ID
export async function getPvOrcamentoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(pvOrcamentos).where(eq(pvOrcamentos.id, id)).limit(1);
  return result[0] || null;
}


// ===== RANKING FEIRÃO =====

// Listar todos agendamentos de feirão (para ranking e conferência)
export async function listFeiraoAgendamentos(competitionId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(sdrRecords.isFeirão, true), eq(sdrRecords.type, 'agendamento')];
  if (competitionId) conditions.push(eq(sdrRecords.competitionId, competitionId));
  return db.select().from(sdrRecords).where(and(...conditions)).orderBy(desc(sdrRecords.scheduledDate));
}

// Ranking de feirão: quem mais agendou pro feirão
export async function getRankingFeirao(competitionId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(sdrRecords.isFeirão, true), eq(sdrRecords.type, 'agendamento')];
  if (competitionId) conditions.push(eq(sdrRecords.competitionId, competitionId));
  const result = await db.select({
    sellerId: sdrRecords.sellerId,
    total: sql<number>`count(*)`,
    compareceram: sql<number>`SUM(CASE WHEN ${sdrRecords.attendanceStatus} IN ('attended', 'approved') THEN 1 ELSE 0 END)`,
    naoVieram: sql<number>`SUM(CASE WHEN ${sdrRecords.attendanceStatus} = 'no_show' THEN 1 ELSE 0 END)`,
    pendentes: sql<number>`SUM(CASE WHEN ${sdrRecords.attendanceStatus} = 'pending' THEN 1 ELSE 0 END)`,
  }).from(sdrRecords).where(and(...conditions)).groupBy(sdrRecords.sellerId).orderBy(desc(sql`count(*)`));
  return result;
}

// ===== VÍNCULO TELEFONE: AGENDAMENTO ↔ VENDA =====

// Normalizar telefone para busca (remove tudo que não é dígito, pega últimos 8-9 dígitos)
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Pega os últimos 9 dígitos (ou 8 se o telefone for fixo)
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

// Buscar agendamentos por telefone do cliente (para cruzamento com venda)
export async function findSdrRecordByPhone(phone: string) {
  const db = await getDb();
  if (!db) return [];
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) return [];
  // Busca com LIKE nos últimos dígitos
  const result = await db.select().from(sdrRecords)
    .where(and(
      sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${sdrRecords.customerPhone}, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ${'%' + normalized}`,
      eq(sdrRecords.type, 'agendamento'),
    ))
    .orderBy(desc(sdrRecords.createdAt));
  return result;
}

// Vincular venda a um agendamento SDR
export async function linkSaleToSdrRecord(saleId: number, sdrRecordId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sales).set({ sdrRecordId }).where(eq(sales.id, saleId));
  // Marcar o agendamento como convertido
  await db.update(sdrRecords).set({ converted: true }).where(eq(sdrRecords.id, sdrRecordId));
}

// Listar vendas vinculadas a agendamentos de um SDR (para controle de comissão)
export async function listSalesLinkedToSdr(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  // Busca todas as vendas que têm sdrRecordId vinculado a agendamentos deste SDR
  const sdrIds = await db.select({ id: sdrRecords.id }).from(sdrRecords)
    .where(and(eq(sdrRecords.sellerId, sellerId), eq(sdrRecords.type, 'agendamento')));
  if (sdrIds.length === 0) return [];
  const ids = sdrIds.map(r => r.id);
  return db.select().from(sales).where(and(
    inArray(sales.sdrRecordId, ids),
    eq(sales.status, 'approved'),
  )).orderBy(desc(sales.createdAt));
}

// Buscar agendamentos convertidos de um SDR com detalhes da venda
export async function getSdrConversions(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  const records = await db.select().from(sdrRecords)
    .where(and(
      eq(sdrRecords.sellerId, sellerId),
      eq(sdrRecords.type, 'agendamento'),
      eq(sdrRecords.converted, true),
    ))
    .orderBy(desc(sdrRecords.createdAt));
  // Para cada agendamento convertido, buscar a venda vinculada
  const result = [];
  for (const record of records) {
    const saleResult = await db.select().from(sales)
      .where(eq(sales.sdrRecordId, record.id)).limit(1);
    const sale = saleResult[0] || null;
    const sellerResult = sale ? await db.select().from(sellers).where(eq(sellers.id, sale.sellerId)).limit(1) : [];
    result.push({
      agendamento: record,
      venda: sale,
      vendedorNome: sellerResult[0]?.name || 'Desconhecido',
    });
  }
  return result;
}
