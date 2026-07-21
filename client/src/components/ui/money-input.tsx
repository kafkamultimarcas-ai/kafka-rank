import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Formata dígitos puros em string pt-BR com 2 casas decimais.
 * Ex: "5000000" → "50.000,00"
 *     "150000" → "1.500,00"
 *     "500" → "5,00"
 */
function formatDigitsToPtBR(digits: string): string {
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  if (isNaN(cents) || cents === 0) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Extrai dígitos puros de uma string formatada pt-BR.
 * Ex: "50.000,00" → "5000000"
 *     "1.500,00" → "150000"
 */
function extractDigits(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export type MoneyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  /** Valor formatado pt-BR (ex: "50.000,00") ou string vazia */
  value: string;
  /** Recebe a string formatada pt-BR (ex: "50.000,00") */
  onChange: (formatted: string) => void;
  /** Mostrar prefixo R$ (default: true) */
  showPrefix?: boolean;
};

/**
 * Campo de moeda com máscara em tempo real.
 * - Aceita somente números
 * - Sempre mostra 2 casas decimais fixas
 * - Armazena e retorna string formatada pt-BR (ex: "50.000,00")
 * - Compatível com parseCurrencyToNumber existente
 */
export function MoneyInput({
  value,
  onChange,
  className,
  showPrefix = true,
  ...props
}: MoneyInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawDigits = e.target.value.replace(/\D/g, "");
    const formatted = formatDigitsToPtBR(rawDigits);
    onChange(formatted);
  }

  if (showPrefix) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
          R$
        </span>
        <Input
          {...props}
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          className={cn("pl-10", className)}
        />
      </div>
    );
  }

  return (
    <Input
      {...props}
      inputMode="numeric"
      value={value}
      onChange={handleChange}
      className={className}
    />
  );
}
