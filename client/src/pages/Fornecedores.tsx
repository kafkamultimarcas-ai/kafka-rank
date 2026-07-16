import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PaginationControls } from "@/components/PaginationControls";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Building2, User } from "lucide-react";
import { toast } from "sonner";

type Supplier = {
  id: number;
  personType: "fisica" | "juridica";
  name: string;
  cpfCnpj: string | null;
  rg: string | null;
  nationality: string | null;
  profession: string | null;
  birthDate: number | null;
  gender: "masculino" | "feminino" | "outro" | null;
  maritalStatus: "solteiro" | "casado" | "divorciado" | "viuvo" | "outro" | null;
  cep: string | null;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
};

const EMPTY_FORM = {
  personType: "fisica" as "fisica" | "juridica",
  name: "",
  cpfCnpj: "",
  rg: "",
  nationality: "",
  profession: "",
  birthDate: "",
  gender: "" as string,
  maritalStatus: "" as string,
  cep: "",
  state: "",
  city: "",
  neighborhood: "",
  street: "",
  number: "",
  complement: "",
  email: "",
  phone: "",
  mobile: "",
  notes: "",
};

export default function Fornecedores() {
  // Filters & pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Query
  const { data, isLoading, refetch } = trpc.suppliers.list.useQuery({
    search: debouncedSearch || undefined,
    personType: filterType !== "all" ? (filterType as "fisica" | "juridica") : undefined,
    page,
    pageSize,
  });

  // Mutations
  const createMut = trpc.suppliers.create.useMutation({
    onSuccess: () => { toast.success("Fornecedor cadastrado!"); setShowCreate(false); resetForm(); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.suppliers.update.useMutation({
    onSuccess: () => { toast.success("Fornecedor atualizado!"); setShowEdit(false); resetForm(); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.suppliers.delete.useMutation({
    onSuccess: () => { toast.success("Fornecedor excluído!"); setShowDeleteConfirm(false); setSelectedSupplier(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    resetForm();
    setShowCreate(true);
  }

  function openEdit(s: Supplier) {
    setSelectedSupplier(s);
    setForm({
      personType: s.personType,
      name: s.name,
      cpfCnpj: s.cpfCnpj || "",
      rg: s.rg || "",
      nationality: s.nationality || "",
      profession: s.profession || "",
      birthDate: s.birthDate ? new Date(s.birthDate).toISOString().split("T")[0] : "",
      gender: s.gender || "",
      maritalStatus: s.maritalStatus || "",
      cep: s.cep || "",
      state: s.state || "",
      city: s.city || "",
      neighborhood: s.neighborhood || "",
      street: s.street || "",
      number: s.number || "",
      complement: s.complement || "",
      email: s.email || "",
      phone: s.phone || "",
      mobile: s.mobile || "",
      notes: s.notes || "",
    });
    setShowEdit(true);
  }

  function openDetails(s: Supplier) {
    setSelectedSupplier(s);
    setShowDetails(true);
  }

  function openDelete(s: Supplier) {
    setSelectedSupplier(s);
    setShowDeleteConfirm(true);
  }

  function handleSubmitCreate() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    createMut.mutate({
      personType: form.personType,
      name: form.name.trim(),
      cpfCnpj: form.cpfCnpj || undefined,
      rg: form.rg || undefined,
      nationality: form.nationality || undefined,
      profession: form.profession || undefined,
      birthDate: form.birthDate ? new Date(form.birthDate).getTime() : undefined,
      gender: form.gender ? (form.gender as any) : undefined,
      maritalStatus: form.maritalStatus ? (form.maritalStatus as any) : undefined,
      cep: form.cep || undefined,
      state: form.state || undefined,
      city: form.city || undefined,
      neighborhood: form.neighborhood || undefined,
      street: form.street || undefined,
      number: form.number || undefined,
      complement: form.complement || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      mobile: form.mobile || undefined,
      notes: form.notes || undefined,
    });
  }

  function handleSubmitEdit() {
    if (!selectedSupplier) return;
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    updateMut.mutate({
      id: selectedSupplier.id,
      personType: form.personType,
      name: form.name.trim(),
      cpfCnpj: form.cpfCnpj || undefined,
      rg: form.rg || undefined,
      nationality: form.nationality || undefined,
      profession: form.profession || undefined,
      birthDate: form.birthDate ? new Date(form.birthDate).getTime() : undefined,
      gender: form.gender ? (form.gender as any) : undefined,
      maritalStatus: form.maritalStatus ? (form.maritalStatus as any) : undefined,
      cep: form.cep || undefined,
      state: form.state || undefined,
      city: form.city || undefined,
      neighborhood: form.neighborhood || undefined,
      street: form.street || undefined,
      number: form.number || undefined,
      complement: form.complement || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      mobile: form.mobile || undefined,
      notes: form.notes || undefined,
    });
  }

  function handleDelete() {
    if (!selectedSupplier) return;
    deleteMut.mutate({ id: selectedSupplier.id });
  }

  // CEP lookup
  async function lookupCep() {
    if (!form.cep || form.cep.length < 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${form.cep.replace(/\D/g, "")}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(f => ({ ...f, state: data.uf || "", city: data.localidade || "", neighborhood: data.bairro || "", street: data.logradouro || "", complement: data.complemento || f.complement }));
      }
    } catch { /* ignore */ }
  }

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground text-sm">{total} fornecedor(es) cadastrado(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF/CNPJ, email, telefone, cidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="fisica">Pessoa Física</SelectItem>
            <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-left p-3 font-medium">Tipo</th>
              <th className="text-left p-3 font-medium">CPF/CNPJ</th>
              <th className="text-left p-3 font-medium">Telefone</th>
              <th className="text-left p-3 font-medium">Cidade/UF</th>
              <th className="text-left p-3 font-medium">E-mail</th>
              <th className="text-center p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">Nenhum fornecedor encontrado</td></tr>
            ) : items.map((s: any) => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.personType === "juridica" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>
                    {s.personType === "juridica" ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {s.personType === "juridica" ? "Jurídica" : "Física"}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{s.cpfCnpj || "—"}</td>
                <td className="p-3 text-muted-foreground">{s.mobile || s.phone || "—"}</td>
                <td className="p-3 text-muted-foreground">{s.city && s.state ? `${s.city}/${s.state}` : s.city || "—"}</td>
                <td className="p-3 text-muted-foreground">{s.email || "—"}</td>
                <td className="p-3 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDetails(s)}><Eye className="w-4 h-4 mr-2" /> Detalhes</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(s)}><Pencil className="w-4 h-4 mr-2" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDelete(s)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControls page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} showPageSize={false} />
      )}

      {/* CREATE MODAL */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cadastrar Fornecedor</DialogTitle></DialogHeader>
          <SupplierForm form={form} setForm={setForm} onCepLookup={lookupCep} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleSubmitCreate} disabled={createMut.isPending}>
              {createMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Fornecedor</DialogTitle></DialogHeader>
          <SupplierForm form={form} setForm={setForm} onCepLookup={lookupCep} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button onClick={handleSubmitEdit} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAILS MODAL */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes do Fornecedor</DialogTitle></DialogHeader>
          {selectedSupplier && <SupplierDetails supplier={selectedSupplier} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Tem certeza que deseja excluir o fornecedor <strong>{selectedSupplier?.name}</strong>? Esta ação não pode ser desfeita.</p>
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

// ===== FORM COMPONENT =====
function SupplierForm({ form, setForm, onCepLookup }: { form: typeof EMPTY_FORM; setForm: (fn: any) => void; onCepLookup: () => void }) {
  const upd = (field: string, value: string) => setForm((f: any) => ({ ...f, [field]: value }));

  return (
    <div className="space-y-6">
      {/* Tipo */}
      <div>
        <Label className="font-semibold">Tipo</Label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={form.personType === "fisica"} onChange={() => upd("personType", "fisica")} className="accent-primary" />
            <span>Pessoa Física</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={form.personType === "juridica"} onChange={() => upd("personType", "juridica")} className="accent-primary" />
            <span>Pessoa Jurídica</span>
          </label>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label>{form.personType === "juridica" ? "CNPJ" : "CPF"}</Label>
          <Input value={form.cpfCnpj} onChange={e => upd("cpfCnpj", e.target.value)} placeholder={form.personType === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"} />
        </div>
        <div className="lg:col-span-2">
          <Label>{form.personType === "juridica" ? "Razão Social *" : "Nome Completo *"}</Label>
          <Input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Nome completo" />
        </div>
        <div>
          <Label>{form.personType === "juridica" ? "IE" : "RG"}</Label>
          <Input value={form.rg} onChange={e => upd("rg", e.target.value)} />
        </div>
      </div>

      {form.personType === "fisica" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Nacionalidade</Label>
            <Input value={form.nationality} onChange={e => upd("nationality", e.target.value)} placeholder="Brasileira" />
          </div>
          <div>
            <Label>Profissão</Label>
            <Input value={form.profession} onChange={e => upd("profession", e.target.value)} />
          </div>
          <div>
            <Label>Data de Nascimento</Label>
            <Input type="date" value={form.birthDate} onChange={e => upd("birthDate", e.target.value)} />
          </div>
          <div>
            <Label>Sexo</Label>
            <Select value={form.gender} onValueChange={v => upd("gender", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {form.personType === "fisica" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Estado Civil</Label>
            <Select value={form.maritalStatus} onValueChange={v => upd("maritalStatus", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                <SelectItem value="casado">Casado(a)</SelectItem>
                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Endereço */}
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>CEP</Label>
              <Input value={form.cep} onChange={e => upd("cep", e.target.value)} placeholder="00000-000" onBlur={onCepLookup} />
            </div>
            <Button type="button" variant="outline" size="icon" className="mt-6" onClick={onCepLookup}><Search className="w-4 h-4" /></Button>
          </div>
          <div>
            <Label>UF</Label>
            <Input value={form.state} onChange={e => upd("state", e.target.value)} maxLength={2} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={form.city} onChange={e => upd("city", e.target.value)} />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={form.neighborhood} onChange={e => upd("neighborhood", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="md:col-span-1">
            <Label>Endereço</Label>
            <Input value={form.street} onChange={e => upd("street", e.target.value)} />
          </div>
          <div>
            <Label>Número</Label>
            <Input value={form.number} onChange={e => upd("number", e.target.value)} />
          </div>
          <div>
            <Label>Complemento</Label>
            <Input value={form.complement} onChange={e => upd("complement", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Contato */}
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Contato</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={e => upd("email", e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder="(00) 0000-0000" />
          </div>
          <div>
            <Label>Celular</Label>
            <Input value={form.mobile} onChange={e => upd("mobile", e.target.value)} placeholder="(00) 00000-0000" />
          </div>
        </div>
      </div>

      {/* Observações */}
      <div>
        <Label>Observações</Label>
        <textarea className="w-full mt-1 rounded-md border border-border bg-background p-3 text-sm min-h-[80px] resize-y" value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="Observações gerais..." />
      </div>
    </div>
  );
}

// ===== DETAILS COMPONENT =====
function SupplierDetails({ supplier }: { supplier: Supplier }) {
  const genderLabel: Record<string, string> = { masculino: "Masculino", feminino: "Feminino", outro: "Outro" };
  const maritalLabel: Record<string, string> = { solteiro: "Solteiro(a)", casado: "Casado(a)", divorciado: "Divorciado(a)", viuvo: "Viúvo(a)", outro: "Outro" };

  const fields = [
    { label: "Tipo", value: supplier.personType === "juridica" ? "Pessoa Jurídica" : "Pessoa Física" },
    { label: supplier.personType === "juridica" ? "CNPJ" : "CPF", value: supplier.cpfCnpj },
    { label: supplier.personType === "juridica" ? "Razão Social" : "Nome Completo", value: supplier.name },
    { label: supplier.personType === "juridica" ? "IE" : "RG", value: supplier.rg },
    ...(supplier.personType === "fisica" ? [
      { label: "Nacionalidade", value: supplier.nationality },
      { label: "Profissão", value: supplier.profession },
      { label: "Data de Nascimento", value: supplier.birthDate ? new Date(supplier.birthDate).toLocaleDateString("pt-BR") : null },
      { label: "Sexo", value: supplier.gender ? genderLabel[supplier.gender] : null },
      { label: "Estado Civil", value: supplier.maritalStatus ? maritalLabel[supplier.maritalStatus] : null },
    ] : []),
    { label: "CEP", value: supplier.cep },
    { label: "UF", value: supplier.state },
    { label: "Cidade", value: supplier.city },
    { label: "Bairro", value: supplier.neighborhood },
    { label: "Endereço", value: supplier.street },
    { label: "Número", value: supplier.number },
    { label: "Complemento", value: supplier.complement },
    { label: "E-mail", value: supplier.email },
    { label: "Telefone", value: supplier.phone },
    { label: "Celular", value: supplier.mobile },
    { label: "Observações", value: supplier.notes },
    { label: "Cadastrado em", value: new Date(supplier.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map((f, i) => (
        <div key={i} className={f.label === "Observações" ? "md:col-span-2" : ""}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{f.label}</p>
          <p className="font-medium mt-0.5">{f.value || "—"}</p>
        </div>
      ))}
    </div>
  );
}
