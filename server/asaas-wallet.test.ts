import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

describe("ASAAS_WALLET_ID", () => {
  it("deve estar configurado e ser um UUID válido", () => {
    expect(ENV.asaasWalletId).toBeTruthy();
    // Formato UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(ENV.asaasWalletId).toMatch(uuidRegex);
  });
});
