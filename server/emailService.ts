import { Resend } from "resend";
import { getDb } from "./db";
import { emailVerificationCodes, emailLogs } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";

export type EmailType =
  | "otp_login"
  | "otp_register"
  | "otp_reset_password"
  | "password_reset_link"
  | "signup_welcome"
  | "subscription_confirmed"
  | "subscription_suspended"
  | "trial_ending"
  | "user_welcome"
  | "plan_changed"
  | "billing_critical_alert";

// Resend API - uses env var RESEND_API_KEY
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY not configured - codes stored but not emailed");
    return null;
  }
  return new Resend(apiKey);
}

async function logEmail(entry: {
  tenantId?: number | null;
  emailType: EmailType;
  toEmail: string;
  subject: string;
  status: "sent" | "failed";
  providerId?: string | null;
  errorMessage?: string | null;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(emailLogs).values({
      tenantId: entry.tenantId ?? null,
      emailType: entry.emailType,
      toEmail: entry.toEmail,
      subject: entry.subject,
      status: entry.status,
      providerId: entry.providerId ?? null,
      errorMessage: entry.errorMessage ?? null,
    });
  } catch (err: any) {
    // Log de e-mail não pode derrubar o fluxo principal (login, checkout etc.).
    console.error("[Email] Falha ao gravar email_logs:", err.message);
  }
}

// Wrapper único que centraliza envio via Resend + gravação em email_logs — todo
// e-mail transacional da plataforma passa por aqui, inclusive quando o Resend
// não está configurado (log fica com status "sent" e o conteúdo vai só pro
// console, mesmo comportamento de sempre em dev).
async function dispatchEmail(input: {
  to: string;
  subject: string;
  html: string;
  emailType: EmailType;
  tenantId?: number | null;
  fallbackLog?: string;
}): Promise<boolean> {
  const resend = getResend();

  if (!resend) {
    console.log(`[Email] ${input.emailType} para ${input.to}${input.fallbackLog ? `: ${input.fallbackLog}` : ""} (Resend não configurado)`);
    await logEmail({ tenantId: input.tenantId, emailType: input.emailType, toEmail: input.to, subject: input.subject, status: "sent" });
    return true;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Kafka Rank <onboarding@resend.dev>",
      to: [input.to],
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      console.error(`[Email] Resend error para ${input.to}:`, error);
      await logEmail({ tenantId: input.tenantId, emailType: input.emailType, toEmail: input.to, subject: input.subject, status: "failed", errorMessage: error.message });
      return false;
    }

    await logEmail({ tenantId: input.tenantId, emailType: input.emailType, toEmail: input.to, subject: input.subject, status: "sent", providerId: data?.id });
    return true;
  } catch (err: any) {
    console.error(`[Email] Falha ao enviar para ${input.to}:`, err.message);
    await logEmail({ tenantId: input.tenantId, emailType: input.emailType, toEmail: input.to, subject: input.subject, status: "failed", errorMessage: err.message });
    return false;
  }
}

function emailShell(brandName: string, bodyHtml: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0f; border-radius: 16px; overflow: hidden; border: 1px solid #1a1a2e;">
      <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 30px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800;">${brandName}</h1>
      </div>
      <div style="padding: 40px 30px; text-align: center;">
        ${bodyHtml}
      </div>
      <div style="background: #0d0d15; padding: 15px; text-align: center; border-top: 1px solid #1a1a2e;">
        <p style="color: #444; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} ${brandName} - Todos os direitos reservados</p>
      </div>
    </div>
  `;
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

const OTP_TYPE_MAP: Record<string, EmailType> = {
  login: "otp_login",
  register: "otp_register",
  reset_password: "otp_reset_password",
};

const OTP_SUBJECT_MAP: Record<string, string> = {
  login: "🔐 Código de Verificação - Kafka Rank",
  register: "📋 Confirme seu Cadastro - Kafka Rank",
  reset_password: "🔑 Redefinir Senha - Kafka Rank",
};

// Send verification email via Resend
export async function sendVerificationEmail(email: string, code: string, purpose: string): Promise<boolean> {
  const subject = OTP_SUBJECT_MAP[purpose] || "Código de Verificação - Kafka Rank";
  const emailType = OTP_TYPE_MAP[purpose] || "otp_login";

  const html = emailShell("KAFKA RANK", `
    <p style="color: #a0a0b0; font-size: 15px; margin: 0 0 8px;">Seu código de verificação é:</p>
    <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border: 2px solid #dc2626; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #fff; font-family: 'Courier New', monospace;">${code}</span>
    </div>
    <p style="color: #666; font-size: 13px; margin: 20px 0 0;">Este código expira em <strong style="color: #dc2626;">10 minutos</strong>.</p>
    <p style="color: #555; font-size: 12px; margin: 8px 0 0;">Se você não solicitou este código, ignore este email.</p>
  `);

  return dispatchEmail({ to: email, subject, html, emailType, fallbackLog: `código ${code}` });
}

// Envia o link de redefinição de senha (fluxo "esqueci minha senha", separado
// do OTP de 6 dígitos acima — aqui é um link com token, não um código pra digitar).
export async function sendPasswordResetEmail(email: string, resetUrl: string, brandName: string, tenantId?: number): Promise<boolean> {
  const html = emailShell(brandName, `
    <p style="color: #a0a0b0; font-size: 15px; margin: 0 0 20px;">Recebemos um pedido para redefinir sua senha.</p>
    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px;">Redefinir senha</a>
    <p style="color: #666; font-size: 13px; margin: 24px 0 0;">Este link expira em <strong style="color: #dc2626;">30 minutos</strong>.</p>
    <p style="color: #555; font-size: 12px; margin: 8px 0 0;">Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.</p>
  `);

  return dispatchEmail({ to: email, subject: "🔑 Redefinir Senha", html, emailType: "password_reset_link", tenantId, fallbackLog: resetUrl });
}

// Boas-vindas ao criar a loja via cadastro self-service (Fase Q) — primeiro
// contato por e-mail, ninguém está logado ainda pra ver notificação in-app.
export async function sendSignupWelcomeEmail(email: string, brandName: string, storeUrl: string, tenantId: number): Promise<boolean> {
  const html = emailShell(brandName, `
    <p style="color: #fff; font-size: 18px; font-weight: 700; margin: 0 0 12px;">Sua loja está pronta! 🎉</p>
    <p style="color: #a0a0b0; font-size: 15px; margin: 0 0 20px;">Você tem 30 dias grátis pra explorar o ${brandName} com sua equipe.</p>
    <a href="${storeUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px;">Acessar minha loja</a>
    <p style="color: #555; font-size: 12px; margin: 24px 0 0;">Guarde este e-mail: é ele que confirma que sua loja foi criada com sucesso.</p>
  `);

  return dispatchEmail({ to: email, subject: `🎉 Bem-vindo(a) ao ${brandName}!`, html, emailType: "signup_welcome", tenantId, fallbackLog: storeUrl });
}

// Boas-vindas pra vendedor/gerente recém-cadastrado pelo admin da loja. Nunca
// manda a senha em texto puro por e-mail (mesmo quando o admin já definiu uma
// pro gerente) — só o link de login; o vendedor ainda faz "primeiro acesso"
// escolhendo a própria senha.
export async function sendUserWelcomeEmail(email: string, brandName: string, userType: "vendedor" | "gerente", loginUrl: string, tenantId: number): Promise<boolean> {
  const html = emailShell(brandName, `
    <p style="color: #fff; font-size: 18px; font-weight: 700; margin: 0 0 12px;">Bem-vindo(a) ao ${brandName}! 👋</p>
    <p style="color: #a0a0b0; font-size: 15px; margin: 0 0 20px;">Você foi cadastrado(a) como ${userType} na loja. Acesse pelo link abaixo pra começar.</p>
    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px;">Acessar minha conta</a>
  `);

  return dispatchEmail({ to: email, subject: `👋 Bem-vindo(a) ao ${brandName}!`, html, emailType: "user_welcome", tenantId, fallbackLog: loginUrl });
}

// Pagamento confirmado — o webhook do ASAAS já ativou a loja, este e-mail é o
// comprovante/confirmação que sobrevive fora da sessão.
export async function sendSubscriptionConfirmedEmail(email: string, brandName: string, planName: string, tenantId: number): Promise<boolean> {
  const html = emailShell(brandName, `
    <p style="color: #fff; font-size: 18px; font-weight: 700; margin: 0 0 12px;">Assinatura confirmada ✅</p>
    <p style="color: #a0a0b0; font-size: 15px; margin: 0;">Seu pagamento foi aprovado e a loja está ativa no plano <strong style="color: #fff;">${planName}</strong>.</p>
  `);

  return dispatchEmail({ to: email, subject: "✅ Assinatura confirmada", html, emailType: "subscription_confirmed", tenantId });
}

// Pagamento atrasado — precisa alcançar o admin mesmo se ele não abrir o
// sistema, por isso é e-mail e não só notificação in-app.
export async function sendSubscriptionSuspendedEmail(email: string, brandName: string, billingUrl: string, tenantId: number): Promise<boolean> {
  const html = emailShell(brandName, `
    <p style="color: #fff; font-size: 18px; font-weight: 700; margin: 0 0 12px;">Assinatura em atraso ⚠️</p>
    <p style="color: #a0a0b0; font-size: 15px; margin: 0 0 20px;">Não identificamos o pagamento da assinatura da loja no ${brandName}. O acesso foi suspenso até a regularização.</p>
    <a href="${billingUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px;">Regularizar pagamento</a>
  `);

  return dispatchEmail({ to: email, subject: "⚠️ Assinatura em atraso", html, emailType: "subscription_suspended", tenantId, fallbackLog: billingUrl });
}

// Comprovante de troca de plano — billingRouter.subscribe manda isso quando
// isPlanChange é true (loja que já assinava trocou pra outro plano via PUT na
// ASAAS, sem checkout novo).
export async function sendPlanChangedEmail(email: string, brandName: string, planName: string, tenantId: number): Promise<boolean> {
  const html = emailShell(brandName, `
    <p style="color: #fff; font-size: 18px; font-weight: 700; margin: 0 0 12px;">Plano alterado ✅</p>
    <p style="color: #a0a0b0; font-size: 15px; margin: 0;">Sua assinatura foi atualizada pro plano <strong style="color: #fff;">${planName}</strong>. O novo valor vale a partir da próxima cobrança.</p>
  `);

  return dispatchEmail({ to: email, subject: "✅ Plano alterado", html, emailType: "plan_changed", tenantId });
}

// Aviso preventivo de trial acabando (5/3/1 dias) — job diário, ver server/trialReminderJob.ts.
export async function sendTrialEndingEmail(email: string, brandName: string, daysLeft: number, billingUrl: string, tenantId: number): Promise<boolean> {
  const html = emailShell(brandName, `
    <p style="color: #fff; font-size: 18px; font-weight: 700; margin: 0 0 12px;">Seu trial acaba em ${daysLeft} dia${daysLeft === 1 ? "" : "s"} ⏳</p>
    <p style="color: #a0a0b0; font-size: 15px; margin: 0 0 20px;">Contrate um plano pra continuar usando o ${brandName} sem interrupção.</p>
    <a href="${billingUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #991b1b); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px;">Ver planos</a>
  `);

  return dispatchEmail({ to: email, subject: `⏳ Seu trial acaba em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`, html, emailType: "trial_ending", tenantId, fallbackLog: billingUrl });
}

// Alerta interno pros Super Admins quando o caminho de cobrança (webhook ASAAS,
// billingRouter) falha de um jeito que precisa de atenção humana — ver
// server/billingAlertService.ts. Não é um e-mail pro cliente da loja.
export async function sendBillingCriticalAlertEmail(
  toEmails: string[],
  alert: { code: string; message: string; tenantId: number | null; context?: Record<string, unknown> }
): Promise<void> {
  const html = emailShell("Kafka Rank", `
    <p style="color: #fff; font-size: 18px; font-weight: 700; margin: 0 0 12px;">Falha crítica no fluxo de cobrança 🚨</p>
    <p style="color: #a0a0b0; font-size: 15px; margin: 0 0 8px;"><strong style="color: #fff;">Código:</strong> ${alert.code}</p>
    <p style="color: #a0a0b0; font-size: 15px; margin: 0 0 8px;"><strong style="color: #fff;">Loja (tenantId):</strong> ${alert.tenantId ?? "não identificada"}</p>
    <p style="color: #a0a0b0; font-size: 15px; margin: 0 0 16px;">${alert.message}</p>
    ${alert.context ? `<pre style="color: #666; font-size: 11px; text-align: left; white-space: pre-wrap; background: #0d0d15; padding: 12px; border-radius: 8px;">${JSON.stringify(alert.context, null, 2)}</pre>` : ""}
  `);

  await Promise.all(
    toEmails.map((to) =>
      dispatchEmail({
        to,
        subject: `🚨 Alerta de cobrança: ${alert.code}`,
        html,
        emailType: "billing_critical_alert",
        tenantId: alert.tenantId,
      })
    )
  );
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
