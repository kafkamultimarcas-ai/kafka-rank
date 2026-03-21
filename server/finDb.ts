import { eq, and, desc, asc, sql, gte, lte, or } from "drizzle-orm";
import { finCategories, InsertFinCategory, finTransactions, InsertFinTransaction } from "../drizzle/schema";
import { getDb } from "./db";

// ===== CATEGORIES =====

export async function listFinCategories(type?: "expense" | "income") {
  const db = await getDb();
  if (!db) return [];
  if (type) {
    return db.select().from(finCategories).where(and(eq(finCategories.type, type), eq(finCategories.active, true))).orderBy(asc(finCategories.name));
  }
  return db.select().from(finCategories).where(eq(finCategories.active, true)).orderBy(asc(finCategories.type), asc(finCategories.name));
}

export async function createFinCategory(data: { name: string; type: "expense" | "income"; icon?: string; color?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(finCategories).values(data);
  return Number(result[0].insertId);
}

export async function updateFinCategory(id: number, data: Partial<{ name: string; icon: string; color: string; active: boolean }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(finCategories).set(data).where(eq(finCategories.id, id));
}

// ===== TRANSACTIONS =====

export async function listFinTransactions(filters: {
  type?: "payable" | "receivable";
  status?: "pending" | "paid" | "overdue" | "cancelled";
  categoryId?: number;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  
  const conditions = [];
  if (filters.type) conditions.push(eq(finTransactions.type, filters.type));
  if (filters.status) conditions.push(eq(finTransactions.status, filters.status));
  if (filters.categoryId) conditions.push(eq(finTransactions.categoryId, filters.categoryId));
  if (filters.startDate) conditions.push(gte(finTransactions.dueDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(finTransactions.dueDate, filters.endDate));
  
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  
  const [items, countResult] = await Promise.all([
    db.select().from(finTransactions)
      .where(where)
      .orderBy(asc(finTransactions.dueDate))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0),
    db.select({ count: sql<number>`count(*)` }).from(finTransactions).where(where),
  ]);
  
  return { items, total: Number(countResult[0]?.count || 0) };
}

export async function getFinTransaction(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(finTransactions).where(eq(finTransactions.id, id)).limit(1);
  return rows[0] || null;
}

export async function createFinTransaction(data: {
  type: "payable" | "receivable";
  description: string;
  amount: string;
  dueDate: number;
  status?: "pending" | "paid" | "overdue" | "cancelled";
  categoryId?: number;
  supplier?: string;
  barcode?: string;
  notes?: string;
  receiptUrl?: string;
  receiptKey?: string;
  recurrence?: "none" | "monthly" | "weekly" | "yearly";
  installmentNumber?: number;
  installmentTotal?: number;
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(finTransactions).values(data);
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
  barcode: string;
  notes: string;
  receiptUrl: string;
  receiptKey: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(finTransactions).set(data).where(eq(finTransactions.id, id));
}

export async function deleteFinTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(finTransactions).where(eq(finTransactions.id, id));
}

export async function markAsPaid(id: number, paidDate: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(finTransactions).set({ status: "paid", paidDate }).where(eq(finTransactions.id, id));
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
  }).from(finTransactions).where(and(gte(finTransactions.dueDate, startOfMonth), lte(finTransactions.dueDate, endOfMonth)));
  
  // Total receivable this month
  const [receivableResult] = await db.select({
    total: sql<string>`COALESCE(SUM(CASE WHEN type = 'receivable' THEN amount ELSE 0 END), 0)`,
    received: sql<string>`COALESCE(SUM(CASE WHEN type = 'receivable' AND status = 'paid' THEN amount ELSE 0 END), 0)`,
    pending: sql<string>`COALESCE(SUM(CASE WHEN type = 'receivable' AND status = 'pending' THEN amount ELSE 0 END), 0)`,
  }).from(finTransactions).where(and(gte(finTransactions.dueDate, startOfMonth), lte(finTransactions.dueDate, endOfMonth)));
  
  // Overdue count
  const [overdueResult] = await db.select({
    count: sql<number>`count(*)`,
  }).from(finTransactions).where(and(eq(finTransactions.status, "pending"), lte(finTransactions.dueDate, now)));
  
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
