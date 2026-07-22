import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { useGoBack } from "@/hooks/useGoBack";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { ListSkeleton } from "@/components/ListSkeleton";
import {
  ArrowLeft, Clock, CreditCard, Search, User, Car, Phone, Mail, Eye,
  CheckCircle2, XCircle, AlertCircle, Loader2, Building2, ChevronDown,
  ChevronUp, FileText, Timer, PlayCircle, Ban, CircleDot, ImageIcon, X
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  na_fila: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  em_analise: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  aprovado: "bg-green-500/20 text-green-400 border-green-500/40",
  recusado: "bg-red-500/20 text-red-400 border-red-500/40",
  parcial: "bg-orange-500/20 text-orange-400 border-orange-500/40",
};
const STATUS_LABELS: Record<string, string> = {
  na_fila: "Na Fila",
  em_analise: "Em Análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
  parcial: "Parcial",
};
const BANCO_STATUS_COLORS: Record<string, string> = {
  pendente: "bg-gray-700 text-gray-300",
  em_analise: "bg-blue-600 text-white",
  aprovado: "bg-green-600 text-white",
  recusado: "bg-red-600 text-white",
};

function formatCurrency(val: number | null | undefined) {
  if (!val) return "—";
  return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function TimerDisplay({ startTime }: { startTime: number | null }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startTime) return;
    const update = () => setElapsed(Date.now() - startTime);
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  if (!startTime) return null;
  const hours = Math.floor(elapsed / 3600000);
  const mins = Math.floor((elapsed % 3600000) / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const isLong = elapsed > 30 * 60000; // > 30 min
  return (
    <div className={`flex items-center gap-1.5 font-mono text-lg font-bold ${isLong ? "text-red-400 animate-pulse" : "text-blue-400"}`}>
      <Timer className="w-5 h-5" />
      {hours > 0 && `${hours}h `}{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
}

function WaitTimer({ createdAt, inicioAnalise }: { createdAt: string; inicioAnalise: number | null }) {
  const [elapsed, setElapsed] = useState(0);
  const startMs = new Date(createdAt).getTime();
  const endMs = inicioAnalise || Date.now();
  useEffect(() => {
    if (inicioAnalise) { setElapsed(inicioAnalise - startMs); return; }
    const update = () => setElapsed(Date.now() - startMs);
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startMs, inicioAnalise]);
  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const isLong = mins > 15;
  return (
    <span className={`text-xs font-mono ${isLong ? "text-red-400" : "text-yellow-400"}`}>
      Esperando: {mins}m{String(secs).padStart(2, "0")}s
    </span>
  );
}

export default function MesaCredito() {
  const [search, setSearch] = useState("");
  const goBack = useGoBack("/admin");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [selectedFichaId, setSelectedFichaId] = useState<number | null>(null);
  const [feiSellerId, setFeiSellerId] = useState<number | null>(null);
  const [showCnhModal, setShowCnhModal] = useState(false);

  const pagination = usePagination({ initialPageSize: 20, resetDeps: [filterStatus, search] });
  const fichasQuery = trpc.fichas.listPaged.useQuery(
    { status: filterStatus, search: search || undefined, offset: pagination.offset, limit: pagination.pageSize },
    { refetchInterval: 5000 },
  );
  const refetch = fichasQuery.refetch;
  const filteredFichas = fichasQuery.data?.items ?? [];
  const total = fichasQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  const isLoading = fichasQuery.isLoading;
  const isFetching = fichasQuery.isFetching;
  const { data: filaCount } = trpc.fichas.filaCount.useQuery(undefined, { refetchInterval: 5000 });
  const { data: fichaDetail, refetch: refetchDetail } = trpc.fichas.getById.useQuery(
    { id: selectedFichaId! },
    { enabled: !!selectedFichaId }
  );
  const { data: sellersList } = trpc.sellers.list.useQuery();

  const iniciarAnalise = trpc.fichas.iniciarAnalise.useMutation({ onSuccess: () => { refetch(); refetchDetail(); } });
  const updateBanco = trpc.fichas.updateBanco.useMutation({ onSuccess: () => refetchDetail() });
  const finalizarAnalise = trpc.fichas.finalizarAnalise.useMutation({ onSuccess: () => { refetch(); refetchDetail(); } });
  const addObservacao = trpc.fichas.addObservacao.useMutation({ onSuccess: () => refetchDetail() });

  const feiSellers = useMemo(() => (sellersList || []).filter((s: any) => s.department === "fei" && s.active), [sellersList]);
  const allSellers = useMemo(() => {
    const map: Record<number, any> = {};
    (sellersList || []).forEach((s: any) => { map[s.id] = s; });
    return map;
  }, [sellersList]);


  // Estado para edição de banco
  const [editingBancoId, setEditingBancoId] = useState<number | null>(null);
  const [bancoObs, setBancoObs] = useState("");
  const [bancoValorParcela, setBancoValorParcela] = useState("");
  const [bancoQtdParcelas, setBancoQtdParcelas] = useState("");
  const [bancoTaxa, setBancoTaxa] = useState("");
  const [obsGeral, setObsGeral] = useState("");
  const [dataPagamentoBanco, setDataPagamentoBanco] = useState("");
  
  // === EDIT FICHA STATE ===
  const [isEditingFicha, setIsEditingFicha] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const editFichaMutation = trpc.fichas.editFicha.useMutation({ onSuccess: () => { refetchDetail(); refetch(); toast.success("Ficha atualizada!"); setIsEditingFicha(false); } });
  
  const startEditFicha = () => {
    if (!fichaDetail) return;
    setEditForm({
      veiculo: fichaDetail.veiculo || "",
      placa: fichaDetail.placa || "",
      anoModelo: fichaDetail.anoModelo || "",
      valorFinanciado: fichaDetail.valorFinanciado || "",
      nomeCompleto: fichaDetail.nomeCompleto || "",
      cpf: fichaDetail.cpf || "",
      rg: fichaDetail.rg || "",
      dataNascimento: fichaDetail.dataNascimento || "",
      estadoCivil: fichaDetail.estadoCivil || "",
      nomeMae: fichaDetail.nomeMae || "",
      nomePai: fichaDetail.nomePai || "",
      cidadeNasceu: fichaDetail.cidadeNasceu || "",
      email: fichaDetail.email || "",
      telefone: fichaDetail.telefone || "",
      cep: fichaDetail.cep || "",
      endereco: fichaDetail.endereco || "",
      profissao: fichaDetail.profissao || "",
      renda: fichaDetail.renda || "",
      localTrabalho: fichaDetail.localTrabalho || "",
      referenciaNome: fichaDetail.referenciaNome || "",
      referenciaTelefone: fichaDetail.referenciaTelefone || "",
      observacoesVendedor: fichaDetail.observacoesVendedor || "",
    });
    setIsEditingFicha(true);
  };
  
  const saveEditFicha = async () => {
    if (!selectedFichaId) return;
    const data: Record<string, any> = { fichaId: selectedFichaId };
    for (const [key, value] of Object.entries(editForm)) {
      if (key === 'valorFinanciado') {
        const num = parseFloat(String(value));
        if (!isNaN(num)) data[key] = num;
      } else if (value) {
        data[key] = value;
      }
    }
    await editFichaMutation.mutateAsync(data as any);
  };

  const handleIniciarAnalise = async (fichaId: number) => {
    if (!feiSellerId) { toast.error("Selecione quem é o F&I!"); return; }
    await iniciarAnalise.mutateAsync({ fichaId, feiSellerId });
    toast.success("Análise iniciada!");
  };

  const handleUpdateBanco = async (bancoId: number, status: "pendente" | "em_analise" | "aprovado" | "recusado") => {
    const feiName = feiSellerId ? allSellers[feiSellerId]?.name : "F&I";
    await updateBanco.mutateAsync({
      bancoId,
      status,
      observacao: bancoObs || undefined,
      valorParcela: bancoValorParcela ? Math.round(parseFloat(bancoValorParcela)) : undefined,
      qtdParcelas: bancoQtdParcelas ? parseInt(bancoQtdParcelas) : undefined,
      taxaJuros: bancoTaxa || undefined,
      atualizadoPor: feiName,
    });
    setEditingBancoId(null);
    setBancoObs("");
    setBancoValorParcela("");
    setBancoQtdParcelas("");
    setBancoTaxa("");
    toast.success("Banco atualizado!");
  };

  const setDataPagamentoMutation = trpc.fichas.setDataPagamento.useMutation({ onSuccess: () => refetchDetail() });

  const handleFinalizar = async (status: "aprovado" | "recusado" | "parcial") => {
    if (!selectedFichaId) return;
    await finalizarAnalise.mutateAsync({
      fichaId: selectedFichaId,
      status,
      observacoesFei: obsGeral || undefined,
      dataPagamentoBanco: dataPagamentoBanco ? new Date(dataPagamentoBanco).getTime() : undefined,
    });
    toast.success(`Ficha ${status === "aprovado" ? "APROVADA" : status === "recusado" ? "RECUSADA" : "PARCIALMENTE APROVADA"}!`);
    setSelectedFichaId(null);
    setDataPagamentoBanco("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={goBack}>
            <button className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700">
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white font-racing tracking-wider flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-400" />
              MESA DE CRÉDITO
            </h1>
            <p className="text-xs text-gray-400">Fila de fichas para análise</p>
          </div>
          {/* Selecionar F&I */}
          <select
            value={feiSellerId || ""}
            onChange={e => setFeiSellerId(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-xs max-w-[140px]"
          >
            <option value="">Quem é o F&I?</option>
            {feiSellers.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { key: "na_fila", label: "Na Fila", count: filaCount?.naFila || 0, color: "text-yellow-400 border-yellow-500/40" },
            { key: "em_analise", label: "Analisando", count: filaCount?.emAnalise || 0, color: "text-blue-400 border-blue-500/40" },
            { key: "aprovado", label: "Aprovadas", count: filaCount?.aprovado || 0, color: "text-green-400 border-green-500/40" },
            { key: "recusado", label: "Recusadas", count: filaCount?.recusado || 0, color: "text-red-400 border-red-500/40" },
            { key: "parcial", label: "Parciais", count: filaCount?.parcial || 0, color: "text-orange-400 border-orange-500/40" },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setFilterStatus(filterStatus === item.key ? "todos" : item.key)}
              className={`border rounded-lg p-2 text-center transition-all ${
                filterStatus === item.key ? item.color + " bg-gray-800" : "border-gray-800 text-gray-500 hover:border-gray-700"
              }`}
            >
              <div className={`text-lg font-bold ${item.color.split(" ")[0]}`}>{item.count}</div>
              <div className="text-[10px]">{item.label}</div>
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF, placa, veículo..."
            className="pl-10 bg-gray-900 border-gray-800 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Lista de fichas */}
        <div className="space-y-3">
          {isLoading && <ListSkeleton rows={6} />}
          {!isLoading && filteredFichas.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma ficha na fila</p>
            </div>
          )}
          {!isLoading && filteredFichas.map((ficha: any) => {
            const seller = allSellers[ficha.sellerId];
            return (
              <div
                key={ficha.id}
                className={`border rounded-xl p-4 space-y-3 cursor-pointer hover:border-blue-500/40 transition-all ${
                  selectedFichaId === ficha.id ? "border-blue-500 bg-blue-500/5" : "border-gray-800 bg-gray-900/50"
                }`}
                onClick={() => setSelectedFichaId(selectedFichaId === ficha.id ? null : ficha.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">#{ficha.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[ficha.status]}`}>
                        {STATUS_LABELS[ficha.status]}
                      </span>
                      {ficha.status === "na_fila" && (
                        <WaitTimer createdAt={ficha.createdAt} inicioAnalise={ficha.inicioAnalise} />
                      )}
                      {ficha.status === "em_analise" && ficha.inicioAnalise && (
                        <TimerDisplay startTime={ficha.inicioAnalise} />
                      )}
                    </div>
                    <h3 className="text-white font-bold mt-1">{ficha.nomeCompleto}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span>CPF: {ficha.cpf}</span>
                      {ficha.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{ficha.telefone}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    {ficha.veiculo && <div className="text-sm text-white font-semibold flex items-center gap-1"><Car className="w-4 h-4 text-blue-400" />{ficha.veiculo}</div>}
                    {ficha.placa && <div className="text-xs text-yellow-400 font-mono">{ficha.placa}</div>}
                    {ficha.valorFinanciado && <div className="text-xs text-green-400 font-bold">{formatCurrency(ficha.valorFinanciado)}</div>}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Vendedor: <span className="text-gray-300">{seller?.name || `#${ficha.sellerId}`}</span></span>
                  <span>{new Date(ficha.createdAt).toLocaleString("pt-BR")}</span>
                </div>

                {ficha.status === "na_fila" && (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleIniciarAnalise(ficha.id); }}
                    disabled={iniciarAnalise.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" /> INICIAR ANÁLISE
                  </Button>
                )}
              </div>
            );
          })}

          {!isLoading && total > 0 && (
            <PaginationControls
              page={pagination.page}
              totalPages={totalPages}
              total={total}
              pageSize={pagination.pageSize}
              isLoading={isFetching}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              className="border-t border-gray-800 pt-5"
            />
          )}
        </div>

        {/* Detalhe da ficha selecionada */}
        {selectedFichaId && fichaDetail && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center overflow-y-auto p-4 pt-8">
            <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {/* Header do detalhe */}
              <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">#{fichaDetail.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[fichaDetail.status]}`}>
                      {STATUS_LABELS[fichaDetail.status]}
                    </span>
                    {fichaDetail.status === "em_analise" && fichaDetail.inicioAnalise && (
                      <TimerDisplay startTime={fichaDetail.inicioAnalise} />
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">{fichaDetail.nomeCompleto}</h2>
                  {fichaDetail.feiResponsavelNome && (
                    <span className="text-xs text-blue-300">Analisando: {fichaDetail.feiResponsavelNome}</span>
                  )}
                </div>
                <button onClick={() => setSelectedFichaId(null)} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* BOTÃO EDITAR */}
                <div className="flex justify-end">
                  {!isEditingFicha ? (
                    <Button size="sm" variant="outline" onClick={startEditFicha}
                      className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 text-xs">
                      <FileText className="w-3 h-3 mr-1" /> Editar Ficha
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEditFicha} disabled={editFichaMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-xs">
                        {editFichaMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />} Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingFicha(false)}
                        className="border-gray-700 text-gray-400 text-xs">
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Dados do veículo */}
                <div className="bg-gray-800/50 rounded-xl p-3 space-y-2">
                  <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2"><Car className="w-4 h-4" /> VEÍCULO</h3>
                  {isEditingFicha ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[10px] text-gray-500">Veículo</label><Input value={editForm.veiculo} onChange={e => setEditForm(p => ({...p, veiculo: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Placa</label><Input value={editForm.placa} onChange={e => setEditForm(p => ({...p, placa: e.target.value}))} className="bg-gray-800 border-gray-700 text-yellow-400 text-xs h-8 font-mono" /></div>
                      <div><label className="text-[10px] text-gray-500">Ano/Modelo</label><Input value={editForm.anoModelo} onChange={e => setEditForm(p => ({...p, anoModelo: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Valor Financiado</label><MoneyInput value={editForm.valorFinanciado} onChange={v => setEditForm(p => ({...p, valorFinanciado: v}))} className="bg-gray-800 border-gray-700 text-green-400 text-xs h-8" /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Veículo:</span> <span className="text-white">{fichaDetail.veiculo || "—"}</span></div>
                      <div><span className="text-gray-500">Placa:</span> <span className="text-yellow-400 font-mono">{fichaDetail.placa || "—"}</span></div>
                      <div><span className="text-gray-500">Ano:</span> <span className="text-white">{fichaDetail.anoModelo || "—"}</span></div>
                      <div><span className="text-gray-500">Financiado:</span> <span className="text-green-400 font-bold">{formatCurrency(fichaDetail.valorFinanciado)}</span></div>
                    </div>
                  )}
                </div>

                {/* Dados pessoais */}
                <div className="bg-gray-800/50 rounded-xl p-3 space-y-2">
                  <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2"><User className="w-4 h-4" /> DADOS PESSOAIS</h3>
                  {isEditingFicha ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-[10px] text-gray-500">Nome Completo</label><Input value={editForm.nomeCompleto} onChange={e => setEditForm(p => ({...p, nomeCompleto: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">CPF</label><Input value={editForm.cpf} onChange={e => setEditForm(p => ({...p, cpf: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">RG</label><Input value={editForm.rg} onChange={e => setEditForm(p => ({...p, rg: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Nascimento</label><Input value={editForm.dataNascimento} onChange={e => setEditForm(p => ({...p, dataNascimento: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Estado Civil</label><Input value={editForm.estadoCivil} onChange={e => setEditForm(p => ({...p, estadoCivil: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Mãe</label><Input value={editForm.nomeMae} onChange={e => setEditForm(p => ({...p, nomeMae: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Pai</label><Input value={editForm.nomePai} onChange={e => setEditForm(p => ({...p, nomePai: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Cidade Nasc.</label><Input value={editForm.cidadeNasceu} onChange={e => setEditForm(p => ({...p, cidadeNasceu: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Telefone</label><Input value={editForm.telefone} onChange={e => setEditForm(p => ({...p, telefone: e.target.value}))} className="bg-gray-800 border-gray-700 text-blue-400 text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Email</label><Input value={editForm.email} onChange={e => setEditForm(p => ({...p, email: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">CEP</label><Input value={editForm.cep} onChange={e => setEditForm(p => ({...p, cep: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div className="col-span-2"><label className="text-[10px] text-gray-500">Endereço</label><Input value={editForm.endereco} onChange={e => setEditForm(p => ({...p, endereco: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Profissão</label><Input value={editForm.profissao} onChange={e => setEditForm(p => ({...p, profissao: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Renda</label><Input value={editForm.renda} onChange={e => setEditForm(p => ({...p, renda: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Local Trabalho</label><Input value={editForm.localTrabalho} onChange={e => setEditForm(p => ({...p, localTrabalho: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Ref. Pessoal</label><Input value={editForm.referenciaNome} onChange={e => setEditForm(p => ({...p, referenciaNome: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div><label className="text-[10px] text-gray-500">Tel. Referência</label><Input value={editForm.referenciaTelefone} onChange={e => setEditForm(p => ({...p, referenciaTelefone: e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-xs h-8" /></div>
                      <div className="col-span-2"><label className="text-[10px] text-gray-500">Obs. Vendedor</label><Textarea value={editForm.observacoesVendedor} onChange={e => setEditForm(p => ({...p, observacoesVendedor: e.target.value}))} className="bg-gray-800 border-gray-700 text-yellow-200 text-xs resize-none" rows={2} /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-500">CPF:</span> <span className="text-white">{fichaDetail.cpf}</span></div>
                      <div><span className="text-gray-500">RG:</span> <span className="text-white">{fichaDetail.rg || "—"}</span></div>
                      <div><span className="text-gray-500">Nascimento:</span> <span className="text-white">{fichaDetail.dataNascimento || "—"}</span></div>
                      <div><span className="text-gray-500">Estado Civil:</span> <span className="text-white">{fichaDetail.estadoCivil || "—"}</span></div>
                      <div><span className="text-gray-500">Mãe:</span> <span className="text-white">{fichaDetail.nomeMae || "—"}</span></div>
                      <div><span className="text-gray-500">Pai:</span> <span className="text-white">{fichaDetail.nomePai || "—"}</span></div>
                      <div><span className="text-gray-500">Cidade Nasc.:</span> <span className="text-white">{fichaDetail.cidadeNasceu || "—"}</span></div>
                      <div><span className="text-gray-500">Telefone:</span> <span className="text-blue-400">{fichaDetail.telefone || "—"}</span></div>
                      <div><span className="text-gray-500">Email:</span> <span className="text-white">{fichaDetail.email || "—"}</span></div>
                      <div><span className="text-gray-500">CEP:</span> <span className="text-white">{fichaDetail.cep || "—"}</span></div>
                      <div className="col-span-2"><span className="text-gray-500">Endereço:</span> <span className="text-white">{fichaDetail.endereco || "—"}</span></div>
                      <div><span className="text-gray-500">Profissão:</span> <span className="text-white">{fichaDetail.profissao || "—"}</span></div>
                      <div><span className="text-gray-500">Renda:</span> <span className="text-white">{fichaDetail.renda || "—"}</span></div>
                      <div><span className="text-gray-500">Local Trabalho:</span> <span className="text-white">{fichaDetail.localTrabalho || "—"}</span></div>
                      <div><span className="text-gray-500">Ref. Pessoal:</span> <span className="text-white">{fichaDetail.referenciaNome || "—"} {fichaDetail.referenciaTelefone ? `(${fichaDetail.referenciaTelefone})` : ""}</span></div>
                    </div>
                  )}
                </div>

                {/* CNH */}
                {fichaDetail.cnhFotoUrl && (
                  <div className="bg-gray-800/50 rounded-xl p-3">
                    <h3 className="text-sm font-bold text-green-400 flex items-center gap-2 mb-2"><ImageIcon className="w-4 h-4" /> CNH / RG</h3>
                    <button
                      onClick={() => setShowCnhModal(true)}
                      className="w-full h-32 rounded-lg border border-gray-700 overflow-hidden hover:border-green-500/50 transition-colors"
                    >
                      <img src={fichaDetail.cnhFotoUrl} alt="CNH" className="w-full h-full object-contain" />
                    </button>
                  </div>
                )}

                {/* Observações do vendedor */}
                {fichaDetail.observacoesVendedor && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                    <h3 className="text-xs font-bold text-yellow-400 mb-1">OBS. DO VENDEDOR:</h3>
                    <p className="text-sm text-yellow-200">{fichaDetail.observacoesVendedor}</p>
                  </div>
                )}

                {/* BANCOS */}
                <div className="bg-gray-800/50 rounded-xl p-3 space-y-3">
                  <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2"><Building2 className="w-4 h-4" /> STATUS POR BANCO</h3>
                  <div className="space-y-2">
                    {(fichaDetail.bancos || []).map((banco: any) => (
                      <div key={banco.id} className="border border-gray-700 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{banco.banco}</span>
                            {banco.tentadoPorVendedor && (
                              <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">Vendedor tentou</span>
                            )}
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${BANCO_STATUS_COLORS[banco.status]}`}>
                            {banco.status === "pendente" ? "Pendente" : banco.status === "em_analise" ? "Analisando" : banco.status === "aprovado" ? "APROVADO" : "RECUSADO"}
                          </span>
                        </div>

                        {banco.observacao && <p className="text-xs text-gray-400">{banco.observacao}</p>}
                        {banco.valorParcela && (
                          <div className="flex gap-3 text-xs">
                            <span className="text-green-400 font-bold">Parcela: {formatCurrency(banco.valorParcela)}</span>
                            {banco.qtdParcelas && <span className="text-gray-400">{banco.qtdParcelas}x</span>}
                            {banco.taxaJuros && <span className="text-gray-400">Taxa: {banco.taxaJuros}%</span>}
                          </div>
                        )}

                        {(fichaDetail.status === "em_analise" || fichaDetail.status === "na_fila") && (
                          <>
                            {editingBancoId === banco.id ? (
                              <div className="space-y-2 bg-gray-900/50 rounded-lg p-2">
                                <Textarea
                                  value={bancoObs}
                                  onChange={e => setBancoObs(e.target.value)}
                                  placeholder="Observação do banco..."
                                  className="bg-gray-800 border-gray-700 text-white text-xs resize-none"
                                  rows={2}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <MoneyInput value={bancoValorParcela} onChange={setBancoValorParcela}
                                    placeholder="Parcela R$" className="bg-gray-800 border-gray-700 text-white text-xs" />
                                  <Input value={bancoQtdParcelas} onChange={e => setBancoQtdParcelas(e.target.value)}
                                    placeholder="Qtd parcelas" type="number" className="bg-gray-800 border-gray-700 text-white text-xs" />
                                  <Input value={bancoTaxa} onChange={e => setBancoTaxa(e.target.value)}
                                    placeholder="Taxa %" className="bg-gray-800 border-gray-700 text-white text-xs" />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleUpdateBanco(banco.id, "aprovado")}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-xs">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado
                                  </Button>
                                  <Button size="sm" onClick={() => handleUpdateBanco(banco.id, "recusado")}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-xs">
                                    <XCircle className="w-3 h-3 mr-1" /> Recusado
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingBancoId(null)}
                                    className="border-gray-700 text-gray-400 text-xs">
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingBancoId(banco.id); setBancoObs(banco.observacao || ""); setBancoValorParcela(banco.valorParcela ? String(banco.valorParcela) : ""); setBancoQtdParcelas(banco.qtdParcelas ? String(banco.qtdParcelas) : ""); setBancoTaxa(banco.taxaJuros || ""); }}
                                  className="flex-1 border-gray-700 text-gray-300 text-xs hover:bg-gray-800">
                                  <FileText className="w-3 h-3 mr-1" /> Analisar
                                </Button>
                                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleUpdateBanco(banco.id, "aprovado"); }}
                                  className="bg-green-700/50 hover:bg-green-700 text-green-300 text-xs">
                                  <CheckCircle2 className="w-3 h-3" />
                                </Button>
                                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleUpdateBanco(banco.id, "recusado"); }}
                                  className="bg-red-700/50 hover:bg-red-700 text-red-300 text-xs">
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observação F&I */}
                {(fichaDetail.status === "em_analise") && (
                  <div className="bg-gray-800/50 rounded-xl p-3 space-y-2">
                    <h3 className="text-sm font-bold text-purple-400">OBSERVAÇÃO DO F&I</h3>
                    <Textarea
                      value={obsGeral || fichaDetail.observacoesFei || ""}
                      onChange={e => setObsGeral(e.target.value)}
                      placeholder="Observações gerais da análise..."
                      className="bg-gray-800 border-gray-700 text-white text-sm resize-none"
                      rows={3}
                    />
                    <Button size="sm" onClick={() => {
                      if (selectedFichaId) addObservacao.mutateAsync({ fichaId: selectedFichaId, observacoesFei: obsGeral });
                      toast.success("Observação salva!");
                    }} className="bg-purple-600 hover:bg-purple-700 text-xs">
                      Salvar Observação
                    </Button>
                  </div>
                )}

                {/* Data de pagamento do banco */}
                {(fichaDetail.status === "em_analise" || fichaDetail.status === "aprovado" || fichaDetail.status === "parcial") && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 space-y-2">
                    <h3 className="text-sm font-bold text-blue-400">DATA DE PAGAMENTO DO BANCO</h3>
                    <p className="text-[10px] text-gray-400">Data que o banco efetivamente pagou o financiamento (pode ser diferente da data de aprovação)</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={dataPagamentoBanco || (fichaDetail.dataPagamentoBanco ? new Date(fichaDetail.dataPagamentoBanco).toISOString().split('T')[0] : '')}
                        onChange={e => setDataPagamentoBanco(e.target.value)}
                        className="bg-gray-800 border border-blue-500/30 text-white rounded-lg p-2 text-sm flex-1"
                      />
                      {(fichaDetail.status === "aprovado" || fichaDetail.status === "parcial") && dataPagamentoBanco && (
                        <Button size="sm" onClick={() => {
                          if (selectedFichaId && dataPagamentoBanco) {
                            setDataPagamentoMutation.mutate({ fichaId: selectedFichaId, dataPagamentoBanco: new Date(dataPagamentoBanco).getTime() });
                            toast.success("Data de pagamento atualizada!");
                          }
                        }} className="bg-blue-600 hover:bg-blue-700 text-xs">
                          Salvar Data
                        </Button>
                      )}
                    </div>
                    {fichaDetail.dataPagamentoBanco && (
                      <p className="text-xs text-blue-300">Registrado: {new Date(fichaDetail.dataPagamentoBanco).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                )}

                {/* Botões de finalização */}
                {(fichaDetail.status === "em_analise") && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white">FINALIZAR ANÁLISE</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <Button onClick={() => handleFinalizar("aprovado")}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> APROVADO
                      </Button>
                      <Button onClick={() => handleFinalizar("parcial")}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
                        <AlertCircle className="w-4 h-4 mr-1" /> PARCIAL
                      </Button>
                      <Button onClick={() => handleFinalizar("recusado")}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold">
                        <XCircle className="w-4 h-4 mr-1" /> RECUSADO
                      </Button>
                    </div>
                  </div>
                )}

                {/* Resultado final se já finalizado */}
                {fichaDetail.observacoesFei && fichaDetail.status !== "em_analise" && fichaDetail.status !== "na_fila" && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
                    <h3 className="text-xs font-bold text-purple-400 mb-1">OBS. DO F&I:</h3>
                    <p className="text-sm text-purple-200">{fichaDetail.observacoesFei}</p>
                  </div>
                )}
                {/* Mostrar data de pagamento se já registrada */}
                {fichaDetail.dataPagamentoBanco && fichaDetail.status !== "em_analise" && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                    <h3 className="text-xs font-bold text-blue-400 mb-1">PAGAMENTO DO BANCO:</h3>
                    <p className="text-sm text-blue-200">{new Date(fichaDetail.dataPagamentoBanco).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}

                {fichaDetail.fimAnalise && fichaDetail.inicioAnalise && (
                  <div className="text-xs text-gray-500 text-center">
                    Tempo de análise: {Math.round((fichaDetail.fimAnalise - fichaDetail.inicioAnalise) / 60000)} minutos
                  </div>
                )}
              </div>
            </div>

            {/* Modal CNH */}
            {showCnhModal && fichaDetail.cnhFotoUrl && (
              <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setShowCnhModal(false)}>
                <img src={fichaDetail.cnhFotoUrl} alt="CNH" className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
