import { z } from "zod";
import { eq, desc, count } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenants, subscriptionEvents } from "../../drizzle/schema";
import { getCurrentTenantId } from "../tenantDb";
import { clearTenantLimitsCache } from "../tenantService";
import * as asaas from "../asaasService";
import { PLAN_CONFIG } from "../../shared/plans";
import { isValidCpfCnpj, isValidBrazilianPhone } from "../../shared/validators";
import { sendPlanChangedEmail } from "../emailService";
import { createBillingAlert } from "../billingAlertService";

const paidPlanSchema = z.enum(["basic", "pro", "enterprise"]);

export const billingRouter = router({
  // Plano/status atual da loja logada, pra tela de Assinatura.
  getMyPlan: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = getCurrentTenantId();
    const [tenant] = await db.select({
      plan: tenants.plan,
      status: tenants.status,
      trialEndsAt: tenants.trialEndsAt,
      monthlyPrice: tenants.monthlyPrice,
      asaasCustomerId: tenants.asaasCustomerId,
      subscriptionId: tenants.subscriptionId,
    }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    if (!tenant) return null;
    return {
      ...tenant,
      hasActiveSubscription: !!tenant.subscriptionId,
    };
  }),

  // Histórico de pagamentos/eventos de assinatura da própria loja, paginado.
  getMyPaymentHistory: adminProcedure.input(z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { items: [], total: 0 };
    const tenantId = getCurrentTenantId();

    const [items, [{ value: total }]] = await Promise.all([
      db.select().from(subscriptionEvents)
        .where(eq(subscriptionEvents.tenantId, tenantId))
        .orderBy(desc(subscriptionEvents.createdAt))
        .limit(input.limit).offset(input.offset),
      db.select({ value: count() }).from(subscriptionEvents).where(eq(subscriptionEvents.tenantId, tenantId)),
    ]);

    return { items, total };
  }),

  // Cria (ou reaproveita) o customer no ASAAS. Se a loja já tem uma assinatura
  // ativa, TROCA de plano (PUT) em vez de criar uma nova — criar uma segunda
  // assinatura pra quem já assina geraria cobrança duplicada de verdade.
  // Devolve a URL de checkout hospedado do ASAAS pro frontend redirecionar
  // (só existe/faz sentido quando há uma cobrança pendente pra pagar agora).
  subscribe: adminProcedure.input(z.object({
    plan: paidPlanSchema,
    billingName: z.string().min(2),
    cpfCnpj: z.string().refine(isValidCpfCnpj, "CPF/CNPJ inválido"),
    email: z.string().email().optional(),
    mobilePhone: z.string().optional().refine((v) => !v || isValidBrazilianPhone(v), "Telefone inválido"),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB indisponível");
    const tenantId = getCurrentTenantId();

    const [tenant] = await db.select({
      asaasCustomerId: tenants.asaasCustomerId,
      subscriptionId: tenants.subscriptionId,
      plan: tenants.plan,
      name: tenants.name,
      email: tenants.email,
    }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant) throw new Error("Loja não encontrada");

    const isPlanChange = !!tenant.subscriptionId;
    if (isPlanChange && tenant.plan === input.plan) {
      throw new Error(`A loja já está no plano ${PLAN_CONFIG[input.plan].name}.`);
    }

    try {
      let customerId = tenant.asaasCustomerId;
      if (!customerId) {
        const customer = await asaas.createCustomer({
          name: input.billingName,
          cpfCnpj: input.cpfCnpj,
          email: input.email || tenant.email || undefined,
          mobilePhone: input.mobilePhone,
          externalReference: String(tenantId),
        });
        customerId = customer.id;
        await db.update(tenants).set({ asaasCustomerId: customerId }).where(eq(tenants.id, tenantId));
      }

      const subscription = isPlanChange
        ? await asaas.updateSubscription(tenant.subscriptionId!, { plan: input.plan })
        : await asaas.createSubscription({ customerId, plan: input.plan });

      // Grava o plano escolhido e o id da assinatura já — o status só vira "active"
      // de verdade quando o webhook confirmar o primeiro pagamento (fonte da verdade
      // é o ASAAS, isso aqui é só pra já sabermos qual plano cobrar/aplicar limite).
      await db.update(tenants).set({
        plan: input.plan,
        subscriptionId: subscription.id,
        monthlyPrice: PLAN_CONFIG[input.plan].monthlyPriceCents,
      }).where(eq(tenants.id, tenantId));
      clearTenantLimitsCache(tenantId);

      const checkoutUrl = await asaas.getCheckoutUrl(subscription.id);
      // Numa assinatura nova, precisa de link pra pagar a primeira cobrança agora.
      // Numa troca de plano, pode não haver cobrança PENDING nesse instante (ex:
      // ciclo atual já pago) — o novo valor só vale a partir da próxima cobrança,
      // o que não é erro.
      if (!checkoutUrl && !isPlanChange) {
        await createBillingAlert({
          tenantId,
          severity: "warning",
          code: "checkout_url_missing",
          message: `Assinatura ${subscription.id} criada mas sem cobrança PENDING pra gerar link de checkout.`,
          context: { subscriptionId: subscription.id, plan: input.plan },
        });
        throw new Error("Assinatura criada, mas não foi possível gerar o link de pagamento. Tente novamente em instantes.");
      }

      const billingEmail = input.email || tenant.email;
      if (isPlanChange && billingEmail) {
        await sendPlanChangedEmail(billingEmail, tenant.name, PLAN_CONFIG[input.plan].name, tenantId);
      }

      return { checkoutUrl, planChanged: isPlanChange };
    } catch (err: any) {
      if (err instanceof asaas.AsaasError) {
        await createBillingAlert({
          tenantId,
          severity: "warning",
          code: "asaas_api_error",
          message: `Falha ao chamar API do ASAAS em billingRouter.subscribe: ${err.message}`,
          context: { status: err.status, body: err.body, plan: input.plan },
        });
      }
      throw err;
    }
  }),

  // Permite ao admin reabrir o link de checkout quando fechou a aba sem pagar.
  // Busca a cobrança PENDING da assinatura existente e devolve a URL.
  getCheckoutUrl: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB indisponível");
    const tenantId = getCurrentTenantId();

    const [tenant] = await db.select({ subscriptionId: tenants.subscriptionId }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant?.subscriptionId) return { checkoutUrl: null, reason: "no_subscription" as const };

    try {
      const checkoutUrl = await asaas.getCheckoutUrl(tenant.subscriptionId);
      return { checkoutUrl, reason: checkoutUrl ? null : "no_pending_payment" as const };
    } catch (err: any) {
      if (err instanceof asaas.AsaasError) {
        await createBillingAlert({
          tenantId,
          severity: "warning",
          code: "asaas_api_error",
          message: `Falha ao buscar checkout URL: ${err.message}`,
          context: { status: err.status, body: err.body, subscriptionId: tenant.subscriptionId },
        });
      }
      return { checkoutUrl: null, reason: "api_error" as const };
    }
  }),

  // Lista faturas (pagamentos confirmados/recebidos) da assinatura com link de recibo.
  getInvoices: adminProcedure.input(z.object({
    limit: z.number().min(1).max(50).default(10),
    offset: z.number().min(0).default(0),
  })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { items: [], total: 0 };
    const tenantId = getCurrentTenantId();

    const [tenant] = await db.select({
      subscriptionId: tenants.subscriptionId,
      asaasCustomerId: tenants.asaasCustomerId,
    }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    if (!tenant?.subscriptionId) return { items: [], total: 0 };

    try {
      // Busca pagamentos com status CONFIRMED ou RECEIVED (faturas pagas)
      const confirmed = await asaas.getSubscriptionPayments(tenant.subscriptionId, {
        status: "CONFIRMED",
        limit: input.limit,
        offset: input.offset,
      });
      const received = await asaas.getSubscriptionPayments(tenant.subscriptionId, {
        status: "RECEIVED",
        limit: input.limit,
        offset: input.offset,
      });

      // Combina e ordena por data de pagamento (mais recente primeiro)
      const allPayments = [...(confirmed.data || []), ...(received.data || [])]
        .sort((a, b) => {
          const dateA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
          const dateB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, input.limit);

      const items = allPayments.map((p) => ({
        id: p.id,
        value: p.value,
        netValue: p.netValue,
        billingType: p.billingType,
        dueDate: p.dueDate,
        paymentDate: p.paymentDate,
        invoiceUrl: p.invoiceUrl,
        receiptUrl: p.transactionReceiptUrl,
        description: p.description,
        status: p.status,
      }));

      return {
        items,
        total: (confirmed.totalCount || 0) + (received.totalCount || 0),
      };
    } catch (err: any) {
      if (err instanceof asaas.AsaasError) {
        await createBillingAlert({
          tenantId,
          severity: "warning",
          code: "asaas_api_error",
          message: `Falha ao buscar faturas: ${err.message}`,
          context: { status: err.status, body: err.body, subscriptionId: tenant.subscriptionId },
        });
      }
      return { items: [], total: 0 };
    }
  }),

  cancelSubscription: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB indisponível");
    const tenantId = getCurrentTenantId();

    const [tenant] = await db.select({ subscriptionId: tenants.subscriptionId }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant?.subscriptionId) throw new Error("Nenhuma assinatura ativa pra cancelar");

    try {
      await asaas.cancelSubscription(tenant.subscriptionId);
    } catch (err: any) {
      if (err instanceof asaas.AsaasError) {
        await createBillingAlert({
          tenantId,
          severity: "warning",
          code: "asaas_api_error",
          message: `Falha ao cancelar assinatura no ASAAS: ${err.message}`,
          context: { status: err.status, body: err.body, subscriptionId: tenant.subscriptionId },
        });
      }
      throw err;
    }
    // Limpa o id local — sem isso, uma nova tentativa de assinar tentaria dar
    // PUT numa assinatura que não existe mais na ASAAS.
    await db.update(tenants).set({ subscriptionId: null }).where(eq(tenants.id, tenantId));
    clearTenantLimitsCache(tenantId);
    return { success: true };
  }),
});
