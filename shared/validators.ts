// Validadores de dado de contato/documento compartilhados entre backend (Zod
// refine no billingRouter) e frontend (validação on-blur nos formulários) —
// mesma regra nos dois lados pra nunca aceitar no client algo que o servidor
// rejeita (ou vice-versa).

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function isAllSameDigit(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

export function isValidCPF(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || isAllSameDigit(digits)) return false;

  const calcCheckDigit = (base: string, weights: number[]): number => {
    const sum = base.split("").reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const digit1 = calcCheckDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calcCheckDigit(digits.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digit1 === Number(digits[9]) && digit2 === Number(digits[10]);
}

export function isValidCNPJ(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || isAllSameDigit(digits)) return false;

  const calcCheckDigit = (base: string, weights: number[]): number => {
    const sum = base.split("").reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const digit1 = calcCheckDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calcCheckDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digit1 === Number(digits[12]) && digit2 === Number(digits[13]);
}

// Aceita tanto CPF (pessoa física) quanto CNPJ (pessoa jurídica) — usado no
// cadastro de cobrança, onde a loja pode assinar como MEI/PJ ou como PF.
export function isValidCpfCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

// Telefone BR: DDD (2 dígitos, 11-99) + número (8 dígitos fixo ou 9 dígitos
// celular começando com 9). Aceita com ou sem o "55" de código do país.
export function isValidBrazilianPhone(value: string): boolean {
  let digits = onlyDigits(value);
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith("55")) digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return false;

  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;

  if (digits.length === 11 && digits[2] !== "9") return false;

  return true;
}

// Checagem simples de formato — não substitui confirmação por e-mail, só
// evita erro de digitação óbvio antes de mandar pro backend.
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
