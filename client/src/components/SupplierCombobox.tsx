import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";

type SupplierComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SupplierCombobox({
  value,
  onChange,
  placeholder = "Selecione o fornecedor...",
  className,
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);

  // Fetch all suppliers for the combobox
  const { data, isLoading } = trpc.suppliers.list.useQuery({
    page: 1,
    pageSize: 200,
  });

  const suppliers = data?.items || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isLoading}
          className={cn("w-full justify-between font-normal", className)}
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
      <PopoverContent
        align="start"
        className="z-[200] w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command>
          <CommandInput placeholder="Buscar fornecedor..." />
          <CommandList>
            <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
            <CommandGroup>
              {/* Option to clear */}
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <Check className={cn("h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground italic">Nenhum (limpar)</span>
              </CommandItem>
              {suppliers.map((s: any) => (
                <CommandItem
                  key={s.id}
                  value={s.name}
                  onSelect={() => {
                    onChange(s.name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", value === s.name ? "opacity-100" : "opacity-0")} />
                  {s.name}
                  {s.cpfCnpj && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {s.personType === "juridica" ? "PJ" : "PF"}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
