import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { inventoryVehicles, inventorySyncLogs, tenants } from "../../drizzle/schema";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import { syncInventory } from "../inventory-scraper";
import { getCurrentTenantId } from "../tenantDb";

export const inventoryRouter = router({
  // List all vehicles with optional filters
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(["available", "reserved", "sold", "all"]).optional(),
        search: z.string().optional(),
        brand: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        minYear: z.number().optional(),
        maxYear: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [eq(inventoryVehicles.tenantId, getCurrentTenantId())];

      if (input?.status && input.status !== "all") {
        conditions.push(eq(inventoryVehicles.status, input.status as any));
      }

      if (input?.brand) {
        conditions.push(eq(inventoryVehicles.brand, input.brand));
      }

      if (input?.search) {
        const s = `%${input.search}%`;
        conditions.push(
          or(
            like(inventoryVehicles.brand, s),
            like(inventoryVehicles.model, s),
            like(inventoryVehicles.version, s),
            like(inventoryVehicles.color, s)
          )
        );
      }

      if (input?.minPrice) {
        conditions.push(sql`${inventoryVehicles.price} >= ${input.minPrice}`);
      }
      if (input?.maxPrice) {
        conditions.push(sql`${inventoryVehicles.price} <= ${input.maxPrice}`);
      }
      if (input?.minYear) {
        conditions.push(sql`${inventoryVehicles.year} >= ${input.minYear}`);
      }
      if (input?.maxYear) {
        conditions.push(sql`${inventoryVehicles.year} <= ${input.maxYear}`);
      }

      return db.select().from(inventoryVehicles).where(and(...conditions)).orderBy(desc(inventoryVehicles.createdAt));
    }),

  // Get a single vehicle by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(inventoryVehicles)
        .where(and(eq(inventoryVehicles.id, input.id), eq(inventoryVehicles.tenantId, getCurrentTenantId())))
        .limit(1);
      return result[0] || null;
    }),

  // Get available brands for filter
  brands: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db
      .select({ brand: inventoryVehicles.brand, count: sql<number>`count(*)` })
      .from(inventoryVehicles)
      .where(and(eq(inventoryVehicles.status, "available"), eq(inventoryVehicles.tenantId, getCurrentTenantId())))
      .groupBy(inventoryVehicles.brand)
      .orderBy(desc(sql`count(*)`));
    return result;
  }),

  // Get inventory stats
  stats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, available: 0, reserved: 0, sold: 0, avgPrice: 0 };
    const all = await db
      .select({
        status: inventoryVehicles.status,
        count: sql<number>`count(*)`,
        avgPrice: sql<number>`AVG(${inventoryVehicles.price})`,
      })
      .from(inventoryVehicles)
      .where(eq(inventoryVehicles.tenantId, getCurrentTenantId()))
      .groupBy(inventoryVehicles.status);

    const stats = { total: 0, available: 0, reserved: 0, sold: 0, avgPrice: 0 };
    let totalPrice = 0;
    for (const row of all) {
      const count = Number(row.count);
      stats.total += count;
      if (row.status === "available") { stats.available = count; totalPrice = Number(row.avgPrice) * count; }
      if (row.status === "reserved") stats.reserved = count;
      if (row.status === "sold") stats.sold = count;
    }
    stats.avgPrice = stats.available > 0 ? Math.round(totalPrice / stats.available) : 0;
    return stats;
  }),

  // Admin: trigger manual sync
  sync: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    const tenantId = getCurrentTenantId();
    const [tenant] = await db.select({ inventoryUrl: tenants.inventoryUrl }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant?.inventoryUrl) throw new Error("URL de estoque não configurada para esta loja");
    const result = await syncInventory(tenantId, tenant.inventoryUrl);
    return result;
  }),

  // Admin: get sync logs
  syncLogs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(inventorySyncLogs)
      .where(eq(inventorySyncLogs.tenantId, getCurrentTenantId()))
      .orderBy(desc(inventorySyncLogs.createdAt)).limit(20);
  }),

  // Admin: mark vehicle as reserved
  reserve: adminProcedure
    .input(z.object({ id: z.number(), sellerId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const [result] = await db.update(inventoryVehicles).set({ status: "reserved" })
        .where(and(eq(inventoryVehicles.id, input.id), eq(inventoryVehicles.tenantId, getCurrentTenantId())));
      if ((result as any)?.affectedRows === 0) throw new Error("Veículo não encontrado");
      return { success: true };
    }),

  // Admin: mark vehicle as sold
  markSold: adminProcedure
    .input(z.object({ id: z.number(), sellerId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const [result] = await db.update(inventoryVehicles).set({
        status: "sold",
        soldBySellerId: input.sellerId,
        soldAt: Date.now(),
      }).where(and(eq(inventoryVehicles.id, input.id), eq(inventoryVehicles.tenantId, getCurrentTenantId())));
      if ((result as any)?.affectedRows === 0) throw new Error("Veículo não encontrado");
      return { success: true };
    }),

  // Admin: mark vehicle as available again
  markAvailable: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const [result] = await db.update(inventoryVehicles).set({
        status: "available",
        soldBySellerId: null,
        soldAt: null,
      }).where(and(eq(inventoryVehicles.id, input.id), eq(inventoryVehicles.tenantId, getCurrentTenantId())));
      if ((result as any)?.affectedRows === 0) throw new Error("Veículo não encontrado");
      return { success: true };
    }),

  // Proxy para baixar foto de domínio externo (evita CORS)
  proxyPhoto: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      const response = await fetch(input.url);
      if (!response.ok) throw new Error("Failed to fetch image");
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";
      return { data: base64, contentType };
    }),
});
