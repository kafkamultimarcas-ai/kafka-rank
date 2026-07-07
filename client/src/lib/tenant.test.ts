import { describe, expect, it } from "vitest";
import {
  buildTenantPath,
  getTenantLoginPath,
  getTenantSlugFromPath,
} from "./tenant";

describe("tenant route helpers", () => {
  it("extrai o slug de rotas tenantizadas", () => {
    expect(getTenantSlugFromPath("/t/loja-demo/admin")).toBe("loja-demo");
    expect(getTenantSlugFromPath("/admin")).toBeNull();
  });

  it("prefixa rotas internas com o slug atual", () => {
    expect(buildTenantPath("loja-demo", "/admin")).toBe("/t/loja-demo/admin");
    expect(buildTenantPath("loja-demo", "/crm/admin")).toBe("/t/loja-demo/crm/admin");
  });

  it("não duplica o prefixo quando a rota já está tenantizada", () => {
    expect(buildTenantPath("loja-demo", "/t/loja-demo/financeiro")).toBe("/t/loja-demo/financeiro");
  });

  it("mantém rotas globais sem slug", () => {
    expect(buildTenantPath("loja-demo", "/")).toBe("/");
    expect(buildTenantPath("loja-demo", "/super-admin")).toBe("/super-admin");
  });

  it("resolve para a página unificada de login independente do slug", () => {
    expect(getTenantLoginPath("loja-demo")).toBe("/login");
    expect(getTenantLoginPath(null)).toBe("/login");
  });
});
