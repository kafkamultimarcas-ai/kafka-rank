import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Building2, Plus } from "lucide-react";
import { maskCpfCnpj, maskPhone } from "@/lib/masks";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { isValidBrazilianPhone, isValidCpfCnpj, isValidEmail } from "@shared/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Supplier } from "@/features/financeiro/types";

type SupplierComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showQuickAdd?: boolean;
};

export function SupplierCombobox({
  value,
  onChange,
  placeholder = "Selecione o fornecedor...",
  className,
  showQuickAdd = true,
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPersonType, setNewPersonType] = useState<"fisica" | "juridica">("juridica");
  const [newCpfCnpj, setNewCpfCnpj] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.suppliers.list.useQuery({ page: 1, pageSize: 100 });

  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor cadastrado com sucesso!");
      utils.suppliers.list.invalidate();
      onChange(newName.trim());
      setQuickAddOpen(false);
      resetQuickAddForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cadastrar fornecedor.");
    },
  });

  const suppliers: Supplier[] = data?.items || [];

  function resetQuickAddForm() {
    setNewName("");
    setNewPersonType("juridica");
    setNewCpfCnpj("");
    setNewPhone("");
    setNewEmail("");
  }

  function handleQuickAdd() {
    if (!newName.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    if (newCpfCnpj && !isValidCpfCnpj(newCpfCnpj)) {
      toast.error(newPersonType === "juridica" ? "CNPJ inválido." : "CPF inválido.");
      return;
    }
    if (newPhone && !isValidBrazilianPhone(newPhone)) {
      toast.error("Telefone inválido.");
      return;
    }
    if (newEmail && !isValidEmail(newEmail)) {
      toast.error("E-mail inválido.");
      return;
    }

    createMutation.mutate({
      name: newName.trim(),
      personType: newPersonType,
      cpfCnpj: newCpfCnpj.replace(/\D/g, "") || undefined,
      phone: newPhone.replace(/\D/g, "") || undefined,
      email: newEmail.trim() || undefined,
    });
  }

  return (
    <div className="flex w-full items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isLoading}
            className={cn("min-w-0 flex-1 justify-between font-normal", className)}
          >
            {value ? (
              <span className="flex items-center gap-2 truncate">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {value}
              </span>
            ) : (
              <span className="text-muted-foreground">{isLoading ? "Carregando..." : placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-[200] w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Buscar fornecedor..." />
            <CommandList>
              <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  <span className="italic text-muted-foreground">Nenhum (limpar)</span>
                </CommandItem>
                {suppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={supplier.name}
                    onSelect={() => {
                      onChange(supplier.name);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("h-4 w-4", value === supplier.name ? "opacity-100" : "opacity-0")} />
                    {supplier.name}
                    {supplier.cpfCnpj && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {supplier.personType === "juridica" ? "PJ" : "PF"}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showQuickAdd && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Cadastro rápido de fornecedor"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Cadastro Rápido de Fornecedor
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Tipo de Pessoa *</Label>
                  <Select value={newPersonType} onValueChange={(value) => setNewPersonType(value as "fisica" | "juridica")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                      <SelectItem value="fisica">Pessoa Física</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nome / Razão Social *</Label>
                  <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nome do fornecedor" />
                </div>
                <div>
                  <Label>{newPersonType === "juridica" ? "CNPJ" : "CPF"}</Label>
                  <Input
                    value={newCpfCnpj}
                    onChange={(event) => setNewCpfCnpj(maskCpfCnpj(event.target.value))}
                    placeholder={newPersonType === "juridica" ? "00.000.000/0000-00" : "000.000.000-00"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefone</Label>
                    <Input value={newPhone} onChange={(event) => setNewPhone(maskPhone(event.target.value))} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="email@empresa.com" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Para cadastro completo (endereço, documentos, etc.), acesse a tela de Fornecedores.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setQuickAddOpen(false)}>Cancelar</Button>
                <Button onClick={handleQuickAdd} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Cadastrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
