import { describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret } from "./_core/secretCrypto";

describe("secretCrypto", () => {
  it("faz roundtrip encrypt -> decrypt corretamente", () => {
    const original = "meu-token-secreto-z-api-12345";
    const encrypted = encryptSecret(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptSecret(encrypted)).toBe(original);
  });

  it("gera ciphertext diferente a cada chamada (IV aleatório)", () => {
    const a = encryptSecret("mesmo-valor");
    const b = encryptSecret("mesmo-valor");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("mesmo-valor");
    expect(decryptSecret(b)).toBe("mesmo-valor");
  });

  it("retorna valores legados em texto plano sem alterar (compatibilidade)", () => {
    const legacyPlainValue = "F1234567890ABCDEF"; // formato de token real, sem prefixo v1:
    expect(decryptSecret(legacyPlainValue)).toBe(legacyPlainValue);
  });

  it("retorna string vazia para valores nulos/vazios", () => {
    expect(decryptSecret(null)).toBe("");
    expect(decryptSecret(undefined)).toBe("");
    expect(decryptSecret("")).toBe("");
    expect(encryptSecret("")).toBe("");
  });

  it("retorna vazio (não lança) se o ciphertext foi adulterado", () => {
    const encrypted = encryptSecret("valor-original");
    const tampered = encrypted.slice(0, -4) + "0000";
    expect(decryptSecret(tampered)).toBe("");
  });
});
