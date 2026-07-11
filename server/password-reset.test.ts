import { describe, it, expect, vi, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { tenants, admins, managers, sellers, passwordResetTokens } from "../drizzle/schema";

const sentEmails: { email: string; resetUrl: string }[] = [];
vi.mock("./emailService", () => ({
  sendPasswordResetEmail: vi.fn(async (email: string, resetUrl: string) => {
    sentEmails.push({ email, resetUrl });
    return true;
  }),
}));

function createPublicContext(tenantId: number, tenantSlug: string): TrpcContext {
  return {
    user: null as any,
    tenantId,
    tenantSlug,
    req: {
      protocol: "https", headers: {},
      get: (name: string) => (name.toLowerCase() === "host" ? "loja.kafkarank.com" : undefined),
    } as any,
    res: { clearCookie: () => {}, cookie: () => {} } as any,
  };
}

const createdTenantIds: number[] = [];

async function createTenant() {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");
  const [result] = await db.insert(tenants).values({
    name: "Loja Teste Reset",
    slug: `teste-reset-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    plan: "trial", status: "trial",
  } as any);
  const tenantId = (result as any).insertId;
  createdTenantIds.push(tenantId);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  return { tenantId, slug: tenant.slug };
}

function extractToken(resetUrl: string): string {
  return new URL(resetUrl).searchParams.get("token")!;
}

afterEach(async () => {
  sentEmails.length = 0;
  const db = await getDb();
  while (createdTenantIds.length > 0) {
    const id = createdTenantIds.pop()!;
    if (!db) continue;
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tenantId, id));
    await db.delete(admins).where(eq(admins.tenantId, id));
    await db.delete(managers).where(eq(managers.tenantId, id));
    await db.delete(sellers).where(eq(sellers.tenantId, id));
    await db.delete(tenants).where(eq(tenants.id, id));
  }
});

describe("passwordReset - fluxo admin", () => {
  it("pede reset, recebe link por e-mail e redefine a senha", async () => {
    const { tenantId, slug } = await createTenant();
    const email = `admin${Date.now()}@teste.com`;
    const db = await getDb();
    await db!.insert(admins).values({
      tenantId, username: "admin-teste", passwordHash: await bcrypt.hash("SenhaAntiga123", 10),
      name: "Admin Teste", email, role: "owner",
    } as any);

    const caller = appRouter.createCaller(createPublicContext(tenantId, slug));
    await caller.passwordReset.requestReset({ email });

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].email).toBe(email);

    const token = extractToken(sentEmails[0].resetUrl);
    expect(token).toBeTruthy();

    await caller.passwordReset.confirmReset({ token, newPassword: "SenhaNova456" });

    const [admin] = await db!.select().from(admins).where(eq(admins.tenantId, tenantId));
    expect(await bcrypt.compare("SenhaNova456", admin.passwordHash)).toBe(true);
  });

  it("não revela se o e-mail não existe (resposta genérica, sem enviar e-mail)", async () => {
    const { tenantId, slug } = await createTenant();
    const caller = appRouter.createCaller(createPublicContext(tenantId, slug));

    const result = await caller.passwordReset.requestReset({ email: "naoexiste@teste.com" });
    expect(result.success).toBe(true);
    expect(sentEmails).toHaveLength(0);
  });

  it("token não pode ser reutilizado", async () => {
    const { tenantId, slug } = await createTenant();
    const email = `admin${Date.now()}@teste.com`;
    const db = await getDb();
    await db!.insert(admins).values({
      tenantId, username: "admin-teste", passwordHash: await bcrypt.hash("SenhaAntiga123", 10),
      name: "Admin Teste", email, role: "owner",
    } as any);

    const caller = appRouter.createCaller(createPublicContext(tenantId, slug));
    await caller.passwordReset.requestReset({ email });
    const token = extractToken(sentEmails[0].resetUrl);

    await caller.passwordReset.confirmReset({ token, newPassword: "SenhaNova456" });
    await expect(
      caller.passwordReset.confirmReset({ token, newPassword: "OutraSenha789" })
    ).rejects.toThrow("Link inválido ou expirado");
  });

  it("token expirado é rejeitado", async () => {
    const { tenantId, slug } = await createTenant();
    const email = `admin${Date.now()}@teste.com`;
    const db = await getDb();
    await db!.insert(admins).values({
      tenantId, username: "admin-teste", passwordHash: await bcrypt.hash("SenhaAntiga123", 10),
      name: "Admin Teste", email, role: "owner",
    } as any);

    const caller = appRouter.createCaller(createPublicContext(tenantId, slug));
    await caller.passwordReset.requestReset({ email });
    const token = extractToken(sentEmails[0].resetUrl);

    await db!.update(passwordResetTokens).set({ expiresAt: Date.now() - 1000 }).where(eq(passwordResetTokens.tenantId, tenantId));

    await expect(
      caller.passwordReset.confirmReset({ token, newPassword: "SenhaNova456" })
    ).rejects.toThrow("Link inválido ou expirado");
  });

  it("token gerado numa loja não funciona confirmando em outra (isolamento de tenant)", async () => {
    const { tenantId: tenantA, slug: slugA } = await createTenant();
    const { tenantId: tenantB, slug: slugB } = await createTenant();
    const emailA = `adminA${Date.now()}@teste.com`;
    const db = await getDb();
    await db!.insert(admins).values({
      tenantId: tenantA, username: "admin-a", passwordHash: await bcrypt.hash("SenhaAntiga123", 10),
      name: "Admin A", email: emailA, role: "owner",
    } as any);

    const callerA = appRouter.createCaller(createPublicContext(tenantA, slugA));
    await callerA.passwordReset.requestReset({ email: emailA });
    const token = extractToken(sentEmails[0].resetUrl);

    const callerB = appRouter.createCaller(createPublicContext(tenantB, slugB));
    await expect(
      callerB.passwordReset.confirmReset({ token, newPassword: "SenhaNova456" })
    ).rejects.toThrow("Link inválido ou expirado");
  });
});

describe("passwordReset - fluxo vendedor", () => {
  it("também funciona pra vendedor com e-mail cadastrado", async () => {
    const { tenantId, slug } = await createTenant();
    const email = `vendedor${Date.now()}@teste.com`;
    const db = await getDb();
    await db!.insert(sellers).values({
      tenantId, username: "vendedor-teste", passwordHash: await bcrypt.hash("SenhaAntiga123", 10),
      name: "Vendedor Teste", email, active: true,
    } as any);

    const caller = appRouter.createCaller(createPublicContext(tenantId, slug));
    await caller.passwordReset.requestReset({ email });
    const token = extractToken(sentEmails[0].resetUrl);

    await caller.passwordReset.confirmReset({ token, newPassword: "SenhaNova456" });

    const [seller] = await db!.select().from(sellers).where(eq(sellers.tenantId, tenantId));
    expect(await bcrypt.compare("SenhaNova456", seller.passwordHash!)).toBe(true);
  });
});
