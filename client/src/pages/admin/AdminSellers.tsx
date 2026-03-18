import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Camera, UserCheck, UserX } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function AdminSellers() {
  const { data: sellers, isLoading } = trpc.sellers.list.useQuery({});
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<any>(null);
  const [form, setForm] = useState({ name: "", nickname: "", phone: "", email: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const createSeller = trpc.sellers.create.useMutation({
    onSuccess: () => { utils.sellers.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Vendedor adicionado!"); },
    onError: () => toast.error("Erro ao adicionar vendedor."),
  });

  const updateSeller = trpc.sellers.update.useMutation({
    onSuccess: () => { utils.sellers.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Vendedor atualizado!"); },
    onError: () => toast.error("Erro ao atualizar vendedor."),
  });

  const deleteSeller = trpc.sellers.delete.useMutation({
    onSuccess: () => { utils.sellers.list.invalidate(); toast.success("Vendedor removido!"); },
    onError: () => toast.error("Erro ao remover vendedor."),
  });

  const uploadPhoto = trpc.sellers.uploadPhoto.useMutation({
    onSuccess: () => { utils.sellers.list.invalidate(); setUploadingId(null); toast.success("Foto atualizada!"); },
    onError: () => { setUploadingId(null); toast.error("Erro ao enviar foto."); },
  });

  const toggleActive = trpc.sellers.update.useMutation({
    onSuccess: () => { utils.sellers.list.invalidate(); toast.success("Status atualizado!"); },
  });

  function resetForm() {
    setForm({ name: "", nickname: "", phone: "", email: "" });
    setEditingSeller(null);
  }

  function openEdit(seller: any) {
    setEditingSeller(seller);
    setForm({ name: seller.name, nickname: seller.nickname || "", phone: seller.phone || "", email: seller.email || "" });
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
            <h1 className="font-heading font-bold text-xl text-foreground">Vendedores</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie os pilotos da competição</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="racing-gradient text-white gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Vendedor</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-foreground">
                  {editingSeller ? "Editar Vendedor" : "Novo Vendedor"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-foreground">Nome *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Apelido</Label>
                  <Input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="Apelido na corrida" className="bg-input border-border text-foreground" />
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
                  {createSeller.isPending || updateSeller.isPending ? "Salvando..." : editingSeller ? "Salvar Alterações" : "Adicionar Vendedor"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sellers List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="racing-card p-4 h-20 animate-pulse" />)}
          </div>
        ) : sellers && sellers.length > 0 ? (
          <div className="space-y-3">
            {sellers.map(seller => (
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
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate">{seller.name}</p>
                    {seller.nickname && <span className="text-xs text-muted-foreground">"{seller.nickname}"</span>}
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
                    onClick={() => { if (confirm("Remover este vendedor?")) deleteSeller.mutate({ id: seller.id }); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="racing-card p-12 text-center">
            <p className="text-muted-foreground">Nenhum vendedor cadastrado. Clique em "Novo Vendedor" para começar.</p>
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
