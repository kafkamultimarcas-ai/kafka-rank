import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Z-API credentials are now per-tenant (multi-tenant).
 * Global ENV vars (ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN) are NOT used anymore.
 * Each loja configures suas próprias credenciais na tela de Integrações.
 */
describe("Z-API - credenciais per-tenant (sem ENV global)", () => {
  it("zapi-service não importa mais ENV para credenciais", () => {
    const zapiServicePath = path.resolve(__dirname, "./zapi-service.ts");
    const zapiServiceCode = fs.readFileSync(zapiServicePath, "utf-8");
    // Não deve ter import de ENV no topo
    expect(zapiServiceCode).not.toContain('import { ENV } from');
    // Não deve referenciar ENV.zapiInstanceId, ENV.zapiToken, etc
    expect(zapiServiceCode).not.toContain('ENV.zapiInstanceId');
    expect(zapiServiceCode).not.toContain('ENV.zapiToken');
    expect(zapiServiceCode).not.toContain('ENV.zapiClientToken');
  });

  it("getTenantCredentials busca credenciais do banco de dados", () => {
    const zapiServicePath = path.resolve(__dirname, "./zapi-service.ts");
    const zapiServiceCode = fs.readFileSync(zapiServicePath, "utf-8");
    // Deve ter lógica de busca no banco
    expect(zapiServiceCode).toContain('getDb');
    expect(zapiServiceCode).toContain('tenants.zapiInstanceId');
    expect(zapiServiceCode).toContain('tenants.zapiToken');
    expect(zapiServiceCode).toContain('tenants.zapiClientToken');
  });
});
