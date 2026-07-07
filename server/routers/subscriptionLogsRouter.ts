import { z } from "zod";
import { eq, and, gte, lte, count, desc, type SQL } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { subscriptionEvents, tenants } from "../../drizzle/schema";
import { verifySuperToken } from "../superAdminAuth";

/** Visão do Super Admin sobre TODOS os eventos de assinatura de TODAS as lojas —
 * protegido pelo mesmo token de portal master usado em superAdminRouter.ts. */
export const subscriptionLogsRouter = router({
  list: publicProcedure.input(z.object({
    token: z.string(),
    tenantId: z.number().optional(),
    eventType: z.string().optional(),
    status: z.string().optional(),
    startDate: z.number().optional(),
    endDate: z.number().optional(),
    limit: z.number().min(1).max(100).default(30),
    offset: z.number().min(0).default(0),
  })).query(async ({ input }) => {
    const payload = verifySuperToken(input.token);
    if (!payload) throw new Error("Não autorizado");

    const db = await getDb();
    if (!db) return { items: [], total: 0 };

    const conditions: SQL[] = [];
    if (input.tenantId) conditions.push(eq(subscriptionEvents.tenantId, input.tenantId));
    if (input.eventType) conditions.push(eq(subscriptionEvents.eventType, input.eventType));
    if (input.status) conditions.push(eq(subscriptionEvents.status, input.status));
    if (input.startDate) conditions.push(gte(subscriptionEvents.createdAt, new Date(input.startDate)));
    if (input.endDate) conditions.push(lte(subscriptionEvents.createdAt, new Date(input.endDate)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      db.select({
        id: subscriptionEvents.id,
        tenantId: subscriptionEvents.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        eventType: subscriptionEvents.eventType,
        asaasPaymentId: subscriptionEvents.asaasPaymentId,
        status: subscriptionEvents.status,
        value: subscriptionEvents.value,
        billingType: subscriptionEvents.billingType,
        dueDate: subscriptionEvents.dueDate,
        paymentDate: subscriptionEvents.paymentDate,
        createdAt: subscriptionEvents.createdAt,
      })
        .from(subscriptionEvents)
        .leftJoin(tenants, eq(tenants.id, subscriptionEvents.tenantId))
        .where(where)
        .orderBy(desc(subscriptionEvents.createdAt))
        .limit(input.limit).offset(input.offset),
      db.select({ value: count() }).from(subscriptionEvents).where(where),
    ]);

    return { items, total };
  }),

  getById: publicProcedure.input(z.object({
    token: z.string(),
    id: z.number(),
  })).query(async ({ input }) => {
    const payload = verifySuperToken(input.token);
    if (!payload) throw new Error("Não autorizado");

    const db = await getDb();
    if (!db) return null;

    const [row] = await db.select({
      event: subscriptionEvents,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
      .from(subscriptionEvents)
      .leftJoin(tenants, eq(tenants.id, subscriptionEvents.tenantId))
      .where(eq(subscriptionEvents.id, input.id))
      .limit(1);

    if (!row) return null;
    return { ...row.event, tenantName: row.tenantName, tenantSlug: row.tenantSlug };
  }),
});
