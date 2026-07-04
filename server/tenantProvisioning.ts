import { eq } from "drizzle-orm";
import { getDb, withRetry } from "./db";
import { tenants, admins, crmPipelineStages, finCategories } from "../drizzle/schema";
import bcrypt from "bcryptjs";

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
  adminUsername: string;
  adminPassword: string;
  adminName: string;
};

export type ProvisionTenantResult = {
  tenantId: number;
  slug: string;
  adminId: number;
};

/**
 * Cria uma loja nova do zero: tenant, admin dono, estágios de pipeline padrão,
 * categorias financeiras padrão e a linha de config do Atendente IA. Usado tanto
 * pelo cadastro manual do Super Admin quanto pelo cadastro self-service público —
 * mantém as duas origens de tenant novo com exatamente o mesmo comportamento.
 */
export async function provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Revalida unicidade de slug no momento da escrita (defesa contra corrida além
  // de qualquer checagem prévia feita pelo chamador).
  const existing = await withRetry(() =>
    db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, input.slug)).limit(1)
  );
  if ((existing as any[]).length > 0) throw new Error("Slug já existe. Escolha outro.");

  const allModules = JSON.stringify(["ranking", "crm", "financeiro", "pos_venda", "consignacao", "mesa_credito", "marketing", "estoque", "iam", "treinamentos", "competicoes", "mata_mata"]);
  const trialEnds = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days trial

  const [result] = await withRetry(() =>
    db.insert(tenants).values({
      name: input.name,
      slug: input.slug,
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

  // Provisiona a linha de config do Atendente IA para esta loja (best-effort — a tabela
  // não é rastreada pelo Drizzle, então só garantimos a coluna tenantId; os demais campos
  // ficam com os defaults da tabela). Sem essa linha, a loja só herda os defaults do código
  // até salvar suas próprias configurações pela primeira vez.
  try {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`INSERT INTO crm_ai_global_config (tenantId) VALUES (${tenantId})`);
  } catch (err) {
    console.warn(`[Provisioning] Não foi possível pré-criar crm_ai_global_config para o tenant ${tenantId}:`, err);
  }

  const hash = await bcrypt.hash(input.adminPassword, 10);
  const [adminResult] = await withRetry(() =>
    db.insert(admins).values({
      username: input.adminUsername,
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
    await withRetry(() =>
      db.insert(crmPipelineStages).values({ ...stage, tenantId } as any)
    ).catch(() => {});
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
    await withRetry(() =>
      db.insert(finCategories).values({ ...cat, tenantId } as any)
    ).catch(() => {});
  }

  return { tenantId, slug: input.slug, adminId };
}

export type AvailabilityCheckParams = {
  slug?: string;
  adminUsername?: string;
  tenantId?: number;
};

export type AvailabilityCheckResult = {
  slug: { value: string; available: boolean } | null;
  adminUsername: { value: string; available: boolean } | null;
};

/** Checa disponibilidade de slug de loja e/ou username de admin, globalmente. */
export async function checkSlugAndUsernameAvailability(params: AvailabilityCheckParams): Promise<AvailabilityCheckResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedSlug = params.slug?.trim().toLowerCase();
  const normalizedAdminUsername = params.adminUsername?.trim().toLowerCase();

  let slugAvailable = true;
  let adminUsernameAvailable = true;

  if (normalizedSlug) {
    const slugRows = await withRetry(() =>
      db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, normalizedSlug)).limit(1)
    );
    slugAvailable = (slugRows as any[]).length === 0;
  }

  if (normalizedAdminUsername) {
    const adminRows = await withRetry(() =>
      db.select({ id: admins.id, tenantId: admins.tenantId })
        .from(admins)
        .where(eq(admins.username, normalizedAdminUsername))
        .limit(1)
    );

    const existingAdmin = (adminRows as any[])?.[0];
    adminUsernameAvailable = !existingAdmin || (params.tenantId !== undefined && existingAdmin.tenantId === params.tenantId);
  }

  return {
    slug: normalizedSlug ? { value: normalizedSlug, available: slugAvailable } : null,
    adminUsername: normalizedAdminUsername ? { value: normalizedAdminUsername, available: adminUsernameAvailable } : null,
  };
}
