import { z } from "zod";
import { router } from "../_core/trpc";
import { adminProcedure, managerOrAdminProcedure } from "../_core/trpc";
import * as db from "../db";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";
import { nanoid } from "nanoid";

const MAX_BASE64_SIZE = 10 * 1024 * 1024;

// ===== FIPE API Helper =====
const FIPE_BASE = "https://parallelum.com.br/fipe/api/v1";

async function fipeFetch(path: string) {
  const res = await fetch(`${FIPE_BASE}${path}`);
  if (!res.ok) throw new Error(`FIPE API error: ${res.status}`);
  return res.json();
}

export const vehicleCostRouter = router({
  // ===== CRUD VEÍCULOS =====
  list: managerOrAdminProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const vehicles = await db.listVehicleCosts(input);
      // Para cada veículo, buscar total de gastos
      const result = await Promise.all(vehicles.map(async (v) => {
        const summary = await db.getVehicleCostSummary(v.id);
        const purchasePrice = parseFloat(String(v.purchasePrice || '0'));
        const salePrice = parseFloat(String(v.salePrice || '0'));
        const totalCost = purchasePrice + summary.totalCosts;
        const profit = salePrice > 0 ? salePrice - totalCost : 0;
        const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
        return {
          ...v,
          totalExpenses: summary.totalCosts,
          expenseCount: summary.itemCount,
          totalCost,
          profit: salePrice > 0 ? profit : null,
          margin: salePrice > 0 ? margin : null,
        };
      }));
      return result;
    }),

  getById: managerOrAdminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const vehicle = await db.getVehicleCostById(input.id);
      if (!vehicle) throw new Error("Veículo não encontrado");
      const summary = await db.getVehicleCostSummary(input.id);
      const items = await db.listVehicleCostItems(input.id);
      const purchasePrice = parseFloat(String(vehicle.purchasePrice || '0'));
      const salePrice = parseFloat(String(vehicle.salePrice || '0'));
      const totalCost = purchasePrice + summary.totalCosts;
      const profit = salePrice > 0 ? salePrice - totalCost : 0;
      const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
      return {
        ...vehicle,
        items,
        totalExpenses: summary.totalCosts,
        expenseCount: summary.itemCount,
        totalCost,
        profit: salePrice > 0 ? profit : null,
        margin: salePrice > 0 ? margin : null,
      };
    }),

  create: managerOrAdminProcedure
    .input(z.object({
      plate: z.string().min(1),
      brand: z.string().optional(),
      model: z.string().optional(),
      year: z.number().optional(),
      color: z.string().optional(),
      fuel: z.string().optional(),
      fipeCode: z.string().optional(),
      fipeValue: z.string().optional(),
      purchasePrice: z.string().optional(),
      salePrice: z.string().optional(),
      entryDate: z.number().optional(),
      clientName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createVehicleCost({
        plate: input.plate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        brand: input.brand || null,
        model: input.model || null,
        year: input.year || null,
        color: input.color || null,
        fuel: input.fuel || null,
        fipeCode: input.fipeCode || null,
        fipeValue: input.fipeValue || null,
        purchasePrice: input.purchasePrice || null,
        salePrice: input.salePrice || null,
        entryDate: input.entryDate || Date.now(),
        clientName: input.clientName || null,
        notes: input.notes || null,
      });
      return { id };
    }),

  update: managerOrAdminProcedure
    .input(z.object({
      id: z.number(),
      plate: z.string().optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      year: z.number().optional(),
      color: z.string().optional(),
      fuel: z.string().optional(),
      fipeCode: z.string().optional(),
      fipeValue: z.string().optional(),
      purchasePrice: z.string().optional(),
      salePrice: z.string().optional(),
      entryDate: z.number().optional(),
      saleDate: z.number().optional(),
      status: z.enum(['in_stock', 'sold', 'reserved']).optional(),
      clientName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (data.plate) data.plate = data.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      await db.updateVehicleCost(id, data as any);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteVehicleCost(input.id);
      return { success: true };
    }),

  uploadPhoto: managerOrAdminProcedure
    .input(z.object({
      id: z.number(),
      base64: z.string().max(MAX_BASE64_SIZE),
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const ext = input.mimeType.split("/")[1] || "jpg";
      const fileKey = `vehicle-costs/${input.id}-${nanoid(8)}.${ext}`;
      const buffer = Buffer.from(input.base64, "base64");
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      await db.updateVehicleCost(input.id, { photoUrl: url, photoKey: fileKey });
      return { url };
    }),

  // ===== ITENS DE CUSTO =====
  listItems: managerOrAdminProcedure
    .input(z.object({ vehicleId: z.number() }))
    .query(async ({ input }) => {
      return db.listVehicleCostItems(input.vehicleId);
    }),

  createItem: managerOrAdminProcedure
    .input(z.object({
      vehicleId: z.number(),
      description: z.string().min(1),
      category: z.string().optional(),
      amount: z.string(),
      date: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createVehicleCostItem({
        vehicleId: input.vehicleId,
        description: input.description,
        category: input.category || null,
        amount: input.amount,
        date: input.date || Date.now(),
        notes: input.notes || null,
      });
      return { id };
    }),

  updateItem: managerOrAdminProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().optional(),
      category: z.string().optional(),
      amount: z.string().optional(),
      date: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateVehicleCostItem(id, data as any);
      return { success: true };
    }),

  deleteItem: managerOrAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteVehicleCostItem(input.id);
      return { success: true };
    }),

  // ===== CONSULTA FIPE =====
  fipeBrands: managerOrAdminProcedure
    .input(z.object({ type: z.enum(['carros', 'motos', 'caminhoes']).default('carros') }))
    .query(async ({ input }) => {
      return fipeFetch(`/${input.type}/marcas`);
    }),

  fipeModels: managerOrAdminProcedure
    .input(z.object({
      type: z.enum(['carros', 'motos', 'caminhoes']).default('carros'),
      brandCode: z.string(),
    }))
    .query(async ({ input }) => {
      return fipeFetch(`/${input.type}/marcas/${input.brandCode}/modelos`);
    }),

  fipeYears: managerOrAdminProcedure
    .input(z.object({
      type: z.enum(['carros', 'motos', 'caminhoes']).default('carros'),
      brandCode: z.string(),
      modelCode: z.string(),
    }))
    .query(async ({ input }) => {
      return fipeFetch(`/${input.type}/marcas/${input.brandCode}/modelos/${input.modelCode}/anos`);
    }),

  fipePrice: managerOrAdminProcedure
    .input(z.object({
      type: z.enum(['carros', 'motos', 'caminhoes']).default('carros'),
      brandCode: z.string(),
      modelCode: z.string(),
      yearCode: z.string(),
    }))
    .query(async ({ input }) => {
      return fipeFetch(`/${input.type}/marcas/${input.brandCode}/modelos/${input.modelCode}/anos/${input.yearCode}`);
    }),

  // ===== OCR DE PLACA POR FOTO (IA) =====
  ocrPlate: managerOrAdminProcedure
    .input(z.object({
      base64: z.string().max(MAX_BASE64_SIZE),
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Upload da imagem para S3 para obter URL
      const ext = input.mimeType.split("/")[1] || "jpg";
      const fileKey = `ocr-temp/${nanoid(12)}.${ext}`;
      const buffer = Buffer.from(input.base64, "base64");
      const { url: imageUrl } = await storagePut(fileKey, buffer, input.mimeType);

      // Usar LLM com visão para identificar placa e dados do veículo
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Você é um especialista em identificação de veículos brasileiros. Analise a imagem e extraia:
1. A placa do veículo (formato antigo ABC-1234 ou Mercosul ABC1D23)
2. Se possível, identifique marca, modelo, ano e cor do veículo pela aparência

Responda APENAS em JSON válido com este formato:
{
  "plate": "ABC1234",
  "brand": "Chevrolet",
  "model": "Onix 1.0 LT",
  "year": 2022,
  "color": "Prata",
  "confidence": "high"
}

Se não conseguir identificar a placa, retorne:
{"plate": null, "error": "Não foi possível identificar a placa na imagem"}

Importante: retorne a placa SEM hífen, apenas letras e números.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identifique a placa e dados do veículo nesta imagem:" },
              { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "vehicle_ocr",
            strict: true,
            schema: {
              type: "object",
              properties: {
                plate: { type: ["string", "null"], description: "Placa do veículo sem hífen" },
                brand: { type: ["string", "null"], description: "Marca do veículo" },
                model: { type: ["string", "null"], description: "Modelo do veículo" },
                year: { type: ["integer", "null"], description: "Ano do veículo" },
                color: { type: ["string", "null"], description: "Cor do veículo" },
                confidence: { type: "string", description: "Nível de confiança: high, medium, low" },
                error: { type: ["string", "null"], description: "Mensagem de erro se não identificou" },
              },
              required: ["plate", "brand", "model", "year", "color", "confidence", "error"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      if (!content) throw new Error("IA não retornou resposta");
      
      try {
        const parsed = JSON.parse(content);
        return { ...parsed, imageUrl };
      } catch {
        throw new Error("Erro ao processar resposta da IA");
      }
    }),
});
