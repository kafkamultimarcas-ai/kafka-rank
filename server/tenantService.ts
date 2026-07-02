import { eq } from "drizzle-orm";
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
