import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Wrench, ArrowLeft, Plus, Phone, Car, User, AlertTriangle, MapPin, Clock, ChevronDown, ChevronUp, FileText, MessageCircle, PhoneCall, X, Search } from "lucide-react";
import { useBranding } from "@/contexts/TenantContext";

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

export default function PosVenda() {
  const { logoUrl } = useBranding();
  const [, navigate] = useLocation();
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formSellerId, setFormSellerId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    clienteNome: "", clienteTelefone: "", carroModelo: "", carroPlaca: "", problemaRelatado: "", observacoes: "",
  });

  // Buscar TODOS os chamados sem filtro de vendedor
  const { data: chamados, refetch } = trpc.pvChamados.list.useQuery({});

  const createMutation = trpc.pvChamados.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowForm(false);
      setForm({ clienteNome: "", clienteTelefone: "", carroModelo: "", carroPlaca: "", problemaRelatado: "", observacoes: "" });
      setFormSellerId(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

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
    agendado: allChamados.filter((c: any) => c.status === "agendado").length,
    em_servico: allChamados.filter((c: any) => c.status === "em_servico").length,
    finalizado: allChamados.filter((c: any) => c.status === "finalizado").length,
    entregue: allChamados.filter((c: any) => c.status === "entregue").length,
  }), [allChamados]);

  const sellerName = (id: number) => {
    const s = (sellers || []).find((s: any) => s.id === id);
    return s?.nickname || s?.name || "—";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-gray-500 hover:text-gray-300">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Wrench className="h-5 w-5 text-orange-400" />
            <span className="font-bold text-white">Pós-Venda</span>
            <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{allChamados.length} chamados</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Novo
            </button>
            <img src={logoUrl} alt="" className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      </header>

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
            placeholder="Buscar por cliente, carro, placa ou ticket..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "todos", label: "Todos", count: counts.todos },
            { key: "aberto", label: "Abertos", count: counts.aberto },
            { key: "agendado", label: "Agendados", count: counts.agendado },
            { key: "em_servico", label: "Em Serviço", count: counts.em_servico },
            { key: "finalizado", label: "Finalizados", count: counts.finalizado },
            { key: "entregue", label: "Entregues", count: counts.entregue },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                filter === tab.key
                  ? "bg-orange-600 text-white shadow-lg"
                  : "bg-gray-800/60 text-gray-400 hover:bg-gray-700/60"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? "bg-white/20" : "bg-gray-700"
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Formulário de abertura (modal overlay) */}
        {showForm && (
          <div className="bg-gray-900 border border-orange-500/30 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-orange-500/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" /> Abrir Chamado
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* Vendedor que está abrindo */}
              <div>
                <label className="text-[11px] text-gray-500 font-medium mb-1 block flex items-center gap-1">
                  <User className="h-3 w-3" /> Vendedor Responsável *
                </label>
                <select
                  value={formSellerId ?? ""}
                  onChange={(e) => setFormSellerId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Selecione o vendedor...</option>
                  {(sellers || []).filter((s: any) => s.department === 'vendas' || !s.department).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.nickname || s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium mb-1 block flex items-center gap-1">
                  <User className="h-3 w-3" /> Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={form.clienteNome}
                  onChange={(e) => setForm(f => ({ ...f, clienteNome: e.target.value }))}
                  placeholder="Ex: João Silva"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium mb-1 block flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefone
                </label>
                <input
                  type="tel"
                  value={form.clienteTelefone}
                  onChange={(e) => setForm(f => ({ ...f, clienteTelefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 font-medium mb-1 block flex items-center gap-1">
                    <Car className="h-3 w-3" /> Carro *
                  </label>
                  <input
                    type="text"
                    value={form.carroModelo}
                    onChange={(e) => setForm(f => ({ ...f, carroModelo: e.target.value }))}
                    placeholder="Onix 2022"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 font-medium mb-1 block">Placa</label>
                  <input
                    type="text"
                    value={form.carroPlaca}
                    onChange={(e) => setForm(f => ({ ...f, carroPlaca: e.target.value.toUpperCase() }))}
                    placeholder="ABC1D23"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium mb-1 block flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Problema Relatado *
                </label>
                <textarea
                  value={form.problemaRelatado}
                  onChange={(e) => setForm(f => ({ ...f, problemaRelatado: e.target.value }))}
                  placeholder="Descreva o problema que o cliente relatou..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-medium mb-1 block flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Observações
                </label>
                <input
                  type="text"
                  value={form.observacoes}
                  onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Algo a mais..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium hover:bg-gray-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!formSellerId) { toast.error("Selecione o vendedor responsável!"); return; }
                    if (!form.clienteNome.trim() || !form.carroModelo.trim() || !form.problemaRelatado.trim()) {
                      toast.error("Preencha nome do cliente, carro e problema!");
                      return;
                    }
                    createMutation.mutate({
                      clienteNome: form.clienteNome.trim(),
                      clienteTelefone: form.clienteTelefone.trim() || undefined,
                      carroModelo: form.carroModelo.trim(),
                      carroPlaca: form.carroPlaca.trim() || undefined,
                      problemaRelatado: form.problemaRelatado.trim(),
                      observacoes: form.observacoes.trim() || undefined,
                      vendedorId: formSellerId,
                    });
                  }}
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? "Enviando..." : "Abrir Chamado"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de chamados */}
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((c: any) => {
              const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.aberto;
              const prazo = c.prazoEntrega ? new Date(c.prazoEntrega) : null;
              const isOverdue = prazo && prazo.getTime() < Date.now() && c.status !== "entregue" && c.status !== "finalizado";
              const isExpanded = expandedId === c.id;

              return (
                <div
                  key={c.id}
                  className={`rounded-xl border transition-all ${sc.bg} ${sc.border}`}
                >
                  {/* Card principal - clicável */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-gray-600">#{c.ticketNumber}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} font-semibold border ${sc.border}`}>
                            {sc.emoji} {sc.label}
                          </span>
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/30 text-red-400 font-bold animate-pulse">
                              ATRASADO
                            </span>
                          )}
                        </div>
                        <p className="text-white font-bold text-sm mt-1">{c.clienteNome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-500">{c.carroModelo} {c.carroPlaca ? `• ${c.carroPlaca}` : ""}</p>
                          {c.vendedorId && (
                            <span className="text-[10px] text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded">
                              {sellerName(c.vendedorId)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {c.problemaRelatado}
                    </p>
                  </button>

                  {/* Detalhes expandidos */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-800/50 pt-3 space-y-3">
                      <div className="text-xs space-y-1.5">
                        <p className="text-gray-400"><span className="text-gray-600">Problema:</span> {c.problemaRelatado}</p>
                        {c.observacoes && <p className="text-gray-400"><span className="text-gray-600">Obs:</span> {c.observacoes}</p>}
                        {c.servicoRealizado && (
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 mt-1">
                            <p className="text-[10px] text-orange-400 uppercase font-bold mb-0.5 flex items-center gap-1">
                              <Wrench className="h-3 w-3" /> O que está sendo feito
                            </p>
                            <p className="text-gray-300 text-xs">{c.servicoRealizado}</p>
                          </div>
                        )}
                        {c.clienteTelefone && (
                          <p className="text-gray-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {c.clienteTelefone}
                          </p>
                        )}
                      </div>

                      {/* Botões WhatsApp e Ligação */}
                      {c.clienteTelefone && (
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={`https://wa.me/55${c.clienteTelefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all"
                          >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                          </a>
                          <a
                            href={`tel:${c.clienteTelefone}`}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
                          >
                            <PhoneCall className="w-4 h-4" />
                            Ligar
                          </a>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 pt-1">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Aberto: {formatDate(c.createdAt)}</span>
                        {c.dataEntradaAgendada && <span>Entrada: {formatDate(c.dataEntradaAgendada)}</span>}
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
            <p className="text-gray-500 text-sm">
              {searchQuery ? "Nenhum chamado encontrado para esta busca." : filter !== "todos" ? "Nenhum chamado neste status." : "Nenhum chamado registrado ainda."}
            </p>
            {filter === "todos" && !searchQuery && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-orange-400 text-sm font-medium hover:text-orange-300"
              >
                Abrir primeiro chamado
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
