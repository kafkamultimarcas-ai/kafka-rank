import type { Express, Request, Response } from "express";
import crypto from "crypto";
import * as crmDb from "./crmDb";
import { getDb } from "./db";
import { sellers, crmLeadDistribution, inventoryVehicles, crmMessages } from "../drizzle/schema";
import { eq, and, asc, like, or, sql, desc, ne } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import * as zapi from "./zapi-service";
import { sendPushNewLead, sendPushLeadTransferred } from "./pushService";
import { createNotification } from "./db";

// ===== META GRAPH API HELPER =====
async function fetchMetaLeadData(leadgenId: string, pageAccessToken: string): Promise<{ name: string; phone: string | null; email: string | null; fields: Record<string, string> } | null> {
  try {
    const url = `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${pageAccessToken}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`Meta Graph API error: ${resp.status} ${resp.statusText}`);
      return null;
    }
    const data = await resp.json() as any;
    const fields: Record<string, string> = {};
    let name = "";
    let phone: string | null = null;
    let email: string | null = null;

    if (data.field_data && Array.isArray(data.field_data)) {
      for (const field of data.field_data) {
        const key = (field.name || "").toLowerCase();
        const val = Array.isArray(field.values) ? field.values[0] : field.values;
        fields[key] = val || "";
        if (key === "full_name" || key === "nome_completo" || key === "nome") name = val || "";
        if (key === "email") email = val || null;
        if (key === "phone_number" || key === "telefone" || key === "whatsapp") phone = val || null;
      }
    }
    if (!name) name = fields["first_name"] ? `${fields["first_name"]} ${fields["last_name"] || ""}`.trim() : "";
    return { name: name || `Meta Lead #${leadgenId}`, phone, email, fields };
  } catch (err) {
    console.error("Error fetching Meta lead data:", err);
    return null;
  }
}

// Verify Meta webhook signature
function verifyMetaSignature(payload: string, signature: string, appSecret: string): boolean {
  if (!signature || !appSecret) return false;
  const expectedSig = "sha256=" + crypto.createHmac("sha256", appSecret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
}

/**
 * Public webhook endpoints for external integrations.
 * Validates API token from `x-api-token` header against crm_integrations table.
 * 
 * ENDPOINTS:
 *   POST /api/webhooks/lead                — Create lead (generic)
 *   POST /api/webhooks/leads/bulk          — Bulk create leads (max 100)
 *   POST /api/webhooks/meta/leadgen        — Meta Lead Ads (Instagram/Facebook)
 *   POST /api/webhooks/google/lead         — Google Ads Lead Form
 *   POST /api/webhooks/generic             — Generic webhook (any platform/chatbot)
 *   POST /api/webhooks/email-parser        — Parse forwarded emails from OLX/Webmotors/etc
 *   POST /api/webhooks/whatsapp            — WhatsApp messages
 *   POST /api/webhooks/sig/sale            — SIG Web sale sync
 *   POST /api/webhooks/widget/lead         — Widget/landing page form (NO auth needed)
 *   GET  /api/webhooks/meta/verify         — Meta webhook verification
 *   GET  /api/webhooks/health              — Health check
 *   GET  /api/webhooks/docs                — API documentation
 */

async function validateToken(req: Request, res: Response): Promise<boolean> {
  const token = req.headers["x-api-token"] as string;
  if (!token) {
    res.status(401).json({ error: "Token de API obrigatorio. Envie no header x-api-token." });
    return false;
  }
  const integration = await crmDb.getIntegrationByToken(token);
  if (!integration || !integration.active) {
    res.status(403).json({ error: "Token invalido ou integracao desativada." });
    return false;
  }
  return true;
}

// Auto-assign lead to next seller via round-robin
async function autoAssignLead(leadId: number, department: string): Promise<{ sellerId: number | null; sellerName: string | null }> {
  try {
    const database = await getDb();
    if (!database) return { sellerId: null, sellerName: null };

    // Always use pre_vendas distribution config - leads go to SDRs first
    const sdrDept = "pre_vendas";
    const [config] = await database.select().from(crmLeadDistribution)
      .where(eq(crmLeadDistribution.department, sdrDept)).limit(1);
    
    // If no SDR distribution config, try the original department
    if (!config || !config.enabled) {
      const [fallbackConfig] = await database.select().from(crmLeadDistribution)
        .where(eq(crmLeadDistribution.department, department)).limit(1);
      if (!fallbackConfig || !fallbackConfig.enabled) return { sellerId: null, sellerName: null };
      
      // Fallback: use original department but only SDR sellers (exclude gerentes)
      const sdrSellers = await database.select().from(sellers)
        .where(and(eq(sellers.department, "pre_vendas"), eq(sellers.active, true), ne(sellers.sellerRole, "gerente")))
        .orderBy(asc(sellers.id));
      
      // If no SDRs, fall back to department sellers (exclude gerentes)
      const targetSellers = sdrSellers.length > 0 ? sdrSellers : 
        await database.select().from(sellers)
          .where(and(eq(sellers.department, department), eq(sellers.active, true), ne(sellers.sellerRole, "gerente")))
          .orderBy(asc(sellers.id));
      
      if (targetSellers.length === 0) return { sellerId: null, sellerName: null };
      
      let nextSeller;
      if (fallbackConfig.lastAssignedSellerId) {
        const idx = targetSellers.findIndex(s => s.id === fallbackConfig.lastAssignedSellerId);
        nextSeller = targetSellers[(idx + 1) % targetSellers.length];
      } else {
        nextSeller = targetSellers[0];
      }
      
      await crmDb.updateLead(leadId, { sellerId: nextSeller.id });
      await database.update(crmLeadDistribution)
        .set({ lastAssignedSellerId: nextSeller.id })
        .where(eq(crmLeadDistribution.department, department));
      
      // Notify seller about new lead
      const leadData = await crmDb.getLeadById(leadId);
      sendPushNewLead(nextSeller.id, leadData?.name || 'Novo Lead', leadData?.phone || null, leadData?.source || null, leadData?.vehicleInterest || null).catch(console.error);
      createNotification({
        title: '\ud83d\udea8 NOVO LEAD!',
        message: `Voc\u00ea recebeu o lead ${leadData?.name || 'Novo Lead'}${leadData?.phone ? ' - ' + leadData.phone : ''}. Responda r\u00e1pido!`,
        type: 'urgent',
        sellerId: nextSeller.id,
        targetType: 'seller',
      }).catch(console.error);
      
      return { sellerId: nextSeller.id, sellerName: nextSeller.name };
    }

    // Primary: distribute to SDR sellers only (exclude gerentes)
    const sdrSellers = await database.select().from(sellers)
      .where(and(eq(sellers.department, sdrDept), eq(sellers.active, true), ne(sellers.sellerRole, "gerente")))
      .orderBy(asc(sellers.id));

    if (sdrSellers.length === 0) return { sellerId: null, sellerName: null };

    let nextSeller;
    if (config.lastAssignedSellerId) {
      const idx = sdrSellers.findIndex(s => s.id === config.lastAssignedSellerId);
      nextSeller = sdrSellers[(idx + 1) % sdrSellers.length];
    } else {
      nextSeller = sdrSellers[0];
    }

    await crmDb.updateLead(leadId, { sellerId: nextSeller.id });
    await database.update(crmLeadDistribution)
      .set({ lastAssignedSellerId: nextSeller.id })
      .where(eq(crmLeadDistribution.department, sdrDept));

    // Notify seller about new lead
    const leadInfo = await crmDb.getLeadById(leadId);
    sendPushNewLead(nextSeller.id, leadInfo?.name || 'Novo Lead', leadInfo?.phone || null, leadInfo?.source || null, leadInfo?.vehicleInterest || null).catch(console.error);
    createNotification({
      title: '\ud83d\udea8 NOVO LEAD!',
      message: `Voc\u00ea recebeu o lead ${leadInfo?.name || 'Novo Lead'}${leadInfo?.phone ? ' - ' + leadInfo.phone : ''}. Responda r\u00e1pido!`,
      type: 'urgent',
      sellerId: nextSeller.id,
      targetType: 'seller',
    }).catch(console.error);

    console.log(`[Lead Distribution] Lead #${leadId} assigned to SDR ${nextSeller.name} (ID: ${nextSeller.id})`);
    return { sellerId: nextSeller.id, sellerName: nextSeller.name };
  } catch {
    return { sellerId: null, sellerName: null };
  }
}

// Detect source from email body
function detectEmailSource(body: string, subject: string): string {
  const text = (body + " " + subject).toLowerCase();
  if (text.includes("olx")) return "olx";
  if (text.includes("webmotors")) return "webmotors";
  if (text.includes("socarrao") || text.includes("só carrão") || text.includes("socarrão")) return "socarrao";
  if (text.includes("icarros")) return "icarros";
  if (text.includes("mercadolivre") || text.includes("mercado livre")) return "olx";
  if (text.includes("facebook")) return "facebook";
  if (text.includes("instagram")) return "instagram";
  return "email";
}

// Parse name and phone from email body
function parseLeadFromEmail(body: string): { name: string | null; phone: string | null; email: string | null; vehicle: string | null } {
  const result: any = { name: null, phone: null, email: null, vehicle: null };

  // Try to extract phone
  const phoneMatch = body.match(/(?:tel|fone|telefone|whatsapp|celular)[:\s]*[(\s]*(\d{2})[)\s]*[\s.-]*(\d{4,5})[\s.-]*(\d{4})/i)
    || body.match(/\((\d{2})\)\s*(\d{4,5})-?(\d{4})/)
    || body.match(/(\d{2})\s*(\d{4,5})\s*-?\s*(\d{4})/);
  if (phoneMatch) {
    result.phone = phoneMatch[1] + phoneMatch[2] + phoneMatch[3];
  }

  // Try to extract email
  const emailMatch = body.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) result.email = emailMatch[0];

  // Try to extract name
  const nameMatch = body.match(/(?:nome|name|cliente|interessado)[:\s]*([A-ZÀ-Ú][a-zà-ú]+(?: [A-ZÀ-Ú][a-zà-ú]+)*)/i)
    || body.match(/(?:de|from)[:\s]*([A-ZÀ-Ú][a-zà-ú]+(?: [A-ZÀ-Ú][a-zà-ú]+)*)/i);
  if (nameMatch) result.name = nameMatch[1].trim();

  // Try to extract vehicle
  const vehicleMatch = body.match(/(?:veiculo|veículo|carro|interesse|modelo|anuncio|anúncio)[:\s]*([^\n,]+)/i);
  if (vehicleMatch) result.vehicle = vehicleMatch[1].trim().substring(0, 200);

  return result;
}

// Message deduplication cache (messageId -> timestamp)
const processedMessages = new Map<string, number>();
const DEDUP_TTL = 5 * 60 * 1000; // 5 minutes
function isDuplicate(messageId: string | null): boolean {
  if (!messageId) return false;
  const now = Date.now();
  // Clean old entries
  Array.from(processedMessages.entries()).forEach(([key, ts]) => {
    if (now - ts > DEDUP_TTL) processedMessages.delete(key);
  });
  if (processedMessages.has(messageId)) return true;
  processedMessages.set(messageId, now);
  return false;
}

// AI Auto-Reply lock per lead to prevent concurrent/duplicate AI replies
export const aiReplyLocks = new Map<number, number>();
const AI_LOCK_TTL = 30 * 1000; // 30 seconds lock per lead
function acquireAiLock(leadId: number): boolean {
  const now = Date.now();
  // Clean expired locks
  Array.from(aiReplyLocks.entries()).forEach(([key, ts]) => {
    if (now - ts > AI_LOCK_TTL) aiReplyLocks.delete(key);
  });
  if (aiReplyLocks.has(leadId)) {
    console.log(`[AI Auto-Reply] Lock active for lead #${leadId}, skipping duplicate`);
    return false;
  }
  aiReplyLocks.set(leadId, now);
  return true;
}
function releaseAiLock(leadId: number): void {
  aiReplyLocks.delete(leadId);
}

export function registerWebhookRoutes(app: Express) {
  // ===== HEALTH CHECK =====
  app.get("/api/webhooks/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: Date.now(), version: "2.0.0" });
  });

  // ===== GENERIC LEAD CREATION (with token) =====
  app.post("/api/webhooks/lead", async (req: Request, res: Response) => {
    try {
      if (!(await validateToken(req, res))) return;

      const { name, phone, email, vehicleInterest, vehiclePlate, source, department, notes, sellerId, score, utmSource, utmMedium, utmCampaign } = req.body;

      if (!name) {
        res.status(400).json({ error: "Campo 'name' e obrigatorio." });
        return;
      }

      const dept = department || "vendas";
      const defaultStage = await crmDb.getDefaultStage(dept);

      // Build notes with UTM data if present
      let fullNotes = notes || "";
      if (utmSource || utmMedium || utmCampaign) {
        fullNotes += `${fullNotes ? "\n" : ""}[UTM] source=${utmSource || ""} medium=${utmMedium || ""} campaign=${utmCampaign || ""}`;
      }

      const leadId = await crmDb.createLead({
        name,
        phone: phone || null,
        email: email || null,
        vehicleInterest: vehicleInterest || null,
        vehiclePlate: vehiclePlate || null,
        source: source || "api",
        department: dept,
        stage: defaultStage?.name || "Novo Lead",
        score: score || "warm",
        sellerId: sellerId || 0,
        notes: fullNotes || null,
      });

      await crmDb.createActivity({
        leadId,
        sellerId: sellerId || 0,
        type: "criacao",
        description: `Lead criado via API (${source || "api"})`,
      });

      // Auto-assign if no sellerId provided
      let assignment = { sellerId: sellerId || null, sellerName: null as string | null };
      if (!sellerId) {
        assignment = await autoAssignLead(leadId, dept);
      }

      let matchingVehicles = 0;
      if (vehicleInterest) {
        const inventory = await crmDb.listInventory({ search: vehicleInterest });
        matchingVehicles = inventory.length;
      }

      res.status(201).json({
        success: true,
        leadId,
        assignedTo: assignment.sellerName,
        assignedSellerId: assignment.sellerId,
        matchingVehicles,
        message: `Lead '${name}' criado com sucesso.`,
      });
    } catch (err: any) {
      console.error("Webhook lead error:", err);
      res.status(500).json({ error: "Erro interno ao criar lead.", details: err.message });
    }
  });

  // ===== BULK LEAD CREATION =====
  app.post("/api/webhooks/leads/bulk", async (req: Request, res: Response) => {
    try {
      if (!(await validateToken(req, res))) return;

      const { leads } = req.body;
      if (!Array.isArray(leads) || leads.length === 0) {
        res.status(400).json({ error: "Campo 'leads' deve ser um array com pelo menos 1 item." });
        return;
      }

      if (leads.length > 100) {
        res.status(400).json({ error: "Maximo de 100 leads por requisicao." });
        return;
      }

      const results = [];
      for (const lead of leads) {
        try {
          const dept = lead.department || "vendas";
          const defaultStage = await crmDb.getDefaultStage(dept);
          const leadId = await crmDb.createLead({
            name: lead.name,
            phone: lead.phone || null,
            email: lead.email || null,
            vehicleInterest: lead.vehicleInterest || null,
            vehiclePlate: lead.vehiclePlate || null,
            source: lead.source || "api",
            department: dept,
            stage: defaultStage?.name || "Novo Lead",
            score: lead.score || "warm",
            sellerId: lead.sellerId || 0,
            notes: lead.notes || null,
          });
          await crmDb.createActivity({
            leadId,
            sellerId: lead.sellerId || 0,
            type: "criacao",
            description: `Lead criado via API bulk (${lead.source || "api"})`,
          });
          if (!lead.sellerId) await autoAssignLead(leadId, dept);
          results.push({ name: lead.name, leadId, success: true });
        } catch (err: any) {
          results.push({ name: lead.name, success: false, error: err.message });
        }
      }

      res.status(201).json({
        success: true,
        total: leads.length,
        created: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    } catch (err: any) {
      console.error("Webhook bulk lead error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // ===== META LEAD ADS (Instagram/Facebook) =====
  // Verification endpoint for Meta webhook setup
  app.get("/api/webhooks/meta/verify", async (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"] as string;
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token) {
      // Validate verify_token against stored config
      const metaIntegration = await crmDb.getIntegrationByType("facebook");
      if (metaIntegration?.config) {
        try {
          const config = JSON.parse(metaIntegration.config);
          if (config.verifyToken && config.verifyToken !== token) {
            console.error("Meta webhook verify_token mismatch");
            res.status(403).json({ error: "Verification failed: token mismatch" });
            return;
          }
        } catch { /* config parse error, allow */ }
      }
      console.log("Meta webhook verified successfully");
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: "Verification failed" });
    }
  });

  // Receive leads from Meta Lead Ads
  app.post("/api/webhooks/meta/leadgen", async (req: Request, res: Response) => {
    try {
      const body = req.body;

      // Get Meta integration config for signature verification and Graph API
      const metaIntegration = await crmDb.getIntegrationByType("facebook");
      let appSecret = "";
      let pageAccessToken = "";
      if (metaIntegration?.config) {
        try {
          const config = JSON.parse(metaIntegration.config);
          appSecret = config.appSecret || "";
          pageAccessToken = config.pageAccessToken || "";
        } catch { /* ignore parse error */ }
      }

      // Verify X-Hub-Signature-256 if appSecret is configured
      if (appSecret) {
        const signature = req.headers["x-hub-signature-256"] as string;
        const rawBody = JSON.stringify(body);
        if (!verifyMetaSignature(rawBody, signature, appSecret)) {
          console.error("Meta webhook signature verification failed");
          res.status(403).json({ error: "Invalid signature" });
          return;
        }
      }

      // Meta webhook format: { object: "page", entry: [{ changes: [{ field: "leadgen", value: {...} }] }] }
      if (body.object === "page" && body.entry) {
        for (const entry of body.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === "leadgen") {
                const leadData = change.value;
                const leadgenId = leadData.leadgen_id?.toString();
                const dept = "vendas";
                const defaultStage = await crmDb.getDefaultStage(dept);

                // Try to fetch complete lead data from Meta Graph API
                let leadName = `Meta Lead #${leadgenId || Date.now()}`;
                let leadPhone: string | null = null;
                let leadEmail: string | null = null;
                let extraFields = "";

                if (leadgenId && pageAccessToken) {
                  const metaData = await fetchMetaLeadData(leadgenId, pageAccessToken);
                  if (metaData) {
                    leadName = metaData.name;
                    leadPhone = metaData.phone;
                    leadEmail = metaData.email;
                    // Store all extra fields in notes
                    const fieldEntries = Object.entries(metaData.fields).filter(([k]) => !['full_name','email','phone_number','nome_completo','nome','telefone','whatsapp','first_name','last_name'].includes(k));
                    if (fieldEntries.length > 0) {
                      extraFields = "\n" + fieldEntries.map(([k, v]) => `${k}: ${v}`).join("\n");
                    }
                  }
                }

                const source = leadData.ad_id ? "instagram_ads" : "facebook_ads";
                const leadId = await crmDb.createLead({
                  name: leadName,
                  phone: leadPhone,
                  email: leadEmail,
                  vehicleInterest: null,
                  vehiclePlate: null,
                  source,
                  department: dept,
                  stage: defaultStage?.name || "Novo Lead",
                  score: "hot",
                  sellerId: 0,
                  notes: `Meta Lead Ads\nForm ID: ${leadData.form_id || "N/A"}\nLead ID: ${leadgenId || "N/A"}\nCampaign: ${leadData.campaign_id || "N/A"}\nAd: ${leadData.ad_id || "N/A"}${extraFields}`,
                });

                await crmDb.createActivity({
                  leadId,
                  sellerId: 0,
                  type: "criacao",
                  description: `Lead recebido do ${source === "instagram_ads" ? "Instagram" : "Facebook"} Ads${leadPhone ? " (com telefone)" : ""}`,
                });

                await autoAssignLead(leadId, dept);
              }
            }
          }
        }
      }

      // Direct lead data format (from Zapier, Make, etc)
      if (body.name || body.full_name || body.first_name) {
        const name = body.name || body.full_name || `${body.first_name || ""} ${body.last_name || ""}`.trim();
        const phone = body.phone || body.phone_number || body.tel || null;
        const email = body.email || null;
        const vehicle = body.vehicle || body.vehicleInterest || body.car || null;
        const adSource = body.platform === "instagram" ? "instagram_ads" : "facebook_ads";

        const dept = body.department || "vendas";
        const defaultStage = await crmDb.getDefaultStage(dept);

        const leadId = await crmDb.createLead({
          name,
          phone,
          email,
          vehicleInterest: vehicle,
          vehiclePlate: null,
          source: body.source || adSource,
          department: dept,
          stage: defaultStage?.name || "Novo Lead",
          score: "hot",
          sellerId: 0,
          notes: body.notes || `Via Meta Ads${body.campaign_name ? ` - Campanha: ${body.campaign_name}` : ""}${body.ad_name ? ` - Anuncio: ${body.ad_name}` : ""}`,
        });

        await crmDb.createActivity({
          leadId,
          sellerId: 0,
          type: "criacao",
          description: `Lead recebido do ${adSource === "instagram_ads" ? "Instagram" : "Facebook"} Ads`,
        });

        const assignment = await autoAssignLead(leadId, dept);

        res.status(201).json({
          success: true,
          leadId,
          assignedTo: assignment.sellerName,
          message: `Lead '${name}' criado via Meta Ads.`,
        });
        return;
      }

      // Always respond 200 to Meta webhooks
      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Meta webhook error:", err);
      // Still respond 200 to prevent Meta from retrying
      res.status(200).json({ success: false, error: err.message });
    }
  });

  // ===== GOOGLE ADS LEAD FORM =====
  app.post("/api/webhooks/google/lead", async (req: Request, res: Response) => {
    try {
      // Google Ads sends lead form data via webhook
      // Format varies: direct from Google or via Zapier/Make
      const body = req.body;

      const name = body.name || body.full_name || body["user_column_data"]?.find?.((c: any) => c.column_id === "FULL_NAME")?.string_value || `Google Lead #${Date.now()}`;
      const phone = body.phone || body.phone_number || body["user_column_data"]?.find?.((c: any) => c.column_id === "PHONE_NUMBER")?.string_value || null;
      const email = body.email || body["user_column_data"]?.find?.((c: any) => c.column_id === "EMAIL")?.string_value || null;
      const vehicle = body.vehicle || body.vehicleInterest || null;

      const dept = body.department || "vendas";
      const defaultStage = await crmDb.getDefaultStage(dept);

      const leadId = await crmDb.createLead({
        name,
        phone,
        email,
        vehicleInterest: vehicle,
        vehiclePlate: null,
        source: "google_ads",
        department: dept,
        stage: defaultStage?.name || "Novo Lead",
        score: "hot",
        sellerId: 0,
        notes: `Via Google Ads${body.campaign_name ? ` - Campanha: ${body.campaign_name}` : ""}${body.form_id ? ` - Form: ${body.form_id}` : ""}`,
      });

      await crmDb.createActivity({
        leadId,
        sellerId: 0,
        type: "criacao",
        description: "Lead recebido do Google Ads",
      });

      const assignment = await autoAssignLead(leadId, dept);

      res.status(201).json({
        success: true,
        leadId,
        assignedTo: assignment.sellerName,
        message: `Lead '${name}' criado via Google Ads.`,
      });
    } catch (err: any) {
      console.error("Google Ads webhook error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // ===== GENERIC WEBHOOK (any platform, chatbot, Manychat, etc) =====
  app.post("/api/webhooks/generic", async (req: Request, res: Response) => {
    try {
      if (!(await validateToken(req, res))) return;

      const body = req.body;

      // Flexible field mapping - accepts many common field names
      const name = body.name || body.full_name || body.nome || body.customer_name || body.lead_name || body.first_name || "Lead sem nome";
      const phone = body.phone || body.phone_number || body.telefone || body.celular || body.whatsapp || body.tel || null;
      const email = body.email || body.e_mail || body.mail || null;
      const vehicle = body.vehicle || body.vehicleInterest || body.veiculo || body.carro || body.interesse || body.car || null;
      const source = body.source || body.origem || body.platform || body.canal || "webhook";
      const dept = body.department || body.setor || body.departamento || "vendas";
      const notes = body.notes || body.observacao || body.mensagem || body.message || body.comentario || null;

      const defaultStage = await crmDb.getDefaultStage(dept);

      // Build UTM notes
      let fullNotes = notes || "";
      if (body.utm_source || body.utm_medium || body.utm_campaign) {
        fullNotes += `${fullNotes ? "\n" : ""}[UTM] source=${body.utm_source || ""} medium=${body.utm_medium || ""} campaign=${body.utm_campaign || ""}`;
      }

      const leadId = await crmDb.createLead({
        name,
        phone,
        email,
        vehicleInterest: vehicle,
        vehiclePlate: body.plate || body.placa || null,
        source,
        department: dept,
        stage: defaultStage?.name || "Novo Lead",
        score: body.score || "warm",
        sellerId: 0,
        notes: fullNotes || null,
      });

      await crmDb.createActivity({
        leadId,
        sellerId: 0,
        type: "criacao",
        description: `Lead recebido via webhook generico (${source})`,
      });

      const assignment = await autoAssignLead(leadId, dept);

      res.status(201).json({
        success: true,
        leadId,
        assignedTo: assignment.sellerName,
        assignedSellerId: assignment.sellerId,
        message: `Lead '${name}' criado com sucesso.`,
      });
    } catch (err: any) {
      console.error("Generic webhook error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // ===== EMAIL PARSER (OLX, Webmotors, SóCarrão, iCarros) =====
  app.post("/api/webhooks/email-parser", async (req: Request, res: Response) => {
    try {
      if (!(await validateToken(req, res))) return;

      const { subject, body: emailBody, from: senderEmail, html } = req.body;

      if (!emailBody && !html && !subject) {
        res.status(400).json({ error: "Envie pelo menos 'subject' ou 'body' do email." });
        return;
      }

      const textContent = emailBody || html?.replace(/<[^>]*>/g, " ") || "";
      const source = detectEmailSource(textContent, subject || "");
      const parsed = parseLeadFromEmail(textContent);

      const name = parsed.name || `Lead ${source.toUpperCase()} - ${new Date().toLocaleDateString("pt-BR")}`;
      const dept = "vendas";
      const defaultStage = await crmDb.getDefaultStage(dept);

      const leadId = await crmDb.createLead({
        name,
        phone: parsed.phone,
        email: parsed.email || senderEmail || null,
        vehicleInterest: parsed.vehicle,
        vehiclePlate: null,
        source,
        department: dept,
        stage: defaultStage?.name || "Novo Lead",
        score: "warm",
        sellerId: 0,
        notes: `Origem: Email de ${source.toUpperCase()}\nAssunto: ${subject || "N/A"}\n\n--- Email original ---\n${textContent.substring(0, 1000)}`,
      });

      await crmDb.createActivity({
        leadId,
        sellerId: 0,
        type: "criacao",
        description: `Lead parseado de email (${source})`,
      });

      const assignment = await autoAssignLead(leadId, dept);

      res.status(201).json({
        success: true,
        leadId,
        source,
        parsedData: { name, phone: parsed.phone, email: parsed.email, vehicle: parsed.vehicle },
        assignedTo: assignment.sellerName,
        message: `Lead parseado do email (${source}) com sucesso.`,
      });
    } catch (err: any) {
      console.error("Email parser webhook error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // ===== WIDGET / LANDING PAGE FORM (NO auth required) =====
  app.post("/api/webhooks/widget/lead", async (req: Request, res: Response) => {
    try {
      // CORS headers for widget embeds
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type");

      const { name, phone, email, vehicleInterest, notes, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, pageUrl, formId } = req.body;

      if (!name) {
        res.status(400).json({ error: "Campo 'name' e obrigatorio." });
        return;
      }

      const dept = "vendas";
      const defaultStage = await crmDb.getDefaultStage(dept);

      let fullNotes = notes || "";
      const utmParts = [];
      if (utmSource) utmParts.push(`source=${utmSource}`);
      if (utmMedium) utmParts.push(`medium=${utmMedium}`);
      if (utmCampaign) utmParts.push(`campaign=${utmCampaign}`);
      if (utmContent) utmParts.push(`content=${utmContent}`);
      if (utmTerm) utmParts.push(`term=${utmTerm}`);
      if (utmParts.length > 0) {
        fullNotes += `${fullNotes ? "\n" : ""}[UTM] ${utmParts.join(" ")}`;
      }
      if (pageUrl) {
        fullNotes += `${fullNotes ? "\n" : ""}[Pagina] ${pageUrl}`;
      }

      const source = utmSource === "google" ? "google_ads"
        : utmSource === "facebook" || utmSource === "fb" ? "facebook_ads"
        : utmSource === "instagram" || utmSource === "ig" ? "instagram_ads"
        : "landing_page";

      const leadId = await crmDb.createLead({
        name,
        phone: phone || null,
        email: email || null,
        vehicleInterest: vehicleInterest || null,
        vehiclePlate: null,
        source,
        department: dept,
        stage: defaultStage?.name || "Novo Lead",
        score: "hot",
        sellerId: 0,
        notes: fullNotes || null,
      });

      await crmDb.createActivity({
        leadId,
        sellerId: 0,
        type: "criacao",
        description: `Lead via landing page/widget${utmSource ? ` (${utmSource})` : ""}`,
      });

      const assignment = await autoAssignLead(leadId, dept);

      res.status(201).json({
        success: true,
        leadId,
        message: "Obrigado! Entraremos em contato em breve.",
      });
    } catch (err: any) {
      console.error("Widget lead error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // CORS preflight for widget
  app.options("/api/webhooks/widget/lead", (_req: Request, res: Response) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send();
  });

  // ===== WHATSAPP WEBHOOK =====
  // Accepts both Z-API format (phone, text.message, momment) and generic format (from, message, timestamp)
  app.post("/api/webhooks/whatsapp", async (req: Request, res: Response) => {
    try {
      // WhatsApp webhook does NOT require x-api-token auth
      // Z-API sends messages directly without custom headers
      const body = req.body;

      // Normalize Z-API format vs generic format
      const rawPhone = body.phone || body.from || "";
      const timestamp = body.momment || body.timestamp || Math.floor(Date.now() / 1000);
      const fromMe = body.fromMe === true;
      const isGroup = body.isGroup === true;
      const isNewsletter = body.isNewsletter === true;
      const isStatusReply = body.isStatusReply === true;
      const senderName = body.senderName || body.chatName || "";

      // Comprehensive message type detection (order matters - check specific types first)
      let messageType = "text";
      let messageText = "";
      let mediaUrl: string | null = null;

      if (body.reaction) {
        messageType = "reaction";
        messageText = body.reaction.value || "";
      } else if (body.image) {
        messageType = "image";
        messageText = body.image.caption || "";
        mediaUrl = body.image.imageUrl || null;
      } else if (body.audio) {
        messageType = body.audio.ptt ? "ptt" : "audio";
        messageText = "";
        mediaUrl = body.audio.audioUrl || null;
      } else if (body.video) {
        messageType = "video";
        messageText = body.video.caption || "";
        mediaUrl = body.video.videoUrl || null;
      } else if (body.document) {
        messageType = "document";
        messageText = body.document.fileName || body.document.title || "";
        mediaUrl = body.document.documentUrl || null;
      } else if (body.sticker) {
        messageType = "sticker";
        messageText = "";
        mediaUrl = body.sticker.stickerUrl || null;
      } else if (body.location) {
        messageType = "location";
        messageText = body.location.name || body.location.address || `Localização: ${body.location.latitude}, ${body.location.longitude}`;
      } else if (body.contact && body.contact.displayName) {
        messageType = "contact";
        messageText = `Contato: ${body.contact.displayName}`;
      } else if (body.buttonsResponseMessage) {
        messageType = "text";
        messageText = body.buttonsResponseMessage.message || "";
      } else if (body.listResponseMessage) {
        messageType = "text";
        messageText = body.listResponseMessage.message || body.listResponseMessage.title || "";
      } else if (body.hydratedTemplate) {
        messageType = "text";
        messageText = body.hydratedTemplate.message || body.hydratedTemplate.title || "";
        // Check for media in template header
        if (body.hydratedTemplate.header?.image?.imageUrl) {
          messageType = "image";
          mediaUrl = body.hydratedTemplate.header.image.imageUrl;
        } else if (body.hydratedTemplate.header?.video?.videoUrl) {
          messageType = "video";
          mediaUrl = body.hydratedTemplate.header.video.videoUrl;
        } else if (body.hydratedTemplate.header?.document?.documentUrl) {
          messageType = "document";
          mediaUrl = body.hydratedTemplate.header.document.documentUrl;
        }
      } else if (body.buttonsMessage) {
        messageType = "text";
        messageText = body.buttonsMessage.message || "";
      } else if (body.poll) {
        messageType = "poll";
        messageText = `Enquete: ${body.poll.question || ""}`;
      } else if (body.pollVote) {
        messageType = "poll_vote";
        messageText = body.pollVote.options?.map((o: any) => o.name).join(", ") || "";
      } else if (body.carouselMessage) {
        messageType = "text";
        messageText = body.carouselMessage.text || "";
      } else if (body.product) {
        messageType = "product";
        messageText = body.product.title || "";
      } else if (body.order) {
        messageType = "order";
        messageText = body.order.message || `Pedido #${body.order.orderId || ""}`;
      } else if (body.pinMessage) {
        messageType = "notification";
        messageText = body.pinMessage.action === "pin" ? "Mensagem fixada" : "Mensagem desafixada";
      } else if (body.notification) {
        messageType = "notification";
        messageText = "";
      } else if (body.waitingMessage === true) {
        messageType = "notification";
        messageText = "";
      } else if (body.text) {
        messageType = "text";
        messageText = body.text.message || "";
      } else if (body.message && typeof body.message === "string") {
        // Generic/fallback format
        messageType = "text";
        messageText = body.message;
      }

      const zapiMsgId = body.messageId || body.ids?.messageId || null;

      // Log for debugging
      const payloadPreview = JSON.stringify(body).substring(0, 500);
      console.log(`[WhatsApp Webhook] phone=${rawPhone}, type=${messageType}, msg="${messageText?.substring(0, 80)}", fromMe=${fromMe}, isGroup=${isGroup}, msgId=${zapiMsgId}`);
      if (!messageText && messageType === "text") {
        console.log(`[WhatsApp Webhook] WARNING: Empty text message. Payload: ${payloadPreview}`);
      }

      // Skip group messages, newsletters, status replies, and system notifications
      if (isGroup) {
        res.json({ success: true, action: "skipped", reason: "group" });
        return;
      }
      if (isNewsletter) {
        res.json({ success: true, action: "skipped", reason: "newsletter" });
        return;
      }
      if (messageType === "notification" || messageType === "reaction" || messageType === "poll_vote") {
        // Skip system notifications (pin, payment, etc.), reactions, and poll votes
        // These don't need to be stored as chat messages
        console.log(`[WhatsApp Webhook] Skipping ${messageType}: ${messageText || 'no content'}`);
        res.json({ success: true, action: "skipped", reason: messageType });
        return;
      }

      // Deduplicate: skip if we already processed this messageId (Z-API can send retries)
      if (isDuplicate(zapiMsgId)) {
        console.log(`[WhatsApp] Duplicate message skipped: ${zapiMsgId}`);
        res.json({ success: true, action: "skipped", reason: "duplicate" });
        return;
      }

      if (rawPhone) {
        const phone = rawPhone.replace(/\D/g, "");
        const existingLeads = await crmDb.searchLeads(phone);
        if (existingLeads.length > 0) {
          // Determine direction: fromMe = outbound (seller replied via WhatsApp), else inbound
          const direction = fromMe ? "outbound" : "inbound";
          
          // Skip outbound messages that were already saved by AI auto-reply or CRM send
          // (The AI/CRM saves its own message to DB, then Z-API sends it back via webhook)
          if (fromMe) {
            try {
              const dbCheck = await getDb();
              if (dbCheck) {
                // Check for any recent outbound message with same content (AI or CRM-sent)
                const recentOutbound = await dbCheck.select().from(crmMessages)
                  .where(and(
                    eq(crmMessages.leadId, existingLeads[0].id),
                    eq(crmMessages.direction, "outbound")
                  ))
                  .orderBy(desc(crmMessages.timestamp))
                  .limit(5);
                const isDup = recentOutbound.some(m => {
                  const timeDiff = Date.now() - (m.timestamp || 0);
                  // Match by content within 2 minutes, or by zapiMessageId
                  if (zapiMsgId && m.zapiMessageId === zapiMsgId) return true;
                  if (messageText && m.content === messageText && timeDiff < 120000) return true;
                  return false;
                });
                if (isDup) {
                  console.log(`[WhatsApp] Skipping outbound duplicate for lead #${existingLeads[0].id}`);
                  res.json({ success: true, action: "skipped", reason: "already_saved" });
                  return;
                }
              }
            } catch { /* continue to save */ }
          }

          // Save message to crm_messages
          await crmDb.createMessage({
            leadId: existingLeads[0].id,
            phone,
            direction,
            messageType,
            content: messageText || null,
            mediaUrl: mediaUrl || null,
            senderName: senderName || null,
            sentBy: null,
            zapiMessageId: zapiMsgId,
            timestamp: typeof timestamp === 'string' ? new Date(timestamp).getTime() : (timestamp > 9999999999 ? timestamp : timestamp * 1000),
          });
          // Update lastContactDate on lead
          await crmDb.updateLead(existingLeads[0].id, { lastContactDate: Date.now() });

          // If the lead's current seller is a gerente, auto-reassign to a vendedor
          if (!fromMe && existingLeads[0].sellerId > 0) {
            try {
              const dbConn2 = await getDb();
              if (dbConn2) {
                const [currentSeller] = await dbConn2.select().from(sellers).where(eq(sellers.id, existingLeads[0].sellerId)).limit(1);
                if (currentSeller && currentSeller.sellerRole === "gerente") {
                  const reassignResult = await crmDb.autoReassignLead(existingLeads[0].id);
                  if (reassignResult) {
                    console.log(`[WhatsApp] Lead #${existingLeads[0].id} was assigned to gerente ${currentSeller.name}, reassigned to ${reassignResult.newSellerName} (ID: ${reassignResult.newSellerId})`);
                  }
                }
              }
            } catch (reassignErr) {
              // Silently fail gerente check
            }
          }

          // Auto-classify lead temperature based on inbound message engagement
          // Only UPGRADE temperature (cold->warm->hot), NEVER downgrade
          // Manual score changes by sellers/admins are preserved
          if (!fromMe) {
            try {
              const dbConn = await getDb();
              if (dbConn) {
                const [countResult] = await dbConn.select({ cnt: sql<number>`COUNT(*)` })
                  .from(crmMessages).where(and(
                    eq(crmMessages.leadId, existingLeads[0].id),
                    eq(crmMessages.direction, "inbound")
                  ));
                const inboundCount = Number(countResult?.cnt || 0);
                const currentScore = existingLeads[0].score;
                let newScore = currentScore;
                // Only upgrade: 4+ msgs cold->warm, 9+ msgs warm->hot
                if (inboundCount >= 9 && currentScore !== "hot") newScore = "hot";
                else if (inboundCount >= 4 && currentScore === "cold") newScore = "warm";
                // Never downgrade - if seller manually set to hot/warm, keep it
                if (newScore !== currentScore) {
                  await crmDb.updateLead(existingLeads[0].id, { score: newScore as any });
                  console.log(`[Lead Score] Lead #${existingLeads[0].id} auto-upgraded: ${currentScore} -> ${newScore} (${inboundCount} inbound msgs)`);
                }
              }
            } catch (scoreErr) {
              // Silently fail score check
            }
          }

          // AI Auto-reply: check if enabled for this lead (only for inbound text messages)
          if (!fromMe && messageText && messageType === "text") {
            const leadIdForAi = existingLeads[0].id;
            // Acquire lock to prevent duplicate AI replies for same lead
            if (!acquireAiLock(leadIdForAi)) {
              // Lock already held - another AI reply is in progress for this lead
              console.log(`[AI Auto-Reply] Skipping - lock active for lead #${leadIdForAi}`);
            } else {
            (async () => {
              try {
                const dbConn = await getDb();
                if (!dbConn) { releaseAiLock(leadIdForAi); return; }

                // === AI ATTENDANT CHECK (priority over simple auto-reply) ===
                try {
                  const { handleAttendantMessage, getAttendantConfig, isAttendantActive } = await import("./ai-attendant");
                  const attendantCfg = await getAttendantConfig();
                  if (attendantCfg && attendantCfg.attendantEnabled && isAttendantActive(attendantCfg)) {
                    const result = await handleAttendantMessage(leadIdForAi, messageText, phone);
                    if (result.sent) {
                      console.log(`[AI Attendant] Handled lead #${leadIdForAi}, action: ${result.action || 'reply'}`);
                      releaseAiLock(leadIdForAi);
                      return;
                    }
                  }
                } catch (attendantErr: any) {
                  console.error(`[AI Attendant] Error, falling back to simple auto-reply:`, attendantErr.message);
                }
                // === END AI ATTENDANT CHECK ===

                // Check per-lead AI setting FIRST (individual toggle)
                const aiResult = await dbConn.execute(sql`SELECT enabled FROM crm_ai_settings WHERE leadId = ${existingLeads[0].id} LIMIT 1`);
                const aiRaw = aiResult as any;
                const aiRows = Array.isArray(aiRaw?.[0]) ? aiRaw[0] : aiRaw;
                if (!aiRows || aiRows.length === 0 || !aiRows[0].enabled) return;

                // Load global config for working hours, limits, personality (but NOT as master switch)
                const globalCheck = await dbConn.execute(sql`SELECT autoReplyEnabled, workingHoursEnabled, workingHoursStart, workingHoursEnd, maxMessagesEnabled, maxMessagesPerLead, personality FROM crm_ai_global_config WHERE id = 1 LIMIT 1`);
                const globalRaw = globalCheck as any;
                const globalRows = Array.isArray(globalRaw?.[0]) ? globalRaw[0] : globalRaw;
                const globalCfg = globalRows?.[0] || {};

                // Check working hours (only if enabled)
                if (globalCfg.workingHoursEnabled) {
                  const currentHour = new Date().getHours();
                  if (currentHour < (globalCfg.workingHoursStart ?? 8) || currentHour >= (globalCfg.workingHoursEnd ?? 20)) {
                    console.log(`[AI Auto-Reply] Outside working hours (${globalCfg.workingHoursStart}-${globalCfg.workingHoursEnd}), skipping`);
                    return;
                  }
                }

                // Check message limit per lead
                if (globalCfg.maxMessagesEnabled && globalCfg.maxMessagesPerLead) {
                  const countResult = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM crm_messages WHERE leadId = ${existingLeads[0].id} AND direction = 'outbound' AND senderName = 'IA Kafka'`);
                  const countRaw = countResult as any;
                  const countRows = Array.isArray(countRaw?.[0]) ? countRaw[0] : countRaw;
                  if (Number(countRows?.[0]?.cnt || 0) >= globalCfg.maxMessagesPerLead) {
                    console.log(`[AI Auto-Reply] Lead #${existingLeads[0].id} hit message limit (${globalCfg.maxMessagesPerLead}), skipping`);
                    return;
                  }
                }

                // All checks passed - generate and send AI reply
                const leadForAi = existingLeads[0];
                const aiPersonality = globalCfg.personality || 'amigavel';

                // Fetch AI mode config
                let globalAiMode = 'normal';
                let feiraoCtx = '';
                try {
                  const modeCfg = await dbConn.execute(sql`SELECT aiMode, feiraoConfig FROM crm_ai_global_config WHERE id = 1 LIMIT 1`);
                  const modeRaw = modeCfg as any;
                  const modeRows = Array.isArray(modeRaw?.[0]) ? modeRaw[0] : modeRaw;
                  if (modeRows && modeRows.length > 0) {
                    globalAiMode = modeRows[0].aiMode || 'normal';
                    if (globalAiMode === 'feirao' && modeRows[0].feiraoConfig) {
                      const fc = JSON.parse(modeRows[0].feiraoConfig);
                      feiraoCtx = `\n\n=== MODO FEIR\u00c3O ATIVO ===\n`;
                      if (fc.beneficios) feiraoCtx += `Benef\u00edcios: ${fc.beneficios}\n`;
                      if (fc.promocoes) feiraoCtx += `Promo\u00e7\u00f5es: ${fc.promocoes}\n`;
                      if (fc.objetivo) feiraoCtx += `Objetivo: ${fc.objetivo}\n`;
                      if (fc.instrucoes) feiraoCtx += `Instru\u00e7\u00f5es: ${fc.instrucoes}\n`;
                      feiraoCtx += `IMPORTANTE: Voc\u00ea DEVE mencionar o feir\u00e3o e os benef\u00edcios. Tente AGENDAR o cliente para visitar a loja. Crie urg\u00eancia!`;
                    }
                  }
                } catch { /* ignore */ }

                // Personality instructions
                const personalityMap: Record<string, string> = {
                  amigavel: 'Linguagem natural e informal, como amigo',
                  profissional: 'Linguagem profissional e educada, direta ao ponto',
                  agressivo: 'Linguagem persuasiva com urgência, foque em escassez e oportunidade',
                };
                const personalityInstr = personalityMap[aiPersonality] || personalityMap.amigavel;

                const recentMsgs = await crmDb.listMessagesByLead(leadForAi.id, 20);
                let vehicleCtx = "";
                if (leadForAi.vehicleInterest) {
                  const search = `%${leadForAi.vehicleInterest}%`;
                  const vehicles = await dbConn.select().from(inventoryVehicles)
                    .where(and(eq(inventoryVehicles.status, "available"), or(like(inventoryVehicles.model, search), like(inventoryVehicles.brand, search))))
                    .limit(5);
                  if (vehicles.length > 0) {
                    vehicleCtx = "\nVE\u00cdCULOS DISPON\u00cdVEIS:\n" + vehicles.map(v => `- ${v.brand} ${v.model} ${v.year || ""} | R$ ${v.price?.toLocaleString("pt-BR") || "N/A"} | ${v.km?.toLocaleString("pt-BR") || "0"} km | ${v.color || ""}`).join("\n");
                  }
                }
                const chatHist = recentMsgs.slice(-15).map(m => {
                  const r = m.direction === "inbound" ? "CLIENTE" : "VENDEDOR";
                  return `${r}: ${m.content || "[M\u00eddia]"}`;
                }).join("\n");
                const firstName = (leadForAi.name || '').split(' ')[0] || 'amigo';
                const sysPrompt = `Vendedor Kafka Multimarcas no WhatsApp. Responda como pessoa real.\n\nREGRAS:\n- MAX 1-2 linhas curtas\n- ${personalityInstr}\n- Sem formatação, sem asteriscos\n- Max 1 emoji\n- Nunca invente dados\n- Foque em 1 coisa só\n- Chame de ${firstName}${feiraoCtx}\n\nCliente: ${firstName} | Interesse: ${leadForAi.vehicleInterest || 'veículo'}${vehicleCtx}\n\n${chatHist}`;
                const aiResp = await invokeLLM({ messages: [{ role: "system", content: sysPrompt }, { role: "user", content: "Responda o cliente em 1-2 linhas. Só o texto, nada mais." }] });
                const aiText = ((aiResp.choices?.[0]?.message?.content as string) || "").trim();
                if (aiText && phone) {
                  // Check if we already sent an AI reply in the last 30s (extra safety)
                  const recentAiCheck = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM crm_messages WHERE leadId = ${leadForAi.id} AND direction = 'outbound' AND senderName = 'IA Kafka' AND timestamp > ${Date.now() - 30000}`);
                  const recentAiRaw = recentAiCheck as any;
                  const recentAiRows = Array.isArray(recentAiRaw?.[0]) ? recentAiRaw[0] : recentAiRaw;
                  if (Number(recentAiRows?.[0]?.cnt || 0) > 0) {
                    console.log(`[AI Auto-Reply] Already sent AI reply to lead #${leadForAi.id} in last 30s, skipping duplicate`);
                    releaseAiLock(leadIdForAi);
                    return;
                  }
                  await zapi.sendText(phone, aiText);
                  await crmDb.createMessage({ leadId: leadForAi.id, phone, direction: "outbound", messageType: "text", content: aiText, mediaUrl: null, senderName: "IA Kafka", sentBy: null, zapiMessageId: null, timestamp: Date.now() });
                  console.log(`[AI Auto-Reply] Sent to lead #${leadForAi.id} (${phone}): ${aiText.substring(0, 50)}...`);
                }
                releaseAiLock(leadIdForAi);
              } catch (aiErr: any) {
                console.error(`[AI Auto-Reply] Error:`, aiErr.message);
                releaseAiLock(leadIdForAi);
              }
            })();
            } // end acquireAiLock else
          }

          res.json({ success: true, action: "message_saved", leadId: existingLeads[0].id });
          return;
        }

        // If fromMe and no existing lead, skip (we sent to unknown number, don't create lead)
        if (fromMe) {
          res.json({ success: true, action: "skipped", reason: "from_me_no_lead" });
          return;
        }

        // Create new lead from WhatsApp (only from inbound messages)
        const dept = "vendas";
        const defaultStage = await crmDb.getDefaultStage(dept);
        const leadId = await crmDb.createLead({
          name: senderName || `WhatsApp ${phone}`,
          phone,
          email: null,
          vehicleInterest: null,
          vehiclePlate: null,
          source: "whatsapp",
          department: dept,
          stage: defaultStage?.name || "Novo Lead",
          score: "warm",
          sellerId: 0,
          notes: messageText ? `Primeira mensagem: ${messageText.substring(0, 500)}` : null,
        });
        // Save the first message
        await crmDb.createMessage({
          leadId,
          phone,
          direction: "inbound",
          messageType,
          content: messageText || null,
          mediaUrl: mediaUrl || null,
          senderName: senderName || null,
          sentBy: null,
          zapiMessageId: body.messageId || body.ids?.messageId || null,
          timestamp: typeof timestamp === 'string' ? new Date(timestamp).getTime() : (timestamp > 9999999999 ? timestamp : timestamp * 1000),
        });
        // SDR Flow: leads from WhatsApp stay unassigned (sellerId=0) for SDRs to qualify and distribute
        res.json({ success: true, action: "lead_created", leadId, assignedTo: null, note: "Lead aguardando distribui\u00e7\u00e3o pela pr\u00e9-vendas (SDR)" });
        return;
      }

      res.json({ success: true, action: "logged" });
    } catch (err: any) {
      console.error("WhatsApp webhook error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // ===== SIG WEB SYNC =====
  app.post("/api/webhooks/sig/sale", async (req: Request, res: Response) => {
    try {
      if (!(await validateToken(req, res))) return;

      const { leadId, vehicleModel, saleValue, sigId } = req.body;

      if (leadId) {
        const lead = await crmDb.getLeadById(leadId);
        if (lead) {
          await crmDb.updateLead(leadId, { stage: "Venda Fechada", archived: true });
          await crmDb.createActivity({
            leadId,
            sellerId: lead.sellerId,
            type: "observacao",
            description: `Venda sincronizada do SIG (ID: ${sigId || "N/A"}). Veiculo: ${vehicleModel || "N/A"}. Valor: R$ ${saleValue || "N/A"}`,
          });
        }
      }

      res.json({ success: true, message: "Venda sincronizada com sucesso." });
    } catch (err: any) {
      console.error("SIG webhook error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // ===== SIG WEB INVENTORY SYNC =====
  app.post("/api/webhooks/sig/inventory", async (req: Request, res: Response) => {
    try {
      if (!(await validateToken(req, res))) return;

      const { brand, model, year, plate, color, mileage, fuelType, transmission, price, costPrice, status } = req.body;

      if (!brand || !model) {
        res.status(400).json({ error: "Campos 'brand' e 'model' sao obrigatorios." });
        return;
      }

      const id = await crmDb.createInventoryItem({
        brand, model, year, plate, color, mileage, fuelType, transmission,
        price: price || 0, costPrice, notes: `Sincronizado do SIG Web`,
      });

      // Check for matching leads
      const searchTerm = `${brand} ${model}`;
      const matchingLeads = await crmDb.getLeadsByVehicleInterest(searchTerm);
      for (const lead of matchingLeads) {
        await crmDb.createInventoryAlert({ inventoryId: id, leadId: lead.id, sellerId: lead.sellerId });
      }

      res.status(201).json({
        success: true,
        inventoryId: id,
        matchingLeads: matchingLeads.length,
        message: `Veiculo '${brand} ${model}' adicionado ao estoque.`,
      });
    } catch (err: any) {
      console.error("SIG inventory webhook error:", err);
      res.status(500).json({ error: "Erro interno.", details: err.message });
    }
  });

  // ===== API DOCUMENTATION =====
  app.get("/api/webhooks/docs", (_req: Request, res: Response) => {
    res.json({
      title: "Kafka CRM API v2",
      version: "2.0.0",
      description: "API completa para integracao com o CRM Kafka Rank. Use o token de API gerado no painel admin para endpoints autenticados.",
      authentication: {
        type: "API Token",
        header: "x-api-token",
        description: "Token gerado nas configuracoes de integracao do CRM Admin. Alguns endpoints (widget, Meta verify) nao precisam de token.",
      },
      endpoints: [
        {
          method: "GET",
          path: "/api/webhooks/health",
          description: "Verificar se a API esta funcionando.",
          auth: false,
        },
        {
          method: "POST",
          path: "/api/webhooks/lead",
          description: "Criar um novo lead (generico, com token).",
          auth: true,
          body: {
            name: { type: "string", required: true, description: "Nome do cliente" },
            phone: { type: "string", required: false, description: "Telefone (ex: 47999999999)" },
            email: { type: "string", required: false, description: "Email" },
            vehicleInterest: { type: "string", required: false, description: "Veiculo de interesse" },
            vehiclePlate: { type: "string", required: false, description: "Placa do veiculo atual" },
            source: { type: "string", required: false, description: "Origem: manual, whatsapp, olx, webmotors, socarrao, icarros, facebook, instagram, instagram_ads, facebook_ads, google_ads, trafego_pago, indicacao, loja, landing_page, api" },
            department: { type: "string", required: false, description: "Setor: vendas, pre_vendas, consignacao, fei. Default: vendas" },
            sellerId: { type: "number", required: false, description: "ID do vendedor responsavel. Se nao informado, usa round-robin." },
            score: { type: "string", required: false, description: "Temperatura: hot, warm, cold. Default: warm" },
            notes: { type: "string", required: false, description: "Observacoes" },
            utmSource: { type: "string", required: false, description: "UTM source (para tracking)" },
            utmMedium: { type: "string", required: false, description: "UTM medium" },
            utmCampaign: { type: "string", required: false, description: "UTM campaign" },
          },
          example: `curl -X POST https://kafkarank.com/api/webhooks/lead -H "Content-Type: application/json" -H "x-api-token: SEU_TOKEN" -d '{"name":"Joao Silva","phone":"47999999999","source":"olx","vehicleInterest":"HB20 2023"}'`,
        },
        {
          method: "POST",
          path: "/api/webhooks/leads/bulk",
          description: "Criar multiplos leads de uma vez (max 100).",
          auth: true,
          body: {
            leads: { type: "array", required: true, description: "Array de objetos lead (mesmos campos do endpoint /lead)" },
          },
        },
        {
          method: "GET",
          path: "/api/webhooks/meta/verify",
          description: "Verificacao do webhook Meta (Instagram/Facebook). Configure esta URL no Meta Business.",
          auth: false,
        },
        {
          method: "POST",
          path: "/api/webhooks/meta/leadgen",
          description: "Receber leads do Meta Lead Ads (Instagram/Facebook Ads). Aceita formato nativo Meta e formato simplificado (via Zapier/Make).",
          auth: false,
          body: {
            name: { type: "string", description: "Nome (formato simplificado)" },
            phone: { type: "string", description: "Telefone" },
            email: { type: "string", description: "Email" },
            vehicle: { type: "string", description: "Veiculo de interesse" },
            platform: { type: "string", description: "instagram ou facebook" },
            campaign_name: { type: "string", description: "Nome da campanha" },
          },
          note: "Tambem aceita formato nativo Meta (object: page, entry: [...]).",
        },
        {
          method: "POST",
          path: "/api/webhooks/google/lead",
          description: "Receber leads do Google Ads Lead Form Extensions.",
          auth: false,
          body: {
            name: { type: "string", description: "Nome do lead" },
            phone: { type: "string", description: "Telefone" },
            email: { type: "string", description: "Email" },
            vehicle: { type: "string", description: "Veiculo de interesse" },
            campaign_name: { type: "string", description: "Nome da campanha" },
          },
        },
        {
          method: "POST",
          path: "/api/webhooks/generic",
          description: "Webhook generico - aceita qualquer formato. Ideal para chatbots (Manychat), automacoes (Zapier, Make, n8n), ou qualquer plataforma.",
          auth: true,
          body: {
            name: { type: "string", description: "Nome (aceita: name, full_name, nome, customer_name, lead_name)" },
            phone: { type: "string", description: "Telefone (aceita: phone, phone_number, telefone, celular, whatsapp)" },
            email: { type: "string", description: "Email (aceita: email, e_mail, mail)" },
            vehicle: { type: "string", description: "Veiculo (aceita: vehicle, vehicleInterest, veiculo, carro, interesse)" },
            source: { type: "string", description: "Origem (aceita: source, origem, platform, canal)" },
            department: { type: "string", description: "Setor (aceita: department, setor, departamento)" },
            notes: { type: "string", description: "Notas (aceita: notes, observacao, mensagem, message)" },
            utm_source: { type: "string", description: "UTM source" },
            utm_medium: { type: "string", description: "UTM medium" },
            utm_campaign: { type: "string", description: "UTM campaign" },
          },
          example: `curl -X POST https://kafkarank.com/api/webhooks/generic -H "Content-Type: application/json" -H "x-api-token: SEU_TOKEN" -d '{"nome":"Maria","telefone":"47988887777","origem":"manychat","carro":"Civic 2024"}'`,
        },
        {
          method: "POST",
          path: "/api/webhooks/email-parser",
          description: "Parsear emails encaminhados de OLX, Webmotors, SoCarrao, iCarros. Detecta automaticamente a plataforma e extrai nome/telefone/veiculo.",
          auth: true,
          body: {
            subject: { type: "string", description: "Assunto do email" },
            body: { type: "string", description: "Corpo do email (texto)" },
            html: { type: "string", description: "Corpo do email (HTML) - alternativa ao body" },
            from: { type: "string", description: "Email do remetente" },
          },
          example: `curl -X POST https://kafkarank.com/api/webhooks/email-parser -H "Content-Type: application/json" -H "x-api-token: SEU_TOKEN" -d '{"subject":"Novo interesse - OLX","body":"Nome: Joao\\nTelefone: (47) 99999-9999\\nVeiculo: HB20 2023","from":"noreply@olx.com.br"}'`,
        },
        {
          method: "POST",
          path: "/api/webhooks/widget/lead",
          description: "Receber leads do widget/formulario embeddable em landing pages. NAO precisa de token (publico).",
          auth: false,
          body: {
            name: { type: "string", required: true, description: "Nome do cliente" },
            phone: { type: "string", description: "Telefone" },
            email: { type: "string", description: "Email" },
            vehicleInterest: { type: "string", description: "Veiculo de interesse" },
            notes: { type: "string", description: "Mensagem/observacoes" },
            utmSource: { type: "string", description: "UTM source (capturado automaticamente pelo widget)" },
            utmMedium: { type: "string", description: "UTM medium" },
            utmCampaign: { type: "string", description: "UTM campaign" },
            utmContent: { type: "string", description: "UTM content" },
            utmTerm: { type: "string", description: "UTM term" },
            pageUrl: { type: "string", description: "URL da pagina onde o formulario foi preenchido" },
          },
        },
        {
          method: "POST",
          path: "/api/webhooks/whatsapp",
          description: "Receber mensagens do WhatsApp (Z-API nativo, Evolution API, Twilio). Aceita formato Z-API (phone, text.message, momment) e generico (from, message, timestamp). Cria lead automaticamente se telefone nao existe. Ignora mensagens enviadas por nos (fromMe) e de grupos.",
          auth: true,
          body: {
            phone: { type: "string", description: "Numero do remetente (Z-API format)" },
            from: { type: "string", description: "Numero do remetente (formato generico, alternativa a phone)" },
            "text.message": { type: "string", description: "Texto da mensagem (Z-API format)" },
            message: { type: "string", description: "Texto da mensagem (formato generico)" },
            momment: { type: "number", description: "Timestamp (Z-API format)" },
            fromMe: { type: "boolean", description: "Se a mensagem foi enviada por nos (ignorada)" },
            isGroup: { type: "boolean", description: "Se eh mensagem de grupo (ignorada)" },
          },
        },
        {
          method: "POST",
          path: "/api/webhooks/sig/sale",
          description: "Sincronizar venda do SIG Web.",
          auth: true,
          body: {
            leadId: { type: "number", description: "ID do lead no CRM" },
            vehicleModel: { type: "string", description: "Modelo do veiculo vendido" },
            saleValue: { type: "number", description: "Valor da venda" },
            sigId: { type: "string", description: "ID da venda no SIG" },
          },
        },
        {
          method: "POST",
          path: "/api/webhooks/sig/inventory",
          description: "Sincronizar estoque do SIG Web. Adiciona veiculo e notifica vendedores com clientes interessados.",
          auth: true,
          body: {
            brand: { type: "string", required: true, description: "Marca (ex: Hyundai)" },
            model: { type: "string", required: true, description: "Modelo (ex: HB20)" },
            year: { type: "string", description: "Ano (ex: 2023/2024)" },
            plate: { type: "string", description: "Placa" },
            color: { type: "string", description: "Cor" },
            mileage: { type: "number", description: "Quilometragem" },
            fuelType: { type: "string", description: "Combustivel" },
            transmission: { type: "string", description: "Cambio" },
            price: { type: "number", description: "Preco de venda" },
            costPrice: { type: "number", description: "Preco de custo" },
          },
        },
      ],
      widget: {
        description: "Codigo JavaScript para colar em qualquer landing page. O formulario captura automaticamente UTM parameters da URL.",
        embedCode: `<script src="https://kafkarank.com/api/webhooks/widget.js" data-kafka-crm></script>`,
        note: "O widget cria um botao flutuante e formulario de contato. Captura UTMs automaticamente.",
      },
    });
  });

  // ===== WIDGET JAVASCRIPT (embeddable) =====
  app.get("/api/webhooks/widget.js", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(getWidgetScript());
  });
}

function getWidgetScript(): string {
  return `
(function() {
  'use strict';
  
  // Get UTM params from URL
  function getUTM() {
    var params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
      utmContent: params.get('utm_content') || '',
      utmTerm: params.get('utm_term') || '',
      pageUrl: window.location.href
    };
  }

  // Create styles
  var style = document.createElement('style');
  style.textContent = \`
    #kafka-crm-widget { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #kafka-crm-btn { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(220,38,38,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
    #kafka-crm-btn:hover { transform: scale(1.1); }
    #kafka-crm-btn svg { width: 28px; height: 28px; }
    #kafka-crm-form { display: none; position: fixed; bottom: 90px; right: 20px; width: 340px; max-width: calc(100vw - 40px); background: #1a1a2e; border: 1px solid #333; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); overflow: hidden; z-index: 99999; }
    #kafka-crm-form.open { display: block; animation: kafkaSlideUp 0.3s ease; }
    @keyframes kafkaSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    #kafka-crm-form .kf-header { background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 16px; color: white; }
    #kafka-crm-form .kf-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
    #kafka-crm-form .kf-header p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
    #kafka-crm-form .kf-body { padding: 16px; }
    #kafka-crm-form .kf-field { margin-bottom: 12px; }
    #kafka-crm-form .kf-field label { display: block; font-size: 12px; color: #aaa; margin-bottom: 4px; font-weight: 500; }
    #kafka-crm-form .kf-field input, #kafka-crm-form .kf-field textarea { width: 100%; padding: 10px 12px; border: 1px solid #333; border-radius: 8px; background: #0f0f23; color: #fff; font-size: 14px; box-sizing: border-box; outline: none; transition: border-color 0.2s; }
    #kafka-crm-form .kf-field input:focus, #kafka-crm-form .kf-field textarea:focus { border-color: #dc2626; }
    #kafka-crm-form .kf-field textarea { height: 60px; resize: none; }
    #kafka-crm-form .kf-submit { width: 100%; padding: 12px; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: opacity 0.2s; }
    #kafka-crm-form .kf-submit:hover { opacity: 0.9; }
    #kafka-crm-form .kf-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    #kafka-crm-form .kf-success { text-align: center; padding: 30px 16px; color: #4ade80; }
    #kafka-crm-form .kf-success svg { width: 48px; height: 48px; margin: 0 auto 12px; }
    #kafka-crm-form .kf-success h4 { margin: 0 0 8px; font-size: 18px; color: white; }
    #kafka-crm-form .kf-success p { margin: 0; font-size: 13px; color: #aaa; }
    #kafka-crm-form .kf-close { position: absolute; top: 12px; right: 12px; background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 20px; line-height: 1; padding: 4px; }
    #kafka-crm-form .kf-close:hover { color: white; }
  \`;
  document.head.appendChild(style);

  // Create widget HTML
  var widget = document.createElement('div');
  widget.id = 'kafka-crm-widget';
  widget.innerHTML = \`
    <button id="kafka-crm-btn" aria-label="Fale conosco">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </button>
    <div id="kafka-crm-form">
      <button class="kf-close" onclick="document.getElementById('kafka-crm-form').classList.remove('open')">&times;</button>
      <div class="kf-header">
        <h3>Kafka Multimarcas</h3>
        <p>Preencha e entraremos em contato!</p>
      </div>
      <div class="kf-body" id="kafka-crm-fields">
        <div class="kf-field">
          <label>Nome *</label>
          <input type="text" id="kf-name" placeholder="Seu nome completo" required>
        </div>
        <div class="kf-field">
          <label>Telefone / WhatsApp *</label>
          <input type="tel" id="kf-phone" placeholder="(47) 99999-9999">
        </div>
        <div class="kf-field">
          <label>Veiculo de Interesse</label>
          <input type="text" id="kf-vehicle" placeholder="Ex: HB20, Hilux, Civic...">
        </div>
        <div class="kf-field">
          <label>Mensagem</label>
          <textarea id="kf-notes" placeholder="Como podemos ajudar?"></textarea>
        </div>
        <button class="kf-submit" id="kf-submit" onclick="kafkaCrmSubmit()">Enviar</button>
      </div>
    </div>
  \`;
  document.body.appendChild(widget);

  // Toggle form
  document.getElementById('kafka-crm-btn').addEventListener('click', function() {
    var form = document.getElementById('kafka-crm-form');
    form.classList.toggle('open');
  });

  // Submit handler
  window.kafkaCrmSubmit = function() {
    var name = document.getElementById('kf-name').value.trim();
    var phone = document.getElementById('kf-phone').value.trim();
    var vehicle = document.getElementById('kf-vehicle').value.trim();
    var notes = document.getElementById('kf-notes').value.trim();
    var btn = document.getElementById('kf-submit');

    if (!name) { alert('Por favor, informe seu nome.'); return; }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    var utm = getUTM();
    var payload = {
      name: name,
      phone: phone || undefined,
      vehicleInterest: vehicle || undefined,
      notes: notes || undefined,
      utmSource: utm.utmSource || undefined,
      utmMedium: utm.utmMedium || undefined,
      utmCampaign: utm.utmCampaign || undefined,
      utmContent: utm.utmContent || undefined,
      utmTerm: utm.utmTerm || undefined,
      pageUrl: utm.pageUrl
    };

    fetch(window.kafkaCrmApiUrl || (document.querySelector('[data-kafka-crm]')?.src?.replace('/api/webhooks/widget.js', '') || '') + '/api/webhooks/widget/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        document.getElementById('kafka-crm-fields').innerHTML = '<div class="kf-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg><h4>Obrigado!</h4><p>Entraremos em contato em breve.</p></div>';
        setTimeout(function() { document.getElementById('kafka-crm-form').classList.remove('open'); }, 3000);
      } else {
        btn.disabled = false;
        btn.textContent = 'Enviar';
        alert('Erro ao enviar. Tente novamente.');
      }
    })
    .catch(function() {
      btn.disabled = false;
      btn.textContent = 'Enviar';
      alert('Erro de conexao. Tente novamente.');
    });
  };
})();
`;
}
