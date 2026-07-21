import { eq, and, desc, asc, sql, gte, lte, lt, or, like } from "drizzle-orm";
import { finCategories, InsertFinCategory, finTransactions, InsertFinTransaction, fuelRecords, type InsertFuelRecord } from "../drizzle/schema";
import { getDb } from "./db";

import { getCurrentTenantId } from "./tenantDb";

// ===== CATEGORIES =====

export async function listFinCategories(type?: "expense" | "income") {
  const db = await getDb();
  if (!db) return [];
  if (type) {
    return db.select().from(finCategories).where(and(eq(finCategories.tenantId, getCurrentTenantId()), and(eq(finCategories.type, type), eq(finCategories.active, true)))).orderBy(asc(finCategories.name));
  }
  return db.select().from(finCategories).where(and(eq(finCategories.tenantId, getCurrentTenantId()), eq(finCategories.active, true))).orderBy(asc(finCategories.type), asc(finCategories.name));
}

export async function createFinCategory(data: { name: string; type: "expense" | "income"; icon?: string; color?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(finCategories).values({...data, tenantId: getCurrentTenantId()});
  return Number(result[0].insertId);
}

export async function updateFinCategory(id: number, data: Partial<{ name: string; icon: string; color: string; active: boolean }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(finCategories).set(data).where(and(eq(finCategories.tenantId, getCurrentTenantId()), eq(finCategories.id, id)));
}

// ===== TRANSACTIONS =====

export type FinTransactionFilters = {
  type?: "payable" | "receivable";
  status?: "pending" | "paid" | "overdue" | "cancelled";
  approvalStatus?: "none" | "pending_approval" | "approved" | "rejected";
  categoryId?: number;
  startDate?: number;
  endDate?: number;
  search?: string;
  vehicle?: string;
  /** Vencidas: status pendente/vencido com vencimento no passado. */
  overdueOnly?: boolean;
  /** Vence hoje: status pendente com vencimento dentro do dia atual. */
  dueTodayOnly?: boolean;
};

/** Monta as condições de filtro compartilhadas entre a listagem e o summary (sempre escopadas por tenant). */
function buildFinTransactionConditions(filters: FinTransactionFilters) {
  const conditions: any[] = [eq(finTransactions.tenantId, getCurrentTenantId())];
  if (filters.type) conditions.push(eq(finTransactions.type, filters.type));
  if (filters.status) conditions.push(eq(finTransactions.status, filters.status));
  if (filters.approvalStatus) conditions.push(eq(finTransactions.approvalStatus, filters.approvalStatus));
  if (filters.categoryId) conditions.push(eq(finTransactions.categoryId, filters.categoryId));
  if (filters.startDate) conditions.push(gte(finTransactions.dueDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(finTransactions.dueDate, filters.endDate));
  if (filters.vehicle) conditions.push(eq(finTransactions.vehicle, filters.vehicle));

  if (filters.overdueOnly) {
    conditions.push(or(eq(finTransactions.status, "pending"), eq(finTransactions.status, "overdue")));
    conditions.push(lt(finTransactions.dueDate, Date.now()));
  }
  if (filters.dueTodayOnly) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    conditions.push(eq(finTransactions.status, "pending"));
    conditions.push(gte(finTransactions.dueDate, start.getTime()));
    conditions.push(lte(finTransactions.dueDate, end.getTime()));
  }
  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    conditions.push(or(
      like(finTransactions.description, q),
      like(finTransactions.supplier, q),
      like(finTransactions.vehicle, q),
      like(finTransactions.notes, q),
    ));
  }
  return and(...conditions);
}

export async function listFinTransactions(filters: FinTransactionFilters & { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0, page: 1, pageSize: 50, totalPages: 1 };

  const where = buildFinTransactionConditions(filters);
  const pageSize = Math.max(1, filters.limit ?? 50);
  const offset = Math.max(0, filters.offset ?? 0);

  const [items, countResult] = await Promise.all([
    db.select().from(finTransactions)
      .where(where)
      .orderBy(asc(finTransactions.dueDate))
      .limit(pageSize)
      .offset(offset),
    // IMPORTANTE: count usa exatamente o mesmo `where` (com tenant) — antes a query de
    // items não filtrava por tenant e vazava dados entre lojas.
    db.select({ count: sql<number>`count(*)` }).from(finTransactions).where(where),
  ]);

  const total = Number(countResult[0]?.count || 0);
  return {
    items,
    total,
    page: Math.floor(offset / pageSize) + 1,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Contadores por status para os chips/resumo, respeitando os mesmos filtros de período/tipo.
 * Retorna contagens globais e por tipo (payable/receivable) numa única passada de agregação.
 */
export async function getFinTransactionsSummary(filters: { startDate?: number; endDate?: number }) {
  const db = await getDb();
  const empty = { total: 0, pending: 0, paid: 0, overdue: 0, dueToday: 0, approval: 0 };
  if (!db) return { all: empty, payable: empty, receivable: empty };

  const base = buildFinTransactionConditions(filters);
  const now = Date.now();
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);

  const rows = await db.select({
    type: finTransactions.type,
    status: finTransactions.status,
    approvalStatus: finTransactions.approvalStatus,
    dueDate: finTransactions.dueDate,
  }).from(finTransactions).where(base);

  const mk = () => ({ total: 0, pending: 0, paid: 0, overdue: 0, dueToday: 0, approval: 0 });
  const acc = { all: mk(), payable: mk(), receivable: mk() };
  for (const r of rows) {
    const buckets = [acc.all, r.type === "payable" ? acc.payable : acc.receivable];
    for (const b of buckets) {
      b.total++;
      if (r.status === "pending") b.pending++;
      if (r.status === "paid") b.paid++;
      if ((r.status === "pending" || r.status === "overdue") && Number(r.dueDate) < now) b.overdue++;
      if (r.status === "pending" && Number(r.dueDate) >= dayStart.getTime() && Number(r.dueDate) <= dayEnd.getTime()) b.dueToday++;
      if (r.approvalStatus === "pending_approval") b.approval++;
    }
  }
  return acc;
}

export async function getFinTransaction(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(finTransactions).where(and(eq(finTransactions.tenantId, getCurrentTenantId()), eq(finTransactions.id, id))).limit(1);
  return rows[0] || null;
}

export async function createFinTransaction(data: {
  type: "payable" | "receivable";
  description: string;
  amount: string;
  dueDate: number;
  status?: "pending" | "paid" | "overdue" | "cancelled";
  paidDate?: number;
  categoryId?: number;
  supplier?: string;
  vehicle?: string;
  barcode?: string;
  notes?: string;
  receiptUrl?: string;
  receiptKey?: string;
  recurrence?: "none" | "monthly" | "weekly" | "yearly";
  paymentMethod?: "pix" | "cartao_credito" | "boleto" | "dinheiro" | null;
  installmentNumber?: number;
  installmentTotal?: number;
  createdBy?: number;
  needsApproval?: boolean;
  approvalStatus?: "none" | "pending_approval" | "approved" | "rejected";
  createdByName?: string;
  sellerId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(finTransactions).values({...data, tenantId: getCurrentTenantId()});
  return Number(result[0].insertId);
}

export async function updateFinTransaction(id: number, data: Partial<{
  description: string;
  amount: string;
  dueDate: number;
  paidDate: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  categoryId: number;
  supplier: string;
  vehicle: string;
  barcode: string;
  notes: string;
  receiptUrl: string;
  receiptKey: string;
  needsApproval: boolean;
  approvalStatus: "none" | "pending_approval" | "approved" | "rejected";
  approvedBy: string;
  approvedAt: number;
  sellerId: number | null;
  paymentMethod: "pix" | "cartao_credito" | "boleto" | "dinheiro" | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(finTransactions).set(data).where(and(eq(finTransactions.tenantId, getCurrentTenantId()), eq(finTransactions.id, id)));
}

export async function deleteFinTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(finTransactions).where(and(eq(finTransactions.tenantId, getCurrentTenantId()), eq(finTransactions.id, id)));
}

export async function markAsPaid(id: number, paidDate: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(finTransactions).set({ status: "paid", paidDate }).where(and(eq(finTransactions.tenantId, getCurrentTenantId()), eq(finTransactions.id, id)));
}

// ===== DASHBOARD =====

export async function getFinDashboard(month?: number, year?: number) {
  const db = await getDb();
  if (!db) return { totalPayable: 0, totalReceivable: 0, totalPaid: 0, totalReceived: 0, overdue: 0, pendingPayable: 0, pendingReceivable: 0, upcomingDue: [] };
  
  const now = Date.now();
  const startOfMonth = month && year
    ? new Date(year, month - 1, 1).getTime()
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const endOfMonth = month && year
    ? new Date(year, month, 0, 23, 59, 59).getTime()
    : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).getTime();
  
  // Total payable this month
  const [payableResult] = await db.select({
    total: sql<string>`COALESCE(SUM(CASE WHEN type = 'payable' THEN amount ELSE 0 END), 0)`,
    paid: sql<string>`COALESCE(SUM(CASE WHEN type = 'payable' AND status = 'paid' THEN amount ELSE 0 END), 0)`,
    pending: sql<string>`COALESCE(SUM(CASE WHEN type = 'payable' AND status = 'pending' THEN amount ELSE 0 END), 0)`,
  }).from(finTransactions).where(and(eq(finTransactions.tenantId, getCurrentTenantId()), and(gte(finTransactions.dueDate, startOfMonth), lte(finTransactions.dueDate, endOfMonth))));
  
  // Total receivable this month
  const [receivableResult] = await db.select({
    total: sql<string>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount ELSE 0 END), 0)`,
    received: sql<string>`COALESCE(SUM(CASE WHEN type = 'receivable' AND status = 'paid' THEN amount ELSE 0 END), 0)`,
    pending: sql<string>`COALESCE(SUM(CASE WHEN type = 'receivable' AND status = 'pending' THEN amount ELSE 0 END), 0)`,
  }).from(finTransactions).where(and(eq(finTransactions.tenantId, getCurrentTenantId()), and(gte(finTransactions.dueDate, startOfMonth), lte(finTransactions.dueDate, endOfMonth))));
  
  // Overdue count
  const [overdueResult] = await db.select({
    count: sql<number>`count(*)`,
  }).from(finTransactions).where(and(eq(finTransactions.tenantId, getCurrentTenantId()), and(eq(finTransactions.status, "pending"), lte(finTransactions.dueDate, now))));
  
  // Upcoming due (next 7 days)
  const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
  const upcomingDue = await db.select().from(finTransactions)
    .where(and(eq(finTransactions.status, "pending"), gte(finTransactions.dueDate, now), lte(finTransactions.dueDate, sevenDaysFromNow)))
    .orderBy(asc(finTransactions.dueDate))
    .limit(10);
  
  return {
    totalPayable: Number(payableResult?.total || 0),
    totalPaid: Number(payableResult?.paid || 0),
    pendingPayable: Number(payableResult?.pending || 0),
    totalReceivable: Number(receivableResult?.total || 0),
    totalReceived: Number(receivableResult?.received || 0),
    pendingReceivable: Number(receivableResult?.pending || 0),
    overdue: Number(overdueResult?.count || 0),
    upcomingDue,
  };
}

// ===== OCR via LLM Vision =====

export async function parseDocumentWithLLM(imageUrl: string, docType: "boleto" | "nota_fiscal" | "conta") {
  // This will be called from the router with the LLM
  // Returns structured data based on document type
  const prompts: Record<string, string> = {
    boleto: `Analise esta imagem de um boleto bancário e extraia as seguintes informações em JSON:
{
  "beneficiario": "nome do beneficiário/empresa",
  "valor": "valor em reais (número decimal, ex: 150.00)",
  "vencimento": "data de vencimento no formato DD/MM/YYYY",
  "codigoBarras": "código de barras se visível",
  "descricao": "descrição ou referência do boleto"
}
Retorne APENAS o JSON, sem texto adicional.`,
    nota_fiscal: `Analise esta imagem de uma nota fiscal e extraia as seguintes informações em JSON:
{
  "emitente": "nome/razão social do emitente",
  "cnpj": "CNPJ do emitente",
  "valor": "valor total em reais (número decimal, ex: 1500.00)",
  "dataEmissao": "data de emissão no formato DD/MM/YYYY",
  "descricao": "descrição dos itens/serviços principais",
  "numero": "número da nota fiscal"
}
Retorne APENAS o JSON, sem texto adicional.`,
    conta: `Analise esta imagem de uma conta (luz, água, telefone, internet, etc) e extraia as seguintes informações em JSON:
{
  "empresa": "nome da empresa fornecedora",
  "tipo": "tipo da conta (luz, água, telefone, internet, gás, etc)",
  "valor": "valor em reais (número decimal, ex: 250.00)",
  "vencimento": "data de vencimento no formato DD/MM/YYYY",
  "referencia": "mês/período de referência",
  "codigoBarras": "código de barras se visível"
}
Retorne APENAS o JSON, sem texto adicional.`,
  };
  
  return prompts[docType] || prompts.boleto;
}

// ===== OVERDUE & UPCOMING =====

export async function getOverdueTransactions() {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  return db.select().from(finTransactions)
    .where(and(eq(finTransactions.status, "pending"), lte(finTransactions.dueDate, now)))
    .orderBy(asc(finTransactions.dueDate));
}

export async function getUpcomingDueTransactions(days: number = 3) {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  const futureDate = now + days * 24 * 60 * 60 * 1000;
  return db.select().from(finTransactions)
    .where(and(eq(finTransactions.status, "pending"), gte(finTransactions.dueDate, now), lte(finTransactions.dueDate, futureDate)))
    .orderBy(asc(finTransactions.dueDate));
}

// ==================== FUEL RECORDS ====================

export async function listFuelRecords(filters?: { month?: number; year?: number }) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [];
  if (filters?.month && filters?.year) {
    const start = new Date(filters.year, filters.month - 1, 1).getTime();
    const end = new Date(filters.year, filters.month, 0, 23, 59, 59).getTime();
    conditions.push(gte(fuelRecords.fuelDate, start));
    conditions.push(lte(fuelRecords.fuelDate, end));
  }
  
  return db.select().from(fuelRecords)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(fuelRecords.fuelDate));
}

export async function createFuelRecord(data: InsertFuelRecord) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(fuelRecords).values({...data, tenantId: getCurrentTenantId()});
  return { id: result[0].insertId };
}

export async function updateFuelRecord(id: number, data: Partial<InsertFuelRecord>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(fuelRecords).set(data).where(and(eq(fuelRecords.tenantId, getCurrentTenantId()), eq(fuelRecords.id, id)));
  return { success: true };
}

export async function deleteFuelRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(fuelRecords).where(and(eq(fuelRecords.tenantId, getCurrentTenantId()), eq(fuelRecords.id, id)));
  return { success: true };
}

export async function getFuelDashboard(month?: number, year?: number) {
  const db = await getDb();
  if (!db) return { totalLiters: 0, totalCost: 0, recordCount: 0 };
  
  const now = new Date();
  const m = month || (now.getMonth() + 1);
  const y = year || now.getFullYear();
  const start = new Date(y, m - 1, 1).getTime();
  const end = new Date(y, m, 0, 23, 59, 59).getTime();
  
  const [result] = await db.select({
    totalLiters: sql<string>`COALESCE(SUM(liters), 0)`,
    totalCost: sql<string>`COALESCE(SUM(totalCost), 0)`,
    recordCount: sql<number>`COUNT(*)`,
  }).from(fuelRecords).where(and(eq(fuelRecords.tenantId, getCurrentTenantId()), and(gte(fuelRecords.fuelDate, start), lte(fuelRecords.fuelDate, end))));
  
  return {
    totalLiters: parseFloat(result?.totalLiters || '0'),
    totalCost: parseFloat(result?.totalCost || '0'),
    recordCount: result?.recordCount || 0,
  };
}

// ===== FINANCIAL ALERTS =====

export async function getFinancialAlerts() {
  const db = await getDb();
  if (!db) return { overdue: [], dueToday: [], dueTomorrow: [], dueThisWeek: [], summary: { overdueCount: 0, overdueTotal: 0, dueTodayCount: 0, dueTodayTotal: 0, dueTomorrowCount: 0, dueTomorrowTotal: 0, dueWeekCount: 0, dueWeekTotal: 0 } };
  
  const now = new Date();
  // Start of today (midnight)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // End of today (23:59:59)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  // Start of tomorrow
  const startOfTomorrow = endOfToday + 1;
  // End of tomorrow
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999).getTime();
  // End of this week (7 days from today)
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999).getTime();
  
  const tid = getCurrentTenantId();
  const notPaid = or(eq(finTransactions.status, "pending"), eq(finTransactions.status, "overdue"));
  
  // Overdue: vencimento antes de hoje e não paga
  const overdue = await db.select().from(finTransactions)
    .where(and(eq(finTransactions.tenantId, tid), notPaid, lte(finTransactions.dueDate, startOfToday - 1)))
    .orderBy(asc(finTransactions.dueDate));
  
  // Due today: vencimento é hoje
  const dueToday = await db.select().from(finTransactions)
    .where(and(eq(finTransactions.tenantId, tid), notPaid, gte(finTransactions.dueDate, startOfToday), lte(finTransactions.dueDate, endOfToday)))
    .orderBy(asc(finTransactions.dueDate));
  
  // Due tomorrow: vencimento é amanhã
  const dueTomorrow = await db.select().from(finTransactions)
    .where(and(eq(finTransactions.tenantId, tid), notPaid, gte(finTransactions.dueDate, startOfTomorrow), lte(finTransactions.dueDate, endOfTomorrow)))
    .orderBy(asc(finTransactions.dueDate));
  
  // Due this week: vencimento nos próximos 7 dias (excluindo hoje e amanhã)
  const dueThisWeek = await db.select().from(finTransactions)
    .where(and(eq(finTransactions.tenantId, tid), notPaid, gte(finTransactions.dueDate, endOfTomorrow + 1), lte(finTransactions.dueDate, endOfWeek)))
    .orderBy(asc(finTransactions.dueDate));
  
  const sumAmounts = (items: any[]) => items.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  
  return {
    overdue,
    dueToday,
    dueTomorrow,
    dueThisWeek,
    summary: {
      overdueCount: overdue.length,
      overdueTotal: sumAmounts(overdue),
      dueTodayCount: dueToday.length,
      dueTodayTotal: sumAmounts(dueToday),
      dueTomorrowCount: dueTomorrow.length,
      dueTomorrowTotal: sumAmounts(dueTomorrow),
      dueWeekCount: dueThisWeek.length,
      dueWeekTotal: sumAmounts(dueThisWeek),
    },
  };
}

// Auto-update overdue status
export async function autoUpdateOverdueStatus() {
  const db = await getDb();
  if (!db) return 0;
  const now = Date.now();
  const result = await db.update(finTransactions)
    .set({ status: "overdue" })
    .where(and(eq(finTransactions.status, "pending"), lte(finTransactions.dueDate, now)));
  return result[0]?.affectedRows || 0;
}
