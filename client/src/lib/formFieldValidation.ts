import { isValidBrazilianPhone, isValidEmail } from "@shared/validators";

export function normalizeEmailInput(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeUfInput(value: string): string {
  return value.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase();
}

export function validateOptionalPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  return isValidBrazilianPhone(trimmed) ? null : "Informe um telefone brasileiro válido.";
}

export function validateOptionalEmail(value: string): string | null {
  const normalized = normalizeEmailInput(value);
  if (!normalized) return null;

  return isValidEmail(normalized) ? null : "Informe um e-mail válido.";
}

export function validateOptionalDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "Informe uma data válida.";
  }

  const date = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Informe uma data válida.";
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const isSameDate =
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day;

  return isSameDate ? null : "Informe uma data válida.";
}

export function validateUf(value: string): string | null {
  const normalized = normalizeUfInput(value);
  if (!normalized) return null;

  return normalized.length === 2 ? null : "Use a sigla do estado com 2 letras.";
}

export function validateHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Informe uma cor no formato hexadecimal.";

  return /^#[0-9a-fA-F]{6}$/.test(trimmed)
    ? null
    : "Use o formato hexadecimal, por exemplo #00FF59.";
}
