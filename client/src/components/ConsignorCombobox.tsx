import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, User, Plus } from "lucide-react";
import { maskCpfCnpj, maskPhone } from "@/lib/masks";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { isValidBrazilianPhone, isValidCpfCnpj, isValidEmail } from "@shared/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ConsignorComboboxProps = {
  value: number | null;
  onChange: (id: number | null, name?: string) => void;
  placeholder?: string;
  className?: string;
  showQuickAdd?: boolean;
};

export function ConsignorCombobox({
  value,
  onChange,
  placeholder = "Selecione o consignador...",
  className,
  showQuickAdd = true,
}: ConsignorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCpf, setNewCpf] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const utils = trpc.useUtils();
  const { data: consignors, isLoading } = trpc.consignors.list.useQuery({ activeOnly: true });

  const createMutation = trpc.consignors.create.useMutation({
    onSuccess: (result) => {
      toast.success("Consignador cadastrado com sucesso!");
      utils.consignors.list.invalidate();
      onChange(result.id, newName.trim());
      setQuickAddOpen(false);
      resetQuickAddForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cadastrar consignador.");
    },
  });

  const selectedConsignor = consignors?.find((c) => c.id === value);

  function resetQuickAddForm() {
    setNewName("");
    setNewCpf("");
    setNewPhone("");
    setNewEmail("");
    setNewAddress("");
  }

  function handleQuickAdd() {
    if (!newName.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    if (newCpf && !isValidCpfCnpj(newCpf)) {
      toast.error("CPF inválido.");
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
      cpf: newCpf.replace(/\D/g, "") || undefined,
      phone: newPhone.replace(/\D/g, "") || undefined,
      email: newEmail.trim() || undefined,
      address: newAddress.trim() || undefined,
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
            className={cn("min-w-0 flex-1 justify-between font-normal bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:text-white", className)}
          >
            {selectedConsignor ? (
              <span className="flex items-center gap-2 truncate">
                <User className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                {selectedConsignor.name}
              </span>
            ) : (
              <span className="text-gray-500">{isLoading ? "Carregando..." : placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-[200] w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Buscar consignador..." />
            <CommandList>
              <CommandEmpty>Nenhum consignador encontrado.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  <span className="italic text-muted-foreground">Nenhum (limpar)</span>
                </CommandItem>
                {(consignors || []).map((consignor) => (
                  <CommandItem
                    key={consignor.id}
                    value={consignor.name}
                    onSelect={() => {
                      onChange(consignor.id, consignor.name);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("h-4 w-4", value === consignor.id ? "opacity-100" : "opacity-0")} />
                    {consignor.name}
                    {consignor.cpf && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {consignor.cpf}
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
            className="h-9 w-9 shrink-0 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            title="Cadastro rápido de consignador"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Cadastro Rápido de Consignador
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do consignador" />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={newCpf}
                    onChange={(e) => setNewCpf(maskCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefone</Label>
                    <Input value={newPhone} onChange={(e) => setNewPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Campos opcionais podem ser preenchidos depois.
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
