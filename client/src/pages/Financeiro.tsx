import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { 
  DollarSign, ArrowLeft, Wrench, Clock, ChevronDown, ChevronUp, Phone, Car, 
  User, AlertTriangle, MapPin, FileText, MessageCircle, PhoneCall, Search,
  Plus, CheckCircle, X, Calendar, Receipt, TrendingUp, TrendingDown, LogOut
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  aberto: { label: "Aberto", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/40", emoji: "🔵" },
  agendado: { label: "Agendado", color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/40", emoji: "📅" },
  em_servico: { label: "Em Serviço", color: "text-orange-400", bg: "bg-orange-500/20", border: "border-orange-500/40", emoji: "🔧" },
  finalizado: { label: "Finalizado", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/40", emoji: "✅" },
  entregue: { label: "Entregue", color: "text-gray-400", bg: "bg-gray-500/20", border: "border-gray-500/40", emoji: "🚗" },
};

function formatDate(d: any) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

type MainTab = "pos-venda" | "contas";

export default function Financeiro() {
  const [, navigate] = useLocation();
  const [mainTab, setMainTab] = useState<MainTab>("pos-venda");
  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const logoutMutation = trpc.sellers.logout.useMutation({
    onSuccess: () => navigate("/"),
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-gray-500 hover:text-gray-300">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <div>
              <span className="font-bold text-white text-sm">Financeiro</span>
              {sellerSession && (
                <p className="text-[10px] text-gray-500">{sellerSession.nickname || sellerSession.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => logoutMutation.mutate()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
            <img src={LOGO_URL} alt="Kafka" className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="border-b border-gray-800 bg-gray-950/80">
        <div className="container flex px-4">
          <button
            onClick={() => setMainTab("pos-venda")}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all ${
              mainTab === "pos-venda"
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Wrench className="h-4 w-4 inline mr-1.5" />
            Pós-Venda
          </button>
          <button
            onClick={() => setMainTab("contas")}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all ${
              mainTab === "contas"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Receipt className="h-4 w-4 inline mr-1.5" />
            Contas
          </button>
        </div>
      </div>

      {mainTab === "pos-venda" ? <PosVendaTab /> : <ContasTab />}
    </div>
  );
}

// ===== PÓS-VENDA TAB =====
function PosVendaTab() {
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: chamados } = trpc.pvChamados.list.useQuery({});
  const [filter, setFilter] = useState("todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allChamados = chamados || [];
  const filtered = useMemo(() => {
    let list = allChamados;
    if (filter !== "todos") list = list.filter((c: any) => c.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c: any) =>
        c.clienteNome?.toLowerCase().includes(q) ||
        c.carroModelo?.toLowerCase().includes(q) ||
        c.carroPlaca?.toLowerCase().includes(q) ||
        c.ticketNumber?.toString().includes(q)
      );
    }
    return list;
  }, [allChamados, filter, searchQuery]);

  const counts = useMemo(() => ({
    todos: allChamados.length,
    aberto: allChamados.filter((c: any) => c.status === "aberto").length,
    em_servico: allChamados.filter((c: any) => c.status === "em_servico").length,
    finalizado: allChamados.filter((c: any) => c.status === "finalizado").length,
  }), [allChamados]);

  const sellerName = (id: number) => {
    const s = (sellers || []).find((s: any) => s.id === id);
    return s?.nickname || s?.name || "—";
  };

  return (
    <div className="container max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Contadores */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: "aberto", label: "Abertos", count: counts.aberto, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { key: "em_servico", label: "Em Serviço", count: counts.em_servico, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
          { key: "finalizado", label: "Finalizados", count: counts.finalizado, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        ].map(c => (
          <button key={c.key} onClick={() => setFilter(f => f === c.key ? "todos" : c.key)} className={`rounded-xl p-3 border text-center transition-all ${c.bg} ${filter === c.key ? 'ring-2 ring-orange-500/50' : ''}`}>
            <p className={`text-xl font-bold ${c.color}`}>{c.count}</p>
            <p className="text-[10px] text-gray-500">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por cliente, carro, placa..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-orange-500 focus:outline-none"
        />
      </div>

      {/* Lista de chamados */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((c: any) => {
            const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.aberto;
            const prazo = c.prazoEntrega ? new Date(c.prazoEntrega) : null;
            const isOverdue = prazo && prazo.getTime() < Date.now() && c.status !== "entregue" && c.status !== "finalizado";
            const isExpanded = expandedId === c.id;
            return (
              <div key={c.id} className={`rounded-xl border transition-all ${sc.bg} ${sc.border}`}>
                <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="w-full p-4 text-left">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-gray-600">#{c.ticketNumber}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} font-semibold border ${sc.border}`}>
                          {sc.emoji} {sc.label}
                        </span>
                        {isOverdue && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/30 text-red-400 font-bold animate-pulse">ATRASADO</span>}
                      </div>
                      <p className="text-white font-bold text-sm mt-1">{c.clienteNome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500">{c.carroModelo} {c.carroPlaca ? `• ${c.carroPlaca}` : ""}</p>
                        {c.vendedorId && <span className="text-[10px] text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded">{sellerName(c.vendedorId)}</span>}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-1">{c.problemaRelatado}</p>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-800/50 pt-3 space-y-3">
                    <div className="text-xs space-y-1.5">
                      <p className="text-gray-400"><span className="text-gray-600">Problema:</span> {c.problemaRelatado}</p>
                      {c.observacoes && <p className="text-gray-400"><span className="text-gray-600">Obs:</span> {c.observacoes}</p>}
                      {c.servicoRealizado && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2">
                          <p className="text-[10px] text-orange-400 uppercase font-bold mb-0.5"><Wrench className="h-3 w-3 inline" /> O que está sendo feito</p>
                          <p className="text-gray-300 text-xs">{c.servicoRealizado}</p>
                        </div>
                      )}
                      {c.clienteTelefone && <p className="text-gray-400 flex items-center gap-1"><Phone className="h-3 w-3" /> {c.clienteTelefone}</p>}
                    </div>
                    {c.clienteTelefone && (
                      <div className="grid grid-cols-2 gap-2">
                        <a href={`https://wa.me/55${c.clienteTelefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
                        <a href={`tel:${c.clienteTelefone}`} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"><PhoneCall className="w-4 h-4" /> Ligar</a>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 pt-1">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(c.createdAt)}</span>
                      {prazo && <span className={isOverdue ? "text-red-400 font-bold" : ""}>Prazo: {formatDate(c.prazoEntrega)}</span>}
                      {c.oficinaNome && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.oficinaNome}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-10 text-center">
          <Wrench className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum chamado encontrado.</p>
        </div>
      )}
    </div>
  );
}

// ===== CONTAS TAB (Exclusivo Financeiro) =====
function ContasTab() {
  const { data: categories } = trpc.finCategories.list.useQuery();
  const { data: transactionsData } = trpc.finTransactions.list.useQuery({});
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const allTransactions: any[] = (transactionsData as any)?.items || (Array.isArray(transactionsData) ? transactionsData : []);
  
  const filtered = useMemo(() => {
    let list = allTransactions;
    const now = Date.now();
    if (filter === "pending") list = list.filter((t: any) => t.status === "pending" && t.dueDate >= now);
    else if (filter === "paid") list = list.filter((t: any) => t.status === "paid");
    else if (filter === "overdue") list = list.filter((t: any) => t.status === "pending" && t.dueDate < now);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t: any) => t.description?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q));
    }
    return list.sort((a: any, b: any) => a.dueDate - b.dueDate);
  }, [allTransactions, filter, searchQuery]);

  const stats = useMemo(() => {
    const now = Date.now();
    const pending = allTransactions.filter((t: any) => t.status === "pending");
    const paid = allTransactions.filter((t: any) => t.status === "paid");
    const overdue = pending.filter((t: any) => t.dueDate < now);
    const totalPending = pending.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const totalPaid = paid.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const totalOverdue = overdue.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    return { pending: pending.length, paid: paid.length, overdue: overdue.length, totalPending, totalPaid, totalOverdue };
  }, [allTransactions]);

  const getCategoryName = (catId: number) => {
    const cat = (categories || []).find((c: any) => c.id === catId);
    return cat?.name || "Sem categoria";
  };

  return (
    <div className="container max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setFilter(f => f === "overdue" ? "all" : "overdue")} className={`rounded-xl p-3 border text-center transition-all bg-red-500/10 border-red-500/20 ${filter === "overdue" ? 'ring-2 ring-red-500/50' : ''}`}>
          <p className="text-xl font-bold text-red-400">{stats.overdue}</p>
          <p className="text-[10px] text-gray-500">Vencidas</p>
          <p className="text-[9px] text-red-400/70">{formatCurrency(stats.totalOverdue)}</p>
        </button>
        <button onClick={() => setFilter(f => f === "pending" ? "all" : "pending")} className={`rounded-xl p-3 border text-center transition-all bg-amber-500/10 border-amber-500/20 ${filter === "pending" ? 'ring-2 ring-amber-500/50' : ''}`}>
          <p className="text-xl font-bold text-amber-400">{stats.pending}</p>
          <p className="text-[10px] text-gray-500">Pendentes</p>
          <p className="text-[9px] text-amber-400/70">{formatCurrency(stats.totalPending)}</p>
        </button>
        <button onClick={() => setFilter(f => f === "paid" ? "all" : "paid")} className={`rounded-xl p-3 border text-center transition-all bg-emerald-500/10 border-emerald-500/20 ${filter === "paid" ? 'ring-2 ring-emerald-500/50' : ''}`}>
          <p className="text-xl font-bold text-emerald-400">{stats.paid}</p>
          <p className="text-[10px] text-gray-500">Pagas</p>
          <p className="text-[9px] text-emerald-400/70">{formatCurrency(stats.totalPaid)}</p>
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por descrição..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Lista de transações */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((t: any) => {
            const now = Date.now();
            const isOverdue = t.status === "pending" && t.dueDate < now;
            const isPaid = t.status === "paid";
            const isExpense = t.type === "expense";
            return (
              <div key={t.id} className={`rounded-xl border p-4 transition-all ${
                isOverdue ? "bg-red-500/10 border-red-500/30" :
                isPaid ? "bg-emerald-500/10 border-emerald-500/30" :
                "bg-gray-900/60 border-gray-800"
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isExpense ? <TrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" /> : <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                      <p className="text-sm font-bold text-white truncate">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="bg-gray-800 px-1.5 py-0.5 rounded">{getCategoryName(t.categoryId)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(t.dueDate)}</span>
                      {isOverdue && <span className="text-red-400 font-bold">VENCIDA</span>}
                      {isPaid && <span className="text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle className="h-3 w-3" /> Paga</span>}
                    </div>
                  </div>
                  <p className={`text-sm font-bold shrink-0 ml-2 ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
                  </p>
                </div>
                {t.notes && <p className="text-[11px] text-gray-500 mt-2 line-clamp-1">{t.notes}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-10 text-center">
          <Receipt className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma conta encontrada.</p>
        </div>
      )}
    </div>
  );
}
