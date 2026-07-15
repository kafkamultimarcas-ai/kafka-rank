import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { passwordResetTokens } from "../../drizzle/schema";
import * as crmDb from "../crmDb";
import * as db from "../db";
import { sendPasswordResetEmail } from "../emailService";
import { getRequestOrigin } from "../_core/cookies";
import { findIdentityByEmail, normalizeEmail } from "../emailPolicy";
import { withTenantAsync } from "../tenantDb";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const passwordResetRouter = router({
  requestReset: publicProcedure.input(z.object({
    email: z.string().email(),
  })).mutation(async ({ input, ctx }) => {
    const genericResponse = { success: true };

    const dbConn = await getDb();
    if (!dbConn) return genericResponse;

    const email = normalizeEmail(input.email);
    if (!email) return genericResponse;

    const identity = await findIdentityByEmail(email);
    if (!identity || !identity.active) return genericResponse;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    await dbConn.insert(passwordResetTokens).values({
      tenantId: identity.tenantId,
      userType: identity.userType,
      userId: identity.userId,
      tokenHash,
      expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
    });

    const resetUrl = `${getRequestOrigin(ctx.req)}/redefinir-senha?token=${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl, identity.tenantName || "Kafka Rank", identity.tenantId);

    return genericResponse;
  }),

  confirmReset: publicProcedure.input(z.object({
    token: z.string().min(10),
    newPassword: z.string().min(4),
  })).mutation(async ({ input }) => {
    const dbConn = await getDb();
    if (!dbConn) throw new Error("DB indisponível");

    const tokenHash = hashToken(input.token);
    const now = Date.now();
    const [record] = await dbConn.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1);

    if (!record || record.usedAt || record.expiresAt < now) {
      throw new Error("Link inválido ou expirado. Solicite um novo.");
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);

    await withTenantAsync(record.tenantId, async () => {
      if (record.userType === "admin") {
        await crmDb.updateAdmin(record.userId, { passwordHash });
      } else if (record.userType === "manager") {
        await db.updateManager(record.userId, { passwordHash });
      } else {
        await db.updateSeller(record.userId, { passwordHash });
      }
    });

    await dbConn.update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, record.id));

    return { success: true };
  }),
});
