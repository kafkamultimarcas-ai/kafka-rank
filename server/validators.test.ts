import { describe, it, expect } from "vitest";
import { isValidCPF, isValidCNPJ, isValidCpfCnpj, isValidBrazilianPhone, isValidEmail } from "../shared/validators";

describe("isValidCPF", () => {
  it("aceita um CPF válido (com ou sem máscara)", () => {
    expect(isValidCPF("111.444.777-35")).toBe(true);
    expect(isValidCPF("11144477735")).toBe(true);
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(isValidCPF("111.444.777-36")).toBe(false);
  });

  it("rejeita CPF com todos os dígitos iguais", () => {
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });

  it("rejeita string com tamanho errado", () => {
    expect(isValidCPF("123456")).toBe(false);
  });
});

describe("isValidCNPJ", () => {
  it("aceita um CNPJ válido (com ou sem máscara)", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11222333000181")).toBe(true);
  });

  it("rejeita CNPJ com dígito verificador errado", () => {
    expect(isValidCNPJ("11.222.333/0001-00")).toBe(false);
  });

  it("rejeita CNPJ com todos os dígitos iguais", () => {
    expect(isValidCNPJ("11.111.111/1111-11")).toBe(false);
  });
});

describe("isValidCpfCnpj", () => {
  it("aceita CPF (11 dígitos) e CNPJ (14 dígitos) válidos", () => {
    expect(isValidCpfCnpj("111.444.777-35")).toBe(true);
    expect(isValidCpfCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita tamanho que não é nem CPF nem CNPJ", () => {
    expect(isValidCpfCnpj("12345")).toBe(false);
  });
});

describe("isValidBrazilianPhone", () => {
  it("aceita celular com DDD (11 dígitos, começando com 9)", () => {
    expect(isValidBrazilianPhone("(47) 99999-9999")).toBe(true);
  });

  it("aceita fixo com DDD (10 dígitos)", () => {
    expect(isValidBrazilianPhone("(47) 3333-4444")).toBe(true);
  });

  it("aceita com código do país 55", () => {
    expect(isValidBrazilianPhone("+55 47 99999-9999")).toBe(true);
  });

  it("rejeita celular sem o 9 na frente", () => {
    expect(isValidBrazilianPhone("(47) 89999-9999")).toBe(false);
  });

  it("rejeita DDD inválido", () => {
    expect(isValidBrazilianPhone("(00) 99999-9999")).toBe(false);
  });

  it("rejeita número muito curto", () => {
    expect(isValidBrazilianPhone("123")).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("aceita e-mail bem formado", () => {
    expect(isValidEmail("contato@loja.com.br")).toBe(true);
  });

  it("rejeita e-mail sem @", () => {
    expect(isValidEmail("contatoloja.com")).toBe(false);
  });

  it("rejeita e-mail sem domínio", () => {
    expect(isValidEmail("contato@")).toBe(false);
  });
});
