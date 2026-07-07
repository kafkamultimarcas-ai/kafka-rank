import { describe, it, expect, afterEach } from "vitest";
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { emailLogs } from "../drizzle/schema";
import {
  sendOTP, sendPasswordResetEmail, sendSignupWelcomeEmail,
  sendSubscriptionConfirmedEmail, sendSubscriptionSuspendedEmail, sendTrialEndingEmail,
} from "./emailService";

const testEmails: string[] = [];

afterEach(async () => {
  const db = await getDb();
  if (!db) return;
  while (testEmails.length > 0) {
    const email = testEmails.pop()!;
    await db.delete(emailLogs).where(eq(emailLogs.toEmail, email));
  }
});

describe("emailService - todo envio grava em email_logs", () => {
  it("sendOTP grava emailType otp_login", async () => {
    const email = `otp${Date.now()}@teste.com`;
    testEmails.push(email);
    await sendOTP(email, "login");

    const db = await getDb();
    const [row] = await db!.select().from(emailLogs).where(eq(emailLogs.toEmail, email)).limit(1);
    expect(row).toBeDefined();
    expect(row.emailType).toBe("otp_login");
    expect(row.status).toBe("sent");
  });

  it("sendPasswordResetEmail grava emailType password_reset_link com tenantId", async () => {
    const email = `reset${Date.now()}@teste.com`;
    testEmails.push(email);
    await sendPasswordResetEmail(email, "https://kafkarank.com/t/loja/redefinir-senha?token=abc", "Loja Teste", 42);

    const db = await getDb();
    const [row] = await db!.select().from(emailLogs).where(eq(emailLogs.toEmail, email)).limit(1);
    expect(row.emailType).toBe("password_reset_link");
    expect(row.tenantId).toBe(42);
  });

  it("sendSignupWelcomeEmail grava emailType signup_welcome", async () => {
    const email = `welcome${Date.now()}@teste.com`;
    testEmails.push(email);
    await sendSignupWelcomeEmail(email, "Loja Teste", "https://kafkarank.com/t/loja/login", 7);

    const db = await getDb();
    const [row] = await db!.select().from(emailLogs).where(eq(emailLogs.toEmail, email)).limit(1);
    expect(row.emailType).toBe("signup_welcome");
    expect(row.tenantId).toBe(7);
  });

  it("sendSubscriptionConfirmedEmail e sendSubscriptionSuspendedEmail gravam os tipos certos", async () => {
    const emailConfirmed = `confirmed${Date.now()}@teste.com`;
    const emailSuspended = `suspended${Date.now()}@teste.com`;
    testEmails.push(emailConfirmed, emailSuspended);

    await sendSubscriptionConfirmedEmail(emailConfirmed, "Loja Teste", "Pro", 9);
    await sendSubscriptionSuspendedEmail(emailSuspended, "Loja Teste", "https://kafkarank.com/t/loja/assinatura", 9);

    const db = await getDb();
    const [confirmedRow] = await db!.select().from(emailLogs).where(eq(emailLogs.toEmail, emailConfirmed)).limit(1);
    const [suspendedRow] = await db!.select().from(emailLogs).where(eq(emailLogs.toEmail, emailSuspended)).limit(1);
    expect(confirmedRow.emailType).toBe("subscription_confirmed");
    expect(suspendedRow.emailType).toBe("subscription_suspended");
  });

  it("sendTrialEndingEmail grava emailType trial_ending", async () => {
    const email = `trial${Date.now()}@teste.com`;
    testEmails.push(email);
    await sendTrialEndingEmail(email, "Loja Teste", 3, "https://kafkarank.com/t/loja/assinatura", 12);

    const db = await getDb();
    const [row] = await db!.select().from(emailLogs).where(and(eq(emailLogs.toEmail, email), eq(emailLogs.emailType, "trial_ending"))).limit(1);
    expect(row).toBeDefined();
    expect(row.subject).toContain("3 dias");
  });
});
