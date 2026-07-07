import { eq, and } from "drizzle-orm";
import { getDb, withRetry } from "./db";
import { tenants, admins, crmPipelineStages, finCategories } from "../drizzle/schema";
import bcrypt from "bcryptjs";
import { assertGlobalUsernameAvailable, isGlobalUsernameAvailable, normalizeUsername } from "./usernamePolicy";
import { assertGlobalEmailAvailable, isGlobalEmailAvailable, normalizeEmail, isValidEmail } from "./emailPolicy";
import { TRIAL_PERIOD_DAYS } from "../shared/plans";

export type ProvisionTenantInput = {
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  address?: string;
  plan: "trial" | "basic" | "pro" | "enterprise";
  maxSellers: number;
  maxAdmins: number;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
};

export type ProvisionTenantResult = {
  tenantId: number;
  slug: string;
  adminId: number;
  adminEmail: string;
  adminUsername: string;
};

const slugRe = /^[a-z0-9-]+$/;

export function baseSlugFromName(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return normalized || "loja";
}

async function generateUniqueSlug(base: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const clean = base.trim().toLowerCase();
  const candidate = slugRe.test(clean) ? clean : baseSlugFromName(clean);
  for (let attempt = 0; attempt < 50; attempt++) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const slug = `${candidate}${suffix}`.slice(0, 50);
    const rows = await withRetry(() => db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1));
    if ((rows as any[]).length === 0) return slug;
  }
  throw new Error("Não foi possível gerar um slug único para a loja");
}

async function generateUniqueUsername(seed: string): Promise<string> {
  const base = normalizeUsername(seed).replace(/[^a-z0-9_.-]/g, "").slice(0, 60) || "user";
  for (let attempt = 0; attempt < 100; attempt++) {
    const suffix = attempt === 0 ? "" : `${attempt + 1}`;
    const candidate = `${base}${suffix}`.slice(0, 90);
    if (await isGlobalUsernameAvailable(candidate)) return candidate;
  }
  throw new Error("Não foi possível gerar um usuário único");
}

/**
 * Cria uma loja nova do zero: tenant, admin dono, estágios de pipeline padrão,
 * categorias financeiras padrão e a linha de config do Atendente IA. Usado tanto
 * pelo cadastro manual do Super Admin quanto pelo cadastro self-service público —
 * mantém as duas origens de tenant novo com exatamente o mesmo comportamento.
 */
export async function provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const adminEmail = await assertGlobalEmailAvailable(input.adminEmail);
  const slug = input.slug ? await generateUniqueSlug(input.slug) : await generateUniqueSlug(input.name);
  const adminUsername = await generateUniqueUsername(adminEmail.split("@")[0]);

  const allModules = JSON.stringify(["ranking", "crm", "financeiro", "pos_venda", "consignacao", "mesa_credito", "marketing", "estoque", "iam", "treinamentos", "competicoes", "mata_mata"]);
  const trialEnds = Date.now() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  const [result] = await withRetry(() =>
    db.insert(tenants).values({
      name: input.name,
      slug,
      phone: input.phone || "",
      email: input.email || "",
      city: input.city || "",
      state: input.state || "",
      address: input.address || "",
      plan: input.plan,
      maxSellers: input.maxSellers,
      maxAdmins: input.maxAdmins,
      enabledModules: allModules,
      status: input.plan === "trial" ? "trial" : "active",
      trialEndsAt: input.plan === "trial" ? trialEnds : null,
    })
  );

  const tenantId = (result as any).insertId;

  try {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`INSERT INTO crm_ai_global_config (tenantId) VALUES (${tenantId})`);
  } catch (err) {
    console.warn(`[Provisioning] Não foi possível pré-criar crm_ai_global_config para o tenant ${tenantId}:`, err);
  }

  const hash = await bcrypt.hash(input.adminPassword, 10);
  const [adminResult] = await withRetry(() =>
    db.insert(admins).values({
      username: adminUsername,
      email: adminEmail,
      passwordHash: hash,
      name: input.adminName,
      role: "owner",
      active: true,
      tenantId,
    })
  );
  const adminId = (adminResult as any).insertId;

  const defaultStages = [
    { department: "vendas", name: "Novo", displayOrder: 1, color: "#3B82F6", isDefault: true, isFinal: false },
    { department: "vendas", name: "Contato", displayOrder: 2, color: "#F59E0B", isDefault: false, isFinal: false },
    { department: "vendas", name: "Agendado", displayOrder: 3, color: "#8B5CF6", isDefault: false, isFinal: false },
    { department: "vendas", name: "Negociação", displayOrder: 4, color: "#EC4899", isDefault: false, isFinal: false },
    { department: "vendas", name: "Fechado", displayOrder: 5, color: "#10B981", isDefault: false, isFinal: true },
  ];
  for (const stage of defaultStages) {
    await withRetry(() => db.insert(crmPipelineStages).values({ ...stage, tenantId } as any)).catch(() => {});
  }

  const defaultCategories = [
    { name: "Aluguel", type: "expense" as const, color: "#EF4444" },
    { name: "Energia", type: "expense" as const, color: "#F59E0B" },
    { name: "Água", type: "expense" as const, color: "#3B82F6" },
    { name: "Internet", type: "expense" as const, color: "#8B5CF6" },
    { name: "Salários", type: "expense" as const, color: "#EC4899" },
    { name: "Comissões", type: "expense" as const, color: "#10B981" },
    { name: "Venda de Veículo", type: "income" as const, color: "#22C55E" },
    { name: "Financiamento", type: "income" as const, color: "#06B6D4" },
  ];
  for (const cat of defaultCategories) {
    await withRetry(() => db.insert(finCategories).values({ ...cat, tenantId } as any)).catch(() => {});
  }

  return { tenantId, slug, adminId, adminEmail, adminUsername };
}

export type AvailabilityCheckParams = {
  slug?: string;
  adminEmail?: string;
  tenantId?: number;
};

export type AvailabilityCheckResult = {
  slug: { value: string; available: boolean } | null;
  adminEmail: { value: string; available: boolean; reason?: string } | null;
};

/** Checa disponibilidade de slug de loja e/ou email de admin, globalmente. */
export async function checkSignupAvailability(params: AvailabilityCheckParams): Promise<AvailabilityCheckResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedSlug = params.slug?.trim().toLowerCase();
  const normalizedEmail = params.adminEmail ? normalizeEmail(params.adminEmail) : undefined;

  let slugAvailable = true;
  let emailAvailable = true;
  let emailReason: string | undefined;

  if (normalizedSlug) {
    const slugRows = await withRetry(() =>
      db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, normalizedSlug)).limit(1)
    );
    slugAvailable = (slugRows as any[]).length === 0;
  }

  if (normalizedEmail) {
    if (!isValidEmail(normalizedEmail)) {
      emailAvailable = false;
      emailReason = "invalid";
    } else {
      emailAvailable = await isGlobalEmailAvailable(normalizedEmail);
      if (!emailAvailable) emailReason = "in_use";
    }
  }

  return {
    slug: normalizedSlug ? { value: normalizedSlug, available: slugAvailable } : null,
    adminEmail: normalizedEmail ? { value: normalizedEmail, available: emailAvailable, reason: emailReason } : null,
  };
}
