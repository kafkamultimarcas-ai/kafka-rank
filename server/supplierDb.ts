import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { finSuppliers } from "../drizzle/schema";
import { getCurrentTenantId } from "./tenantDb";

export interface SupplierFilters {
  search?: string;
  personType?: "fisica" | "juridica";
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listSuppliers(filters: SupplierFilters = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  const tenantId = getCurrentTenantId();
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [eq(finSuppliers.tenantId, tenantId)];

  if (filters.personType) {
    conditions.push(eq(finSuppliers.personType, filters.personType));
  }
  if (filters.active !== undefined) {
    conditions.push(eq(finSuppliers.active, filters.active));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        like(finSuppliers.name, term),
        like(finSuppliers.cpfCnpj, term),
        like(finSuppliers.email, term),
        like(finSuppliers.phone, term),
        like(finSuppliers.mobile, term),
        like(finSuppliers.city, term),
      )
    );
  }

  const whereClause = and(...conditions);

  const [items, [countResult]] = await Promise.all([
    db.select().from(finSuppliers)
      .where(whereClause)
      .orderBy(desc(finSuppliers.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(finSuppliers).where(whereClause),
  ]);

  const total = Number(countResult?.count || 0);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(finSuppliers)
    .where(and(eq(finSuppliers.tenantId, getCurrentTenantId()), eq(finSuppliers.id, id)))
    .limit(1);
  return row || null;
}

export interface CreateSupplierInput {
  personType: "fisica" | "juridica";
  name: string;
  cpfCnpj?: string;
  rg?: string;
  nationality?: string;
  profession?: string;
  birthDate?: number;
  gender?: "masculino" | "feminino" | "outro";
  maritalStatus?: "solteiro" | "casado" | "divorciado" | "viuvo" | "outro";
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  notes?: string;
}

export async function createSupplier(input: CreateSupplierInput) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const tenantId = getCurrentTenantId();

  const [result] = await db.insert(finSuppliers).values({
    tenantId,
    personType: input.personType,
    name: input.name,
    cpfCnpj: input.cpfCnpj || null,
    rg: input.rg || null,
    nationality: input.nationality || null,
    profession: input.profession || null,
    birthDate: input.birthDate || null,
    gender: input.gender || null,
    maritalStatus: input.maritalStatus || null,
    cep: input.cep || null,
    state: input.state || null,
    city: input.city || null,
    neighborhood: input.neighborhood || null,
    street: input.street || null,
    number: input.number || null,
    complement: input.complement || null,
    email: input.email || null,
    phone: input.phone || null,
    mobile: input.mobile || null,
    notes: input.notes || null,
  });

  return { id: result.insertId };
}

export async function updateSupplier(id: number, input: Partial<CreateSupplierInput> & { active?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const tenantId = getCurrentTenantId();

  const updateData: any = {};
  if (input.personType !== undefined) updateData.personType = input.personType;
  if (input.name !== undefined) updateData.name = input.name;
  if (input.cpfCnpj !== undefined) updateData.cpfCnpj = input.cpfCnpj || null;
  if (input.rg !== undefined) updateData.rg = input.rg || null;
  if (input.nationality !== undefined) updateData.nationality = input.nationality || null;
  if (input.profession !== undefined) updateData.profession = input.profession || null;
  if (input.birthDate !== undefined) updateData.birthDate = input.birthDate || null;
  if (input.gender !== undefined) updateData.gender = input.gender || null;
  if (input.maritalStatus !== undefined) updateData.maritalStatus = input.maritalStatus || null;
  if (input.cep !== undefined) updateData.cep = input.cep || null;
  if (input.state !== undefined) updateData.state = input.state || null;
  if (input.city !== undefined) updateData.city = input.city || null;
  if (input.neighborhood !== undefined) updateData.neighborhood = input.neighborhood || null;
  if (input.street !== undefined) updateData.street = input.street || null;
  if (input.number !== undefined) updateData.number = input.number || null;
  if (input.complement !== undefined) updateData.complement = input.complement || null;
  if (input.email !== undefined) updateData.email = input.email || null;
  if (input.phone !== undefined) updateData.phone = input.phone || null;
  if (input.mobile !== undefined) updateData.mobile = input.mobile || null;
  if (input.notes !== undefined) updateData.notes = input.notes || null;
  if (input.active !== undefined) updateData.active = input.active;

  await db.update(finSuppliers).set(updateData)
    .where(and(eq(finSuppliers.tenantId, tenantId), eq(finSuppliers.id, id)));

  return { success: true };
}

export async function deleteSupplier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const tenantId = getCurrentTenantId();

  await db.delete(finSuppliers)
    .where(and(eq(finSuppliers.tenantId, tenantId), eq(finSuppliers.id, id)));

  return { success: true };
}
