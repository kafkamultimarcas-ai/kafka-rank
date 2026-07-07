import { Button } from "@/components/ui/button";
import { buildTenantPath } from "@/lib/tenant";
import { AlertTriangle, Clock3, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { TRIAL_PERIOD_DAYS } from "@shared/plans";

const DAY_MS = 24 * 60 * 60 * 1000;

type TrialStatusBannerProps = {
  tenantSlug: string | null;
  trialEndsAt?: number | null;
  subscriptionSuspended?: boolean;
  className?: string;
};

function getDaysLeft(trialEndsAt: number) {
  return Math.max(0, Math.ceil((trialEndsAt - Date.now()) / DAY_MS));
}

export default function TrialStatusBanner({
  tenantSlug,
  trialEndsAt,
  subscriptionSuspended = false,
  className = "",
}: TrialStatusBannerProps) {
  const [, navigate] = useLocation();

  if (!tenantSlug) return null;

  if (subscriptionSuspended) {
    return (
      <div className={`border-b border-destructive/30 bg-destructive/10 ${className}`.trim()}>
        <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Assinatura em atraso</p>
              <p className="text-destructive/90">
                Regularize o pagamento para manter a loja ativa sem interrupções.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full md:w-auto racing-gradient text-white"
            onClick={() => navigate(buildTenantPath(tenantSlug, "/assinatura"))}
          >
            <CreditCard className="mr-1.5 h-4 w-4" />
            Ir para assinatura
          </Button>
        </div>
      </div>
    );
  }

  if (!trialEndsAt || trialEndsAt <= Date.now()) return null;

  const daysLeft = getDaysLeft(trialEndsAt);
  const dayLabel = daysLeft === 1 ? "dia" : "dias";

  return (
    <div className={`border-b border-amber-500/20 bg-amber-500/10 ${className}`.trim()}>
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2 text-sm text-amber-200">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-300">Período Trial</p>
            <p className="text-amber-100/90">
              Faltam {daysLeft} {dayLabel} para acabar seu acesso gratuito de {TRIAL_PERIOD_DAYS} dias.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full md:w-auto border-amber-500/30 bg-transparent text-amber-100 hover:bg-amber-500/10"
          onClick={() => navigate(buildTenantPath(tenantSlug, "/assinatura"))}
        >
          Escolher plano
        </Button>
      </div>
    </div>
  );
}
