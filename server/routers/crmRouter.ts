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
  // Auto-login for owner - enters CRM admin without password
  autoLogin: publicProcedure.mutation(async () => {
    const admin = await crmDb.getAdminByUsername("kafka");
    if (!admin || !admin.active) {
      throw new Error("Conta admin n\u00e3o encontrada");
    }
    const token = jwt.sign(
      { adminId: admin.id, role: admin.role, type: "admin_auth" },
      ENV.cookieSecret,
      { expiresIn: "30d" }
    );
    return { token, admin: { id: admin.id, name: admin.name, username: admin.username, role: admin.role } };
  }),

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
    
    // Build simplified vehicle message (only name + year + link)
    const msg = `🚗 *${v.brand} ${v.model}*\n` +
      `📅 Ano: ${v.year || "N/I"}\n` +
      (v.externalUrl ? `\n🔗 ${v.externalUrl}\n` : "") +
      `\n_Kafka Multimarcas_`;
    
    // Send text first
    await zapi.sendText(lead.phone, msg);
    
    // Collect ALL photo URLs from photos[] JSON array, fallback to photoUrl
    let photoUrls: string[] = [];
    if (v.photos) {
      try {
        const parsed = typeof v.photos === "string" ? JSON.parse(v.photos) : v.photos;
        if (Array.isArray(parsed)) photoUrls = parsed.filter((u: any) => typeof u === "string" && u.length > 0);
      } catch {}
    }
    if (photoUrls.length === 0 && v.photoUrl) {
      photoUrls = [v.photoUrl];
    }
    
    // Helper: download image and re-upload to S3 to avoid blocked URLs
    const { storagePut } = await import("../storage");
    async function proxyImageToS3(url: string, index: number): Promise<string | null> {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": "https://www.kafkamultimarcas.com.br/" },
          redirect: "follow",
        });
        if (!res.ok) return null;
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const ext = url.includes(".webp") ? "webp" : url.includes(".png") ? "png" : "jpg";
        const key = `vehicle-photos/${input.vehicleId}-${index}-${Date.now()}.${ext}`;
        const { url: s3Url } = await storagePut(key, buffer, contentType);
        return s3Url;
      } catch {
        return null;
      }
    }
    
    // Send ALL photos - proxy each through S3 then send via Z-API
    let sentCount = 0;
    const sentPhotoUrls: string[] = [];
    for (let i = 0; i < photoUrls.length; i++) {
      try {
        // First try direct URL
        let sendUrl = photoUrls[i];
        let result = await zapi.sendImage(lead.phone, sendUrl, i === 0 ? `${v.brand} ${v.model}` : "");
        if (!result.success) {
          // If direct fails, proxy through S3
          const s3Url = await proxyImageToS3(photoUrls[i], i);
          if (s3Url) {
            sendUrl = s3Url;
            result = await zapi.sendImage(lead.phone, s3Url, i === 0 ? `${v.brand} ${v.model}` : "");
          }
        }
        if (result.success) { sentCount++; sentPhotoUrls.push(sendUrl); }
        // Small delay between images to avoid rate limiting
        if (i < photoUrls.length - 1) await new Promise(r => setTimeout(r, 500));
      } catch {}
    }
    
    // Save text message
    await crmDb.createMessage({
      leadId: input.leadId, phone: lead.phone, direction: "outbound",
      messageType: "text", content: msg, mediaUrl: null,
      senderName: null, sentBy: input.sellerId || null, zapiMessageId: null, timestamp: Date.now(),
    });
    // Save each sent photo as a separate image message so sender can see them in chat
    for (const photoUrl of sentPhotoUrls) {
      await crmDb.createMessage({
        leadId: input.leadId, phone: lead.phone, direction: "outbound",
        messageType: "image", content: null, mediaUrl: photoUrl,
        senderName: null, sentBy: input.sellerId || null, zapiMessageId: null, timestamp: Date.now(),
      });
    }
    await crmDb.updateLead(input.leadId, { lastContactDate: Date.now(), vehicleInterest: `${v.brand} ${v.model}` });
    return { success: true, vehicleName: `${v.brand} ${v.model}`, photosSent: sentCount, photosTotal: photoUrls.length };
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

// ===== AI SALES ASSISTANT =====
export const crmAiRouter = router({
  // Generate AI suggestion for a reply
  suggestReply: publicProcedure.input(z.object({
    leadId: z.number(),
    customPrompt: z.string().optional(), // optional extra instruction from seller
  })).mutation(async ({ input }) => {
    // 1. Get lead info
    const lead = await crmDb.getLeadById(input.leadId);
    if (!lead) throw new Error("Lead não encontrado");

    // 2. Get recent messages (last 30)
    const messages = await crmDb.listMessagesByLead(input.leadId, 30);

    // 3. Get vehicle of interest from inventory if available
    let vehicleContext = "";
    if (lead.vehicleInterest) {
      const { getDb } = await import("../db");
      const { inventoryVehicles } = await import("../../drizzle/schema");
      const { like, or, and, eq } = await import("drizzle-orm");
      const dbConn = await getDb();
      if (dbConn) {
        const search = `%${lead.vehicleInterest}%`;
        const vehicles = await dbConn.select().from(inventoryVehicles)
          .where(and(
            eq(inventoryVehicles.status, "available"),
            or(like(inventoryVehicles.model, search), like(inventoryVehicles.brand, search))
          )).limit(5);
        if (vehicles.length > 0) {
          vehicleContext = "\n\nVEÍCULOS DISPONÍVEIS NO ESTOQUE:\n" + vehicles.map(v =>
            `- ${v.brand} ${v.model} ${v.version || ""} ${v.year || ""} | Cor: ${v.color || "N/A"} | KM: ${v.km?.toLocaleString("pt-BR") || "N/A"} | Preço: R$ ${v.price?.toLocaleString("pt-BR") || "N/A"} | Câmbio: ${v.transmission || "N/A"} | Combustível: ${v.fuel || "N/A"} | Placa: ${v.plate || "N/A"}`
          ).join("\n");
        }
      }
    }

    // 4. Build conversation history for context
    const chatHistory = messages.slice(-20).map(m => {
      const role = m.direction === "inbound" ? "CLIENTE" : "VENDEDOR";
      const text = m.content || (m.messageType === "audio" || m.messageType === "ptt" ? "[Áudio]" : m.messageType === "image" ? "[Imagem]" : "[Mídia]");
      return `${role}: ${text}`;
    }).join("\n");

    // 4.5 Fetch global AI mode config
    let feiraoContext = '';
    try {
      const { getDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const dbConn = await getDb();
      if (dbConn) {
        const cfgResult = await dbConn.execute(sql`SELECT aiMode, feiraoConfig FROM crm_ai_global_config WHERE id = 1 LIMIT 1`);
        const cfgRaw = cfgResult as any;
        const cfgRows = Array.isArray(cfgRaw?.[0]) ? cfgRaw[0] : cfgRaw;
        if (cfgRows && cfgRows.length > 0 && cfgRows[0].aiMode === 'feirao' && cfgRows[0].feiraoConfig) {
          const fc = JSON.parse(cfgRows[0].feiraoConfig);
          feiraoContext = `\n\n=== MODO FEIRÃO ATIVO ===`;
          if (fc.beneficios) feiraoContext += `\nBenefícios: ${fc.beneficios}`;
          if (fc.promocoes) feiraoContext += `\nPromoções: ${fc.promocoes}`;
          if (fc.objetivo) feiraoContext += `\nObjetivo: ${fc.objetivo}`;
          if (fc.instrucoes) feiraoContext += `\nInstruções: ${fc.instrucoes}`;
          feiraoContext += `\nIMPORTANTE: Você DEVE mencionar o feirão e os benefícios. Tente AGENDAR o cliente para visitar a loja. Crie urgência!`;
        }
      }
    } catch { /* ignore */ }

    // 5. Call LLM - optimized for short, humanized WhatsApp messages
    const systemPrompt = `Você é vendedor da Kafka Multimarcas. Responda como um vendedor real de loja de carros pelo WhatsApp.

REGRAS OBRIGATÓRIAS:
- MÁXIMO 2-3 linhas por mensagem (como uma pessoa real digitaria no WhatsApp)
- Linguagem natural, informal, como se estivesse conversando com um amigo
- SEM formatação (sem negrito, sem markdown, sem asteriscos)
- Máximo 1 emoji por mensagem (ou nenhum)
- NUNCA invente dados de veículos
- Foque em UMA coisa por mensagem: ou pergunta, ou resposta, ou convite pra visita
- Se puder, chame pelo primeiro nome
- Tente sempre levar pra visita na loja ou test drive${feiraoContext}

LEAD: ${lead.name} | Interesse: ${lead.vehicleInterest || "N/A"} | Etapa: ${lead.stage}${vehicleContext}

CONVERSA:
${chatHistory || "(Primeira mensagem)"}`;

    const userMessage = input.customPrompt
      ? `${input.customPrompt}. Responda em no máximo 2-3 linhas curtas.`
      : "Gere a próxima mensagem do vendedor. Máximo 2-3 linhas curtas, como uma mensagem real de WhatsApp. Apenas o texto, sem prefixos.";

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const suggestion = (response.choices?.[0]?.message?.content as string) || "Não foi possível gerar sugestão.";
    return { suggestion: suggestion.trim() };
  }),

  // Get/Set AI auto-reply setting for a lead
  getAutoReply: publicProcedure.input(z.object({
    leadId: z.number(),
  })).query(async ({ input }) => {
    const { getDb } = await import("../db");
    const dbConn = await getDb();
    if (!dbConn) return { enabled: false, aiMode: 'normal' as string };
    try {
      const { sql } = await import("drizzle-orm");
      const result = await dbConn.execute(sql`SELECT enabled, aiMode FROM crm_ai_settings WHERE leadId = ${input.leadId} LIMIT 1`);
      const rawRows = result as any;
      // Drizzle execute() returns [rows, fields] for MySQL - need to unwrap
      const rows = Array.isArray(rawRows?.[0]) ? rawRows[0] : rawRows;
      if (rows && rows.length > 0) return { enabled: !!rows[0].enabled, aiMode: rows[0].aiMode || 'normal' };
      return { enabled: false, aiMode: 'normal' as string };
    } catch {
      return { enabled: false, aiMode: 'normal' as string };
    }
  }),

  setAutoReply: publicProcedure.input(z.object({
    leadId: z.number(),
    enabled: z.boolean(),
  })).mutation(async ({ input }) => {
    const { getDb } = await import("../db");
    const dbConn = await getDb();
    if (!dbConn) throw new Error("DB not available");
    const { sql } = await import("drizzle-orm");
    const val = input.enabled ? 1 : 0;
    await dbConn.execute(sql`INSERT INTO crm_ai_settings (leadId, enabled) VALUES (${input.leadId}, ${val}) ON DUPLICATE KEY UPDATE enabled = ${val}`);
    return { success: true };
  }),

  // Get global AI mode config (with advanced settings)
  getGlobalAiConfig: publicProcedure.query(async () => {
    const { getDb } = await import("../db");
    const dbConn = await getDb();
    const defaults = {
      aiMode: 'normal' as string, feiraoConfig: null as any, normalConfig: null as any,
      autoReplyEnabled: false, workingHoursEnabled: false, workingHoursStart: 8, workingHoursEnd: 20,
      maxMessagesEnabled: false, maxMessagesPerLead: 10, personality: 'amigavel' as string,
      inactiveDispatchEnabled: false, inactiveDispatchHours: 1, inactiveDispatchMessage: '' as string,
      inactiveDispatchMaxPerDay: 1,
    };
    if (!dbConn) return defaults;
    try {
      const { sql } = await import("drizzle-orm");
      const result = await dbConn.execute(sql`SELECT * FROM crm_ai_global_config WHERE id = 1 LIMIT 1`);
      const rawRows = result as any;
      const rows = Array.isArray(rawRows?.[0]) ? rawRows[0] : rawRows;
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          aiMode: r.aiMode || 'normal',
          feiraoConfig: r.feiraoConfig ? JSON.parse(r.feiraoConfig) : null,
          normalConfig: r.normalConfig ? JSON.parse(r.normalConfig) : null,
          autoReplyEnabled: !!r.autoReplyEnabled,
          workingHoursEnabled: !!r.workingHoursEnabled,
          workingHoursStart: r.workingHoursStart ?? 8,
          workingHoursEnd: r.workingHoursEnd ?? 20,
          maxMessagesEnabled: !!r.maxMessagesEnabled,
          maxMessagesPerLead: r.maxMessagesPerLead ?? 10,
          personality: r.personality || 'amigavel',
          inactiveDispatchEnabled: !!r.inactiveDispatchEnabled,
          inactiveDispatchHours: r.inactiveDispatchHours ?? 1,
          inactiveDispatchMessage: r.inactiveDispatchMessage || '',
          inactiveDispatchMaxPerDay: r.inactiveDispatchMaxPerDay ?? 1,
        };
      }
      return defaults;
    } catch {
      return defaults;
    }
  }),

  // Set global AI mode config
  setGlobalAiConfig: protectedProcedure.input(z.object({
    aiMode: z.enum(['normal', 'feirao', 'custom']),
    feiraoConfig: z.object({
      beneficios: z.string().optional(),
      promocoes: z.string().optional(),
      objetivo: z.string().optional(),
      instrucoes: z.string().optional(),
    }).optional(),
    normalConfig: z.object({
      instrucoes: z.string().optional(),
    }).optional(),
  })).mutation(async ({ input }) => {
    const { getDb } = await import("../db");
    const dbConn = await getDb();
    if (!dbConn) throw new Error("DB not available");
    const { sql } = await import("drizzle-orm");
    const feiraoJson = input.feiraoConfig ? JSON.stringify(input.feiraoConfig) : null;
    const normalJson = input.normalConfig ? JSON.stringify(input.normalConfig) : null;
    const now = Date.now();
    await dbConn.execute(sql`UPDATE crm_ai_global_config SET aiMode = ${input.aiMode}, feiraoConfig = ${feiraoJson}, normalConfig = ${normalJson}, updatedAt = ${now} WHERE id = 1`);
    return { success: true };
  }),

  // Set advanced AI settings
  setAdvancedAiConfig: protectedProcedure.input(z.object({
    autoReplyEnabled: z.boolean().optional(),
    workingHoursEnabled: z.boolean().optional(),
    workingHoursStart: z.number().min(0).max(23).optional(),
    workingHoursEnd: z.number().min(0).max(23).optional(),
    maxMessagesEnabled: z.boolean().optional(),
    maxMessagesPerLead: z.number().min(1).max(100).optional(),
    personality: z.enum(['amigavel', 'profissional', 'agressivo']).optional(),
    inactiveDispatchEnabled: z.boolean().optional(),
    inactiveDispatchHours: z.number().min(1).max(72).optional(),
    inactiveDispatchMessage: z.string().optional(),
    inactiveDispatchMaxPerDay: z.number().min(1).max(5).optional(),
  })).mutation(async ({ input }) => {
    const { getDb } = await import("../db");
    const dbConn = await getDb();
    if (!dbConn) throw new Error("DB not available");
    const { sql } = await import("drizzle-orm");
    const now = Date.now();
    await dbConn.execute(sql`UPDATE crm_ai_global_config SET 
      autoReplyEnabled = ${input.autoReplyEnabled !== undefined ? (input.autoReplyEnabled ? 1 : 0) : sql`autoReplyEnabled`},
      workingHoursEnabled = ${input.workingHoursEnabled !== undefined ? (input.workingHoursEnabled ? 1 : 0) : sql`workingHoursEnabled`},
      workingHoursStart = ${input.workingHoursStart !== undefined ? input.workingHoursStart : sql`workingHoursStart`},
      workingHoursEnd = ${input.workingHoursEnd !== undefined ? input.workingHoursEnd : sql`workingHoursEnd`},
      maxMessagesEnabled = ${input.maxMessagesEnabled !== undefined ? (input.maxMessagesEnabled ? 1 : 0) : sql`maxMessagesEnabled`},
      maxMessagesPerLead = ${input.maxMessagesPerLead !== undefined ? input.maxMessagesPerLead : sql`maxMessagesPerLead`},
      personality = ${input.personality !== undefined ? input.personality : sql`personality`},
      inactiveDispatchEnabled = ${input.inactiveDispatchEnabled !== undefined ? (input.inactiveDispatchEnabled ? 1 : 0) : sql`inactiveDispatchEnabled`},
      inactiveDispatchHours = ${input.inactiveDispatchHours !== undefined ? input.inactiveDispatchHours : sql`inactiveDispatchHours`},
      inactiveDispatchMessage = ${input.inactiveDispatchMessage !== undefined ? input.inactiveDispatchMessage : sql`inactiveDispatchMessage`},
      inactiveDispatchMaxPerDay = ${input.inactiveDispatchMaxPerDay !== undefined ? input.inactiveDispatchMaxPerDay : sql`inactiveDispatchMaxPerDay`},
      updatedAt = ${now}
    WHERE id = 1`);

    // When global toggle changes, mass-update all leads
    if (input.autoReplyEnabled !== undefined) {
      const val = input.autoReplyEnabled ? 1 : 0;
      await dbConn.execute(sql`UPDATE crm_ai_settings SET enabled = ${val}`);
      console.log(`[AI Config] Global toggle ${input.autoReplyEnabled ? 'ON' : 'OFF'} - updated all leads`);
    }

    return { success: true };
  }),

  // Get inactive dispatch stats
  getInactiveDispatchStats: publicProcedure.query(async () => {
    const { getDb } = await import("../db");
    const dbConn = await getDb();
    if (!dbConn) return { todayCount: 0, totalCount: 0, lastRun: null as number | null };
    try {
      const { sql } = await import("drizzle-orm");
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayResult = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM crm_ai_inactive_dispatch_log WHERE sentAt >= ${todayStart.getTime()}`);
      const totalResult = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM crm_ai_inactive_dispatch_log`);
      const configResult = await dbConn.execute(sql`SELECT inactiveDispatchLastRun FROM crm_ai_global_config WHERE id = 1 LIMIT 1`);
      const todayRaw = todayResult as any;
      const totalRaw = totalResult as any;
      const cfgRaw = configResult as any;
      const todayRows = Array.isArray(todayRaw?.[0]) ? todayRaw[0] : todayRaw;
      const totalRows = Array.isArray(totalRaw?.[0]) ? totalRaw[0] : totalRaw;
      const cfgRows = Array.isArray(cfgRaw?.[0]) ? cfgRaw[0] : cfgRaw;
      return {
        todayCount: Number(todayRows?.[0]?.cnt || 0),
        totalCount: Number(totalRows?.[0]?.cnt || 0),
        lastRun: cfgRows?.[0]?.inactiveDispatchLastRun ? Number(cfgRows[0].inactiveDispatchLastRun) : null,
      };
    } catch {
      return { todayCount: 0, totalCount: 0, lastRun: null as number | null };
    }
  }),

  // Manual trigger inactive dispatch
  triggerInactiveDispatch: protectedProcedure.mutation(async () => {
    const { runInactiveDispatch } = await import("../inactive-dispatch");
    const result = await runInactiveDispatch();
    return result;
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
