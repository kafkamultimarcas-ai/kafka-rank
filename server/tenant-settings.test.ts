import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const crmRouterPath = path.join(__dirname, "routers/crmRouter.ts");
const crmRouterContent = fs.readFileSync(crmRouterPath, "utf-8");

const dashboardPath = path.join(__dirname, "../client/src/pages/crm/CrmAdminDashboard.tsx");
const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");

describe("Tenant Settings - Backend Routes", () => {
  it("should have getTenantSettings route in crmPerformanceRouter", () => {
    expect(crmRouterContent).toContain("getTenantSettings: adminProcedure.query");
  });

  it("should have updateTenantSettings route in crmPerformanceRouter", () => {
    expect(crmRouterContent).toContain("updateTenantSettings: adminProcedure.input");
  });

  it("should have testZapiConnection route in crmPerformanceRouter", () => {
    expect(crmRouterContent).toContain("testZapiConnection: adminProcedure.mutation");
  });

  it("getTenantSettings should return Z-API fields", () => {
    expect(crmRouterContent).toContain("zapiInstanceId:");
    expect(crmRouterContent).toContain("zapiToken:");
    expect(crmRouterContent).toContain("zapiClientToken:");
    expect(crmRouterContent).toContain("hasZapi:");
  });

  it("getTenantSettings should mask sensitive tokens", () => {
    expect(crmRouterContent).toContain("'***configurado***'");
  });

  it("updateTenantSettings should accept Z-API credentials", () => {
    expect(crmRouterContent).toContain("zapiInstanceId: z.string().optional()");
    expect(crmRouterContent).toContain("zapiToken: z.string().optional()");
    expect(crmRouterContent).toContain("zapiClientToken: z.string().optional()");
  });

  it("updateTenantSettings should accept store data fields", () => {
    expect(crmRouterContent).toContain("name: z.string().optional()");
    expect(crmRouterContent).toContain("phone: z.string().optional()");
    expect(crmRouterContent).toContain("email: z.string().optional()");
    expect(crmRouterContent).toContain("city: z.string().optional()");
    expect(crmRouterContent).toContain("primaryColor: z.string().optional()");
    expect(crmRouterContent).toContain("inventoryUrl: z.string().optional()");
  });

  it("testZapiConnection should call Z-API status endpoint", () => {
    expect(crmRouterContent).toContain("api.z-api.io/instances");
    expect(crmRouterContent).toContain("/status");
    expect(crmRouterContent).toContain("Client-Token");
  });

  it("should use getCurrentTenantId from tenantDb (not tenantContext)", () => {
    const tenantSettingsSection = crmRouterContent.substring(
      crmRouterContent.indexOf("TENANT SETTINGS")
    );
    expect(tenantSettingsSection).toContain("getCurrentTenantId");
    expect(tenantSettingsSection).toContain("../tenantDb");
    expect(tenantSettingsSection).not.toContain("../tenantContext");
  });
});

describe("Tenant Settings - Frontend Panel", () => {
  it("should have TenantSettingsPanel component", () => {
    expect(dashboardContent).toContain("function TenantSettingsPanel()");
  });

  it("should use trpc.crmPerformance.getTenantSettings", () => {
    expect(dashboardContent).toContain("trpc.crmPerformance.getTenantSettings.useQuery");
  });

  it("should use trpc.crmPerformance.updateTenantSettings", () => {
    expect(dashboardContent).toContain("trpc.crmPerformance.updateTenantSettings.useMutation");
  });

  it("should use trpc.crmPerformance.testZapiConnection", () => {
    expect(dashboardContent).toContain("trpc.crmPerformance.testZapiConnection.useMutation");
  });

  it("should render TenantSettingsPanel in SettingsView", () => {
    expect(dashboardContent).toContain("<TenantSettingsPanel />");
  });

  it("should have Z-API credential input fields", () => {
    expect(dashboardContent).toContain("zapiInstanceId");
    expect(dashboardContent).toContain("zapiToken");
    expect(dashboardContent).toContain("zapiClientToken");
  });

  it("should have store data input fields", () => {
    expect(dashboardContent).toContain("Nome da Loja");
    expect(dashboardContent).toContain("Telefone");
    expect(dashboardContent).toContain("Email");
    expect(dashboardContent).toContain("Cidade");
    expect(dashboardContent).toContain("Estado (UF)");
    expect(dashboardContent).toContain("URL do Estoque");
    expect(dashboardContent).toContain("Cor Principal");
    expect(dashboardContent).toContain("Cor Secundária");
  });

  it("should have test connection button", () => {
    expect(dashboardContent).toContain("Testar Conexão");
  });

  it("should have save buttons", () => {
    expect(dashboardContent).toContain("Salvar Credenciais");
    expect(dashboardContent).toContain("Salvar Dados da Loja");
  });

  it("should have Z-API instructions with link", () => {
    expect(dashboardContent).toContain("z-api.io");
    expect(dashboardContent).toContain("Como obter:");
  });
});
