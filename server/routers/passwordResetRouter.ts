import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { passwordResetTokens, tenants } from "../../drizzle/schema";
import * as crmDb from "../crmDb";
import * as db from "../db";
import { sendPasswordResetEmail } from "../emailService";
import { getRequestOrigin } from "../_core/cookies";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutos

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Fluxo "esqueci minha senha" self-service, tenant-scoped: um único login serve
// admin/gerente/vendedor (mesmo princípio do tenantAuthRouter), então a busca
// tenta as três tabelas por e-mail, na mesma ordem de prioridade do login.
export const passwordResetRouter = router({
  requestReset: publicProcedure.input(z.object({
    email: z.string().email(),
  })).mutation(async ({ input, ctx }) => {
    if (!ctx.tenantSlug || ctx.tenantId <= 0) {
      throw new Error("Loja não encontrada. Acesse pelo link da sua loja.");
    }

    // Resposta genérica sempre — não revela se o e-mail existe ou não, pra não
    // dar pista de enumeração de contas pra quem estiver testando e-mails ao acaso.
    const genericResponse = { success: true };

    const dbConn = await getDb();
    if (!dbConn) return genericResponse;

    const email = input.email.trim();
    let match: { userType: "admin" | "manager" | "seller"; userId: number } | null = null;

    const admin = await crmDb.getAdminByEmail(email);
    if (admin && admin.active) {
      match = { userType: "admin", userId: admin.id };
    } else {
      const manager = await db.getManagerByEmail(email);
      if (manager && manager.active) {
        match = { userType: "manager", userId: manager.id };
      } else {
        const seller = await db.getSellerByEmail(email);
        if (seller && seller.active) {
          match = { userType: "seller", userId: seller.id };
        }
      }
    }

    if (!match) return genericResponse;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    await dbConn.insert(passwordResetTokens).values({
      tenantId: ctx.tenantId,
      userType: match.userType,
      userId: match.userId,
      tokenHash,
      expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
    });

    const [tenant] = await dbConn.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, ctx.tenantId)).limit(1);
    const resetUrl = `${getRequestOrigin(ctx.req)}/t/${ctx.tenantSlug}/redefinir-senha?token=${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl, tenant?.name || "Kafka Rank", ctx.tenantId);

    return genericResponse;
  }),

  confirmReset: publicProcedure.input(z.object({
    token: z.string().min(10),
    newPassword: z.string().min(4),
  })).mutation(async ({ input, ctx }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("DB indisponível");

    const tokenHash = hashToken(input.token);
    const now = Date.now();
    const [record] = await dbConn.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1);

    if (!record || record.usedAt || record.expiresAt < now || record.tenantId !== ctx.tenantId) {
      throw new Error("Link inválido ou expirado. Solicite um novo.");
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);

    if (record.userType === "admin") {
      await crmDb.updateAdmin(record.userId, { passwordHash });
    } else if (record.userType === "manager") {
      await db.updateManager(record.userId, { passwordHash });
    } else {
      await db.updateSeller(record.userId, { passwordHash });
    }

    await dbConn.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, record.id));

    return { success: true };
  }),
});
