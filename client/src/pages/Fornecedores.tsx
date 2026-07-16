import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaginationControls } from "@/components/PaginationControls";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Building2, User, Receipt, FileText, CheckCircle, Clock, AlertTriangle, Download, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isValidCPF, isValidCNPJ } from "@shared/validators";

// ===== CPF/CNPJ MASK & VALIDATION HELPERS =====
function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function maskCpfCnpj(value: string, type: "fisica" | "juridica"): string {
  return type === "juridica" ? maskCNPJ(value) : maskCPF(value);
}

function validateCpfCnpj(value: string, type: "fisica" | "juridica"): { valid: boolean; message: string } {
  const digits = value.replace(/\D/g, "");
  if (!digits) return { valid: true, message: "" }; // empty is ok (not required)
  if (type === "fisica") {
    if (digits.length < 11) return { valid: false, message: "CPF incompleto" };
    if (!isValidCPF(digits)) return { valid: false, message: "CPF inválido" };
    return { valid: true, message: "CPF válido" };
  } else {
    if (digits.length < 14) return { valid: false, message: "CNPJ incompleto" };
    if (!isValidCNPJ(digits)) return { valid: false, message: "CNPJ inválido" };
    return { valid: true, message: "CNPJ válido" };
  }
}

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

export function FornecedoresContent() {
  return <FornecedoresInner />;
}

export default function Fornecedores() {
  return (
    <DashboardLayout>
      <FornecedoresInner />
    </DashboardLayout>
  );
}

function FornecedoresInner() {
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
      cpfCnpj: s.cpfCnpj ? maskCpfCnpj(s.cpfCnpj, s.personType) : "",
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
    // Validate CPF/CNPJ if provided
    if (form.cpfCnpj) {
      const validation = validateCpfCnpj(form.cpfCnpj, form.personType);
      if (!validation.valid) { toast.error(validation.message); return; }
    }
    createMut.mutate({
      personType: form.personType,
      name: form.name.trim(),
      cpfCnpj: form.cpfCnpj ? form.cpfCnpj.replace(/\D/g, "") : undefined,
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
    // Validate CPF/CNPJ if provided
    if (form.cpfCnpj) {
      const validation = validateCpfCnpj(form.cpfCnpj, form.personType);
      if (!validation.valid) { toast.error(validation.message); return; }
    }
    updateMut.mutate({
      id: selectedSupplier.id,
      personType: form.personType,
      name: form.name.trim(),
      cpfCnpj: form.cpfCnpj ? form.cpfCnpj.replace(/\D/g, "") : undefined,
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
                <td className="p-3 text-muted-foreground">{s.cpfCnpj ? maskCpfCnpj(s.cpfCnpj, s.personType) : "—"}</td>
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

      {/* DETAILS MODAL with Tabs */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes do Fornecedor</DialogTitle></DialogHeader>
          {selectedSupplier && (
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados" className="gap-2"><User className="w-4 h-4" /> Dados Cadastrais</TabsTrigger>
                <TabsTrigger value="historico" className="gap-2"><Receipt className="w-4 h-4" /> Histórico Financeiro</TabsTrigger>
              </TabsList>
              <TabsContent value="dados" className="mt-4">
                <SupplierDetails supplier={selectedSupplier} />
              </TabsContent>
              <TabsContent value="historico" className="mt-4">
                <SupplierHistory supplier={selectedSupplier} />
              </TabsContent>
            </Tabs>
          )}
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
  const [cnpjLoading, setCnpjLoading] = useState(false);
  
  // CPF/CNPJ validation state
  const cpfCnpjValidation = useMemo(() => {
    return validateCpfCnpj(form.cpfCnpj, form.personType);
  }, [form.cpfCnpj, form.personType]);

  const hasDigits = form.cpfCnpj.replace(/\D/g, "").length > 0;

  // Auto-fill company data when a valid CNPJ is entered
  async function lookupCnpj(cnpjDigits: string) {
    if (cnpjDigits.length !== 14 || !isValidCNPJ(cnpjDigits)) return;
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`);
      if (res.ok) {
        const d = await res.json();
        setForm((f: any) => ({
          ...f,
          name: d.razao_social || f.name,
          cep: d.cep ? d.cep.replace(/\D/g, "") : f.cep,
          state: d.uf || f.state,
          city: d.municipio || f.city,
          neighborhood: d.bairro || f.neighborhood,
          street: d.logradouro || f.street,
          number: d.numero || f.number,
          complement: d.complemento || f.complement,
        }));
        toast.success("Dados da empresa preenchidos automaticamente!");
      }
    } catch { /* silent */ }
    setCnpjLoading(false);
  }

  function handleCpfCnpjChange(rawValue: string) {
    const masked = maskCpfCnpj(rawValue, form.personType);
    upd("cpfCnpj", masked);
    // Auto-lookup when CNPJ is complete and valid
    if (form.personType === "juridica") {
      const digits = rawValue.replace(/\D/g, "");
      if (digits.length === 14 && isValidCNPJ(digits)) {
        lookupCnpj(digits);
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Tipo */}
      <div>
        <Label className="font-semibold">Tipo</Label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={form.personType === "fisica"} onChange={() => { upd("personType", "fisica"); upd("cpfCnpj", ""); }} className="accent-primary" />
            <span>Pessoa Física</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={form.personType === "juridica"} onChange={() => { upd("personType", "juridica"); upd("cpfCnpj", ""); }} className="accent-primary" />
            <span>Pessoa Jurídica</span>
          </label>
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label>{form.personType === "juridica" ? "CNPJ" : "CPF"}</Label>
          <div className="relative">
            <Input
              value={form.cpfCnpj}
              onChange={e => handleCpfCnpjChange(e.target.value)}
              placeholder={form.personType === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
              maxLength={form.personType === "juridica" ? 18 : 14}
              className={hasDigits ? (cpfCnpjValidation.valid ? "border-green-500/50 focus-visible:ring-green-500/30" : "border-red-500/50 focus-visible:ring-red-500/30") : ""}
            />
            {cnpjLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          {hasDigits && (
            <p className={`text-xs mt-1 ${cpfCnpjValidation.valid ? "text-green-500" : "text-red-500"}`}>
              {cpfCnpjValidation.message}
            </p>
          )}
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
    { label: supplier.personType === "juridica" ? "CNPJ" : "CPF", value: supplier.cpfCnpj ? maskCpfCnpj(supplier.cpfCnpj, supplier.personType) : null },
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

// ===== HISTORY COMPONENT =====
function SupplierHistory({ supplier }: { supplier: Supplier }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Query financial transactions linked to this supplier by name match
  const { data, isLoading } = trpc.finTransactions.list.useQuery({
    search: supplier.name,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    startDate: startDate ? new Date(startDate).getTime() : undefined,
    endDate: endDate ? new Date(endDate + "T23:59:59").getTime() : undefined,
    page: 1,
    pageSize: 100,
  });

  const transactions = data?.items || [];

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
  };

  const formatDate = (d: any) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const formatDateFull = (d: any) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    payable: { label: "A Pagar", color: "text-red-400" },
    receivable: { label: "A Receber", color: "text-green-400" },
    paid: { label: "Pago", color: "text-blue-400" },
  };

  const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
    pending: { label: "Pendente", icon: Clock, color: "text-yellow-400" },
    paid: { label: "Pago", icon: CheckCircle, color: "text-green-400" },
    overdue: { label: "Vencido", icon: AlertTriangle, color: "text-red-400" },
    cancelled: { label: "Cancelado", icon: AlertTriangle, color: "text-gray-400" },
  };

  // Filter only transactions where supplier field matches this supplier's name
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t: any) => 
      t.supplier && t.supplier.toLowerCase().includes(supplier.name.toLowerCase())
    );
  }, [transactions, supplier.name]);

  // Calculate totals from filtered transactions
  const totals = useMemo(() => {
    let totalPayable = 0;
    let totalReceivable = 0;
    let totalPaid = 0;
    filteredTransactions.forEach((t: any) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === "payable") totalPayable += amt;
      else if (t.type === "receivable") totalReceivable += amt;
      else if (t.type === "paid") totalPaid += amt;
    });
    return { totalPayable, totalReceivable, totalPaid };
  }, [filteredTransactions]);

  // Export CSV
  function handleExportCSV() {
    if (filteredTransactions.length === 0) { toast.error("Nenhum lançamento para exportar."); return; }
    const headers = "Descrição,Tipo,Valor,Vencimento,Status,Comprovante\n";
    const rows = filteredTransactions.map((t: any) => {
      const typeInfo = typeLabels[t.type] || { label: t.type };
      const statusInfo = statusConfig[t.status] || { label: t.status };
      return `"${t.description || ""}","${typeInfo.label}",${t.amount},"${formatDateFull(t.dueDate)}","${statusInfo.label}","${t.receiptUrl || ""}"`;
    }).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico-fornecedor-${supplier.name.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  }

  // Export PDF (print-based)
  function handleExportPDF() {
    if (filteredTransactions.length === 0) { toast.error("Nenhum lançamento para exportar."); return; }
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Bloqueador de pop-ups impediu a exportação."); return; }
    const tableRows = filteredTransactions.map((t: any) => {
      const typeInfo = typeLabels[t.type] || { label: t.type };
      const statusInfo = statusConfig[t.status] || { label: t.status };
      return `<tr><td>${t.description || ""}</td><td>${typeInfo.label}</td><td style="text-align:right">${formatCurrency(t.amount)}</td><td>${formatDateFull(t.dueDate)}</td><td>${statusInfo.label}</td></tr>`;
    }).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Histórico - ${supplier.name}</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}h1{font-size:16px;margin-bottom:4px}h2{font-size:13px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5;font-weight:bold}.summary{display:flex;gap:20px;margin-bottom:12px}.summary div{padding:8px 12px;border-radius:4px;font-size:11px}.s-red{background:#fef2f2;color:#dc2626}.s-green{background:#f0fdf4;color:#16a34a}.s-blue{background:#eff6ff;color:#2563eb}</style></head><body><h1>Histórico Financeiro</h1><h2>Fornecedor: ${supplier.name}</h2><div class="summary"><div class="s-red">A Pagar: ${formatCurrency(totals.totalPayable)}</div><div class="s-green">A Receber: ${formatCurrency(totals.totalReceivable)}</div><div class="s-blue">Pago: ${formatCurrency(totals.totalPaid)}</div></div><table><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table><p style="margin-top:16px;font-size:10px;color:#999">Gerado em ${new Date().toLocaleDateString("pt-BR")} | Total: ${filteredTransactions.length} lançamento(s)</p></body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
    toast.success("PDF gerado! Use Ctrl+P para salvar.");
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando histórico...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[120px]">
          <label className="text-[10px] text-muted-foreground uppercase font-medium">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[130px]">
          <label className="text-[10px] text-muted-foreground uppercase font-medium">De</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="min-w-[130px]">
          <label className="text-[10px] text-muted-foreground uppercase font-medium">Até</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExportCSV}>
            <Download className="w-3 h-3" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExportPDF}>
            <FileText className="w-3 h-3" /> PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-xs text-muted-foreground">A Pagar</p>
          <p className="text-sm font-bold text-red-400">{formatCurrency(totals.totalPayable)}</p>
        </div>
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
          <p className="text-xs text-muted-foreground">A Receber</p>
          <p className="text-sm font-bold text-green-400">{formatCurrency(totals.totalReceivable)}</p>
        </div>
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-center">
          <p className="text-xs text-muted-foreground">Pago</p>
          <p className="text-sm font-bold text-blue-400">{formatCurrency(totals.totalPaid)}</p>
        </div>
      </div>

      {/* Transaction list */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Nenhum lançamento encontrado com os filtros aplicados.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Tente ajustar o período ou status para ver mais resultados.</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2.5 font-medium text-xs">Descrição</th>
                  <th className="text-left p-2.5 font-medium text-xs">Tipo</th>
                  <th className="text-left p-2.5 font-medium text-xs">Valor</th>
                  <th className="text-left p-2.5 font-medium text-xs">Vencimento</th>
                  <th className="text-left p-2.5 font-medium text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t: any) => {
                  const typeInfo = typeLabels[t.type] || { label: t.type, color: "text-gray-400" };
                  const statusInfo = statusConfig[t.status] || { label: t.status, icon: Clock, color: "text-gray-400" };
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-2.5">
                        <p className="font-medium text-xs">{t.description}</p>
                        {t.receiptUrl && (
                          <a href={t.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                            <FileText className="w-3 h-3" /> Ver comprovante
                          </a>
                        )}
                      </td>
                      <td className={`p-2.5 text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</td>
                      <td className="p-2.5 text-xs font-bold">{formatCurrency(t.amount)}</td>
                      <td className="p-2.5 text-xs text-muted-foreground">{formatDate(t.dueDate)}</td>
                      <td className="p-2.5">
                        <span className={`inline-flex items-center gap-1 text-xs ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center">
            Exibindo {filteredTransactions.length} lançamento(s) vinculado(s) ao fornecedor "{supplier.name}"
          </p>
        </>
      )}
    </div>
  );
}
