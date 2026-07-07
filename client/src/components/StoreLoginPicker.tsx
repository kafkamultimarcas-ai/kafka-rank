import { useState } from "react";
import { useLocation } from "wouter";
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
import { trpc } from "@/lib/trpc";
import { getTenantLoginPath } from "@/lib/tenant";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, ChevronsUpDown, Store } from "lucide-react";

type StoreLoginPickerProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function StoreLoginPicker({
  title = "Entrar na sua loja",
  description = "Selecione sua loja para ir direto para a tela de login dela.",
  className,
}: StoreLoginPickerProps) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const { data: tenants, isLoading } = trpc.superAdmin.listActiveTenants.useQuery();

  const selected = tenants?.find((t) => t.slug === slug);

  const go = () => {
    if (!slug) return;
    navigate(getTenantLoginPath(slug));
  };

  return (
    <div className={className}>
      {title && <h3 className="font-heading text-lg font-bold text-foreground mb-1">{title}</h3>}
      {description && <p className="mb-3 text-sm text-muted-foreground">{description}</p>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isLoading}
            className="w-full justify-between font-normal"
          >
            {selected ? selected.name : isLoading ? "Carregando lojas..." : "Selecione sua loja"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-[200] w-[var(--radix-popover-trigger-width)] p-0"
        >
          <Command>
            <CommandInput placeholder="Buscar loja..." />
            <CommandList>
              <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
              <CommandGroup>
                {tenants?.map((t) => (
                  <CommandItem
                    key={t.slug}
                    value={t.name}
                    onSelect={() => {
                      setSlug(t.slug);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("h-4 w-4", slug === t.slug ? "opacity-100" : "opacity-0")} />
                    {t.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Button onClick={go} disabled={!slug} className="mt-3 w-full">
        <Store className="mr-1 h-4 w-4" /> Continuar <ArrowRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
