import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, Edit, Trash2, Plus, DollarSign, Car, Loader2, TrendingUp, TrendingDown, Minus, Camera } from "lucide-react";

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value || 0);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPlate(plate: string): string {
  if (!plate) return "";
  const clean = plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (clean.length === 7) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return clean;
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("pt-BR");
}

function getMarginColor(margin: number | null): string {
  if (margin === null) return "text-muted-foreground";
  if (margin >= 10) return "text-green-500";
  if (margin >= 5) return "text-yellow-500";
  return "text-red-500";
}

const COST_CATEGORIES = [
  { value: "mecanica", label: "Mecânica" },
  { value: "funilaria", label: "Funilaria / Pintura" },
  { value: "estetica", label: "Estética / Polimento" },
  { value: "documentacao", label: "Documentação" },
  { value: "pneus", label: "Pneus" },
  { value: "eletrica", label: "Elétrica" },
  { value: "acessorios", label: "Acessórios" },
  { value: "outros", label: "Outros" },
];

// ===== ADD COST ITEM DIALOG =====
function AddCostItemDialog({ open, onClose, vehicleId, onSuccess }: { open: boolean; onClose: () => void; vehicleId: number; onSuccess: () => void }) {
  const [form, setForm] = useState({ description: "", category: "", amount: "", notes: "" });
  const createMutation = trpc.vehicleCosts.createItem.useMutation({
    onSuccess: () => {
      toast.success("Gasto adicionado!");
      setForm({ description: "", category: "", amount: "", notes: "" });
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Adicionar Gasto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Descrição *</Label>
            <Input placeholder="Ex: Troca de óleo" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {COST_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" placeholder="500.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea placeholder="Detalhes opcionais..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => createMutation.mutate({ vehicleId, description: form.description, category: form.category || undefined, amount: form.amount, date: Date.now() })}
            disabled={!form.description || !form.amount || createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== EDIT VEHICLE DIALOG =====
function EditVehicleDialog({ open, onClose, vehicle, onSuccess }: { open: boolean; onClose: () => void; vehicle: any; onSuccess: () => void }) {
  const [form, setForm] = useState({
    plate: vehicle?.plate || "",
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    year: vehicle?.year?.toString() || "",
    color: vehicle?.color || "",
    fuel: vehicle?.fuel || "",
    purchasePrice: vehicle?.purchasePrice?.toString() || "",
    salePrice: vehicle?.salePrice?.toString() || "",
    status: vehicle?.status || "in_stock",
    notes: vehicle?.notes || "",
  });

  const updateMutation = trpc.vehicleCosts.update.useMutation({
    onSuccess: () => {
      toast.success("Veículo atualizado!");
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5" /> Editar Veículo</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Placa</Label>
            <Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <Label>Marca</Label>
            <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </div>
          <div>
            <Label>Ano</Label>
            <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          </div>
          <div>
            <Label>Cor</Label>
            <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
          <div>
            <Label>Combustível</Label>
            <Select value={form.fuel} onValueChange={(v) => setForm({ ...form, fuel: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flex">Flex</SelectItem>
                <SelectItem value="gasolina">Gasolina</SelectItem>
                <SelectItem value="etanol">Etanol</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">Em Estoque</SelectItem>
                <SelectItem value="sold">Vendido</SelectItem>
                <SelectItem value="reserved">Reservado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor de Compra (R$)</Label>
            <Input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
          </div>
          <div>
            <Label>Valor de Venda (R$)</Label>
            <Input type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => updateMutation.mutate({
              id: vehicle.id,
              plate: form.plate || undefined,
              brand: form.brand || undefined,
              model: form.model || undefined,
              year: form.year ? parseInt(form.year) : undefined,
              color: form.color || undefined,
              fuel: form.fuel || undefined,
              status: form.status as any,
              purchasePrice: form.purchasePrice || undefined,
              salePrice: form.salePrice || undefined,
              saleDate: form.status === "sold" ? Date.now() : undefined,
              notes: form.notes || undefined,
            })}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== MAIN DETAIL COMPONENT =====
export default function VehicleDetail({ vehicleId, onBack }: { vehicleId: number; onBack: () => void }) {
  const [showAddCost, setShowAddCost] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const utils = trpc.useUtils();
  const { data: vehicle, isLoading } = trpc.vehicleCosts.getById.useQuery({ id: vehicleId });

  const deleteMutation = trpc.vehicleCosts.delete.useMutation({
    onSuccess: () => {
      toast.success("Veículo removido!");
      onBack();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const deleteItemMutation = trpc.vehicleCosts.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Gasto removido!");
      utils.vehicleCosts.getById.invalidate({ id: vehicleId });
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const handleRefresh = () => {
    utils.vehicleCosts.getById.invalidate({ id: vehicleId });
    utils.vehicleCosts.list.invalidate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-4 h-4 mr-2" /> Voltar</Button>
        <p className="text-center text-muted-foreground mt-8">Veículo não encontrado</p>
      </div>
    );
  }

  const purchasePrice = parseFloat(String(vehicle.purchasePrice || "0"));
  const salePrice = parseFloat(String(vehicle.salePrice || "0"));
  const totalCost = vehicle.totalCost || 0;
  const profit = vehicle.profit;
  const margin = vehicle.margin;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              {vehicle.brand} {vehicle.model} {vehicle.year}
            </h1>
            <p className="text-sm text-muted-foreground">Placa: {formatPlate(vehicle.plate)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Edit className="w-4 h-4 mr-1" /> Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-1" /> Excluir
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Compra</p>
            <p className="text-lg font-bold">{formatCurrency(purchasePrice)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Gastos ({vehicle.expenseCount})</p>
            <p className="text-lg font-bold text-red-400">{formatCurrency(vehicle.totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Custo Total</p>
            <p className="text-lg font-bold">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{salePrice > 0 ? "Lucro" : "Venda"}</p>
            {salePrice > 0 ? (
              <p className={`text-lg font-bold ${getMarginColor(margin)}`}>
                {formatCurrency(profit)} ({margin?.toFixed(1)}%)
              </p>
            ) : (
              <p className="text-lg font-bold text-muted-foreground">Não vendido</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalhes do Veículo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">
                {vehicle.status === "in_stock" ? "Em Estoque" : vehicle.status === "sold" ? "Vendido" : "Reservado"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Cor</p>
              <p className="font-medium">{vehicle.color || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Combustível</p>
              <p className="font-medium">{vehicle.fuel || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Data de Entrada</p>
              <p className="font-medium">{formatDate(vehicle.entryDate)}</p>
            </div>
            {vehicle.fipeCode && (
              <div>
                <p className="text-muted-foreground">Código FIPE</p>
                <p className="font-medium">{vehicle.fipeCode}</p>
              </div>
            )}
            {vehicle.fipeValue && (
              <div>
                <p className="text-muted-foreground">Valor FIPE</p>
                <p className="font-medium">{formatCurrency(vehicle.fipeValue)}</p>
              </div>
            )}
            {vehicle.saleDate && (
              <div>
                <p className="text-muted-foreground">Data de Venda</p>
                <p className="font-medium">{formatDate(vehicle.saleDate)}</p>
              </div>
            )}
            {salePrice > 0 && (
              <div>
                <p className="text-muted-foreground">Valor de Venda</p>
                <p className="font-medium">{formatCurrency(salePrice)}</p>
              </div>
            )}
          </div>
          {vehicle.notes && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-muted-foreground text-sm">Observações</p>
              <p className="text-sm">{vehicle.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gastos */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Gastos / Custos
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddCost(true)}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Gasto
          </Button>
        </CardHeader>
        <CardContent>
          {vehicle.items && vehicle.items.length > 0 ? (
            <div className="space-y-2">
              {vehicle.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.description}</p>
                      {item.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {COST_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.date)}
                      {item.notes ? ` — ${item.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-red-400">{formatCurrency(item.amount)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        if (confirm("Remover este gasto?")) {
                          deleteItemMutation.mutate({ id: item.id });
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t font-bold">
                <span>Total de Gastos:</span>
                <span className="text-red-400">{formatCurrency(vehicle.totalExpenses)}</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhum gasto registrado</p>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddCostItemDialog open={showAddCost} onClose={() => setShowAddCost(false)} vehicleId={vehicleId} onSuccess={handleRefresh} />
      {showEdit && vehicle && (
        <EditVehicleDialog open={showEdit} onClose={() => setShowEdit(false)} vehicle={vehicle} onSuccess={handleRefresh} />
      )}

      {/* Delete Confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o veículo <strong>{vehicle.brand} {vehicle.model}</strong> (placa {formatPlate(vehicle.plate)})?
            Todos os gastos associados também serão removidos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: vehicleId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
