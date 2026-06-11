import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Search, ArrowLeft, Car, Banknote, FileText, Warehouse, Calendar, Trash2, Pencil } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function formatDate(ts: number | string | Date | null | undefined) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts : ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatCurrency(v: number | null | undefined) {
  if (!v) return "—";
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">Aprovado</span>;
  if (status === "pending") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold">Pendente</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">Rejeitado</span>;
}

export default function VehicleSearch() {
  const [, navigate] = useLocation();
  const [searchText, setSearchText] = useState("");
  const [searchPlate, setSearchPlate] = useState("");
  const utils = trpc.useUtils();

  const { data: results, isLoading } = trpc.vehicleSearch.byPlate.useQuery(
    { plate: searchPlate },
    { enabled: searchPlate.length >= 3 }
  );

  const deleteSale = trpc.sales.delete.useMutation({
    onSuccess: () => { utils.vehicleSearch.byPlate.invalidate(); toast.success("Venda excluída!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteFei = trpc.fei.delete.useMutation({
    onSuccess: () => { utils.vehicleSearch.byPlate.invalidate(); toast.success("F&I excluído!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteDispatch = trpc.dispatch.delete.useMutation({
    onSuccess: () => { utils.vehicleSearch.byPlate.invalidate(); toast.success("Despachante excluído!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteConsignment = trpc.consignment.delete.useMutation({
    onSuccess: () => { utils.vehicleSearch.byPlate.invalidate(); toast.success("Consignação excluída!"); },
    onError: (e) => toast.error(e.message),
  });

  function handleSearch() {
    if (searchText.trim().length >= 3) {
      setSearchPlate(searchText.trim());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  function confirmDelete(type: string, id: number, label: string) {
    if (window.confirm(`Tem certeza que deseja EXCLUIR este registro?\n\n${label}\n\nEsta ação não pode ser desfeita.`)) {
      if (type === "sale") deleteSale.mutate({ id });
      if (type === "fei") deleteFei.mutate({ id });
      if (type === "dispatch") deleteDispatch.mutate({ id });
      if (type === "consignment") deleteConsignment.mutate({ id });
    }
  }

  const totalResults = results
    ? results.sales.length + results.fei.length + results.dispatch.length + results.consignment.length + results.sdr.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Busca por Veículo</h1>
            <p className="text-xs text-gray-400">Pesquise por placa para ver tudo relacionado</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Campo de busca */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="Digite a placa (ex: ABC1D23)"
              className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-11 pr-4 py-4 text-white text-lg font-mono uppercase tracking-wider focus:border-red-500 focus:outline-none"
              maxLength={8}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchText.trim().length < 3}
            className="px-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-bold text-sm transition-colors"
          >
            Buscar
          </button>
        </div>

        {/* Loading */}
        {isLoading && searchPlate && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Buscando em todos os setores...</p>
          </div>
        )}

        {/* Resultados */}
        {results && searchPlate && (
          <div className="space-y-4">
            <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-3 text-center">
              <p className="text-sm text-gray-300">
                <span className="font-bold text-white">{totalResults}</span> registro(s) encontrado(s) para{" "}
                <span className="font-mono text-red-400">{searchPlate}</span>
              </p>
            </div>

            {/* VENDAS */}
            {results.sales.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Car className="w-4 h-4" /> Vendas ({results.sales.length})
                </h2>
                {results.sales.map((s: any) => (
                  <div key={`sale-${s.id}`} className="bg-gray-900/60 border border-blue-500/20 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">{s.vehicleModel || "Veículo"}</p>
                        <p className="text-xs text-gray-400">Placa: {s.vehiclePlate} • {s.sellerName}</p>
                        <p className="text-xs text-gray-500">{formatDate(s.createdAt)} • {formatCurrency(s.value)}</p>
                        {s.customerName && <p className="text-xs text-gray-500">Cliente: {s.customerName}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={s.status} />
                        <button
                          onClick={() => confirmDelete("sale", s.id, `Venda: ${s.vehicleModel} - ${s.vehiclePlate}`)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* F&I */}
            {results.fei.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                  <Banknote className="w-4 h-4" /> F&I ({results.fei.length})
                </h2>
                {results.fei.map((f: any) => (
                  <div key={`fei-${f.id}`} className="bg-gray-900/60 border border-purple-500/20 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">{f.bankName} - {f.returnType}</p>
                        <p className="text-xs text-gray-400">Placa: {f.vehiclePlate} • {f.sellerName}</p>
                        <p className="text-xs text-gray-500">{formatDate(f.createdAt)} • {formatCurrency(f.financedValue)}</p>
                        {f.customerName && <p className="text-xs text-gray-500">Cliente: {f.customerName}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={f.status} />
                        <button
                          onClick={() => confirmDelete("fei", f.id, `F&I: ${f.bankName} - ${f.vehiclePlate}`)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DESPACHANTE */}
            {results.dispatch.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Despachante ({results.dispatch.length})
                </h2>
                {results.dispatch.map((d: any) => (
                  <div key={`dispatch-${d.id}`} className="bg-gray-900/60 border border-emerald-500/20 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">{d.documentType}</p>
                        <p className="text-xs text-gray-400">Placa: {d.vehiclePlate} • {d.sellerName}</p>
                        <p className="text-xs text-gray-500">{formatDate(d.createdAt)}{d.customerPaid ? " • Cliente pagou ✓" : ""}</p>
                        {d.transferValue ? <p className="text-xs text-gray-500">Valor: {formatCurrency(d.transferValue)}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={d.status} />
                        <button
                          onClick={() => confirmDelete("dispatch", d.id, `Despachante: ${d.documentType} - ${d.vehiclePlate}`)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CONSIGNAÇÃO */}
            {results.consignment.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                  <Warehouse className="w-4 h-4" /> Consignação ({results.consignment.length})
                </h2>
                {results.consignment.map((c: any) => (
                  <div key={`consignment-${c.id}`} className="bg-gray-900/60 border border-orange-500/20 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">{c.vehicleModel}</p>
                        <p className="text-xs text-gray-400">Placa: {c.vehiclePlate} • Dono: {c.ownerName}</p>
                        <p className="text-xs text-gray-500">Entrada: {formatDate(c.entryDate)} • {c.sellerName}</p>
                        {c.exitDate && <p className="text-xs text-emerald-400">Saiu: {formatDate(c.exitDate)}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={c.status} />
                        <button
                          onClick={() => confirmDelete("consignment", c.id, `Consignação: ${c.vehicleModel} - ${c.vehiclePlate}`)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SDR/AGENDAMENTOS */}
            {results.sdr.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Agendamentos ({results.sdr.length})
                </h2>
                {results.sdr.map((s: any) => (
                  <div key={`sdr-${s.id}`} className="bg-gray-900/60 border border-cyan-500/20 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">{s.customerName || "Cliente"}</p>
                        <p className="text-xs text-gray-400">Veículo: {s.vehicleInterest} • {s.sellerName}</p>
                        <p className="text-xs text-gray-500">{formatDate(s.scheduledDate)}</p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Nenhum resultado */}
            {totalResults === 0 && (
              <div className="text-center py-12">
                <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nenhum registro encontrado para esta placa.</p>
                <p className="text-gray-500 text-sm mt-1">Verifique se a placa está correta.</p>
              </div>
            )}
          </div>
        )}

        {/* Estado inicial */}
        {!searchPlate && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Digite uma placa para buscar</p>
            <p className="text-gray-500 text-sm mt-2">
              A busca mostra todos os registros deste veículo em:<br />
              Vendas, F&I, Despachante, Consignação e Agendamentos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
