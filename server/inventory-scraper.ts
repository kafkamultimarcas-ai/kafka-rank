import { getDb, withRetry } from "./db";
import { inventoryVehicles, inventorySyncLogs } from "../drizzle/schema";
import { eq, and, ne, notInArray } from "drizzle-orm";

const BASE_URL = "https://www.kafkamultimarcas.com.br";
const STOCK_PAGE_URL = `${BASE_URL}/estoque`;
const API_URL = `${BASE_URL}/acoes.php?acao=pegarEstoque`;
const COD_LOJA = "1750"; // Kafka Multimarcas store code on LitoralCar

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
 * Fetch the stock data from kafkamultimarcas.com.br API.
 * The site uses Mod_Security which blocks direct API calls.
 * We first visit the stock page to get a session cookie (PHPSESSID),
 * then use that cookie to call the pegarEstoque API endpoint.
 */
async function fetchStockData(): Promise<LitoralCarResponse | null> {
  try {
    // Step 1: Get session cookie from the main page
    const pageResp = await fetch(STOCK_PAGE_URL, {
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
    const apiResp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": STOCK_PAGE_URL,
        "Origin": BASE_URL,
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

/** Build photo URL from filename and vehicle code */
function buildPhotoUrl(codVeiculo: string, filename: string): string {
  return `https://litoralcar.com.br/foto-resize-site/M/${codVeiculo}/${COD_LOJA}/${filename}`;
}

/** Build the external URL for a vehicle on the Kafka site */
function buildExternalUrl(vehicle: LitoralCarVehicle): string {
  const slug = (vehicle.veiculo2 + " " + vehicle.ano + " " + vehicle.cor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${BASE_URL}/veiculo/${slug}/${vehicle.cod_veiculo}`;
}

/** Parse price string like "89990.00" to integer reais */
function parsePrice(val: string): number {
  if (!val || val === "0.00") return 0;
  return Math.round(parseFloat(val));
}

/** Main sync function - fetches API data and updates the database */
export async function syncInventory(): Promise<{
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

    console.log("[Inventory Sync] Starting sync from kafkamultimarcas.com.br...");

    const data = await fetchStockData();

    if (!data || data.veiculos.length === 0) {
      const duration = Date.now() - startTime;
      await db.insert(inventorySyncLogs).values({
        status: "error",
        vehiclesFound: 0,
        errorMessage: "No vehicles found - possible API failure",
        duration,
      });
      return { found: 0, added: 0, updated: 0, removed: 0, error: "No vehicles found" };
    }

    const vehicles = data.veiculos;
    console.log(`[Inventory Sync] API returned ${vehicles.length} vehicles`);

    let added = 0;
    let updated = 0;

    const syncedExternalIds: string[] = [];

    for (const v of vehicles) {
      const externalId = v.cod_veiculo;
      syncedExternalIds.push(externalId);

      // Build photo URLs
      const mainPhotoUrl = v.fotos && v.fotos.length > 0
        ? buildPhotoUrl(externalId, v.fotos[0])
        : "";
      const allPhotos = (v.fotos || []).map((f: string) => buildPhotoUrl(externalId, f));

      // Extract optionals as simple string array
      const optionalsList = (v.opcionais || []).map((o: { descricao: string }) => o.descricao);

      const vehicleData = {
        externalId,
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
        externalUrl: buildExternalUrl(v),
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
        .where(eq(inventoryVehicles.externalId, externalId))
        .limit(1));

      if (existing.length > 0) {
        // Only update if not manually marked as sold
        if (existing[0].status !== "sold") {
          await withRetry(() => db
            .update(inventoryVehicles)
            .set(vehicleData)
            .where(eq(inventoryVehicles.externalId, externalId)));
          updated++;
        }
      } else {
        await withRetry(() => db.insert(inventoryVehicles).values({
          ...vehicleData,
          status: "available",
        }));
        added++;
      }
    }

    // Mark vehicles that are no longer in the API as removed (probably sold)
    let removed = 0;
    if (syncedExternalIds.length > 0) {
      // Only mark "available" vehicles as sold if they disappeared from the API
      await db
        .update(inventoryVehicles)
        .set({ status: "sold", lastSyncedAt: Date.now() })
        .where(
          and(
            notInArray(inventoryVehicles.externalId, syncedExternalIds),
            eq(inventoryVehicles.status, "available")
          )
        );
    }

    const duration = Date.now() - startTime;
    console.log(`[Inventory Sync] Done in ${duration}ms. Found: ${vehicles.length}, Added: ${added}, Updated: ${updated}`);

    await db.insert(inventorySyncLogs).values({
      status: "success",
      vehiclesFound: vehicles.length,
      vehiclesAdded: added,
      vehiclesUpdated: updated,
      vehiclesRemoved: removed,
      duration,
    });

    return { found: vehicles.length, added, updated, removed };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error("[Inventory Sync] Error:", err);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(inventorySyncLogs).values({
          status: "error",
          vehiclesFound: 0,
          errorMessage: err.message || String(err),
          duration,
        });
      }
    } catch (_) { /* ignore logging error */ }
    return { found: 0, added: 0, updated: 0, removed: 0, error: err.message };
  }
}

/** Start the periodic sync job */
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startInventorySync(intervalMinutes: number = 15) {
  // Run immediately on startup
  syncInventory().catch(console.error);

  // Then run periodically
  syncInterval = setInterval(() => {
    syncInventory().catch(console.error);
  }, intervalMinutes * 60 * 1000);

  console.log(`[Inventory Sync] Scheduled every ${intervalMinutes} minutes`);
}

export function stopInventorySync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
