import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, ShoppingCart, TrendingUp, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminSales() {
  const { data: salesList } = trpc.sales.list.useQuery({});
  const { data: sellers } = trpc.sellers.list.useQuery({ activeOnly: true });
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" });
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    sellerId: "", competitionId: "", description: "", vehicleModel: "", value: "", points: "1",
  });

  const createSale = trpc.sales.create.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sellers.list.invalidate();
      utils.participants.list.invalidate();
      utils.competitions.ranking.invalidate();
      setDialogOpen(false);
      setForm({ sellerId: "", competitionId: "", description: "", vehicleModel: "", value: "", points: "1" });
      toast.success("Venda registrada!");
    },
    onError: () => toast.error("Erro ao registrar venda."),
  });

  const deleteSale = trpc.sales.delete.useMutation({
    onSuccess: () => {
      utils.sales.list.invalidate();
      utils.sellers.list.invalidate();
      utils.participants.list.invalidate();
      utils.competitions.ranking.invalidate();
      toast.success("Venda excluída! Pontos revertidos.");
    },
    onError: () => toast.error("Erro ao excluir venda."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sellerId) { toast.error("Selecione um vendedor"); return; }
    createSale.mutate({
      sellerId: parseInt(form.sellerId),
      competitionId: form.competitionId ? parseInt(form.competitionId) : undefined,
      description: form.description || undefined,
      vehicleModel: form.vehicleModel || undefined,
      value: form.value ? parseInt(form.value) : undefined,
      points: parseInt(form.points) || 1,
    });
  }

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-400" />;
    return <XCircle className="h-4 w-4 text-red-400" />;
  };

  const statusLabel = (status: string) => {
    if (status === 'approved') return "Aprovada";
    if (status === 'pending') return "Pendente";
    return "Rejeitada";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Vendas</h1>
            <p className="text-muted-foreground text-sm mt-1">Registre, acompanhe e exclua vendas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="racing-gradient text-white gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Registrar Venda</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-foreground">Registrar Venda</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-foreground">Vendedor *</Label>
                  <Select value={form.sellerId} onValueChange={v => setForm({ ...form, sellerId: v })}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                    <SelectContent>
                      {sellers?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Competição (opcional)</Label>
                  <Select value={form.competitionId} onValueChange={v => setForm({ ...form, competitionId: v })}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Sem competição" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem competição</SelectItem>
                      {competitions?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Modelo do Veículo</Label>
                  <Input value={form.vehicleModel} onChange={e => setForm({ ...form, vehicleModel: e.target.value })} placeholder="Ex: Honda Civic 2024" className="bg-input border-border text-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">Valor (R$)</Label>
                    <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="0" className="bg-input border-border text-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground">Pontos</Label>
                    <Input type="number" min={1} value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} className="bg-input border-border text-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-foreground">Descrição</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Observações" className="bg-input border-border text-foreground" />
                </div>
                <Button type="submit" className="w-full racing-gradient text-white" disabled={createSale.isPending}>
                  {createSale.isPending ? "Registrando..." : "Registrar Venda"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sales List */}
        {salesList && salesList.length > 0 ? (
          <div className="space-y-2">
            {salesList.map(sale => {
              const seller = sellers?.find(s => s.id === sale.sellerId);
              return (
                <div key={sale.id} className="racing-card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{seller?.name || `Vendedor #${sale.sellerId}`}</p>
                      <span className="flex items-center gap-1 text-xs">
                        {statusIcon(sale.status || 'approved')}
                        <span className="text-muted-foreground">{statusLabel(sale.status || 'approved')}</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {sale.vehicleModel || sale.description || "Venda registrada"}
                      {" — "}
                      {new Date(sale.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      {sale.value ? <p className="text-sm font-semibold text-foreground">R$ {sale.value.toLocaleString("pt-BR")}</p> : null}
                      <div className="flex items-center gap-1 justify-end">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="text-xs font-heading text-primary">+{sale.points} pts</span>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-foreground">Excluir venda?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta venda de <strong>{seller?.name}</strong>?
                            {sale.status === 'approved' && " Os pontos serão revertidos do ranking."}
                            {" "}Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSale.mutate({ id: sale.id })}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="racing-card p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma venda registrada.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
