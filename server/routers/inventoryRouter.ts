import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { inventoryVehicles, inventoryVehicleMedia, inventorySyncLogs, inventoryAuditLogs, tenants } from "../../drizzle/schema";
import { eq, desc, asc, and, like, or, sql, isNull, isNotNull, ne } from "drizzle-orm";
import { syncInventory } from "../inventory-scraper";
import { getCurrentTenantId } from "../tenantDb";
import { isStorageDeleteConfigured, storageDelete, storagePut } from "../storage";
import {
  buildExternalInventoryMediaRows,
  buildInventoryMediaStorageKey,
  buildLegacyInventoryMediaFields,
  inferInventoryMediaTypeFromMime,
  isAllowedInventoryMediaMime,
  sanitizeInventoryFileName,
} from "../inventoryMedia";
import {
  inventoryAdminListInputSchema,
  inventoryCreateDetailedInputSchema,
  inventoryDeleteMediaInputSchema,
  inventoryDuplicateValidationInputSchema,
  inventoryListMediaInputSchema,
  inventoryReorderMediaInputSchema,
  inventorySetPrimaryMediaInputSchema,
  inventorySoftDeleteInputSchema,
  inventoryUploadMediaInputSchema,
  inventoryUpdateDetailedInputSchema,
} from "@shared/inventory";

type InventoryMutationCtxUser = {
  id?: number;
  name?: string | null;
  email?: string | null;
};

const MAX_INVENTORY_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_INVENTORY_VIDEO_BYTES = 40 * 1024 * 1024;

function serializeList(values?: string[] | null) {
  if (!values || values.length === 0) return null;
  return JSON.stringify(values);
}

function normalizePlate(value?: string) {
  if (!value) return null;
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized || null;
}

function normalizeLooseString(value?: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function parseList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function computeChecklist(vehicle: any) {
  const checks = [
    { key: "brand", label: "Marca", passed: !!vehicle.brand },
    { key: "model", label: "Modelo", passed: !!vehicle.model },
    { key: "version", label: "Versão", passed: !!vehicle.version },
    { key: "price", label: "Preço", passed: Number(vehicle.price || 0) > 0 },
    { key: "year", label: "Ano", passed: !!(vehicle.modelYear || vehicle.year) },
    { key: "km", label: "KM", passed: vehicle.km !== null && vehicle.km !== undefined },
    { key: "storeLocation", label: "Loja", passed: !!vehicle.storeLocation },
    { key: "observation", label: "Descrição", passed: !!vehicle.observation && String(vehicle.observation).trim().length >= 20 },
    { key: "photo", label: "Foto principal", passed: !!vehicle.photoUrl || parseList(vehicle.photos).length > 0 },
  ];
  const completed = checks.filter((item) => item.passed).length;
  const total = checks.length;
  const completeness = Math.round((completed / total) * 100);
  return {
    readyForPublish: checks.every((item) => item.passed),
    completed,
    total,
    completeness,
    missingItems: checks.filter((item) => !item.passed).map((item) => item.label),
    checks,
  };
}

function computeMargin(vehicle: any) {
  const sale = Number(vehicle.price || 0);
  const purchase = Number(vehicle.purchasePrice || 0);
  const preparation = Number(vehicle.preparationCost || 0);
  const documentation = Number(vehicle.documentationCost || 0);
  const transport = Number(vehicle.transportCost || 0);
  const other = Number(vehicle.otherCosts || 0);
  if (sale <= 0) return null;
  return sale - purchase - preparation - documentation - transport - other;
}

function mapAdminVehicle(vehicle: any) {
  return {
    ...vehicle,
    checklist: computeChecklist(vehicle),
    margin: computeMargin(vehicle),
    photosList: parseList(vehicle.photos),
    optionalsList: parseList(vehicle.optionals),
    highlightItemsList: parseList(vehicle.highlightItems),
    internalTagsList: parseList(vehicle.internalTags),
  };
}

function mapInventoryMediaItem(item: any) {
  return {
    ...item,
    fileSizeBytes: item.fileSizeBytes == null ? null : Number(item.fileSizeBytes),
  };
}

function actorName(user?: InventoryMutationCtxUser | null) {
  return user?.name || user?.email || (user?.id ? `Usuário #${user.id}` : "Sistema");
}

async function createAuditLog(params: {
  inventoryId: number;
  action: "created" | "updated" | "status_changed" | "soft_deleted" | "restored";
  actor?: InventoryMutationCtxUser | null;
  summary: string;
  changedFields?: string[];
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(inventoryAuditLogs).values({
    inventoryId: params.inventoryId,
    action: params.action,
    actorId: params.actor?.id ?? null,
    actorName: actorName(params.actor),
    summary: params.summary,
    changedFields: params.changedFields?.length ? JSON.stringify(params.changedFields) : null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    tenantId: getCurrentTenantId(),
  });
}

function buildSearchConditions(search?: string) {
  if (!search) return undefined;
  const term = `%${search}%`;
  return or(
    like(inventoryVehicles.brand, term),
    like(inventoryVehicles.model, term),
    like(inventoryVehicles.title, term),
    like(inventoryVehicles.version, term),
    like(inventoryVehicles.color, term),
    like(inventoryVehicles.plate, term),
    like(inventoryVehicles.internalCode, term)
  );
}

function toInventoryInsert(input: z.infer<typeof inventoryCreateDetailedInputSchema>) {
  const now = Date.now();
  return {
    externalId: input.sourceType === "manual" ? `manual-${nanoid(8)}` : `${input.sourceType}-${nanoid(8)}`,
    tenantId: getCurrentTenantId(),
    title: normalizeLooseString(input.title),
    brand: input.brand.trim(),
    model: input.model.trim(),
    internalCode: normalizeLooseString(input.internalCode),
    sourceType: input.sourceType,
    version: normalizeLooseString(input.version),
    motor: normalizeLooseString(input.motor),
    year: input.modelYear ?? input.year ?? null,
    manufactureYear: input.manufactureYear ?? null,
    modelYear: input.modelYear ?? input.year ?? null,
    chassis: normalizeLooseString(input.chassis),
    renavam: normalizeLooseString(input.renavam),
    color: normalizeLooseString(input.color),
    fuel: normalizeLooseString(input.fuel),
    km: input.km ?? 0,
    price: input.price,
    purchasePrice: input.purchasePrice ?? 0,
    preparationCost: input.preparationCost ?? 0,
    documentationCost: input.documentationCost ?? 0,
    transportCost: input.transportCost ?? 0,
    otherCosts: input.otherCosts ?? 0,
    minimumSalePrice: input.minimumSalePrice ?? 0,
    photoUrl: normalizeLooseString(input.photoUrl) || input.photos[0] || null,
    photos: serializeList(input.photos),
    optionals: serializeList(input.optionals),
    highlightItems: serializeList(input.highlightItems),
    internalTags: serializeList(input.internalTags),
    externalUrl: normalizeLooseString(input.externalUrl),
    videoUrl: normalizeLooseString(input.videoUrl),
    slug: null,
    bodyType: normalizeLooseString(input.bodyType),
    transmission: normalizeLooseString(input.transmission),
    plate: normalizePlate(input.plate),
    doors: normalizeLooseString(input.doors),
    fipePrice: input.fipePrice ?? 0,
    offerPrice: input.offerPrice ?? 0,
    vehicleState: normalizeLooseString(input.vehicleState),
    category: normalizeLooseString(input.category),
    observation: normalizeLooseString(input.observation),
    internalNotes: normalizeLooseString(input.internalNotes),
    storeLocation: normalizeLooseString(input.storeLocation),
    entryDate: input.entryDate ?? now,
    isPublished: input.isPublished,
    isFeatured: input.isFeatured,
    acceptsTradeIn: input.acceptsTradeIn,
    isArmored: input.isArmored,
    status: input.status,
    lastSyncedAt: now,
    deletedAt: null,
    deletedBy: null,
    deletedReason: null,
  };
}

function toInventoryUpdate(input: z.infer<typeof inventoryUpdateDetailedInputSchema>) {
  const base = toInventoryInsert(input);
  return {
    title: base.title,
    brand: base.brand,
    model: base.model,
    internalCode: base.internalCode,
    sourceType: base.sourceType,
    version: base.version,
    motor: base.motor,
    year: base.year,
    manufactureYear: base.manufactureYear,
    modelYear: base.modelYear,
    chassis: base.chassis,
    renavam: base.renavam,
    color: base.color,
    fuel: base.fuel,
    km: base.km,
    price: base.price,
    purchasePrice: base.purchasePrice,
    preparationCost: base.preparationCost,
    documentationCost: base.documentationCost,
    transportCost: base.transportCost,
    otherCosts: base.otherCosts,
    minimumSalePrice: base.minimumSalePrice,
    photoUrl: base.photoUrl,
    photos: base.photos,
    optionals: base.optionals,
    highlightItems: base.highlightItems,
    internalTags: base.internalTags,
    externalUrl: base.externalUrl,
    videoUrl: base.videoUrl,
    bodyType: base.bodyType,
    transmission: base.transmission,
    plate: base.plate,
    doors: base.doors,
    fipePrice: base.fipePrice,
    offerPrice: base.offerPrice,
    vehicleState: base.vehicleState,
    category: base.category,
    observation: base.observation,
    internalNotes: base.internalNotes,
    storeLocation: base.storeLocation,
    entryDate: base.entryDate,
    isPublished: base.isPublished,
    isFeatured: base.isFeatured,
    acceptsTradeIn: base.acceptsTradeIn,
    isArmored: base.isArmored,
    status: base.status,
    lastSyncedAt: Date.now(),
  };
}

async function getVehicleById(id: number, includeDeleted = false) {
  const db = await getDb();
  if (!db) return null;
  const conditions: any[] = [eq(inventoryVehicles.id, id), eq(inventoryVehicles.tenantId, getCurrentTenantId())];
  if (!includeDeleted) conditions.push(isNull(inventoryVehicles.deletedAt));
  const result = await db.select().from(inventoryVehicles).where(and(...conditions)).limit(1);
  return result[0] || null;
}

async function validateDuplicates(input: z.infer<typeof inventoryDuplicateValidationInputSchema>) {
  const db = await getDb();
  if (!db) return { hasDuplicate: false, duplicates: [] as any[] };
  const tenantId = getCurrentTenantId();
  const conditions: any[] = [eq(inventoryVehicles.tenantId, tenantId), isNull(inventoryVehicles.deletedAt)];
  const duplicateChecks: any[] = [];
  const plate = normalizePlate(input.plate || undefined);
  const chassis = normalizeLooseString(input.chassis);
  const renavam = normalizeLooseString(input.renavam);

  if (plate) duplicateChecks.push(eq(inventoryVehicles.plate, plate));
  if (chassis) duplicateChecks.push(eq(inventoryVehicles.chassis, chassis));
  if (renavam) duplicateChecks.push(eq(inventoryVehicles.renavam, renavam));
  if (duplicateChecks.length === 0) return { hasDuplicate: false, duplicates: [] as any[] };
  conditions.push(or(...duplicateChecks));
  if (input.id) conditions.push(ne(inventoryVehicles.id, input.id));

  const rows = await db
    .select({
      id: inventoryVehicles.id,
      brand: inventoryVehicles.brand,
      model: inventoryVehicles.model,
      plate: inventoryVehicles.plate,
      chassis: inventoryVehicles.chassis,
      renavam: inventoryVehicles.renavam,
      status: inventoryVehicles.status,
      sourceType: inventoryVehicles.sourceType,
      isPublished: inventoryVehicles.isPublished,
    })
    .from(inventoryVehicles)
    .where(and(...conditions))
    .limit(10);

  return {
    hasDuplicate: rows.length > 0,
    duplicates: rows,
  };
}

function ensurePublishable(vehicle: any) {
  const checklist = computeChecklist(vehicle);
  if (vehicle.isPublished && !checklist.readyForPublish) {
    throw new Error(`Checklist incompleto para publicar: ${checklist.missingItems.join(", ")}`);
  }
}

function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const fields: string[] = [];
  for (const [key, value] of Object.entries(after)) {
    const previous = before[key];
    if (JSON.stringify(previous) !== JSON.stringify(value)) fields.push(key);
  }
  return fields;
}

async function listVehicleMediaRows(vehicleId: number, includeDeleted = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [
    eq(inventoryVehicleMedia.inventoryVehicleId, vehicleId),
    eq(inventoryVehicleMedia.tenantId, getCurrentTenantId()),
  ];
  if (!includeDeleted) conditions.push(eq(inventoryVehicleMedia.status, "active"));
  return db
    .select()
    .from(inventoryVehicleMedia)
    .where(and(...conditions))
    .orderBy(asc(inventoryVehicleMedia.sortOrder), asc(inventoryVehicleMedia.id));
}

async function normalizePrimaryImageSelection(vehicleId: number) {
  const db = await getDb();
  if (!db) return [];
  const mediaRows = await listVehicleMediaRows(vehicleId);
  const imageRows = mediaRows.filter((row) => row.mediaType === "image");
  if (imageRows.length === 0) return mediaRows;
  const primaryImage = imageRows.find((row) => row.isPrimary) || imageRows[0];
  await Promise.all(imageRows.map((row) =>
    db.update(inventoryVehicleMedia)
      .set({ isPrimary: row.id === primaryImage.id })
      .where(and(
        eq(inventoryVehicleMedia.id, row.id),
        eq(inventoryVehicleMedia.tenantId, getCurrentTenantId()),
      ))
  ));
  return mediaRows.map((row) => row.mediaType === "image" ? { ...row, isPrimary: row.id === primaryImage.id } : row);
}

async function syncLegacyVehicleMediaFields(vehicleId: number) {
  const db = await getDb();
  if (!db) return [];
  const mediaRows = await normalizePrimaryImageSelection(vehicleId);
  const legacyFields = buildLegacyInventoryMediaFields(mediaRows);
  await db.update(inventoryVehicles)
    .set(legacyFields)
    .where(and(
      eq(inventoryVehicles.id, vehicleId),
      eq(inventoryVehicles.tenantId, getCurrentTenantId()),
    ));
  return mediaRows;
}

async function replaceExternalVehicleMedia(params: {
  vehicleId: number;
  photoUrl?: string | null;
  photos?: string[] | null;
  videoUrl?: string | null;
  actorId?: number | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(inventoryVehicleMedia)
    .set({
      status: "deleted",
      deletedAt: Date.now(),
      isPrimary: false,
    })
    .where(and(
      eq(inventoryVehicleMedia.inventoryVehicleId, params.vehicleId),
      eq(inventoryVehicleMedia.tenantId, getCurrentTenantId()),
      eq(inventoryVehicleMedia.sourceMode, "external_url"),
      eq(inventoryVehicleMedia.status, "active"),
    ));

  const rows = buildExternalInventoryMediaRows({
    tenantId: getCurrentTenantId(),
    vehicleId: params.vehicleId,
    actorId: params.actorId,
    photoUrl: params.photoUrl,
    photos: params.photos,
    videoUrl: params.videoUrl,
  });

  if (rows.length > 0) {
    await db.insert(inventoryVehicleMedia).values(rows);
  }

  await syncLegacyVehicleMediaFields(params.vehicleId);
}

export const inventoryRouter = router({
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(["available", "reserved", "sold", "all"]).optional(),
        search: z.string().optional(),
        brand: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        minYear: z.number().optional(),
        maxYear: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [
        eq(inventoryVehicles.tenantId, getCurrentTenantId()),
        eq(inventoryVehicles.isPublished, true),
        isNull(inventoryVehicles.deletedAt),
      ];

      if (input?.status && input.status !== "all") conditions.push(eq(inventoryVehicles.status, input.status as any));
      if (input?.brand) conditions.push(eq(inventoryVehicles.brand, input.brand));
      const searchCondition = buildSearchConditions(input?.search);
      if (searchCondition) conditions.push(searchCondition);
      if (input?.minPrice !== undefined) conditions.push(sql`${inventoryVehicles.price} >= ${input.minPrice}`);
      if (input?.maxPrice !== undefined) conditions.push(sql`${inventoryVehicles.price} <= ${input.maxPrice}`);
      if (input?.minYear !== undefined) conditions.push(sql`${inventoryVehicles.year} >= ${input.minYear}`);
      if (input?.maxYear !== undefined) conditions.push(sql`${inventoryVehicles.year} <= ${input.maxYear}`);

      return db.select().from(inventoryVehicles).where(and(...conditions)).orderBy(desc(inventoryVehicles.isFeatured), desc(inventoryVehicles.createdAt));
    }),

  adminList: adminProcedure
    .input(inventoryAdminListInputSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize, totalPages: 0 };

      const conditions: any[] = [eq(inventoryVehicles.tenantId, getCurrentTenantId())];
      if (input.visibility === "active") conditions.push(isNull(inventoryVehicles.deletedAt));
      if (input.visibility === "deleted") conditions.push(isNotNull(inventoryVehicles.deletedAt));

      const searchCondition = buildSearchConditions(input.search);
      if (searchCondition) conditions.push(searchCondition);
      if (input.brand) conditions.push(eq(inventoryVehicles.brand, input.brand));
      if (input.status !== "all") conditions.push(eq(inventoryVehicles.status, input.status));
      if (input.sourceType !== "all") conditions.push(eq(inventoryVehicles.sourceType, input.sourceType));
      if (input.publishedState === "published") conditions.push(eq(inventoryVehicles.isPublished, true));
      if (input.publishedState === "draft") conditions.push(eq(inventoryVehicles.isPublished, false));
      if (input.featuredState === "featured") conditions.push(eq(inventoryVehicles.isFeatured, true));
      if (input.featuredState === "normal") conditions.push(eq(inventoryVehicles.isFeatured, false));

      const whereClause = and(...conditions);
      const offset = (input.page - 1) * input.pageSize;

      const orderDirection = input.sortOrder === "asc" ? asc : desc;
      const sortExpression = (() => {
        switch (input.sortBy) {
          case "entryDate":
            return orderDirection(inventoryVehicles.entryDate);
          case "price":
            return orderDirection(inventoryVehicles.price);
          case "km":
            return orderDirection(inventoryVehicles.km);
          case "published":
            return orderDirection(inventoryVehicles.isPublished);
          case "featured":
            return orderDirection(inventoryVehicles.isFeatured);
          case "sourceType":
            return orderDirection(inventoryVehicles.sourceType);
          case "status":
            return orderDirection(inventoryVehicles.status);
          case "margin":
            return sql`(${inventoryVehicles.price} - ${inventoryVehicles.purchasePrice} - ${inventoryVehicles.preparationCost} - ${inventoryVehicles.documentationCost} - ${inventoryVehicles.transportCost} - ${inventoryVehicles.otherCosts}) ${sql.raw(input.sortOrder.toUpperCase())}`;
          case "createdAt":
          default:
            return orderDirection(inventoryVehicles.createdAt);
        }
      })();

      const items = await db
        .select()
        .from(inventoryVehicles)
        .where(whereClause)
        .orderBy(sortExpression, desc(inventoryVehicles.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      const countRows = await db.select({ total: sql<number>`count(*)` }).from(inventoryVehicles).where(whereClause);
      const total = Number(countRows[0]?.total || 0);
      const totalPages = total > 0 ? Math.ceil(total / input.pageSize) : 0;

      return {
        items: items.map(mapAdminVehicle),
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db
        .select()
        .from(inventoryVehicles)
        .where(and(
          eq(inventoryVehicles.id, input.id),
          eq(inventoryVehicles.tenantId, getCurrentTenantId()),
          eq(inventoryVehicles.isPublished, true),
          isNull(inventoryVehicles.deletedAt),
        ))
        .limit(1);
      return result[0] || null;
    }),

  getAdminById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const vehicle = await getVehicleById(input.id, true);
      if (!vehicle) return null;
      const mediaItems = await listVehicleMediaRows(input.id, true);
      return {
        ...mapAdminVehicle(vehicle),
        mediaItems: mediaItems.map(mapInventoryMediaItem),
      };
    }),

  listMedia: adminProcedure
    .input(inventoryListMediaInputSchema)
    .query(async ({ input }) => {
      const vehicle = await getVehicleById(input.vehicleId, true);
      if (!vehicle) throw new Error("Veículo não encontrado");
      const rows = await listVehicleMediaRows(input.vehicleId, true);
      return rows.map(mapInventoryMediaItem);
    }),

  brands: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db
      .select({ brand: inventoryVehicles.brand, count: sql<number>`count(*)` })
      .from(inventoryVehicles)
      .where(and(
        eq(inventoryVehicles.status, "available"),
        eq(inventoryVehicles.isPublished, true),
        eq(inventoryVehicles.tenantId, getCurrentTenantId()),
        isNull(inventoryVehicles.deletedAt),
      ))
      .groupBy(inventoryVehicles.brand)
      .orderBy(desc(sql`count(*)`));
    return result;
  }),

  stats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, available: 0, reserved: 0, sold: 0, avgPrice: 0 };
    const all = await db
      .select({
        status: inventoryVehicles.status,
        count: sql<number>`count(*)`,
        avgPrice: sql<number>`AVG(${inventoryVehicles.price})`,
      })
      .from(inventoryVehicles)
      .where(and(eq(inventoryVehicles.tenantId, getCurrentTenantId()), isNull(inventoryVehicles.deletedAt)))
      .groupBy(inventoryVehicles.status);

    const stats = { total: 0, available: 0, reserved: 0, sold: 0, avgPrice: 0 };
    let totalPrice = 0;
    for (const row of all) {
      const count = Number(row.count);
      stats.total += count;
      if (row.status === "available") {
        stats.available = count;
        totalPrice = Number(row.avgPrice) * count;
      }
      if (row.status === "reserved") stats.reserved = count;
      if (row.status === "sold") stats.sold = count;
    }
    stats.avgPrice = stats.available > 0 ? Math.round(totalPrice / stats.available) : 0;
    return stats;
  }),

  adminMetrics: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        active: 0,
        deleted: 0,
        drafts: 0,
        published: 0,
        featured: 0,
        withoutPhoto: 0,
        lowCompleteness: 0,
        averageMargin: 0,
      };
    }
    const tenantId = getCurrentTenantId();
    const rows = await db.select().from(inventoryVehicles).where(eq(inventoryVehicles.tenantId, tenantId));
    const activeRows = rows.filter((row) => row.deletedAt == null);
    const withChecklist = activeRows.map((row) => ({
      row,
      checklist: computeChecklist(row),
      margin: computeMargin(row),
    }));
    const averageMarginBase = withChecklist.filter((entry) => entry.margin !== null).map((entry) => entry.margin as number);
    const averageMargin = averageMarginBase.length > 0 ? Math.round(averageMarginBase.reduce((sum, value) => sum + value, 0) / averageMarginBase.length) : 0;

    return {
      active: activeRows.length,
      deleted: rows.filter((row) => row.deletedAt != null).length,
      drafts: activeRows.filter((row) => !row.isPublished).length,
      published: activeRows.filter((row) => row.isPublished).length,
      featured: activeRows.filter((row) => row.isFeatured).length,
      withoutPhoto: activeRows.filter((row) => !row.photoUrl && parseList(row.photos).length === 0).length,
      lowCompleteness: withChecklist.filter((entry) => entry.checklist.completeness < 80).length,
      averageMargin,
    };
  }),

  validateDuplicate: adminProcedure
    .input(inventoryDuplicateValidationInputSchema)
    .query(async ({ input }) => validateDuplicates(input)),

  auditLogs: adminProcedure
    .input(z.object({ inventoryId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(inventoryAuditLogs)
        .where(and(eq(inventoryAuditLogs.inventoryId, input.inventoryId), eq(inventoryAuditLogs.tenantId, getCurrentTenantId())))
        .orderBy(desc(inventoryAuditLogs.createdAt));
      return rows.map((row) => ({
        ...row,
        changedFieldsList: parseList(row.changedFields),
        metadataJson: row.metadata ? JSON.parse(row.metadata) : null,
      }));
    }),

  uploadMedia: adminProcedure
    .input(inventoryUploadMediaInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const vehicle = await getVehicleById(input.vehicleId, true);
      if (!vehicle || vehicle.deletedAt) throw new Error("Veículo não encontrado");

      const mimeType = input.mimeType.toLowerCase().split(";")[0].trim();
      if (!isAllowedInventoryMediaMime(mimeType)) {
        throw new Error("Tipo de arquivo não suportado para o estoque.");
      }

      const mediaType = inferInventoryMediaTypeFromMime(mimeType);
      if (!mediaType) throw new Error("Não foi possível identificar o tipo da mídia.");

      const buffer = Buffer.from(input.base64, "base64");
      const maxBytes = mediaType === "video" ? MAX_INVENTORY_VIDEO_BYTES : MAX_INVENTORY_IMAGE_BYTES;
      if (buffer.byteLength > maxBytes) {
        throw new Error(mediaType === "video"
          ? "Vídeo muito grande para o upload atual. Envie um vídeo menor."
          : "Imagem muito grande. Reduza o arquivo antes de enviar.");
      }

      const activeMedia = await listVehicleMediaRows(input.vehicleId);
      const sortOrder = activeMedia.length > 0
        ? Math.max(...activeMedia.map((item) => Number(item.sortOrder || 0))) + 1
        : 0;

      const storageKey = buildInventoryMediaStorageKey({
        tenantId: getCurrentTenantId(),
        vehicleId: input.vehicleId,
        mediaType,
        fileName: sanitizeInventoryFileName(input.fileName),
        mimeType,
      });

      const uploadResult = await storagePut(storageKey, buffer, mimeType);
      const isPrimary = mediaType === "image"
        ? !activeMedia.some((item) => item.mediaType === "image" && item.isPrimary)
        : !activeMedia.some((item) => item.mediaType === "video" && item.isPrimary);

      const insertResult = await db.insert(inventoryVehicleMedia).values({
        tenantId: getCurrentTenantId(),
        inventoryVehicleId: input.vehicleId,
        mediaType,
        sourceMode: "upload",
        storageProvider: "s3",
        url: uploadResult.url,
        storageKey: uploadResult.key,
        fileName: sanitizeInventoryFileName(input.fileName),
        mimeType,
        fileSizeBytes: buffer.byteLength,
        width: input.width ?? null,
        height: input.height ?? null,
        durationSeconds: input.durationSeconds ?? null,
        sortOrder,
        isPrimary,
        status: "active",
        createdBySellerId: ctx.user?.id ?? null,
      });

      await syncLegacyVehicleMediaFields(input.vehicleId);
      const mediaId = Number(insertResult[0].insertId);
      const rows = await listVehicleMediaRows(input.vehicleId, true);
      const created = rows.find((item) => item.id === mediaId);

      await createAuditLog({
        inventoryId: input.vehicleId,
        action: "updated",
        actor: ctx.user,
        summary: `Mídia enviada para o veículo: ${input.fileName}`,
        changedFields: ["photoUrl", "photos", "videoUrl"],
        metadata: { mediaType, sourceMode: "upload", mediaId },
      });

      return created ? mapInventoryMediaItem(created) : { id: mediaId, url: uploadResult.url };
    }),

  deleteMedia: adminProcedure
    .input(inventoryDeleteMediaInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const rows = await db.select().from(inventoryVehicleMedia)
        .where(and(
          eq(inventoryVehicleMedia.id, input.mediaId),
          eq(inventoryVehicleMedia.tenantId, getCurrentTenantId()),
          eq(inventoryVehicleMedia.status, "active"),
        ))
        .limit(1);
      const media = rows[0];
      if (!media) throw new Error("Mídia não encontrada");

      await db.update(inventoryVehicleMedia)
        .set({
          status: "deleted",
          deletedAt: Date.now(),
          isPrimary: false,
        })
        .where(and(
          eq(inventoryVehicleMedia.id, input.mediaId),
          eq(inventoryVehicleMedia.tenantId, getCurrentTenantId()),
        ));

      let storageDeleted = false;
      let storageDeleteSkipped = false;
      if (media.storageProvider === "s3" && media.storageKey) {
        if (isStorageDeleteConfigured()) {
          try {
            await storageDelete(media.storageKey);
            storageDeleted = true;
          } catch (err) {
            // Best-effort: o registro já foi marcado como removido no banco; uma falha
            // no bucket não deve derrubar a operação (evita erro na UI + estado inconsistente).
            console.error(`[inventory deleteMedia] Falha ao remover objeto do bucket (${media.storageKey}):`, err);
            storageDeleteSkipped = true;
          }
        } else {
          storageDeleteSkipped = true;
        }
      }

      await syncLegacyVehicleMediaFields(media.inventoryVehicleId);
      await createAuditLog({
        inventoryId: media.inventoryVehicleId,
        action: "updated",
        actor: ctx.user,
        summary: "Mídia removida do veículo",
        changedFields: ["photoUrl", "photos", "videoUrl"],
        metadata: { mediaId: input.mediaId, mediaType: media.mediaType, storageDeleted, storageDeleteSkipped },
      });

      return { success: true, storageDeleted, storageDeleteSkipped };
    }),

  setPrimaryMedia: adminProcedure
    .input(inventorySetPrimaryMediaInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const rows = await listVehicleMediaRows(input.vehicleId);
      const selected = rows.find((row) => row.id === input.mediaId);
      if (!selected) throw new Error("Mídia não encontrada");
      if (selected.mediaType !== "image") throw new Error("Apenas imagens podem ser definidas como principal.");

      const imageRows = rows.filter((row) => row.mediaType === "image");
      await Promise.all(imageRows.map((row) =>
        db.update(inventoryVehicleMedia)
          .set({ isPrimary: row.id === input.mediaId })
          .where(and(
            eq(inventoryVehicleMedia.id, row.id),
            eq(inventoryVehicleMedia.tenantId, getCurrentTenantId()),
          ))
      ));

      await syncLegacyVehicleMediaFields(input.vehicleId);
      await createAuditLog({
        inventoryId: input.vehicleId,
        action: "updated",
        actor: ctx.user,
        summary: "Foto principal do veículo atualizada",
        changedFields: ["photoUrl", "photos"],
        metadata: { mediaId: input.mediaId },
      });

      return { success: true };
    }),

  reorderMedia: adminProcedure
    .input(inventoryReorderMediaInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const rows = await listVehicleMediaRows(input.vehicleId);
      if (rows.length === 0) return { success: true };

      const rowMap = new Map(rows.map((row) => [row.id, row]));
      for (const id of input.orderedIds) {
        if (!rowMap.has(id)) throw new Error("Ordenação contém mídia inválida.");
      }

      const untouched = rows.filter((row) => !input.orderedIds.includes(row.id));
      const nextOrder = [...input.orderedIds, ...untouched.map((row) => row.id)];

      await Promise.all(nextOrder.map((id, index) =>
        db.update(inventoryVehicleMedia)
          .set({ sortOrder: index })
          .where(and(
            eq(inventoryVehicleMedia.id, id),
            eq(inventoryVehicleMedia.tenantId, getCurrentTenantId()),
          ))
      ));

      await syncLegacyVehicleMediaFields(input.vehicleId);
      await createAuditLog({
        inventoryId: input.vehicleId,
        action: "updated",
        actor: ctx.user,
        summary: "Ordem da mídia do veículo atualizada",
        changedFields: ["photos"],
        metadata: { orderedIds: nextOrder },
      });

      return { success: true };
    }),

  sync: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    const tenantId = getCurrentTenantId();
    const [tenant] = await db.select({ inventoryUrl: tenants.inventoryUrl }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (!tenant?.inventoryUrl) throw new Error("URL de estoque não configurada para esta loja");
    const result = await syncInventory(tenantId, tenant.inventoryUrl);
    return result;
  }),

  syncLogs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(inventorySyncLogs)
      .where(eq(inventorySyncLogs.tenantId, getCurrentTenantId()))
      .orderBy(desc(inventorySyncLogs.createdAt))
      .limit(20);
  }),

  createDetailed: adminProcedure
    .input(inventoryCreateDetailedInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const duplicateResult = await validateDuplicates({ plate: input.plate, chassis: input.chassis, renavam: input.renavam });
      if (duplicateResult.hasDuplicate) {
        throw new Error("Já existe veículo com placa, chassi ou renavam informados.");
      }
      const insertPayload = toInventoryInsert(input);
      ensurePublishable(insertPayload);
      const result = await db.insert(inventoryVehicles).values(insertPayload);
      const id = Number(result[0].insertId);
      await replaceExternalVehicleMedia({
        vehicleId: id,
        photoUrl: input.photoUrl,
        photos: input.photos,
        videoUrl: input.videoUrl,
        actorId: ctx.user?.id ?? null,
      });
      await createAuditLog({
        inventoryId: id,
        action: "created",
        actor: ctx.user,
        summary: `Veículo criado: ${insertPayload.brand} ${insertPayload.model}`,
        changedFields: Object.keys(insertPayload),
        metadata: { sourceType: insertPayload.sourceType, status: insertPayload.status },
      });
      return { id };
    }),

  updateDetailed: adminProcedure
    .input(inventoryUpdateDetailedInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const current = await getVehicleById(input.id, true);
      if (!current || current.deletedAt) throw new Error("Veículo não encontrado");
      const duplicateResult = await validateDuplicates({ id: input.id, plate: input.plate, chassis: input.chassis, renavam: input.renavam });
      if (duplicateResult.hasDuplicate) {
        throw new Error("Já existe outro veículo com placa, chassi ou renavam informados.");
      }
      const payload = toInventoryUpdate(input);
      // Só exige checklist completo quando o veículo está sendo publicado agora
      // (transição de rascunho -> publicado). Editar um veículo já publicado —
      // típico de dados integrados/sincronizados — não é bloqueado.
      if (payload.isPublished && !current.isPublished) ensurePublishable(payload);
      const fieldDiffs = changedFields(current, payload as Record<string, unknown>);
      const [result] = await db
        .update(inventoryVehicles)
        .set(payload)
        .where(and(
          eq(inventoryVehicles.id, input.id),
          eq(inventoryVehicles.tenantId, getCurrentTenantId()),
          isNull(inventoryVehicles.deletedAt),
        ));
      if ((result as any)?.affectedRows === 0) throw new Error("Veículo não encontrado");
      await replaceExternalVehicleMedia({
        vehicleId: input.id,
        photoUrl: input.photoUrl,
        photos: input.photos,
        videoUrl: input.videoUrl,
        actorId: ctx.user?.id ?? null,
      });
      await createAuditLog({
        inventoryId: input.id,
        action: fieldDiffs.includes("status") ? "status_changed" : "updated",
        actor: ctx.user,
        summary: fieldDiffs.includes("status") ? `Status alterado para ${payload.status}` : `Veículo atualizado: ${payload.brand} ${payload.model}`,
        changedFields: fieldDiffs,
        metadata: { fromStatus: current.status, toStatus: payload.status },
      });
      return { success: true };
    }),

  delete: adminProcedure
    .input(inventorySoftDeleteInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const current = await getVehicleById(input.id, true);
      if (!current || current.deletedAt) throw new Error("Veículo não encontrado");
      const [result] = await db
        .update(inventoryVehicles)
        .set({
          deletedAt: Date.now(),
          deletedBy: ctx.user?.id ?? null,
          deletedReason: input.reason,
          isPublished: false,
        })
        .where(and(eq(inventoryVehicles.id, input.id), eq(inventoryVehicles.tenantId, getCurrentTenantId()), isNull(inventoryVehicles.deletedAt)));
      if ((result as any)?.affectedRows === 0) throw new Error("Veículo não encontrado");
      await createAuditLog({
        inventoryId: input.id,
        action: "soft_deleted",
        actor: ctx.user,
        summary: `Veículo removido do estoque: ${current.brand} ${current.model}`,
        changedFields: ["deletedAt", "deletedBy", "deletedReason", "isPublished"],
        metadata: { reason: input.reason },
      });
      return { success: true };
    }),

  reserve: adminProcedure
    .input(z.object({ id: z.number(), sellerId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const current = await getVehicleById(input.id);
      if (!current) throw new Error("Veículo não encontrado");
      const [result] = await db.update(inventoryVehicles).set({ status: "reserved" })
        .where(and(eq(inventoryVehicles.id, input.id), eq(inventoryVehicles.tenantId, getCurrentTenantId()), isNull(inventoryVehicles.deletedAt)));
      if ((result as any)?.affectedRows === 0) throw new Error("Veículo não encontrado");
      await createAuditLog({
        inventoryId: input.id,
        action: "status_changed",
        actor: ctx.user,
        summary: "Veículo reservado",
        changedFields: ["status"],
        metadata: { fromStatus: current.status, toStatus: "reserved" },
      });
      return { success: true };
    }),

  markSold: adminProcedure
    .input(z.object({ id: z.number(), sellerId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const current = await getVehicleById(input.id);
      if (!current) throw new Error("Veículo não encontrado");
      const [result] = await db.update(inventoryVehicles).set({
        status: "sold",
        soldBySellerId: input.sellerId,
        soldAt: Date.now(),
      }).where(and(eq(inventoryVehicles.id, input.id), eq(inventoryVehicles.tenantId, getCurrentTenantId()), isNull(inventoryVehicles.deletedAt)));
      if ((result as any)?.affectedRows === 0) throw new Error("Veículo não encontrado");
      await createAuditLog({
        inventoryId: input.id,
        action: "status_changed",
        actor: ctx.user,
        summary: "Veículo marcado como vendido",
        changedFields: ["status", "soldBySellerId", "soldAt"],
        metadata: { fromStatus: current.status, toStatus: "sold", sellerId: input.sellerId },
      });
      return { success: true };
    }),

  markAvailable: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      const current = await getVehicleById(input.id);
      if (!current) throw new Error("Veículo não encontrado");
      const [result] = await db.update(inventoryVehicles).set({
        status: "available",
        soldBySellerId: null,
        soldAt: null,
      }).where(and(eq(inventoryVehicles.id, input.id), eq(inventoryVehicles.tenantId, getCurrentTenantId()), isNull(inventoryVehicles.deletedAt)));
      if ((result as any)?.affectedRows === 0) throw new Error("Veículo não encontrado");
      await createAuditLog({
        inventoryId: input.id,
        action: "restored",
        actor: ctx.user,
        summary: "Veículo disponibilizado novamente",
        changedFields: ["status", "soldBySellerId", "soldAt"],
        metadata: { fromStatus: current.status, toStatus: "available" },
      });
      return { success: true };
    }),

  proxyPhoto: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      const response = await fetch(input.url);
      if (!response.ok) throw new Error("Failed to fetch image");
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";
      return { data: base64, contentType };
    }),
});
