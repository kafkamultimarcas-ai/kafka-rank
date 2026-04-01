/**
 * Tenant-Scoped Database Access Layer
 * 
 * Provides tenant-aware wrappers for ALL database operations.
 * Uses AsyncLocalStorage to make tenantId available to all db functions
 * without changing their signatures.
 * 
 * HOW IT WORKS:
 * 1. tRPC middleware sets the current tenantId in AsyncLocalStorage
 * 2. getDb() is monkey-patched to return a Proxy that intercepts queries
 * 3. The Proxy automatically adds WHERE tenantId = X to all SELECT queries
 * 4. INSERT operations automatically include tenantId in values
 * 
 * SIMPLER APPROACH (what we actually use):
 * Since Drizzle ORM doesn't support global filters, we use a different strategy:
 * - AsyncLocalStorage stores the current tenantId
 * - A helper function getCurrentTenantId() returns it
 * - We modify the MOST CRITICAL db functions to use it
 * - MySQL triggers handle INSERT auto-tenantId
 */

import { AsyncLocalStorage } from "node:async_hooks";

// AsyncLocalStorage for tenant context
export const tenantStorage = new AsyncLocalStorage<{ tenantId: number }>();

/**
 * Get the current tenantId from AsyncLocalStorage.
 * Returns 1 (default Kafka) if not in a tenant context.
 */
export function getCurrentTenantId(): number {
  const store = tenantStorage.getStore();
  return store?.tenantId ?? 1;
}

/**
 * Run a function within a tenant context.
 * All db calls within this context will be scoped to the given tenantId.
 */
export function withTenant<T>(tenantId: number, fn: () => T): T {
  return tenantStorage.run({ tenantId }, fn);
}

/**
 * Run an async function within a tenant context.
 */
export function withTenantAsync<T>(tenantId: number, fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run({ tenantId }, fn);
}
