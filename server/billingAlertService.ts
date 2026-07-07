import { and, eq } from "drizzle-orm";
import { getDb, withRetry } from "./db";
import { billingAlerts, superAdmins } from "../drizzle/schema";
import { logger } from "./_core/logger";
import { sendBillingCriticalAlertEmail } from "./emailService";

type CreateBillingAlertInput = {
  tenantId?: number | null;
  severity: "critical" | "warning";
  code: string;
  message: string;
  context?: Record<string, unknown>;
};

// Ponto único pra registrar falhas do caminho de cobrança. Sem error tracking
// externo, o registro precisa ser durável (sobrevive a restart) e, quando
// crítico, avisar alguém ativamente — daqui vai e-mail pros Super Admins.
export async function createBillingAlert(input: CreateBillingAlertInput): Promise<void> {
  // .bind(logger): extrair o método solto do objeto perde o `this` interno
  // do pino, quebrando com "Cannot read properties of undefined" em runtime.
  const log = (input.severity === "critical" ? logger.error : logger.warn).bind(logger);
  log({ tenantId: input.tenantId, code: input.code, context: input.context }, input.message);

  try {
    const db = await getDb();
    if (!db) return;

    await withRetry(() =>
      db.insert(billingAlerts).values({
        tenantId: input.tenantId ?? null,
        severity: input.severity,
        code: input.code,
        message: input.message,
        context: input.context ? JSON.stringify(input.context) : null,
      })
    );

    if (input.severity === "critical") {
      const owners = await withRetry(() =>
        db.select({ email: superAdmins.email })
          .from(superAdmins)
          .where(and(eq(superAdmins.active, true), eq(superAdmins.role, "owner")))
      );
      const toEmails = owners.map((o) => o.email).filter((e): e is string => !!e);
      if (toEmails.length > 0) {
        // Fire-and-forget: falha no e-mail de alerta não pode derrubar o
        // fluxo que gerou o alerta (o alerta já está gravado no banco).
        sendBillingCriticalAlertEmail(toEmails, {
          code: input.code,
          message: input.message,
          tenantId: input.tenantId ?? null,
          context: input.context,
        }).catch((err) => logger.error({ err }, "[BillingAlert] Falha ao enviar e-mail de alerta"));
      }
    }
  } catch (err) {
    // Registrar o alerta não pode, por si só, derrubar o caminho de cobrança.
    logger.error({ err }, "[BillingAlert] Falha ao gravar alerta no banco");
  }
}
