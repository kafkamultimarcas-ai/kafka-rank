import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useBranding } from "@/contexts/TenantContext";
import { getCurrentTenantSlug, getTenantLoginPath } from "@/lib/tenant";
import { PLAN_CONFIG, LAUNCH_PROMO_LIMIT, formatCentsToBRL, type PaidPlanId } from "@shared/plans";
import { isValidCpfCnpj, isValidBrazilianPhone, isValidEmail } from "@shared/validators";
import { maskCpfCnpj, maskPhone } from "@/lib/masks";
import {
  CheckCircle2,
  MessageCircle,
  LogOut,
  CreditCard,
  Zap,
  Loader2,
  ChevronLeft,
  ChevronRight,
  History,
  ShieldCheck,
  XCircle,
} from "lucide-react";

const WHATSAPP_CONTACT = "https://wa.me/5500000000000";
const PAGE_SIZE = 10;

const EVENT_LABELS: Record<string, string> = {
  PAYMENT_CREATED: "Cobrança gerada",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  PAYMENT_RECEIVED: "Pagamento recebido",
  PAYMENT_OVERDUE: "Cobrança vencida",
  PAYMENT_DELETED: "Cobrança removida",
  PAYMENT_REFUNDED: "Pagamento estornado",
  PAYMENT_UPDATED: "Cobrança atualizada",
};

function statusBadge(status: string | null) {
  if (!status) return null;
  const isGood = ["CONFIRMED", "RECEIVED"].includes(status);
  const isBad = ["OVERDUE"].includes(status);
  const color = isGood
    ? "bg-green-500/15 text-green-400"
    : isBad
      ? "bg-destructive/15 text-destructive"
      : "bg-amber-500/15 text-amber-400";

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${color}`}>
      {status}
    </span>
  );
}

function SubscribeDialog({
  plan,
  isPlanChange,
  onClose,
}: {
  plan: PaidPlanId;
  isPlanChange: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [billingName, setBillingName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const cpfCnpjError = cpfCnpj && !isValidCpfCnpj(cpfCnpj) ? "CPF/CNPJ inválido" : null;
  const emailError = email && !isValidEmail(email) ? "E-mail inválido" : null;
  const phoneError = mobilePhone && !isValidBrazilianPhone(mobilePhone) ? "Celular inválido" : null;

  const subscribe = trpc.billing.subscribe.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.success("Redirecionando para o checkout...");
        window.location.href = data.checkoutUrl;
        return;
      }

      toast.success("Plano atualizado! O novo valor vale a partir da próxima cobrança.");
      utils.billing.getMyPlan.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const canSubmit =
    billingName.trim().length >= 2 &&
    isValidCpfCnpj(cpfCnpj) &&
    (!email || isValidEmail(email)) &&
    (!mobilePhone || isValidBrazilianPhone(mobilePhone));

  const handleSubmit = () => {
    setTouched({ billingName: true, cpfCnpj: true, email: true, mobilePhone: true });
    if (!canSubmit) return;

    subscribe.mutate({
      plan,
      billingName: billingName.trim(),
      cpfCnpj,
      email: email.trim() || undefined,
      mobilePhone: mobilePhone.trim() || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isPlanChange ? "Trocar para o plano" : "Assinar plano"} {PLAN_CONFIG[plan].name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {isPlanChange
              ? "Esses dados confirmam a troca de plano. O novo valor é aplicado na assinatura já existente, sem gerar cobrança nova agora."
              : "Esses dados são usados na emissão da cobrança. O pagamento em si acontece na próxima tela, direto com o ASAAS."}
          </p>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Nome ou razão social *</label>
            <Input value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="Nome de cobrança" />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">CPF ou CNPJ *</label>
            <Input
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
              onBlur={() => setTouched((current) => ({ ...current, cpfCnpj: true }))}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
            {touched.cpfCnpj && cpfCnpjError && (
              <p className="text-[10px] text-destructive mt-1">{cpfCnpjError}</p>
            )}
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">E-mail de cobrança</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, email: true }))}
              type="email"
              placeholder="opcional"
            />
            {touched.email && emailError && (
              <p className="text-[10px] text-destructive mt-1">{emailError}</p>
            )}
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Celular</label>
            <Input
              value={mobilePhone}
              onChange={(e) => setMobilePhone(maskPhone(e.target.value))}
              onBlur={() => setTouched((current) => ({ ...current, mobilePhone: true }))}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
            />
            {touched.mobilePhone && phoneError && (
              <p className="text-[10px] text-destructive mt-1">{phoneError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={subscribe.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={subscribe.isPending} className="racing-gradient text-white">
            {subscribe.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                {isPlanChange ? "Trocando plano..." : "Gerando cobrança..."}
              </>
            ) : isPlanChange ? (
              "Confirmar troca de plano"
            ) : (
              "Ir para pagamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AssinaturaContentProps = {
  headerAction?: React.ReactNode;
  showLogoutButton?: boolean;
};

export default function AssinaturaContent({
  headerAction,
  showLogoutButton = true,
}: AssinaturaContentProps) {
  const [, navigate] = useLocation();
  const { name: brandName } = useBranding();
  const tenantSlug = getCurrentTenantSlug();
  const [subscribingPlan, setSubscribingPlan] = useState<PaidPlanId | null>(null);
  const [page, setPage] = useState(0);

  const { data: myPlan, error: myPlanError } = trpc.billing.getMyPlan.useQuery();
  const { data: history, error: historyError } = trpc.billing.getMyPaymentHistory.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const cancelMut = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => toast.success("Cancelamento solicitado."),
    onError: (err) => toast.error(err.message),
  });

  const totalPages = history ? Math.max(1, Math.ceil(history.total / PAGE_SIZE)) : 1;
  const isPaidActive = myPlan?.status === "active" && myPlan?.hasActiveSubscription;
  const isSuspended = myPlan?.status === "suspended";

  // Busca link de checkout pendente (para reabrir pagamento)
  const { data: checkoutData } = trpc.billing.getCheckoutUrl.useQuery(undefined, {
    enabled: !!myPlan?.hasActiveSubscription && (isSuspended || myPlan?.status === "trial"),
    refetchOnWindowFocus: false,
  });
  const hasLoadError = !!myPlanError || !!historyError;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-primary font-bold mb-2">Cobrança</p>
          <h1 className="font-heading text-2xl font-bold text-foreground">Sua assinatura</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie plano, cobrança e histórico financeiro da sua loja no {brandName}.
          </p>
        </div>
        {headerAction}
      </div>

      {hasLoadError && (
        <div className="racing-card p-4 border-destructive/30 bg-destructive/5">
          <p className="text-sm text-destructive font-medium">
            Não foi possível carregar a assinatura da loja agora.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Confirme se você está logado na área administrativa da loja e tente novamente.
          </p>
        </div>
      )}

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
          <CreditCard className="w-7 h-7 text-primary" />
        </div>
        {isPaidActive ? (
          <p className="text-sm text-green-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Plano {PLAN_CONFIG[myPlan!.plan as PaidPlanId]?.name || myPlan!.plan} ativo
          </p>
        ) : isSuspended ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-destructive flex items-center justify-center gap-1.5">
              <XCircle className="w-4 h-4" />
              Assinatura em atraso - regularize o pagamento para reativar o acesso
            </p>
            {checkoutData?.checkoutUrl && (
              <Button
                size="sm"
                className="racing-gradient text-white"
                onClick={() => window.location.href = checkoutData.checkoutUrl!}
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                Pagar agora
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Escolha um plano abaixo para continuar usando o {brandName} sem interrupção.
          </p>
        )}
      </div>

      {!isPaidActive && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
            Preço promocional de lançamento para as primeiras {LAUNCH_PROMO_LIMIT} lojas clientes
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.values(PLAN_CONFIG).map((plan) => {
          const isCurrentPlan = isPaidActive && myPlan?.plan === plan.id;

          return (
            <div
              key={plan.id}
              className={`racing-card p-6 flex flex-col ${
                plan.highlight ? "border-primary/60 ring-1 ring-primary/40" : ""
              } ${isCurrentPlan ? "ring-2 ring-green-500/60" : ""}`}
            >
              {plan.highlight && !isCurrentPlan && (
                <span className="self-start mb-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-primary/20 text-primary">
                  Mais popular
                </span>
              )}

              {isCurrentPlan && (
                <span className="self-start mb-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                  Seu plano atual
                </span>
              )}

              <h3 className="font-heading text-lg font-bold text-foreground mb-1">{plan.name}</h3>

              <div className="mb-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground line-through">
                  {formatCentsToBRL(plan.originalPriceCents)}
                </span>
                <span className="text-2xl font-bold text-foreground">
                  {formatCentsToBRL(plan.monthlyPriceCents)}
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground mb-4">/mês</p>
              <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Cancelar sua assinatura?")) cancelMut.mutate();
                  }}
                  disabled={cancelMut.isPending}
                >
                  {cancelMut.isPending ? "Cancelando..." : "Cancelar assinatura"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button onClick={() => setSubscribingPlan(plan.id)} className="w-full racing-gradient text-white">
                    {isPaidActive ? "Trocar para este plano" : "Assinar agora"}
                  </Button>
                  <Button variant="ghost" asChild className="w-full text-xs">
                    <a href={WHATSAPP_CONTACT} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      Falar com vendas
                    </a>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="racing-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Histórico de pagamentos</h2>
        </div>

        {!history || history.items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento de pagamento ainda.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{EVENT_LABELS[item.eventType] || item.eventType}</TableCell>
                    <TableCell>{statusBadge(item.status)}</TableCell>
                    <TableCell className="text-xs">
                      {item.value ? formatCentsToBRL(Math.round(Number(item.value) * 100)) : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Próxima
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {showLogoutButton && (
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate(getTenantLoginPath(tenantSlug))} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-1.5" />
            Sair de {brandName}
          </Button>
        </div>
      )}

      {subscribingPlan && (
        <SubscribeDialog
          plan={subscribingPlan}
          isPlanChange={!!isPaidActive}
          onClose={() => setSubscribingPlan(null)}
        />
      )}
    </div>
  );
}
