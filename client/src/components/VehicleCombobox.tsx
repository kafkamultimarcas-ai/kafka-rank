import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Car } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
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

type VehicleComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

/** Rótulo legível do veículo: "Marca Modelo Ano - Placa". */
export function vehicleLabel(v: any): string {
  const parts = [v.brand, v.model].filter(Boolean).join(" ");
  const year = v.year ? ` ${v.year}` : "";
  const plate = v.plate ? ` - ${String(v.plate).toUpperCase()}` : "";
  return `${parts}${year}${plate}`.trim();
}

export function VehicleCombobox({
  value,
  onChange,
  placeholder = "Selecione o veículo...",
  className,
}: VehicleComboboxProps) {
  const [open, setOpen] = useState(false);

  // Busca no estoque de veículos (publicados). O filtro fino fica a cargo do Command.
  const { data, isLoading } = trpc.inventory.list.useQuery(
    { status: "all" },
    { retry: false, refetchOnWindowFocus: false }
  );

  const vehicles = useMemo(
    () => (Array.isArray(data) ? data.map((v: any) => ({ id: v.id, label: vehicleLabel(v) })).filter((v) => v.label) : []),
    [data]
  );

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
                <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
            <CommandInput placeholder="Buscar veículo (marca, modelo, placa)..." />
            <CommandList>
              <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
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
                {vehicles.map((vehicle) => (
                  <CommandItem
                    key={vehicle.id}
                    value={vehicle.label}
                    onSelect={() => {
                      onChange(vehicle.label);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("h-4 w-4", value === vehicle.label ? "opacity-100" : "opacity-0")} />
                    {vehicle.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
