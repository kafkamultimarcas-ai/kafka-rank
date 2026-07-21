import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Formata centavos (inteiro) para exibição pt-BR com 2 casas decimais.
 * Ex: 5000000 → "50.000,00"
 */
function formatCents(cents: number): string {
  if (!cents && cents !== 0) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  /** Valor em centavos (inteiro). Ex: 5000000 = R$ 50.000,00 */
  value: string;
  /** Recebe a string de dígitos crua (centavos) já sem separadores. */
  onChange: (raw: string) => void;
};

/**
 * Campo de moeda com máscara pt-BR: exibe "R$ 50.000,00" enquanto mantém no
 * estado apenas os dígitos em centavos ("5000000"). Aceita somente números.
 * Sempre mostra 2 casas decimais fixas.
 */
export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const cents = parseInt(value || "0", 10) || 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Remove tudo que não é dígito
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        {...props}
        inputMode="numeric"
        value={cents ? formatCents(cents) : ""}
        onChange={handleChange}
        className={cn("pl-9", className)}
      />
    </div>
  );
}
