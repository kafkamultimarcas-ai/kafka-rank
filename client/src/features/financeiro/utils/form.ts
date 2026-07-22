export function normalizeAlphaNumeric(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "");
}

export function maskPlate(value: string) {
  return normalizeAlphaNumeric(value).toUpperCase().slice(0, 7);
}

export function maskCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const amount = Number(digits) / 100;
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function currencyInputToNumberString(value: string) {
  if (!value.trim()) return "";
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return "";
  return amount.toFixed(2);
}

export function maskDecimalInput(value: string, precision = 2) {
  const sanitized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const [integerPart = "", decimalPart = ""] = sanitized.split(".");
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");

  if (!sanitized.includes(".")) {
    return normalizedInteger;
  }

  return `${normalizedInteger}.${decimalPart.slice(0, precision)}`;
}

export function isPositiveNumberString(value: string) {
  // Remove pontos de milhar, substitui vírgula decimal por ponto
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0;
}
