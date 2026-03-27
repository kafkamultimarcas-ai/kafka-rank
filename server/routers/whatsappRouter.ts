import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as zapi from "../zapi-service";

export const whatsappRouter = router({
  // Check Z-API connection status
  status: adminProcedure.query(async () => {
    return zapi.getStatus();
  }),

  // Send a text message
  sendText: adminProcedure
    .input(z.object({
      phone: z.string().min(8),
      message: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      return zapi.sendText(input.phone, input.message);
    }),

  // Send an image
  sendImage: adminProcedure
    .input(z.object({
      phone: z.string().min(8),
      imageUrl: z.string().url(),
      caption: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return zapi.sendImage(input.phone, input.imageUrl, input.caption);
    }),

  // Send vehicle info to a client via WhatsApp
  sendVehicle: adminProcedure
    .input(z.object({
      phone: z.string().min(8),
      vehicleId: z.number(),
      customMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Import dynamically to avoid circular deps
      const { getDb } = await import("../db");
      const { inventoryVehicles } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const [vehicle] = await db.select().from(inventoryVehicles).where(eq(inventoryVehicles.id, input.vehicleId)).limit(1);
      if (!vehicle) throw new Error("Veículo não encontrado");

      const priceFormatted = vehicle.price
        ? `R$ ${vehicle.price.toLocaleString("pt-BR")}`
        : "Consulte";

      const message = input.customMessage || 
        `🚗 *${vehicle.brand} ${vehicle.model}*\n` +
        `📋 ${vehicle.version || ""}\n` +
        `📅 Ano: ${vehicle.year || "N/A"}\n` +
        `🔧 KM: ${vehicle.km?.toLocaleString("pt-BR") || "0"}\n` +
        `💰 ${priceFormatted}\n\n` +
        `${vehicle.externalUrl || ""}`;

      // Send photo first if available
      if (vehicle.photoUrl) {
        await zapi.sendImage(input.phone, vehicle.photoUrl, message);
        return { success: true };
      }

      return zapi.sendText(input.phone, message);
    }),

  // Configure Z-API webhook to point to our server
  configureWebhook: adminProcedure
    .input(z.object({
      webhookUrl: z.string().url().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      // Default to our production webhook URL
      const url = input?.webhookUrl || "https://kafkarank.com/api/webhooks/whatsapp";
      return zapi.setWebhook(url);
    }),

  // Send a link
  sendLink: adminProcedure
    .input(z.object({
      phone: z.string().min(8),
      url: z.string().url(),
      title: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return zapi.sendLink(input.phone, input.url, input.title, input.description);
    }),

  // Import contacts from WhatsApp Business via Z-API
  importContacts: adminProcedure.mutation(async () => {
    const contacts = await zapi.getContacts();
    if (!contacts.length) return { imported: 0, total: 0, message: "Nenhum contato encontrado ou Z-API desconectado" };

    const { getDb } = await import("../db");
    const { crmLeads } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) throw new Error("DB not available");

    let imported = 0;
    for (const c of contacts) {
      if (!c.phone) continue;
      const phone = c.phone.replace(/\D/g, "");
      if (!phone || phone.length < 10) continue;

      // Check if lead already exists by phone
      const existing = await db.select({ id: crmLeads.id }).from(crmLeads)
        .where(eq(crmLeads.phone, phone)).limit(1);
      if (existing.length > 0) continue;

      const name = c.notify || c.name || c.short || c.vname || `Contato ${phone.slice(-4)}`;
      await db.insert(crmLeads).values({
        name,
        phone,
        source: "whatsapp",
        score: "warm",
        stage: "novo",
        sellerId: 0, // Unassigned - SDR will distribute
        notes: "Importado do WhatsApp Business",
      });
      imported++;
    }
    return { imported, total: contacts.length, message: `${imported} novos leads importados de ${contacts.length} contatos` };
  }),

  // Import chats (recent conversations) from WhatsApp Business via Z-API
  importChats: adminProcedure.mutation(async () => {
    const chats = await zapi.getChats();
    if (!chats.length) return { imported: 0, total: 0, message: "Nenhum chat encontrado ou Z-API desconectado" };

    const { getDb } = await import("../db");
    const { crmLeads } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) throw new Error("DB not available");

    let imported = 0;
    for (const chat of chats) {
      if (!chat.phone || chat.isGroup) continue;
      const phone = chat.phone.replace(/\D/g, "");
      if (!phone || phone.length < 10) continue;

      const existing = await db.select({ id: crmLeads.id }).from(crmLeads)
        .where(eq(crmLeads.phone, phone)).limit(1);
      if (existing.length > 0) continue;

      const name = chat.name || `Chat ${phone.slice(-4)}`;
      const lastMsg = chat.lastMessageTime ? parseInt(chat.lastMessageTime) * 1000 : Date.now();
      await db.insert(crmLeads).values({
        name,
        phone,
        source: "whatsapp",
        score: chat.unread && parseInt(chat.unread) > 0 ? "hot" : "warm",
        stage: "novo",
        sellerId: 0,
        notes: `Importado de chat WhatsApp${chat.notes?.content ? ` - Nota: ${chat.notes.content}` : ""}`,
        lastContactDate: lastMsg,
      });
      imported++;
    }
    return { imported, total: chats.length, message: `${imported} novos leads importados de ${chats.length} chats` };
  }),

  // Send bulk messages (mass messaging for feirão etc.)
  sendBulk: adminProcedure
    .input(z.object({
      phones: z.array(z.string().min(8)),
      message: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      if (input.phones.length > 500) {
        throw new Error("Máximo de 500 mensagens por disparo para evitar banimento");
      }
      const result = await zapi.sendTextBulk(input.phones, input.message);

      // Log the bulk send
      try {
        const { getDb } = await import("../db");
        const { crmBulkSendLogs } = await import("../../drizzle/schema");
        const db = await getDb();
        if (db) {
          await db.insert(crmBulkSendLogs).values({
            message: input.message,
            totalRecipients: input.phones.length,
            sent: result.sent,
            failed: result.failed,
            errors: JSON.stringify(result.errors.slice(0, 20)),
            createdAt: Date.now(),
          });
        }
      } catch (e) {
        console.error("[BulkSend] Failed to log:", e);
      }

      return result;
    }),

  // Get bulk send history
  bulkHistory: adminProcedure.query(async () => {
    try {
      const { getDb } = await import("../db");
      const { crmBulkSendLogs } = await import("../../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return [];
      return db.select().from(crmBulkSendLogs).orderBy(desc(crmBulkSendLogs.createdAt)).limit(50);
    } catch {
      return [];
    }
  }),
});
