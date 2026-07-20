import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Users, Trophy, ShoppingCart, TrendingUp, TrendingDown, Minus, Sparkles, Wrench, Banknote, AlertTriangle, Eye, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { formatBRL } from "@shared/inventory";
import { MONTH_NAMES } from "@/lib/months";
import MonthFilter from "@/components/MonthFilter";

type DashboardCard = "vendas" | "fei" | "posvenda" | "equipe";
type TopKpi = "vendas" | "fei" | "pontos";

const KPI_META: Record<TopKpi, { label: string; suffix: string }> = {
  vendas: { label: "Vendas", suffix: "vendas" },
  fei: { label: "F&I", suffix: "fichas" },
  pontos: { label: "Pontos", suffix: "pts" },
};

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  approved: { label: "Aprovado", cls: "bg-green-500/20 text-green-400" },
  pending: { label: "Pendente", cls: "bg-yellow-500/20 text-yellow-400" },
  rejected: { label: "Rejeitado", cls: "bg-red-500/20 text-red-400" },
  aberto: { label: "Aberto", cls: "bg-blue-500/20 text-blue-400" },
  agendado: { label: "Agendado", cls: "bg-purple-500/20 text-purple-400" },
  em_servico: { label: "Em serviço", cls: "bg-amber-500/20 text-amber-400" },
  finalizado: { label: "Finalizado", cls: "bg-green-500/20 text-green-400" },
  entregue: { label: "Entregue", cls: "bg-green-500/20 text-green-400" },
  cancelado: { label: "Cancelado", cls: "bg-red-500/20 text-red-400" },
};

function StatusPill({ status }: { status: string }) {
  const info = STATUS_PILL[status] || { label: status, cls: "bg-accent text-muted-foreground" };
  return <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${info.cls}`}>{info.label}</span>;
}

function TrendBadge({ pct }: { pct: number }) {
  if (!pct) {
    return <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5"><Minus className="h-3 w-3" /> 0%</span>;
  }
  const up = pct > 0;
  return (
    <span className={`text-[11px] inline-flex items-center gap-0.5 font-medium ${up ? "text-green-400" : "text-red-400"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

function DetailRow({ title, subtitle, right, rightSub }: { title: string; subtitle?: string; right?: ReactNode; rightSub?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-accent/30">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle ? <p className="text-xs text-muted-foreground truncate">{subtitle}</p> : null}
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
        {right}
        {rightSub ? <span className="text-[11px] text-muted-foreground">{rightSub}</span> : null}
      </div>
    </div>
  );
}

function EmptyDetail({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{label}</p>;
}

function CardSkeleton() {
  return (
    <div className="racing-card p-4 border-l-4 border-l-border">
      <Skeleton className="h-4 w-20 mb-3" />
      <Skeleton className="h-8 w-12 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const tenantSlug = getCurrentTenantSlug();

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [detailCard, setDetailCard] = useState<DashboardCard | null>(null);
  const [topKpi, setTopKpi] = useState<TopKpi>("vendas");

  const summaryQuery = trpc.dashboard.summary.useQuery({ month: filterMonth, year: filterYear });
  const { data: competitions } = trpc.competitions.list.useQuery({});
  const { data: quote } = trpc.quotes.latest.useQuery();
  const utils = trpc.useUtils();

  const generateQuote = trpc.quotes.generate.useMutation({
    onSuccess: () => {
      utils.quotes.latest.invalidate();
      utils.quotes.list.invalidate();
      toast.success("Frase motivacional gerada!");
    },
    onError: (error) => toast.error(error.message || "Erro ao gerar frase."),
  });

  const summary = summaryQuery.data;
  const isLoading = summaryQuery.isLoading;

  const activeComps = competitions?.filter((c) => c.status === "active") || [];
  const finishedComps = competitions?.filter((c) => c.status === "finished") || [];

  const topEquipe = [...(summary?.topEquipe || [])].sort((a, b) => b[topKpi] - a[topKpi]).slice(0, 5);

  const detailConfig: Record<DashboardCard, { title: string; goLabel: string; goPath: string }> = {
    vendas: { title: `Vendas — ${MONTH_NAMES[filterMonth]}`, goLabel: "Ir para Vendas", goPath: "/admin/vendas" },
    fei: { title: `F&I — ${MONTH_NAMES[filterMonth]}`, goLabel: "Ir para F&I", goPath: "/admin/fei" },
    posvenda: { title: `Pós-venda — ${MONTH_NAMES[filterMonth]}`, goLabel: "Ir para Pós-venda", goPath: "/admin/pos-venda" },
    equipe: { title: "Equipe", goLabel: "Ir para Equipe", goPath: "/admin/vendedores" },
  };

  const goToDetailScreen = () => {
    if (!detailCard) return;
    const path = detailConfig[detailCard].goPath;
    setDetailCard(null);
    setLocation(buildTenantPath(tenantSlug, path));
  };

  const fmtDate = (v: any) => {
    if (!v) return "";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
  };

  const cardBase = "racing-card p-4 border-l-4 cursor-pointer transition hover:bg-accent/20 hover:-translate-y-0.5 relative group";
  const affordance = <ChevronRight className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />;

  const openCard = (card: DashboardCard) => setDetailCard(card);
  const cardKeyProps = (card: DashboardCard) => ({
    role: "button",
    tabIndex: 0,
    onClick: () => openCard(card),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCard(card); } },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Painel Administrativo</h1>
            <p className="text-muted-foreground text-sm mt-1">Visão geral — {MONTH_NAMES[filterMonth]} {filterYear}</p>
          </div>
          <MonthFilter month={filterMonth} year={filterYear} onChange={(m, y) => { setFilterMonth(m); setFilterYear(y); }} />
        </div>

        {/* Stats Grid - Resumo do Mês */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* VENDAS */}
            <div {...cardKeyProps("vendas")} className={`${cardBase} border-l-blue-500`}>
              {affordance}
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-5 w-5 text-blue-400" />
                <span className="text-xs text-muted-foreground font-medium">VENDAS</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-heading font-bold text-2xl text-foreground">{summary?.vendas.approved ?? 0}</p>
                <TrendBadge pct={summary?.trend.vendas.pct ?? 0} />
              </div>
              <p className="text-xs text-muted-foreground">aprovadas no mês</p>
              {(summary?.vendas.pending ?? 0) > 0 && (
                <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {summary?.vendas.pending} pendentes
                </p>
              )}
              <div className="mt-2 pt-2 border-t border-border/40">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Faturamento</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{formatBRL(summary?.vendas.revenue ?? 0)}</span>
                  <TrendBadge pct={summary?.trend.revenue.pct ?? 0} />
                </div>
              </div>
            </div>

            {/* F&I */}
            <div {...cardKeyProps("fei")} className={`${cardBase} border-l-amber-500`}>
              {affordance}
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="h-5 w-5 text-amber-400" />
                <span className="text-xs text-muted-foreground font-medium">F&I</span>
              </div>
              <p className="font-heading font-bold text-2xl text-foreground">{summary?.fei.approved ?? 0}</p>
              <p className="text-xs text-muted-foreground">aprovados no mês</p>
              {(summary?.fei.pending ?? 0) > 0 && (
                <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {summary?.fei.pending} pendentes
                </p>
              )}
              <div className="mt-2 pt-2 border-t border-border/40">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Financiado</p>
                <span className="text-sm font-bold text-foreground">{formatBRL(summary?.fei.financedTotal ?? 0)}</span>
              </div>
            </div>

            {/* PÓS-VENDA */}
            <div {...cardKeyProps("posvenda")} className={`${cardBase} border-l-orange-500`}>
              {affordance}
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-5 w-5 text-orange-400" />
                <span className="text-xs text-muted-foreground font-medium">PÓS-VENDA</span>
              </div>
              <p className="font-heading font-bold text-2xl text-foreground">{summary?.posvenda.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">chamados no mês</p>
              {(summary?.posvenda.abertos ?? 0) > 0 && (
                <p className="text-xs text-blue-400 mt-1">{summary?.posvenda.abertos} abertos | {summary?.posvenda.emServico} em serviço</p>
              )}
            </div>

            {/* EQUIPE */}
            <div {...cardKeyProps("equipe")} className={`${cardBase} border-l-emerald-500`}>
              {affordance}
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-emerald-400" />
                <span className="text-xs text-muted-foreground font-medium">EQUIPE</span>
              </div>
              <p className="font-heading font-bold text-2xl text-foreground">{summary?.equipe.vendedoresAtivos ?? 0}</p>
              <p className="text-xs text-muted-foreground">colaboradores ativos</p>
              <p className="text-xs text-emerald-400 mt-1">{summary?.equipe.totalAtivos ?? 0} total na equipe</p>
            </div>
          </div>
        )}

        {/* Competições + Frase */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="racing-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-bold text-sm text-foreground">COMPETIÇÕES ATIVAS</h2>
            </div>
            {activeComps.length > 0 ? (
              <div className="space-y-2">
                {activeComps.map((comp) => (
                  <div key={comp.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/30">
                    <Trophy className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{comp.name}</p>
                      <p className="text-xs text-muted-foreground">{comp.type === "individual" ? "Individual" : comp.type === "team" ? "Equipes" : "Grupos"}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setLocation(buildTenantPath(tenantSlug, `/corrida/${comp.id}`))} className="gap-1 text-xs shrink-0">
                      <Eye className="h-3 w-3" /> Ver Corrida
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma competição ativa.</p>
            )}
          </div>

          <div className="racing-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-heading font-bold text-sm text-foreground">FRASE MOTIVACIONAL</h2>
              </div>
              <Button size="sm" onClick={() => generateQuote.mutate()} disabled={generateQuote.isPending} className="racing-gradient text-white">
                {generateQuote.isPending ? "Gerando..." : "Gerar Nova"}
              </Button>
            </div>
            {quote ? (
              <div>
                <p className="text-muted-foreground italic">"{quote.quote}"</p>
                {quote.author && <p className="text-xs text-primary mt-2">— {quote.author}</p>}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Clique em "Gerar Nova" para criar uma frase motivacional com IA.</p>
            )}
          </div>
        </div>

        {/* Top Equipe do Mês */}
        <div className="racing-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-heading font-bold text-sm text-foreground">TOP EQUIPE — {MONTH_NAMES[filterMonth].toUpperCase()}</h2>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-accent/30 border border-border">
              {(Object.keys(KPI_META) as TopKpi[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setTopKpi(k)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${topKpi === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {KPI_META[k].label}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
                </div>
              ))}
            </div>
          ) : topEquipe.length > 0 ? (
            <div className="space-y-3">
              {topEquipe.map((seller, idx) => (
                <div key={seller.id} className="flex items-center gap-3">
                  <span className={`font-heading font-bold text-sm w-6 ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-600" : "text-muted-foreground"}`}>{idx + 1}</span>
                  {seller.photoUrl ? (
                    <img src={seller.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
                      {(seller.nickname || seller.name || "?").charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{seller.nickname || seller.name}</p>
                    <p className="text-xs text-muted-foreground">{seller[topKpi]} {KPI_META[topKpi].suffix} no mês</p>
                  </div>
                  <span className="font-heading font-bold text-sm text-primary">{seller[topKpi]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhum vendedor cadastrado.</p>
          )}
        </div>

        {/* Competições Encerradas */}
        {finishedComps.length > 0 && (
          <div className="racing-card p-5">
            <h2 className="font-heading font-bold text-sm text-foreground mb-3">COMPETIÇÕES ENCERRADAS</h2>
            <div className="space-y-2">
              {finishedComps.slice(0, 5).map((comp) => (
                <div key={comp.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/30">
                  <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{comp.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(comp.endDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={detailCard !== null} onOpenChange={(open) => !open && setDetailCard(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailCard ? detailConfig[detailCard].title : ""}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {detailCard === "vendas" && (
              <>
                <p className="text-xs text-muted-foreground">
                  {summary?.vendas.approved ?? 0} aprovadas · {summary?.vendas.pending ?? 0} pendentes · Faturamento {formatBRL(summary?.vendas.revenue ?? 0)}
                </p>
                {(summary?.vendas.items.length ?? 0) === 0 ? <EmptyDetail label="Nenhuma venda no mês." /> : (
                  [...(summary?.vendas.items || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((s) => (
                    <DetailRow
                      key={s.id}
                      title={s.customerName || s.vehicleModel || `Venda #${s.id}`}
                      subtitle={[s.vehicleModel, `Vend.: ${s.sellerName}`, s.value > 0 ? formatBRL(s.value) : null].filter(Boolean).join(" • ")}
                      right={<StatusPill status={s.status} />}
                      rightSub={fmtDate(s.createdAt)}
                    />
                  ))
                )}
              </>
            )}

            {detailCard === "fei" && (
              <>
                <p className="text-xs text-muted-foreground">
                  {summary?.fei.approved ?? 0} aprovados · {summary?.fei.pending ?? 0} pendentes · Financiado {formatBRL(summary?.fei.financedTotal ?? 0)}
                </p>
                {(summary?.fei.items.length ?? 0) === 0 ? <EmptyDetail label="Nenhuma ficha F&I no mês." /> : (
                  [...(summary?.fei.items || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((f) => (
                    <DetailRow
                      key={f.id}
                      title={f.customerName || `Ficha #${f.id}`}
                      subtitle={[f.bankName, f.vehiclePlate, `Vend.: ${f.sellerName}`, f.financedValue > 0 ? formatBRL(f.financedValue) : null].filter(Boolean).join(" • ")}
                      right={<StatusPill status={f.status} />}
                      rightSub={fmtDate(f.createdAt)}
                    />
                  ))
                )}
              </>
            )}

            {detailCard === "posvenda" && (
              <>
                <p className="text-xs text-muted-foreground">
                  {summary?.posvenda.abertos ?? 0} abertos · {summary?.posvenda.emServico ?? 0} em serviço · {summary?.posvenda.finalizados ?? 0} finalizados
                </p>
                {(summary?.posvenda.items.length ?? 0) === 0 ? <EmptyDetail label="Nenhum chamado no mês." /> : (
                  [...(summary?.posvenda.items || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((c) => (
                    <DetailRow
                      key={c.id}
                      title={`${c.ticketNumber || `#${c.id}`} — ${c.clienteNome}`}
                      subtitle={[c.carroModelo, c.carroPlaca].filter(Boolean).join(" • ")}
                      right={<StatusPill status={c.status} />}
                      rightSub={fmtDate(c.createdAt)}
                    />
                  ))
                )}
              </>
            )}

            {detailCard === "equipe" && (
              <>
                <p className="text-xs text-muted-foreground">{summary?.equipe.vendedoresAtivos ?? 0} vendedores · {summary?.equipe.totalAtivos ?? 0} ativos no total</p>
                {(summary?.equipe.sellers.length ?? 0) === 0 ? <EmptyDetail label="Nenhum colaborador ativo." /> : (
                  [...(summary?.equipe.sellers || [])].sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((s) => (
                    <DetailRow
                      key={s.id}
                      title={s.nickname || s.name}
                      subtitle={s.department || "vendas"}
                      right={<span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 shrink-0">Ativo</span>}
                    />
                  ))
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button onClick={goToDetailScreen} className="gap-2">
              {detailCard ? detailConfig[detailCard].goLabel : ""}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
