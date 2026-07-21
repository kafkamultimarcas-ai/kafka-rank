import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, User, Phone, Mail, MapPin, FileText, ToggleLeft, ToggleRight, Car } from "lucide-react";
import { toast } from "sonner";
import { maskPhone } from "@/lib/masks";
import { isValidCPF } from "@shared/validators";


// CPF Mask helper
function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

type Consignor = {
  id: number;
  tenantId: number;
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
};

const EMPTY_FORM = {
  name: "",
  cpf: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function AdminConsignadores() {
  return (
    <DashboardLayout>
      <AdminConsignadoresInner />
    </DashboardLayout>
  );
}

function AdminConsignadoresInner() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [vehiclesOpen, setVehiclesOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedConsignor, setSelectedConsignor] = useState<Consignor | null>(null);
  const [cpfError, setCpfError] = useState("");


  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const utils = trpc.useUtils();
  const { data: consignors = [], isLoading } = trpc.consignors.list.useQuery({ activeOnly: !showInactive });
  const { data: vehicleCounts = [] } = trpc.consignors.vehicleCounts.useQuery();
  const { data: consignorVehicles = [], isLoading: vehiclesLoading } = trpc.consignors.vehiclesByConsignor.useQuery(
    { consignorId: selectedConsignor?.id || 0 },
    { enabled: vehiclesOpen && !!selectedConsignor }
  );

  function getVehicleCount(consignorId: number): number {
    const found = vehicleCounts.find((vc: any) => vc.consignorId === consignorId);
    return found ? found.count : 0;
  }

  const createMut = trpc.consignors.create.useMutation({
    onSuccess: () => { toast.success("Consignador cadastrado!"); utils.consignors.list.invalidate(); setCreateOpen(false); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMut = trpc.consignors.update.useMutation({
    onSuccess: () => { toast.success("Consignador atualizado!"); utils.consignors.list.invalidate(); setEditOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMut = trpc.consignors.delete.useMutation({
    onSuccess: () => { toast.success("Consignador inativado!"); utils.consignors.list.invalidate(); setDeleteOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() {
    setForm(EMPTY_FORM);
    setCpfError("");
  }

  function validateCpf(value: string): boolean {
    const digits = value.replace(/\D/g, "");
    if (!digits) return true; // empty is ok
    if (digits.length < 11) { setCpfError("CPF incompleto"); return false; }
    if (!isValidCPF(digits)) { setCpfError("CPF inválido"); return false; }
    setCpfError("");
    return true;
  }

  function handleCreate() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (form.cpf && !validateCpf(form.cpf)) { toast.error("CPF inválido"); return; }
    createMut.mutate({
      name: form.name.trim(),
      cpf: form.cpf.replace(/\D/g, "") || undefined,
      phone: form.phone.replace(/\D/g, "") || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  function handleUpdate() {
    if (!selectedConsignor) return;
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (form.cpf && !validateCpf(form.cpf)) { toast.error("CPF inválido"); return; }
    updateMut.mutate({
      id: selectedConsignor.id,
      name: form.name.trim(),
      cpf: form.cpf.replace(/\D/g, "") || undefined,
      phone: form.phone.replace(/\D/g, "") || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  function handleToggleActive(c: Consignor) {
    updateMut.mutate({ id: c.id, active: !c.active }, {
      onSuccess: () => { toast.success(c.active ? "Consignador inativado" : "Consignador reativado"); utils.consignors.list.invalidate(); },
    });
  }

  function openEdit(c: Consignor) {
    setSelectedConsignor(c);
    setForm({
      name: c.name,
      cpf: c.cpf ? maskCPF(c.cpf) : "",
      phone: c.phone ? maskPhone(c.phone) : "",
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
    });
    setCpfError("");
    setEditOpen(true);
  }

  function openDetails(c: Consignor) {
    setSelectedConsignor(c);
    setDetailsOpen(true);
  }

  // Filter by search
  const filtered = consignors.filter((c: Consignor) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.cpf && c.cpf.includes(q.replace(/\D/g, ""))) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q.replace(/\D/g, "")))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consignadores</h1>
          <p className="text-sm text-muted-foreground">Gerencie os consignadores (proprietários de veículos)</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Consignador
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF, email..."
            className="pl-9"
          />
        </div>
        <Button
          variant={showInactive ? "default" : "outline"}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
          className="gap-1"
        >
          {showInactive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {showInactive ? "Mostrando todos" : "Somente ativos"}
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum consignador encontrado</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {debouncedSearch ? "Tente ajustar sua busca" : "Cadastre o primeiro consignador"}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">CPF</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Veículos</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c: Consignor) => (
                <tr key={c.id} className={`hover:bg-muted/30 ${!c.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.cpf ? maskCPF(c.cpf) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ? maskPhone(c.phone) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setSelectedConsignor(c); setVehiclesOpen(true); }}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium transition-colors"
                      title="Ver veículos deste consignador"
                    >
                      <Car className="w-3.5 h-3.5" />
                      {getVehicleCount(c.id)}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {c.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetails(c)}>
                          <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(c)}>
                          {c.active ? <ToggleLeft className="w-4 h-4 mr-2" /> : <ToggleRight className="w-4 h-4 mr-2" />}
                          {c.active ? "Inativar" : "Reativar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedConsignor(c); setDeleteOpen(true); }} className="text-red-500">
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Consignador</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input
                value={form.cpf}
                onChange={e => { setForm({ ...form, cpf: maskCPF(e.target.value) }); setCpfError(""); }}
                onBlur={() => validateCpf(form.cpf)}
                placeholder="000.000.000-00"
                maxLength={14}
              />
              {cpfError && <p className="text-xs text-red-500">{cpfError}</p>}
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })} placeholder="(47) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" type="email" />
            </div>
            <div className="space-y-1">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade" />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionais..." className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Consignador</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input
                value={form.cpf}
                onChange={e => { setForm({ ...form, cpf: maskCPF(e.target.value) }); setCpfError(""); }}
                onBlur={() => validateCpf(form.cpf)}
                placeholder="000.000.000-00"
                maxLength={14}
              />
              {cpfError && <p className="text-xs text-red-500">{cpfError}</p>}
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })} placeholder="(47) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" type="email" />
            </div>
            <div className="space-y-1">
              <Label>Endereço</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade" />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionais..." className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Consignador</DialogTitle>
          </DialogHeader>
          {selectedConsignor && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedConsignor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Cadastrado em {new Date(selectedConsignor.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-border">
                {selectedConsignor.cpf && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">CPF:</span>
                    <span className="text-foreground">{maskCPF(selectedConsignor.cpf)}</span>
                  </div>
                )}
                {selectedConsignor.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="text-foreground">{maskPhone(selectedConsignor.phone)}</span>
                  </div>
                )}
                {selectedConsignor.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-foreground">{selectedConsignor.email}</span>
                  </div>
                )}
                {selectedConsignor.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Endereço:</span>
                    <span className="text-foreground">{selectedConsignor.address}</span>
                  </div>
                )}
                {selectedConsignor.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">Notas:</span>
                    <span className="text-foreground">{selectedConsignor.notes}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-border">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedConsignor.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {selectedConsignor.active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fechar</Button>
            {selectedConsignor && (
              <Button onClick={() => { setDetailsOpen(false); openEdit(selectedConsignor); }}>Editar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicles Dialog */}
      <Dialog open={vehiclesOpen} onOpenChange={setVehiclesOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-400" />
              Veículos de {selectedConsignor?.name}
            </DialogTitle>
          </DialogHeader>
          {vehiclesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando veículos...</div>
          ) : consignorVehicles.length === 0 ? (
            <div className="text-center py-8">
              <Car className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum veículo vinculado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {consignorVehicles.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="font-medium text-foreground text-sm">{v.vehicleModel}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-yellow-400 font-mono">{v.vehiclePlate}</span>
                      <span className="text-xs text-muted-foreground">
                        Entrada: {v.entryDate ? new Date(v.entryDate).toLocaleDateString('pt-BR') : '—'}
                      </span>
                      {v.exitDate && (
                        <span className="text-xs text-emerald-400">
                          Saída: {new Date(v.exitDate).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    v.exitDate ? 'bg-gray-500/20 text-gray-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {v.exitDate ? 'Devolvido' : 'No Pátio'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehiclesOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja inativar o consignador <strong>{selectedConsignor?.name}</strong>? O registro será mantido no histórico.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => selectedConsignor && deleteMut.mutate({ id: selectedConsignor.id })} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Excluindo..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
