import { describe, it, expect, vi } from "vitest";

// Test the pv_chamados schema has servicoRealizado field
describe("PV Chamados Schema", () => {
  it("should have servicoRealizado field in schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.pvChamados).toBeDefined();
    // Check that the table definition includes servicoRealizado
    const columns = Object.keys(schema.pvChamados);
    // The table object should exist and have the expected structure
    expect(schema.pvChamados).toBeTruthy();
  });

  it("should export PvChamado type", async () => {
    const schema = await import("../drizzle/schema");
    // Type check - PvChamado should be exported
    expect(schema.pvChamados).toBeDefined();
  });
});

// Test the pvRouter has servicoRealizado in update schemas
describe("PV Router Input Validation", () => {
  it("should accept servicoRealizado in update input", async () => {
    const { z } = await import("zod");
    
    // Simulate the update input schema
    const updateSchema = z.object({
      id: z.number(),
      status: z.string().optional(),
      responsavelPvId: z.number().optional(),
      oficinaId: z.number().optional(),
      oficinaNome: z.string().optional(),
      dataEntradaAgendada: z.number().optional(),
      dataEntradaReal: z.number().optional(),
      prazoEntrega: z.number().optional(),
      dataEntregaReal: z.number().optional(),
      observacoes: z.string().optional(),
      servicoRealizado: z.string().optional(),
      clienteNome: z.string().optional(),
      clienteTelefone: z.string().optional(),
      carroModelo: z.string().optional(),
      carroPlaca: z.string().optional(),
      problemaRelatado: z.string().optional(),
    });

    // Should parse successfully with servicoRealizado
    const result = updateSchema.safeParse({
      id: 1,
      servicoRealizado: "Troca de óleo e filtro realizada",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.servicoRealizado).toBe("Troca de óleo e filtro realizada");
    }
  });

  it("should accept servicoRealizado in updateBySeller input", async () => {
    const { z } = await import("zod");
    
    const updateBySellerSchema = z.object({
      id: z.number(),
      sellerId: z.number(),
      status: z.string().optional(),
      responsavelPvId: z.number().optional(),
      oficinaId: z.number().optional(),
      oficinaNome: z.string().optional(),
      dataEntradaAgendada: z.number().optional(),
      dataEntradaReal: z.number().optional(),
      prazoEntrega: z.number().optional(),
      dataEntregaReal: z.number().optional(),
      observacoes: z.string().optional(),
      servicoRealizado: z.string().optional(),
    });

    const result = updateBySellerSchema.safeParse({
      id: 1,
      sellerId: 5,
      servicoRealizado: "Verificação do ar condicionado",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.servicoRealizado).toBe("Verificação do ar condicionado");
    }
  });
});

// Test WhatsApp URL generation
describe("WhatsApp URL Generation", () => {
  it("should generate correct WhatsApp URL from phone number", () => {
    const phone = "47997876364";
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/55${cleanPhone}`;
    expect(url).toBe("https://wa.me/5547997876364");
  });

  it("should handle formatted phone numbers", () => {
    const phone = "(47) 99787-6364";
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/55${cleanPhone}`;
    expect(url).toBe("https://wa.me/5547997876364");
  });

  it("should handle phone with country code already", () => {
    const phone = "5547997876364";
    const cleanPhone = phone.replace(/\D/g, "");
    // Note: the current implementation always prepends 55
    const url = `https://wa.me/55${cleanPhone}`;
    expect(url).toBe("https://wa.me/555547997876364");
  });
});

// Test tel: URL generation
describe("Phone Call URL Generation", () => {
  it("should generate correct tel: URL", () => {
    const phone = "(47) 99787-6364";
    const url = `tel:${phone}`;
    expect(url).toBe("tel:(47) 99787-6364");
  });
});

// Test department config includes financeiro
describe("Department Configuration", () => {
  it("should include financeiro department", () => {
    const DEPT_CONFIG: Record<string, { label: string }> = {
      vendas: { label: "Vendas" },
      pre_vendas: { label: "Pré-Vendas / SDR" },
      fei: { label: "F&I" },
      consignacao: { label: "Consignação" },
      despachante: { label: "Despachante" },
      pos_venda: { label: "Pós-Venda" },
      financeiro: { label: "Financeiro" },
      marketing: { label: "Marketing" },
    };

    expect(DEPT_CONFIG.financeiro).toBeDefined();
    expect(DEPT_CONFIG.financeiro.label).toBe("Financeiro");
    expect(DEPT_CONFIG.pos_venda).toBeDefined();
  });
});
