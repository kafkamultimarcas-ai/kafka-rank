// Fonte única de verdade pra preço e limites dos planos pagos — consumido pelo
// backend (billingRouter/asaasService, pra saber quanto cobrar e quais limites
// aplicar quando a assinatura é confirmada) e pelo frontend (telas de preço),
// pra nunca desalinhar o valor mostrado do valor cobrado de verdade.

export type PaidPlanId = "basic" | "pro" | "enterprise";

export type PlanConfig = {
  id: PaidPlanId;
  name: string;
  monthlyPriceCents: number; // valor cobrado de fato (com desconto de lançamento)
  originalPriceCents: number; // preço cheio, exibido riscado
  maxSellers: number;
  maxAdmins: number;
  description: string;
  features: string[];
  highlight?: boolean;
};

export const PLAN_CONFIG: Record<PaidPlanId, PlanConfig> = {
  basic: {
    id: "basic",
    name: "Basic",
    monthlyPriceCents: 49900,
    originalPriceCents: 79900,
    maxSellers: 15,
    maxAdmins: 2,
    description: "Para lojas pequenas que já venderam a ideia pro time.",
    features: ["Até 15 vendedores", "2 administradores", "Todos os módulos", "Suporte por WhatsApp"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPriceCents: 69900,
    originalPriceCents: 99900,
    maxSellers: 30,
    maxAdmins: 5,
    description: "Para concessionárias com equipe grande e múltiplos setores.",
    features: ["Até 30 vendedores", "5 administradores", "Todos os módulos", "Prioridade no suporte"],
    highlight: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    // Cobrado mensalmente (equivalente comercial ao "12x R$ 999" anunciado —
    // billing recorrente MONTHLY no ASAAS, sem usar parcelamento de cartão).
    monthlyPriceCents: 99900,
    originalPriceCents: 139900,
    maxSellers: 999999,
    maxAdmins: 999999,
    description: "Para redes com várias lojas e necessidades sob medida.",
    features: ["Vendedores ilimitados", "Administradores ilimitados", "Onboarding assistido", "Gerente de conta dedicado"],
  },
};

export const LAUNCH_PROMO_LIMIT = 100;

export function formatCentsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
