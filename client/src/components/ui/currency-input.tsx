import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatDigits(digits: string) {
  if (!digits) return "";
  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) return "";
  return numeric.toLocaleString("pt-BR");
}

export type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  /** String de dígitos crua, ex: "89990" (sem separadores). */
  value: string;
  /** Recebe a string de dígitos crua já sem separadores. */
  onChange: (raw: string) => void;
};

/**
 * Campo de moeda com máscara pt-BR: exibe "R$ 89.990" enquanto mantém no
 * estado apenas os dígitos ("89990"). Mantém o contrato de string do form.
 */
export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        {...props}
        inputMode="numeric"
        value={formatDigits(value)}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        className={cn("pl-9", className)}
      />
    </div>
  );
}
