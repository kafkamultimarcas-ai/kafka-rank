import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Sparkles, ClipboardList, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminActionPlans() {
  const { data: plans } = trpc.actionPlans.list.useQuery({});
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ sellerId: "", title: "", content: "", dueDate: "" });

  const createPlan = trpc.actionPlans.create.useMutation({
    onSuccess: () => { utils.actionPlans.list.invalidate(); setDialogOpen(false); setForm({ sellerId: "", title: "", content: "", dueDate: "" }); toast.success("Plano criado!"); },
    onError: () => toast.error("Erro ao criar plano."),
  });
  const updatePlan = trpc.actionPlans.update.useMutation({
    onSuccess: () => { utils.actionPlans.list.invalidate(); toast.success("Plano atualizado!"); },
  });
  const deletePlan = trpc.actionPlans.delete.useMutation({
    onSuccess: () => { utils.actionPlans.list.invalidate(); toast.success("Plano removido!"); },
  });
  const generateAI = trpc.actionPlans.generateWithAI.useMutation({
    onSuccess: () => { utils.actionPlans.list.invalidate(); toast.success("Plano gerado com IA!"); },
    onError: () => toast.error("Erro ao gerar plano com IA."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sellerId || !form.title.trim() || !form.content.trim()) { toast.error("Preencha todos os campos obrigatórios"); return; }
    createPlan.mutate({
      sellerId: parseInt(form.sellerId),
      title: form.title,
      content: form.content,
      dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
    });
  }

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (status === "in_progress") return <Clock className="h-4 w-4 text-yellow-400" />;
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Planos de Ação</h1>
            <p className="text-muted-foreground text-sm mt-1">Crie planos personalizados ou gere com IA</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="racing-gradient text-white gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo Plano</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-heading text-foreground">Novo Plano de Ação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label className="text-foreground">Vendedor *</Label>
                    <Select value={form.sellerId} onValueChange={v => setForm({ ...form, sellerId: v })}>
                      <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {sellers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Título *</Label>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título do plano" className="bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground">Conteúdo *</Label>
                    <textarea
                      value={form.content}
                      onChange={e => setForm({ ...form, content: e.target.value })}
                      placeholder="Detalhes do plano de ação..."
                      rows={5}
                      className="w-full rounded-md bg-input border border-border text-foreground p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Prazo</Label>
                    <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="bg-input border-border text-foreground" />
                  </div>
                  <Button type="submit" className="w-full racing-gradient text-white" disabled={createPlan.isPending}>
                    {createPlan.isPending ? "Criando..." : "Criar Plano"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* AI Generation Section */}
        <div className="racing-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-sm text-foreground">GERAR PLANO COM IA</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Selecione um vendedor e a IA analisará seu histórico de vendas para criar um plano de ação personalizado.
          </p>
          <div className="flex flex-wrap gap-2">
            {sellers?.map(seller => (
              <Button
                key={seller.id}
                variant="outline"
                size="sm"
                onClick={() => generateAI.mutate({ sellerId: seller.id })}
                disabled={generateAI.isPending}
                className="gap-1 text-xs"
              >
                <Sparkles className="h-3 w-3" />
                {seller.name}
              </Button>
            ))}
          </div>
          {generateAI.isPending && (
            <p className="text-sm text-primary mt-3 animate-pulse">Gerando plano com IA...</p>
          )}
        </div>

        {/* Plans List */}
        {plans && plans.length > 0 ? (
          <div className="space-y-3">
            {plans.map(plan => {
              const seller = sellers?.find(s => s.id === plan.sellerId);
              return (
                <div key={plan.id} className="racing-card p-4">
                  <div className="flex items-start gap-3">
                    {statusIcon(plan.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-foreground">{plan.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          plan.status === "completed" ? "bg-green-500/20 text-green-400" :
                          plan.status === "in_progress" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {plan.status === "completed" ? "Concluído" : plan.status === "in_progress" ? "Em andamento" : "Pendente"}
                        </span>
                      </div>
                      <p className="text-xs text-primary mb-2">{seller?.name || `Vendedor #${plan.sellerId}`}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{plan.content}</p>
                      {plan.dueDate && (
                        <p className="text-xs text-muted-foreground mt-2">Prazo: {new Date(plan.dueDate).toLocaleDateString("pt-BR")}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Select
                        value={plan.status}
                        onValueChange={(v: any) => updatePlan.mutate({ id: plan.id, status: v })}
                      >
                        <SelectTrigger className="w-28 h-7 text-xs bg-input border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="in_progress">Em andamento</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover?")) deletePlan.mutate({ id: plan.id }); }} className="h-7 text-xs text-destructive">
                        <Trash2 className="h-3 w-3 mr-1" /> Remover
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="racing-card p-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum plano de ação criado.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
