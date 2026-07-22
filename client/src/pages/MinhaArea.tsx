import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import NotificationCenter from "@/components/NotificationCenter";
import {
  ArrowLeft,
  LogOut,
  Calendar,
  User,
  Trophy,
  Bell,
  BellRing,
  Car,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  Users,
  TrendingUp,
  PlusCircle,
  LayoutGrid,
  Filter,
} from "lucide-react";
import { useMemo, useState, useCallback, useRef } from "react";
import { Award, Target, Wrench, ChevronRight, MapPin, Search, Eye, Clipboard, Building2, Upload, FileCheck, FileWarning, Image, MessageCircle, PhoneCall, Edit3, Camera, Package, Plus, Trash2, Check, X as XIcon, Receipt, Flame, Handshake, CreditCard, Fuel, Mic, AlertCircle, Banknote, Copy, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { maskPhone } from "@/lib/masks";
import IAMFloatingButton from "@/components/IAMFloatingButton";
import { PaginationControls } from "@/components/PaginationControls";
import IAMGreeting from "@/components/IAMGreeting";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";
import { useBranding } from "@/contexts/TenantContext";

const DEPT_CONFIG: Record<string, { label: string; color: string; icon: any; gradient: string }> = {
  vendas: { label: "Vendas", color: "text-red-400", icon: Car, gradient: "from-red-600/20 to-red-500/10 border-red-500/30" },
  pre_vendas: { label: "Pré-Vendas / SDR", color: "text-purple-400", icon: Phone, gradient: "from-purple-600/20 to-purple-500/10 border-purple-500/30" },
  fei: { label: "F&I", color: "text-amber-400", icon: DollarSign, gradient: "from-amber-600/20 to-amber-500/10 border-amber-500/30" },
  consignacao: { label: "Consignação", color: "text-cyan-400", icon: FileText, gradient: "from-cyan-600/20 to-cyan-500/10 border-cyan-500/30" },
  despachante: { label: "Despachante", color: "text-emerald-400", icon: FileText, gradient: "from-emerald-600/20 to-emerald-500/10 border-emerald-500/30" },
  pos_venda: { label: "Pós-Venda", color: "text-orange-400", icon: Wrench, gradient: "from-orange-600/20 to-orange-500/10 border-orange-500/30" },
  financeiro: { label: "Financeiro", color: "text-green-400", icon: DollarSign, gradient: "from-green-600/20 to-green-500/10 border-green-500/30" },
  marketing: { label: "Marketing", color: "text-pink-400", icon: Target, gradient: "from-pink-600/20 to-pink-500/10 border-pink-500/30" },
};

function formatDate(ts: number | string | Date | null | undefined) {
  if (!ts) return "—";
  const d = new Date(typeof ts === "number" ? ts : ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatCurrency(v: number | null | undefined) {
  if (!v) return "\u2014";
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
        <CheckCircle2 className="w-3 h-3" /> Aprovado
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold">
        <Clock className="w-3 h-3" /> Pendente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">
      <XCircle className="w-3 h-3" /> Rejeitado
    </span>
  );
}

function FinanceiroStatsCards() {
  const { data: dashboard } = trpc.finTransactions.dashboard.useQuery({});
  const { data: alerts } = trpc.finTransactions.alerts.useQuery(undefined, { refetchInterval: 60000 });
  const s = alerts?.summary || { overdueCount: 0, dueTodayCount: 0, dueTomorrowCount: 0 };
  const totalPayable = dashboard?.totalPayable || 0;
  const totalReceivable = dashboard?.totalReceivable || 0;
  const urgentCount = s.overdueCount + s.dueTodayCount;

  return (
    <div className="space-y-2">
      {/* Alert banner if there are urgent items */}
      {urgentCount > 0 && (
        <div className="bg-gradient-to-r from-red-950/60 to-orange-950/40 border border-red-500/40 rounded-xl p-2.5 flex items-center gap-2">
          <div className="relative">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">{urgentCount}</span>
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-red-300 font-bold">
              {s.overdueCount > 0 && `${s.overdueCount} atrasada(s)`}
              {s.overdueCount > 0 && s.dueTodayCount > 0 && ' + '}
              {s.dueTodayCount > 0 && `${s.dueTodayCount} vence hoje`}
            </p>
          </div>
          {s.dueTomorrowCount > 0 && (
            <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">{s.dueTomorrowCount} amanhã</span>
          )}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div className={`rounded-xl p-3 text-center ${urgentCount > 0 ? 'bg-red-950/60 border-2 border-red-500/50' : 'bg-red-950/40 border border-red-500/30'}`}>
          <AlertCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-xl font-black text-red-400">{urgentCount}</p>
          <p className="text-[10px] text-red-400/70">Atenção</p>
        </div>
        <div className="bg-orange-950/40 border border-orange-500/30 rounded-xl p-3 text-center">
          <Banknote className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <p className="text-lg font-black text-orange-400">
            {totalPayable > 0 ? `${(totalPayable / 1000).toFixed(0)}k` : '0'}
          </p>
          <p className="text-[10px] text-orange-400/70">A Pagar (mês)</p>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-center">
          <DollarSign className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-lg font-black text-emerald-400">
            {totalReceivable > 0 ? `${(totalReceivable / 1000).toFixed(0)}k` : '0'}
          </p>
          <p className="text-[10px] text-emerald-400/70">A Receber (mês)</p>
        </div>
      </div>
    </div>
  );
}

export default function MinhaArea() {
  const tenantSlug = getCurrentTenantSlug();
  const [, navigate] = useLocation();
  const params = useParams<{ sellerId: string }>();
  const sellerId = parseInt(params.sellerId || "0");
  const { name: tenantName, logoUrl } = useBranding();

  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const { data: seller } = trpc.sellers.getById.useQuery({ id: sellerId }, { enabled: sellerId > 0 });
  const { data: unreadCount } = trpc.notifications.unreadCountSeller.useQuery({ sellerId }, { enabled: sellerId > 0 });
  const { data: activeCompetitions } = trpc.competitions.list.useQuery({ status: "active" });
  const activeComp = activeCompetitions?.[0];
  const { data: compRanking } = trpc.competitions.ranking.useQuery({ id: activeComp?.id || 0 }, { enabled: !!activeComp?.id, refetchInterval: 30000 });
  const { isSupported: pushSupported, isSubscribed, subscribe: subscribePush, permission } = usePushNotifications(sellerId);

  const dept = sellerSession?.department || "vendas";
  const deptInfo = DEPT_CONFIG[dept] || DEPT_CONFIG.vendas;
  const sellerDisplayName = seller?.nickname || seller?.name || sellerSession?.nickname || sellerSession?.name || "Vendedor";

  // Link de vendas rastreável ("meu link") - leva pro estoque público já marcado com este vendedor
  const [linkCopied, setLinkCopied] = useState(false);
  const [showSalesLinkQr, setShowSalesLinkQr] = useState(false);
  const mySalesLink = useMemo(() => {
    const base = `${window.location.origin}${buildTenantPath(tenantSlug, "/estoque")}`;
    return `${base}?vendedor=${sellerId}&utm_source=vendedor&utm_medium=link_direto`;
  }, [tenantSlug, sellerId]);
  const copyMySalesLink = () => {
    navigator.clipboard.writeText(mySalesLink);
    setLinkCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Upload de foto de perfil
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const utils = trpc.useUtils();
  const uploadMyPhotoMut = trpc.sellers.uploadMyPhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto atualizada com sucesso!");
      utils.sellers.getById.invalidate({ id: sellerId });
      utils.sellers.me.invalidate();
      setUploadingPhoto(false);
    },
    onError: (err) => { toast.error(err.message); setUploadingPhoto(false); },
  });
  const handleProfilePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 7 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 7MB.'); return; }
    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await uploadMyPhotoMut.mutateAsync({ base64, mimeType: file.type });
    };
    reader.onerror = () => { toast.error('Erro ao ler arquivo'); setUploadingPhoto(false); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [uploadMyPhotoMut]);

  // Filter state for F&I records
  const [feiFilter, setFeiFilter] = useState<"todos" | "approved" | "pending" | "rejected">("todos");

  // Documentos de Venda state
  const [showDocTab, setShowDocTab] = useState(false);
  const cnhInputRef = useRef<HTMLInputElement>(null);
  const comprovanteInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocId, setUploadingDocId] = useState<number | null>(null);
  const [uploadingType, setUploadingType] = useState<'cnh' | 'comprovante' | null>(null);

  // Pós-Venda state
  const [showPvModal, setShowPvModal] = useState(false);
  const [pvForm, setPvForm] = useState({ clienteNome: '', clienteTelefone: '', carroModelo: '', carroPlaca: '', problemaRelatado: '', observacoes: '' });
  const [pvFilter, setPvFilter] = useState<string>('todos');
  const [pvServicoEdit, setPvServicoEdit] = useState('');

  // Buscar dados específicos do setor
  const { data: appointments } = trpc.sdr.myAppointments.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && (dept === "vendas" || dept === "pre_vendas") }
  );
  const { data: mySales } = trpc.sales.list.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && dept === "vendas" }
  );
  const { data: myFei } = trpc.fei.list.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && dept === "fei" }
  );
  const { data: myConsignment } = trpc.consignment.list.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && dept === "consignacao" }
  );
  const { data: myDispatch } = trpc.dispatch.list.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && dept === "despachante" }
  );

  // Documentos de venda (para vendedores)
  const { data: myDocs, refetch: refetchDocs } = trpc.saleDocuments.myDocs.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && dept === "vendas" }
  );
  const { data: pendingDocsCount } = trpc.saleDocuments.pendingCount.useQuery(
    { sellerId },
    { enabled: sellerId > 0 && dept === "vendas" }
  );
  const uploadCnhMutation = trpc.saleDocuments.uploadCnh.useMutation({
    onSuccess: () => { toast.success('CNH enviada com sucesso!'); refetchDocs(); setUploadingDocId(null); setUploadingType(null); },
    onError: (e) => toast.error(e.message),
  });
  const uploadComprovanteMutation = trpc.saleDocuments.uploadComprovante.useMutation({
    onSuccess: () => { toast.success('Comprovante enviado com sucesso!'); refetchDocs(); setUploadingDocId(null); setUploadingType(null); },
    onError: (e) => toast.error(e.message),
  });

  // Pós-Venda - chamados do vendedor (ou TODOS se for setor pos_venda)
  const { data: myPvChamados, refetch: refetchPv } = trpc.pvChamados.list.useQuery(
    dept === 'pos_venda' ? {} : { vendedorId: sellerId },
    { enabled: sellerId > 0 }
  );
  // Dados extras para painel pós-venda
  const { data: pvCounts } = trpc.pvChamados.counts.useQuery(undefined, { enabled: dept === 'pos_venda' });
  const { data: pvOficinas } = trpc.pvOficinas.list.useQuery(undefined, { enabled: dept === 'pos_venda' });
  const { data: allSellers } = trpc.sellers.list.useQuery(undefined, { enabled: dept === 'pos_venda' });
  const [pvSearch, setPvSearch] = useState('');
  const [pvSelectedChamado, setPvSelectedChamado] = useState<any>(null);
  const [pvStatusUpdate, setPvStatusUpdate] = useState('');
  const updatePvMutation = trpc.pvChamados.updateBySeller.useMutation({
    onSuccess: () => {
      toast.success('Chamado atualizado!');
      refetchPv();
      setPvSelectedChamado(null);
    },
    onError: (err) => toast.error(err.message),
  });
  const createPvMutation = trpc.pvChamados.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowPvModal(false);
      setPvForm({ clienteNome: '', clienteTelefone: '', carroModelo: '', carroPlaca: '', problemaRelatado: '', observacoes: '' });
      refetchPv();
    },
    onError: (err) => toast.error(err.message),
  });

  // Buscar metas individuais do vendedor logado
  const now = useMemo(() => new Date(), []);
  const { data: myGoals } = trpc.goals.list.useQuery(
    { month: now.getMonth() + 1, year: now.getFullYear() },
    { enabled: sellerId > 0 }
  );
  const individualGoals = useMemo(() => (myGoals || []).filter((g: any) => g.type === 'individual' && g.sellerId === sellerId), [myGoals, sellerId]);

  const logoutMutation = trpc.sellers.logout.useMutation({
    onSuccess: () => {
      toast.success("Logout realizado!");
      window.location.href = buildTenantPath(tenantSlug, "/login");
    },
  });

  const editSaleValue = trpc.sales.editValue.useMutation({
    onSuccess: () => {
      toast.success("Valor corrigido com sucesso!");
      utils.sales.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao editar valor"),
  });

  const editFeiValue = trpc.fei.update.useMutation({
    onSuccess: () => {
      toast.success("F&I atualizado com sucesso!");
      utils.fei.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao editar F&I"),
  });

  // === BUSCA POR PLACA (todos os setores) ===
  const [sectorSearch, setSectorSearch] = useState("");

  // === DELETE mutations ===
  const deleteSaleMut = trpc.sales.delete.useMutation({
    onSuccess: () => { toast.success("Venda excluída!"); utils.sales.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteFeiMut = trpc.fei.delete.useMutation({
    onSuccess: () => { toast.success("F&I excluído!"); utils.fei.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteDispatchMut = trpc.dispatch.delete.useMutation({
    onSuccess: () => { toast.success("Despachante excluído!"); utils.dispatch.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteConsignmentMut = trpc.consignment.delete.useMutation({
    onSuccess: () => { toast.success("Consignação excluída!"); utils.consignment.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  // === UPDATE mutations ===
  const updateDispatchMut = trpc.dispatch.update.useMutation({
    onSuccess: () => { toast.success("Despachante atualizado!"); utils.dispatch.list.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateConsignmentMut = trpc.consignment.update.useMutation({
    onSuccess: () => { toast.success("Consignação atualizada!"); utils.consignment.list.invalidate(); setEditConsignOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateExitMut = trpc.consignment.updateExit.useMutation({
    onSuccess: () => { toast.success("Saída registrada!"); utils.consignment.list.invalidate(); setExitDialogOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  // Edit consignment dialog state
  const [editConsignOpen, setEditConsignOpen] = useState(false);
  const [editConsignRecord, setEditConsignRecord] = useState<any>(null);
  // Exit dialog state
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitRecordId, setExitRecordId] = useState<number | null>(null);
  const [exitDate, setExitDate] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [consignFilter, setConsignFilter] = useState<'todos' | 'patio' | 'saida'>('patio');
  const [consignPage, setConsignPage] = useState(1);
  const CONSIGN_PAGE_SIZE = 15;

  // Stats por setor
  const activeAppointments = (appointments || []).filter((a: any) => a.status === 'approved' && a.attendanceStatus === 'pending');
  const pendingApproval = (appointments || []).filter((a: any) => a.attendanceStatus === 'attended');
  const totalAppointments = (appointments || []).length;

  const filteredSales = useMemo(() => {
    let list = mySales || [];
    if (sectorSearch.trim()) {
      const q = sectorSearch.toUpperCase().replace(/[^A-Z0-9]/g, '');
      list = list.filter((s: any) => {
        const plate = (s.vehiclePlate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const model = (s.vehicleModel || '').toUpperCase();
        const client = (s.customerName || '').toUpperCase();
        return plate.includes(q) || model.includes(sectorSearch.toUpperCase()) || client.includes(sectorSearch.toUpperCase());
      });
    }
    return list;
  }, [mySales, sectorSearch]);
  const approvedSales = filteredSales.filter((s: any) => s.status === 'approved');
  const pendingSales = filteredSales.filter((s: any) => s.status === 'pending');

  const allFei = myFei || [];
  const approvedFei = allFei.filter((r: any) => r.status === 'approved');
  const pendingFei = allFei.filter((r: any) => r.status === 'pending');
  const rejectedFei = allFei.filter((r: any) => r.status === 'rejected');

  const filteredFei = useMemo(() => {
    let list = allFei;
    if (feiFilter !== "todos") list = list.filter((r: any) => r.status === feiFilter);
    if (sectorSearch.trim()) {
      const q = sectorSearch.toUpperCase().replace(/[^A-Z0-9]/g, '');
      list = list.filter((r: any) => {
        const plate = (r.vehiclePlate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const name = (r.customerName || '').toUpperCase();
        const cpf = (r.customerCpf || '').replace(/[^0-9]/g, '');
        return plate.includes(q) || name.includes(sectorSearch.toUpperCase()) || cpf.includes(q);
      });
    }
    return list;
  }, [allFei, feiFilter, sectorSearch]);

  const filteredConsignment = useMemo(() => {
    let list = myConsignment || [];
    if (sectorSearch.trim()) {
      const q = sectorSearch.toUpperCase().replace(/[^A-Z0-9]/g, '');
      list = list.filter((r: any) => {
        const plate = (r.vehiclePlate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const model = (r.vehicleModel || '').toUpperCase();
        const owner = (r.ownerName || '').toUpperCase();
        return plate.includes(q) || model.includes(sectorSearch.toUpperCase()) || owner.includes(sectorSearch.toUpperCase());
      });
    }
    return list;
  }, [myConsignment, sectorSearch]);
  const approvedConsignment = filteredConsignment.filter((r: any) => r.status === 'approved');
  const pendingConsignment = filteredConsignment.filter((r: any) => r.status === 'pending');
  const activeConsignment = filteredConsignment.filter((r: any) => r.status === 'approved' && !r.exitDate);

  const filteredDispatch = useMemo(() => {
    let list = myDispatch || [];
    if (sectorSearch.trim()) {
      const q = sectorSearch.toUpperCase().replace(/[^A-Z0-9]/g, '');
      list = list.filter((r: any) => {
        const plate = (r.vehiclePlate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const docType = (r.documentType || '').toUpperCase();
        return plate.includes(q) || docType.includes(sectorSearch.toUpperCase());
      });
    }
    return list;
  }, [myDispatch, sectorSearch]);
  const approvedDispatch = filteredDispatch.filter((r: any) => r.status === 'approved');
  const pendingDispatch = filteredDispatch.filter((r: any) => r.status === 'pending');

  // Pós-Venda computed
  const allPv = myPvChamados || [];
  const pvAbertos = allPv.filter((c: any) => c.status === 'aberto');
  const pvAgendados = allPv.filter((c: any) => c.status === 'agendado');
  const pvEmServico = allPv.filter((c: any) => c.status === 'em_servico');
  const pvFinalizados = allPv.filter((c: any) => c.status === 'finalizado');
  const pvEntregues = allPv.filter((c: any) => c.status === 'entregue');
  const filteredPv = useMemo(() => {
    if (pvFilter === 'todos') return allPv;
    return allPv.filter((c: any) => c.status === pvFilter);
  }, [allPv, pvFilter]);

  const pvStatusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    aberto: { label: 'Aberto', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    agendado: { label: 'Agendado', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
    em_servico: { label: 'Em Serviço', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
    finalizado: { label: 'Finalizado', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
    entregue: { label: 'Entregue', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' },
  };

  const DeptIcon = deptInfo.icon;

  // Função de upload de arquivo (converte para base64)
  const handleFileUpload = useCallback((docId: number, type: 'cnh' | 'comprovante') => {
    setUploadingDocId(docId);
    setUploadingType(type);
    if (type === 'cnh') cnhInputRef.current?.click();
    else comprovanteInputRef.current?.click();
  }, []);

  const processFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingDocId || !uploadingType) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 10MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      if (uploadingType === 'cnh') {
        uploadCnhMutation.mutate({ id: uploadingDocId, sellerId, base64, filename: file.name });
      } else {
        uploadComprovanteMutation.mutate({ id: uploadingDocId, sellerId, base64, filename: file.name });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [uploadingDocId, uploadingType, sellerId, uploadCnhMutation, uploadComprovanteMutation]);

  const pendingDocsList = useMemo(() => (myDocs || []).filter((d: any) => d.docStatus !== 'completo'), [myDocs]);
  const completeDocs = useMemo(() => (myDocs || []).filter((d: any) => d.docStatus === 'completo'), [myDocs]);

  // Verificar se o vendedor logado é o mesmo do URL (gerente pode ver a área de qualquer vendedor, igual já é permitido no backend)
  const isAuthorized = !!sellerSession && (sellerSession.id === sellerId || sellerSession.sellerRole === "gerente");

  if (!sellerSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Você precisa fazer login para acessar esta área.</p>
          <Button onClick={() => window.location.href = buildTenantPath(tenantSlug, "/")} className="bg-red-600 hover:bg-red-500">
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">Você não tem permissão para acessar os dados deste colaborador.</p>
          <Button onClick={() => navigate(buildTenantPath(tenantSlug, `/minha-area/${sellerSession.id}`))} className="bg-red-600 hover:bg-red-500">
            Ir para minha área
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <input type="file" ref={profilePhotoRef} accept="image/*" className="hidden" onChange={handleProfilePhotoChange} />
            <div className="relative cursor-pointer" onClick={() => profilePhotoRef.current?.click()}>
              {seller?.photoUrl ? (
                <img src={seller.photoUrl} alt={seller.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-red-500" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center ring-2 ring-red-500">
                  <User className="w-5 h-5 text-red-400" />
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border border-gray-900">
                <Camera className="w-2.5 h-2.5 text-white" />
              </div>
              {uploadingPhoto && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <img src={logoUrl} alt={tenantName} className="h-3.5 w-3.5 rounded object-contain" />
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{tenantName}</p>
              </div>
              <p className="text-white font-bold text-sm">{sellerDisplayName}</p>
              <p className={`text-xs ${deptInfo.color}`}>{deptInfo.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pushSupported && !isSubscribed && permission !== "denied" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  const ok = await subscribePush();
                  if (ok) toast.success("Notificações ativadas!");
                }}
                className="text-yellow-500 hover:text-yellow-400"

              >
                <Bell className="w-4 h-4" />
              </Button>
            )}
            {isSubscribed && <BellRing className="w-4 h-4 text-emerald-500" />}
            <NotificationCenter sellerId={sellerId} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              className="text-gray-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Meu link de vendas - rastreia leads que vieram por este vendedor */}
        {dept === "vendas" && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-primary" /> Meu link de vendas
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">Compartilhe pra saber quais leads vieram por você</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setShowSalesLinkQr(s => !s)}>
                  <QrCode className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={copyMySalesLink}>
                  {linkCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            {showSalesLinkQr && (
              <div className="flex justify-center mt-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mySalesLink)}`}
                  alt="QR code do meu link de vendas"
                  className="rounded-lg bg-white p-2"
                  width={160}
                  height={160}
                />
              </div>
            )}
          </div>
        )}

        {/* Stats Cards - Pós-Venda e Financeiro têm painel próprio */}
        {dept === 'financeiro' ? (
          <FinanceiroStatsCards />
        ) : dept === 'pos_venda' ? (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 text-center">
              <Clipboard className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-xl font-black text-blue-400">{pvCounts?.aberto || 0}</p>
              <p className="text-[10px] text-blue-400/70">Abertos</p>
            </div>
            <div className="bg-yellow-950/40 border border-yellow-500/30 rounded-xl p-3 text-center">
              <Calendar className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
              <p className="text-xl font-black text-yellow-400">{pvCounts?.agendado || 0}</p>
              <p className="text-[10px] text-yellow-400/70">Agendados</p>
            </div>
            <div className="bg-orange-950/40 border border-orange-500/30 rounded-xl p-3 text-center">
              <Wrench className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <p className="text-xl font-black text-orange-400">{pvCounts?.em_servico || 0}</p>
              <p className="text-[10px] text-orange-400/70">Em Serviço</p>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-black text-emerald-400">{(pvCounts?.finalizado || 0) + (pvCounts?.entregue || 0)}</p>
              <p className="text-[10px] text-emerald-400/70">Concluídos</p>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
            <DeptIcon className={`w-5 h-5 ${deptInfo.color} mx-auto mb-1`} />
            <p className="text-2xl font-black text-white">
              {dept === "vendas" ? approvedSales.length :
               dept === "fei" ? approvedFei.length :
               dept === "consignacao" ? approvedConsignment.length :
               dept === "despachante" ? approvedDispatch.length :
               totalAppointments}
            </p>
            <p className="text-xs text-gray-500">
              {dept === "vendas" ? "Vendas" :
               dept === "fei" ? "Aprovadas" :
               dept === "consignacao" ? "Consignações" :
               dept === "despachante" ? "Documentos" :
               "Agendamentos"}
            </p>
          </div>
          {(dept === 'vendas' || dept === 'pre_vendas') && (
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
              <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-2xl font-black text-white">{seller?.totalPoints || 0}</p>
              <p className="text-xs text-gray-500">Pontos</p>
            </div>
          )}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
            <Bell className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-white">{unreadCount?.count || 0}</p>
            <p className="text-xs text-gray-500">Notificações</p>
          </div>
        </div>
        )}

        {/* F&I Extra Stats */}
        {dept === "fei" && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-black text-emerald-400">{approvedFei.length}</p>
              <p className="text-[10px] text-emerald-400/70">Aprovadas</p>
            </div>
            <div className="bg-yellow-950/30 border border-yellow-500/30 rounded-xl p-3 text-center">
              <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
              <p className="text-xl font-black text-yellow-400">{pendingFei.length}</p>
              <p className="text-[10px] text-yellow-400/70">Pendentes</p>
            </div>
            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3 text-center">
              <XCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
              <p className="text-xl font-black text-red-400">{rejectedFei.length}</p>
              <p className="text-[10px] text-red-400/70">Rejeitadas</p>
            </div>
          </div>
        )}

        {/* Meta Individual */}
        {individualGoals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4" /> Minha Meta do Mês
            </h2>
            {individualGoals.map((goal: any) => {
              const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
              return (
                <div key={goal.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 uppercase font-semibold">{goal.category}</span>
                    {goal.achieved && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Meta atingida!
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <span className="font-bold text-3xl text-white">{goal.currentValue}</span>
                      <span className="text-gray-500 text-lg">/{goal.targetValue}</span>
                    </div>
                    <span className={`text-lg font-bold ${pct >= 100 ? 'text-emerald-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${goal.achieved ? 'bg-emerald-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {goal.bonusDescription && (
                    <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Bônus: {goal.bonusDescription}
                      {goal.bonusValue ? ` — R$ ${goal.bonusValue.toLocaleString('pt-BR')}` : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ALERTA: Documentos Pendentes */}
        {dept === "vendas" && pendingDocsCount && pendingDocsCount > 0 && (
          <button
            onClick={() => setShowDocTab(!showDocTab)}
            className="w-full bg-gradient-to-r from-red-600/30 to-orange-600/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 hover:border-red-400/70 transition-all animate-pulse"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center shrink-0">
              <FileWarning className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-left flex-1">
              <p className="text-red-400 font-bold text-sm">{pendingDocsCount} Documento{pendingDocsCount > 1 ? 's' : ''} Pendente{pendingDocsCount > 1 ? 's' : ''}</p>
              <p className="text-gray-400 text-xs">Envie CNH e Comprovante para concluir suas vendas</p>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400" />
          </button>
        )}

        {/* Aba de Documentos de Venda */}
        {dept === "vendas" && showDocTab && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> Docs das Vendas
            </h2>

            {/* Hidden file inputs */}
            <input ref={cnhInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={processFileUpload} />
            <input ref={comprovanteInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={processFileUpload} />

            {/* Docs pendentes */}
            {pendingDocsList.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-red-400 font-semibold">Pendentes - Envie para concluir a venda</p>
                {pendingDocsList.map((doc: any) => (
                  <div key={doc.id} className="bg-red-950/20 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white font-bold text-sm">{doc.vehicleModel || 'Ve\u00edculo'}</p>
                        <p className="text-xs text-gray-500">{doc.clienteNome || 'Cliente'} {doc.vehiclePlate ? `\u2022 ${doc.vehiclePlate}` : ''}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/20 text-red-400 font-semibold">
                        {doc.docStatus === 'pendente' ? 'Faltam 2 docs' : 'Falta 1 doc'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* CNH */}
                      <button
                        onClick={() => !doc.cnhUrl && handleFileUpload(doc.id, 'cnh')}
                        disabled={!!doc.cnhUrl || uploadCnhMutation.isPending}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                          doc.cnhUrl
                            ? 'bg-emerald-950/30 border-emerald-500/40 cursor-default'
                            : 'bg-gray-900/60 border-gray-700 hover:border-red-500/50 cursor-pointer'
                        }`}
                      >
                        {doc.cnhUrl ? (
                          <FileCheck className="w-5 h-5 text-emerald-400" />
                        ) : uploadCnhMutation.isPending && uploadingDocId === doc.id ? (
                          <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5 text-gray-400" />
                        )}
                        <span className={`text-[10px] font-semibold ${doc.cnhUrl ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {doc.cnhUrl ? 'CNH Enviada' : 'Enviar CNH'}
                        </span>
                      </button>
                      {/* Comprovante */}
                      <button
                        onClick={() => !doc.comprovanteUrl && handleFileUpload(doc.id, 'comprovante')}
                        disabled={!!doc.comprovanteUrl || uploadComprovanteMutation.isPending}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                          doc.comprovanteUrl
                            ? 'bg-emerald-950/30 border-emerald-500/40 cursor-default'
                            : 'bg-gray-900/60 border-gray-700 hover:border-red-500/50 cursor-pointer'
                        }`}
                      >
                        {doc.comprovanteUrl ? (
                          <FileCheck className="w-5 h-5 text-emerald-400" />
                        ) : uploadComprovanteMutation.isPending && uploadingDocId === doc.id ? (
                          <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5 text-gray-400" />
                        )}
                        <span className={`text-[10px] font-semibold ${doc.comprovanteUrl ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {doc.comprovanteUrl ? 'Comprovante Enviado' : 'Enviar Comprovante'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Docs completos - com status da transfer\u00eancia */}
            {completeDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-emerald-400 font-semibold">Documentos Completos</p>
                {completeDocs.map((doc: any) => (
                  <div key={doc.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white font-bold text-sm">{doc.vehicleModel || 'Ve\u00edculo'}</p>
                        <p className="text-xs text-gray-500">{doc.clienteNome || 'Cliente'}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                        doc.dispatchStatus === 'transferido'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : doc.dispatchStatus === 'em_transferencia'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {doc.dispatchStatus === 'transferido' ? 'Transferido' :
                         doc.dispatchStatus === 'em_transferencia' ? 'Em Transfer\u00eancia' :
                         'Aguardando Despachante'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {doc.cnhUrl ? (
                        <a href={doc.cnhUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 flex items-center gap-1 hover:text-emerald-300 transition-colors">
                          <FileCheck className="w-3 h-3" /> CNH <Eye className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1"><FileCheck className="w-3 h-3" /> CNH</span>
                      )}
                      {doc.comprovanteUrl ? (
                        <a href={doc.comprovanteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 flex items-center gap-1 hover:text-emerald-300 transition-colors">
                          <FileCheck className="w-3 h-3" /> Comprovante <Eye className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1"><FileCheck className="w-3 h-3" /> Comprovante</span>
                      )}
                    </div>
                    {doc.dispatchStatus === 'transferido' && doc.documentoEmitidoUrl && (
                      <a
                        href={doc.documentoEmitidoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> Ver documento emitido
                      </a>
                    )}
                    {doc.transferredAt && (
                      <p className="text-[10px] text-gray-600 mt-1">Transferido em {formatDate(doc.transferredAt)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(myDocs || []).length === 0 && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 text-center">
                <FileCheck className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Nenhuma venda aprovada ainda. Documentos aparecer\u00e3o aqui quando suas vendas forem aprovadas.</p>
              </div>
            )}
          </div>
        )}

        {/* === CAMPO DE BUSCA POR PLACA/CARRO === */}
        {(dept === "vendas" || dept === "fei" || dept === "despachante" || dept === "consignacao" || dept === "pre_vendas") && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={sectorSearch}
                onChange={(e) => setSectorSearch(e.target.value)}
                placeholder="Buscar por placa, modelo ou cliente..."
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none uppercase"
              />
              {sectorSearch && (
                <button onClick={() => setSectorSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Botão Busca Geral Cross-Setor */}
            <button
              onClick={() => navigate(buildTenantPath(tenantSlug, "/busca-veiculo"))}
              className="w-full bg-gradient-to-r from-red-600/10 to-red-500/5 border border-red-500/30 rounded-xl p-3 flex items-center gap-3 hover:border-red-500/60 transition-all"
            >
              <Search className="w-5 h-5 text-red-400" />
              <div className="text-left flex-1">
                <p className="text-white font-bold text-sm">Busca Geral por Veículo</p>
                <p className="text-gray-400 text-[11px]">Ver tudo de um veículo em todos os setores</p>
              </div>
            </button>
          </div>
        )}

        {/* Pendentes - Vendas */}
        {dept === "vendas" && pendingSales.length > 0 && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Vendas aguardando aprovação ({pendingSales.length})
            </h3>
            {pendingSales.slice(0, 5).map((s: any) => (
              <div key={s.id} className="text-sm text-gray-300 py-2 border-b border-gray-800 last:border-0">
                <div className="flex justify-between items-center">
                  <div>
                    <span>{s.vehicleModel}</span>
                    <p className="text-xs text-gray-500">{formatDate(s.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{formatCurrency(s.value)}</span>
                    <button
                      onClick={() => {
                        const novoModelo = prompt(`Corrigir modelo:\n\nAtual: ${s.vehicleModel}\n\nDigite o novo modelo (ou deixe vazio para manter):`);
                        const novoValor = prompt(`Corrigir valor de ${s.vehicleModel}:\n\nValor atual: R$ ${s.value?.toLocaleString('pt-BR')}\n\nDigite o novo valor (ex: 70000, ou deixe vazio para manter):`);
                        const updateData: any = { saleId: s.id, value: s.value };
                        if (novoValor && novoValor.trim()) {
                          const parsed = parseFloat(novoValor.replace(/\./g, '').replace(',', '.'));
                          if (!isNaN(parsed) && parsed > 0) {
                            updateData.value = Math.round(parsed);
                          } else {
                            toast.error('Valor inválido!'); return;
                          }
                        }
                        if (novoModelo && novoModelo.trim()) {
                          updateData.vehicleModel = novoModelo.trim();
                        }
                        editSaleValue.mutate(updateData);
                      }}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Excluir venda "${s.vehicleModel}"?\nEsta ação não pode ser desfeita.`)) {
                          deleteSaleMut.mutate({ id: s.id });
                        }
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== PAINEL COMPLETO F&I ===== */}
        {dept === "fei" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Minhas Fichas F&I
            </h2>

            {/* Abas de filtro */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { key: "todos" as const, label: "Todas", count: allFei.length, color: "bg-gray-600" },
                { key: "approved" as const, label: "Aprovadas", count: approvedFei.length, color: "bg-emerald-600" },
                { key: "pending" as const, label: "Pendentes", count: pendingFei.length, color: "bg-yellow-600" },
                { key: "rejected" as const, label: "Rejeitadas", count: rejectedFei.length, color: "bg-red-600" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFeiFilter(tab.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    feiFilter === tab.key
                      ? `${tab.color} text-white shadow-lg`
                      : "bg-gray-800/60 text-gray-400 hover:bg-gray-700/60"
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    feiFilter === tab.key ? "bg-white/20" : "bg-gray-700"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Lista de fichas F&I */}
            {filteredFei.length > 0 ? (
              <div className="space-y-2">
                {filteredFei.map((r: any) => (
                  <div
                    key={r.id}
                    className={`rounded-xl p-4 border transition-all ${
                      r.status === 'approved'
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : r.status === 'pending'
                        ? 'bg-yellow-950/20 border-yellow-500/30'
                        : 'bg-red-950/20 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-bold text-sm">{r.bankName}</p>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {r.returnType} • Registrado em {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`text-sm font-bold ${
                          r.status === 'approved' ? 'text-emerald-400' :
                          r.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(r.financedValue)}
                        </p>
                        {r.status === 'approved' && (
                          <p className="text-[10px] text-yellow-500 font-semibold">+{r.points} pts</p>
                        )}
                      </div>
                    </div>

                    {/* Detalhes extras */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pt-2 border-t border-gray-800/50">
                      {r.vehiclePlate && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-600">Placa:</span>
                          <span className="text-[10px] text-gray-400 font-medium">{r.vehiclePlate}</span>
                        </div>
                      )}
                      {r.customerCpf && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-600">CPF:</span>
                          <span className="text-[10px] text-gray-400 font-medium">{r.customerCpf}</span>
                        </div>
                      )}
                      {r.paymentDate && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-600">Pgto banco:</span>
                          <span className="text-[10px] text-gray-400 font-medium">{formatDate(r.paymentDate)}</span>
                        </div>
                      )}
                      {r.notes && (
                        <div className="col-span-2 flex items-center gap-1">
                          <span className="text-[10px] text-gray-600">Obs:</span>
                          <span className="text-[10px] text-gray-400">{r.notes}</span>
                        </div>
                      )}
                    </div>
                    {/* Botões Editar + Excluir F&I */}
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-800/50">
                      <button
                        onClick={() => {
                          const novoValor = prompt(`Corrigir valor financiado:\n\nAtual: R$ ${(r.financedValue / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2})}\n\nDigite o novo valor (ex: 50000):`);
                          if (novoValor && novoValor.trim()) {
                            const parsed = parseFloat(novoValor.replace(/\./g, '').replace(',', '.'));
                            if (!isNaN(parsed) && parsed > 0) {
                              editFeiValue.mutate({ id: r.id, financedValue: Math.round(parsed * 100) });
                            } else {
                              toast.error('Valor inválido!');
                            }
                          }
                        }}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir F&I "${r.bankName} - ${r.vehiclePlate}"?\nEsta ação não pode ser desfeita.`)) {
                            deleteFeiMut.mutate({ id: r.id });
                          }
                        }}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 text-center">
                <Filter className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">
                  {feiFilter === "todos"
                    ? "Nenhuma ficha F&I registrada ainda."
                    : `Nenhuma ficha ${feiFilter === "approved" ? "aprovada" : feiFilter === "pending" ? "pendente" : "rejeitada"}.`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===== MINHAS FICHAS DE FINANCIAMENTO (Vendedor) ===== */}
        {dept === "vendas" && (
          <MinhasFichasFinanciamento sellerId={Number(sellerId)} />
        )}

        {/* Pendentes - Consignação */}
        {dept === "consignacao" && pendingConsignment.length > 0 && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Consignações aguardando aprovação ({pendingConsignment.length})
            </h3>
            {pendingConsignment.slice(0, 5).map((r: any) => (
              <div key={r.id} className="text-sm text-gray-300 py-2 border-b border-orange-500/10 last:border-0">
                <div className="flex justify-between">
                  <span>{r.vehicleModel} - {r.vehiclePlate}</span>
                  <span className="text-gray-500 text-xs">{formatDate(r.entryDate)}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.hasAuction && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Leilão</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.vehicleStatus === 'financiado' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {r.vehicleStatus === 'financiado' ? 'Financiado' : 'Quitado'}
                  </span>
                  {r.costValue && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Custo: R$ {r.costValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Seção "Veículos no pátio" removida - agora integrada na listagem paginada abaixo */}

        {dept === "despachante" && pendingDispatch.length > 0 && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Documentos aguardando aprovação ({pendingDispatch.length})
            </h3>
            {pendingDispatch.map((r: any) => (
              <div key={r.id} className="text-sm text-gray-300 py-2 border-b border-gray-800 last:border-0">
                <div className="flex justify-between items-center">
                  <div>
                    <span>{r.documentType}</span>
                    <p className="text-xs text-gray-500">Placa: {r.vehiclePlate || 'N/I'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const novaPlaca = prompt(`Editar placa:\n\nAtual: ${r.vehiclePlate || 'N/I'}`);
                        const novoDoc = prompt(`Editar tipo documento:\n\nAtual: ${r.documentType}`);
                        const data: any = { id: r.id };
                        if (novaPlaca && novaPlaca.trim()) data.vehiclePlate = novaPlaca.trim().toUpperCase();
                        if (novoDoc && novoDoc.trim()) data.documentType = novoDoc.trim();
                        if (data.vehiclePlate || data.documentType) updateDispatchMut.mutate(data);
                      }}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Excluir "${r.documentType} - ${r.vehiclePlate}"?`)) {
                          deleteDispatchMut.mutate({ id: r.id });
                        }
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(dept === "vendas" || dept === "pre_vendas") && pendingApproval.length > 0 && (
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4">
            <h3 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Comparecimento aguardando aprovação ({pendingApproval.length})
            </h3>
            {pendingApproval.map((apt: any) => (
              <div key={apt.id} className="text-sm text-gray-300 py-1">
                {apt.customerName} - {apt.ticketNumber}
              </div>
            ))}
          </div>
        )}

        {/* ===== PAINEL COMPLETO PÓS-VENDA ===== */}
        {dept === 'pos_venda' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Painel Pós-Venda
            </h2>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={pvSearch}
                onChange={e => setPvSearch(e.target.value)}
                placeholder="Buscar por cliente, placa, ticket..."
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Filtros de status */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { key: 'todos', label: 'Todos', count: allPv.length, color: 'bg-gray-600' },
                { key: 'aberto', label: 'Abertos', count: pvAbertos.length, color: 'bg-blue-600' },
                { key: 'agendado', label: 'Agendados', count: pvAgendados.length, color: 'bg-yellow-600' },
                { key: 'em_servico', label: 'Em Serviço', count: pvEmServico.length, color: 'bg-orange-600' },
                { key: 'finalizado', label: 'Finalizados', count: pvFinalizados.length, color: 'bg-emerald-600' },
                { key: 'entregue', label: 'Entregues', count: pvEntregues.length, color: 'bg-gray-500' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPvFilter(tab.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    pvFilter === tab.key
                      ? `${tab.color} text-white shadow-lg`
                      : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    pvFilter === tab.key ? 'bg-white/20' : 'bg-gray-700'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Lista de chamados com visão ampla */}
            {(() => {
              const searchLower = pvSearch.toLowerCase();
              const filtered = filteredPv.filter((c: any) => {
                if (!pvSearch) return true;
                return (
                  c.clienteNome?.toLowerCase().includes(searchLower) ||
                  c.carroPlaca?.toLowerCase().includes(searchLower) ||
                  c.carroModelo?.toLowerCase().includes(searchLower) ||
                  c.ticketNumber?.toLowerCase().includes(searchLower) ||
                  c.problemaRelatado?.toLowerCase().includes(searchLower)
                );
              });
              const vendedorMap = (allSellers || []).reduce((acc: any, s: any) => { acc[s.id] = s; return acc; }, {});
              return filtered.length > 0 ? (
                <div className="space-y-3">
                  {filtered.map((c: any) => {
                    const sc = pvStatusConfig[c.status] || pvStatusConfig.aberto;
                    const prazo = c.prazoEntrega ? new Date(c.prazoEntrega) : null;
                    const isOverdue = prazo && prazo.getTime() < Date.now() && c.status !== 'entregue' && c.status !== 'finalizado' && c.status !== 'cancelado';
                    const vendedor = vendedorMap[c.vendedorId];
                    return (
                      <div
                        key={c.id}
                        onClick={() => { setPvSelectedChamado(c); setPvStatusUpdate(c.status); }}
                        className={`rounded-xl p-4 border transition-all cursor-pointer hover:scale-[1.01] ${sc.bg} ${sc.border}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-bold text-sm">{c.clienteNome}</p>
                              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} font-semibold border ${sc.border}`}>
                                {sc.label}
                              </span>
                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/30 text-red-400 font-bold animate-pulse">
                                  ATRASADO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              #{c.ticketNumber} • {c.carroModelo} {c.carroPlaca ? `• ${c.carroPlaca}` : ''}
                            </p>
                          </div>
                          <Eye className="w-4 h-4 text-gray-500 shrink-0 mt-1" />
                        </div>
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                          <span className="text-gray-600">Problema:</span> {c.problemaRelatado}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
                          {vendedor && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {vendedor.nickname || vendedor.name}
                            </span>
                          )}
                          <span>Aberto: {formatDate(c.createdAt)}</span>
                          {prazo && <span>Prazo: {formatDate(c.prazoEntrega)}</span>}
                          {c.oficinaNome && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{c.oficinaNome}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 text-center">
                  <Wrench className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">{pvSearch ? 'Nenhum chamado encontrado.' : 'Nenhum chamado registrado.'}</p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Ações Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Financeiro - Ações específicas do setor */}
          {dept === 'financeiro' && (
            <>
              <button
                onClick={() => navigate(buildTenantPath(tenantSlug, "/financeiro"))}
                className="w-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/60 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-bold">Contas a Pagar / Receber</p>
                  <p className="text-gray-400 text-sm">Gerenciar todas as contas</p>
                </div>
              </button>
              <button
                onClick={() => navigate(buildTenantPath(tenantSlug, "/financeiro?tab=gasolina"))}
                className="w-full bg-gradient-to-r from-amber-600/20 to-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/60 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Car className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-bold">Gasolina / Abastecimento</p>
                  <p className="text-gray-400 text-sm">Controle de combustível dos veículos</p>
                </div>
              </button>
              <button
                onClick={() => navigate(buildTenantPath(tenantSlug, "/financeiro?tab=pos-venda"))}
                className="w-full bg-gradient-to-r from-orange-600/20 to-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-orange-500/60 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-orange-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-white font-bold">Pós-Venda</p>
                  <p className="text-gray-400 text-sm">Acompanhar chamados e orçamentos</p>
                </div>
              </button>
            </>
          )}

          {/* Agendamentos - para Vendas e Pré-Vendas */}
          {(dept === "vendas" || dept === "pre_vendas") && (
            <button
              onClick={() => navigate(buildTenantPath(tenantSlug, `/agendamentos/${sellerId}`))}
              className="w-full bg-gradient-to-r from-blue-600/20 to-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/60 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold">Meus Agendamentos</p>
                <p className="text-gray-400 text-sm">
                  {activeAppointments.length > 0
                    ? `${activeAppointments.length} ativo(s)`
                    : "Ver e criar agendamentos"
                  }
                </p>
              </div>
              {activeAppointments.length > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {activeAppointments.length}
                </span>
              )}
            </button>
          )}

          {/* Feirão - para Vendas e Pré-Vendas */}
          {(dept === "vendas" || dept === "pre_vendas") && (
            <button
              onClick={() => navigate(buildTenantPath(tenantSlug, "/feirao"))}
              className="w-full bg-gradient-to-r from-red-600/20 to-orange-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-red-500/60 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Flame className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold">Ranking Feirão</p>
                <p className="text-gray-400 text-sm">Ver ranking e conferência de comparecimento</p>
              </div>
            </button>
          )}

          {/* Conversões SDR - para Pré-Vendas */}
          {dept === "pre_vendas" && (
            <SdrConversionsCard sellerId={Number(sellerId)} />
          )}

          {/* Central de Resultados */}
          {dept === "vendas" && (
            <button
              onClick={() => navigate(buildTenantPath(tenantSlug, `/meus-resultados/${sellerId}`))}
              className="w-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/60 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold">Central de Resultados</p>
                <p className="text-gray-400 text-sm">Comissões, bônus, vales e simulações</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          )}

          {/* Carros Bônus & Campanhas */}
          {dept === "vendas" && (
            <button
              onClick={() => navigate(buildTenantPath(tenantSlug, `/carros-bonus/${sellerId}`))}
              className="w-full bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-yellow-500/60 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center">
                <Flame className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold">Carros Bônus & Campanhas</p>
                <p className="text-gray-400 text-sm">Veja os carros com bônus e campanhas ativas</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          )}

          {/* Registrar - botão específico por setor (não mostrar para financeiro) */}
          {dept !== 'financeiro' && (
          <button
            onClick={() => navigate(buildTenantPath(tenantSlug, `/registrar-venda?tab=${dept === 'vendas' ? 'vendas' : dept === 'fei' ? 'fei' : dept === 'consignacao' ? 'consignacao' : dept === 'despachante' ? 'despachante' : 'pre_vendas'}`))}
            className={`w-full bg-gradient-to-r ${deptInfo.gradient} rounded-xl p-4 flex items-center gap-4 hover:opacity-80 transition-all`}
          >
            <div className={`w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center`}>
              <PlusCircle className={`w-6 h-6 ${deptInfo.color}`} />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold">
                {dept === "vendas" ? "Registrar Venda" :
                 dept === "fei" ? "Registrar F&I" :
                 dept === "consignacao" ? "Registrar Consignação" :
                 dept === "despachante" ? "Registrar Documento" :
                 "Registrar Agendamento"}
              </p>
              <p className="text-gray-400 text-sm">Enviar para aprovação do gerente</p>
            </div>
          </button>
          )}

          {/* Pós-Venda - Abrir Chamado */}
          <button
            onClick={() => setShowPvModal(true)}
            className="w-full bg-gradient-to-r from-orange-600/20 to-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-orange-500/60 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold">Abrir Chamado Pós-Venda</p>
              <p className="text-gray-400 text-sm">
                {pvAbertos.length > 0 ? `${pvAbertos.length} aberto(s)` : 'Reportar problema de cliente'}
              </p>
            </div>
            {allPv.length > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {allPv.length}
              </span>
            )}
          </button>

          {/* CRM - Meus Clientes */}
          <button
            onClick={() => navigate(buildTenantPath(tenantSlug, "/crm"))}
            className="w-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/60 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <LayoutGrid className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold">CRM - Meus Clientes</p>
              <p className="text-gray-400 text-sm">Gerenciar leads, pipeline e contatos</p>
            </div>
          </button>

          {/* Simulador de Financiamento */}
          {(dept === "vendas" || dept === "fei") && (
            <button
              onClick={() => navigate(buildTenantPath(tenantSlug, `/simulador-financiamento/${sellerId}`))}
              className="w-full bg-gradient-to-r from-teal-600/20 to-emerald-500/10 border border-teal-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-teal-500/60 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-teal-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold">Simulador de Financiamento</p>
                <p className="text-gray-400 text-sm">Calcule parcelas e argumente com o cliente</p>
              </div>
            </button>
          )}

          {/* Ficha de Financiamento / Mesa de Crédito */}
          {(dept === "vendas") && (
            <button
              onClick={() => navigate(buildTenantPath(tenantSlug, "/ficha-financiamento"))}
              className="w-full bg-gradient-to-r from-blue-600/20 to-indigo-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/60 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold">Enviar Ficha p/ Mesa de Crédito</p>
                <p className="text-gray-400 text-sm">Preencha a ficha cadastral para financiamento</p>
              </div>
            </button>
          )}
          {(dept === "fei") && (
            <button
              onClick={() => navigate(buildTenantPath(tenantSlug, "/mesa-credito"))}
              className="w-full bg-gradient-to-r from-blue-600/20 to-indigo-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/60 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold">Mesa de Crédito</p>
                <p className="text-gray-400 text-sm">Analisar fichas de financiamento</p>
              </div>
            </button>
          )}

          {/* Competição Ativa - Ranking ao Vivo */}
          {dept !== 'financeiro' && activeComp && compRanking && compRanking.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-600/10 via-orange-500/5 to-red-500/10 border border-yellow-500/30 rounded-xl overflow-hidden">
              {/* Header da competição */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-white font-bold text-sm">{activeComp.name}</p>
                    <p className="text-gray-500 text-[10px]">
                      {new Date(activeComp.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {new Date(activeComp.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  AO VIVO
                </span>
              </div>

              {/* Minha posição */}
              {(() => {
                const myEntry = compRanking.find(r => r.participant.sellerId === sellerId);
                if (!myEntry) return null;
                return (
                  <div className="mx-4 mb-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-lg ${
                      myEntry.position === 1 ? 'bg-yellow-500 text-black' :
                      myEntry.position === 2 ? 'bg-gray-400 text-black' :
                      myEntry.position === 3 ? 'bg-amber-700 text-white' :
                      'bg-gray-700 text-white'
                    }`}>
                      {myEntry.position}º
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">Você está em {myEntry.position}º lugar</p>
                      <p className="text-yellow-400 text-xs font-heading font-bold">{myEntry.participant.points} pontos</p>
                    </div>
                    {myEntry.position > 1 && (() => {
                      const above = compRanking[myEntry.position - 2];
                      const diff = above.participant.points - myEntry.participant.points;
                      return <p className="text-[10px] text-gray-400">-{diff} pts do {myEntry.position - 1}º</p>;
                    })()}
                  </div>
                );
              })()}

              {/* Mini ranking top 5 */}
              <div className="px-4 pb-3 space-y-1">
                {compRanking.slice(0, 5).map((entry, idx) => (
                  <div key={entry.participant.id} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${
                    entry.participant.sellerId === sellerId ? 'bg-yellow-500/10 border border-yellow-500/20' : ''
                  }`}>
                    <span className={`w-5 text-center text-xs font-bold ${
                      idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-gray-600'
                    }`}>{entry.position}</span>
                    {entry.seller?.photoUrl ? (
                      <img src={entry.seller.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[9px] font-bold text-white">
                        {entry.seller?.name?.charAt(0)}
                      </div>
                    )}
                    <span className={`text-xs flex-1 truncate ${entry.participant.sellerId === sellerId ? 'text-white font-bold' : 'text-gray-300'}`}>
                      {entry.participant.sellerId === sellerId ? 'Você' : (entry.seller?.nickname || entry.seller?.name)}
                    </span>
                    <span className="text-xs font-bold text-orange-400 tabular-nums">{entry.participant.points}</span>
                  </div>
                ))}
                {compRanking.length > 5 && (
                  <p className="text-center text-[10px] text-gray-500 pt-1">+{compRanking.length - 5} participantes</p>
                )}
              </div>

              {/* Botão ver corrida completa */}
              <button
                onClick={() => navigate(buildTenantPath(tenantSlug, `/corrida/${activeComp.id}`))}
                className="w-full border-t border-yellow-500/20 py-3 text-center text-sm font-bold text-yellow-400 hover:bg-yellow-500/10 transition-colors"
              >
                Ver Corrida Completa →
              </button>
            </div>
          )}

          {/* Fallback se não tem competição ativa */}
          {dept !== 'financeiro' && (!activeComp || !compRanking || compRanking.length === 0) && (
          <button
            onClick={() => navigate(buildTenantPath(tenantSlug, "/"))}
            className="w-full bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-yellow-500/60 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-left flex-1">
              <p className="text-white font-bold">Ver Ranking</p>
              <p className="text-gray-400 text-sm">Nenhuma competição ativa no momento</p>
            </div>
          </button>
          )}
          </div>
        </div>

        {/* Histórico de registros aprovados (para setores que NÃO são F&I, pois F&I já tem painel completo acima) */}
        {dept !== "fei" && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              {dept === 'consignacao' ? 'Meus Veículos Consignados' : 'Meu Histórico'}
            </h2>

            {dept === "vendas" && approvedSales.length > 0 && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800">
                {approvedSales.slice(0, 10).map((s: any) => (
                  <div key={s.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">{s.vehicleModel}</p>
                      <p className="text-xs text-gray-500">{formatDate(s.createdAt)} {s.leadSource ? `• ${s.leadSource === 'lead_loja' ? 'Lead Loja' : 'Lead Vendedor'}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm text-emerald-400 font-bold">{formatCurrency(s.value)}</p>
                        <p className="text-xs text-yellow-500">+{s.points} pts</p>
                      </div>
                      <button
                        onClick={() => {
                          const novoModelo = prompt(`Corrigir modelo:\n\nAtual: ${s.vehicleModel}\n\nDigite o novo modelo (ou deixe vazio para manter):`);
                          const novoValor = prompt(`Corrigir valor:\n\nValor atual: R$ ${s.value?.toLocaleString('pt-BR')}\n\nDigite o novo valor (ex: 70000, ou deixe vazio para manter):`);
                          const updateData: any = { saleId: s.id, value: s.value };
                          if (novoValor && novoValor.trim()) {
                            const parsed = parseFloat(novoValor.replace(/\\./g, '').replace(',', '.'));
                            if (!isNaN(parsed) && parsed > 0) {
                              updateData.value = Math.round(parsed);
                            } else {
                              toast.error('Valor inválido!'); return;
                            }
                          }
                          if (novoModelo && novoModelo.trim()) {
                            updateData.vehicleModel = novoModelo.trim();
                          }
                          editSaleValue.mutate(updateData);
                        }}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir venda "${s.vehicleModel}"?`)) {
                            deleteSaleMut.mutate({ id: s.id });
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dept === "consignacao" && approvedConsignment.length > 0 && (() => {
              const filteredList = consignFilter === 'todos' ? approvedConsignment : consignFilter === 'patio' ? approvedConsignment.filter((r: any) => !r.exitDate) : approvedConsignment.filter((r: any) => !!r.exitDate);
              const totalPages = Math.ceil(filteredList.length / CONSIGN_PAGE_SIZE);
              const paginatedList = filteredList.slice((consignPage - 1) * CONSIGN_PAGE_SIZE, consignPage * CONSIGN_PAGE_SIZE);
              return (
              <div className="space-y-3">
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => { setConsignFilter('todos'); setConsignPage(1); }} className={`text-xs px-2.5 py-1 rounded-full border ${consignFilter === 'todos' ? 'bg-cyan-600 border-cyan-500 text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`}>Todos ({approvedConsignment.length})</button>
                  <button onClick={() => { setConsignFilter('patio'); setConsignPage(1); }} className={`text-xs px-2.5 py-1 rounded-full border ${consignFilter === 'patio' ? 'bg-cyan-600 border-cyan-500 text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`}>No Pátio ({approvedConsignment.filter((r: any) => !r.exitDate).length})</button>
                  <button onClick={() => { setConsignFilter('saida'); setConsignPage(1); }} className={`text-xs px-2.5 py-1 rounded-full border ${consignFilter === 'saida' ? 'bg-cyan-600 border-cyan-500 text-white' : 'border-gray-700 text-gray-400 hover:text-white'}`}>Com Saída ({approvedConsignment.filter((r: any) => !!r.exitDate).length})</button>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800">
                {paginatedList.map((r: any) => {
                  const entryDate = new Date(r.entryDate);
                  const daysSince = Math.floor((Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = !r.exitDate && daysSince > 7;
                  return (
                  <div key={r.id} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">{r.vehicleModel}</p>
                        <p className="text-xs text-gray-500">Placa: {r.vehiclePlate || 'N/I'} • {formatDate(r.entryDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-yellow-500">+{r.points} pts</p>
                        {r.exitDate ? (
                          <p className="text-xs text-emerald-400">Saiu: {formatDate(r.exitDate)}{r.exitReason ? ` (${r.exitReason})` : ''}</p>
                        ) : (
                          <p className="text-xs text-cyan-400 font-bold">{daysSince} dias no pátio</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {r.hasAuction && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Leilão</span>}
                      {!r.hasAuction && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Sem Leilão</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.vehicleStatus === 'financiado' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {r.vehicleStatus === 'financiado' ? 'Financiado' : 'Quitado'}
                      </span>
                      {r.vehicleStatus === 'financiado' && r.payoffValue && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">Quit: R$ {r.payoffValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                      )}
                      {r.costValue && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Custo: R$ {r.costValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                      )}
                      {isOverdue && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> +7 dias!</span>}
                    </div>
                    {r.notes && <p className="text-[10px] text-gray-500 italic mt-0.5">{r.notes}</p>}
                    <div className="flex items-center gap-3 mt-2 pt-1 border-t border-gray-800/50">
                      <button
                        onClick={() => {
                          setEditConsignRecord({
                            ...r,
                            costValueDisplay: r.costValue ? r.costValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
                            payoffValueDisplay: r.payoffValue ? r.payoffValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
                          });
                          setEditConsignOpen(true);
                        }}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                      {!r.exitDate && (
                        <button
                          onClick={() => {
                            setExitRecordId(r.id);
                            setExitDate(new Date().toISOString().split('T')[0]);
                            setExitDialogOpen(true);
                          }}
                          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-xs"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Dar Saída
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir consignação "${r.vehicleModel} - ${r.vehiclePlate}"?`)) {
                            deleteConsignmentMut.mutate({ id: r.id });
                          }
                        }}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                  );
                })}
                </div>
                {totalPages > 1 && (
                  <PaginationControls
                    page={consignPage}
                    totalPages={totalPages}
                    total={filteredList.length}
                    pageSize={CONSIGN_PAGE_SIZE}
                    onPageChange={setConsignPage}
                    showPageSize={false}
                  />
                )}
              </div>
              );
            })()}
            {dept === "despachante" && approvedDispatch.length > 0 && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800">
                {approvedDispatch.map((r: any) => (
                  <div key={r.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">{r.documentType}</p>
                        <p className="text-xs text-gray-500">Placa: {r.vehiclePlate || 'N/I'} • {formatDate(r.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-yellow-500">+{r.points + (r.bonusPoints || 0)} pts</p>
                        {r.customerPaid && <p className="text-xs text-emerald-400">Bônus!</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 pt-1 border-t border-gray-800/50">
                      <button
                        onClick={() => {
                          const novaPlaca = prompt(`Editar placa:\n\nAtual: ${r.vehiclePlate || 'N/I'}\n\nDigite a nova placa (ou vazio para manter):`);
                          const novoDoc = prompt(`Editar tipo documento:\n\nAtual: ${r.documentType}\n\nDigite o novo tipo (ou vazio para manter):`);
                          const data: any = { id: r.id };
                          if (novaPlaca && novaPlaca.trim()) data.vehiclePlate = novaPlaca.trim().toUpperCase();
                          if (novoDoc && novoDoc.trim()) data.documentType = novoDoc.trim();
                          if (data.vehiclePlate || data.documentType) updateDispatchMut.mutate(data);
                        }}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir registro "${r.documentType} - ${r.vehiclePlate}"?`)) {
                            deleteDispatchMut.mutate({ id: r.id });
                          }
                        }}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dept === "pre_vendas" && (appointments || []).length > 0 && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl divide-y divide-gray-800">
                {(appointments || []).slice(0, 10).map((a: any) => (
                  <div key={a.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">{a.customerName}</p>
                      <p className="text-xs text-gray-500">{a.ticketNumber} • {formatDate(a.scheduledDate)}</p>
                    </div>
                    <div className="text-right">
                      {a.attendanceStatus === 'approved' ? (
                        <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Compareceu</span>
                      ) : a.attendanceStatus === 'no_show' ? (
                        <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Não veio</span>
                      ) : a.attendanceStatus === 'attended' ? (
                        <span className="text-xs text-orange-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Aguardando</span>
                      ) : (
                        <span className="text-xs text-gray-500">Agendado</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mensagem quando não tem histórico */}
            {((dept === "vendas" && approvedSales.length === 0) ||
              (dept === "consignacao" && approvedConsignment.length === 0) ||
              (dept === "despachante" && approvedDispatch.length === 0) ||
              (dept === "pre_vendas" && (appointments || []).length === 0)) && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 text-center">
                <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Nenhum registro ainda. Comece registrando!</p>
              </div>
            )}
          </div>
        )}

        {/* ===== MEUS CHAMADOS PÓS-VENDA ===== */}
        {allPv.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Meus Chamados Pós-Venda
            </h2>

            {/* Filtros */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { key: 'todos', label: 'Todos', count: allPv.length, color: 'bg-gray-600' },
                { key: 'aberto', label: 'Abertos', count: pvAbertos.length, color: 'bg-blue-600' },
                { key: 'agendado', label: 'Agendados', count: pvAgendados.length, color: 'bg-yellow-600' },
                { key: 'em_servico', label: 'Em Serviço', count: pvEmServico.length, color: 'bg-orange-600' },
                { key: 'finalizado', label: 'Finalizados', count: pvFinalizados.length, color: 'bg-emerald-600' },
                { key: 'entregue', label: 'Entregues', count: pvEntregues.length, color: 'bg-gray-500' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setPvFilter(tab.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    pvFilter === tab.key
                      ? `${tab.color} text-white shadow-lg`
                      : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    pvFilter === tab.key ? 'bg-white/20' : 'bg-gray-700'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Lista de chamados */}
            {filteredPv.length > 0 ? (
              <div className="space-y-2">
                {filteredPv.map((c: any) => {
                  const sc = pvStatusConfig[c.status] || pvStatusConfig.aberto;
                  const prazo = c.prazoEntrega ? new Date(c.prazoEntrega) : null;
                  const isOverdue = prazo && prazo.getTime() < Date.now() && c.status !== 'entregue' && c.status !== 'finalizado';
                  return (
                    <div key={c.id} className={`rounded-xl p-4 border transition-all ${sc.bg} ${sc.border}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-bold text-sm">{c.clienteNome}</p>
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} font-semibold border ${sc.border}`}>
                              {sc.label}
                            </span>
                            {isOverdue && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/30 text-red-400 font-bold animate-pulse">
                                ATRASADO
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            #{c.ticketNumber} • {c.carroModelo} {c.carroPlaca ? `• ${c.carroPlaca}` : ''}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        <span className="text-gray-600">Problema:</span> {c.problemaRelatado}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] text-gray-500">
                        <span>Aberto: {formatDate(c.createdAt)}</span>
                        {prazo && <span>Prazo: {formatDate(c.prazoEntrega)}</span>}
                        {c.oficinaNome && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.oficinaNome}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-8 text-center">
                <Wrench className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Nenhum chamado {pvFilter !== 'todos' ? 'neste status' : 'registrado'}.</p>
              </div>
            )}
          </div>
        )}

        {/* Back */}
        <button
          onClick={() => navigate(buildTenantPath(tenantSlug, "/"))}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm mx-auto"
        >
          <ArrowLeft className="w-3 h-3" /> Voltar ao ranking
        </button>
      </div>

      {/* ===== MODAL ABRIR CHAMADO PÓS-VENDA ===== */}
      {showPvModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowPvModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-400" /> Abrir Chamado Pós-Venda
              </h2>
              <p className="text-xs text-gray-500 mt-1">Informe o problema do cliente. O setor de pós-venda será notificado.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1 block">Nome do Cliente *</label>
                <input
                  type="text"
                  value={pvForm.clienteNome}
                  onChange={e => setPvForm(f => ({ ...f, clienteNome: e.target.value }))}
                  placeholder="Ex: João Silva"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1 block">Telefone</label>
                <input
                  type="tel"
                  value={pvForm.clienteTelefone}
                  onChange={e => setPvForm(f => ({ ...f, clienteTelefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1 block">Carro *</label>
                  <input
                    type="text"
                    value={pvForm.carroModelo}
                    onChange={e => setPvForm(f => ({ ...f, carroModelo: e.target.value }))}
                    placeholder="Onix 2022"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1 block">Placa</label>
                  <input
                    type="text"
                    value={pvForm.carroPlaca}
                    onChange={e => setPvForm(f => ({ ...f, carroPlaca: e.target.value.toUpperCase() }))}
                    placeholder="ABC1D23"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1 block">Problema Relatado *</label>
                <textarea
                  value={pvForm.problemaRelatado}
                  onChange={e => setPvForm(f => ({ ...f, problemaRelatado: e.target.value }))}
                  placeholder="Descreva o problema que o cliente relatou..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1 block">Observações</label>
                <input
                  type="text"
                  value={pvForm.observacoes}
                  onChange={e => setPvForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Algo a mais que queira informar..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setShowPvModal(false)}
                className="flex-1 py-2.5 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium hover:bg-gray-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!pvForm.clienteNome.trim() || !pvForm.carroModelo.trim() || !pvForm.problemaRelatado.trim()) {
                    toast.error('Preencha nome do cliente, carro e problema!');
                    return;
                  }
                  createPvMutation.mutate({
                    clienteNome: pvForm.clienteNome.trim(),
                    clienteTelefone: pvForm.clienteTelefone.trim() || undefined,
                    carroModelo: pvForm.carroModelo.trim(),
                    carroPlaca: pvForm.carroPlaca.trim() || undefined,
                    problemaRelatado: pvForm.problemaRelatado.trim(),
                    observacoes: pvForm.observacoes.trim() || undefined,
                    vendedorId: sellerId,
                  });
                }}
                disabled={createPvMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-all disabled:opacity-50"
              >
                {createPvMutation.isPending ? 'Enviando...' : 'Abrir Chamado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL DETALHES CHAMADO (PÓS-VENDA) ===== */}
      {pvSelectedChamado && dept === 'pos_venda' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center" onClick={() => setPvSelectedChamado(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-white font-bold text-lg">#{pvSelectedChamado.ticketNumber}</h3>
                <p className="text-gray-400 text-xs">{pvSelectedChamado.clienteNome}</p>
              </div>
              <button onClick={() => setPvSelectedChamado(null)} className="text-gray-500 hover:text-white p-2">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Info do veículo */}
              <div className="bg-gray-800/50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Veículo</span>
                  <span className="text-white font-medium">{pvSelectedChamado.carroModelo}</span>
                </div>
                {pvSelectedChamado.carroPlaca && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Placa</span>
                    <span className="text-white font-mono font-medium">{pvSelectedChamado.carroPlaca}</span>
                  </div>
                )}
                {pvSelectedChamado.clienteTelefone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Telefone</span>
                    <span className="text-blue-400 font-medium">{pvSelectedChamado.clienteTelefone}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Vendedor</span>
                  <span className="text-white font-medium">
                    {(() => {
                      const v = (allSellers || []).find((s: any) => s.id === pvSelectedChamado.vendedorId);
                      return v ? (v.nickname || v.name) : `ID ${pvSelectedChamado.vendedorId}`;
                    })()}
                  </span>
                </div>
                {/* Responsável Pós-Venda */}
                {pvSelectedChamado.responsavelPvId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Responsável PV</span>
                    <span className="text-orange-400 font-medium">
                      {(() => {
                        const r = (allSellers || []).find((s: any) => s.id === pvSelectedChamado.responsavelPvId);
                        return r ? (r.nickname || r.name) : `ID ${pvSelectedChamado.responsavelPvId}`;
                      })()}
                    </span>
                  </div>
                )}
                {pvSelectedChamado.oficinaNome && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Oficina</span>
                    <span className="text-white font-medium">{pvSelectedChamado.oficinaNome}</span>
                  </div>
                )}
                {pvSelectedChamado.prazoEntrega && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Prazo</span>
                    <span className={`font-medium ${new Date(pvSelectedChamado.prazoEntrega).getTime() < Date.now() ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatDate(pvSelectedChamado.prazoEntrega)}
                    </span>
                  </div>
                )}
              </div>

              {/* Botões WhatsApp e Ligação */}
              {pvSelectedChamado.clienteTelefone && (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/55${pvSelectedChamado.clienteTelefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </a>
                  <a
                    href={`tel:${pvSelectedChamado.clienteTelefone}`}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all"
                  >
                    <PhoneCall className="w-5 h-5" />
                    Ligar
                  </a>
                </div>
              )}

              {/* Problema */}
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Problema Relatado</p>
                <p className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3">{pvSelectedChamado.problemaRelatado}</p>
              </div>

              {pvSelectedChamado.observacoes && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Observações</p>
                  <p className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-3">{pvSelectedChamado.observacoes}</p>
                </div>
              )}

              {/* Serviço Realizado / O que está sendo feito */}
              <div>
                <p className="text-xs text-orange-400 uppercase font-bold mb-1 flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> O que está sendo feito
                </p>
                {pvSelectedChamado.servicoRealizado ? (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <p className="text-sm text-gray-200">{pvSelectedChamado.servicoRealizado}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">Nenhuma anotação ainda.</p>
                )}
                <div className="mt-2">
                  <textarea
                    value={pvServicoEdit}
                    onChange={e => setPvServicoEdit(e.target.value)}
                    placeholder="Descreva o que está sendo feito no veículo..."
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
                  />
                  <button
                    onClick={() => {
                      if (!pvServicoEdit.trim()) { toast.error('Digite a observação do serviço'); return; }
                      updatePvMutation.mutate({
                        id: pvSelectedChamado.id,
                        sellerId: sellerId,
                        servicoRealizado: pvServicoEdit.trim(),
                      });
                      setPvServicoEdit('');
                    }}
                    disabled={updatePvMutation.isPending || !pvServicoEdit.trim()}
                    className="mt-1.5 w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {updatePvMutation.isPending ? 'Salvando...' : 'Salvar Observação do Serviço'}
                  </button>
                </div>
              </div>

              {/* ORÇAMENTOS / PEÇAS / SERVIÇOS */}
              <PvOrcamentosSection chamadoId={pvSelectedChamado.id} sellerId={sellerId} sellerName={seller?.nickname || seller?.name || 'PV'} />

              {/* Atualizar Status */}
              {pvSelectedChamado.status !== 'entregue' && pvSelectedChamado.status !== 'cancelado' && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-2">Atualizar Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'aberto', label: 'Aberto', color: 'bg-blue-600 hover:bg-blue-500' },
                      { value: 'agendado', label: 'Agendado', color: 'bg-yellow-600 hover:bg-yellow-500' },
                      { value: 'em_servico', label: 'Em Serviço', color: 'bg-orange-600 hover:bg-orange-500' },
                      { value: 'finalizado', label: 'Finalizado', color: 'bg-emerald-600 hover:bg-emerald-500' },
                      { value: 'entregue', label: 'Entregue', color: 'bg-gray-600 hover:bg-gray-500' },
                      { value: 'cancelado', label: 'Cancelar', color: 'bg-red-600 hover:bg-red-500' },
                    ].filter(s => s.value !== pvSelectedChamado.status).map(s => (
                      <button
                        key={s.value}
                        onClick={() => {
                          updatePvMutation.mutate({
                            id: pvSelectedChamado.id,
                            sellerId: sellerId,
                            status: s.value,
                          });
                        }}
                        disabled={updatePvMutation.isPending}
                        className={`${s.color} text-white text-xs font-bold py-2.5 rounded-lg transition-all disabled:opacity-50`}
                      >
                        {updatePvMutation.isPending ? '...' : s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Datas */}
              <div className="text-[10px] text-gray-600 flex gap-3 flex-wrap">
                <span>Criado: {formatDate(pvSelectedChamado.createdAt)}</span>
                <span>Atualizado: {formatDate(pvSelectedChamado.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* IAM - Super Agente IA */}
      {seller && <IAMFloatingButton sellerId={sellerId} />}
      {seller && <IAMGreeting sellerName={seller.nickname || seller.name} sellerId={sellerId} />}

      {/* Dialog Editar Consignação */}
      <Dialog open={editConsignOpen} onOpenChange={setEditConsignOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Consignação</DialogTitle>
            <DialogDescription className="text-gray-400">Altere os dados da consignação (exceto data de entrada).</DialogDescription>
          </DialogHeader>
          {editConsignRecord && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Placa</Label>
                  <Input value={editConsignRecord.vehiclePlate || ''} onChange={e => setEditConsignRecord({...editConsignRecord, vehiclePlate: e.target.value.toUpperCase()})} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Modelo</Label>
                  <Input value={editConsignRecord.vehicleModel || ''} onChange={e => setEditConsignRecord({...editConsignRecord, vehicleModel: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Data de Entrada</Label>
                  <Input type="date" value={editConsignRecord.entryDate ? new Date(editConsignRecord.entryDate).toISOString().split('T')[0] : ''} disabled className="bg-gray-800 border-gray-700 text-white opacity-60 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Leilão?</Label>
                  <select value={editConsignRecord.hasAuction ? 'sim' : 'nao'} onChange={e => setEditConsignRecord({...editConsignRecord, hasAuction: e.target.value === 'sim'})} className="w-full h-9 rounded-md border border-gray-700 bg-gray-800 text-white text-sm px-3">
                    <option value="nao">Sem Leilão</option>
                    <option value="sim">Com Leilão</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Status</Label>
                  <select value={editConsignRecord.vehicleStatus || 'quitado'} onChange={e => setEditConsignRecord({...editConsignRecord, vehicleStatus: e.target.value})} className="w-full h-9 rounded-md border border-gray-700 bg-gray-800 text-white text-sm px-3">
                    <option value="quitado">Quitado</option>
                    <option value="financiado">Financiado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Valor Custo (R$)</Label>
                  <MoneyInput
                    value={editConsignRecord.costValueDisplay || ''}
                    onChange={v => {
                      const raw = v.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
                      const num = parseFloat(raw) || 0;
                      setEditConsignRecord({...editConsignRecord, costValue: Math.round(num), costValueDisplay: v});
                    }}
                    placeholder="50.000,00"
                  />
                </div>
              </div>
              {editConsignRecord.vehicleStatus === 'financiado' && (
                <div className="space-y-1">
                  <Label className="text-gray-300 text-xs">Valor Quitação (R$)</Label>
                  <MoneyInput
                    value={editConsignRecord.payoffValueDisplay || ''}
                    onChange={v => {
                      const raw = v.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
                      const num = parseFloat(raw) || 0;
                      setEditConsignRecord({...editConsignRecord, payoffValue: Math.round(num), payoffValueDisplay: v});
                    }}
                    placeholder="25.000,00"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-gray-300 text-xs">Observações</Label>
                <Textarea value={editConsignRecord.notes || ''} onChange={e => setEditConsignRecord({...editConsignRecord, notes: e.target.value})} className="bg-gray-800 border-gray-700 text-white min-h-[60px]" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditConsignOpen(false)} className="border-gray-700 text-gray-300">Cancelar</Button>
            <Button
              onClick={() => {
                if (!editConsignRecord) return;
                const data: any = { id: editConsignRecord.id };
                if (editConsignRecord.vehiclePlate) data.vehiclePlate = editConsignRecord.vehiclePlate;
                if (editConsignRecord.vehicleModel) data.vehicleModel = editConsignRecord.vehicleModel;
                data.hasAuction = editConsignRecord.hasAuction;
                data.vehicleStatus = editConsignRecord.vehicleStatus;
                data.costValue = editConsignRecord.costValue || undefined;
                data.payoffValue = editConsignRecord.payoffValue || undefined;
                data.notes = editConsignRecord.notes || undefined;
                updateConsignmentMut.mutate(data);
              }}
              disabled={updateConsignmentMut.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {updateConsignmentMut.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Dar Saída */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar Saída do Pátio</DialogTitle>
            <DialogDescription className="text-gray-400">O veículo será marcado como retirado. O registro permanece no histórico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-gray-300">Motivo da saída *</Label>
              <select
                value={exitReason}
                onChange={e => setExitReason(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
              >
                <option value="">Selecione o motivo...</option>
                <option value="vendido">Vendido</option>
                <option value="devolvido">Devolvido ao proprietário</option>
                <option value="transferido">Transferido</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Data de saída</Label>
              <Input
                type="date"
                value={exitDate}
                onChange={e => setExitDate(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setExitDialogOpen(false); setExitReason(""); }} className="border-gray-700 text-gray-300">Cancelar</Button>
            <Button
              onClick={() => {
                if (!exitRecordId || !exitDate || !exitReason) return;
                setConfirmExitOpen(true);
              }}
              disabled={!exitDate || !exitReason || updateExitMut.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {updateExitMut.isPending ? "Registrando..." : "Confirmar Saída"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Confirmação Final - Saída */}
      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída do veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação registrará a saída definitiva do veículo do pátio. Motivo: <strong>{exitReason === "vendido" ? "Vendido" : exitReason === "devolvido" ? "Devolvido ao proprietário" : exitReason === "transferido" ? "Transferido" : "Outro"}</strong>. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!exitRecordId || !exitDate || !exitReason) return;
                updateExitMut.mutate({ id: exitRecordId, exitDate: new Date(exitDate).getTime(), exitReason });
                setConfirmExitOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, confirmar saída
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


// ===== COMPONENTE: Orçamentos / Peças / Serviços dentro do chamado =====
function PvOrcamentosSection({ chamadoId, sellerId, sellerName }: { chamadoId: number; sellerId: number; sellerName: string }) {
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [itens, setItens] = useState<{ tipo: 'peca' | 'servico' | 'outro'; descricao: string; quantidade: number; valorUnitario: string }[]>([]);
  const [novoItemTipo, setNovoItemTipo] = useState<'peca' | 'servico' | 'outro'>('peca');
  const [novoItemDesc, setNovoItemDesc] = useState('');
  const [novoItemQtd, setNovoItemQtd] = useState(1);
  const [novoItemValor, setNovoItemValor] = useState('');
  const [expandedOrc, setExpandedOrc] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orcamentosQuery = trpc.pvOrcamentos.list.useQuery({ chamadoId });
  const orcamentos = orcamentosQuery.data || [];

  const uploadMutation = trpc.pvOrcamentos.uploadFoto.useMutation();
  const createMutation = trpc.pvOrcamentos.create.useMutation({
    onSuccess: () => {
      toast.success('Orçamento lançado!');
      orcamentosQuery.refetch();
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });
  const addItemMutation = trpc.pvOrcamentos.addItem.useMutation({
    onSuccess: () => { orcamentosQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setShowForm(false);
    setTitulo('');
    setDescricao('');
    setFotoFile(null);
    setFotoPreview(null);
    setItens([]);
    setNovoItemDesc('');
    setNovoItemQtd(1);
    setNovoItemValor('');
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function addItem() {
    if (!novoItemDesc.trim() || !novoItemValor.trim()) {
      toast.error('Preencha descrição e valor do item');
      return;
    }
    setItens(prev => [...prev, {
      tipo: novoItemTipo,
      descricao: novoItemDesc.trim(),
      quantidade: novoItemQtd,
      valorUnitario: novoItemValor.replace(',', '.'),
    }]);
    setNovoItemDesc('');
    setNovoItemQtd(1);
    setNovoItemValor('');
  }

  function removeItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx));
  }

  const totalItens = itens.reduce((sum, item) => sum + (item.quantidade * parseFloat(item.valorUnitario || '0')), 0);

  async function handleSubmit() {
    if (!titulo.trim()) { toast.error('Digite o título do orçamento'); return; }

    let fotoUrl: string | undefined;
    let fotoKey: string | undefined;

    // Upload foto se houver
    if (fotoFile) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(fotoFile);
      });
      try {
        const result = await uploadMutation.mutateAsync({
          fileName: fotoFile.name,
          fileBase64: base64,
          contentType: fotoFile.type,
        });
        fotoUrl = result.url;
        fotoKey = result.key;
      } catch {
        toast.error('Erro ao enviar foto');
        return;
      }
    }

    // Criar orçamento
    const orcResult = await createMutation.mutateAsync({
      chamadoId,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      fotoUrl,
      fotoKey,
      valorTotal: String(totalItens.toFixed(2)),
      criadoPor: sellerName,
      criadoPorId: sellerId,
    });

    // Adicionar itens
    for (const item of itens) {
      const vt = (item.quantidade * parseFloat(item.valorUnitario || '0')).toFixed(2);
      await addItemMutation.mutateAsync({
        orcamentoId: orcResult.id,
        tipo: item.tipo,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: vt,
      });
    }
  }

  const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    pendente: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pendente' },
    aprovado: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Aprovado' },
    reprovado: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Reprovado' },
    pago: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Pago' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-purple-400 uppercase font-bold flex items-center gap-1">
          <Receipt className="w-3 h-3" /> Orçamentos / Peças
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"
        >
          <Plus className="w-3 h-3" /> Lançar
        </button>
      </div>

      {/* Lista de orçamentos existentes */}
      {orcamentos.length > 0 && (
        <div className="space-y-2 mb-3">
          {orcamentos.map((orc: any) => {
            const st = STATUS_COLORS[orc.statusAprovacao] || STATUS_COLORS.pendente;
            const isExpanded = expandedOrc === orc.id;
            return (
              <div key={orc.id} className="bg-gray-800/60 border border-gray-700/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedOrc(isExpanded ? null : orc.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{orc.titulo}</p>
                    <p className="text-xs text-gray-400">
                      {Number(orc.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      {' · '}{new Date(orc.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                </button>
                {isExpanded && (
                  <OrcamentoDetail orcamentoId={orc.id} orc={orc} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {orcamentos.length === 0 && !showForm && (
        <p className="text-xs text-gray-600 italic mb-3">Nenhum orçamento lançado ainda.</p>
      )}

      {/* Formulário para lançar orçamento */}
      {showForm && (
        <div className="bg-gray-800/80 border border-purple-500/30 rounded-xl p-4 space-y-3 mb-3">
          <p className="text-sm text-purple-400 font-bold">Novo Orçamento</p>

          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Título (ex: Orçamento Oficina X - Ar condicionado)"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
          />

          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Descrição / observações (opcional)"
            rows={2}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none resize-none"
          />

          {/* Upload foto/scanner */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Foto / Scanner do Orçamento</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleFotoChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded-lg transition-all"
              >
                <Camera className="w-4 h-4" />
                {fotoFile ? 'Trocar Foto' : 'Tirar Foto / Escanear'}
              </button>
              {fotoFile && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {fotoFile.name}
                </span>
              )}
            </div>
            {fotoPreview && (
              <img src={fotoPreview} alt="Preview" className="mt-2 rounded-lg max-h-40 object-contain border border-gray-700" />
            )}
          </div>

          {/* Itens (peças e serviços) */}
          <div>
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" /> Itens (Peças e Serviços)
            </p>

            {/* Lista de itens adicionados */}
            {itens.length > 0 && (
              <div className="space-y-1 mb-2">
                {itens.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-900/50 rounded-lg px-2 py-1.5 text-xs">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.tipo === 'peca' ? 'bg-blue-500/20 text-blue-400' :
                      item.tipo === 'servico' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {item.tipo === 'peca' ? 'PEÇA' : item.tipo === 'servico' ? 'SERVIÇO' : 'OUTRO'}
                    </span>
                    <span className="text-white flex-1 truncate">{item.descricao}</span>
                    <span className="text-gray-400">{item.quantidade}x</span>
                    <span className="text-green-400 font-mono">
                      R$ {(item.quantidade * parseFloat(item.valorUnitario || '0')).toFixed(2)}
                    </span>
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="text-right text-xs font-bold text-green-400 pr-2">
                  Total: R$ {totalItens.toFixed(2)}
                </div>
              </div>
            )}

            {/* Adicionar novo item */}
            <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-2 space-y-2">
              <div className="flex gap-2">
                <select
                  value={novoItemTipo}
                  onChange={e => setNovoItemTipo(e.target.value as any)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="peca">Peça</option>
                  <option value="servico">Serviço</option>
                  <option value="outro">Outro</option>
                </select>
                <input
                  value={novoItemDesc}
                  onChange={e => setNovoItemDesc(e.target.value)}
                  placeholder="Descrição do item"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-500">Qtd:</span>
                  <input
                    type="number"
                    min={1}
                    value={novoItemQtd}
                    onChange={e => setNovoItemQtd(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white text-center focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-[10px] text-gray-500">R$:</span>
                  <input
                    value={novoItemValor}
                    onChange={e => setNovoItemValor(e.target.value)}
                    placeholder="0,00"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  onClick={addItem}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded font-bold transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || uploadMutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Receipt className="w-4 h-4" />
              {createMutation.isPending || uploadMutation.isPending ? 'Enviando...' : 'Lançar Orçamento'}
            </button>
            <button
              onClick={resetForm}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2.5 rounded-lg transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== COMPONENTE: Detalhe de um orçamento expandido =====
function OrcamentoDetail({ orcamentoId, orc }: { orcamentoId: number; orc: any }) {
  const itensQuery = trpc.pvOrcamentos.itens.useQuery({ orcamentoId });
  const itens = itensQuery.data || [];

  return (
    <div className="px-3 pb-3 border-t border-gray-700/50 space-y-2">
      {orc.descricao && (
        <p className="text-xs text-gray-400 mt-2">{orc.descricao}</p>
      )}

      {/* Foto do orçamento */}
      {orc.fotoUrl && (
        <a href={orc.fotoUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img src={orc.fotoUrl} alt="Orçamento" className="rounded-lg max-h-48 object-contain border border-gray-700 hover:border-purple-500 transition-all" />
          <p className="text-[10px] text-purple-400 mt-1">Clique para ampliar</p>
        </a>
      )}

      {/* Itens */}
      {itens.length > 0 && (
        <div className="space-y-1 mt-2">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Itens</p>
          {itens.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 text-xs bg-gray-900/30 rounded px-2 py-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                item.tipo === 'peca' ? 'bg-blue-500/20 text-blue-400' :
                item.tipo === 'servico' ? 'bg-orange-500/20 text-orange-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {item.tipo === 'peca' ? 'PEÇA' : item.tipo === 'servico' ? 'SERVIÇO' : 'OUTRO'}
              </span>
              <span className="text-white flex-1 truncate">{item.descricao}</span>
              <span className="text-gray-400">{item.quantidade}x</span>
              <span className="text-green-400 font-mono">
                R$ {Number(item.valorTotal || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Info de aprovação */}
      {orc.statusAprovacao === 'aprovado' && orc.aprovadoPor && (
        <p className="text-[10px] text-green-400">Aprovado por {orc.aprovadoPor} em {orc.aprovadoEm ? new Date(orc.aprovadoEm).toLocaleDateString('pt-BR') : '—'}</p>
      )}
      {orc.statusAprovacao === 'reprovado' && (
        <div>
          <p className="text-[10px] text-red-400">Reprovado por {orc.aprovadoPor || '—'}</p>
          {orc.motivoReprovacao && <p className="text-[10px] text-red-300 italic">{orc.motivoReprovacao}</p>}
        </div>
      )}

      <p className="text-[10px] text-gray-600">Lançado por {orc.criadoPor} em {new Date(orc.createdAt).toLocaleDateString('pt-BR')}</p>
    </div>
  );
}


// Componente de Conversões SDR - mostra agendamentos que viraram venda
function SdrConversionsCard({ sellerId }: { sellerId: number }) {
  const { data: conversions, isLoading } = trpc.sdr.myConversions.useQuery({ sellerId });
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return null;
  if (!conversions || conversions.length === 0) {
    return (
      <div className="bg-gradient-to-r from-emerald-600/10 to-green-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Handshake className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="text-left flex-1">
          <p className="text-white font-bold">Minhas Conversões</p>
          <p className="text-gray-400 text-sm">Nenhum agendamento convertido em venda ainda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gradient-to-r from-emerald-600/20 to-green-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/60 transition-all"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Handshake className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="text-left flex-1">
          <p className="text-white font-bold">Minhas Conversões</p>
          <p className="text-gray-400 text-sm">{conversions.length} agendamento(s) convertido(s) em venda</p>
        </div>
        <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          {conversions.length}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 pl-2">
          {conversions.map((c: any, i: number) => (
            <div key={i} className="racing-card p-3 border border-emerald-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">
                  {c.agendamento.customerName || "Cliente"}
                </span>
                {c.agendamento.ticketNumber && (
                  <span className="text-[10px] font-mono text-muted-foreground">#{c.agendamento.ticketNumber}</span>
                )}
              </div>
              {c.agendamento.customerPhone && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {c.agendamento.customerPhone}
                </p>
              )}
              {c.venda && (
                <div className="bg-emerald-500/10 rounded-lg p-2 mt-1">
                  <p className="text-[11px] text-emerald-400 font-bold">Venda fechada!</p>
                  <p className="text-[10px] text-gray-400">
                    Vendedor: {c.vendedorNome} | {c.venda.vehicleModel || "Veículo"}
                    {c.venda.value ? ` | R$ ${c.venda.value.toLocaleString("pt-BR")}` : ""}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(c.venda.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function MinhasFichasFinanciamento({ sellerId }: { sellerId: number }) {
  const { data: fichas } = trpc.fichas.list.useQuery({ sellerId }, { refetchInterval: 10000 });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showCnh, setShowCnh] = useState(false);

  if (!fichas || fichas.length === 0) return null;

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

const formatCurrencyLocal = (val: number | null | undefined) => {
    if (!val) return "\u2014";
    return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <CreditCard className="w-4 h-4" /> Minhas Fichas de Financiamento ({fichas.length})
      </h2>
      <div className="space-y-2">
        {fichas.map((f: any) => (
          <div key={f.id} className={`border rounded-xl overflow-hidden transition-all ${
            f.status === "aprovado" ? "border-green-500/30 bg-green-950/10" :
            f.status === "recusado" ? "border-red-500/30 bg-red-950/10" :
            f.status === "em_analise" ? "border-blue-500/30 bg-blue-950/10" :
            f.status === "parcial" ? "border-orange-500/30 bg-orange-950/10" :
            "border-yellow-500/30 bg-yellow-950/10"
          }`}>
            <button
              onClick={() => setExpanded(expanded === f.id ? null : f.id)}
              className="w-full p-3 text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-500">#{f.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[f.status]}`}>
                      {STATUS_LABELS[f.status]}
                    </span>
                    {f.status === "na_fila" && (
                      <span className="text-[10px] text-yellow-400 animate-pulse">Aguardando F&I...</span>
                    )}
                    {f.status === "em_analise" && (
                      <span className="text-[10px] text-blue-400 animate-pulse">Analisando...</span>
                    )}
                  </div>
                  <p className="text-white font-bold text-sm mt-1">{f.nomeCompleto}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    {f.veiculo && <span>{f.veiculo}</span>}
                    {f.placa && <span className="text-yellow-400 font-mono">{f.placa}</span>}
                  </div>
                </div>
                <div className="text-right">
                  {f.valorFinanciado && <p className="text-sm text-green-400 font-bold">{formatCurrencyLocal(f.valorFinanciado)}</p>}
                  <p className="text-[10px] text-gray-600">{new Date(f.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            </button>

            {expanded === f.id && (
              <div className="px-3 pb-3 space-y-3 border-t border-gray-800/50 pt-3">
                {/* Responsável F&I */}
                {f.feiResponsavelNome && (
                  <div className="text-xs text-gray-400">
                    F&I Responsável: <span className="text-blue-400 font-bold">{f.feiResponsavelNome}</span>
                  </div>
                )}

                {/* Observações do F&I */}
                {f.observacoesFei && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                    <p className="text-[10px] font-bold text-purple-400 mb-0.5">RETORNO DO F&I:</p>
                    <p className="text-xs text-purple-200">{f.observacoesFei}</p>
                  </div>
                )}

                {/* Bancos */}
                {f.bancos && f.bancos.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Status por Banco:</p>
                    {f.bancos.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between bg-gray-800/30 rounded-lg px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-white font-medium">{b.banco}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {b.valorParcela && (
                            <span className="text-[10px] text-green-400">
                              {formatCurrencyLocal(b.valorParcela)}
                              {b.qtdParcelas && <span className="text-gray-500"> x{b.qtdParcelas}</span>}
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            b.status === "aprovado" ? "bg-green-600 text-white" :
                            b.status === "recusado" ? "bg-red-600 text-white" :
                            b.status === "em_analise" ? "bg-blue-600 text-white" :
                            "bg-gray-700 text-gray-300"
                          }`}>
                            {b.status === "pendente" ? "Pendente" : b.status === "em_analise" ? "Analisando" : b.status === "aprovado" ? "APROVADO" : "RECUSADO"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CNH */}
                {f.cnhFotoUrl && (
                  <button onClick={() => setShowCnh(true)} className="flex items-center gap-2 text-xs text-green-400 hover:text-green-300">
                    <Image className="w-3 h-3" /> Ver CNH/RG
                  </button>
                )}

                {/* Tempo de análise */}
                {f.fimAnalise && f.inicioAnalise && (
                  <p className="text-[10px] text-gray-600 text-center">
                    Tempo de análise: {Math.round((f.fimAnalise - f.inicioAnalise) / 60000)} minutos
                  </p>
                )}
              </div>
            )}

            {/* Modal CNH */}
            {showCnh && expanded === f.id && f.cnhFotoUrl && (
              <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setShowCnh(false)}>
                <img src={f.cnhFotoUrl} alt="CNH" className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
