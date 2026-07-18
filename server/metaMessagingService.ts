import * as crmDb from "./crmDb";
import { getCurrentTenantId } from "./tenantDb";

// ===== TENANT-AWARE META (MESSENGER/INSTAGRAM) SEND API =====
// Supports TWO token types:
// 1. Instagram User Access Token (starts with "IGAA") → uses graph.instagram.com/<IG_ID>/messages
//    with Authorization: Bearer header (Instagram API with Instagram Login)
// 2. Facebook Page Access Token (starts with "EAA") → uses graph.facebook.com/v21.0/me/messages
//    with access_token query param (Messenger Platform / Business Messaging)

const GRAPH_FB_BASE = "https://graph.facebook.com/v21.0";
const GRAPH_IG_BASE = "https://graph.instagram.com/v21.0";

interface CachedConfig {
  token: string;
  igUserId: string | null;
  expiresAt: number;
}

const configCache = new Map<number, CachedConfig>();
const CACHE_TTL = 5 * 60 * 1000;

async function getMetaConfig(): Promise<{ token: string; igUserId: string | null } | null> {
  const tenantId = getCurrentTenantId();
  const cached = configCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return { token: cached.token, igUserId: cached.igUserId };

  const integration = await crmDb.getIntegrationByType("facebook");
  if (!integration?.config) return null;
  try {
    const config = JSON.parse(integration.config);
    const token = config.pageAccessToken || null;
    const igUserId = config.igUserId || null;
    if (token) {
      configCache.set(tenantId, { token, igUserId, expiresAt: Date.now() + CACHE_TTL });
    }
    return token ? { token, igUserId } : null;
  } catch {
    return null;
  }
}

/** Determine if token is Instagram User Token (IGAA...) vs Facebook Page Token (EAA...) */
function isInstagramToken(token: string): boolean {
  return token.startsWith("IGAA");
}

/**
 * Build the correct fetch call based on token type.
 * - Instagram tokens: POST to graph.instagram.com/me/messages with Bearer auth
 * - Page tokens: POST to graph.facebook.com/v21.0/me/messages?access_token=...
 */
async function callSendAPI(token: string, _igUserId: string | null, body: object): Promise<Response> {
  if (isInstagramToken(token)) {
    // Instagram API with Instagram Login — always use /me/messages
    // The token itself identifies the account, no need for explicit IG user ID
    const url = `${GRAPH_IG_BASE}/me/messages`;
    console.log(`[Meta Send API] Using Instagram API: POST ${url}`);
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } else {
    // Messenger Platform (Facebook Page token)
    const url = `${GRAPH_FB_BASE}/me/messages?access_token=${token}`;
    console.log(`[Meta Send API] Using Facebook Page API: POST ${GRAPH_FB_BASE}/me/messages`);
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
}

/** Send a text message to a Messenger PSID or Instagram IGSID */
export async function sendText(recipientId: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await getMetaConfig();
    if (!config) {
      console.error(`[Meta Send API] No pageAccessToken found for tenant ${getCurrentTenantId()}`);
      return { success: false, error: "Page Access Token nao configurado" };
    }

    const body: any = {
      recipient: { id: recipientId },
      message: { text },
    };
    // messaging_type is only used by Messenger Platform (Page tokens), not Instagram API
    if (!isInstagramToken(config.token)) {
      body.messaging_type = "RESPONSE";
    }

    const res = await callSendAPI(config.token, config.igUserId, body);
    const data = await res.json() as any;
    if (!res.ok || data.error) {
      console.error(`[Meta Send API] Error sending to ${recipientId}: ${data.error?.message || `HTTP ${res.status}`}`, data.error);
      return { success: false, error: data.error?.message || `HTTP ${res.status}` };
    }
    console.log(`[Meta Send API] Successfully sent message to ${recipientId}, messageId=${data.message_id}`);
    return { success: true, messageId: data.message_id };
  } catch (err: any) {
    console.error(`[Meta Send API] Exception sending to ${recipientId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send an image. A Send API da Meta nao aceita legenda embutida no anexo — se
 * `caption` for informado, ele e enviado como uma mensagem de texto separada logo
 * em seguida (mesmo efeito visual que o WhatsApp da via zapi.sendImage com caption).
 */
export async function sendImage(recipientId: string, imageUrl: string, caption?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getMetaConfig();
    if (!config) return { success: false, error: "Page Access Token nao configurado" };

    const body: any = {
      recipient: { id: recipientId },
      message: { attachment: { type: "image", payload: { url: imageUrl, is_reusable: true } } },
    };
    if (!isInstagramToken(config.token)) {
      body.messaging_type = "RESPONSE";
    }

    const res = await callSendAPI(config.token, config.igUserId, body);
    const data = await res.json() as any;
    if (!res.ok || data.error) {
      console.error(`[Meta Send API] Error sending image to ${recipientId}: ${data.error?.message || `HTTP ${res.status}`}`, data.error);
      return { success: false, error: data.error?.message || `HTTP ${res.status}` };
    }
    if (caption) {
      await sendText(recipientId, caption);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Responde um comentario de post/anuncio via Private Reply, abrindo uma DM com quem
 * comentou (Messenger e Instagram). Sujeito as regras da Meta: so funciona ate 7 dias
 * apos o comentario e uma unica vez por comentario.
 */
export async function sendPrivateReply(commentId: string, text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getMetaConfig();
    if (!config) return { success: false, error: "Page Access Token nao configurado" };
    // Private replies always use graph.facebook.com regardless of token type
    const url = isInstagramToken(config.token)
      ? `${GRAPH_IG_BASE}/${commentId}/private_replies`
      : `${GRAPH_FB_BASE}/${commentId}/private_replies?access_token=${config.token}`;
    
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (isInstagramToken(config.token)) {
      headers["Authorization"] = `Bearer ${config.token}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json() as any;
    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Validate the current token by calling the Meta API. Returns status info. */
export async function validateToken(): Promise<{
  valid: boolean;
  username?: string;
  accountId?: string;
  tokenType?: "instagram" | "facebook_page";
  error?: string;
  errorCode?: number;
}> {
  try {
    const config = await getMetaConfig();
    if (!config) return { valid: false, error: "Token não configurado" };

    const isIG = isInstagramToken(config.token);
    const tokenType = isIG ? "instagram" as const : "facebook_page" as const;
    const testUrl = isIG
      ? `https://graph.instagram.com/me?fields=id,username&access_token=${config.token}`
      : `https://graph.facebook.com/v21.0/me?access_token=${config.token}`;

    const resp = await fetch(testUrl);
    const data = await resp.json() as any;

    if (data.error) {
      return {
        valid: false,
        tokenType,
        error: data.error.message,
        errorCode: data.error.code,
      };
    }

    return {
      valid: true,
      tokenType,
      username: data.username || data.name,
      accountId: data.id,
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

/** Clear cached config for a tenant (call when Meta config changes) */
export function clearTokenCache(tenantId?: number): void {
  if (tenantId) {
    configCache.delete(tenantId);
  } else {
    configCache.clear();
  }
}
