import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GraduationCap, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminTrainings() {
  const { data: trainings } = trpc.trainings.list.useQuery({});
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "" });

  const createTraining = trpc.trainings.create.useMutation({
    onSuccess: () => { utils.trainings.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Treinamento criado!"); },
    onError: () => toast.error("Erro ao criar treinamento."),
  });
  const updateTraining = trpc.trainings.update.useMutation({
    onSuccess: () => { utils.trainings.list.invalidate(); setDialogOpen(false); resetForm(); toast.success("Treinamento atualizado!"); },
    onError: () => toast.error("Erro ao atualizar."),
  });
  const deleteTraining = trpc.trainings.delete.useMutation({
    onSuccess: () => { utils.trainings.list.invalidate(); toast.success("Treinamento removido!"); },
  });
  const toggleActive = trpc.trainings.update.useMutation({
    onSuccess: () => { utils.trainings.list.invalidate(); toast.success("Status atualizado!"); },
  });

  function resetForm() { setForm({ title: "", content: "", category: "" }); setEditing(null); }

  function openEdit(t: any) {
    setEditing(t);
    setForm({ title: t.title, content: t.content, category: t.category || "" });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { toast.error("Título e conteúdo são obrigatórios"); return; }
    if (editing) {
      updateTraining.mutate({ id: editing.id, ...form });
    } else {
      createTraining.mutate(form);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Treinamentos</h1>
            <p className="text-muted-foreground text-sm mt-1">Mini treinamentos para a equipe</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="racing-gradient text-white gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Treinamento</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-foreground">
                  {editing ? "Editar Treinamento" : "Novo Treinamento"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-foreground">Título *</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título do treinamento" className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Categoria</Label>
                  <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Técnicas de Fechamento" className="bg-input border-border text-foreground" />
                </div>
                <div>
                  <Label className="text-foreground">Conteúdo *</Label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="Conteúdo do treinamento..."
                    rows={6}
                    className="w-full rounded-md bg-input border border-border text-foreground p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <Button type="submit" className="w-full racing-gradient text-white" disabled={createTraining.isPending || updateTraining.isPending}>
                  {createTraining.isPending || updateTraining.isPending ? "Salvando..." : editing ? "Salvar" : "Criar Treinamento"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {trainings && trainings.length > 0 ? (
          <div className="space-y-3">
            {trainings.map(t => (
              <div key={t.id} className={`racing-card p-4 ${!t.active ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{t.title}</h3>
                    {t.category && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t.category}</span>}
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{t.content}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => toggleActive.mutate({ id: t.id, active: !t.active })}>
                      {t.active ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover?")) deleteTraining.mutate({ id: t.id }); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="racing-card p-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum treinamento criado.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
