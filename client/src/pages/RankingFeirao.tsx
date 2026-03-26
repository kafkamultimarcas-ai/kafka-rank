import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import {
  Flame, Trophy, ArrowLeft, Search, UserCheck, UserX, Clock,
  Phone, Calendar, Car, Hash, ChevronDown, ChevronUp, Crown,
  Medal, Award, Users, CheckCircle2, XCircle, Timer,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

type TabKey = "ranking" | "conferencia" | "todos";

const PODIUM_COLORS = [
  { bg: "from-yellow-500/30 to-yellow-600/10", border: "border-yellow-500", text: "text-yellow-400", icon: Crown },
  { bg: "from-gray-400/30 to-gray-500/10", border: "border-gray-400", text: "text-gray-300", icon: Medal },
  { bg: "from-orange-600/30 to-orange-700/10", border: "border-orange-600", text: "text-orange-400", icon: Award },
];

export default function RankingFeirao() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabKey>("ranking");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: ranking, isLoading: loadingRanking } = trpc.sdr.rankingFeirao.useQuery({});
  const { data: agendamentos, isLoading: loadingAgendamentos } = trpc.sdr.listFeirao.useQuery({});

  // Stats gerais
  const stats = useMemo(() => {
    if (!agendamentos) return { total: 0, compareceram: 0, naoVieram: 0, pendentes: 0 };
    return {
      total: agendamentos.length,
      compareceram: agendamentos.filter((a: any) => a.attendanceStatus === "attended" || a.attendanceStatus === "approved").length,
      naoVieram: agendamentos.filter((a: any) => a.attendanceStatus === "no_show").length,
      pendentes: agendamentos.filter((a: any) => a.attendanceStatus === "pending").length,
    };
  }, [agendamentos]);

  // Filtrar agendamentos por busca
  const filteredAgendamentos = useMemo(() => {
    if (!agendamentos) return [];
    if (!search) return agendamentos;
    const s = search.toLowerCase();
    return agendamentos.filter((a: any) =>
      (a.customerName || "").toLowerCase().includes(s) ||
      (a.customerPhone || "").includes(s) ||
      (a.sellerName || "").toLowerCase().includes(s) ||
      (a.ticketNumber || "").toLowerCase().includes(s)
    );
  }, [agendamentos, search]);

  // Separar conferência por status
  const conferencia = useMemo(() => {
    const list = filteredAgendamentos;
    return {
      pendentes: list.filter((a: any) => a.attendanceStatus === "pending"),
      compareceram: list.filter((a: any) => a.attendanceStatus === "attended" || a.attendanceStatus === "approved"),
      naoVieram: list.filter((a: any) => a.attendanceStatus === "no_show" || a.attendanceStatus === "rejected"),
    };
  }, [filteredAgendamentos]);

  const tabs = [
    { key: "ranking" as const, label: "Ranking", icon: Trophy, count: ranking?.length || 0 },
    { key: "conferencia" as const, label: "Conferência", icon: UserCheck, count: stats.total },
    { key: "todos" as const, label: "Todos", icon: Calendar, count: stats.total },
  ];

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case "attended": case "approved": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "no_show": case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
  };

  const getAttendanceLabel = (status: string) => {
    switch (status) {
      case "attended": return "Compareceu";
      case "approved": return "Confirmado";
      case "no_show": return "Não veio";
      case "rejected": return "Rejeitado";
      default: return "Pendente";
    }
  };

  const renderAgendamentoCard = (a: any) => {
    const isExpanded = expandedId === a.id;
    const scheduled = a.scheduledDate ? Number(a.scheduledDate) : null;
    return (
      <div key={a.id} className="racing-card p-3 space-y-2 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {a.ticketNumber && (
              <span className="text-xs font-mono font-bold text-primary flex items-center gap-1">
                <Hash className="h-3 w-3" />{a.ticketNumber}
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getAttendanceColor(a.attendanceStatus)}`}>
              {getAttendanceLabel(a.attendanceStatus)}
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setExpandedId(isExpanded ? null : a.id)} className="h-6 w-6 p-0">
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{a.customerName || "Cliente"}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {a.customerPhone && (
              <a href={`tel:${a.customerPhone}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary">
                <Phone className="h-3 w-3" /> {a.customerPhone}
              </a>
            )}
            {a.vehicleInterest && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Car className="h-3 w-3" /> {a.vehicleInterest}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {a.sellerName}
          </span>
          {scheduled && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date(scheduled).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        {isExpanded && (
          <div className="pt-2 border-t border-border space-y-2">
            {a.notes && <p className="text-xs text-muted-foreground italic">"{a.notes}"</p>}
            <div className="flex gap-2">
              {a.customerPhone && (
                <a
                  href={`https://wa.me/55${a.customerPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
              {a.customerPhone && (
                <a
                  href={`tel:${a.customerPhone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" /> Ligar
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={LOGO_URL} alt="Kafka" className="h-7 w-7 rounded" />
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-heading font-bold text-sm text-foreground">FEIRÃO KAFKA</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div className="racing-card p-3 text-center">
            <div className="font-heading font-bold text-xl text-orange-400">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Total</div>
          </div>
          <div className="racing-card p-3 text-center">
            <div className="font-heading font-bold text-xl text-emerald-400">{stats.compareceram}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Vieram</div>
          </div>
          <div className="racing-card p-3 text-center">
            <div className="font-heading font-bold text-xl text-red-400">{stats.naoVieram}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Não vieram</div>
          </div>
          <div className="racing-card p-3 text-center">
            <div className="font-heading font-bold text-xl text-yellow-400">{stats.pendentes}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Pendentes</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                tab === t.key
                  ? "bg-orange-600 text-white shadow-lg"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-white/20" : "bg-background"
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ===== TAB RANKING ===== */}
        {tab === "ranking" && (
          <div className="space-y-4">
            {loadingRanking ? (
              <div className="text-center py-12 text-muted-foreground">Carregando ranking...</div>
            ) : !ranking || ranking.length === 0 ? (
              <div className="racing-card p-8 text-center">
                <Flame className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Nenhum agendamento de feirão ainda</p>
              </div>
            ) : (
              <>
                {/* Pódio Top 3 */}
                <div className="space-y-3">
                  {ranking.slice(0, 3).map((r: any, i: number) => {
                    const config = PODIUM_COLORS[i];
                    const PodiumIcon = config.icon;
                    return (
                      <div key={r.sellerId} className={`racing-card p-4 border-2 ${config.border} bg-gradient-to-r ${config.bg}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.text} bg-background/50`}>
                            <PodiumIcon className="h-7 w-7" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-heading font-bold text-lg ${config.text}`}>#{i + 1}</span>
                              <span className="font-bold text-foreground">{r.sellerName}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{r.department === 'pre_vendas' ? 'SDR' : 'Vendedor'}</span>
                            </div>
                            <div className="flex gap-4 mt-1 text-xs">
                              <span className="text-orange-400 font-bold">{r.total} agendados</span>
                              <span className="text-emerald-400">{r.compareceram || 0} vieram</span>
                              <span className="text-red-400">{r.naoVieram || 0} faltaram</span>
                            </div>
                          </div>
                          <div className={`text-right ${config.text}`}>
                            <div className="font-heading font-bold text-3xl">{r.total}</div>
                            <div className="text-[10px] text-muted-foreground">agendamentos</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Restante do ranking */}
                {ranking.length > 3 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Demais participantes</h3>
                    {ranking.slice(3).map((r: any, i: number) => (
                      <div key={r.sellerId} className="racing-card p-3 flex items-center gap-3">
                        <span className="w-8 text-center font-heading font-bold text-muted-foreground">#{i + 4}</span>
                        <div className="flex-1">
                          <span className="font-semibold text-sm text-foreground">{r.sellerName}</span>
                          <span className="text-[10px] ml-2 text-muted-foreground">{r.department === 'pre_vendas' ? 'SDR' : 'Vendedor'}</span>
                        </div>
                        <div className="flex gap-3 text-xs">
                          <span className="text-orange-400 font-bold">{r.total}</span>
                          <span className="text-emerald-400">{r.compareceram || 0}</span>
                          <span className="text-red-400">{r.naoVieram || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== TAB CONFERÊNCIA ===== */}
        {tab === "conferencia" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por cliente, telefone, vendedor..."
                className="pl-10"
              />
            </div>

            {loadingAgendamentos ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : (
              <>
                {/* Pendentes */}
                {conferencia.pendentes.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">
                      <Timer className="h-3.5 w-3.5" /> Aguardando conferência ({conferencia.pendentes.length})
                    </h3>
                    {conferencia.pendentes.map(renderAgendamentoCard)}
                  </div>
                )}

                {/* Compareceram */}
                {conferencia.compareceram.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Compareceram ({conferencia.compareceram.length})
                    </h3>
                    {conferencia.compareceram.map(renderAgendamentoCard)}
                  </div>
                )}

                {/* Não vieram */}
                {conferencia.naoVieram.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                      <XCircle className="h-3.5 w-3.5" /> Não compareceram ({conferencia.naoVieram.length})
                    </h3>
                    {conferencia.naoVieram.map(renderAgendamentoCard)}
                  </div>
                )}

                {filteredAgendamentos.length === 0 && (
                  <div className="racing-card p-8 text-center">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">Nenhum agendamento encontrado</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== TAB TODOS ===== */}
        {tab === "todos" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por cliente, telefone, vendedor..."
                className="pl-10"
              />
            </div>

            {loadingAgendamentos ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : filteredAgendamentos.length === 0 ? (
              <div className="racing-card p-8 text-center">
                <Flame className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Nenhum agendamento de feirão</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAgendamentos.map(renderAgendamentoCard)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
