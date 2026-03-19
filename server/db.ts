import { eq, desc, and, sql, inArray } from "drizzle-orm";
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
export async function listSellers(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) return db.select().from(sellers).where(eq(sellers.active, true)).orderBy(desc(sellers.totalPoints));
  return db.select().from(sellers).orderBy(desc(sellers.totalPoints));
}

export async function getSellerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sellers).where(eq(sellers.id, id)).limit(1);
  return result[0];
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

async function updateSaleTotals(sellerId: number, competitionId: number | null | undefined, points: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(sellers).set({
    totalSales: sql`totalSales + 1`,
    totalPoints: sql`totalPoints + ${points}`,
  }).where(eq(sellers.id, sellerId));
  if (competitionId) {
    await db.update(competitionParticipants).set({
      points: sql`points + ${points}`,
      salesCount: sql`salesCount + 1`,
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
  if (sellerId) return db.select().from(notifications).where(eq(notifications.sellerId, sellerId)).orderBy(desc(notifications.createdAt)).limit(50);
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50);
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
  await updateSaleTotals(record.sellerId, record.competitionId, record.points);
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
    await db.update(sellers).set({
      totalSales: sql`GREATEST(totalSales - 1, 0)`,
      totalPoints: sql`GREATEST(totalPoints - ${record.points}, 0)`,
    }).where(eq(sellers.id, record.sellerId));
    if (record.competitionId) {
      await db.update(competitionParticipants).set({
        points: sql`GREATEST(points - ${record.points}, 0)`,
        salesCount: sql`GREATEST(salesCount - 1, 0)`,
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
    await updateSaleTotals(record.sellerId, record.competitionId, record.points);
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
    await updateSaleTotals(record.sellerId, record.competitionId, record.points);
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
      await updateSaleTotals(record.sellerId, record.competitionId, record.points);
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
  await updateSaleTotals(record.sellerId, record.competitionId, totalPoints);
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
    await db.update(sellers).set({
      totalSales: sql`GREATEST(totalSales - 1, 0)`,
      totalPoints: sql`GREATEST(totalPoints - ${totalPoints}, 0)`,
    }).where(eq(sellers.id, record.sellerId));
    if (record.competitionId) {
      await db.update(competitionParticipants).set({
        points: sql`GREATEST(points - ${totalPoints}, 0)`,
        salesCount: sql`GREATEST(salesCount - 1, 0)`,
      }).where(and(
        eq(competitionParticipants.competitionId, record.competitionId),
        eq(competitionParticipants.sellerId, record.sellerId),
      ));
    }
  }
  await db.delete(dispatchRecords).where(eq(dispatchRecords.id, id));
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
  await updateSaleTotals(record.sellerId, record.competitionId, record.points);
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
  await db.update(sdrRecords).set({ attendanceStatus: 'approved' }).where(eq(sdrRecords.id, id));
  // Só gera ponto quando gerente aprova comparecimento
  if (record.status === 'approved') {
    // Já estava aprovado como registro, agora aprova comparecimento = ponto extra
    await updateSaleTotals(record.sellerId, record.competitionId, 1);
  }
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
    await db.update(sellers).set({
      totalSales: sql`GREATEST(totalSales - 1, 0)`,
      totalPoints: sql`GREATEST(totalPoints - ${record.points}, 0)`,
    }).where(eq(sellers.id, record.sellerId));
    if (record.competitionId) {
      await db.update(competitionParticipants).set({
        points: sql`GREATEST(points - ${record.points}, 0)`,
        salesCount: sql`GREATEST(salesCount - 1, 0)`,
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
