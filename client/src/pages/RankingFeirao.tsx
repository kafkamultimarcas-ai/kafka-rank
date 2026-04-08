import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import {
  Flame, Trophy, ArrowLeft, Search, UserCheck, UserX, Clock,
  Phone, Calendar, Car, Hash, ChevronDown, ChevronUp, Crown,
  Medal, Award, Users, CheckCircle2, XCircle, Timer, Plus,
  ChevronRight, Archive,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

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
  const [showEditions, setShowEditions] = useState(false);
  const [selectedEditionId, setSelectedEditionId] = useState<number | undefined>(undefined);
  const [showCreateEdition, setShowCreateEdition] = useState(false);
  const [newEditionNumber, setNewEditionNumber] = useState(40);
  const [newEditionName, setNewEditionName] = useState("");
  // toast via sonner
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Carregar edições
  const { data: editions, refetch: refetchEditions } = trpc.sdr.listEditions.useQuery();
  const { data: activeEdition } = trpc.sdr.activeEdition.useQuery();

  // Usar edição selecionada ou ativa
  const currentEditionId = selectedEditionId ?? activeEdition?.id;
  const currentEdition = editions?.find((e: any) => e.id === currentEditionId) || activeEdition;

  const { data: ranking, isLoading: loadingRanking } = trpc.sdr.rankingFeirao.useQuery({ editionId: currentEditionId });
  const { data: agendamentos, isLoading: loadingAgendamentos } = trpc.sdr.listFeirao.useQuery({ editionId: currentEditionId });

  const createEditionMut = trpc.sdr.createEdition.useMutation({
    onSuccess: () => {
      toast.success("Nova edição criada! A edição anterior foi finalizada automaticamente.");
      refetchEditions();
      setShowCreateEdition(false);
    },
    onError: (err) => toast.error(err.message),
  });
  const finishEditionMut = trpc.sdr.finishEdition.useMutation({
    onSuccess: () => {
      toast.success("Edição finalizada!");
      refetchEditions();
    },
  });

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
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowEditions(true)} className="gap-1 text-xs border-orange-500/30 text-orange-400">
              <Archive className="h-3.5 w-3.5" /> Edições
            </Button>
          )}
        </div>
      </header>

      <div className="container py-4 space-y-4">
        {/* Seletor de Edição */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {editions?.map((ed: any) => (
            <button
              key={ed.id}
              onClick={() => setSelectedEditionId(ed.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
                currentEditionId === ed.id
                  ? "bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-500/20"
                  : ed.status === "finished"
                    ? "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    : "bg-muted text-foreground border-border hover:bg-muted/80"
              }`}
            >
              {ed.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              Ed. {ed.editionNumber}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => {
                const maxNum = editions?.length ? Math.max(...editions.map((e: any) => e.editionNumber)) : 39;
                setNewEditionNumber(maxNum + 1);
                setNewEditionName(`Feirão Kafka Ed. ${maxNum + 1}`);
                setShowCreateEdition(true);
              }}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-orange-500/40 text-orange-400 hover:bg-orange-500/10 transition-all flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Nova Edição
            </button>
          )}
        </div>

        {/* Título da edição atual */}
        {currentEdition && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-lg text-foreground">{currentEdition.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  currentEdition.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                }`}>
                  {currentEdition.status === "active" ? "🟢 AO VIVO" : "📁 Finalizado"}
                </span>
              </div>
            </div>
          </div>
        )}

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
                <p className="text-muted-foreground font-medium">Nenhum agendamento de feirão nesta edição</p>
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
                {conferencia.pendentes.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">
                      <Timer className="h-3.5 w-3.5" /> Aguardando conferência ({conferencia.pendentes.length})
                    </h3>
                    {conferencia.pendentes.map(renderAgendamentoCard)}
                  </div>
                )}

                {conferencia.compareceram.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Compareceram ({conferencia.compareceram.length})
                    </h3>
                    {conferencia.compareceram.map(renderAgendamentoCard)}
                  </div>
                )}

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
                <p className="text-muted-foreground font-medium">Nenhum agendamento de feirão nesta edição</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAgendamentos.map(renderAgendamentoCard)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog: Gerenciar Edições */}
      <Dialog open={showEditions} onOpenChange={setShowEditions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-orange-500" /> Edições do Feirão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {editions?.map((ed: any) => (
              <div key={ed.id} className={`p-3 rounded-lg border ${ed.status === 'active' ? 'border-green-500/50 bg-green-500/5' : 'border-border bg-muted/30'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{ed.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        ed.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {ed.status === 'active' ? 'Ativo' : 'Finalizado'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criado em {new Date(ed.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {ed.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => finishEditionMut.mutate({ id: ed.id })}
                      >
                        Finalizar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => { setSelectedEditionId(ed.id); setShowEditions(false); }}
                    >
                      Ver <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {(!editions || editions.length === 0) && (
              <p className="text-center text-muted-foreground py-4">Nenhuma edição criada</p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const maxNum = editions?.length ? Math.max(...editions.map((e: any) => e.editionNumber)) : 39;
                setNewEditionNumber(maxNum + 1);
                setNewEditionName(`Feirão Kafka Ed. ${maxNum + 1}`);
                setShowCreateEdition(true);
                setShowEditions(false);
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" /> Criar Nova Edição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Criar Nova Edição */}
      <Dialog open={showCreateEdition} onOpenChange={setShowCreateEdition}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-orange-500" /> Nova Edição do Feirão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Número da Edição</label>
              <Input
                type="number"
                value={newEditionNumber}
                onChange={e => setNewEditionNumber(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Nome</label>
              <Input
                value={newEditionName}
                onChange={e => setNewEditionName(e.target.value)}
                placeholder="Ex: Feirão Kafka Ed. 40"
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A edição ativa atual será finalizada automaticamente ao criar uma nova.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateEdition(false)}>Cancelar</Button>
            <Button
              onClick={() => createEditionMut.mutate({ editionNumber: newEditionNumber, name: newEditionName || `Feirão Kafka Ed. ${newEditionNumber}` })}
              disabled={createEditionMut.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {createEditionMut.isPending ? "Criando..." : "Criar Edição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
