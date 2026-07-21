import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PaginationControls } from "@/components/PaginationControls";
import { usePagination } from "@/hooks/usePagination";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Building2, Phone, MapPin, FileText, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { maskPhone } from "@/lib/masks";

type Oficina = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  cep: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
};

const EMPTY_FORM = {
  name: "",
  phone: "",
  address: "",
  cep: "",
  notes: "",
};

export default function AdminOficinas() {
  return (
    <DashboardLayout>
      <OficinasContent />
    </DashboardLayout>
  );
}

function OficinasContent() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOficina, setSelectedOficina] = useState<Oficina | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: oficinas, isLoading, refetch } = trpc.pvOficinas.listAll.useQuery();

  const filtered = useMemo(() => {
    if (!oficinas) return [];
    if (!search) return oficinas;
    const s = search.toLowerCase();
    return oficinas.filter((o: any) =>
      o.name?.toLowerCase().includes(s) ||
      o.phone?.toLowerCase().includes(s) ||
      o.address?.toLowerCase().includes(s)
    );
  }, [oficinas, search]);

  const pagination = usePagination({
    initialPageSize: 25,
    total: filtered.length,
    resetDeps: [search],
  });
  const paged = useMemo(
    () => filtered.slice(pagination.offset, pagination.offset + pagination.limit),
    [filtered, pagination.offset, pagination.limit]
  );

  const createMut = trpc.pvOficinas.create.useMutation({
    onSuccess: () => { toast.success("Oficina cadastrada!"); setShowCreate(false); resetForm(); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.pvOficinas.update.useMutation({
    onSuccess: () => { toast.success("Oficina atualizada!"); setShowEdit(false); resetForm(); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.pvOficinas.delete.useMutation({
    onSuccess: () => { toast.success("Oficina excluída!"); setShowDeleteConfirm(false); setSelectedOficina(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    resetForm();
    setShowCreate(true);
  }

  function openEdit(o: Oficina) {
    setSelectedOficina(o);
    setForm({
      name: o.name,
      phone: o.phone || "",
      address: o.address || "",
      cep: o.cep || "",
      notes: o.notes || "",
    });
    setShowEdit(true);
  }

  function openDetails(o: Oficina) {
    setSelectedOficina(o);
    setShowDetails(true);
  }

  function openDelete(o: Oficina) {
    setSelectedOficina(o);
    setShowDeleteConfirm(true);
  }

    function handleCreate() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (form.phone && form.phone.replace(/\D/g, "").length < 10) { toast.error("Telefone inválido (mínimo 10 dígitos)"); return; }
    createMut.mutate({
      name: form.name.trim(),
      phone: form.phone || undefined,
      address: form.address || undefined,
      cep: form.cep || undefined,
      notes: form.notes || undefined,
    });
  }
  function handleUpdate() {
    if (!selectedOficina) return;
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (form.phone && form.phone.replace(/\D/g, "").length < 10) { toast.error("Telefone inválido (mínimo 10 dígitos)"); return; }
    updateMut.mutate({
      id: selectedOficina.id,
      name: form.name.trim(),
      phone: form.phone || undefined,
      address: form.address || undefined,
      cep: form.cep || undefined,
      notes: form.notes || undefined,
    });
  }

  function handleDelete() {
    if (!selectedOficina) return;
    deleteMut.mutate({ id: selectedOficina.id });
  }

  function handleToggleActive(o: Oficina) {
    updateMut.mutate({ id: o.id, active: !o.active });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-orange-500" />
            Oficinas Credenciadas
          </h1>
          <p className="text-muted-foreground text-sm">{filtered.length} oficina(s) cadastrada(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4" /> Adicionar Oficina
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, telefone, endereço..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-left p-3 font-medium">Telefone</th>
              <th className="text-left p-3 font-medium">Endereço</th>
              <th className="text-center p-3 font-medium">Status</th>
              <th className="text-center p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Carregando...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Nenhuma oficina encontrada</td></tr>
            ) : paged.map((o: any) => (
              <tr key={o.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">{o.name}</td>
                <td className="p-3 text-muted-foreground">{o.phone || "—"}</td>
                <td className="p-3 text-muted-foreground truncate max-w-[200px]">{o.address || "—"}</td>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${o.active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                    {o.active ? <><CheckCircle className="w-3 h-3" /> Ativa</> : <><XCircle className="w-3 h-3" /> Inativa</>}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDetails(o)}>
                        <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(o)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(o)}>
                        {o.active ? <><XCircle className="w-4 h-4 mr-2" /> Desativar</> : <><CheckCircle className="w-4 h-4 mr-2" /> Ativar</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDelete(o)} className="text-red-400">
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

      {filtered.length > 0 && (
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={filtered.length}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      )}

      {/* Modal: Criar Oficina */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              Nova Oficina
            </DialogTitle>
          </DialogHeader>
          <OficinaForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending} className="bg-orange-600 hover:bg-orange-700">
              {createMut.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Oficina */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-orange-500" />
              Editar Oficina
            </DialogTitle>
          </DialogHeader>
          <OficinaForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending} className="bg-orange-600 hover:bg-orange-700">
              {updateMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-500" />
              Detalhes da Oficina
            </DialogTitle>
          </DialogHeader>
          {selectedOficina && (
            <div className="space-y-4">
              <DetailRow icon={Building2} label="Nome" value={selectedOficina.name} />
              <DetailRow icon={Phone} label="Telefone" value={selectedOficina.phone} />
              <DetailRow icon={MapPin} label="CEP" value={selectedOficina.cep} />
              <DetailRow icon={MapPin} label="Endereço" value={selectedOficina.address} />
              <DetailRow icon={FileText} label="Observações" value={selectedOficina.notes} />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${selectedOficina.active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {selectedOficina.active ? "Ativa" : "Inativa"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Cadastrada em: {new Date(selectedOficina.createdAt).toLocaleDateString("pt-BR")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Excluir Oficina</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <strong>{selectedOficina?.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OficinaForm({ form, setForm }: { form: typeof EMPTY_FORM; setForm: (f: typeof EMPTY_FORM) => void }) {
  const [cepLoading, setCepLoading] = useState(false);

  function maskCep(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  }

  async function lookupCep() {
    const cep = form.cep.replace(/\D/g, "");
    if (cep.length !== 8) { toast.error("CEP inválido (8 dígitos)"); return; }
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const parts = [data.logradouro, data.bairro, data.localidade, data.uf].filter(Boolean);
        setForm({ ...form, address: parts.join(", ") });
        toast.success("Endereço preenchido!");
      } else {
        toast.error("CEP não encontrado");
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    }
    setCepLoading(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nome *</label>
        <Input
          placeholder="Nome da oficina"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Telefone</label>
        <Input
          placeholder="(47) 99999-9999"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
          maxLength={15}
        />
        {form.phone && form.phone.replace(/\D/g, "").length < 10 && (
          <p className="text-xs text-red-400 mt-1">Telefone deve ter pelo menos 10 dígitos</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium">CEP</label>
        <div className="flex gap-2">
          <Input
            placeholder="00000-000"
            value={form.cep}
            onChange={(e) => setForm({ ...form, cep: maskCep(e.target.value) })}
            onBlur={() => { if (form.cep.replace(/\D/g, "").length === 8) lookupCep(); }}
            maxLength={9}
            inputMode="numeric"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={lookupCep} disabled={cepLoading}>
            {cepLoading ? <span className="animate-spin">...</span> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Endereço</label>
        <Input
          placeholder="Rua, número, bairro, cidade"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Observações</label>
        <Textarea
          placeholder="Especialidades, horário de funcionamento, etc."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}
