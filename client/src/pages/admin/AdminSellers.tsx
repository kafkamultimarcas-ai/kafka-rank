import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Camera, UserCheck, UserX, Key } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";

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
  const { data: sellers, isLoading } = trpc.sellers.list.useQuery({});
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<any>(null);
  const [form, setForm] = useState({ name: "", nickname: "", phone: "", email: "", department: "vendas" });
  const [filterDept, setFilterDept] = useState<string>("todos");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; seller: any | null }>({ open: false, seller: null });
  const [passwordForm, setPasswordForm] = useState({ username: "", password: "" });
  const [toggleConfirm, setToggleConfirm] = useState<{ open: boolean; seller: any | null }>({ open: false, seller: null });

  const filteredSellers = useMemo(() => {
    if (!sellers) return [];
    if (filterDept === "todos") return sellers;
    return sellers.filter(s => (s.department || "vendas") === filterDept);
  }, [sellers, filterDept]);

  const deptCounts = useMemo(() => {
    if (!sellers) return {};
    const counts: Record<string, number> = { todos: sellers.length };
    sellers.forEach(s => {
      const dept = s.department || "vendas";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  }, [sellers]);

  const createSeller = trpc.sellers.create.useMutation({
    onSuccess: () => { utils.sellers.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Colaborador adicionado!"); },
    onError: () => toast.error("Erro ao adicionar colaborador."),
  });

  const updateSeller = trpc.sellers.update.useMutation({
    onSuccess: () => { utils.sellers.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Colaborador atualizado!"); },
    onError: () => toast.error("Erro ao atualizar colaborador."),
  });

  const deleteSeller = trpc.sellers.delete.useMutation({
    onSuccess: () => { utils.sellers.list.invalidate(); toast.success("Colaborador removido!"); },
    onError: () => toast.error("Erro ao remover colaborador."),
  });

  const uploadPhoto = trpc.sellers.uploadPhoto.useMutation({
    onSuccess: () => { utils.sellers.list.invalidate(); setUploadingId(null); toast.success("Foto atualizada!"); },
    onError: () => { setUploadingId(null); toast.error("Erro ao enviar foto."); },
  });

  const toggleActive = trpc.sellers.update.useMutation({
    onSuccess: (_, variables) => {
      utils.sellers.list.invalidate();
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
    onSuccess: () => { setPasswordDialog({ open: false, seller: null }); setPasswordForm({ username: "", password: "" }); toast.success("Login definido com sucesso!"); },
    onError: (err) => toast.error(err.message || "Erro ao definir login."),
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
                      <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" className="bg-input border-border text-foreground" />
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
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="racing-card p-4 h-20 animate-pulse" />)}
            </div>
          ) : filteredSellers.length > 0 ? (
            <div className="space-y-3">
              {filteredSellers.map(seller => {
                const dept = getDeptInfo(seller.department);
                return (
                  <div key={seller.id} className={`racing-card p-4 flex items-center gap-4 ${!seller.active ? "opacity-50 border-l-4 border-l-red-500/40" : ""}`}>
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
                            onClick={() => { setPasswordDialog({ open: true, seller }); setPasswordForm({ username: (seller as any).username || "", password: "" }); }}
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
            <div className="racing-card p-12 text-center">
              <p className="text-muted-foreground">
                {filterDept !== "todos"
                  ? `Nenhum colaborador no setor "${getDeptInfo(filterDept).label}". Adicione um novo ou mude o filtro.`
                  : 'Nenhum colaborador cadastrado. Clique em "Novo" para começar.'}
              </p>
            </div>
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
          <Dialog open={passwordDialog.open} onOpenChange={(open) => { setPasswordDialog({ open, seller: open ? passwordDialog.seller : null }); if (!open) setPasswordForm({ username: "", password: "" }); }}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-foreground flex items-center gap-2">
                  <Key className="h-5 w-5 text-blue-400" />
                  Login do Vendedor: {passwordDialog.seller?.name}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); if (!passwordForm.username.trim() || !passwordForm.password.trim()) { toast.error("Preencha usuário e senha"); return; } setPasswordMutation.mutate({ id: passwordDialog.seller!.id, username: passwordForm.username.trim(), password: passwordForm.password.trim() }); }} className="space-y-4">
                <div>
                  <Label className="text-foreground">Nome de usuário *</Label>
                  <Input value={passwordForm.username} onChange={e => setPasswordForm({ ...passwordForm, username: e.target.value })} placeholder="Ex: joao.silva" className="bg-input border-border text-foreground" />
                  <p className="text-xs text-muted-foreground mt-1">Mínimo 3 caracteres. Será usado para login.</p>
                </div>
                <div>
                  <Label className="text-foreground">Senha *</Label>
                  <Input type="password" value={passwordForm.password} onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })} placeholder="Mínimo 4 caracteres" className="bg-input border-border text-foreground" />
                </div>
                {(passwordDialog.seller as any)?.username && (
                  <p className="text-xs text-blue-400">Este vendedor já possui login: <strong>{(passwordDialog.seller as any).username}</strong>. Definir nova senha irá substituir a anterior.</p>
                )}
                <Button type="submit" className="w-full racing-gradient text-white" disabled={setPasswordMutation.isPending}>
                  {setPasswordMutation.isPending ? "Salvando..." : "Definir Login"}
                </Button>
              </form>
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
