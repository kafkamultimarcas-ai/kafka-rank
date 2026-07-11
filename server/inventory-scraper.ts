import { getDb, withRetry } from "./db";
import { inventoryVehicles, inventorySyncLogs, tenants } from "../drizzle/schema";
import { eq, and, ne, notInArray } from "drizzle-orm";
import { withTenantAsync } from "./tenantDb";
import * as crmDb from "./crmDb";

/** Notifica vendedores cujos leads têm interesse compatível com um veículo recém-adicionado */
async function notifyMatchingLeads(tenantId: number, inventoryId: number, brand: string, model: string): Promise<void> {
  try {
    await withTenantAsync(tenantId, async () => {
      const matchingLeads = await crmDb.getLeadsByVehicleInterest(`${brand} ${model}`);
      for (const lead of matchingLeads) {
        await crmDb.createInventoryAlert({ inventoryId, leadId: lead.id, sellerId: lead.sellerId });
      }
    });
  } catch (err: any) {
    console.error(`[Inventory Sync] tenant=${tenantId} Failed to create inventory alerts:`, err.message);
  }
}

interface LitoralCarVehicle {
  cod_veiculo: string;
  cod_importacao: string;
  categoria: string;
  marca: string;
  modelo: string;
  tipo_categoria: string;
  motor: string;
  valvulas: string;
  versao: string;
  veiculo: string;
  veiculo2: string;
  combustivel: string;
  cor: string;
  ano: string;
  valor: string;
  valor_oferta: string;
  valor_fipe: string;
  km: string;
  obs: string;
  obs_site: string;
  placa: string;
  portas: string;
  cambio: string;
  estado: string;
  opcionais: { codigo: string; descricao: string }[];
  fotos: string[];
}

interface LitoralCarResponse {
  cod_loja: string;
  veiculos: LitoralCarVehicle[];
}

/**
 * Fetch the stock data from the store's own LitoralCar-based site.
 * The site uses Mod_Security which blocks direct API calls.
 * We first visit the stock page to get a session cookie (PHPSESSID),
 * then use that cookie to call the pegarEstoque API endpoint.
 */
async function fetchStockData(baseUrl: string): Promise<LitoralCarResponse | null> {
  const stockPageUrl = `${baseUrl}/estoque`;
  const apiUrl = `${baseUrl}/acoes.php?acao=pegarEstoque`;
  try {
    // Step 1: Get session cookie from the main page
    const pageResp = await fetch(stockPageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    if (!pageResp.ok) {
      console.error(`[Inventory] Failed to load stock page: ${pageResp.status}`);
      return null;
    }

    // Extract cookies from Set-Cookie headers
    const setCookies = pageResp.headers.getSetCookie?.() || [];
    const cookieStr = setCookies.map((c: string) => c.split(";")[0]).join("; ");

    if (!cookieStr) {
      console.error("[Inventory] No session cookie received from stock page");
      return null;
    }

    // Step 2: Call the API with session cookie
    const apiResp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": stockPageUrl,
        "Origin": baseUrl,
        "Cookie": cookieStr,
      },
    });

    if (!apiResp.ok) {
      console.error(`[Inventory] API returned status ${apiResp.status}`);
      return null;
    }

    const data = (await apiResp.json()) as LitoralCarResponse;

    if (!data.veiculos || !Array.isArray(data.veiculos)) {
      console.error("[Inventory] Invalid API response - no veiculos array");
      return null;
    }

    return data;
  } catch (err: any) {
    console.error("[Inventory] Error fetching stock data:", err.message);
    return null;
  }
}

/** Build photo URL from filename, vehicle code and store code */
function buildPhotoUrl(codVeiculo: string, filename: string, codLoja: string): string {
  return `https://litoralcar.com.br/foto-resize-site/M/${codVeiculo}/${codLoja}/${filename}`;
}

/** Build the external URL for a vehicle on the store's own site */
function buildExternalUrl(vehicle: LitoralCarVehicle, baseUrl: string): string {
  const slug = (vehicle.veiculo2 + " " + vehicle.ano + " " + vehicle.cor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${baseUrl}/veiculo/${slug}/${vehicle.cod_veiculo}`;
}

/** Parse price string like "89990.00" to integer reais */
function parsePrice(val: string): number {
  if (!val || val === "0.00") return 0;
  return Math.round(parseFloat(val));
}

/** Main sync function - fetches API data for a single tenant and updates the database */
export async function syncInventory(tenantId: number, baseUrl: string): Promise<{
  found: number;
  added: number;
  updated: number;
  removed: number;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const db = await getDb();
    if (!db) return { found: 0, added: 0, updated: 0, removed: 0, error: "DB not available" };

    console.log(`[Inventory Sync] tenant=${tenantId} Starting sync from ${baseUrl}...`);

    const data = await fetchStockData(baseUrl);

    if (!data || data.veiculos.length === 0) {
      const duration = Date.now() - startTime;
      await db.insert(inventorySyncLogs).values({
        status: "error",
        vehiclesFound: 0,
        errorMessage: "No vehicles found - possible API failure",
        duration,
        tenantId,
      });
      return { found: 0, added: 0, updated: 0, removed: 0, error: "No vehicles found" };
    }

    const vehicles = data.veiculos;
    const codLoja = data.cod_loja;
    console.log(`[Inventory Sync] tenant=${tenantId} API returned ${vehicles.length} vehicles`);

    let added = 0;
    let updated = 0;

    const syncedExternalIds: string[] = [];

    for (const v of vehicles) {
      const externalId = v.cod_veiculo;
      syncedExternalIds.push(externalId);

      // Build photo URLs
      const mainPhotoUrl = v.fotos && v.fotos.length > 0
        ? buildPhotoUrl(externalId, v.fotos[0], codLoja)
        : "";
      const allPhotos = (v.fotos || []).map((f: string) => buildPhotoUrl(externalId, f, codLoja));

      // Extract optionals as simple string array
      const optionalsList = (v.opcionais || []).map((o: { descricao: string }) => o.descricao);

      const vehicleData = {
        externalId,
        tenantId,
        brand: v.marca,
        model: v.modelo,
        version: v.versao || "",
        motor: v.motor || "",
        year: parseInt(v.ano) || 0,
        color: v.cor || "",
        fuel: v.combustivel || "",
        km: parseInt(v.km) || 0,
        price: parsePrice(v.valor),
        fipePrice: parsePrice(v.valor_fipe),
        offerPrice: parsePrice(v.valor_oferta),
        photoUrl: mainPhotoUrl,
        photos: JSON.stringify(allPhotos),
        optionals: JSON.stringify(optionalsList),
        externalUrl: buildExternalUrl(v, baseUrl),
        slug: `/veiculo/${externalId}`,
        bodyType: v.tipo_categoria || "",
        transmission: v.cambio || "",
        plate: v.placa || "",
        doors: v.portas || "",
        vehicleState: v.estado || "",
        category: v.categoria || "",
        observation: v.obs_site || v.obs || "",
        lastSyncedAt: Date.now(),
      };

      const existing = await withRetry(() => db
        .select()
        .from(inventoryVehicles)
        .where(and(eq(inventoryVehicles.tenantId, tenantId), eq(inventoryVehicles.externalId, externalId)))
        .limit(1));

      if (existing.length > 0) {
        // Only update if not manually marked as sold
        if (existing[0].status !== "sold") {
          await withRetry(() => db
            .update(inventoryVehicles)
            .set(vehicleData)
            .where(and(eq(inventoryVehicles.tenantId, tenantId), eq(inventoryVehicles.externalId, externalId))));
          updated++;
        }
      } else {
        const [insertResult] = await withRetry(() => db.insert(inventoryVehicles).values({
          ...vehicleData,
          status: "available",
        }));
        added++;
        await notifyMatchingLeads(tenantId, Number(insertResult.insertId), v.marca, v.modelo);
      }
    }

    // Mark vehicles that are no longer in the API as removed (probably sold)
    let removed = 0;
    if (syncedExternalIds.length > 0) {
      // Only mark "available" vehicles as sold if they disappeared from the API
      const [result] = await db
        .update(inventoryVehicles)
        .set({ status: "sold", lastSyncedAt: Date.now() })
        .where(
          and(
            eq(inventoryVehicles.tenantId, tenantId),
            notInArray(inventoryVehicles.externalId, syncedExternalIds),
            eq(inventoryVehicles.status, "available")
          )
        );
      removed = (result as any)?.affectedRows ?? 0;
    }

    const duration = Date.now() - startTime;
    console.log(`[Inventory Sync] tenant=${tenantId} Done in ${duration}ms. Found: ${vehicles.length}, Added: ${added}, Updated: ${updated}, Removed: ${removed}`);

    await db.insert(inventorySyncLogs).values({
      status: "success",
      vehiclesFound: vehicles.length,
      vehiclesAdded: added,
      vehiclesUpdated: updated,
      vehiclesRemoved: removed,
      duration,
      tenantId,
    });

    return { found: vehicles.length, added, updated, removed };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[Inventory Sync] tenant=${tenantId} Error:`, err);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(inventorySyncLogs).values({
          status: "error",
          vehiclesFound: 0,
          errorMessage: err.message || String(err),
          duration,
          tenantId,
        });
      }
    } catch (_) { /* ignore logging error */ }
    return { found: 0, added: 0, updated: 0, removed: 0, error: err.message };
  }
}

/** Syncs every tenant that has its own inventory source URL configured */
export async function syncAllTenants(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  let activeTenants: Array<{ id: number; inventoryUrl: string | null }>;
  try {
    activeTenants = await db
      .select({ id: tenants.id, inventoryUrl: tenants.inventoryUrl })
      .from(tenants)
      .where(ne(tenants.inventoryUrl, ""));
  } catch (err: any) {
    const code = err?.cause?.code || err?.code;
    if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND") {
      console.warn(`[Inventory Sync] DB unavailable (${code}) - skipping this run`);
      return;
    }
    throw err;
  }

  for (const tenant of activeTenants) {
    if (!tenant.inventoryUrl) continue;
    await syncInventory(tenant.id, tenant.inventoryUrl).catch((err) =>
      console.error(`[Inventory Sync] tenant=${tenant.id} Unhandled error:`, err)
    );
  }
}

/** Start the periodic sync job */
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startInventorySync(intervalMinutes: number = 15) {
  // Run immediately on startup
  syncAllTenants().catch(console.error);

  // Then run periodically
  syncInterval = setInterval(() => {
    syncAllTenants().catch(console.error);
  }, intervalMinutes * 60 * 1000);

  console.log(`[Inventory Sync] Scheduled every ${intervalMinutes} minutes`);
}

export function stopInventorySync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
