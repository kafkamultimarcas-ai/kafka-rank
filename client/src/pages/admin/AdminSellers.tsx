import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Camera, UserCheck, UserX, Key, Shield, ShieldCheck, Eye, Edit3, Search, MoreVertical, Users, UserCog } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useState, useRef, useMemo } from "react";
import { PaginationControls } from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { ListSkeleton } from "@/components/ListSkeleton";
import { toast } from "sonner";
import { maskPhone } from "@/lib/masks";
import { isValidBrazilianPhone, isValidEmail } from "@shared/validators";
import { getCurrentTenantSlug, buildTenantPath } from "@/lib/tenant";

const DEPARTMENTS = [
  { value: "vendas", label: "Vendas", color: "bg-blue-500/20 text-blue-400" },
  { value: "pre_vendas", label: "Pré-Vendas / SDR", color: "bg-purple-500/20 text-purple-400" },
  { value: "fei", label: "F&I", color: "bg-amber-500/20 text-amber-400" },
  { value: "consignacao", label: "Consignação", color: "bg-cyan-500/20 text-cyan-400" },
  { value: "despachante", label: "Despachante", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "pos_venda", label: "Pós-Venda", color: "bg-orange-500/20 text-orange-400" },
  { value: "financeiro", label: "Financeiro", color: "bg-green-500/20 text-green-400" },
  { value: "marketing", label: "Marketing", color: "bg-pink-500/20 text-pink-400" },
];

function getDeptInfo(dept: string | null | undefined) {
  return DEPARTMENTS.find(d => d.value === dept) || DEPARTMENTS[0];
}

export default function AdminSellers() {
  const { data: availableModules } = trpc.sellers.permissionModules.useQuery();
  const { data: managerModules } = trpc.managerPerms.modules.useQuery();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<any>(null);
  const [form, setForm] = useState({ name: "", nickname: "", phone: "", email: "", department: "vendas" });
  const [filterDept, setFilterDept] = useState<string>("todos");
  const [filterRole, setFilterRole] = useState<"todos" | "gerente" | "vendedor">("todos");
  const [filterActive, setFilterActive] = useState<"ativos" | "inativos">("ativos");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; seller: any | null }>({ open: false, seller: null });
  const [passwordForm, setPasswordForm] = useState({ email: "", password: "" });
  const [toggleConfirm, setToggleConfirm] = useState<{ open: boolean; seller: any | null }>({ open: false, seller: null });
  // Permissões de gerente
  const [permsDialog, setPermsDialog] = useState<{ open: boolean; seller: any | null }>({ open: false, seller: null });
  const [permsState, setPermsState] = useState<Record<string, { canView: boolean; canEdit: boolean }>>({});
  const [inviteLinkDialog, setInviteLinkDialog] = useState<{ open: boolean; sellerName: string; link: string }>({ open: false, sellerName: "", link: "" });

  const permsQuery = trpc.sellers.getPermissions.useQuery(
    { sellerId: permsDialog.seller?.id || 0 },
    { enabled: !!permsDialog.seller?.id && permsDialog.open }
  );
  // Keep manager perms query for gerentes
  const managerPermsQuery = trpc.managerPerms.get.useQuery(
    { sellerId: permsDialog.seller?.id || 0 },
    { enabled: !!permsDialog.seller?.id && permsDialog.open && permsDialog.seller?.sellerRole === 'gerente' }
  );

  // Debounce search input
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(value), 300);
  }

  // Paginação server-side (mesmo padrão das demais telas)
  const pagination = usePagination({
    initialPageSize: 20,
    resetDeps: [filterDept, filterActive, filterRole, debouncedSearch],
  });
  const sellersQuery = trpc.sellers.listPaged.useQuery({
    active: filterActive,
    dept: filterDept,
    role: filterRole,
    search: debouncedSearch,
    offset: pagination.offset,
    limit: pagination.pageSize,
  });
  const pagedSellers = sellersQuery.data?.items ?? [];
  const total = sellersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  const deptCounts = sellersQuery.data?.deptCounts ?? { todos: 0 };
  const statusCounts = sellersQuery.data?.statusCounts ?? { ativos: 0, inativos: 0 };
  const roleCounts = (sellersQuery.data as any)?.roleCounts ?? { todos: 0, gerente: 0, vendedor: 0 };
  const isLoading = sellersQuery.isLoading;
  const isFetching = sellersQuery.isFetching;

  const createSeller = trpc.sellers.create.useMutation({
    onSuccess: (data) => {
      utils.sellers.invalidate();
      const wasDialogOpenName = form.name;
      setDialogOpen(false);
      resetForm();
      toast.success("Colaborador adicionado!");
      const link = data.loginUrl || `${window.location.origin}${buildTenantPath(getCurrentTenantSlug(), "/login")}?invite=${data.inviteToken}`;
      setInviteLinkDialog({ open: true, sellerName: wasDialogOpenName, link });
    },
    onError: () => toast.error("Erro ao adicionar colaborador."),
  });

  const updateSeller = trpc.sellers.update.useMutation({
    onSuccess: () => { utils.sellers.invalidate(); setDialogOpen(false); resetForm(); toast.success("Colaborador atualizado!"); },
    onError: () => toast.error("Erro ao atualizar colaborador."),
  });

  const deleteSeller = trpc.sellers.delete.useMutation({
    onSuccess: () => { utils.sellers.invalidate(); toast.success("Colaborador removido!"); },
    onError: () => toast.error("Erro ao remover colaborador."),
  });

  const uploadPhoto = trpc.sellers.uploadPhoto.useMutation({
    onSuccess: () => { utils.sellers.invalidate(); setUploadingId(null); toast.success("Foto atualizada!"); },
    onError: () => { setUploadingId(null); toast.error("Erro ao enviar foto."); },
  });

  const toggleActive = trpc.sellers.update.useMutation({
    onSuccess: (_, variables) => {
      utils.sellers.invalidate();
      const action = variables.active ? "ativado" : "desativado";
      toast.success(`Colaborador ${action} com sucesso!`);
      setToggleConfirm({ open: false, seller: null });
    },
    onError: () => {
      toast.error("Erro ao alterar status do colaborador.");
      setToggleConfirm({ open: false, seller: null });
    },
  });

  const setPasswordMutation = trpc.sellers.setPassword.useMutation({
    onSuccess: () => { setPasswordDialog({ open: false, seller: null }); setPasswordForm({ email: "", password: "" }); utils.sellers.invalidate(); toast.success("Login definido com sucesso!"); },
    onError: (err) => toast.error(err.message || "Erro ao definir login."),
  });

  const setRoleMutation = trpc.sellers.update.useMutation({
    onSuccess: () => { utils.sellers.invalidate(); toast.success("Papel atualizado!"); },
    onError: () => toast.error("Erro ao alterar papel."),
  });

  const setPermsMutation = trpc.sellers.setPermissions.useMutation({
    onSuccess: () => { utils.sellers.getPermissions.invalidate(); toast.success("Permissões salvas!"); setPermsDialog({ open: false, seller: null }); },
    onError: () => toast.error("Erro ao salvar permissões."),
  });
  const initPermsMutation = trpc.sellers.initPermissions.useMutation({
    onSuccess: () => { utils.sellers.getPermissions.invalidate(); toast.success("Permissões padrão aplicadas!"); },
    onError: () => toast.error("Erro ao inicializar permissões."),
  });

  function resetForm() {
    setForm({ name: "", nickname: "", phone: "", email: "", department: "vendas" });
    setEditingSeller(null);
  }

  function openEdit(seller: any) {
    setEditingSeller(seller);
    setForm({
      name: seller.name,
      nickname: seller.nickname || "",
      phone: seller.phone || "",
      email: seller.email || "",
      department: seller.department || "vendas",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (form.phone && !isValidBrazilianPhone(form.phone)) { toast.error("Telefone inválido"); return; }
    if (!form.email.trim() || !isValidEmail(form.email)) { toast.error("E-mail é obrigatório e será o login do vendedor"); return; }
    if (editingSeller) {
      updateSeller.mutate({ id: editingSeller.id, ...form });
    } else {
      createSeller.mutate(form);
    }
  }

  function handlePhotoUpload(sellerId: number, file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 5MB)"); return; }
    setUploadingId(sellerId);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadPhoto.mutate({ id: sellerId, base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  }

  function handleToggleClick(seller: any) {
    setToggleConfirm({ open: true, seller });
  }

  function confirmToggle() {
    if (!toggleConfirm.seller) return;
    const seller = toggleConfirm.seller;
    toggleActive.mutate({ id: seller.id, active: !seller.active });
  }

  function toggleRole(seller: any) {
    const newRole = seller.sellerRole === 'gerente' ? 'vendedor' : 'gerente';
    setRoleMutation.mutate({ id: seller.id, sellerRole: newRole });
  }

  function openPermsDialog(seller: any) {
    setPermsDialog({ open: true, seller });
    // Inicializar estado das permissões quando os dados carregarem
    setPermsState({});
  }

  // Sincronizar permsState quando permsQuery carrega
  const permsLoaded = permsQuery.data;
  useMemo(() => {
    if (permsLoaded && permsDialog.open) {
      const state: Record<string, { canView: boolean; canEdit: boolean }> = {};
      permsLoaded.forEach((p: any) => {
        state[p.module] = { canView: p.canView, canEdit: p.canEdit };
      });
      setPermsState(state);
    }
  }, [permsLoaded, permsDialog.open]);

  function savePermissions() {
    if (!permsDialog.seller) return;
    const permissions = Object.entries(permsState)
      .map(([module, v]) => ({ module, canView: v.canView, canEdit: v.canEdit }));
    setPermsMutation.mutate({ sellerId: permsDialog.seller.id, permissions });
  }

  function initDefaultPerms() {
    if (!permsDialog.seller) return;
    initPermsMutation.mutate({ sellerId: permsDialog.seller.id, department: permsDialog.seller.department || 'vendas' });
  }

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={300}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading font-bold text-xl text-foreground">Equipe</h1>
              <p className="text-muted-foreground text-sm mt-1">Gerencie os colaboradores por setor</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="racing-gradient text-white gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-heading text-foreground">
                    {editingSeller ? "Editar Colaborador" : "Novo Colaborador"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label className="text-foreground">Nome *</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className="bg-input border-border text-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground">Apelido</Label>
                      <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="Apelido" className="bg-input border-border text-foreground" />
                    </div>
                    <div>
                      <Label className="text-foreground">Setor *</Label>
                      <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map(d => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground">Telefone</Label>
                      <Input value={form.phone} onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" className="bg-input border-border text-foreground" />
                    </div>
                    <div>
                      <Label className="text-foreground">Email</Label>
                      <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className="bg-input border-border text-foreground" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full racing-gradient text-white" disabled={createSeller.isPending || updateSeller.isPending}>
                    {createSeller.isPending || updateSeller.isPending ? "Salvando..." : editingSeller ? "Salvar Alterações" : "Adicionar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9 bg-input border-border text-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter by status (Ativos/Inativos) — padrão Ativos */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setFilterActive("ativos")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterActive === "ativos" ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              Ativos ({statusCounts.ativos})
            </button>
            <button
              onClick={() => setFilterActive("inativos")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterActive === "inativos" ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              Inativos ({statusCounts.inativos})
            </button>
          </div>

          {/* Filter by role (Gerente/Vendedor) */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setFilterRole("todos")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${filterRole === "todos" ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"}`}
            >
              Todos ({roleCounts.todos})
            </button>
            <button
              onClick={() => setFilterRole("gerente")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${filterRole === "gerente" ? "bg-amber-500 text-white" : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"}`}
            >
              <ShieldCheck className="h-3 w-3" /> Gerentes ({roleCounts.gerente})
            </button>
            <button
              onClick={() => setFilterRole("vendedor")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${filterRole === "vendedor" ? "bg-blue-500 text-white" : "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"}`}
            >
              Vendedores ({roleCounts.vendedor})
            </button>
          </div>

          {/* Filter by department */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            <button
              onClick={() => setFilterDept("todos")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterDept === "todos" ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
              }`}
            >
              Todos ({deptCounts.todos || 0})
            </button>
            {DEPARTMENTS.map(d => (
              <button
                key={d.value}
                onClick={() => setFilterDept(d.value)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filterDept === d.value ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
                }`}
              >
                {d.label} ({deptCounts[d.value] || 0})
              </button>
            ))}
          </div>

          {/* Sellers List */}
          {isLoading ? (
            <ListSkeleton rows={6} />
          ) : total > 0 ? (
            <div className="space-y-3">
              {pagedSellers.map(seller => {
                const dept = getDeptInfo(seller.department);
                const isGerente = seller.sellerRole === 'gerente';
                return (
                  <div key={seller.id} className={`racing-card p-4 flex items-center gap-4 ${!seller.active ? "opacity-50 border-l-4 border-l-red-500/40" : ""} ${isGerente ? "border-l-4 border-l-amber-500/60" : ""}`}>
                    {/* Photo */}
                    <div className="relative shrink-0 group">
                      {seller.photoUrl ? (
                        <img src={seller.photoUrl} alt={seller.name} className="w-14 h-14 rounded-full object-cover border-2 border-border" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-lg font-bold text-accent-foreground border-2 border-border">
                          {seller.name.charAt(0)}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setUploadingId(seller.id);
                          fileInputRef.current?.click();
                        }}
                        className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {uploadingId === seller.id ? (
                          <span className="text-xs text-white">...</span>
                        ) : (
                          <Camera className="h-5 w-5 text-white" />
                        )}
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">{seller.name}</p>
                        {seller.nickname && <span className="text-xs text-muted-foreground">"{seller.nickname}"</span>}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${dept.color}`}>
                          {dept.label}
                        </span>
                        {isGerente ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1">
                            <ShieldCheck className="h-2.5 w-2.5" /> Gerente
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-400">
                            Vendedor
                          </span>
                        )}
                        {!seller.active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-500/20 text-red-400">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {(!seller.department || seller.department === 'vendas' || seller.department === 'pre_vendas') ? (
                          <>
                            <span className="text-xs text-muted-foreground">{seller.totalSales} vendas</span>
                            <span className="text-xs font-heading text-primary">{seller.totalPoints} pts</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem ranking</span>
                        )}
                        {(seller as any).username ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 flex items-center gap-1">
                            <Key className="h-2.5 w-2.5" /> {(seller as any).username}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-500">Sem login</span>
                        )}
                        {seller.lastAccess ? (
                          <span className="text-[10px] text-muted-foreground" title={new Date(seller.lastAccess).toLocaleString('pt-BR')}>
                            Acesso: {(() => {
                              const diff = Date.now() - seller.lastAccess;
                              const mins = Math.floor(diff / 60000);
                              if (mins < 1) return 'agora';
                              if (mins < 60) return `${mins}min atrás`;
                              const hrs = Math.floor(mins / 60);
                              if (hrs < 24) return `${hrs}h atrás`;
                              const days = Math.floor(hrs / 24);
                              return `${days}d atrás`;
                            })()}
                          </span>
                        ) : null}
                        {seller.phone && <span className="text-xs text-muted-foreground hidden sm:inline">{seller.phone}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Quick Role Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {isGerente ? <ShieldCheck className="h-4 w-4 text-amber-400" /> : <Shield className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => !isGerente && toggleRole(seller)}
                            className={isGerente ? "bg-amber-500/10 text-amber-400 font-medium" : ""}
                          >
                            <ShieldCheck className="h-4 w-4 mr-2" /> Gerente
                            {isGerente && <span className="ml-auto text-[10px]">Atual</span>}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => isGerente && toggleRole(seller)}
                            className={!isGerente ? "bg-blue-500/10 text-blue-400 font-medium" : ""}
                          >
                            <Users className="h-4 w-4 mr-2" /> Vendedor
                            {!isGerente && <span className="ml-auto text-[10px]">Atual</span>}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* Permissões de visibilidade - para TODOS os colaboradores */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openPermsDialog(seller)}
                          >
                            <Eye className="h-4 w-4 text-blue-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Controle de visibilidade</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleClick(seller)}
                          >
                            {seller.active ? <UserCheck className="h-4 w-4 text-green-400" /> : <UserX className="h-4 w-4 text-red-400" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>{seller.active ? "Desativar colaborador" : "Reativar colaborador"}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setPasswordDialog({ open: true, seller }); setPasswordForm({ email: (seller as any).email || "", password: "" }); }}
                          >
                            <Key className={`h-4 w-4 ${(seller as any).username ? 'text-blue-400' : 'text-muted-foreground'}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Definir login/senha</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(seller)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Editar dados</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { if (confirm("Remover este colaborador permanentemente?")) deleteSeller.mutate({ id: seller.id }); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Excluir colaborador</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="racing-card p-12 text-center space-y-3">
              <div className="flex justify-center">
                <Users className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">
                {debouncedSearch
                  ? `Nenhum resultado para "${debouncedSearch}"`
                  : filterActive === "inativos"
                    ? "Nenhum colaborador inativo no momento."
                    : filterRole !== "todos"
                      ? `Nenhum ${filterRole === "gerente" ? "gerente" : "vendedor"} encontrado${filterDept !== "todos" ? ` no setor ${getDeptInfo(filterDept).label}` : ""}.`
                      : filterDept !== "todos"
                        ? `Nenhum colaborador ativo no setor "${getDeptInfo(filterDept).label}".`
                        : 'Nenhum colaborador cadastrado ainda.'}
              </p>
              <p className="text-muted-foreground/70 text-sm">
                {debouncedSearch
                  ? "Tente outro termo ou limpe a pesquisa."
                  : filterDept !== "todos" || filterRole !== "todos"
                    ? "Ajuste os filtros ou adicione um novo colaborador."
                    : 'Clique em "Novo" para adicionar o primeiro colaborador.'}
              </p>
            </div>
          )}

          {total > 0 && (
            <PaginationControls
              page={pagination.page}
              totalPages={totalPages}
              total={total}
              pageSize={pagination.pageSize}
              isLoading={isFetching}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          )}

          {/* Toggle Active Confirmation Dialog */}
          <AlertDialog open={toggleConfirm.open} onOpenChange={(open) => { if (!open) setToggleConfirm({ open: false, seller: null }); }}>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">
                  {toggleConfirm.seller?.active ? "Desativar colaborador?" : "Reativar colaborador?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {toggleConfirm.seller?.active ? (
                    <>Tem certeza que deseja <strong>desativar</strong> <strong>{toggleConfirm.seller?.name}</strong>? O colaborador não aparecerá mais no ranking e não poderá registrar vendas.</>
                  ) : (
                    <>Tem certeza que deseja <strong>reativar</strong> <strong>{toggleConfirm.seller?.name}</strong>? O colaborador voltará a aparecer no ranking e poderá registrar vendas normalmente.</>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmToggle}
                  className={toggleConfirm.seller?.active ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
                  disabled={toggleActive.isPending}
                >
                  {toggleActive.isPending ? "Processando..." : toggleConfirm.seller?.active ? "Desativar" : "Reativar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog para definir senha */}
          <Dialog open={passwordDialog.open} onOpenChange={(open) => { setPasswordDialog({ open, seller: open ? passwordDialog.seller : null }); if (!open) setPasswordForm({ email: "", password: "" }); }}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-foreground flex items-center gap-2">
                  <Key className="h-5 w-5 text-blue-400" />
                  Login do Vendedor: {passwordDialog.seller?.name}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); const email = passwordForm.email.trim().toLowerCase(); if (!email || !passwordForm.password.trim()) { toast.error("Preencha e-mail e senha"); return; } if (!isValidEmail(email)) { toast.error("E-mail inválido"); return; } if (passwordForm.password.trim().length < 4) { toast.error("Senha deve ter no mínimo 4 caracteres"); return; } setPasswordMutation.mutate({ id: passwordDialog.seller!.id, email, password: passwordForm.password.trim() }); }} className="space-y-4">
                <div>
                  <Label className="text-foreground">E-mail *</Label>
                  <Input type="email" value={passwordForm.email} onChange={e => setPasswordForm({ ...passwordForm, email: e.target.value })} placeholder="voce@email.com" className="bg-input border-border text-foreground" autoComplete="email" />
                  <p className="text-xs text-muted-foreground mt-1">O colaborador fará login com este e-mail.</p>
                </div>
                <div>
                  <Label className="text-foreground">Senha *</Label>
                  <Input type="password" value={passwordForm.password} onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })} placeholder="Mínimo 4 caracteres" className="bg-input border-border text-foreground" autoComplete="new-password" />
                </div>
                {(passwordDialog.seller as any)?.username && (
                  <p className="text-xs text-blue-400">Este colaborador já possui login. Definir nova senha irá substituir a anterior.</p>
                )}
                <Button type="submit" className="w-full racing-gradient text-white" disabled={setPasswordMutation.isPending}>
                  {setPasswordMutation.isPending ? "Salvando..." : "Definir Login"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog de Permissões / Visibilidade */}
          <Dialog open={permsDialog.open} onOpenChange={(open) => { if (!open) setPermsDialog({ open: false, seller: null }); }}>
            <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading text-foreground flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-400" />
                  Controle de Visibilidade: {permsDialog.seller?.nickname || permsDialog.seller?.name}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mb-2">
                Defina o que este colaborador pode <strong>ver</strong> e <strong>editar</strong> no sistema.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Setor: <span className="text-foreground font-medium">{getDeptInfo(permsDialog.seller?.department).label}</span>
                {' — '}O sistema já aplica permissões padrão por setor, mas você pode personalizar manualmente.
              </p>
              {permsQuery.isLoading ? (
                <div className="py-8 text-center text-muted-foreground">Carregando...</div>
              ) : (
                <div className="space-y-2">
                  {(availableModules || []).map((mod: any) => {
                    const modKey = typeof mod === 'string' ? mod : mod.key;
                    const modLabel = typeof mod === 'string' ? mod : mod.label;
                    const current = permsState[modKey] || { canView: false, canEdit: false };
                    return (
                      <div key={modKey} className="flex items-center justify-between py-2 px-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                        <span className="text-sm text-foreground font-medium">{modLabel}</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const newView = !current.canView;
                              setPermsState(prev => ({
                                ...prev,
                                [modKey]: { canView: newView, canEdit: newView ? current.canEdit : false },
                              }));
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              current.canView ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/10 text-muted-foreground'
                            }`}
                          >
                            <Eye className="h-3 w-3" /> Ver
                          </button>
                          <button
                            onClick={() => {
                              const newEdit = !current.canEdit;
                              setPermsState(prev => ({
                                ...prev,
                                [modKey]: { canView: newEdit ? true : current.canView, canEdit: newEdit },
                              }));
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              current.canEdit ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/10 text-muted-foreground'
                            }`}
                          >
                            <Edit3 className="h-3 w-3" /> Editar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground text-xs"
                  onClick={initDefaultPerms}
                  disabled={initPermsMutation.isPending}
                >
                  {initPermsMutation.isPending ? "Aplicando..." : "Padrão por setor"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground text-xs"
                  onClick={() => {
                    const newState: Record<string, { canView: boolean; canEdit: boolean }> = {};
                    (availableModules || []).forEach((mod: any) => {
                      const k = typeof mod === 'string' ? mod : mod.key;
                      newState[k] = { canView: true, canEdit: false };
                    });
                    setPermsState(newState);
                  }}
                >
                  Liberar tudo (ver)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground text-xs"
                  onClick={() => {
                    const newState: Record<string, { canView: boolean; canEdit: boolean }> = {};
                    (availableModules || []).forEach((mod: any) => {
                      const k = typeof mod === 'string' ? mod : mod.key;
                      newState[k] = { canView: false, canEdit: false };
                    });
                    setPermsState(newState);
                  }}
                >
                  Bloquear tudo
                </Button>
                <Button
                  className="flex-1 racing-gradient text-white"
                  onClick={savePermissions}
                  disabled={setPermsMutation.isPending}
                >
                  {setPermsMutation.isPending ? "Salvando..." : "Salvar Permissões"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Link de convite (primeiro acesso) do colaborador recém-criado */}
          <Dialog open={inviteLinkDialog.open} onOpenChange={(open) => setInviteLinkDialog(d => ({ ...d, open }))}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link de primeiro acesso — {inviteLinkDialog.sellerName}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Envie este link pro colaborador criar o próprio login. Ele é de uso único e só funciona pra essa pessoa.
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={inviteLinkDialog.link} className="font-mono text-xs" onFocus={e => e.target.select()} />
                <Button size="sm" onClick={() => { navigator.clipboard.writeText(inviteLinkDialog.link); toast.success("Link copiado!"); }}>
                  Copiar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Hidden file input for photo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file && uploadingId) handlePhotoUpload(uploadingId, file);
              e.target.value = "";
            }}
          />
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
