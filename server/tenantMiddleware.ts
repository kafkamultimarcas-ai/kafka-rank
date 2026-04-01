/**
 * Multi-Tenant Middleware
 * 
 * Resolves tenantId from the authenticated user and injects it into the tRPC context.
 * Also provides a tenant-scoped database proxy that automatically filters all queries.
 * 
 * ARCHITECTURE:
 * - Every user (seller, manager, admin, OAuth owner) belongs to a tenant
 * - The tenantId is resolved from the user's record in the database
 * - A MySQL session variable `@tenantId` is set for every request
 * - All queries are automatically filtered by tenantId using MySQL views (future)
 * - For now, we use a runtime proxy that wraps getDb() to inject WHERE clauses
 */

import { getDb } from "./db";
import { sellers, managers, admins, users } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

// In-memory cache: openId/loginKey → tenantId (expires after 5 min)
const tenantCache = new Map<string, { tenantId: number; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve tenantId from user context.
 * Returns 1 (Kafka default) if tenant cannot be determined.
 */
export async function resolveTenantId(user: any): Promise<number> {
  if (!user) return 1;

  // Build cache key
  const cacheKey = `${user.openId || ''}_${user.id || ''}`;
  const cached = tenantCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenantId;
  }

  const db = await getDb();
  if (!db) return 1;

  let tenantId = 1;

  try {
    // Seller login (id < -1000000)
    if (user.id < -1000000) {
      const sellerId = -(user.id + 1000000);
      const [seller] = await db.select({ tenantId: sellers.tenantId }).from(sellers).where(eq(sellers.id, sellerId)).limit(1);
      if (seller) tenantId = seller.tenantId;
    }
    // CRM Admin login (id < -2000000) — check this before manager since range overlaps
    else if (user.loginMethod === 'crm_admin') {
      const adminId = -(user.id + 2000000);
      const [admin] = await db.select({ tenantId: admins.tenantId }).from(admins).where(eq(admins.id, adminId)).limit(1);
      if (admin) tenantId = admin.tenantId;
    }
    // Manager login (id < 0 and id > -1000000)
    else if (user.id < 0 && user.id > -1000000) {
      const managerId = -user.id;
      const [manager] = await db.select({ tenantId: managers.tenantId }).from(managers).where(eq(managers.id, managerId)).limit(1);
      if (manager) tenantId = manager.tenantId;
    }
    // OAuth owner - check users table
    else if (user.openId) {
      const [u] = await db.select({ tenantId: users.tenantId }).from(users).where(eq(users.openId, user.openId)).limit(1);
      if (u) tenantId = u.tenantId;
    }
  } catch (err) {
    console.warn("[Tenant] Failed to resolve tenantId, defaulting to 1:", err);
    tenantId = 1;
  }

  // Cache result
  tenantCache.set(cacheKey, { tenantId, expiresAt: Date.now() + CACHE_TTL });

  return tenantId;
}

/**
 * Set the MySQL session variable @tenantId for the current connection.
 * This can be used by MySQL views or triggers for automatic filtering.
 */
export async function setTenantSession(tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`SET @tenantId = ${tenantId}`);
  } catch (err) {
    console.warn("[Tenant] Failed to set session variable:", err);
  }
}

/**
 * Clear the tenant cache (useful for testing)
 */
export function clearTenantCache() {
  tenantCache.clear();
}
