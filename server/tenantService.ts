import { eq, ne, asc } from "drizzle-orm";
import { tenants } from "../drizzle/schema";
import { getDb } from "./db";

export type PublicTenantInfo = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  status: string;
};

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;

  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      status: tenants.status,
    })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant || tenant.status === "cancelled") return null;
  return tenant;
}

export type TenantLimits = {
  enabledModules: string[];
  maxSellers: number;
  maxAdmins: number;
  plan: string;
  status: string;
};

const tenantLimitsCache = new Map<number, { data: TenantLimits; expiresAt: number }>();
const LIMITS_CACHE_TTL = 60 * 1000;
let defaultTenantCache: { tenantId: number; expiresAt: number } | null = null;

/** Lê enabledModules/maxSellers/maxAdmins de um tenant, com cache curto (1min). */
export async function getTenantLimits(tenantId: number): Promise<TenantLimits | null> {
  const cached = tenantLimitsCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const db = await getDb();
  if (!db) return null;

  const [tenant] = await db
    .select({
      enabledModules: tenants.enabledModules,
      maxSellers: tenants.maxSellers,
      maxAdmins: tenants.maxAdmins,
      plan: tenants.plan,
      status: tenants.status,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) return null;

  let enabledModules: string[] = [];
  try {
    enabledModules = tenant.enabledModules ? JSON.parse(tenant.enabledModules) : [];
  } catch {
    enabledModules = [];
  }

  const data: TenantLimits = {
    enabledModules,
    maxSellers: tenant.maxSellers,
    maxAdmins: tenant.maxAdmins,
    plan: tenant.plan,
    status: tenant.status,
  };
  tenantLimitsCache.set(tenantId, { data, expiresAt: Date.now() + LIMITS_CACHE_TTL });
  return data;
}

export function clearTenantLimitsCache(tenantId?: number) {
  if (tenantId) tenantLimitsCache.delete(tenantId);
  else tenantLimitsCache.clear();
}

export async function getPublicTenantBySlug(slug: string): Promise<PublicTenantInfo | null> {
  const db = await getDb();
  if (!db) return null;

  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      logoUrl: tenants.logoUrl,
      primaryColor: tenants.primaryColor,
      secondaryColor: tenants.secondaryColor,
      status: tenants.status,
    })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant || tenant.status === "cancelled") return null;
  return tenant;
}

export async function getDefaultTenantId(): Promise<number> {
  if (defaultTenantCache && defaultTenantCache.expiresAt > Date.now()) {
    return defaultTenantCache.tenantId;
  }

  const db = await getDb();
  if (!db) return -1;

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(ne(tenants.status, "cancelled"))
    .orderBy(asc(tenants.id))
    .limit(1);

  const tenantId = tenant?.id ?? -1;
  defaultTenantCache = { tenantId, expiresAt: Date.now() + LIMITS_CACHE_TTL };
  return tenantId;
}
