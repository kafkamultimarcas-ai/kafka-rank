import { eq, desc, and, or, sql, inArray, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  sellers, InsertSeller,
  managerPermissions, InsertManagerPermission,
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
  fichasFinanciamento, InsertFichaFinanciamento, fichaBancos, InsertFichaBanco, BANCOS_FINANCIAMENTO,
  bracketMatches, InsertBracketMatch,
  monthlySnapshots, InsertMonthlySnapshot,
  competitionSnapshots, InsertCompetitionSnapshot,
  feiAuditLogs, InsertFeiAuditLog,
  sellerPermissions, InsertSellerPermission,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export function resetDbConnection() {
  _db = null;
}

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

/** Wrapper that retries once on ECONNRESET */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = err?.cause?.code === 'ECONNRESET' || err?.message?.includes('ECONNRESET') ||
        err?.cause?.code === 'ETIMEDOUT' || err?.message?.includes('ETIMEDOUT') ||
        err?.cause?.code === 'ECONNREFUSED' || err?.message?.includes('Connection lost');
      if (isRetryable && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.warn(`[Database] Connection error (attempt ${attempt + 1}/${maxRetries}) - retrying in ${delay}ms...`);
        resetDbConnection();
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('withRetry: should not reach here');
}

// Raw SQL query helper for audit trail and ad-hoc updates
export async function rawQuery(query: string, params: any[] = []) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Use Drizzle's sql template for proper parameterized queries
  const chunks: any[] = [];
  const parts = query.split('?');
  for (let i = 0; i < parts.length; i++) {
    chunks.push(sql.raw(parts[i]));
    if (i < params.length) {
      chunks.push(sql`${params[i]}`);
    }
  }
  const combined = sql.join(chunks, sql.raw(''));
  return db.execute(combined);
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
    await db.insert(users).values({...values, tenantId: getCurrentTenantId()}).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(and(eq(users.tenantId, getCurrentTenantId()), eq(users.openId, openId))).limit(1);
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
  sellerRole: sellers.sellerRole,
  createdAt: sellers.createdAt,
  updatedAt: sellers.updatedAt,
};

export async function listSellers(activeOnly = false) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) return db.select(safeSellerColumns).from(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()), eq(sellers.active, true))).orderBy(desc(sellers.totalPoints));
  return db.select(safeSellerColumns).from(sellers).where(eq(sellers.tenantId, getCurrentTenantId())).orderBy(desc(sellers.totalPoints));
}

export async function getSellerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select(safeSellerColumns).from(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()), eq(sellers.id, id))).limit(1);
  return result[0];
}

// Internal use only - includes passwordHash for auth
export async function getSellerByIdInternal(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()), eq(sellers.id, id))).limit(1);
  return result[0];
}

export async function getSellerByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()), eq(sellers.username, username))).limit(1);
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
  const result = await db.insert(sellers).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function updateSeller(id: number, data: Partial<InsertSeller>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sellers).set(data).where(and(eq(sellers.tenantId, getCurrentTenantId()), eq(sellers.id, id)));
}

export async function deleteSeller(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()), eq(sellers.id, id)));
}

// ===== COMPETITIONS =====
export async function listCompetitions(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) return db.select().from(competitions).where(and(eq(competitions.tenantId, getCurrentTenantId()), eq(competitions.status, status as any))).orderBy(desc(competitions.createdAt));
  return db.select().from(competitions).where(eq(competitions.tenantId, getCurrentTenantId())).orderBy(desc(competitions.createdAt));
}

export async function getCompetitionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(competitions).where(and(eq(competitions.tenantId, getCurrentTenantId()), eq(competitions.id, id))).limit(1);
  return result[0];
}

export async function createCompetition(data: InsertCompetition) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(competitions).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function updateCompetition(id: number, data: Partial<InsertCompetition>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(competitions).set(data).where(and(eq(competitions.tenantId, getCurrentTenantId()), eq(competitions.id, id)));
}

export async function deleteCompetition(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(competitionParticipants).where(and(eq(competitionParticipants.tenantId, getCurrentTenantId()), eq(competitionParticipants.competitionId, id)));
  await db.delete(teams).where(and(eq(teams.tenantId, getCurrentTenantId()), eq(teams.competitionId, id)));
  await db.delete(competitions).where(and(eq(competitions.tenantId, getCurrentTenantId()), eq(competitions.id, id)));
}

// ===== TEAMS =====
export async function listTeamsByCompetition(competitionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).where(and(eq(teams.tenantId, getCurrentTenantId()), eq(teams.competitionId, competitionId)));
}

export async function createTeam(data: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(teams).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(teams).where(and(eq(teams.tenantId, getCurrentTenantId()), eq(teams.id, id)));
}

// ===== PARTICIPANTS =====
export async function listParticipants(competitionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(competitionParticipants).where(and(eq(competitionParticipants.tenantId, getCurrentTenantId()), eq(competitionParticipants.competitionId, competitionId))).orderBy(desc(competitionParticipants.points));
}

export async function addParticipant(data: InsertCompetitionParticipant) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(competitionParticipants).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function removeParticipant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(competitionParticipants).where(and(eq(competitionParticipants.tenantId, getCurrentTenantId()), eq(competitionParticipants.id, id)));
}

export async function updateParticipantPoints(id: number, points: number, salesCount: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(competitionParticipants).set({ points, salesCount }).where(and(eq(competitionParticipants.tenantId, getCurrentTenantId()), eq(competitionParticipants.id, id)));
}

// ===== SALES =====
export async function listSales(competitionId?: number, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (competitionId) conditions.push(eq(sales.competitionId, competitionId));
  if (sellerId) conditions.push(eq(sales.sellerId, sellerId));
  if (conditions.length > 0) return db.select().from(sales).where(and(eq(sales.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(sales.createdAt));
  return db.select().from(sales).where(eq(sales.tenantId, getCurrentTenantId())).orderBy(desc(sales.createdAt));
}

export async function createSale(data: InsertSale) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Vendas criadas pelo admin são aprovadas direto, vendas dos vendedores ficam pendentes
  const saleData = { ...data, status: data.status || 'pending' as const };
  const result = await db.insert(sales).values({...saleData, tenantId: getCurrentTenantId()});
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
  const sellerResult = await db.select({ department: sellers.department }).from(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()), eq(sellers.id, sellerId))).limit(1);
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
    // Agendamentos/SDR/F&I/Consignação/Despachante: NÃO somar no totalPoints do vendedor de vendas
    // totalPoints do seller deve refletir APENAS vendas de veículos para o ranking principal
    // Pontos de agendamento/F&I/etc são rastreados separadamente nas competition_participants
    // Nenhuma atualização no sellers.totalPoints para incrementSales=false
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
  return db.select().from(sales).where(and(eq(sales.tenantId, getCurrentTenantId()), eq(sales.status, 'pending'))).orderBy(desc(sales.createdAt));
}

export async function approveSale(saleId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const saleResult = await db.select().from(sales).where(and(eq(sales.tenantId, getCurrentTenantId()), eq(sales.id, saleId))).limit(1);
  const sale = saleResult[0];
  if (!sale || sale.status !== 'pending') throw new Error("Venda não encontrada ou já processada");
  await db.update(sales).set({ status: 'approved' }).where(and(eq(sales.tenantId, getCurrentTenantId()), eq(sales.id, saleId)));
  await updateSaleTotals(sale.sellerId, sale.competitionId, sale.points);
  return sale;
}

export async function rejectSale(saleId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sales).set({ status: 'rejected' }).where(and(eq(sales.tenantId, getCurrentTenantId()), eq(sales.id, saleId)));
}

export async function deleteSale(saleId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const saleResult = await db.select().from(sales).where(and(eq(sales.tenantId, getCurrentTenantId()), eq(sales.id, saleId))).limit(1);
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
  await db.delete(sales).where(and(eq(sales.tenantId, getCurrentTenantId()), eq(sales.id, saleId)));
  return sale;
}

export async function editSale(saleId: number, data: { vehicleModel?: string; value?: number; sellerId?: number; status?: 'pending' | 'approved' | 'rejected'; leadSource?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const saleResult = await db.select().from(sales).where(and(eq(sales.tenantId, getCurrentTenantId()), eq(sales.id, saleId))).limit(1);
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
    await db.update(sales).set(updates).where(and(eq(sales.tenantId, getCurrentTenantId()), eq(sales.id, saleId)));
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
  if (activeOnly) return db.select().from(trainings).where(and(eq(trainings.tenantId, getCurrentTenantId()), eq(trainings.active, true))).orderBy(desc(trainings.createdAt));
  return db.select().from(trainings).where(eq(trainings.tenantId, getCurrentTenantId())).orderBy(desc(trainings.createdAt));
}

export async function createTraining(data: InsertTraining) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(trainings).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function updateTraining(id: number, data: Partial<InsertTraining>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(trainings).set(data).where(and(eq(trainings.tenantId, getCurrentTenantId()), eq(trainings.id, id)));
}

export async function deleteTraining(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(trainings).where(and(eq(trainings.tenantId, getCurrentTenantId()), eq(trainings.id, id)));
}

// ===== ACTION PLANS =====
export async function listActionPlans(sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (sellerId) return db.select().from(actionPlans).where(and(eq(actionPlans.tenantId, getCurrentTenantId()), eq(actionPlans.sellerId, sellerId))).orderBy(desc(actionPlans.createdAt));
  return db.select().from(actionPlans).where(eq(actionPlans.tenantId, getCurrentTenantId())).orderBy(desc(actionPlans.createdAt));
}

export async function createActionPlan(data: InsertActionPlan) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(actionPlans).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function updateActionPlan(id: number, data: Partial<InsertActionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(actionPlans).set(data).where(and(eq(actionPlans.tenantId, getCurrentTenantId()), eq(actionPlans.id, id)));
}

export async function deleteActionPlan(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(actionPlans).where(and(eq(actionPlans.tenantId, getCurrentTenantId()), eq(actionPlans.id, id)));
}

// ===== MOTIVATIONAL QUOTES =====
export async function listQuotes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(motivationalQuotes).where(and(eq(motivationalQuotes.tenantId, getCurrentTenantId()), eq(motivationalQuotes.active, true))).orderBy(desc(motivationalQuotes.generatedAt));
}

export async function createQuote(data: InsertMotivationalQuote) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(motivationalQuotes).values({...data, tenantId: getCurrentTenantId()});
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
  return db.select().from(notifications).where(eq(notifications.tenantId, getCurrentTenantId())).orderBy(desc(notifications.createdAt)).limit(50);
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
  const result = await db.insert(notifications).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(notifications).set({ read: true }).where(and(eq(notifications.tenantId, getCurrentTenantId()), eq(notifications.id, id)));
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
  return db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.tenantId, getCurrentTenantId()), eq(pushSubscriptions.sellerId, sellerId)));
}

// ===== PUSH SUBSCRIPTIONS =====
export async function savePushSubscription(data: { endpoint: string; p256dh: string; auth: string; sellerId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Verificar se já existe essa subscription
  const existing = await db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.tenantId, getCurrentTenantId()), eq(pushSubscriptions.endpoint, data.endpoint))).limit(1);
  if (existing.length > 0) {
    // Atualizar
    await db.update(pushSubscriptions).set({
      p256dh: data.p256dh,
      auth: data.auth,
      sellerId: data.sellerId ?? null,
    }).where(eq(pushSubscriptions.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(pushSubscriptions).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function getAllPushSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.tenantId, getCurrentTenantId()));
}

export async function deletePushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.tenantId, getCurrentTenantId()), eq(pushSubscriptions.endpoint, endpoint)));
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
  if (conditions.length > 0) return db.select().from(goals).where(and(eq(goals.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(goals.createdAt));
  return db.select().from(goals).where(eq(goals.tenantId, getCurrentTenantId())).orderBy(desc(goals.createdAt));
}

export async function createGoal(data: InsertGoal) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(goals).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function updateGoal(id: number, data: Partial<InsertGoal>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(goals).set(data).where(and(eq(goals.tenantId, getCurrentTenantId()), eq(goals.id, id)));
}

export async function deleteGoal(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(goals).where(and(eq(goals.tenantId, getCurrentTenantId()), eq(goals.id, id)));
}

export async function incrementGoalProgress(goalId: number, amount: number = 1) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(goals).set({
    currentValue: sql`currentValue + ${amount}`,
  }).where(eq(goals.id, goalId));
  // Check if achieved
  const [goal] = await db.select().from(goals).where(and(eq(goals.tenantId, getCurrentTenantId()), eq(goals.id, goalId))).limit(1);
  if (goal && goal.currentValue >= goal.targetValue && !goal.achieved) {
    await db.update(goals).set({ achieved: true }).where(and(eq(goals.tenantId, getCurrentTenantId()), eq(goals.id, goalId)));
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
  const participants = await db.select().from(competitionParticipants).where(and(eq(competitionParticipants.tenantId, getCurrentTenantId()), eq(competitionParticipants.competitionId, competitionId))).orderBy(desc(competitionParticipants.points));
  const sellerIds = participants.map(p => p.sellerId);
  if (sellerIds.length === 0) return [];
  const sellersList = await db.select().from(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()), inArray(sellers.id, sellerIds)));
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
  const teamsList = await db.select().from(teams).where(and(eq(teams.tenantId, getCurrentTenantId()), eq(teams.competitionId, competitionId)));
  const participants = await db.select().from(competitionParticipants).where(and(eq(competitionParticipants.tenantId, getCurrentTenantId()), eq(competitionParticipants.competitionId, competitionId)));
  const sellerIds = participants.map(p => p.sellerId);
  const sellersList = sellerIds.length > 0 ? await db.select().from(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()), inArray(sellers.id, sellerIds))) : [];
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

// ===== BRACKET MATCHES (MATA-MATA) =====
export async function listBracketMatches(competitionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bracketMatches)
    .where(eq(bracketMatches.competitionId, competitionId))
    .orderBy(bracketMatches.round, bracketMatches.matchOrder);
}

export async function createBracketMatch(data: InsertBracketMatch) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(bracketMatches).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function updateBracketMatch(id: number, data: Partial<InsertBracketMatch>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(bracketMatches).set(data).where(and(eq(bracketMatches.tenantId, getCurrentTenantId()), eq(bracketMatches.id, id)));
}

export async function deleteBracketMatchesByCompetition(competitionId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(bracketMatches).where(and(eq(bracketMatches.tenantId, getCurrentTenantId()), eq(bracketMatches.competitionId, competitionId)));
}

export async function getBracketMatch(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(bracketMatches).where(and(eq(bracketMatches.tenantId, getCurrentTenantId()), eq(bracketMatches.id, id)));
  return rows[0] || null;
}

/** Incrementa o placar de um lado do confronto */
export async function incrementBracketScore(matchId: number, side: 'A' | 'B') {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const match = await getBracketMatch(matchId);
  if (!match) throw new Error("Match not found");
  if (side === 'A') {
    await db.update(bracketMatches).set({ scoreA: match.scoreA + 1 }).where(and(eq(bracketMatches.tenantId, getCurrentTenantId()), eq(bracketMatches.id, matchId)));
  } else {
    await db.update(bracketMatches).set({ scoreB: match.scoreB + 1 }).where(and(eq(bracketMatches.tenantId, getCurrentTenantId()), eq(bracketMatches.id, matchId)));
  }
}

// ===== F&I RECORDS =====
export async function listFeiRecords(competitionId?: number, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (competitionId) conditions.push(eq(feiRecords.competitionId, competitionId));
  if (sellerId) conditions.push(eq(feiRecords.sellerId, sellerId));
  if (conditions.length > 0) return db.select().from(feiRecords).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(feiRecords.createdAt));
  return db.select().from(feiRecords).where(eq(feiRecords.tenantId, getCurrentTenantId())).orderBy(desc(feiRecords.createdAt));
}

export async function createFeiRecord(data: InsertFeiRecord) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(feiRecords).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function listPendingFeiRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feiRecords).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), eq(feiRecords.status, 'pending'))).orderBy(desc(feiRecords.createdAt));
}

export async function approveFeiRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(feiRecords).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), eq(feiRecords.id, id))).limit(1);
  const record = result[0];
  if (!record || record.status !== 'pending') throw new Error("Registro F&I não encontrado ou já processado");
  await db.update(feiRecords).set({ status: 'approved' }).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), eq(feiRecords.id, id)));
  // F&I NÃO é venda de veículo - incrementSales=false para não contar no ranking de vendas
  await updateSaleTotals(record.sellerId, record.competitionId, record.points, false);
  return record;
}

export async function rejectFeiRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(feiRecords).set({ status: 'rejected' }).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), eq(feiRecords.id, id)));
}

export async function deleteFeiRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(feiRecords).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), eq(feiRecords.id, id))).limit(1);
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
  await db.delete(feiRecords).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), eq(feiRecords.id, id)));
}

export async function updateFeiRecord(id: number, data: {
  customerCpf?: string;
  customerName?: string;
  vehiclePlate?: string;
  bankName?: string;
  financedValue?: number;
  returnType?: string;
  paymentDate?: number | null;
  notes?: string;
}, editedBy?: string, editReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(feiRecords).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), eq(feiRecords.id, id))).limit(1);
  if (!result[0]) throw new Error("Registro F&I não encontrado");
  const oldRecord = result[0];
  const updateData: any = {};
  if (data.customerCpf !== undefined) updateData.customerCpf = data.customerCpf;
  if (data.customerName !== undefined) updateData.customerName = data.customerName;
  if (data.vehiclePlate !== undefined) updateData.vehiclePlate = data.vehiclePlate;
  if (data.bankName !== undefined) updateData.bankName = data.bankName;
  if (data.financedValue !== undefined) updateData.financedValue = data.financedValue;
  if (data.returnType !== undefined) updateData.returnType = data.returnType;
  if (data.paymentDate !== undefined) updateData.paymentDate = data.paymentDate;
  if (data.notes !== undefined) updateData.notes = data.notes;
  // Track who edited and when
  if (editedBy) {
    updateData.lastEditedBy = editedBy;
    updateData.lastEditedAt = new Date();
    if (editReason) updateData.editNotes = editReason;
  }
  if (Object.keys(updateData).length > 0) {
    await db.update(feiRecords).set(updateData).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), eq(feiRecords.id, id)));
  }
  // Create audit log entries for each changed field
  if (editedBy) {
    const fieldLabels: Record<string, string> = {
      customerCpf: 'CPF', customerName: 'Nome do Cliente', vehiclePlate: 'Placa',
      bankName: 'Banco', financedValue: 'Valor Financiado', returnType: 'Retorno',
      paymentDate: 'Data Pagamento', notes: 'Observações',
    };
    for (const [key, newVal] of Object.entries(data)) {
      if (newVal === undefined) continue;
      const oldVal = (oldRecord as any)[key];
      const oldStr = oldVal != null ? String(oldVal) : '';
      const newStr = newVal != null ? String(newVal) : '';
      if (oldStr !== newStr) {
        await db.insert(feiAuditLogs).values({
          feiRecordId: id,
          editedBy,
          fieldChanged: fieldLabels[key] || key,
          oldValue: oldStr || null,
          newValue: newStr || null,
          reason: editReason || null,
          tenantId: getCurrentTenantId(),
        });
      }
    }
  }
  const updated = await db.select().from(feiRecords).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), eq(feiRecords.id, id))).limit(1);
  return updated[0];
}

// Get F&I audit logs
export async function listFeiAuditLogs(feiRecordId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(feiAuditLogs).where(and(eq(feiAuditLogs.tenantId, getCurrentTenantId()), eq(feiAuditLogs.feiRecordId, feiRecordId))).orderBy(desc(feiAuditLogs.editedAt));
}

// ===== CONSIGNMENT RECORDS =====
export async function listConsignmentRecords(competitionId?: number, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (competitionId) conditions.push(eq(consignmentRecords.competitionId, competitionId));
  if (sellerId) conditions.push(eq(consignmentRecords.sellerId, sellerId));
  if (conditions.length > 0) return db.select().from(consignmentRecords).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(consignmentRecords.createdAt));
  return db.select().from(consignmentRecords).where(eq(consignmentRecords.tenantId, getCurrentTenantId())).orderBy(desc(consignmentRecords.createdAt));
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
  const result = await db.insert(consignmentRecords).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function listPendingConsignmentRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consignmentRecords).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.status, 'pending'))).orderBy(desc(consignmentRecords.createdAt));
}

export async function approveConsignmentRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(consignmentRecords).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.id, id))).limit(1);
  const record = result[0];
  if (!record || record.status !== 'pending') throw new Error("Registro de consignação não encontrado ou já processado");
  // Verificar se já passou os dias mínimos
  const daysPassed = Math.floor((Date.now() - record.entryDate) / (1000 * 60 * 60 * 24));
  const isValid = daysPassed >= record.validAfterDays;
  await db.update(consignmentRecords).set({ status: 'approved', isValid }).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.id, id)));
  if (isValid) {
    // Consignação NÃO é venda de veículo - incrementSales=false
    await updateSaleTotals(record.sellerId, record.competitionId, record.points, false);
  }
  return { ...record, isValid };
}

export async function rejectConsignmentRecord(id: number, rejectionReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(consignmentRecords).set({ status: 'rejected', rejectionReason: rejectionReason || null }).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.id, id)));
}

export async function deleteConsignmentRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const record = await db.select().from(consignmentRecords).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.id, id))).limit(1);
  if (!record[0]) throw new Error("Registro n\u00e3o encontrado");
  // Se estava aprovado e v\u00e1lido, reverter pontos
  if (record[0].status === 'approved' && record[0].isValid) {
    await updateSaleTotals(record[0].sellerId, record[0].competitionId, -record[0].points, false);
  }
  await db.delete(consignmentRecords).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.id, id)));
  return record[0];
}

export async function updateConsignmentRecord(id: number, data: Partial<{
  vehiclePlate: string;
  vehicleModel: string;
  ownerName: string;
  ownerPhone: string;
  entryDate: number;
  hasAuction: boolean;
  vehicleStatus: string;
  payoffValue: number;
  costValue: number;
  notes: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(consignmentRecords).set(data).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.id, id)));
  const updated = await db.select().from(consignmentRecords).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.id, id))).limit(1);
  return updated[0];
}

export async function updateConsignmentExitDate(id: number, exitDate: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(consignmentRecords).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.id, id))).limit(1);
  const record = result[0];
  if (!record) throw new Error("Registro n\u00e3o encontrado");
  // Calcular se é válido baseado na diferença entre saída e entrada
  const daysPassed = Math.floor((exitDate - record.entryDate) / (1000 * 60 * 60 * 24));
  const isValid = daysPassed >= record.validAfterDays;
  await db.update(consignmentRecords).set({ exitDate, isValid }).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.id, id)));
  // Se ficou válido agora e já estava aprovado, atualizar pontos
  if (isValid && record.status === 'approved' && !record.isValid) {
    await updateSaleTotals(record.sellerId, record.competitionId, record.points, false);
  }
  return { ...record, exitDate, isValid };
}

// Cross-reference: when a sale is approved, check if the plate matches a consignment vehicle
export async function crossReferenceConsignmentWithSale(saleId: number, plate: string) {
  const db = await getDb();
  if (!db) return null;
  const normalizedPlate = plate.replace(/[-\s]/g, '').toUpperCase();
  if (!normalizedPlate || normalizedPlate.length < 5) return null;
  // Find active consignment with matching plate (in yard, approved, not yet sold)
  const matches = await db.select().from(consignmentRecords).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), and(
    sql`UPPER(REPLACE(${consignmentRecords.vehiclePlate}, '-', '')) = ${normalizedPlate}`,
    eq(consignmentRecords.status, 'approved'),
    sql`${consignmentRecords.soldVia} IS NULL`,
  ))).limit(1);
  if (matches.length === 0) return null;
  const record = matches[0];
  const now = Date.now();
  // Mark as sold and auto-exit if still in yard
  await db.update(consignmentRecords).set({
    soldVia: 'sale',
    saleId: saleId,
    soldAt: now,
    exitDate: record.exitDate || now, // auto-exit if not yet exited
    isValid: true, // sold = valid regardless of days
  }).where(eq(consignmentRecords.id, record.id));
  // Update totals if not already valid
  if (!record.isValid && record.status === 'approved') {
    await updateSaleTotals(record.sellerId, record.competitionId, record.points, false);
  }
  return { consignmentId: record.id, vehiclePlate: record.vehiclePlate, vehicleModel: record.vehicleModel };
}

export async function validateConsignmentDays() {
  // Valida consignações aprovadas que completaram os 7 dias
  const db = await getDb();
  if (!db) return;
  const records = await db.select().from(consignmentRecords).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), and(
    eq(consignmentRecords.status, 'approved'),
    eq(consignmentRecords.isValid, false),
  )));
  for (const record of records) {
    const daysPassed = Math.floor((Date.now() - record.entryDate) / (1000 * 60 * 60 * 24));
    if (daysPassed >= record.validAfterDays) {
      await db.update(consignmentRecords).set({ isValid: true }).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.id, record.id)));
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
  if (conditions.length > 0) return db.select().from(dispatchRecords).where(and(eq(dispatchRecords.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(dispatchRecords.createdAt));
  return db.select().from(dispatchRecords).where(eq(dispatchRecords.tenantId, getCurrentTenantId())).orderBy(desc(dispatchRecords.createdAt));
}

export async function createDispatchRecord(data: InsertDispatchRecord) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(dispatchRecords).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function listPendingDispatchRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dispatchRecords).where(and(eq(dispatchRecords.tenantId, getCurrentTenantId()), eq(dispatchRecords.status, 'pending'))).orderBy(desc(dispatchRecords.createdAt));
}

export async function approveDispatchRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(dispatchRecords).where(and(eq(dispatchRecords.tenantId, getCurrentTenantId()), eq(dispatchRecords.id, id))).limit(1);
  const record = result[0];
  if (!record || record.status !== 'pending') throw new Error("Registro de despachante não encontrado ou já processado");
  await db.update(dispatchRecords).set({ status: 'approved' }).where(and(eq(dispatchRecords.tenantId, getCurrentTenantId()), eq(dispatchRecords.id, id)));
  const totalPoints = record.points + record.bonusPoints;
  // Despachante NÃO é venda de veículo - incrementSales=false
  await updateSaleTotals(record.sellerId, record.competitionId, totalPoints, false);
  return record;
}

export async function rejectDispatchRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(dispatchRecords).set({ status: 'rejected' }).where(and(eq(dispatchRecords.tenantId, getCurrentTenantId()), eq(dispatchRecords.id, id)));
}

export async function deleteDispatchRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(dispatchRecords).where(and(eq(dispatchRecords.tenantId, getCurrentTenantId()), eq(dispatchRecords.id, id))).limit(1);
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
  await db.delete(dispatchRecords).where(and(eq(dispatchRecords.tenantId, getCurrentTenantId()), eq(dispatchRecords.id, id)));
}

// Despachante: marcar como transferido com documento emitido
export async function markDispatchTransferred(id: number, documentUrl: string, documentKey: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(dispatchRecords).where(and(eq(dispatchRecords.tenantId, getCurrentTenantId()), eq(dispatchRecords.id, id))).limit(1);
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
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.type, 'agendamento')));
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
  const result = await db.insert(sdrRecords).values({...data, tenantId: getCurrentTenantId()});
  return { id: result[0].insertId, ticketNumber: data.ticketNumber };
}

export async function listSdrRecords(competitionId?: number, sellerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (competitionId) conditions.push(eq(sdrRecords.competitionId, competitionId));
  if (sellerId) conditions.push(eq(sdrRecords.sellerId, sellerId));
  if (conditions.length > 0) return db.select().from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(sdrRecords.createdAt));
  return db.select().from(sdrRecords).where(eq(sdrRecords.tenantId, getCurrentTenantId())).orderBy(desc(sdrRecords.createdAt));
}

export async function listPendingSdrRecords() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.status, 'pending'))).orderBy(desc(sdrRecords.createdAt));
}

export async function approveSdrRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id))).limit(1);
  const record = result[0];
  if (!record || record.status !== 'pending') throw new Error("Registro SDR não encontrado ou já processado");
  await db.update(sdrRecords).set({ status: 'approved' }).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id)));
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
  await db.update(sdrRecords).set({ status: 'rejected' }).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id)));
}

// Vendedor marca que cliente compareceu
export async function markAttendance(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id))).limit(1);
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
  return db.select().from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()),
    eq(sdrRecords.attendanceStatus, 'attended')
  )).orderBy(desc(sdrRecords.createdAt));
}

// Gerente aprova comparecimento
export async function approveAttendance(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id))).limit(1);
  const record = result[0];
  if (!record) throw new Error("Agendamento não encontrado");
  if (record.attendanceStatus === 'approved') throw new Error("Comparecimento já foi aprovado");
  await db.update(sdrRecords).set({ attendanceStatus: 'approved' }).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id)));
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
  await db.update(sdrRecords).set({ attendanceStatus: 'rejected' }).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id)));
}

// Gerente marca como não compareceu
export async function markNoShow(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sdrRecords).set({ attendanceStatus: 'no_show' }).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id)));
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
  await db.update(sdrRecords).set(updateData).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id)));
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
  return db.select().from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(sdrRecords.createdAt));
}

export async function deleteSdrRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id))).limit(1);
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
  await db.delete(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id)));
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
  attendanceMarkedAt?: number | null;
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
  if (data.attendanceMarkedAt !== undefined) updateData.attendanceMarkedAt = data.attendanceMarkedAt;
  if (data.isFeirão !== undefined) updateData.isFeirão = data.isFeirão;
  if (Object.keys(updateData).length > 0) {
    await db.update(sdrRecords).set(updateData).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, id)));
  }
  return { success: true };
}

// ===== ALL PENDING (cross-sector) =====
export async function getAllPendingCount() {
  const db = await getDb();
  if (!db) return { sales: 0, fei: 0, consignment: 0, dispatch: 0, sdr: 0, total: 0 };
  const [s] = await db.select({ count: sql<number>`count(*)` }).from(sales).where(and(eq(sales.tenantId, getCurrentTenantId()), eq(sales.status, 'pending')));
  const [f] = await db.select({ count: sql<number>`count(*)` }).from(feiRecords).where(and(eq(feiRecords.tenantId, getCurrentTenantId()), eq(feiRecords.status, 'pending')));
  const [c] = await db.select({ count: sql<number>`count(*)` }).from(consignmentRecords).where(and(eq(consignmentRecords.tenantId, getCurrentTenantId()), eq(consignmentRecords.status, 'pending')));
  const [d] = await db.select({ count: sql<number>`count(*)` }).from(dispatchRecords).where(and(eq(dispatchRecords.tenantId, getCurrentTenantId()), eq(dispatchRecords.status, 'pending')));
  const [sdr] = await db.select({ count: sql<number>`count(*)` }).from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.status, 'pending')));
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
  const result = await db.select().from(appSettings).where(and(eq(appSettings.tenantId, getCurrentTenantId()), eq(appSettings.settingKey, key))).limit(1);
  return result[0]?.settingValue;
}

export async function setAppSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(appSettings).values({ settingKey: key, settingValue: value , tenantId: getCurrentTenantId()})
    .onDuplicateKeyUpdate({ set: { settingValue: value } });
}


// ===== MANAGERS (Gerentes com login por senha) =====

export async function createManager(data: { username: string; passwordHash: string; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(managers).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function getManagerByUsername(username: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(managers).where(and(eq(managers.tenantId, getCurrentTenantId()), eq(managers.username, username))).limit(1);
  return result[0] || null;
}

export async function getManagerById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(managers).where(and(eq(managers.tenantId, getCurrentTenantId()), eq(managers.id, id))).limit(1);
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
  }).from(managers).where(eq(managers.tenantId, getCurrentTenantId())).orderBy(managers.name);
}

export async function updateManager(id: number, data: { name?: string; passwordHash?: string; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(managers).set(data).where(and(eq(managers.tenantId, getCurrentTenantId()), eq(managers.id, id)));
}

export async function deleteManager(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(managers).where(and(eq(managers.tenantId, getCurrentTenantId()), eq(managers.id, id)));
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
  const allSellers = await db.select().from(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()),
    eq(sellers.active, true), eq(sellers.department, deptFilter)
  ));
  
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
  const allSellers = await db.select().from(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()),
    eq(sellers.active, true), or(eq(sellers.department, 'vendas'), eq(sellers.department, 'pre_vendas'))
  ));
  
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
  return db.select().from(pvOficinas).where(and(eq(pvOficinas.tenantId, getCurrentTenantId()), eq(pvOficinas.active, true))).orderBy(pvOficinas.name);
}

export async function createOficina(data: InsertPvOficina) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pvOficinas).values({...data, tenantId: getCurrentTenantId()});
  return result[0].insertId;
}

export async function updateOficina(id: number, data: { name?: string; phone?: string; address?: string; notes?: string; active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(pvOficinas).set(data).where(and(eq(pvOficinas.tenantId, getCurrentTenantId()), eq(pvOficinas.id, id)));
}

export async function deleteOficina(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(pvOficinas).set({ active: false }).where(and(eq(pvOficinas.tenantId, getCurrentTenantId()), eq(pvOficinas.id, id)));
}

// --- Chamados Pós-Venda ---
export async function getNextPvTicketNumber() {
  const db = await getDb();
  if (!db) return "#PV001";
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(pvChamados).where(eq(pvChamados.tenantId, getCurrentTenantId()));
  const num = Number(result?.count || 0) + 1;
  return `#PV${String(num).padStart(3, '0')}`;
}

export async function createPvChamado(data: InsertPvChamado) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pvChamados).values({...data, tenantId: getCurrentTenantId()});
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
    return db.select().from(pvChamados).where(and(eq(pvChamados.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(pvChamados.updatedAt));
  }
  return db.select().from(pvChamados).where(eq(pvChamados.tenantId, getCurrentTenantId())).orderBy(desc(pvChamados.updatedAt));
}

export async function getPvChamadoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.select().from(pvChamados).where(and(eq(pvChamados.tenantId, getCurrentTenantId()), eq(pvChamados.id, id))).limit(1);
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
    await db.update(pvChamados).set(updateData).where(and(eq(pvChamados.tenantId, getCurrentTenantId()), eq(pvChamados.id, id)));
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
  await db.insert(pvHistorico).values({ chamadoId: id, acao, descricao, usuario , tenantId: getCurrentTenantId()});
  return { success: true };
}

export async function deletePvChamado(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Deletar gastos e histórico associados
  await db.delete(pvGastos).where(and(eq(pvGastos.tenantId, getCurrentTenantId()), eq(pvGastos.chamadoId, id)));
  await db.delete(pvHistorico).where(and(eq(pvHistorico.tenantId, getCurrentTenantId()), eq(pvHistorico.chamadoId, id)));
  await db.delete(pvChamados).where(and(eq(pvChamados.tenantId, getCurrentTenantId()), eq(pvChamados.id, id)));
}

// --- Gastos Pós-Venda ---
export async function listPvGastos(chamadoId?: number, statusAprovacao?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (chamadoId) conditions.push(eq(pvGastos.chamadoId, chamadoId));
  if (statusAprovacao && statusAprovacao !== 'todos') conditions.push(eq(pvGastos.statusAprovacao, statusAprovacao as any));
  if (conditions.length > 0) {
    return db.select().from(pvGastos).where(and(eq(pvGastos.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(pvGastos.createdAt));
  }
  return db.select().from(pvGastos).where(eq(pvGastos.tenantId, getCurrentTenantId())).orderBy(desc(pvGastos.createdAt));
}

export async function createPvGasto(data: InsertPvGasto, usuario: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pvGastos).values({...data, tenantId: getCurrentTenantId()});
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
  await db.update(pvGastos).set(updateData).where(and(eq(pvGastos.tenantId, getCurrentTenantId()), eq(pvGastos.id, id)));
  // Registrar no histórico
  const gasto = await db.select().from(pvGastos).where(and(eq(pvGastos.tenantId, getCurrentTenantId()), eq(pvGastos.id, id))).limit(1);
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
  await db.delete(pvGastos).where(and(eq(pvGastos.tenantId, getCurrentTenantId()), eq(pvGastos.id, id)));
}

// --- Histórico ---
export async function listPvHistorico(chamadoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pvHistorico).where(and(eq(pvHistorico.tenantId, getCurrentTenantId()), eq(pvHistorico.chamadoId, chamadoId))).orderBy(desc(pvHistorico.createdAt));
}

// --- Contadores e Alertas ---
export async function getPvChamadosCounts() {
  const db = await getDb();
  if (!db) return { aberto: 0, agendado: 0, em_servico: 0, finalizado: 0, entregue: 0, total: 0 };
  const all = await db.select({ status: pvChamados.status, count: sql<number>`count(*)` }).from(pvChamados).where(eq(pvChamados.tenantId, getCurrentTenantId())).groupBy(pvChamados.status);
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
  }).from(pvGastos).where(and(eq(pvGastos.tenantId, getCurrentTenantId()), eq(pvGastos.statusAprovacao, 'pendente')));
  return { count: Number(result[0]?.count || 0), total: parseFloat(String(result[0]?.total || '0')) };
}

// Chamados com prazo vencendo (próximas 24h) ou vencidos
export async function getPvChamadosAlerta() {
  const db = await getDb();
  if (!db) return { vencendo: [], vencidos: [] };
  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;
  
  // Chamados com prazo vencido (não entregues/cancelados)
  const vencidos = await db.select().from(pvChamados).where(and(eq(pvChamados.tenantId, getCurrentTenantId()), and(
    sql`${pvChamados.prazoEntrega} IS NOT NULL`,
    sql`${pvChamados.prazoEntrega} < ${now}`,
    sql`${pvChamados.status} NOT IN ('entregue', 'cancelado')`,
  ))).orderBy(pvChamados.prazoEntrega);
  
  // Chamados com prazo nas próximas 24h
  const vencendo = await db.select().from(pvChamados).where(and(eq(pvChamados.tenantId, getCurrentTenantId()),
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
  }).from(pvGastos).where(eq(pvGastos.tenantId, getCurrentTenantId())).groupBy(pvGastos.statusAprovacao);
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
    ? await db.select().from(pvGastos).where(and(eq(pvGastos.tenantId, getCurrentTenantId()), ...conditions)).orderBy(desc(pvGastos.createdAt))
    : await db.select().from(pvGastos).where(eq(pvGastos.tenantId, getCurrentTenantId())).orderBy(desc(pvGastos.createdAt));
  
  // Buscar chamados associados
  const chamadoIds = Array.from(new Set(gastos.map(g => g.chamadoId)));
  if (chamadoIds.length === 0) return [];
  const chamados = await db.select().from(pvChamados).where(and(eq(pvChamados.tenantId, getCurrentTenantId()), inArray(pvChamados.id, chamadoIds)));
  const chamadoMap = new Map(chamados.map(c => [c.id, c]));
  
  return gastos.map(g => ({
    ...g,
    chamado: chamadoMap.get(g.chamadoId) || null,
  }));
}

// ============ MARKETING ============

export async function listMktStrategies() {
  const db = await getDb();
  return db!.select().from(mktStrategies).where(eq(mktStrategies.tenantId, getCurrentTenantId())).orderBy(desc(mktStrategies.createdAt));
}

export async function createMktStrategy(data: InsertMktStrategy) {
  const db = await getDb();
  const result = await db!.insert(mktStrategies).values({...data, tenantId: getCurrentTenantId()});
  return { id: result[0].insertId };
}

export async function updateMktStrategy(id: number, data: Partial<InsertMktStrategy>) {
  const db = await getDb();
  await db!.update(mktStrategies).set(data).where(and(eq(mktStrategies.tenantId, getCurrentTenantId()), eq(mktStrategies.id, id)));
}

export async function deleteMktStrategy(id: number) {
  const db = await getDb();
  // Delete associated tasks first
  await db!.delete(mktTasks).where(and(eq(mktTasks.tenantId, getCurrentTenantId()), eq(mktTasks.strategyId, id)));
  await db!.delete(mktStrategies).where(and(eq(mktStrategies.tenantId, getCurrentTenantId()), eq(mktStrategies.id, id)));
}

export async function listMktTasks(strategyId?: number) {
  const db = await getDb();
  if (strategyId) {
    return db!.select().from(mktTasks).where(and(eq(mktTasks.tenantId, getCurrentTenantId()), eq(mktTasks.strategyId, strategyId))).orderBy(desc(mktTasks.createdAt));
  }
  return db!.select().from(mktTasks).where(eq(mktTasks.tenantId, getCurrentTenantId())).orderBy(desc(mktTasks.createdAt));
}

export async function createMktTask(data: InsertMktTask) {
  const db = await getDb();
  const result = await db!.insert(mktTasks).values({...data, tenantId: getCurrentTenantId()});
  return { id: result[0].insertId };
}

export async function updateMktTask(id: number, data: Partial<InsertMktTask>) {
  const db = await getDb();
  await db!.update(mktTasks).set(data).where(and(eq(mktTasks.tenantId, getCurrentTenantId()), eq(mktTasks.id, id)));
}

export async function deleteMktTask(id: number) {
  const db = await getDb();
  await db!.delete(mktTasks).where(and(eq(mktTasks.tenantId, getCurrentTenantId()), eq(mktTasks.id, id)));
}


// ===== IAM CONFIG =====
import { iamConfig, InsertIamConfig } from "../drizzle/schema";

import { getCurrentTenantId } from "./tenantDb";

export async function getIamConfig() {
  const db = await getDb();
  const rows = await db!.select().from(iamConfig).where(eq(iamConfig.tenantId, getCurrentTenantId())).limit(1);
  return rows[0] || null;
}

export async function updateIamConfig(data: Partial<InsertIamConfig>) {
  const db = await getDb();
  const existing = await getIamConfig();
  if (existing) {
    await db!.update(iamConfig).set(data).where(and(eq(iamConfig.tenantId, getCurrentTenantId()), eq(iamConfig.id, existing.id)));
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
  const result = await db.select().from(saleDocuments).where(and(eq(saleDocuments.tenantId, getCurrentTenantId()), eq(saleDocuments.saleId, saleId))).limit(1);
  return result[0] || null;
}

// Listar documentos de venda por vendedor
export async function listSaleDocumentsBySeller(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(saleDocuments).where(and(eq(saleDocuments.tenantId, getCurrentTenantId()), eq(saleDocuments.sellerId, sellerId))).orderBy(desc(saleDocuments.createdAt));
}

// Listar todos os documentos de venda (para despachante/admin)
export async function listAllSaleDocuments(filterStatus?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filterStatus) conditions.push(eq(saleDocuments.docStatus, filterStatus as any));
  if (conditions.length > 0) return db.select().from(saleDocuments).where(and(eq(saleDocuments.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(saleDocuments.createdAt));
  return db.select().from(saleDocuments).where(eq(saleDocuments.tenantId, getCurrentTenantId())).orderBy(desc(saleDocuments.createdAt));
}

// Vendedor faz upload de CNH
export async function uploadSaleDocCnh(id: number, cnhUrl: string, cnhKey: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const doc = await db.select().from(saleDocuments).where(and(eq(saleDocuments.tenantId, getCurrentTenantId()), eq(saleDocuments.id, id))).limit(1);
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
  const doc = await db.select().from(saleDocuments).where(and(eq(saleDocuments.tenantId, getCurrentTenantId()), eq(saleDocuments.id, id))).limit(1);
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
  await db.update(saleDocuments).set({ dispatchStatus: 'em_transferencia' }).where(and(eq(saleDocuments.tenantId, getCurrentTenantId()), eq(saleDocuments.id, id)));
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
  const result = await db.select().from(saleDocuments).where(and(eq(saleDocuments.tenantId, getCurrentTenantId()), eq(saleDocuments.id, id))).limit(1);
  return result[0] || null;
}

// Update notes on a sale document
export async function updateSaleDocNotes(id: number, notes: string | null) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(saleDocuments).set({ notes }).where(and(eq(saleDocuments.tenantId, getCurrentTenantId()), eq(saleDocuments.id, id)));
}

// Delete a sale document record
export async function deleteSaleDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(saleDocuments).where(and(eq(saleDocuments.tenantId, getCurrentTenantId()), eq(saleDocuments.id, id)));
}


// ===== MÓDULO ORÇAMENTOS PÓS-VENDA =====

// Listar orçamentos de um chamado
export async function listPvOrcamentos(chamadoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pvOrcamentos).where(and(eq(pvOrcamentos.tenantId, getCurrentTenantId()), eq(pvOrcamentos.chamadoId, chamadoId))).orderBy(desc(pvOrcamentos.createdAt));
}

// Listar todos os orçamentos (para financeiro)
export async function listAllPvOrcamentos(statusAprovacao?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusAprovacao && statusAprovacao !== 'todos') {
    return db.select().from(pvOrcamentos).where(and(eq(pvOrcamentos.tenantId, getCurrentTenantId()), eq(pvOrcamentos.statusAprovacao, statusAprovacao as any))).orderBy(desc(pvOrcamentos.createdAt));
  }
  return db.select().from(pvOrcamentos).where(eq(pvOrcamentos.tenantId, getCurrentTenantId())).orderBy(desc(pvOrcamentos.createdAt));
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
  return db.select().from(pvOrcamentoItens).where(and(eq(pvOrcamentoItens.tenantId, getCurrentTenantId()), eq(pvOrcamentoItens.orcamentoId, orcamentoId))).orderBy(pvOrcamentoItens.createdAt);
}

// Remover item do orçamento
export async function deletePvOrcamentoItem(id: number, orcamentoId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(pvOrcamentoItens).where(and(eq(pvOrcamentoItens.tenantId, getCurrentTenantId()), eq(pvOrcamentoItens.id, id)));
  await recalcPvOrcamentoTotal(orcamentoId);
}

// Recalcular total do orçamento
async function recalcPvOrcamentoTotal(orcamentoId: number) {
  const db = await getDb();
  if (!db) return;
  const [result] = await db.select({
    total: sql<string>`COALESCE(SUM(${pvOrcamentoItens.valorTotal}), 0)`,
  }).from(pvOrcamentoItens).where(and(eq(pvOrcamentoItens.tenantId, getCurrentTenantId()), eq(pvOrcamentoItens.orcamentoId, orcamentoId)));
  
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
  
  await db.update(pvOrcamentos).set(updateData).where(and(eq(pvOrcamentos.tenantId, getCurrentTenantId()), eq(pvOrcamentos.id, id)));
  
  // Registrar no histórico do chamado
  const orc = await db.select().from(pvOrcamentos).where(and(eq(pvOrcamentos.tenantId, getCurrentTenantId()), eq(pvOrcamentos.id, id))).limit(1);
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
  await db.delete(pvOrcamentoItens).where(and(eq(pvOrcamentoItens.tenantId, getCurrentTenantId()), eq(pvOrcamentoItens.orcamentoId, id)));
  await db.delete(pvOrcamentos).where(and(eq(pvOrcamentos.tenantId, getCurrentTenantId()), eq(pvOrcamentos.id, id)));
}

// Contagem de orçamentos pendentes
export async function getPvOrcamentosPendentes() {
  const db = await getDb();
  if (!db) return { count: 0, total: '0' };
  const [result] = await db.select({
    count: sql<number>`count(*)`,
    total: sql<string>`COALESCE(SUM(${pvOrcamentos.valorTotal}), 0)`,
  }).from(pvOrcamentos).where(and(eq(pvOrcamentos.tenantId, getCurrentTenantId()), eq(pvOrcamentos.statusAprovacao, 'pendente')));
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
  }).from(pvOrcamentos).where(eq(pvOrcamentos.tenantId, getCurrentTenantId())).groupBy(pvOrcamentos.statusAprovacao);
}

// Buscar orçamento por ID
export async function getPvOrcamentoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(pvOrcamentos).where(and(eq(pvOrcamentos.tenantId, getCurrentTenantId()), eq(pvOrcamentos.id, id))).limit(1);
  return result[0] || null;
}


// ===== RANKING FEIRÃO =====

// Listar todos agendamentos de feirão (para ranking e conferência)
export async function listFeiraoAgendamentos(competitionId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(sdrRecords.isFeirão, true), eq(sdrRecords.type, 'agendamento')];
  if (competitionId) conditions.push(eq(sdrRecords.competitionId, competitionId));
  return db.select().from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(sdrRecords.scheduledDate));
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
  }).from(sdrRecords).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), and(...conditions))).groupBy(sdrRecords.sellerId).orderBy(desc(sql`count(*)`));
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
  await db.update(sales).set({ sdrRecordId }).where(and(eq(sales.tenantId, getCurrentTenantId()), eq(sales.id, saleId)));
  // Marcar o agendamento como convertido
  await db.update(sdrRecords).set({ converted: true }).where(and(eq(sdrRecords.tenantId, getCurrentTenantId()), eq(sdrRecords.id, sdrRecordId)));
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
  return db.select().from(sales).where(and(eq(sales.tenantId, getCurrentTenantId()), and(
    inArray(sales.sdrRecordId, ids),
    eq(sales.status, 'approved'),
  ))).orderBy(desc(sales.createdAt));
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
    const sellerResult = sale ? await db.select().from(sellers).where(and(eq(sellers.tenantId, getCurrentTenantId()), eq(sellers.id, sale.sellerId))).limit(1) : [];
    result.push({
      agendamento: record,
      venda: sale,
      vendedorNome: sellerResult[0]?.name || 'Desconhecido',
    });
  }
  return result;
}


// ===== MESA DE CRÉDITO / FICHAS DE FINANCIAMENTO =====

export async function createFichaFinanciamento(data: InsertFichaFinanciamento) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(fichasFinanciamento).values({...data, tenantId: getCurrentTenantId()});
  const fichaId = result[0].insertId;
  // Criar registros para todos os bancos
  const bancosData: InsertFichaBanco[] = BANCOS_FINANCIAMENTO.map(banco => ({
    fichaId,
    banco,
    status: "pendente" as const,
  }));
  await db.insert(fichaBancos).values(bancosData.map(b => ({...b, tenantId: getCurrentTenantId()})));
  return fichaId;
}

export async function listFichasFinanciamento(opts?: { sellerId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.sellerId) conditions.push(eq(fichasFinanciamento.sellerId, opts.sellerId));
  if (opts?.status) conditions.push(eq(fichasFinanciamento.status, opts.status as any));
  if (conditions.length > 0) {
    return db.select().from(fichasFinanciamento).where(and(eq(fichasFinanciamento.tenantId, getCurrentTenantId()), and(...conditions))).orderBy(desc(fichasFinanciamento.createdAt));
  }
  return db.select().from(fichasFinanciamento).where(eq(fichasFinanciamento.tenantId, getCurrentTenantId())).orderBy(desc(fichasFinanciamento.createdAt));
}

export async function getFichaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(fichasFinanciamento).where(and(eq(fichasFinanciamento.tenantId, getCurrentTenantId()), eq(fichasFinanciamento.id, id))).limit(1);
  return result[0];
}

export async function updateFichaFinanciamento(id: number, data: Partial<InsertFichaFinanciamento>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(fichasFinanciamento).set(data).where(and(eq(fichasFinanciamento.tenantId, getCurrentTenantId()), eq(fichasFinanciamento.id, id)));
}

export async function listFichaBancos(fichaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(fichaBancos).where(and(eq(fichaBancos.tenantId, getCurrentTenantId()), eq(fichaBancos.fichaId, fichaId))).orderBy(fichaBancos.banco);
}

export async function updateFichaBanco(id: number, data: Partial<InsertFichaBanco>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(fichaBancos).set(data).where(and(eq(fichaBancos.tenantId, getCurrentTenantId()), eq(fichaBancos.id, id)));
}

export async function getFichaFilaCount() {
  const db = await getDb();
  if (!db) return { naFila: 0, emAnalise: 0, total: 0 };
  const result = await db.select({
    status: fichasFinanciamento.status,
    count: sql<number>`count(*)`,
  }).from(fichasFinanciamento).where(eq(fichasFinanciamento.tenantId, getCurrentTenantId())).groupBy(fichasFinanciamento.status);
  const counts: Record<string, number> = {};
  result.forEach(r => { counts[r.status] = Number(r.count); });
  return {
    naFila: counts["na_fila"] || 0,
    emAnalise: counts["em_analise"] || 0,
    aprovado: counts["aprovado"] || 0,
    recusado: counts["recusado"] || 0,
    parcial: counts["parcial"] || 0,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
  };
}

export async function deleteFichaFinanciamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(fichaBancos).where(and(eq(fichaBancos.tenantId, getCurrentTenantId()), eq(fichaBancos.fichaId, id)));
  await db.delete(fichasFinanciamento).where(and(eq(fichasFinanciamento.tenantId, getCurrentTenantId()), eq(fichasFinanciamento.id, id)));
}


// ===== PERMISSÕES DE GERENTE =====

// Módulos disponíveis no sistema
export const AVAILABLE_MODULES = [
  { key: 'ranking', label: 'Ranking de Vendas' },
  { key: 'ranking_agendamentos', label: 'Ranking de Agendamentos' },
  { key: 'vendas', label: 'Vendas' },
  { key: 'agendamentos', label: 'Agendamentos' },
  { key: 'consignacao', label: 'Consignação' },
  { key: 'fei', label: 'F&I (Financiamento)' },
  { key: 'fichas', label: 'Mesa de Crédito' },
  { key: 'despachante', label: 'Despachante' },
  { key: 'documentos', label: 'Documentos de Venda' },
  { key: 'pos_venda', label: 'Pós-Venda' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'crm', label: 'CRM' },
  { key: 'metas', label: 'Metas' },
  { key: 'treinamentos', label: 'Treinamentos' },
  { key: 'vendedores', label: 'Gestão de Vendedores' },
  { key: 'iam', label: 'IAM (Agente IA)' },
] as const;

export async function getManagerPermissions(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(managerPermissions).where(and(eq(managerPermissions.tenantId, getCurrentTenantId()), eq(managerPermissions.sellerId, sellerId)));
}

export async function setManagerPermissions(sellerId: number, permissions: { module: string; canView: boolean; canEdit: boolean }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Deletar permissões antigas
  await db.delete(managerPermissions).where(and(eq(managerPermissions.tenantId, getCurrentTenantId()), eq(managerPermissions.sellerId, sellerId)));
  // Inserir novas
  if (permissions.length > 0) {
    await db.insert(managerPermissions).values(
      permissions.map(p => ({ sellerId, module: p.module, canView: p.canView, canEdit: p.canEdit }))
    );
  }
}

export async function hasManagerPermission(sellerId: number, module: string, action: 'view' | 'edit' = 'view'): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(managerPermissions)
    .where(and(eq(managerPermissions.sellerId, sellerId), eq(managerPermissions.module, module)))
    .limit(1);
  if (!result[0]) return false;
  return action === 'edit' ? result[0].canEdit : result[0].canView;
}


// ===== VIRADA DE MÊS / MONTHLY SNAPSHOTS =====

export async function createMonthlySnapshot(month: number, year: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const tid = getCurrentTenantId();
  
  // Check if snapshot already exists for this month/year/tenant
  const existing = await db.select().from(monthlySnapshots)
    .where(and(eq(monthlySnapshots.tenantId, tid), eq(monthlySnapshots.month, month), eq(monthlySnapshots.year, year)))
    .limit(1);
  if (existing.length > 0) return { alreadyExists: true, count: existing.length };
  
  // Get all active sellers for this tenant
  const sellersList = await db.select().from(sellers)
    .where(and(eq(sellers.tenantId, tid), eq(sellers.active, true)))
    .orderBy(desc(sellers.totalPoints));
  
  // Count FEI, consignment, SDR records for the month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  
  const snapshots: InsertMonthlySnapshot[] = sellersList.map((s, idx) => ({
    sellerId: s.id,
    sellerName: s.name,
    month,
    year,
    totalSales: s.totalSales,
    totalPoints: s.totalPoints,
    department: s.department,
    rank: idx + 1,
    totalFei: 0,
    totalConsignacao: 0,
    totalAgendamentos: 0,
    totalLeads: 0,
    tenantId: tid,
  }));
  
  if (snapshots.length > 0) {
    // Count per-seller stats for the month from sales table
    const monthSales = await db.select().from(sales)
      .where(and(
        eq(sales.tenantId, tid),
        eq(sales.status, "approved"),
        gte(sales.createdAt, monthStart),
        lt(sales.createdAt, monthEnd)
      ));
    
    const feiList = await db.select().from(feiRecords)
      .where(and(
        eq(feiRecords.tenantId, tid),
        gte(feiRecords.createdAt, monthStart),
        lt(feiRecords.createdAt, monthEnd)
      ));
    
    const consignList = await db.select().from(consignmentRecords)
      .where(and(
        eq(consignmentRecords.tenantId, tid),
        gte(consignmentRecords.createdAt, monthStart),
        lt(consignmentRecords.createdAt, monthEnd)
      ));
    
    const sdrList = await db.select().from(sdrRecords)
      .where(and(
        eq(sdrRecords.tenantId, tid),
        gte(sdrRecords.createdAt, monthStart),
        lt(sdrRecords.createdAt, monthEnd)
      ));
    
    // Aggregate per seller
    for (const snap of snapshots) {
      snap.totalFei = feiList.filter(f => f.sellerId === snap.sellerId).length;
      snap.totalConsignacao = consignList.filter(c => c.sellerId === snap.sellerId).length;
      snap.totalAgendamentos = sdrList.filter(r => r.sellerId === snap.sellerId).length;
      snap.totalLeads = 0; // leads are in CRM
    }
    
    await db.insert(monthlySnapshots).values(snapshots);
  }
  
  return { alreadyExists: false, count: snapshots.length };
}

export async function createCompetitionSnapshot(competitionId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const tid = getCurrentTenantId();
  
  // Get competition
  const comp = await db.select().from(competitions)
    .where(and(eq(competitions.tenantId, tid), eq(competitions.id, competitionId)))
    .limit(1);
  if (!comp[0]) throw new Error("Competition not found");
  
  // Check if already snapshotted
  const existing = await db.select().from(competitionSnapshots)
    .where(and(eq(competitionSnapshots.tenantId, tid), eq(competitionSnapshots.competitionId, competitionId)))
    .limit(1);
  if (existing.length > 0) return { alreadyExists: true };
  
  // Get ranking
  const participants = await db.select().from(competitionParticipants)
    .where(and(eq(competitionParticipants.tenantId, tid), eq(competitionParticipants.competitionId, competitionId)))
    .orderBy(desc(competitionParticipants.points));
  
  const sellerIds = participants.map(p => p.sellerId);
  const sellersList = sellerIds.length > 0 
    ? await db.select().from(sellers).where(and(eq(sellers.tenantId, tid), inArray(sellers.id, sellerIds)))
    : [];
  const sellersMap = new Map(sellersList.map(s => [s.id, s]));
  
  const ranking = participants.map((p, idx) => ({
    position: idx + 1,
    sellerId: p.sellerId,
    sellerName: sellersMap.get(p.sellerId)?.name || "Unknown",
    points: p.points,
    salesCount: p.salesCount,
  }));
  
  const endDate = comp[0].endDate;
  const snapshotMonth = endDate ? new Date(endDate).getMonth() + 1 : new Date().getMonth() + 1;
  const snapshotYear = endDate ? new Date(endDate).getFullYear() : new Date().getFullYear();
  
  await db.insert(competitionSnapshots).values({
    competitionId,
    competitionName: comp[0].name,
    competitionType: comp[0].type,
    category: comp[0].category,
    startDate: comp[0].startDate,
    endDate: comp[0].endDate,
    month: snapshotMonth,
    year: snapshotYear,
    rankingJson: JSON.stringify(ranking),
    championName: ranking[0]?.sellerName || null,
    championSellerId: ranking[0]?.sellerId || null,
    tenantId: tid,
  });
  
  return { alreadyExists: false, champion: ranking[0]?.sellerName };
}

export async function resetMonthlyCounters() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const tid = getCurrentTenantId();
  
  // Reset sellers totalSales and totalPoints to 0
  await db.update(sellers)
    .set({ totalSales: 0, totalPoints: 0 })
    .where(eq(sellers.tenantId, tid));
  
  return { success: true };
}

export async function getMonthlySnapshots(month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  const tid = getCurrentTenantId();
  return db.select().from(monthlySnapshots)
    .where(and(eq(monthlySnapshots.tenantId, tid), eq(monthlySnapshots.month, month), eq(monthlySnapshots.year, year)))
    .orderBy(monthlySnapshots.rank);
}

export async function getCompetitionSnapshotsByMonth(month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  const tid = getCurrentTenantId();
  return db.select().from(competitionSnapshots)
    .where(and(eq(competitionSnapshots.tenantId, tid), eq(competitionSnapshots.month, month), eq(competitionSnapshots.year, year)));
}

export async function listAvailableMonths() {
  const db = await getDb();
  if (!db) return [];
  const tid = getCurrentTenantId();
  const results = await db.selectDistinct({ month: monthlySnapshots.month, year: monthlySnapshots.year })
    .from(monthlySnapshots)
    .where(eq(monthlySnapshots.tenantId, tid))
    .orderBy(desc(monthlySnapshots.year), desc(monthlySnapshots.month));
  return results;
}

export async function executeMonthTurnover(closingMonth: number, closingYear: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const tid = getCurrentTenantId();
  
  // 1. Create monthly snapshot (archive seller data)
  const snapshotResult = await createMonthlySnapshot(closingMonth, closingYear);
  
  // 2. Snapshot all ended competitions for this month
  const endedComps = await db.select().from(competitions)
    .where(and(
      eq(competitions.tenantId, tid),
      eq(competitions.status, "finished")
    ));
  
  let compsSnapshotted = 0;
  for (const comp of endedComps) {
    try {
      const result = await createCompetitionSnapshot(comp.id);
      if (!result.alreadyExists) compsSnapshotted++;
    } catch (e) {
      // Skip errors for individual competitions
    }
  }
  
  // 3. Reset seller counters
  await resetMonthlyCounters();
  
  return {
    sellersArchived: snapshotResult.count,
    competitionsArchived: compsSnapshotted,
    alreadyDone: snapshotResult.alreadyExists,
  };
}


// ===== SELLER PERMISSIONS (visibility control) =====
const DEFAULT_MODULES = [
  { key: 'vendas', label: 'Vendas' },
  { key: 'fei', label: 'F&I / Financiamento' },
  { key: 'consignacao', label: 'Consignação' },
  { key: 'pos_venda', label: 'Pós-Venda' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'crm', label: 'CRM / Leads' },
  { key: 'metas', label: 'Metas' },
  { key: 'agendamentos', label: 'Agendamentos' },
  { key: 'treinamentos', label: 'Treinamentos' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'ranking', label: 'Ranking / Competição' },
  { key: 'equipe', label: 'Equipe / Colaboradores' },
  { key: 'despachante', label: 'Despachante' },
];

export async function getSellerPermissions(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sellerPermissions)
    .where(and(eq(sellerPermissions.tenantId, getCurrentTenantId()), eq(sellerPermissions.sellerId, sellerId)));
}

export async function setSellerPermission(sellerId: number, module: string, canView: boolean, canEdit: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check if permission already exists
  const existing = await db.select().from(sellerPermissions)
    .where(and(
      eq(sellerPermissions.tenantId, getCurrentTenantId()),
      eq(sellerPermissions.sellerId, sellerId),
      eq(sellerPermissions.module, module),
    )).limit(1);
  if (existing[0]) {
    await db.update(sellerPermissions)
      .set({ canView, canEdit })
      .where(eq(sellerPermissions.id, existing[0].id));
  } else {
    await db.insert(sellerPermissions).values({
      sellerId, module, canView, canEdit, tenantId: getCurrentTenantId(),
    });
  }
}

export async function setSellerPermissionsBulk(sellerId: number, permissions: { module: string; canView: boolean; canEdit: boolean }[]) {
  for (const perm of permissions) {
    await setSellerPermission(sellerId, perm.module, perm.canView, perm.canEdit);
  }
}

export async function initDefaultSellerPermissions(sellerId: number, department: string) {
  const db = await getDb();
  if (!db) return;
  // Check if already has permissions
  const existing = await db.select().from(sellerPermissions)
    .where(and(eq(sellerPermissions.tenantId, getCurrentTenantId()), eq(sellerPermissions.sellerId, sellerId)));
  if (existing.length > 0) return; // Already initialized
  
  // Default permissions based on department
  const deptDefaults: Record<string, string[]> = {
    vendas: ['vendas', 'crm', 'metas', 'agendamentos', 'treinamentos'],
    fei: ['fei', 'vendas'],
    consignacao: ['consignacao', 'vendas'],
    pos_venda: ['pos_venda'],
    despachante: ['vendas'],
  };
  
  const allowedModules = deptDefaults[department] || ['vendas'];
  
  for (const mod of DEFAULT_MODULES) {
    const canView = allowedModules.includes(mod.key);
    await db.insert(sellerPermissions).values({
      sellerId, module: mod.key, canView, canEdit: canView, tenantId: getCurrentTenantId(),
    });
  }
}

export { DEFAULT_MODULES as SELLER_PERMISSION_MODULES };
