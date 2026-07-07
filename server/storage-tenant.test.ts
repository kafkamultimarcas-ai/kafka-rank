import { describe, expect, it, vi, beforeEach } from "vitest";
import { withTenantAsync } from "./tenantDb";

vi.mock("./_core/env", () => ({
  ENV: {
    forgeApiUrl: "https://storage.example.com",
    forgeApiKey: "fake-key",
  },
}));

import { storagePut } from "./storage";

describe("storage.ts - isolamento de uploads por tenant", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prefixa a chave de upload com o tenantId atual", async () => {
    const capturedUrls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      capturedUrls.push(url.toString());
      return { ok: true, json: async () => ({ url: "https://storage.example.com/final-url" }) } as any;
    }) as any;

    await withTenantAsync(5, () => storagePut("sale-docs/10/cnh-123.jpg", Buffer.from("x"), "image/jpeg"));

    expect(capturedUrls).toHaveLength(1);
    const path = new URL(capturedUrls[0]).searchParams.get("path");
    expect(path).toBe("t/5/sale-docs/10/cnh-123.jpg");
  });

  it("duas lojas com o mesmo relKey geram chaves diferentes (sem colisão)", async () => {
    const capturedUrls: string[] = [];
    global.fetch = vi.fn(async (url: any) => {
      capturedUrls.push(url.toString());
      return { ok: true, json: async () => ({ url: "https://storage.example.com/final-url" }) } as any;
    }) as any;

    await withTenantAsync(5, () => storagePut("sale-docs/10/cnh-123.jpg", Buffer.from("x")));
    await withTenantAsync(9, () => storagePut("sale-docs/10/cnh-123.jpg", Buffer.from("x")));

    const pathA = new URL(capturedUrls[0]).searchParams.get("path");
    const pathB = new URL(capturedUrls[1]).searchParams.get("path");
    expect(pathA).not.toBe(pathB);
    expect(pathA).toBe("t/5/sale-docs/10/cnh-123.jpg");
    expect(pathB).toBe("t/9/sale-docs/10/cnh-123.jpg");
  });

  it("a key retornada por storagePut já vem com o prefixo do tenant", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ url: "https://storage.example.com/final-url" }),
    })) as any;

    const result = await withTenantAsync(3, () => storagePut("financial/nota.pdf", Buffer.from("x")));

    expect(result.key).toBe("t/3/financial/nota.pdf");
  });
});
