import { eq } from "drizzle-orm";
import { sellers, tenants } from "../drizzle/schema";
import { getDb } from "./db";
import { getCurrentTenantId } from "./tenantDb";

const tenantSlugCache = new Map<number, { slug: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000;

export function buildTenantPathFromSlug(tenantSlug: string | null | undefined, pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!tenantSlug) return normalizedPath;
  if (normalizedPath === "/" || normalizedPath === "/404" || normalizedPath.startsWith("/super-admin")) {
    return normalizedPath;
  }
  if (normalizedPath.startsWith(`/t/${tenantSlug}/`) || normalizedPath === `/t/${tenantSlug}`) {
    return normalizedPath;
  }
  return `/t/${tenantSlug}${normalizedPath}`;
}

export async function getTenantSlugById(tenantId: number): Promise<string | null> {
  if (!tenantId || tenantId < 1) return null;

  const cached = tenantSlugCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.slug;
  }

  const db = await getDb();
  if (!db) return null;

  const [tenant] = await db
    .select({ slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const slug = tenant?.slug ?? null;
  tenantSlugCache.set(tenantId, { slug, expiresAt: Date.now() + CACHE_TTL_MS });
  return slug;
}

export async function getCurrentTenantSlug(): Promise<string | null> {
  return getTenantSlugById(getCurrentTenantId());
}

export async function buildCurrentTenantPath(pathname: string): Promise<string> {
  const tenantSlug = await getCurrentTenantSlug();
  return buildTenantPathFromSlug(tenantSlug, pathname);
}

export async function buildSellerTenantPath(sellerId: number, pathname?: string): Promise<string> {
  const db = await getDb();
  if (!db) {
    return pathname ?? `/minha-area/${sellerId}`;
  }

  const [seller] = await db
    .select({
      tenantId: sellers.tenantId,
      slug: tenants.slug,
    })
    .from(sellers)
    .innerJoin(tenants, eq(tenants.id, sellers.tenantId))
    .where(eq(sellers.id, sellerId))
    .limit(1);

  const targetPath = pathname ?? `/minha-area/${sellerId}`;
  return buildTenantPathFromSlug(seller?.slug ?? null, targetPath);
}
