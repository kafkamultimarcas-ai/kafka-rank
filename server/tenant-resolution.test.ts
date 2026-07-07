import { describe, expect, it } from "vitest";
import { extractTenantSlugFromPathname, extractTenantSlugFromRequest } from "./tenantMiddleware";

describe("Tenant slug resolution", () => {
  it("extracts tenant slug from tenantized app paths", () => {
    expect(extractTenantSlugFromPathname("/t/loja-1/login")).toBe("loja-1");
    expect(extractTenantSlugFromPathname("/t/auto-center/admin/login")).toBe("auto-center");
    expect(extractTenantSlugFromPathname("/t/kafka/crm/admin/login")).toBe("kafka");
  });

  it("extracts tenant slug from tenantized api paths", () => {
    expect(extractTenantSlugFromPathname("/api/t/loja-1/webhooks/widget/lead")).toBe("loja-1");
    expect(extractTenantSlugFromPathname("/api/t/loja-2/webhooks/whatsapp")).toBe("loja-2");
  });

  it("returns null when pathname is not tenantized", () => {
    expect(extractTenantSlugFromPathname("/login-vendedor")).toBeNull();
    expect(extractTenantSlugFromPathname("/crm/admin/login")).toBeNull();
    expect(extractTenantSlugFromPathname("/")).toBeNull();
  });

  it("prefers explicit x-tenant-slug header over referer", () => {
    const slug = extractTenantSlugFromRequest({
      headers: {
        "x-tenant-slug": "header-store",
        referer: "https://kafkarank.com/t/referer-store/login",
      },
      originalUrl: "/api/trpc/sellers.list",
      url: "/api/trpc/sellers.list",
    } as any);

    expect(slug).toBe("header-store");
  });

  it("falls back to referer when request path is not tenantized", () => {
    const slug = extractTenantSlugFromRequest({
      headers: {
        referer: "https://kafkarank.com/t/referer-store/admin/login",
      },
      originalUrl: "/api/trpc/adminAuth.login",
      url: "/api/trpc/adminAuth.login",
    } as any);

    expect(slug).toBe("referer-store");
  });
});
