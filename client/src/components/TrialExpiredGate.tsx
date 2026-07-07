import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTenant, useBranding } from "@/contexts/TenantContext";
import { buildTenantPath } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard } from "lucide-react";

const ADMIN_TOKEN_KEY = "crm_admin_token";

/**
 * Overlay global e não-fechável, exibido quando o trial de 30 dias da loja
 * expirou OU a assinatura está suspensa por falta de pagamento. Checa as três
 * sessões possíveis (admin, gerente, vendedor) — a que estiver ativa já devolve
 * esses dois campos junto com os dados do usuário logado. Só ativa dentro de
 * rotas /t/:slug (fora disso não há tenant pra checar).
 */
export default function TrialExpiredGate() {
  const [, navigate] = useLocation();
  const { tenantSlug } = useTenant();
  const { name: brandName } = useBranding();
  const adminToken = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;

  const { data: sellerSession } = trpc.sellers.me.useQuery(undefined, {
    enabled: !!tenantSlug, retry: false, refetchOnWindowFocus: false,
  });
  const { data: managerSession } = trpc.managers.me.useQuery(undefined, {
    enabled: !!tenantSlug, retry: false, refetchOnWindowFocus: false,
  });
  const { data: adminSession } = trpc.adminAuth.me.useQuery(
    { token: adminToken || "" },
    { enabled: !!tenantSlug && !!adminToken, retry: false, refetchOnWindowFocus: false }
  );

  const trialExpired = !!(sellerSession?.trialExpired || managerSession?.trialExpired || adminSession?.trialExpired);
  const subscriptionSuspended = !!(sellerSession?.subscriptionSuspended || managerSession?.subscriptionSuspended || adminSession?.subscriptionSuspended);
  const blocked = trialExpired || subscriptionSuspended;

  if (!tenantSlug || !blocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="racing-card max-w-md w-full p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        {subscriptionSuspended ? (
          <>
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">Assinatura em atraso</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Não identificamos o pagamento da assinatura da loja no {brandName}. Regularize pra continuar usando a
              plataforma sem interrupção.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">Seu período de teste acabou</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Os 30 dias grátis da loja no {brandName} chegaram ao fim. Contrate uma assinatura pra continuar usando a
              plataforma sem interrupção.
            </p>
          </>
        )}
        <Button
          size="lg"
          className="w-full racing-gradient text-white"
          onClick={() => navigate(buildTenantPath(tenantSlug, "/assinatura"))}
        >
          <CreditCard className="w-4 h-4 mr-1.5" /> Ir para Plano de Assinatura
        </Button>
      </div>
    </div>
  );
}
