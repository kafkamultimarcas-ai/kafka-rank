import { z } from "zod";
import { eq, and, gte, lte, count, desc, inArray, type SQL } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { subscriptionEvents, emailLogs, tenants, billingAlerts } from "../../drizzle/schema";
import { verifySuperToken } from "../superAdminAuth";

const logTypeSchema = z.enum(["email", "subscription", "billing_alert"]);

// Eventos que nunca mudam status automaticamente (server/webhooks.ts só reage a
// PAYMENT_CONFIRMED/RECEIVED/OVERDUE) mas merecem olho do Super Admin — dinheiro
// saindo ou reclamação de cliente não é algo pra descobrir só se for procurar.
const RARE_EVENT_TYPES = ["PAYMENT_DELETED", "PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE", "PAYMENT_AWAITING_CHARGEBACK_REVERSAL"];
const RARE_EVENTS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Formato normalizado que a tela de logs do Super Admin consome, independente
// da tabela de origem — permite listar e-mail e assinatura lado a lado sem o
// frontend precisar conhecer o schema de cada tabela.
type NormalizedLogItem = {
  id: number;
  logType: "email" | "subscription" | "billing_alert";
  tenantId: number | null;
  tenantName: string | null;
  tenantSlug: string | null;
  title: string;
  detail: string;
  status: string | null;
  // Só preenchido pra logType="billing_alert" — indica se já foi tratado.
  resolved?: boolean | null;
  createdAt: Date;
};

async function listSubscriptionLogs(input: {
  tenantId?: number; status?: string; startDate?: number; endDate?: number; limit: number; offset: number;
}): Promise<{ items: NormalizedLogItem[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions: SQL[] = [];
  if (input.tenantId) conditions.push(eq(subscriptionEvents.tenantId, input.tenantId));
  if (input.status) conditions.push(eq(subscriptionEvents.status, input.status));
  if (input.startDate) conditions.push(gte(subscriptionEvents.createdAt, new Date(input.startDate)));
  if (input.endDate) conditions.push(lte(subscriptionEvents.createdAt, new Date(input.endDate)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ value: total }]] = await Promise.all([
    db.select({
      id: subscriptionEvents.id,
      tenantId: subscriptionEvents.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      eventType: subscriptionEvents.eventType,
      asaasPaymentId: subscriptionEvents.asaasPaymentId,
      status: subscriptionEvents.status,
      value: subscriptionEvents.value,
      createdAt: subscriptionEvents.createdAt,
    })
      .from(subscriptionEvents)
      .leftJoin(tenants, eq(tenants.id, subscriptionEvents.tenantId))
      .where(where)
      .orderBy(desc(subscriptionEvents.createdAt))
      .limit(input.limit).offset(input.offset),
    db.select({ value: count() }).from(subscriptionEvents).where(where),
  ]);

  return {
    total,
    items: rows.map((r): NormalizedLogItem => ({
      id: r.id,
      logType: "subscription",
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      tenantSlug: r.tenantSlug,
      title: r.eventType,
      detail: [r.asaasPaymentId, r.value ? `R$ ${r.value}` : null].filter(Boolean).join(" · "),
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}

async function listEmailLogs(input: {
  tenantId?: number; status?: string; startDate?: number; endDate?: number; limit: number; offset: number;
}): Promise<{ items: NormalizedLogItem[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions: SQL[] = [];
  if (input.tenantId) conditions.push(eq(emailLogs.tenantId, input.tenantId));
  if (input.status) conditions.push(eq(emailLogs.status, input.status as "sent" | "failed"));
  if (input.startDate) conditions.push(gte(emailLogs.createdAt, new Date(input.startDate)));
  if (input.endDate) conditions.push(lte(emailLogs.createdAt, new Date(input.endDate)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ value: total }]] = await Promise.all([
    db.select({
      id: emailLogs.id,
      tenantId: emailLogs.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      emailType: emailLogs.emailType,
      toEmail: emailLogs.toEmail,
      subject: emailLogs.subject,
      status: emailLogs.status,
      createdAt: emailLogs.createdAt,
    })
      .from(emailLogs)
      .leftJoin(tenants, eq(tenants.id, emailLogs.tenantId))
      .where(where)
      .orderBy(desc(emailLogs.createdAt))
      .limit(input.limit).offset(input.offset),
    db.select({ value: count() }).from(emailLogs).where(where),
  ]);

  return {
    total,
    items: rows.map((r): NormalizedLogItem => ({
      id: r.id,
      logType: "email",
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      tenantSlug: r.tenantSlug,
      title: r.emailType,
      detail: `${r.toEmail} · ${r.subject}`,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}

async function listBillingAlertLogs(input: {
  tenantId?: number; status?: string; startDate?: number; endDate?: number; limit: number; offset: number;
}): Promise<{ items: NormalizedLogItem[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions: SQL[] = [];
  if (input.tenantId) conditions.push(eq(billingAlerts.tenantId, input.tenantId));
  if (input.status) conditions.push(eq(billingAlerts.severity, input.status as "critical" | "warning"));
  if (input.startDate) conditions.push(gte(billingAlerts.createdAt, new Date(input.startDate)));
  if (input.endDate) conditions.push(lte(billingAlerts.createdAt, new Date(input.endDate)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ value: total }]] = await Promise.all([
    db.select({
      id: billingAlerts.id,
      tenantId: billingAlerts.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      severity: billingAlerts.severity,
      code: billingAlerts.code,
      message: billingAlerts.message,
      resolved: billingAlerts.resolved,
      createdAt: billingAlerts.createdAt,
    })
      .from(billingAlerts)
      .leftJoin(tenants, eq(tenants.id, billingAlerts.tenantId))
      .where(where)
      .orderBy(desc(billingAlerts.createdAt))
      .limit(input.limit).offset(input.offset),
    db.select({ value: count() }).from(billingAlerts).where(where),
  ]);

  return {
    total,
    items: rows.map((r): NormalizedLogItem => ({
      id: r.id,
      logType: "billing_alert",
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      tenantSlug: r.tenantSlug,
      title: r.code,
      detail: r.message,
      status: r.severity,
      resolved: r.resolved,
      createdAt: r.createdAt,
    })),
  };
}

/** Visão unificada do Super Admin sobre logs de e-mail, assinatura e alertas de
 * cobrança de todas as lojas — cada tipo continua guardado na tabela que faz sentido pra ele
 * (email_logs / subscription_events / billing_alerts), esta camada só normaliza
 * pra exibição conjunta. Mesmo token de portal master usado no resto do Super Admin. */
export const platformLogsRouter = router({
  list: publicProcedure.input(z.object({
    token: z.string(),
    logType: logTypeSchema.optional(),
    tenantId: z.number().optional(),
    status: z.string().optional(),
    startDate: z.number().optional(),
    endDate: z.number().optional(),
    limit: z.number().min(1).max(100).default(30),
    offset: z.number().min(0).default(0),
  })).query(async ({ input }) => {
    const payload = verifySuperToken(input.token);
    if (!payload) throw new Error("Não autorizado");

    const filters = { tenantId: input.tenantId, status: input.status, startDate: input.startDate, endDate: input.endDate };

    if (input.logType === "subscription") {
      return listSubscriptionLogs({ ...filters, limit: input.limit, offset: input.offset });
    }
    if (input.logType === "email") {
      return listEmailLogs({ ...filters, limit: input.limit, offset: input.offset });
    }
    if (input.logType === "billing_alert") {
      return listBillingAlertLogs({ ...filters, limit: input.limit, offset: input.offset });
    }

    // "Todos": busca o suficiente de cada fonte pra cobrir a página pedida,
    // mescla por data e corta no limit — paginação exata entre três tabelas
    // diferentes exigiria um UNION SQL; pro volume de logs de uma plataforma
    // (não é big data), essa aproximação é suficiente e bem mais simples.
    const fetchSize = input.offset + input.limit;
    const [subs, emails, alerts] = await Promise.all([
      listSubscriptionLogs({ ...filters, limit: fetchSize, offset: 0 }),
      listEmailLogs({ ...filters, limit: fetchSize, offset: 0 }),
      listBillingAlertLogs({ ...filters, limit: fetchSize, offset: 0 }),
    ]);

    const merged = [...subs.items, ...emails.items, ...alerts.items]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(input.offset, input.offset + input.limit);

    return { items: merged, total: subs.total + emails.total + alerts.total };
  }),

  // Contagem simples (não é um sistema de "lido/não lido") de eventos raros nos
  // últimos 30 dias + alertas críticos de cobrança não resolvidos — vira badge
  // na aba de Logs pra chamar atenção do Super Admin.
  getRareEventsCount: publicProcedure.input(z.object({
    token: z.string(),
  })).query(async ({ input }) => {
    const payload = verifySuperToken(input.token);
    if (!payload) throw new Error("Não autorizado");

    const db = await getDb();
    if (!db) return { count: 0 };

    const [[{ value: rareCount }], [{ value: criticalAlertsCount }]] = await Promise.all([
      db.select({ value: count() }).from(subscriptionEvents).where(and(
        inArray(subscriptionEvents.eventType, RARE_EVENT_TYPES),
        gte(subscriptionEvents.createdAt, new Date(Date.now() - RARE_EVENTS_WINDOW_MS)),
      )),
      db.select({ value: count() }).from(billingAlerts).where(and(
        eq(billingAlerts.severity, "critical"),
        eq(billingAlerts.resolved, false),
      )),
    ]);

    return { count: rareCount + criticalAlertsCount };
  }),

  getById: publicProcedure.input(z.object({
    token: z.string(),
    logType: logTypeSchema,
    id: z.number(),
  })).query(async ({ input }) => {
    const payload = verifySuperToken(input.token);
    if (!payload) throw new Error("Não autorizado");

    const db = await getDb();
    if (!db) return null;

    if (input.logType === "subscription") {
      const [row] = await db.select({ event: subscriptionEvents, tenantName: tenants.name, tenantSlug: tenants.slug })
        .from(subscriptionEvents)
        .leftJoin(tenants, eq(tenants.id, subscriptionEvents.tenantId))
        .where(eq(subscriptionEvents.id, input.id))
        .limit(1);
      if (!row) return null;
      return { logType: "subscription" as const, ...row.event, tenantName: row.tenantName, tenantSlug: row.tenantSlug };
    }

    if (input.logType === "billing_alert") {
      const [row] = await db.select({ alert: billingAlerts, tenantName: tenants.name, tenantSlug: tenants.slug })
        .from(billingAlerts)
        .leftJoin(tenants, eq(tenants.id, billingAlerts.tenantId))
        .where(eq(billingAlerts.id, input.id))
        .limit(1);
      if (!row) return null;
      return { logType: "billing_alert" as const, ...row.alert, tenantName: row.tenantName, tenantSlug: row.tenantSlug };
    }

    const [row] = await db.select({ log: emailLogs, tenantName: tenants.name, tenantSlug: tenants.slug })
      .from(emailLogs)
      .leftJoin(tenants, eq(tenants.id, emailLogs.tenantId))
      .where(eq(emailLogs.id, input.id))
      .limit(1);
    if (!row) return null;
    return { logType: "email" as const, ...row.log, tenantName: row.tenantName, tenantSlug: row.tenantSlug };
  }),

  // Marca um alerta de cobrança como tratado — só faz sentido pra logType="billing_alert".
  resolveBillingAlert: publicProcedure.input(z.object({
    token: z.string(),
    id: z.number(),
  })).mutation(async ({ input }) => {
    const payload = verifySuperToken(input.token);
    if (!payload) throw new Error("Não autorizado");

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(billingAlerts).set({
      resolved: true,
      resolvedAt: Date.now(),
      resolvedBy: `super_admin_${payload.superAdminId}`,
    }).where(eq(billingAlerts.id, input.id));

    return { success: true };
  }),
});
