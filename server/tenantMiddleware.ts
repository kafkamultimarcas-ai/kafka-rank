/**
 * Multi-Tenant Middleware
 *
 * Resolves tenant context from the request boundary first and falls back to the
 * authenticated user only when no explicit tenant slug is available.
 */

import { eq, sql } from "drizzle-orm";
import { admins, managers, sellers, users } from "../drizzle/schema";
import { getDb } from "./db";
import { getDefaultTenantId, getTenantBySlug } from "./tenantService";
import type { AuthActor } from "./_core/context";

const tenantCache = new Map<string, { tenantId: number; expiresAt: number }>();
const tenantSlugCache = new Map<string, { tenantId: number; slug: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export type TenantResolutionSource = "slug_header" | "path" | "referer" | "user" | "default";

export type TenantResolution = {
  tenantId: number;
  tenantSlug: string | null;
  source: TenantResolutionSource;
};

export function extractTenantSlugFromPathname(pathname: string | undefined | null): string | null {
  if (!pathname) return null;

  const appMatch = pathname.match(/^\/t\/([a-z0-9-]+)(?:\/|$)/i);
  if (appMatch?.[1]) {
    return appMatch[1].toLowerCase();
  }

  const apiMatch = pathname.match(/^\/api\/t\/([a-z0-9-]+)(?:\/|$)/i);
  if (apiMatch?.[1]) {
    return apiMatch[1].toLowerCase();
  }

  return null;
}

export function extractTenantSlugFromRequest(req: {
  headers?: Record<string, unknown>;
  originalUrl?: string;
  url?: string;
}): string | null {
  const rawHeader = req.headers?.["x-tenant-slug"];
  const headerSlug = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (typeof headerSlug === "string" && headerSlug.trim()) {
    return headerSlug.trim().toLowerCase();
  }

  const pathnameSlug = extractTenantSlugFromPathname(req.originalUrl || req.url);
  if (pathnameSlug) return pathnameSlug;

  const rawReferer = req.headers?.referer;
  const referer = Array.isArray(rawReferer) ? rawReferer[0] : rawReferer;
  if (typeof referer === "string" && referer.trim()) {
    try {
      return extractTenantSlugFromPathname(new URL(referer).pathname);
    } catch {
      return extractTenantSlugFromPathname(referer);
    }
  }

  return null;
}

async function resolveTenantBySlugCached(slug: string): Promise<{ tenantId: number; slug: string } | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  const cached = tenantSlugCache.get(normalizedSlug);
  if (cached && cached.expiresAt > Date.now()) {
    return { tenantId: cached.tenantId, slug: cached.slug };
  }

  const tenant = await getTenantBySlug(normalizedSlug);
  if (!tenant) return null;

  const resolved = { tenantId: tenant.id, slug: tenant.slug };
  tenantSlugCache.set(normalizedSlug, { ...resolved, expiresAt: Date.now() + CACHE_TTL });
  return resolved;
}

/**
 * Resolve tenantId from user context.
 * Falls back to the first active tenant only for legacy routes without slug.
 */
export async function resolveTenantId(user: AuthActor | null): Promise<number> {
  if (!user) return getDefaultTenantId();

  const cacheKey = `${user.openId || ""}_${user.id || ""}`;
  const cached = tenantCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tenantId;
  }

  const db = await getDb();
  if (!db) return getDefaultTenantId();

  let tenantId = await getDefaultTenantId();

  try {
    if (user.actorType === "seller") {
      const [seller] = await db
        .select({ tenantId: sellers.tenantId })
        .from(sellers)
        .where(eq(sellers.id, user.id))
        .limit(1);
      if (seller) tenantId = seller.tenantId;
    } else if (user.actorType === "crm_admin") {
      const [admin] = await db
        .select({ tenantId: admins.tenantId })
        .from(admins)
        .where(eq(admins.id, user.id))
        .limit(1);
      if (admin) tenantId = admin.tenantId;
    } else if (user.actorType === "manager") {
      const [manager] = await db
        .select({ tenantId: managers.tenantId })
        .from(managers)
        .where(eq(managers.id, user.id))
        .limit(1);
      if (manager) tenantId = manager.tenantId;
    } else if (user.actorType === "oauth" && user.openId) {
      const [oauthUser] = await db
        .select({ tenantId: users.tenantId })
        .from(users)
        .where(eq(users.openId, user.openId))
        .limit(1);
      if (oauthUser) tenantId = oauthUser.tenantId;
    }
  } catch (err) {
    console.warn("[Tenant] Failed to resolve tenantId, using legacy fallback tenant:", err);
    tenantId = await getDefaultTenantId();
  }

  tenantCache.set(cacheKey, { tenantId, expiresAt: Date.now() + CACHE_TTL });
  return tenantId;
}

export async function resolveTenantContext(
  req: { headers?: Record<string, unknown>; originalUrl?: string; url?: string },
  user: AuthActor | null
): Promise<TenantResolution> {
  const requestedSlug = extractTenantSlugFromRequest(req);
  if (requestedSlug) {
    const tenant = await resolveTenantBySlugCached(requestedSlug);
    if (tenant) {
      const source: TenantResolutionSource = req.headers?.["x-tenant-slug"]
        ? "slug_header"
        : extractTenantSlugFromPathname(req.originalUrl || req.url)
          ? "path"
          : "referer";

      return {
        tenantId: tenant.tenantId,
        tenantSlug: tenant.slug,
        source,
      };
    }

    const source: TenantResolutionSource = req.headers?.["x-tenant-slug"]
      ? "slug_header"
      : extractTenantSlugFromPathname(req.originalUrl || req.url)
        ? "path"
        : "referer";

    return {
      tenantId: -1,
      tenantSlug: requestedSlug,
      source,
    };
  }

  if (user) {
    return {
      tenantId: await resolveTenantId(user),
      tenantSlug: null,
      source: "user",
    };
  }

  return {
    tenantId: await getDefaultTenantId(),
    tenantSlug: null,
    source: "default",
  };
}

export async function setTenantSession(tenantId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`SET @tenantId = ${tenantId}`);
  } catch (err) {
    console.warn("[Tenant] Failed to set session variable:", err);
  }
}

export function clearTenantCache() {
  tenantCache.clear();
  tenantSlugCache.clear();
}

/**
 * Valida se o tenantId embutido em um token/sessão bate com o tenant resolvido
 * para a request atual (via URL/slug). Tokens legados sem tenantId (emitidos antes
 * dessa checagem existir) são tolerados até expirarem naturalmente.
 */
export function assertTenantMatch(tokenTenantId: number | null | undefined, requestTenantId: number): boolean {
  if (tokenTenantId === null || tokenTenantId === undefined) return true;
  return tokenTenantId === requestTenantId;
}
