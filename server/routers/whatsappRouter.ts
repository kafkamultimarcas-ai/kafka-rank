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
});
