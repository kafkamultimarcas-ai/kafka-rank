import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Wrench, ArrowLeft, Plus, Phone, Car, User, AlertTriangle, MapPin, Clock, ChevronDown, ChevronUp, FileText } from "lucide-react";

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

export default function PosVenda() {
  const [, navigate] = useLocation();
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const [selectedSeller, setSelectedSeller] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    clienteNome: "", clienteTelefone: "", carroModelo: "", carroPlaca: "", problemaRelatado: "", observacoes: "",
  });

  // Buscar chamados do vendedor selecionado
  const { data: chamados, refetch } = trpc.pvChamados.list.useQuery(
    { vendedorId: selectedSeller! },
    { enabled: !!selectedSeller }
  );

  const createMutation = trpc.pvChamados.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowForm(false);
      setForm({ clienteNome: "", clienteTelefone: "", carroModelo: "", carroPlaca: "", problemaRelatado: "", observacoes: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const allChamados = chamados || [];
  const filtered = useMemo(() => {
    if (filter === "todos") return allChamados;
    return allChamados.filter((c: any) => c.status === filter);
  }, [allChamados, filter]);

  const counts = useMemo(() => ({
    todos: allChamados.length,
    aberto: allChamados.filter((c: any) => c.status === "aberto").length,
    agendado: allChamados.filter((c: any) => c.status === "agendado").length,
    em_servico: allChamados.filter((c: any) => c.status === "em_servico").length,
    finalizado: allChamados.filter((c: any) => c.status === "finalizado").length,
    entregue: allChamados.filter((c: any) => c.status === "entregue").length,
  }), [allChamados]);

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
          </div>
          <img src={LOGO_URL} alt="Kafka" className="h-7 w-7 rounded-lg" />
        </div>
      </header>

      <div className="container max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Seleção de Vendedor */}
        {!selectedSeller ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-orange-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Pós-Venda</h1>
              <p className="text-sm text-gray-400">Selecione seu nome para abrir chamados e acompanhar o status</p>
            </div>

            <select
              onChange={(e) => { if (e.target.value) setSelectedSeller(Number(e.target.value)); }}
              defaultValue=""
              className="w-full rounded-xl border-2 border-orange-500/30 bg-gray-900 px-4 py-3.5 text-sm text-white font-medium focus:border-orange-500 focus:outline-none"
            >
              <option value="" disabled>Selecione seu nome...</option>
              {(sellers || []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.nickname || s.name} — {s.department === 'vendas' ? 'Vendas' : s.department === 'pre_vendas' ? 'Pré-Vendas' : s.department || 'Vendas'}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            {/* Info do vendedor + botão novo chamado */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => { setSelectedSeller(null); setShowForm(false); }} className="text-gray-500 hover:text-gray-300">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-400">
                  {(sellers || []).find((s: any) => s.id === selectedSeller)?.nickname || (sellers || []).find((s: any) => s.id === selectedSeller)?.name}
                </span>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-all"
              >
                <Plus className="h-4 w-4" /> Novo Chamado
              </button>
            </div>

            {/* Formulário de abertura */}
            {showForm && (
              <div className="bg-gray-900 border border-orange-500/30 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-orange-500/5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" /> Abrir Chamado
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Preencha os dados do cliente e o problema. O setor será notificado.</p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium mb-1 block flex items-center gap-1">
                      <User className="h-3 h-3" /> Nome do Cliente *
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
                          vendedorId: selectedSeller!,
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

            {/* Contadores */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "aberto", label: "Abertos", count: counts.aberto, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                { key: "em_servico", label: "Em Serviço", count: counts.em_servico, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
                { key: "finalizado", label: "Finalizados", count: counts.finalizado, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              ].map(c => (
                <div key={c.key} className={`rounded-xl p-3 border text-center ${c.bg}`}>
                  <p className={`text-xl font-bold ${c.color}`}>{c.count}</p>
                  <p className="text-[10px] text-gray-500">{c.label}</p>
                </div>
              ))}
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
                            <p className="text-xs text-gray-500">{c.carroModelo} {c.carroPlaca ? `• ${c.carroPlaca}` : ""}</p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {c.problemaRelatado}
                        </p>
                      </button>

                      {/* Detalhes expandidos */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-800/50 pt-3 space-y-2">
                          <div className="text-xs space-y-1.5">
                            <p className="text-gray-400"><span className="text-gray-600">Problema:</span> {c.problemaRelatado}</p>
                            {c.observacoes && <p className="text-gray-400"><span className="text-gray-600">Obs:</span> {c.observacoes}</p>}
                            {c.clienteTelefone && (
                              <p className="text-gray-400 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {c.clienteTelefone}
                              </p>
                            )}
                          </div>
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
                  {filter !== "todos" ? "Nenhum chamado neste status." : "Nenhum chamado registrado ainda."}
                </p>
                {filter === "todos" && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-3 text-orange-400 text-sm font-medium hover:text-orange-300"
                  >
                    Abrir primeiro chamado
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
