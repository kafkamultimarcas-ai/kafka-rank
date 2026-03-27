import { trpc } from "@/lib/trpc";
import { useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { 
  DollarSign, ArrowLeft, Wrench, Clock, ChevronDown, ChevronUp, Phone, Car, 
  User, AlertTriangle, MapPin, FileText, MessageCircle, PhoneCall, Search,
  Plus, CheckCircle, X, Calendar, Receipt, TrendingUp, TrendingDown, LogOut,
  Fuel, Mic, MicOff, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

type MainTab = "pos-venda" | "contas" | "gasolina";

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
          <button
            onClick={() => setMainTab("gasolina")}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all ${
              mainTab === "gasolina"
                ? "border-yellow-500 text-yellow-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Fuel className="h-4 w-4 inline mr-1.5" />
            Gasolina
          </button>
        </div>
      </div>

      {mainTab === "pos-venda" ? <PosVendaTab /> : mainTab === "contas" ? <ContasTab /> : <GasolinaTab />}
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


// ===== GASOLINA TAB =====
function GasolinaTab() {
  const { data: fuelRecords, refetch } = trpc.fuel.list.useQuery({});
  const { data: inventory } = trpc.crmInventory.list.useQuery();
  const createFuel = trpc.fuel.create.useMutation({
    onSuccess: () => { refetch(); setShowForm(false); resetForm(); toast.success("Abastecimento registrado!"); },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [fuelType, setFuelType] = useState("gasolina");
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [odometer, setOdometer] = useState("");
  const [gasStation, setGasStation] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const resetForm = () => {
    setVehiclePlate(""); setVehicleModel(""); setFuelType("gasolina");
    setLiters(""); setPricePerLiter(""); setTotalCost("");
    setOdometer(""); setGasStation(""); setNotes("");
  };

  // Auto-calculate total
  const calcTotal = () => {
    const l = parseFloat(liters);
    const p = parseFloat(pricePerLiter);
    if (l > 0 && p > 0) setTotalCost((l * p).toFixed(2));
  };

  // Auto-fill vehicle model from plate
  const handlePlateChange = (plate: string) => {
    setVehiclePlate(plate.toUpperCase());
    if (inventory && plate.length >= 7) {
      const match = inventory.find((v: any) => v.plate?.toUpperCase() === plate.toUpperCase());
      if (match) setVehicleModel(`${match.brand} ${match.model}`);
    }
  };

  const handleSubmit = () => {
    if (!vehiclePlate || !totalCost || !vehicleModel) {
      toast.error("Preencha pelo menos a placa, veículo e o valor total.");
      return;
    }
    createFuel.mutate({
      vehiclePlate: vehiclePlate.toUpperCase(),
      vehicleModel,
      fuelType: fuelType as "gasolina" | "etanol" | "diesel" | "gnv",
      liters: liters || "0",
      pricePerLiter: pricePerLiter || "0",
      totalCost: totalCost,
      odometer: odometer ? parseInt(odometer) : undefined,
      gasStation: gasStation || undefined,
      notes: notes || undefined,
      fuelDate: Date.now(),
    });
  };

  const allRecords: any[] = fuelRecords || [];
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allRecords;
    const q = searchQuery.toLowerCase();
    return allRecords.filter((r: any) =>
      r.vehiclePlate?.toLowerCase().includes(q) ||
      r.vehicleModel?.toLowerCase().includes(q) ||
      r.gasStation?.toLowerCase().includes(q)
    );
  }, [allRecords, searchQuery]);

  const stats = useMemo(() => {
    const thisMonth = allRecords.filter((r: any) => {
      const d = new Date(r.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalLiters = thisMonth.reduce((s: number, r: any) => s + Number(r.liters || 0), 0);
    const totalCost = thisMonth.reduce((s: number, r: any) => s + Number(r.totalCost || 0), 0);
    return { count: thisMonth.length, totalLiters, totalCost };
  }, [allRecords]);

  return (
    <div className="container max-w-lg mx-auto px-4 py-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 border text-center bg-yellow-500/10 border-yellow-500/20">
          <p className="text-xl font-bold text-yellow-400">{stats.count}</p>
          <p className="text-[10px] text-gray-500">Abastec. mês</p>
        </div>
        <div className="rounded-xl p-3 border text-center bg-blue-500/10 border-blue-500/20">
          <p className="text-xl font-bold text-blue-400">{stats.totalLiters.toFixed(1)}L</p>
          <p className="text-[10px] text-gray-500">Litros mês</p>
        </div>
        <div className="rounded-xl p-3 border text-center bg-emerald-500/10 border-emerald-500/20">
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.totalCost)}</p>
          <p className="text-[10px] text-gray-500">Gasto mês</p>
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition-all"
      >
        {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showForm ? "Cancelar" : "Novo Abastecimento"}
      </button>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Placa *</label>
              <Input value={vehiclePlate} onChange={e => handlePlateChange(e.target.value)}
                placeholder="ABC1D23" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" maxLength={7} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Veículo</label>
              <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)}
                placeholder="Marca / Modelo" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Combustível</label>
              <select value={fuelType} onChange={e => setFuelType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md text-white h-9 text-sm px-2">
                <option value="gasolina">Gasolina</option>
                <option value="etanol">Etanol</option>
                <option value="diesel">Diesel</option>
                <option value="gnv">GNV</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Litros</label>
              <Input type="number" value={liters} onChange={e => setLiters(e.target.value)} onBlur={calcTotal}
                placeholder="0.00" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">R$/Litro</label>
              <Input type="number" value={pricePerLiter} onChange={e => setPricePerLiter(e.target.value)} onBlur={calcTotal}
                placeholder="0.00" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Total (R$) *</label>
              <Input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)}
                placeholder="0.00" className="bg-gray-800 border-gray-700 text-white h-9 text-sm font-bold" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">KM</label>
              <Input type="number" value={odometer} onChange={e => setOdometer(e.target.value)}
                placeholder="Odômetro" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Posto</label>
            <Input value={gasStation} onChange={e => setGasStation(e.target.value)}
              placeholder="Nome do posto" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Observações</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Abastecimento para test drive" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
          </div>

          {/* Audio launcher */}
          <AudioLauncher onResult={(parsed: any) => {
            if (parsed.vehiclePlate) setVehiclePlate(parsed.vehiclePlate);
            if (parsed.vehicleModel) setVehicleModel(parsed.vehicleModel);
            if (parsed.fuelType) setFuelType(parsed.fuelType);
            if (parsed.liters) setLiters(String(parsed.liters));
            if (parsed.pricePerLiter) setPricePerLiter(String(parsed.pricePerLiter));
            if (parsed.totalCost) setTotalCost(String(parsed.totalCost));
            if (parsed.odometer) setOdometer(String(parsed.odometer));
            if (parsed.gasStation) setGasStation(parsed.gasStation);
            if (parsed.notes) setNotes(parsed.notes);
            toast.success("Dados preenchidos pelo áudio!");
          }} context="gasolina" />

          <Button onClick={handleSubmit} disabled={createFuel.isPending}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold">
            {createFuel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Fuel className="h-4 w-4 mr-2" /> Registrar Abastecimento</>}
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar por placa, veículo ou posto..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-yellow-500 focus:outline-none" />
      </div>

      {/* Records list */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((r: any) => (
            <div key={r.id} className="rounded-xl border bg-gray-900/60 border-gray-800 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Fuel className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                    <p className="text-sm font-bold text-white">{r.vehiclePlate}</p>
                    {r.vehicleModel && <span className="text-xs text-gray-400">{r.vehicleModel}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                    <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold">{r.fuelType}</span>
                    {r.liters && <span>{Number(r.liters).toFixed(1)}L</span>}
                    {r.pricePerLiter && <span>R${Number(r.pricePerLiter).toFixed(2)}/L</span>}
                    {r.odometer && <span>{r.odometer.toLocaleString("pt-BR")} km</span>}
                    {r.gasStation && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.gasStation}</span>}
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(r.createdAt)}</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-yellow-400 shrink-0 ml-2">{formatCurrency(Number(r.totalCost))}</p>
              </div>
              {r.notes && <p className="text-[11px] text-gray-500 mt-2">{r.notes}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-10 text-center">
          <Fuel className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum abastecimento registrado.</p>
        </div>
      )}
    </div>
  );
}

// ===== AUDIO LAUNCHER (reusable for Contas and Gasolina) =====
function AudioLauncher({ onResult, context }: { onResult: (parsed: any) => void; context: "conta_pagar" | "conta_receber" | "gasolina" }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const uploadMedia = trpc.crmChat.uploadMedia.useMutation();
  const parseAudio = trpc.finTransactions.parseAudio.useMutation({
    onSuccess: (data: any) => {
      onResult(data);
      setProcessing(false);
    },
    onError: (e: any) => {
      toast.error("Erro ao processar áudio: " + e.message);
      setProcessing(false);
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setProcessing(true);

        // Upload audio first, then parse
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            const { url } = await uploadMedia.mutateAsync({ base64, filename: "audio.webm", mimeType: "audio/webm" });
            parseAudio.mutate({ audioUrl: url, context });
          } catch (err: any) {
            toast.error("Erro no upload do áudio: " + err.message);
            setProcessing(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setRecording(true);
      toast.info("Gravando... Fale os dados do lançamento.");
    } catch (err) {
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {processing ? (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 w-full">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processando áudio com IA...
        </div>
      ) : recording ? (
        <button onClick={stopRecording}
          className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 w-full animate-pulse">
          <MicOff className="h-4 w-4" />
          Gravando... Toque para parar
        </button>
      ) : (
        <button onClick={startRecording}
          className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 w-full hover:bg-gray-700 hover:text-white transition-all">
          <Mic className="h-4 w-4" />
          {context === "gasolina" ? "Lançar por áudio (ex: 'Abasteci 40 litros no Corolla placa ABC1D23')" : "Lançar conta por áudio"}
        </button>
      )}
    </div>
  );
}
