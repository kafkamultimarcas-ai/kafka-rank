import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  PhoneCall,
  Search,
  Wrench,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/features/financeiro/components/EmptyState";
import { STATUS_CONFIG } from "@/features/financeiro/utils/constants";
import { formatDate } from "@/features/financeiro/utils/formatters";

export function PosVendaTab() {
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: chamados } = trpc.pvChamados.list.useQuery({});
  const [filter, setFilter] = useState("todos");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allChamados = chamados || [];

  const filtered = useMemo(() => {
    let list = allChamados;

    if (filter !== "todos") {
      list = list.filter((chamado: any) => chamado.status === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((chamado: any) =>
        chamado.clienteNome?.toLowerCase().includes(query) ||
        chamado.carroModelo?.toLowerCase().includes(query) ||
        chamado.carroPlaca?.toLowerCase().includes(query) ||
        chamado.ticketNumber?.toString().includes(query)
      );
    }

    return list;
  }, [allChamados, filter, searchQuery]);

  const counts = useMemo(
    () => ({
      todos: allChamados.length,
      aberto: allChamados.filter((chamado: any) => chamado.status === "aberto").length,
      em_servico: allChamados.filter((chamado: any) => chamado.status === "em_servico").length,
      finalizado: allChamados.filter((chamado: any) => chamado.status === "finalizado").length,
    }),
    [allChamados]
  );

  const sellerName = (sellerId: number) => {
    const seller = (sellers || []).find((item: any) => item.id === sellerId);
    return seller?.nickname || seller?.name || "—";
  };

  return (
    <div className="container mx-auto max-w-lg space-y-4 px-4 py-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { key: "aberto", label: "Abertos", count: counts.aberto, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { key: "em_servico", label: "Em Serviço", count: counts.em_servico, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
          { key: "finalizado", label: "Finalizados", count: counts.finalizado, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        ].map((statusCard) => (
          <button
            key={statusCard.key}
            onClick={() => setFilter((currentFilter) => (currentFilter === statusCard.key ? "todos" : statusCard.key))}
            className={`rounded-xl border p-3 text-center transition-all ${statusCard.bg} ${filter === statusCard.key ? "ring-2 ring-orange-500/50" : ""}`}
          >
            <p className={`text-xl font-bold ${statusCard.color}`}>{statusCard.count}</p>
            <p className="text-[10px] text-gray-500">{statusCard.label}</p>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar por cliente, carro, placa..."
          className="w-full rounded-xl border border-gray-800 bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:border-orange-500 focus:outline-none"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((chamado: any) => {
            const statusConfig = STATUS_CONFIG[chamado.status] || STATUS_CONFIG.aberto;
            const dueDate = chamado.prazoEntrega ? new Date(chamado.prazoEntrega) : null;
            const isOverdue =
              dueDate &&
              dueDate.getTime() < Date.now() &&
              chamado.status !== "entregue" &&
              chamado.status !== "finalizado";
            const isExpanded = expandedId === chamado.id;

            return (
              <div key={chamado.id} className={`rounded-xl border transition-all ${statusConfig.bg} ${statusConfig.border}`}>
                <button onClick={() => setExpandedId(isExpanded ? null : chamado.id)} className="w-full p-4 text-left">
                  <div className="mb-1.5 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-gray-600">#{chamado.ticketNumber}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                          {statusConfig.emoji} {statusConfig.label}
                        </span>
                        {isOverdue && (
                          <span className="rounded-full bg-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400 animate-pulse">
                            ATRASADO
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-bold text-white">{chamado.clienteNome}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-xs text-gray-500">
                          {chamado.carroModelo} {chamado.carroPlaca ? `• ${chamado.carroPlaca}` : ""}
                        </p>
                        {chamado.vendedorId && (
                          <span className="rounded bg-gray-800/60 px-1.5 py-0.5 text-[10px] text-gray-600">
                            {sellerName(chamado.vendedorId)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <p className="line-clamp-1 text-xs text-gray-400">{chamado.problemaRelatado}</p>
                </button>

                {isExpanded && (
                  <div className="space-y-3 border-t border-gray-800/50 px-4 pb-4 pt-3">
                    <div className="space-y-1.5 text-xs">
                      <p className="text-gray-400"><span className="text-gray-600">Problema:</span> {chamado.problemaRelatado}</p>
                      {chamado.observacoes && <p className="text-gray-400"><span className="text-gray-600">Obs:</span> {chamado.observacoes}</p>}
                      {chamado.servicoRealizado && (
                        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-2">
                          <p className="mb-0.5 text-[10px] font-bold uppercase text-orange-400">
                            <Wrench className="inline h-3 w-3" /> O que está sendo feito
                          </p>
                          <p className="text-xs text-gray-300">{chamado.servicoRealizado}</p>
                        </div>
                      )}
                      {chamado.clienteTelefone && (
                        <p className="flex items-center gap-1 text-gray-400">
                          <Phone className="h-3 w-3" /> {chamado.clienteTelefone}
                        </p>
                      )}
                    </div>

                    {chamado.clienteTelefone && (
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`https://wa.me/55${chamado.clienteTelefone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-500"
                        >
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                        <a
                          href={`tel:${chamado.clienteTelefone}`}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500"
                        >
                          <PhoneCall className="h-4 w-4" /> Ligar
                        </a>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-1 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(chamado.createdAt)}</span>
                      {dueDate && (
                        <span className={isOverdue ? "font-bold text-red-400" : ""}>
                          Prazo: {formatDate(chamado.prazoEntrega)}
                        </span>
                      )}
                      {chamado.oficinaNome && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {chamado.oficinaNome}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Wrench} message="Nenhum chamado encontrado." />
      )}
    </div>
  );
}
