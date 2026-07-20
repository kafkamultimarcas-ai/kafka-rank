import { z } from "zod";

export const inventoryStatuses = ["available", "reserved", "sold"] as const;
export const inventorySourceTypes = ["sync", "manual", "integration"] as const;
export const inventoryMediaTypes = ["image", "video"] as const;
export const inventoryMediaSourceModes = ["upload", "external_url", "integration"] as const;
export const inventoryMediaStorageProviders = ["s3", "external"] as const;
export const inventoryMediaStatuses = ["active", "deleted", "processing"] as const;
export const inventorySortFields = [
  "createdAt",
  "entryDate",
  "price",
  "km",
  "margin",
  "published",
  "featured",
  "sourceType",
  "status",
] as const;

const trimmedOptionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => !value || /^https?:\/\//i.test(value), "Informe uma URL válida");

const optionalInt = z
  .union([z.number(), z.nan()])
  .optional()
  .transform((value) => {
    if (value === undefined || Number.isNaN(value)) return undefined;
    return Math.trunc(value);
  });

const optionalBool = z.boolean().optional().default(false);
// Listas de texto (opcionais, destaques, tags): tolerantes a dados vindos de
// integração/scraper, que podem trazer descrições longas e muitos itens.
const stringArray = z.array(z.string().trim().min(1).max(500)).max(200).default([]);
// Galeria de fotos: são URLs, que em CDNs externas podem ser bem longas.
const urlListSchema = z.array(z.string().trim().min(1).max(2048)).max(200).default([]);
const inventoryMediaBase64Schema = z.string().max(12 * 1024 * 1024, "Arquivo muito grande. Máximo aproximado de 9MB.");
const inventoryMediaFilenameSchema = z.string().trim().min(1).max(255);
const mediaDimensionSchema = z.number().int().min(1).max(20000).optional();
const mediaDurationSchema = z.number().min(0).max(60 * 60 * 12).optional();

export const inventoryAdminListInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(12),
  search: trimmedOptionalString,
  brand: trimmedOptionalString,
  status: z.enum([...inventoryStatuses, "all"] as const).optional().default("all"),
  sourceType: z.enum([...inventorySourceTypes, "all"] as const).optional().default("all"),
  publishedState: z.enum(["all", "published", "draft"]).optional().default("all"),
  featuredState: z.enum(["all", "featured", "normal"]).optional().default("all"),
  visibility: z.enum(["active", "deleted", "all"]).optional().default("active"),
  sortBy: z.enum(inventorySortFields).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const inventoryDetailedBaseSchema = z.object({
  title: trimmedOptionalString,
  brand: z.string().trim().min(1, "Marca é obrigatória").max(100),
  model: z.string().trim().min(1, "Modelo é obrigatório").max(100),
  version: trimmedOptionalString,
  internalCode: trimmedOptionalString,
  sourceType: z.enum(inventorySourceTypes).default("manual"),
  status: z.enum(inventoryStatuses).default("available"),
  plate: trimmedOptionalString,
  chassis: trimmedOptionalString,
  renavam: trimmedOptionalString,
  color: trimmedOptionalString,
  fuel: trimmedOptionalString,
  transmission: trimmedOptionalString,
  motor: trimmedOptionalString,
  bodyType: trimmedOptionalString,
  category: trimmedOptionalString,
  vehicleState: trimmedOptionalString,
  doors: trimmedOptionalString,
  year: optionalInt,
  manufactureYear: optionalInt,
  modelYear: optionalInt,
  km: optionalInt,
  // Preço 0 é aceito para salvar rascunho / editar dados integrados; a
  // exigência de preço > 0 fica no checklist de publicação.
  price: z.number().int().min(0),
  offerPrice: optionalInt,
  fipePrice: optionalInt,
  purchasePrice: optionalInt,
  preparationCost: optionalInt,
  documentationCost: optionalInt,
  transportCost: optionalInt,
  otherCosts: optionalInt,
  minimumSalePrice: optionalInt,
  photoUrl: optionalUrl,
  photos: urlListSchema,
  optionals: stringArray,
  highlightItems: stringArray,
  internalTags: stringArray,
  externalUrl: optionalUrl,
  videoUrl: optionalUrl,
  observation: trimmedOptionalString,
  internalNotes: trimmedOptionalString,
  storeLocation: trimmedOptionalString,
  entryDate: z.number().int().optional(),
  isPublished: optionalBool,
  isFeatured: optionalBool,
  acceptsTradeIn: optionalBool,
  isArmored: optionalBool,
});

export const inventoryCreateDetailedInputSchema = inventoryDetailedBaseSchema;

export const inventoryUpdateDetailedInputSchema = inventoryDetailedBaseSchema.extend({
  id: z.number().int().positive(),
});

export const inventorySoftDeleteInputSchema = z.object({
  id: z.number().int().positive(),
  reason: z.string().trim().min(3, "Informe o motivo da exclusão").max(500),
});

export const inventoryUploadMediaInputSchema = z.object({
  vehicleId: z.number().int().positive(),
  fileName: inventoryMediaFilenameSchema,
  base64: inventoryMediaBase64Schema,
  mimeType: z.string().trim().min(1).max(120),
  width: mediaDimensionSchema,
  height: mediaDimensionSchema,
  durationSeconds: mediaDurationSchema,
});

export const inventoryDeleteMediaInputSchema = z.object({
  mediaId: z.number().int().positive(),
});

export const inventorySetPrimaryMediaInputSchema = z.object({
  vehicleId: z.number().int().positive(),
  mediaId: z.number().int().positive(),
});

export const inventoryReorderMediaInputSchema = z.object({
  vehicleId: z.number().int().positive(),
  orderedIds: z.array(z.number().int().positive()).min(1).max(200),
});

export const inventoryListMediaInputSchema = z.object({
  vehicleId: z.number().int().positive(),
});

export const inventoryDuplicateValidationInputSchema = z.object({
  id: z.number().int().positive().optional(),
  plate: trimmedOptionalString,
  chassis: trimmedOptionalString,
  renavam: trimmedOptionalString,
});

export type InventoryAdminListInput = z.infer<typeof inventoryAdminListInputSchema>;
export type InventoryCreateDetailedInput = z.infer<typeof inventoryCreateDetailedInputSchema>;
export type InventoryUpdateDetailedInput = z.infer<typeof inventoryUpdateDetailedInputSchema>;
export type InventorySoftDeleteInput = z.infer<typeof inventorySoftDeleteInputSchema>;
export type InventoryUploadMediaInput = z.infer<typeof inventoryUploadMediaInputSchema>;

/**
 * Formatação monetária única do app (BRL, sem centavos). Aceita número ou
 * string de dígitos. Use `fallback` para o texto quando não houver valor
 * (ex: "Consulte" no público, "—" em telas internas).
 */
export function formatBRL(value: number | string | null | undefined, fallback = "—"): string {
  const numeric = typeof value === "string" ? Number(value.replace(/[^\d.-]/g, "")) : Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric === 0) return fallback;
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

/** Normaliza um valor de exibição, retornando "—" quando vazio. */
export function summaryValue(value?: string | null): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "—";
}

export function splitLinesToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinListToLines(values: string[] | null | undefined): string {
  return (values || []).join("\n");
}
