import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "../_core/env";
import * as crmDb from "../crmDb";
import * as db from "../db";
import { storagePut } from "../storage";
import { transcribeAudio } from "../_core/voiceTranscription";

// ===== ADMIN AUTH (Login próprio) =====
export const adminAuthRouter = router({
  login: publicProcedure.input(z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  })).mutation(async ({ input }) => {
    const admin = await crmDb.getAdminByUsername(input.username);
    if (!admin || !admin.active) {
      throw new Error("Usuario ou senha invalidos");
    }
    const valid = await bcrypt.compare(input.password, admin.passwordHash);
    if (!valid) {
      throw new Error("Usuario ou senha invalidos");
    }
    const token = jwt.sign(
      { adminId: admin.id, role: admin.role, type: "admin_auth" },
      ENV.cookieSecret,
      { expiresIn: "30d" }
    );
    return { token, admin: { id: admin.id, name: admin.name, username: admin.username, role: admin.role } };
  }),

  me: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
    try {
      const payload = jwt.verify(input.token, ENV.cookieSecret) as any;
      if (payload.type !== "admin_auth") return null;
      const admin = await crmDb.getAdminById(payload.adminId);
      if (!admin || !admin.active) return null;
      return { id: admin.id, name: admin.name, username: admin.username, role: admin.role };
    } catch {
      return null;
    }
  }),

  list: adminProcedure.query(async () => {
    return crmDb.listAdmins();
  }),

  create: adminProcedure.input(z.object({
    username: z.string().min(3),
    password: z.string().min(4),
    name: z.string().min(1),
    role: z.enum(["owner", "admin"]).optional(),
    permissions: z.string().optional(),
  })).mutation(async ({ input }) => {
    const hash = await bcrypt.hash(input.password, 10);
    const id = await crmDb.createAdmin({ username: input.username, passwordHash: hash, name: input.name, role: input.role, permissions: input.permissions });
    return { id };
  }),

  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    password: z.string().optional(),
    active: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const { id, password, ...rest } = input;
    const data: any = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    await crmDb.updateAdmin(id, data);
    return { success: true };
  }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await crmDb.deleteAdmin(input.id);
    return { success: true };
  }),
});

// ===== CRM LEADS =====
export const crmLeadsRouter = router({
  create: publicProcedure.input(z.object({
    sellerId: z.number(),
    department: z.string().optional(),
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().optional(),
    vehicleInterest: z.string().optional(),
    vehiclePlate: z.string().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    // Get default stage for department
    const dept = input.department || "vendas";
    const defaultStage = await crmDb.getDefaultStage(dept);
    const id = await crmDb.createLead({
      ...input,
      department: dept,
      stage: defaultStage?.name || "Novo Lead",
      lastContactDate: Date.now(),
    });
    // Log activity
    await crmDb.createActivity({
      leadId: id,
      sellerId: input.sellerId,
      type: "criacao",
      description: `Lead criado: ${input.name}`,
    });
    return { id };
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return crmDb.getLeadById(input.id);
  }),

  listBySeller: publicProcedure.input(z.object({
    sellerId: z.number(),
    department: z.string().optional(),
    archived: z.boolean().optional(),
    stage: z.string().optional(),
    score: z.string().optional(),
  })).query(async ({ input }) => {
    const { sellerId, ...opts } = input;
    return crmDb.listLeadsBySeller(sellerId, opts);
  }),

  listAll: adminProcedure.input(z.object({
    archived: z.boolean().optional(),
    department: z.string().optional(),
    sellerId: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return crmDb.listAllLeads(input || {});
  }),

  search: publicProcedure.input(z.object({
    query: z.string().min(1),
    sellerId: z.number().optional(),
  })).query(async ({ input }) => {
    return crmDb.searchLeads(input.query, input.sellerId);
  }),

  update: publicProcedure.input(z.object({
    id: z.number(),
    sellerId: z.number().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    vehicleInterest: z.string().optional(),
    vehiclePlate: z.string().optional(),
    source: z.string().optional(),
    stage: z.string().optional(),
    score: z.enum(["hot", "warm", "cold"]).optional(),
    notes: z.string().optional(),
    nextContactDate: z.number().nullable().optional(),
    archived: z.boolean().optional(),
    convertedToSale: z.boolean().optional(),
    saleValue: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await crmDb.updateLead(id, data as any);
    return { success: true };
  }),

  moveStage: publicProcedure.input(z.object({
    id: z.number(),
    newStage: z.string(),
    sellerId: z.number(),
  })).mutation(async ({ input }) => {
    const lead = await crmDb.getLeadById(input.id);
    if (!lead) throw new Error("Lead nao encontrado");
    const oldStage = lead.stage;
    await crmDb.updateLead(input.id, { stage: input.newStage });
    await crmDb.createActivity({
      leadId: input.id,
      sellerId: input.sellerId,
      type: "mudanca_etapa",
      description: `Etapa: ${oldStage} → ${input.newStage}`,
      metadata: JSON.stringify({ from: oldStage, to: input.newStage }),
    });
    return { success: true };
  }),

  addActivity: publicProcedure.input(z.object({
    leadId: z.number(),
    sellerId: z.number(),
    type: z.string(),
    description: z.string().optional(),
  })).mutation(async ({ input }) => {
    const id = await crmDb.createActivity(input);
    // Update last contact date
    await crmDb.updateLead(input.leadId, { lastContactDate: Date.now() });
    return { id };
  }),

  getActivities: publicProcedure.input(z.object({ leadId: z.number() })).query(async ({ input }) => {
    return crmDb.listActivitiesByLead(input.leadId);
  }),

  getFollowUps: publicProcedure.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
    return crmDb.getLeadsNeedingFollowUp(input.sellerId);
  }),

  getStats: publicProcedure.input(z.object({ sellerId: z.number().optional() }).optional()).query(async ({ input }) => {
    return crmDb.getLeadStats(input?.sellerId);
  }),

  getByVehicleInterest: publicProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => {
    return crmDb.getLeadsByVehicleInterest(input.query);
  }),

  // SDR: Assign/transfer lead to a specific seller
  assignToSeller: publicProcedure.input(z.object({
    leadId: z.number(),
    newSellerId: z.number(),
    currentSellerId: z.number(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const lead = await crmDb.getLeadById(input.leadId);
    if (!lead) throw new Error("Lead n\u00e3o encontrado");
    await crmDb.updateLead(input.leadId, { sellerId: input.newSellerId });
    await crmDb.createActivity({
      leadId: input.leadId,
      sellerId: input.currentSellerId,
      type: "transferencia",
      description: `Lead transferido para vendedor #${input.newSellerId}${input.notes ? ` - ${input.notes}` : ""}`,
    });
    return { success: true };
  }),

  // SDR: Bulk assign leads to a seller
  bulkAssign: publicProcedure.input(z.object({
    leadIds: z.array(z.number()),
    newSellerId: z.number(),
    currentSellerId: z.number(),
  })).mutation(async ({ input }) => {
    let assigned = 0;
    for (const leadId of input.leadIds) {
      try {
        await crmDb.updateLead(leadId, { sellerId: input.newSellerId });
        await crmDb.createActivity({
          leadId,
          sellerId: input.currentSellerId,
          type: "transferencia",
          description: `Lead distribu\u00eddo em lote para vendedor #${input.newSellerId}`,
        });
        assigned++;
      } catch {}
    }
    return { assigned, total: input.leadIds.length };
  }),

  // Get unassigned leads (sellerId = 0) for SDR to distribute
  listUnassigned: publicProcedure.input(z.object({
    department: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return crmDb.listAllLeads({ sellerId: 0, department: input?.department });
  }),

  // SDR full access: see ALL leads (assigned + unassigned) to manage and distribute
  listForSDR: publicProcedure.input(z.object({
    archived: z.boolean().optional(),
    filterAssignment: z.enum(["all", "unassigned", "assigned"]).optional(),
  }).optional()).query(async ({ input }) => {
    const allLeads = await crmDb.listAllLeads({ archived: input?.archived ?? false });
    if (!input?.filterAssignment || input.filterAssignment === "all") return allLeads;
    if (input.filterAssignment === "unassigned") return allLeads.filter(l => l.sellerId === 0);
    return allLeads.filter(l => l.sellerId > 0);
  }),
});

// ===== CRM PIPELINE =====
export const crmPipelineRouter = router({
  getStages: publicProcedure.input(z.object({ department: z.string().optional() }).optional()).query(async ({ input }) => {
    return crmDb.listPipelineStages(input?.department);
  }),
});

// ===== CRM INVENTORY (now uses inventory_vehicles - real data from scraper) =====
export const crmInventoryRouter = router({
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const { getDb } = await import("../db");
    const { inventoryVehicles } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const dbConn = await getDb();
    if (!dbConn) return null;
    const result = await dbConn.select().from(inventoryVehicles).where(eq(inventoryVehicles.id, input.id)).limit(1);
    const v = result[0];
    if (!v) return null;
    // Map to CRM-compatible format
    return {
      id: v.id, brand: v.brand, model: v.model, year: v.year ? String(v.year) : null,
      plate: v.plate, color: v.color, mileage: v.km, fuelType: v.fuel,
      transmission: v.transmission, price: v.price, costPrice: 0,
      photoUrl: v.photoUrl, photoKey: null, status: v.status,
      notes: v.observation, version: v.version, photos: v.photos,
      fipePrice: v.fipePrice, externalUrl: v.externalUrl,
      createdAt: v.createdAt, updatedAt: v.updatedAt,
    };
  }),

  list: publicProcedure.input(z.object({
    status: z.string().optional(),
    search: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    const { getDb } = await import("../db");
    const { inventoryVehicles } = await import("../../drizzle/schema");
    const { eq, and, like, or, desc } = await import("drizzle-orm");
    const dbConn = await getDb();
    if (!dbConn) return [];
    const conditions: any[] = [];
    if (input?.status && input.status !== "all") {
      conditions.push(eq(inventoryVehicles.status, input.status as any));
    }
    if (input?.search) {
      const p = `%${input.search}%`;
      conditions.push(or(
        like(inventoryVehicles.brand, p),
        like(inventoryVehicles.model, p),
        like(inventoryVehicles.version, p),
        like(inventoryVehicles.color, p),
      ));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await dbConn.select().from(inventoryVehicles).where(where).orderBy(desc(inventoryVehicles.createdAt));
    // Map to CRM-compatible format
    return rows.map(v => ({
      id: v.id, brand: v.brand, model: v.model, year: v.year ? String(v.year) : null,
      plate: v.plate, color: v.color, mileage: v.km, fuelType: v.fuel,
      transmission: v.transmission, price: v.price, costPrice: 0,
      photoUrl: v.photoUrl, photoKey: null, status: v.status,
      notes: v.observation, version: v.version, photos: v.photos,
      fipePrice: v.fipePrice, externalUrl: v.externalUrl,
      createdAt: v.createdAt, updatedAt: v.updatedAt,
    }));
  }),

  create: adminProcedure.input(z.object({
    brand: z.string().min(1), model: z.string().min(1),
    year: z.string().optional(), plate: z.string().optional(),
    color: z.string().optional(), price: z.number(),
  })).mutation(async ({ input }) => {
    const { getDb } = await import("../db");
    const { inventoryVehicles } = await import("../../drizzle/schema");
    const dbConn = await getDb();
    if (!dbConn) throw new Error("DB not available");
    const result = await dbConn.insert(inventoryVehicles).values({
      externalId: `manual-${nanoid(8)}`,
      brand: input.brand, model: input.model,
      year: input.year ? parseInt(input.year) : null,
      color: input.color || null, plate: input.plate || null,
      price: input.price, status: "available",
      lastSyncedAt: Date.now(),
    });
    return { id: Number(result[0].insertId), matchingLeads: 0 };
  }),

  update: adminProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["available", "reserved", "sold"]).optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { getDb } = await import("../db");
    const { inventoryVehicles } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const dbConn = await getDb();
    if (!dbConn) throw new Error("DB not available");
    const updates: any = {};
    if (input.status) updates.status = input.status;
    if (input.notes !== undefined) updates.observation = input.notes;
    await dbConn.update(inventoryVehicles).set(updates).where(eq(inventoryVehicles.id, input.id));
    return { success: true };
  }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const { getDb } = await import("../db");
    const { inventoryVehicles } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const dbConn = await getDb();
    if (!dbConn) throw new Error("DB not available");
    await dbConn.delete(inventoryVehicles).where(eq(inventoryVehicles.id, input.id));
    return { success: true };
  }),

  getAlerts: publicProcedure.input(z.object({ sellerId: z.number() })).query(async ({ input }) => {
    return crmDb.listInventoryAlertsBySeller(input.sellerId);
  }),

  dismissAlert: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await crmDb.dismissInventoryAlert(input.id);
    return { success: true };
  }),
});

// ===== CRM INTEGRATIONS =====
export const crmIntegrationsRouter = router({
  list: adminProcedure.query(async () => {
    return crmDb.listIntegrations();
  }),

  create: adminProcedure.input(z.object({
    type: z.string(),
    name: z.string(),
    config: z.string().optional(),
  })).mutation(async ({ input }) => {
    const apiToken = `kafka_${nanoid(32)}`;
    const id = await crmDb.createIntegration({ ...input, apiToken });
    return { id, apiToken };
  }),

  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    config: z.string().optional(),
    active: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await crmDb.updateIntegration(id, data as any);
    return { success: true };
  }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await crmDb.deleteIntegration(input.id);
    return { success: true };
  }),

  regenerateToken: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const newToken = `kafka_${nanoid(32)}`;
    await crmDb.updateIntegration(input.id, { apiToken: newToken });
    return { apiToken: newToken };
  }),

  // Meta-specific config
  getMetaConfig: adminProcedure.query(async () => {
    const integration = await crmDb.getIntegrationByType("facebook");
    if (!integration) return null;
    let config: any = {};
    try { config = JSON.parse(integration.config || "{}"); } catch {}
    return {
      id: integration.id,
      active: integration.active,
      name: integration.name,
      appId: config.appId || "",
      appSecret: config.appSecret ? "***configurado***" : "",
      pageAccessToken: config.pageAccessToken ? "***configurado***" : "",
      verifyToken: config.verifyToken || "",
      pageId: config.pageId || "",
      hasAppSecret: !!config.appSecret,
      hasPageAccessToken: !!config.pageAccessToken,
    };
  }),

  saveMetaConfig: adminProcedure.input(z.object({
    appId: z.string().optional(),
    appSecret: z.string().optional(),
    pageAccessToken: z.string().optional(),
    verifyToken: z.string().optional(),
    pageId: z.string().optional(),
  })).mutation(async ({ input }) => {
    let integration = await crmDb.getIntegrationByType("facebook");
    let existingConfig: any = {};
    if (integration?.config) {
      try { existingConfig = JSON.parse(integration.config); } catch {}
    }
    // Merge: only update fields that are provided and not masked
    const newConfig: any = { ...existingConfig };
    if (input.appId !== undefined) newConfig.appId = input.appId;
    if (input.appSecret && !input.appSecret.includes("***")) newConfig.appSecret = input.appSecret;
    if (input.pageAccessToken && !input.pageAccessToken.includes("***")) newConfig.pageAccessToken = input.pageAccessToken;
    if (input.verifyToken !== undefined) newConfig.verifyToken = input.verifyToken;
    if (input.pageId !== undefined) newConfig.pageId = input.pageId;

    if (integration) {
      await crmDb.updateIntegration(integration.id, { config: JSON.stringify(newConfig) });
    } else {
      const apiToken = `kafka_${nanoid(32)}`;
      await crmDb.createIntegration({
        type: "facebook",
        name: "Meta Lead Ads (Facebook/Instagram)",
        config: JSON.stringify(newConfig),
        apiToken,
      });
    }
    return { success: true };
  }),

  testMetaConnection: adminProcedure.mutation(async () => {
    const integration = await crmDb.getIntegrationByType("facebook");
    if (!integration?.config) return { success: false, error: "Integração não configurada" };
    try {
      const config = JSON.parse(integration.config);
      if (!config.pageAccessToken) return { success: false, error: "Page Access Token não configurado" };
      // Test by calling /me endpoint
      const resp = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${config.pageAccessToken}`);
      const data = await resp.json() as any;
      if (data.error) return { success: false, error: data.error.message };
      return { success: true, pageName: data.name, pageId: data.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }),
});

// ===== CRM CAMPAIGNS =====
export const crmCampaignsRouter = router({
  list: adminProcedure.query(async () => {
    return crmDb.listCampaigns();
  }),

  create: adminProcedure.input(z.object({
    name: z.string().min(1),
    message: z.string().min(1),
    filters: z.string().optional(),
    channel: z.string().optional(),
  })).mutation(async ({ input }) => {
    const id = await crmDb.createCampaign(input);
    return { id };
  }),

  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    message: z.string().optional(),
    filters: z.string().optional(),
    status: z.enum(["draft", "scheduled", "sending", "sent", "cancelled"]).optional(),
    scheduledDate: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await crmDb.updateCampaign(id, data as any);
    return { success: true };
  }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await crmDb.deleteCampaign(input.id);
    return { success: true };
  }),

  // Preview: get leads that match campaign filters
  preview: adminProcedure.input(z.object({
    filters: z.string().optional(),
  })).query(async ({ input }) => {
    // Parse filters and return matching leads count
    const leads = await crmDb.listAllLeads({ archived: false });
    if (!input?.filters) return { count: leads.length, sample: leads.slice(0, 5) };
    try {
      const f = JSON.parse(input.filters);
      let filtered = leads;
      if (f.source) filtered = filtered.filter(l => l.source === f.source);
      if (f.department) filtered = filtered.filter(l => l.department === f.department);
      if (f.score) filtered = filtered.filter(l => l.score === f.score);
      if (f.stage) filtered = filtered.filter(l => l.stage === f.stage);
      return { count: filtered.length, sample: filtered.slice(0, 5) };
    } catch {
      return { count: leads.length, sample: leads.slice(0, 5) };
    }
  }),
});

// ===== MARKETING STATS =====
export const crmMarketingRouter = router({
  getStats: adminProcedure.input(z.object({
    startDate: z.number().optional(),
    endDate: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return crmDb.getMarketingStats(input?.startDate, input?.endDate);
  }),
});

// ===== VOICE TRANSCRIPTION FOR CRM =====
export const crmVoiceRouter = router({
  transcribe: publicProcedure.input(z.object({
    audioUrl: z.string(),
  })).mutation(async ({ input }) => {
    const result = await transcribeAudio({
      audioUrl: input.audioUrl,
      language: "pt",
      prompt: "Transcrever observacao sobre cliente de loja de veiculos",
    });
    if ("error" in result) { throw new Error(result.error); }
    return { text: result.text };
  }),
});


// ===== CHAT MESSAGES =====
import * as zapi from "../zapi-service";
import { invokeLLM } from "../_core/llm";

export const crmChatRouter = router({
  // Get messages for a lead
  getMessages: publicProcedure.input(z.object({
    leadId: z.number(),
  })).query(async ({ input }) => {
    return crmDb.listMessagesByLead(input.leadId, 200);
  }),

  // Send a message via Z-API and save to DB
  sendMessage: publicProcedure.input(z.object({
    leadId: z.number(),
    message: z.string(),
    sellerId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const lead = await crmDb.getLeadById(input.leadId);
    if (!lead || !lead.phone) throw new Error("Lead sem telefone");
    
    const result = await zapi.sendText(lead.phone, input.message);
    if (!result.success) throw new Error(result.error || "Erro ao enviar mensagem");
    
    await crmDb.createMessage({
      leadId: input.leadId,
      phone: lead.phone,
      direction: "outbound",
      messageType: "text",
      content: input.message,
      mediaUrl: null,
      senderName: null,
      sentBy: input.sellerId || null,
      zapiMessageId: result.messageId || null,
      timestamp: Date.now(),
    });
    
    // Update lastContactDate
    await crmDb.updateLead(input.leadId, { lastContactDate: Date.now() });
    
    return { success: true, messageId: result.messageId };
  }),

  // Send image via Z-API
  sendImage: publicProcedure.input(z.object({
    leadId: z.number(),
    imageUrl: z.string(),
    caption: z.string().optional(),
    sellerId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const lead = await crmDb.getLeadById(input.leadId);
    if (!lead || !lead.phone) throw new Error("Lead sem telefone");
    
    const result = await zapi.sendImage(lead.phone, input.imageUrl, input.caption);
    if (!result.success) throw new Error("Erro ao enviar imagem");
    
    await crmDb.createMessage({
      leadId: input.leadId,
      phone: lead.phone,
      direction: "outbound",
      messageType: "image",
      content: input.caption || null,
      mediaUrl: input.imageUrl,
      senderName: null,
      sentBy: input.sellerId || null,
      zapiMessageId: null,
      timestamp: Date.now(),
    });
    
    await crmDb.updateLead(input.leadId, { lastContactDate: Date.now() });
    return { success: true };
  }),

  // Send audio via Z-API
  sendAudio: publicProcedure.input(z.object({
    leadId: z.number(),
    audioUrl: z.string(),
    sellerId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const lead = await crmDb.getLeadById(input.leadId);
    if (!lead || !lead.phone) throw new Error("Lead sem telefone");
    const result = await zapi.sendAudio(lead.phone, input.audioUrl);
    if (!result.success) throw new Error("Erro ao enviar áudio");
    await crmDb.createMessage({
      leadId: input.leadId, phone: lead.phone, direction: "outbound",
      messageType: "audio", content: null, mediaUrl: input.audioUrl,
      senderName: null, sentBy: input.sellerId || null, zapiMessageId: null, timestamp: Date.now(),
    });
    await crmDb.updateLead(input.leadId, { lastContactDate: Date.now() });
    return { success: true };
  }),

  // Send video via Z-API
  sendVideo: publicProcedure.input(z.object({
    leadId: z.number(),
    videoUrl: z.string(),
    caption: z.string().optional(),
    sellerId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const lead = await crmDb.getLeadById(input.leadId);
    if (!lead || !lead.phone) throw new Error("Lead sem telefone");
    const result = await zapi.sendVideo(lead.phone, input.videoUrl, input.caption);
    if (!result.success) throw new Error("Erro ao enviar vídeo");
    await crmDb.createMessage({
      leadId: input.leadId, phone: lead.phone, direction: "outbound",
      messageType: "video", content: input.caption || null, mediaUrl: input.videoUrl,
      senderName: null, sentBy: input.sellerId || null, zapiMessageId: null, timestamp: Date.now(),
    });
    await crmDb.updateLead(input.leadId, { lastContactDate: Date.now() });
    return { success: true };
  }),

  // Send document via Z-API
  sendDocument: publicProcedure.input(z.object({
    leadId: z.number(),
    documentUrl: z.string(),
    fileName: z.string(),
    sellerId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const lead = await crmDb.getLeadById(input.leadId);
    if (!lead || !lead.phone) throw new Error("Lead sem telefone");
    const result = await zapi.sendDocument(lead.phone, input.documentUrl, input.fileName);
    if (!result.success) throw new Error("Erro ao enviar documento");
    await crmDb.createMessage({
      leadId: input.leadId, phone: lead.phone, direction: "outbound",
      messageType: "document", content: input.fileName, mediaUrl: input.documentUrl,
      senderName: null, sentBy: input.sellerId || null, zapiMessageId: null, timestamp: Date.now(),
    });
    await crmDb.updateLead(input.leadId, { lastContactDate: Date.now() });
    return { success: true };
  }),

  // Send vehicle from inventory to lead
  sendVehicle: publicProcedure.input(z.object({
    leadId: z.number(),
    vehicleId: z.number(),
    sellerId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const lead = await crmDb.getLeadById(input.leadId);
    if (!lead || !lead.phone) throw new Error("Lead sem telefone");
    
    // Query from inventory_vehicles table (same table the frontend list uses)
    const { getDb } = await import("../db");
    const { inventoryVehicles } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const dbConn = await getDb();
    if (!dbConn) throw new Error("Erro de conexão");
    const rows = await dbConn.select().from(inventoryVehicles).where(eq(inventoryVehicles.id, input.vehicleId)).limit(1);
    const v = rows[0];
    if (!v) throw new Error("Veículo não encontrado");
    
    // Build vehicle message
    const price = v.price ? `R$ ${Number(v.price).toLocaleString("pt-BR")}` : "Consulte";
    const msg = `🚗 *${v.brand} ${v.model}*\n` +
      `📅 Ano: ${v.year || "N/I"}\n` +
      `💰 Preço: ${price}\n` +
      `🔧 Câmbio: ${v.transmission || "N/I"}\n` +
      `⛽ Combustível: ${v.fuel || "N/I"}\n` +
      `📏 KM: ${v.km ? Number(v.km).toLocaleString("pt-BR") + " km" : "N/I"}\n` +
      (v.color ? `🎨 Cor: ${v.color}\n` : "") +
      (v.plate ? `🔖 Placa: ${v.plate}\n` : "") +
      `\n_Kafka Multimarcas_`;
    
    // Send text first
    await zapi.sendText(lead.phone, msg);
    
    // Send first image if available
    if (v.photoUrl) {
      try {
        await zapi.sendImage(lead.phone, v.photoUrl, `${v.brand} ${v.model}`);
      } catch {}
    }
    
    await crmDb.createMessage({
      leadId: input.leadId, phone: lead.phone, direction: "outbound",
      messageType: "text", content: msg, mediaUrl: null,
      senderName: null, sentBy: input.sellerId || null, zapiMessageId: null, timestamp: Date.now(),
    });
    await crmDb.updateLead(input.leadId, { lastContactDate: Date.now(), vehicleInterest: `${v.brand} ${v.model}` });
    return { success: true, vehicleName: `${v.brand} ${v.model}` };
  }),

  // Upload media file (base64) and return S3 URL
  uploadMedia: publicProcedure.input(z.object({
    base64: z.string(),
    filename: z.string(),
    mimeType: z.string(),
  })).mutation(async ({ input }) => {
    const buffer = Buffer.from(input.base64, "base64");
    const ext = input.filename.split(".").pop() || "bin";
    const key = `crm-media/${Date.now()}-${nanoid(6)}.${ext}`;
    const { url } = await storagePut(key, buffer, input.mimeType);
    return { url };
  }),
});

// ===== PERFORMANCE & ALERTS =====
export const crmPerformanceRouter = router({
  // Get unresponded leads (for alerts)
  getAlerts: publicProcedure.input(z.object({
    thresholdMinutes: z.number().default(5),
    sellerId: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    const threshold = input?.thresholdMinutes || 5;
    const unresponded = await crmDb.getUnrespondedLeads(threshold, input?.sellerId);
    return unresponded.map(lead => ({
      ...lead,
      minutesSinceCreation: Math.round((Date.now() - new Date(lead.createdAt).getTime()) / 60000),
      alertLevel: Math.round((Date.now() - new Date(lead.createdAt).getTime()) / 60000) > 10 ? "critical" : "warning",
    }));
  }),

  // Get seller performance stats
  getSellerStats: publicProcedure.input(z.object({
    sellerId: z.number(),
  })).query(async ({ input }) => {
    return crmDb.getSellerResponseStats(input.sellerId);
  }),

  // Get all sellers performance for dashboard
  getAllSellersStats: adminProcedure.query(async () => {
    const allSellers = await db.listSellers(true);
    const stats = [];
    for (const seller of allSellers) {
      if (seller.department === "vendas" || seller.department === "pre_vendas") {
        const s = await crmDb.getSellerResponseStats(seller.id);
        stats.push({
          sellerId: seller.id,
          sellerName: seller.name,
          department: seller.department,
          ...s,
        });
      }
    }
    return stats;
  }),

  // Auto-reassign unresponsive seller's lead
  autoReassign: adminProcedure.input(z.object({
    leadId: z.number(),
  })).mutation(async ({ input }) => {
    const result = await crmDb.autoReassignLead(input.leadId);
    if (!result) throw new Error("Não foi possível reatribuir o lead");
    return result;
  }),

  // Run check for all unresponsive leads and auto-reassign (called by cron or admin)
  runAutoReassignCheck: adminProcedure.mutation(async () => {
    // Get leads assigned to sellers (sellerId > 0) that haven't been responded in 10 min
    const unresponded = await crmDb.getUnrespondedLeads(10);
    const reassigned = [];
    for (const lead of unresponded) {
      if (lead.sellerId > 0) {
        const result = await crmDb.autoReassignLead(lead.id);
        if (result) {
          reassigned.push({ leadId: lead.id, leadName: lead.name, ...result });
        }
      }
    }
    return { checked: unresponded.length, reassigned };
  }),

  // AI analysis of a conversation
  analyzeConversation: publicProcedure.input(z.object({
    leadId: z.number(),
  })).mutation(async ({ input }) => {
    const messages = await crmDb.listMessagesByLead(input.leadId, 200);
    const lead = await crmDb.getLeadById(input.leadId);
    if (!lead) throw new Error("Lead não encontrado");
    if (messages.length < 2) return { score: 0, analysis: "Conversa insuficiente para análise (mínimo 2 mensagens).", tips: [] };

    const chatLog = messages.map(m => 
      `[${m.direction === "inbound" ? "CLIENTE" : "VENDEDOR"}] ${m.content || `[${m.messageType}]`}`
    ).join("\n");

    const response = await invokeLLM({
      messages: [
        { role: "system", content: `Você é um analista de vendas de veículos. Analise a conversa entre vendedor e cliente e dê uma nota de 0 a 10 para o atendimento. Considere: tempo de resposta, cordialidade, técnica de vendas, quebra de objeções, uso de gatilhos mentais, proatividade. Responda em JSON.` },
        { role: "user", content: `Lead: ${lead.name}\nVeículo de interesse: ${lead.vehicleInterest || "não informado"}\nConversa:\n${chatLog}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "conversation_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number", description: "Nota de 0 a 10" },
              analysis: { type: "string", description: "Resumo da análise em 2-3 frases" },
              strengths: { type: "array", items: { type: "string" }, description: "Pontos fortes do atendimento" },
              improvements: { type: "array", items: { type: "string" }, description: "Pontos a melhorar" },
              tips: { type: "array", items: { type: "string" }, description: "Dicas práticas para melhorar" },
            },
            required: ["score", "analysis", "strengths", "improvements", "tips"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content as unknown;
    if (!rawContent) return { score: 0, analysis: "Erro na análise", strengths: [], improvements: [], tips: [] };
    const text = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    try {
      return JSON.parse(text);
    } catch {
      return { score: 0, analysis: text, strengths: [], improvements: [], tips: [] };
    }
  }),
});
