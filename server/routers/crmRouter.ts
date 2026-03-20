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
  })).mutation(async ({ input }) => {
    const hash = await bcrypt.hash(input.password, 10);
    const id = await crmDb.createAdmin({ username: input.username, passwordHash: hash, name: input.name, role: input.role });
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
});

// ===== CRM PIPELINE =====
export const crmPipelineRouter = router({
  getStages: publicProcedure.input(z.object({ department: z.string().optional() }).optional()).query(async ({ input }) => {
    return crmDb.listPipelineStages(input?.department);
  }),
});

// ===== CRM INVENTORY =====
export const crmInventoryRouter = router({
  create: adminProcedure.input(z.object({
    brand: z.string().min(1),
    model: z.string().min(1),
    year: z.string().optional(),
    plate: z.string().optional(),
    color: z.string().optional(),
    mileage: z.number().optional(),
    fuelType: z.string().optional(),
    transmission: z.string().optional(),
    price: z.number(),
    costPrice: z.number().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const id = await crmDb.createInventoryItem(input);
    // Check for matching leads
    const searchTerm = `${input.brand} ${input.model}`;
    const matchingLeads = await crmDb.getLeadsByVehicleInterest(searchTerm);
    // Create alerts for matching leads
    for (const lead of matchingLeads) {
      await crmDb.createInventoryAlert({
        inventoryId: id,
        leadId: lead.id,
        sellerId: lead.sellerId,
      });
    }
    return { id, matchingLeads: matchingLeads.length };
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return crmDb.getInventoryById(input.id);
  }),

  list: publicProcedure.input(z.object({
    status: z.string().optional(),
    search: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return crmDb.listInventory(input || {});
  }),

  update: adminProcedure.input(z.object({
    id: z.number(),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.string().optional(),
    plate: z.string().optional(),
    color: z.string().optional(),
    mileage: z.number().optional(),
    fuelType: z.string().optional(),
    transmission: z.string().optional(),
    price: z.number().optional(),
    costPrice: z.number().optional(),
    status: z.enum(["available", "reserved", "sold", "consigned"]).optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await crmDb.updateInventoryItem(id, data as any);
    return { success: true };
  }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await crmDb.deleteInventoryItem(input.id);
    return { success: true };
  }),

  uploadPhoto: adminProcedure.input(z.object({
    id: z.number(),
    base64: z.string(),
    mimeType: z.string(),
  })).mutation(async ({ input }) => {
    const ext = input.mimeType.split("/")[1] || "jpg";
    const fileKey = `inventory/${input.id}-${nanoid(8)}.${ext}`;
    const buffer = Buffer.from(input.base64, "base64");
    const { url } = await storagePut(fileKey, buffer, input.mimeType);
    await crmDb.updateInventoryItem(input.id, { photoUrl: url, photoKey: fileKey });
    return { url };
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
