import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import {
  listFinCategories, createFinCategory, updateFinCategory,
  listFinTransactions, getFinTransaction, createFinTransaction,
  updateFinTransaction, deleteFinTransaction, markAsPaid,
  getFinDashboard, parseDocumentWithLLM,
} from "../finDb";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";

const JWT_SECRET = process.env.JWT_SECRET || "kafka-secret";

// Middleware to verify admin JWT
const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const authHeader = (ctx as any).req?.headers?.authorization;
  const cookieToken = (ctx as any).req?.cookies?.crm_admin_token;
  const token = authHeader?.replace("Bearer ", "") || cookieToken;
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Token admin necessário" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: number; role: string };
    return next({ ctx: { ...ctx, adminId: decoded.adminId, adminRole: decoded.role } });
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token inválido" });
  }
});

// ===== CATEGORIES ROUTER =====
export const finCategoriesRouter = router({
  list: adminProcedure.input(z.object({ type: z.enum(["expense", "income"]).optional() }).optional()).query(async ({ input }) => {
    return listFinCategories(input?.type);
  }),
  create: adminProcedure.input(z.object({
    name: z.string().min(1),
    type: z.enum(["expense", "income"]),
    icon: z.string().optional(),
    color: z.string().optional(),
  })).mutation(async ({ input }) => {
    const id = await createFinCategory(input);
    return { id };
  }),
  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    active: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateFinCategory(id, data);
    return { success: true };
  }),
});

// ===== TRANSACTIONS ROUTER =====
export const finTransactionsRouter = router({
  list: adminProcedure.input(z.object({
    type: z.enum(["payable", "receivable"]).optional(),
    status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
    categoryId: z.number().optional(),
    startDate: z.number().optional(),
    endDate: z.number().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return listFinTransactions(input || {});
  }),
  
  get: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const tx = await getFinTransaction(input.id);
    if (!tx) throw new TRPCError({ code: "NOT_FOUND" });
    return tx;
  }),
  
  create: adminProcedure.input(z.object({
    type: z.enum(["payable", "receivable"]),
    description: z.string().min(1),
    amount: z.string(),
    dueDate: z.number(),
    status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
    categoryId: z.number().optional(),
    supplier: z.string().optional(),
    barcode: z.string().optional(),
    notes: z.string().optional(),
    receiptUrl: z.string().optional(),
    receiptKey: z.string().optional(),
    recurrence: z.enum(["none", "monthly", "weekly", "yearly"]).optional(),
    installmentNumber: z.number().optional(),
    installmentTotal: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const id = await createFinTransaction({ ...input, createdBy: (ctx as any).adminId });
    return { id };
  }),
  
  update: adminProcedure.input(z.object({
    id: z.number(),
    description: z.string().optional(),
    amount: z.string().optional(),
    dueDate: z.number().optional(),
    status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
    categoryId: z.number().optional(),
    supplier: z.string().optional(),
    barcode: z.string().optional(),
    notes: z.string().optional(),
    receiptUrl: z.string().optional(),
    receiptKey: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateFinTransaction(id, data);
    return { success: true };
  }),
  
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteFinTransaction(input.id);
    return { success: true };
  }),
  
  markPaid: adminProcedure.input(z.object({
    id: z.number(),
    paidDate: z.number().optional(),
  })).mutation(async ({ input }) => {
    await markAsPaid(input.id, input.paidDate || Date.now());
    return { success: true };
  }),
  
  dashboard: adminProcedure.input(z.object({
    month: z.number().optional(),
    year: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return getFinDashboard(input?.month, input?.year);
  }),
  
  // OCR: scan document with camera
  scanDocument: adminProcedure.input(z.object({
    imageBase64: z.string(),
    docType: z.enum(["boleto", "nota_fiscal", "conta"]),
    mimeType: z.string().default("image/jpeg"),
  })).mutation(async ({ input }) => {
    try {
      // Upload image to S3 first
      const buffer = Buffer.from(input.imageBase64, "base64");
      const fileName = `fin-scan-${Date.now()}.${input.mimeType.includes("png") ? "png" : "jpg"}`;
      const { url: imageUrl, key: imageKey } = await storagePut(`financial/${fileName}`, buffer, input.mimeType);
      
      // Get the prompt for this document type
      const prompt = await parseDocumentWithLLM(imageUrl, input.docType);
      
      // Call LLM Vision to extract data
      const response = await invokeLLM({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
            ],
          },
        ],
      });
      
      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
      // Try to parse JSON from the response
      let parsed: any = {};
      try {
        // Extract JSON from possible markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        parsed = JSON.parse(jsonMatch[1]?.trim() || content.trim());
      } catch {
        parsed = { raw: content };
      }
      
      return {
        success: true,
        data: parsed,
        imageUrl,
        imageKey,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao processar documento: ${error.message}`,
      });
    }
  }),
  
  // Upload receipt/comprovante
  uploadReceipt: adminProcedure.input(z.object({
    transactionId: z.number(),
    imageBase64: z.string(),
    mimeType: z.string().default("image/jpeg"),
  })).mutation(async ({ input }) => {
    const buffer = Buffer.from(input.imageBase64, "base64");
    const ext = input.mimeType.includes("png") ? "png" : input.mimeType.includes("pdf") ? "pdf" : "jpg";
    const fileName = `receipt-${input.transactionId}-${Date.now()}.${ext}`;
    const { url, key } = await storagePut(`financial/receipts/${fileName}`, buffer, input.mimeType);
    await updateFinTransaction(input.transactionId, { receiptUrl: url, receiptKey: key });
    return { url, key };
  }),
});
