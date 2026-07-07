import { eq } from "drizzle-orm";
import { admins, managers, sellers, superAdmins } from "../drizzle/schema";
import { getDb } from "./db";

export type UsernameOwnerType = "seller" | "manager" | "admin" | "super_admin";

export type UsernameOwner = {
  ownerType: UsernameOwnerType;
  ownerId: number;
  tenantId: number | null;
  username: string;
};

type AvailabilityOptions = {
  allow?: Array<Pick<UsernameOwner, "ownerType" | "ownerId">>;
};

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function isAllowedOwner(owner: UsernameOwner, allow: AvailabilityOptions["allow"]): boolean {
  return !!allow?.some((entry) => entry.ownerType === owner.ownerType && entry.ownerId === owner.ownerId);
}

export async function findGlobalUsernameOwners(username: string): Promise<UsernameOwner[]> {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) return [];

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [adminRows, managerRows, sellerRows, superAdminRows] = await Promise.all([
    db.select({ id: admins.id, username: admins.username, tenantId: admins.tenantId }).from(admins).where(eq(admins.username, normalizedUsername)).limit(10),
    db.select({ id: managers.id, username: managers.username, tenantId: managers.tenantId }).from(managers).where(eq(managers.username, normalizedUsername)).limit(10),
    db.select({ id: sellers.id, username: sellers.username, tenantId: sellers.tenantId }).from(sellers).where(eq(sellers.username, normalizedUsername)).limit(10),
    db.select({ id: superAdmins.id, username: superAdmins.username }).from(superAdmins).where(eq(superAdmins.username, normalizedUsername)).limit(10),
  ]);

  return [
    ...adminRows.map((row) => ({ ownerType: "admin" as const, ownerId: row.id, tenantId: row.tenantId, username: row.username })),
    ...managerRows.map((row) => ({ ownerType: "manager" as const, ownerId: row.id, tenantId: row.tenantId, username: row.username })),
    ...sellerRows
      .filter((row): row is typeof row & { username: string } => typeof row.username === "string")
      .map((row) => ({ ownerType: "seller" as const, ownerId: row.id, tenantId: row.tenantId, username: row.username })),
    ...superAdminRows.map((row) => ({ ownerType: "super_admin" as const, ownerId: row.id, tenantId: null, username: row.username })),
  ];
}

export async function isGlobalUsernameAvailable(username: string, options?: AvailabilityOptions): Promise<boolean> {
  const owners = await findGlobalUsernameOwners(username);
  return owners.every((owner) => isAllowedOwner(owner, options?.allow));
}

export async function assertGlobalUsernameAvailable(username: string, options?: AvailabilityOptions): Promise<string> {
  const normalizedUsername = normalizeUsername(username);
  const available = await isGlobalUsernameAvailable(normalizedUsername, options);

  if (!available) {
    throw new Error("Este nome de usuário já está em uso no sistema");
  }

  return normalizedUsername;
}
