import { z } from "zod";

export const inventoryStatuses = ["available", "reserved", "sold"] as const;
export const inventorySourceTypes = ["sync", "manual", "integration"] as const;
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

const stringArray = z.array(z.string().trim().min(1).max(255)).max(100).default([]);

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
  price: z.number().int().min(1, "Preço é obrigatório"),
  offerPrice: optionalInt,
  fipePrice: optionalInt,
  purchasePrice: optionalInt,
  preparationCost: optionalInt,
  documentationCost: optionalInt,
  transportCost: optionalInt,
  otherCosts: optionalInt,
  minimumSalePrice: optionalInt,
  photoUrl: optionalUrl,
  photos: stringArray,
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

export function splitLinesToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinListToLines(values: string[] | null | undefined): string {
  return (values || []).join("\n");
}
