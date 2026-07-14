import { ENV } from "./_core/env";
import { PLAN_CONFIG, type PaidPlanId } from "../shared/plans";

// Wrapper fino sobre a API do ASAAS (https://docs.asaas.com), mesmo princípio de
// server/zapi-service.ts: credenciais globais (uma conta ASAAS por plataforma, não
// por loja — diferente do Z-API, que é por tenant), tratamento de erro centralizado.

class AsaasError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) {
    super(message);
    this.name = "AsaasError";
  }
}

function assertConfigured() {
  if (!ENV.asaasApiKey) {
    throw new AsaasError("ASAAS_API_KEY não configurada no .env — integração de pagamento indisponível.");
  }
}

const ASAAS_TIMEOUT_MS = 30_000;

async function asaasFetch(path: string, init: RequestInit = {}) {
  assertConfigured();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASAAS_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${ENV.asaasApiUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        access_token: ENV.asaasApiKey,
        ...(init.headers || {}),
      },
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new AsaasError(`Timeout ao chamar a API do ASAAS (${ASAAS_TIMEOUT_MS / 1000}s) em ${path}`);
    }
    throw new AsaasError(`Falha de rede ao chamar a API do ASAAS em ${path}: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!res.ok) {
    const message = body?.errors?.[0]?.description || `Erro na API do ASAAS (HTTP ${res.status})`;
    throw new AsaasError(message, res.status, body);
  }
  return body;
}

export type AsaasCustomerInput = {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
  externalReference?: string; // usamos pra guardar o tenantId
};

export async function createCustomer(input: AsaasCustomerInput): Promise<{ id: string }> {
  return asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
      email: input.email,
      mobilePhone: input.mobilePhone?.replace(/\D/g, ""),
      externalReference: input.externalReference,
    }),
  });
}

export async function getCustomer(customerId: string): Promise<any> {
  return asaasFetch(`/customers/${customerId}`);
}

export type CreateSubscriptionInput = {
  customerId: string;
  plan: PaidPlanId;
  billingType?: "BOLETO" | "PIX" | "CREDIT_CARD" | "UNDEFINED";
};

export async function createSubscription(input: CreateSubscriptionInput): Promise<{ id: string; status: string }> {
  const plan = PLAN_CONFIG[input.plan];
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + 1); // primeira cobrança amanhã

  return asaasFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType || "UNDEFINED", // UNDEFINED = cliente escolhe no checkout
      value: plan.monthlyPriceCents / 100,
      cycle: "MONTHLY",
      nextDueDate: nextDueDate.toISOString().slice(0, 10),
      description: `Kafka Rank — plano ${plan.name}`,
    }),
  });
}

// Troca de plano numa assinatura já ativa (upgrade/downgrade) — PUT em vez de
// criar uma segunda assinatura, o que geraria cobrança duplicada. Confirmado
// contra docs.asaas.com: o campo `value` existe no update e
// `updatePendingPayments: true` aplica o novo valor até em cobranças pendentes
// já geradas (sem isso, só as cobranças futuras usariam o preço novo).
export async function updateSubscription(subscriptionId: string, input: { plan: PaidPlanId }): Promise<{ id: string; status: string }> {
  const plan = PLAN_CONFIG[input.plan];
  return asaasFetch(`/subscriptions/${subscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({
      value: plan.monthlyPriceCents / 100,
      cycle: "MONTHLY",
      description: `Kafka Rank — plano ${plan.name}`,
      updatePendingPayments: true,
    }),
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}

export async function getSubscription(subscriptionId: string): Promise<any> {
  return asaasFetch(`/subscriptions/${subscriptionId}`);
}

/**
 * Pega a cobrança pendente mais recente da assinatura e devolve a URL de checkout
 * hospedado do ASAAS (invoiceUrl) — é pra lá que o admin é redirecionado pra pagar
 * (cartão/PIX/boleto), sem nenhum dado de cartão passar pelo nosso servidor.
 */
export async function getCheckoutUrl(subscriptionId: string): Promise<string | null> {
  const payments = await asaasFetch(`/subscriptions/${subscriptionId}/payments?status=PENDING&limit=1`);
  const first = payments?.data?.[0];
  return first?.invoiceUrl || null;
}

/**
 * Lista pagamentos confirmados/recebidos de uma assinatura, com URL do recibo.
 * O Asaas devolve `transactionReceiptUrl` para pagamentos confirmados.
 */
export type AsaasPayment = {
  id: string;
  status: string;
  value: number;
  netValue: number;
  billingType: string;
  dueDate: string;
  paymentDate: string | null;
  invoiceUrl: string | null;
  transactionReceiptUrl: string | null;
  description: string | null;
};

export async function getSubscriptionPayments(
  subscriptionId: string,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ data: AsaasPayment[]; totalCount: number }> {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  params.set("limit", String(options.limit || 20));
  params.set("offset", String(options.offset || 0));
  return asaasFetch(`/subscriptions/${subscriptionId}/payments?${params.toString()}`);
}

export { AsaasError };
