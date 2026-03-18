import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  sellers, InsertSeller,
  competitions, InsertCompetition,
  competitionParticipants, InsertCompetitionParticipant,
  teams, InsertTeam,
  sales, InsertSale,
  trainings, InsertTraining,
  actionPlans, InsertActionPlan,
  motivationalQuotes, InsertMotivationalQuote,
  notifications, InsertNotification,
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
  const result = await db.insert(sales).values(data);
  // Update seller totals
  await db.update(sellers).set({
    totalSales: sql`totalSales + 1`,
    totalPoints: sql`totalPoints + ${data.points}`,
  }).where(eq(sellers.id, data.sellerId));
  // Update participant points if competition
  if (data.competitionId) {
    await db.update(competitionParticipants).set({
      points: sql`points + ${data.points}`,
      salesCount: sql`salesCount + 1`,
    }).where(and(
      eq(competitionParticipants.competitionId, data.competitionId),
      eq(competitionParticipants.sellerId, data.sellerId),
    ));
  }
  return result[0].insertId;
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
  const result = await db.select().from(motivationalQuotes).where(eq(motivationalQuotes.active, true)).orderBy(desc(motivationalQuotes.generatedAt)).limit(1);
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
