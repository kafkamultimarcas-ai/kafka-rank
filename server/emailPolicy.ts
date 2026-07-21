import { eq } from "drizzle-orm";
import { admins, managers, sellers, superAdmins, tenants } from "../drizzle/schema";
import { getDb } from "./db";

export type EmailOwnerType = "admin" | "manager" | "seller" | "super_admin";

export type EmailOwner = {
  ownerType: EmailOwnerType;
  ownerId: number;
  tenantId: number | null;
  email: string;
};

type AvailabilityOptions = {
  allow?: Array<Pick<EmailOwner, "ownerType" | "ownerId">>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

function isAllowedOwner(owner: EmailOwner, allow: AvailabilityOptions["allow"]): boolean {
  return !!allow?.some((entry) => entry.ownerType === owner.ownerType && entry.ownerId === owner.ownerId);
}

export async function findGlobalEmailOwners(email: string): Promise<EmailOwner[]> {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [adminRows, managerRows, sellerRows, superAdminRows] = await Promise.all([
    db.select({ id: admins.id, email: admins.email, tenantId: admins.tenantId }).from(admins).where(eq(admins.email, normalized)).limit(5),
    db.select({ id: managers.id, email: managers.email, tenantId: managers.tenantId }).from(managers).where(eq(managers.email, normalized)).limit(5),
    db.select({ id: sellers.id, email: sellers.email, tenantId: sellers.tenantId }).from(sellers).where(eq(sellers.email, normalized)).limit(5),
    db.select({ id: superAdmins.id, email: superAdmins.email }).from(superAdmins).where(eq(superAdmins.email, normalized)).limit(5),
  ]);

  return [
    ...adminRows.map((row) => ({ ownerType: "admin" as const, ownerId: row.id, tenantId: row.tenantId, email: row.email })),
    ...managerRows.map((row) => ({ ownerType: "manager" as const, ownerId: row.id, tenantId: row.tenantId, email: row.email })),
    ...sellerRows.map((row) => ({ ownerType: "seller" as const, ownerId: row.id, tenantId: row.tenantId, email: row.email })),
    ...superAdminRows
      .filter((row): row is typeof row & { email: string } => typeof row.email === "string" && row.email.length > 0)
      .map((row) => ({ ownerType: "super_admin" as const, ownerId: row.id, tenantId: null, email: row.email })),
  ];
}

export async function isGlobalEmailAvailable(email: string, options?: AvailabilityOptions): Promise<boolean> {
  const owners = await findGlobalEmailOwners(email);
  return owners.every((owner) => isAllowedOwner(owner, options?.allow));
}

export async function assertGlobalEmailAvailable(email: string, options?: AvailabilityOptions): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error("E-mail inválido");
  }
  const available = await isGlobalEmailAvailable(normalized, options);
  if (!available) {
    throw new Error("Este e-mail já está em uso no sistema");
  }
  return normalized;
}

export type IdentityByEmail = {
  userType: "admin" | "manager" | "seller";
  userId: number;
  tenantId: number;
  tenantSlug: string;
  tenantName: string;
  passwordHash: string;
  active: boolean;
  name: string;
  role?: string;
  mustChangePassword?: boolean;
  department?: string;
  sellerRole?: string;
  email: string;
};

export async function findIdentityByEmail(email: string): Promise<IdentityByEmail | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const adminRows = await db.select({
    id: admins.id, email: admins.email, tenantId: admins.tenantId, passwordHash: admins.passwordHash,
    active: admins.active, name: admins.name, role: admins.role, mustChangePassword: admins.mustChangePassword,
  }).from(admins).where(eq(admins.email, normalized)).limit(1);
  if (adminRows.length > 0) {
    const a = adminRows[0];
    const tenant = await lookupTenantInfo(a.tenantId);
    if (!tenant) return null;
    return {
      userType: "admin", userId: a.id, tenantId: a.tenantId, tenantSlug: tenant.slug, tenantName: tenant.name,
      passwordHash: a.passwordHash, active: a.active, name: a.name, role: a.role,
      mustChangePassword: a.mustChangePassword, email: a.email,
    };
  }

  // Sellers checked FIRST since all managers have been migrated to sellers-gerente
  const sellerRows = await db.select({
    id: sellers.id, email: sellers.email, tenantId: sellers.tenantId, passwordHash: sellers.passwordHash,
    active: sellers.active, name: sellers.name, department: sellers.department, sellerRole: sellers.sellerRole,
  }).from(sellers).where(eq(sellers.email, normalized)).limit(1);
  if (sellerRows.length > 0) {
    const s = sellerRows[0];
    if (!s.passwordHash) return null;
    const tenant = await lookupTenantInfo(s.tenantId);
    if (!tenant) return null;
    return {
      userType: "seller", userId: s.id, tenantId: s.tenantId, tenantSlug: tenant.slug, tenantName: tenant.name,
      passwordHash: s.passwordHash, active: s.active, name: s.name, email: s.email,
      department: s.department || "vendas", sellerRole: s.sellerRole || "vendedor",
    };
  }

  // Legacy fallback: check managers table for any not-yet-migrated entries
  const managerRows = await db.select({
    id: managers.id, email: managers.email, tenantId: managers.tenantId, passwordHash: managers.passwordHash,
    active: managers.active, name: managers.name,
  }).from(managers).where(eq(managers.email, normalized)).limit(1);
  if (managerRows.length > 0) {
    const m = managerRows[0];
    const tenant = await lookupTenantInfo(m.tenantId);
    if (!tenant) return null;
    return {
      userType: "manager", userId: m.id, tenantId: m.tenantId, tenantSlug: tenant.slug, tenantName: tenant.name,
      passwordHash: m.passwordHash, active: m.active, name: m.name, email: m.email,
    };
  }

  return null;
}

async function lookupTenantInfo(tenantId: number): Promise<{ slug: string; name: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ slug: tenants.slug, name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return rows[0] ? { slug: rows[0].slug, name: rows[0].name } : null;
}
