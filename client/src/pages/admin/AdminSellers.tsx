import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Camera, UserCheck, UserX, Filter } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";

const DEPARTMENTS = [
  { value: "vendas", label: "Vendas", color: "bg-blue-500/20 text-blue-400" },
  { value: "pre_vendas", label: "Pré-Vendas / SDR", color: "bg-purple-500/20 text-purple-400" },
  { value: "fei", label: "F&I", color: "bg-amber-500/20 text-amber-400" },
  { value: "consignacao", label: "Consignação", color: "bg-cyan-500/20 text-cyan-400" },
  { value: "despachante", label: "Despachante", color: "bg-emerald-500/20 text-emerald-400" },
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
    onSuccess: () => { utils.sellers.list.invalidate(); toast.success("Status atualizado!"); },
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

  return (
    <DashboardLayout>
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
                <div key={seller.id} className={`racing-card p-4 flex items-center gap-4 ${!seller.active ? "opacity-50" : ""}`}>
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
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">{seller.totalSales} vendas</span>
                      <span className="text-xs font-heading text-primary">{seller.totalPoints} pts</span>
                      {seller.phone && <span className="text-xs text-muted-foreground hidden sm:inline">{seller.phone}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive.mutate({ id: seller.id, active: !seller.active })}
                      title={seller.active ? "Desativar" : "Ativar"}
                    >
                      {seller.active ? <UserCheck className="h-4 w-4 text-green-400" /> : <UserX className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(seller)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { if (confirm("Remover este colaborador?")) deleteSeller.mutate({ id: seller.id }); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
    </DashboardLayout>
  );
}
