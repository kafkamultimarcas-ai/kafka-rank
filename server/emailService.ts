import { Resend } from "resend";
import { getDb } from "./db";
import { emailVerificationCodes } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";

// Resend API - uses env var RESEND_API_KEY
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not configured - codes stored but not emailed");
    return null;
  }
  return new Resend(apiKey);
}

// Generate 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create and store verification code
export async function createVerificationCode(email: string, purpose: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Invalidate old codes for this email/purpose
  await db.update(emailVerificationCodes)
    .set({ used: true })
    .where(
      and(
        eq(emailVerificationCodes.email, email.toLowerCase()),
        eq(emailVerificationCodes.purpose, purpose),
        eq(emailVerificationCodes.used, false)
      )
    );

  // Insert new code
  await db.insert(emailVerificationCodes).values({
    email: email.toLowerCase(),
    code,
    purpose,
    expiresAt,
    used: false,
  });

  return code;
}

// Send verification email via Resend
export async function sendVerificationEmail(email: string, code: string, purpose: string): Promise<boolean> {
  const resend = getResend();

  if (!resend) {
    console.log(`[Email] Code for ${email}: ${code} (Resend not configured)`);
    return true; // Code is stored in DB, just not emailed
  }

  const subjectMap: Record<string, string> = {
    login: "🔐 Código de Verificação - Kafka Rank",
    register: "📋 Confirme seu Cadastro - Kafka Rank",
    reset_password: "🔑 Redefinir Senha - Kafka Rank",
  };

  const subject = subjectMap[purpose] || "Código de Verificação - Kafka Rank";

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0f; border-radius: 16px; overflow: hidden; border: 1px solid #1a1a2e;">
      <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 30px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 28px; letter-spacing: 2px; font-weight: 800;">KAFKA RANK</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 13px;">Sistema de Gestão Automotiva</p>
      </div>
      <div style="padding: 40px 30px; text-align: center;">
        <p style="color: #a0a0b0; font-size: 15px; margin: 0 0 8px;">Seu código de verificação é:</p>
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border: 2px solid #dc2626; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #fff; font-family: 'Courier New', monospace;">${code}</span>
        </div>
        <p style="color: #666; font-size: 13px; margin: 20px 0 0;">Este código expira em <strong style="color: #dc2626;">10 minutos</strong>.</p>
        <p style="color: #555; font-size: 12px; margin: 8px 0 0;">Se você não solicitou este código, ignore este email.</p>
      </div>
      <div style="background: #0d0d15; padding: 15px; text-align: center; border-top: 1px solid #1a1a2e;">
        <p style="color: #444; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Kafka Rank - Todos os direitos reservados</p>
      </div>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: "Kafka Rank <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    if (error) {
      console.error(`[Email] Resend error for ${email}:`, error);
      return false;
    }

    console.log(`[Email] Verification code sent to ${email}`);
    return true;
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${email}:`, err.message);
    return false;
  }
}

// Verify code
export async function verifyCode(email: string, code: string, purpose: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = Date.now();

  const results = await db.select()
    .from(emailVerificationCodes)
    .where(
      and(
        eq(emailVerificationCodes.email, email.toLowerCase()),
        eq(emailVerificationCodes.code, code),
        eq(emailVerificationCodes.purpose, purpose),
        eq(emailVerificationCodes.used, false),
        gt(emailVerificationCodes.expiresAt, now)
      )
    )
    .limit(1);

  if (results.length === 0) return false;

  // Mark as used
  await db.update(emailVerificationCodes)
    .set({ used: true })
    .where(eq(emailVerificationCodes.id, results[0].id));

  return true;
}

// Create and send verification code in one call
export async function sendOTP(email: string, purpose: string): Promise<boolean> {
  const code = await createVerificationCode(email, purpose);
  return sendVerificationEmail(email, code, purpose);
}
