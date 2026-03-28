import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X, Car, Clock, AlertCircle, Loader2, Home, Banknote, FileText, Warehouse, Headphones, UserCheck, Ban } from "lucide-react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Tab = "vendas" | "fei" | "consignacao" | "despachante" | "sdr" | "comparecimento";

export default function AdminApprovals() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("vendas");

  const { data: pendingSales, isLoading: loadingSales, refetch: refetchSales } = trpc.sales.listPending.useQuery();
  const { data: pendingFei, isLoading: loadingFei, refetch: refetchFei } = trpc.fei.listPending.useQuery();
  const { data: pendingConsignment, isLoading: loadingConsignment, refetch: refetchConsignment } = trpc.consignment.listPending.useQuery();
  const { data: pendingDispatch, isLoading: loadingDispatch, refetch: refetchDispatch } = trpc.dispatch.listPending.useQuery();
  const { data: pendingSdr, isLoading: loadingSdr, refetch: refetchSdr } = trpc.sdr.pending.useQuery();
  const { data: pendingAttendance, isLoading: loadingAttendance, refetch: refetchAttendance } = trpc.sdr.pendingAttendance.useQuery();
  const { data: sellers } = trpc.sellers.list.useQuery();
  const { data: competitions } = trpc.competitions.list.useQuery();

  const approveSale = trpc.sales.approve.useMutation();
  const rejectSale = trpc.sales.reject.useMutation();
  const approveFei = trpc.fei.approve.useMutation();
  const rejectFei = trpc.fei.reject.useMutation();
  const approveConsignment = trpc.consignment.approve.useMutation();
  const rejectConsignment = trpc.consignment.reject.useMutation();
  const approveDispatch = trpc.dispatch.approve.useMutation();
  const rejectDispatch = trpc.dispatch.reject.useMutation();
  const approveSdr = trpc.sdr.approve.useMutation();
  const rejectSdr = trpc.sdr.reject.useMutation();
  const approveAttendance = trpc.sdr.approveAttendance.useMutation();
  const rejectAttendance = trpc.sdr.rejectAttendance.useMutation();

  const getSeller = (id: number) => sellers?.find(s => s.id === id);
  const getCompetition = (id: number | null) => id ? competitions?.find(c => c.id === id) : null;

  const counts = {
    vendas: pendingSales?.length || 0,
    fei: pendingFei?.length || 0,
    consignacao: pendingConsignment?.length || 0,
    despachante: pendingDispatch?.length || 0,
    sdr: pendingSdr?.length || 0,
    comparecimento: pendingAttendance?.length || 0,
  };
  const totalPending = counts.vendas + counts.fei + counts.consignacao + counts.despachante + counts.sdr + counts.comparecimento;

  const tabs: { value: Tab; label: string; icon: typeof Car; color: string }[] = [
    { value: "vendas", label: "Vendas", icon: Car, color: "text-red-400" },
    { value: "fei", label: "F&I", icon: Banknote, color: "text-green-400" },
    { value: "consignacao", label: "Consignação", icon: Warehouse, color: "text-blue-400" },
    { value: "despachante", label: "Despachante", icon: FileText, color: "text-purple-400" },
    { value: "sdr", label: "SDR", icon: Headphones, color: "text-orange-400" },
    { value: "comparecimento", label: "Compareceu", icon: UserCheck, color: "text-cyan-400" },
  ];

  const handleApprove = async (type: Tab, id: number) => {
    try {
      switch (type) {
        case "vendas": await approveSale.mutateAsync({ id }); refetchSales(); break;
        case "fei": await approveFei.mutateAsync({ id }); refetchFei(); break;
        case "consignacao": await approveConsignment.mutateAsync({ id }); refetchConsignment(); break;
        case "despachante": await approveDispatch.mutateAsync({ id }); refetchDispatch(); break;
        case "sdr": await approveSdr.mutateAsync({ id }); refetchSdr(); break;
        case "comparecimento": await approveAttendance.mutateAsync({ id }); refetchAttendance(); break;
      }
      toast.success("Aprovado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar");
    }
  };

  // State for consignment rejection dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectRecordId, setRejectRecordId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectObs, setRejectObs] = useState("");

  const REJECT_REASONS = [
    "Veículo fora de parâmetro da loja",
    "Documentação irregular",
    "Veículo com restrição",
    "Veículo com leilão",
    "Valor fora da realidade",
    "Outro",
  ];

  const openRejectConsignment = (id: number) => {
    setRejectRecordId(id);
    setRejectReason("Veículo fora de parâmetro da loja");
    setRejectObs("");
    setRejectDialogOpen(true);
  };

  const confirmRejectConsignment = async () => {
    if (!rejectRecordId) return;
    const fullReason = rejectObs ? `${rejectReason} - ${rejectObs}` : rejectReason;
    try {
      await rejectConsignment.mutateAsync({ id: rejectRecordId, reason: fullReason });
      refetchConsignment();
      toast.info("Consignação rejeitada.");
      setRejectDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao rejeitar");
    }
  };

  const handleReject = async (type: Tab, id: number) => {
    // For consignment, open the rejection dialog instead of rejecting directly
    if (type === "consignacao") {
      openRejectConsignment(id);
      return;
    }
    try {
      switch (type) {
        case "vendas": await rejectSale.mutateAsync({ id }); refetchSales(); break;
        case "fei": await rejectFei.mutateAsync({ id }); refetchFei(); break;
        case "despachante": await rejectDispatch.mutateAsync({ id }); refetchDispatch(); break;
        case "sdr": await rejectSdr.mutateAsync({ id }); refetchSdr(); break;
        case "comparecimento": await rejectAttendance.mutateAsync({ id }); refetchAttendance(); break;
      }
      toast.info("Rejeitado.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao rejeitar");
    }
  };

  const isLoading = loadingSales || loadingFei || loadingConsignment || loadingDispatch || loadingSdr || loadingAttendance;

  const renderSdrCard = (record: any) => {
    const seller = getSeller(record.sellerId);
    return (
      <Card key={`sdr-${record.id}`} className="bg-card border-orange-500/20 hover:border-orange-500/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {seller?.photoUrl ? (
                <img src={seller.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-orange-500/50" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-xl">
                  {seller?.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-foreground font-bold text-lg">{seller?.name || 'Colaborador'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  record.type === 'lead_convertido'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {record.type === 'lead_convertido' ? 'Lead Convertido' : 'Agendamento'}
                </span>
                <span className="text-xs text-muted-foreground">{record.points} pts</span>
              </div>
              <div className="flex items-center gap-2 text-foreground mb-1">
                <Headphones className="w-4 h-4 text-orange-400" />
                <span className="font-semibold">{record.customerName || 'Cliente'}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {record.customerPhone && <span className="text-muted-foreground">Tel: <span className="text-foreground">{record.customerPhone}</span></span>}
                {record.vehicleInterest && <span className="text-muted-foreground">Interesse: <span className="text-foreground">{record.vehicleInterest}</span></span>}
                {record.source && <span className="text-muted-foreground">Origem: <span className="text-foreground">{record.source}</span></span>}
              </div>
              {record.scheduledDate && (
                <p className="text-yellow-400 text-sm mt-1">Agendado: {new Date(Number(record.scheduledDate)).toLocaleString("pt-BR")}</p>
              )}
              {record.notes && <p className="text-muted-foreground text-sm mt-1">{record.notes}</p>}
              <p className="text-muted-foreground/60 text-xs mt-1">{new Date(record.createdAt).toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => handleApprove("sdr", record.id)} disabled={approveSdr.isPending} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4">
                <Check className="w-4 h-4 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleReject("sdr", record.id)} disabled={rejectSdr.isPending} className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold px-4">
                <X className="w-4 h-4 mr-1" /> Rejeitar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSaleCard = (sale: any) => {
    const seller = getSeller(sale.sellerId);
    const competition = getCompetition(sale.competitionId);
    return (
      <Card key={`sale-${sale.id}`} className="bg-card border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {seller?.photoUrl ? (
                <img src={seller.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-yellow-500/50" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-xl">
                  {seller?.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-foreground font-bold text-lg">{seller?.name || 'Vendedor'}</span>
                <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Pendente
                </span>
              </div>
              <div className="flex items-center gap-2 text-foreground mb-1">
                <Car className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">{sale.vehicleModel || 'Veículo'}</span>
              </div>
              {sale.value > 0 && <p className="text-green-400 font-bold text-lg">R$ {sale.value.toLocaleString("pt-BR")}</p>}
              {sale.description && <p className="text-muted-foreground text-sm mt-1">{sale.description}</p>}
              {competition && <p className="text-muted-foreground text-xs mt-1">Campanha: {competition.name}</p>}
              <p className="text-muted-foreground/60 text-xs mt-1">{new Date(sale.createdAt).toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => handleApprove("vendas", sale.id)} disabled={approveSale.isPending} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4">
                <Check className="w-4 h-4 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleReject("vendas", sale.id)} disabled={rejectSale.isPending} className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold px-4">
                <X className="w-4 h-4 mr-1" /> Rejeitar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFeiCard = (record: any) => {
    const seller = getSeller(record.sellerId);
    return (
      <Card key={`fei-${record.id}`} className="bg-card border-green-500/20 hover:border-green-500/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {seller?.photoUrl ? (
                <img src={seller.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-green-500/50" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xl">
                  {seller?.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-foreground font-bold text-lg">{seller?.name || 'Colaborador'}</span>
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">F&I</span>
              </div>
              <div className="flex items-center gap-2 text-foreground mb-1">
                <Banknote className="w-4 h-4 text-green-400" />
                <span className="font-semibold">Banco: {record.bankName}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {record.vehiclePlate && <span className="text-muted-foreground">Placa: <span className="text-foreground">{record.vehiclePlate}</span></span>}
                {record.customerCpf && <span className="text-muted-foreground">CPF: <span className="text-foreground">{record.customerCpf}</span></span>}
                <span className="text-muted-foreground">Retorno: <span className="text-yellow-400 font-bold">{record.returnType}</span></span>
              </div>
              {record.financedValue > 0 && <p className="text-green-400 font-bold">Financiado: R$ {record.financedValue.toLocaleString("pt-BR")}</p>}
              {record.paymentDate && <p className="text-yellow-400 text-sm">Pago em: {new Date(Number(record.paymentDate)).toLocaleDateString("pt-BR")}</p>}
              <p className="text-muted-foreground/60 text-xs mt-1">{new Date(record.createdAt).toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => handleApprove("fei", record.id)} disabled={approveFei.isPending} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4">
                <Check className="w-4 h-4 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleReject("fei", record.id)} disabled={rejectFei.isPending} className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold px-4">
                <X className="w-4 h-4 mr-1" /> Rejeitar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderConsignmentCard = (record: any) => {
    const seller = getSeller(record.sellerId);
    const daysPassed = Math.floor((Date.now() - Number(record.entryDate)) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, record.validAfterDays - daysPassed);
    return (
      <Card key={`consign-${record.id}`} className="bg-card border-blue-500/20 hover:border-blue-500/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {seller?.photoUrl ? (
                <img src={seller.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/50" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl">
                  {seller?.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-foreground font-bold text-lg">{seller?.name || 'Colaborador'}</span>
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">Consignação</span>
              </div>
              <div className="flex items-center gap-2 text-foreground mb-1">
                <Car className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">{record.vehicleModel}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {record.vehiclePlate && <span className="text-muted-foreground">Placa: <span className="text-foreground">{record.vehiclePlate}</span></span>}
                <span className="text-muted-foreground">Dono: <span className="text-foreground">{record.ownerName}</span></span>
                {record.ownerPhone && <span className="text-muted-foreground">Tel: <span className="text-foreground">{record.ownerPhone}</span></span>}
              </div>
              <div className="mt-1">
                <span className="text-muted-foreground text-sm">Entrada: {new Date(Number(record.entryDate)).toLocaleDateString("pt-BR")}</span>
                {record.exitDate ? (
                  <span className="text-muted-foreground text-sm ml-2">| Saída: {new Date(Number(record.exitDate)).toLocaleDateString("pt-BR")}</span>
                ) : null}
                {!record.exitDate && daysRemaining > 0 ? (
                  <span className="text-orange-400 text-xs ml-2">({daysRemaining} dias restantes para validar)</span>
                ) : (
                  <span className="text-green-400 text-xs ml-2">(7+ dias - válido!)</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {record.hasAuction ? (
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">Com Leilão</span>
                ) : (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Sem Leilão</span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${record.vehicleStatus === 'financiado' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {record.vehicleStatus === 'financiado' ? 'Financiado' : 'Quitado'}
                </span>
                {record.vehicleStatus === 'financiado' && record.payoffValue && (
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">Quit: R$ {Number(record.payoffValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                )}
                {record.costValue && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Custo: R$ {Number(record.costValue).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                )}
              </div>
              {record.notes && <p className="text-xs text-muted-foreground italic mt-1">📝 {record.notes}</p>}
              <p className="text-muted-foreground/60 text-xs mt-1">{new Date(record.createdAt).toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => handleApprove("consignacao", record.id)} disabled={approveConsignment.isPending} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4">
                <Check className="w-4 h-4 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleReject("consignacao", record.id)} disabled={rejectConsignment.isPending} className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold px-4">
                <Ban className="w-4 h-4 mr-1" /> Não Aceito
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDispatchCard = (record: any) => {
    const seller = getSeller(record.sellerId);
    return (
      <Card key={`dispatch-${record.id}`} className="bg-card border-purple-500/20 hover:border-purple-500/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {seller?.photoUrl ? (
                <img src={seller.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-purple-500/50" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl">
                  {seller?.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-foreground font-bold text-lg">{seller?.name || 'Colaborador'}</span>
                <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full">Despachante</span>
                {record.customerPaid && (
                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full font-bold">CLIENTE PAGOU</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-foreground mb-1">
                <FileText className="w-4 h-4 text-purple-400" />
                <span className="font-semibold">{record.documentType}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {record.vehiclePlate && <span className="text-muted-foreground">Placa: <span className="text-foreground">{record.vehiclePlate}</span></span>}
                {record.transferValue > 0 && <span className="text-green-400 font-bold">R$ {record.transferValue.toLocaleString("pt-BR")}</span>}
              </div>
              {record.bonusPoints > 0 && (
                <p className="text-green-400 text-xs mt-1 font-semibold">+{record.bonusPoints} pontos de bônus (cliente pagou)</p>
              )}
              <p className="text-muted-foreground/60 text-xs mt-1">{new Date(record.createdAt).toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => handleApprove("despachante", record.id)} disabled={approveDispatch.isPending} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4">
                <Check className="w-4 h-4 mr-1" /> Aprovar
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleReject("despachante", record.id)} disabled={rejectDispatch.isPending} className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold px-4">
                <X className="w-4 h-4 mr-1" /> Rejeitar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getCurrentItems = () => {
    switch (tab) {
      case "vendas": return pendingSales || [];
      case "fei": return pendingFei || [];
      case "consignacao": return pendingConsignment || [];
      case "despachante": return pendingDispatch || [];
      case "sdr": return pendingSdr || [];
      case "comparecimento": return pendingAttendance || [];
    }
  };

  const renderAttendanceCard = (record: any) => {
    const seller = getSeller(record.sellerId);
    return (
      <Card key={`attend-${record.id}`} className="bg-card border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {seller?.photoUrl ? (
                <img src={seller.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-cyan-500/50" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl">
                  {seller?.name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-foreground font-bold text-lg">{seller?.name || 'Vendedor'}</span>
                <span className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Cliente Compareceu
                </span>
                {record.ticketNumber && (
                  <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full font-mono">
                    #{record.ticketNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-foreground mb-1">
                <Headphones className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold">{record.customerName || 'Cliente'}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {record.customerPhone && <span className="text-muted-foreground">Tel: <span className="text-foreground">{record.customerPhone}</span></span>}
                {record.vehicleInterest && <span className="text-muted-foreground">Interesse: <span className="text-foreground">{record.vehicleInterest}</span></span>}
              </div>
              {record.scheduledDate && (
                <p className="text-yellow-400 text-sm mt-1">Agendado: {new Date(Number(record.scheduledDate)).toLocaleString("pt-BR")}</p>
              )}
              <p className="text-muted-foreground/60 text-xs mt-1">{new Date(record.createdAt).toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => handleApprove("comparecimento", record.id)} disabled={approveAttendance.isPending} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4">
                <Check className="w-4 h-4 mr-1" /> Confirmar
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleReject("comparecimento", record.id)} disabled={rejectAttendance.isPending} className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold px-4">
                <X className="w-4 h-4 mr-1" /> Não Veio
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCurrentTab = () => {
    const items = getCurrentItems();
    if (items.length === 0) {
      return (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Tudo aprovado!</h3>
            <p className="text-muted-foreground mb-6">Não há registros pendentes de {tabs.find(t => t.value === tab)?.label} no momento.</p>
            <Button onClick={() => setLocation("/")} variant="outline" className="gap-2">
              <Home className="w-4 h-4" /> Voltar ao Dashboard Público
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {tab === "vendas" && items.map(renderSaleCard)}
        {tab === "fei" && items.map(renderFeiCard)}
        {tab === "consignacao" && items.map(renderConsignmentCard)}
        {tab === "despachante" && items.map(renderDispatchCard)}
        {tab === "sdr" && items.map(renderSdrCard)}
        {tab === "comparecimento" && items.map(renderAttendanceCard)}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Aprovar Registros</h1>
            <p className="text-muted-foreground text-sm mt-1">Registros aguardando sua aprovação em todos os setores</p>
          </div>
          {totalPending > 0 && (
            <div className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {totalPending} pendente{totalPending > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Tabs por setor */}
        <div className="grid grid-cols-5 gap-1 bg-card rounded-lg p-1 border border-border">
          {tabs.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-md text-xs font-semibold transition-all relative ${
                tab === t.value ? "bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className={`w-4 h-4 ${tab === t.value ? t.color : ""}`} />
              {t.label}
              {counts[t.value] > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {counts[t.value]}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          renderCurrentTab()
        )}
      </div>
      {/* Dialog de Rejeição de Consignação */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-400" />
              Veículo Não Aceito
            </DialogTitle>
            <DialogDescription>
              Selecione o motivo da rejeição. O vendedor será notificado com o motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Motivo</label>
              <div className="grid gap-2">
                {REJECT_REASONS.map(reason => (
                  <button
                    key={reason}
                    onClick={() => setRejectReason(reason)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                      rejectReason === reason
                        ? 'border-red-500 bg-red-500/10 text-red-400 font-semibold'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Observação (opcional)</label>
              <Textarea
                placeholder="Descreva detalhes adicionais sobre o motivo da rejeição..."
                value={rejectObs}
                onChange={e => setRejectObs(e.target.value)}
                className="bg-muted border-border text-foreground min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={confirmRejectConsignment}
              disabled={!rejectReason || rejectConsignment.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejectConsignment.isPending ? "Rejeitando..." : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
