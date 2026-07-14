import { z } from "zod";
import { eq, and, gte, lte, count, desc, inArray, type SQL } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { subscriptionEvents, emailLogs, tenants, billingAlerts, integrationSyncLogs, inventorySyncLogs } from "../../drizzle/schema";
import { verifySuperToken } from "../superAdminAuth";
const logTypeSchema = z.enum(["email", "subscription", "billing_alert", "integration"]);

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
  logType: "email" | "subscription" | "billing_alert" | "integration";
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

/** Lista logs de integração (integration_sync_logs + inventory_sync_logs) de todas as lojas */
async function listIntegrationLogs(input: {
  tenantId?: number; status?: string; startDate?: number; endDate?: number; limit: number; offset: number;
}): Promise<{ items: NormalizedLogItem[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  // Buscar integration_sync_logs
  const conditions1: SQL[] = [];
  if (input.tenantId) conditions1.push(eq(integrationSyncLogs.tenantId, input.tenantId));
  if (input.status === "success" || input.status === "error") conditions1.push(eq(integrationSyncLogs.status, input.status));
  if (input.startDate) conditions1.push(gte(integrationSyncLogs.createdAt, new Date(input.startDate)));
  if (input.endDate) conditions1.push(lte(integrationSyncLogs.createdAt, new Date(input.endDate)));
  const where1 = conditions1.length > 0 ? and(...conditions1) : undefined;

  // Buscar inventory_sync_logs
  const conditions2: SQL[] = [];
  if (input.tenantId) conditions2.push(eq(inventorySyncLogs.tenantId, input.tenantId));
  if (input.status === "success" || input.status === "error") conditions2.push(eq(inventorySyncLogs.status, input.status));
  if (input.startDate) conditions2.push(gte(inventorySyncLogs.createdAt, new Date(input.startDate)));
  if (input.endDate) conditions2.push(lte(inventorySyncLogs.createdAt, new Date(input.endDate)));
  const where2 = conditions2.length > 0 ? and(...conditions2) : undefined;

  const [intRows, [{ value: intTotal }], invRows, [{ value: invTotal }]] = await Promise.all([
    db.select({
      id: integrationSyncLogs.id,
      tenantId: integrationSyncLogs.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      integrationType: integrationSyncLogs.integrationType,
      status: integrationSyncLogs.status,
      summary: integrationSyncLogs.summary,
      details: integrationSyncLogs.details,
      errorMessage: integrationSyncLogs.errorMessage,
      duration: integrationSyncLogs.duration,
      triggeredBy: integrationSyncLogs.triggeredBy,
      createdAt: integrationSyncLogs.createdAt,
    })
      .from(integrationSyncLogs)
      .leftJoin(tenants, eq(tenants.id, integrationSyncLogs.tenantId))
      .where(where1)
      .orderBy(desc(integrationSyncLogs.createdAt))
      .limit(input.limit).offset(input.offset),
    db.select({ value: count() }).from(integrationSyncLogs).where(where1),
    db.select({
      id: inventorySyncLogs.id,
      tenantId: inventorySyncLogs.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      status: inventorySyncLogs.status,
      vehiclesFound: inventorySyncLogs.vehiclesFound,
      vehiclesAdded: inventorySyncLogs.vehiclesAdded,
      vehiclesUpdated: inventorySyncLogs.vehiclesUpdated,
      vehiclesRemoved: inventorySyncLogs.vehiclesRemoved,
      errorMessage: inventorySyncLogs.errorMessage,
      duration: inventorySyncLogs.duration,
      createdAt: inventorySyncLogs.createdAt,
    })
      .from(inventorySyncLogs)
      .leftJoin(tenants, eq(tenants.id, inventorySyncLogs.tenantId))
      .where(where2)
      .orderBy(desc(inventorySyncLogs.createdAt))
      .limit(input.limit).offset(input.offset),
    db.select({ value: count() }).from(inventorySyncLogs).where(where2),
  ]);

  const intItems: NormalizedLogItem[] = intRows.map((r) => ({
    id: r.id,
    logType: "integration" as const,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    tenantSlug: r.tenantSlug,
    title: r.integrationType.toUpperCase(),
    detail: r.summary || (r.errorMessage ? `Erro: ${r.errorMessage.substring(0, 80)}` : "—"),
    status: r.status,
    createdAt: r.createdAt,
  }));

  const invItems: NormalizedLogItem[] = invRows.map((r) => ({
    id: r.id + 1000000, // offset to avoid ID collision with integration logs
    logType: "integration" as const,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    tenantSlug: r.tenantSlug,
    title: "ESTOQUE",
    detail: `${r.vehiclesFound || 0} encontrado(s), ${r.vehiclesAdded || 0} novo(s), ${r.vehiclesUpdated || 0} atualizado(s), ${r.vehiclesRemoved || 0} removido(s)`,
    status: r.status,
    createdAt: r.createdAt,
  }));

  const merged = [...intItems, ...invItems]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, input.limit);

  return { items: merged, total: intTotal + invTotal };
}

/** Visão unificada do Super Admin sobre logs de e-mail, assinatura, alertas de
 * cobrança e integrações de todas as lojas — cada tipo continua guardado na tabela que faz sentido pra ele
 * (email_logs / subscription_events / billing_alerts / integration_sync_logs), esta camada só normaliza
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

    if (input.logType === "integration") {
      return listIntegrationLogs({ ...filters, limit: input.limit, offset: input.offset });
    }

    // "Todos": busca o suficiente de cada fonte pra cobrir a página pedida,
    // mescla por data e corta no limit — paginação exata entre três tabelas
    // diferentes exigiria um UNION SQL; pro volume de logs de uma plataforma
    // (não é big data), essa aproximação é suficiente e bem mais simples.
    const fetchSize = input.offset + input.limit;
    const [subs, emails, alerts, integrations] = await Promise.all([
      listSubscriptionLogs({ ...filters, limit: fetchSize, offset: 0 }),
      listEmailLogs({ ...filters, limit: fetchSize, offset: 0 }),
      listBillingAlertLogs({ ...filters, limit: fetchSize, offset: 0 }),
      listIntegrationLogs({ ...filters, limit: fetchSize, offset: 0 }),
    ]);

    const merged = [...subs.items, ...emails.items, ...alerts.items, ...integrations.items]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(input.offset, input.offset + input.limit);

    return { items: merged, total: subs.total + emails.total + alerts.total + integrations.total };
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

    if (input.logType === "integration") {
      // Check if it's an inventory log (id >= 1000000) or integration log
      if (input.id >= 1000000) {
        const realId = input.id - 1000000;
        const [row] = await db.select({ log: inventorySyncLogs, tenantName: tenants.name, tenantSlug: tenants.slug })
          .from(inventorySyncLogs)
          .leftJoin(tenants, eq(tenants.id, inventorySyncLogs.tenantId))
          .where(eq(inventorySyncLogs.id, realId))
          .limit(1);
        if (!row) return null;
        return {
          logType: "integration" as const,
          subType: "inventory" as const,
          id: input.id,
          tenantId: row.log.tenantId,
          tenantName: row.tenantName,
          tenantSlug: row.tenantSlug,
          integrationType: "estoque",
          status: row.log.status,
          summary: `${row.log.vehiclesFound || 0} encontrado(s), ${row.log.vehiclesAdded || 0} novo(s), ${row.log.vehiclesUpdated || 0} atualizado(s), ${row.log.vehiclesRemoved || 0} removido(s)`,
          details: JSON.stringify({ vehiclesFound: row.log.vehiclesFound, vehiclesAdded: row.log.vehiclesAdded, vehiclesUpdated: row.log.vehiclesUpdated, vehiclesRemoved: row.log.vehiclesRemoved }),
          errorMessage: row.log.errorMessage,
          duration: row.log.duration,
          triggeredBy: "auto",
          createdAt: row.log.createdAt,
        };
      } else {
        const [row] = await db.select({ log: integrationSyncLogs, tenantName: tenants.name, tenantSlug: tenants.slug })
          .from(integrationSyncLogs)
          .leftJoin(tenants, eq(tenants.id, integrationSyncLogs.tenantId))
          .where(eq(integrationSyncLogs.id, input.id))
          .limit(1);
        if (!row) return null;
        return {
          logType: "integration" as const,
          subType: "sync" as const,
          ...row.log,
          tenantName: row.tenantName,
          tenantSlug: row.tenantSlug,
        };
      }
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
