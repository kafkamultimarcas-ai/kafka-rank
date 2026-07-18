import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  listFinCategories, createFinCategory, updateFinCategory,
  listFinTransactions, getFinTransaction, createFinTransaction,
  updateFinTransaction, deleteFinTransaction, markAsPaid,
  getFinDashboard, parseDocumentWithLLM,
  getOverdueTransactions, getUpcomingDueTransactions, getFinancialAlerts,
  listFuelRecords, createFuelRecord, updateFuelRecord, deleteFuelRecord, getFuelDashboard,
} from "../finDb";
import {
  createSellerAdvance, deleteAdvanceByFinTransaction, updateAdvanceByFinTransaction,
} from "../db";
import { getCurrentTenantId } from "../tenantDb";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";

// Converte um valor em reais (string/number) para centavos inteiros.
function reaisToCents(amount: string | number): number {
  return Math.round((Number(amount) || 0) * 100);
}

// ===== CATEGORIES ROUTER =====
export const finCategoriesRouter = router({
  list: publicProcedure.input(z.object({ type: z.enum(["expense", "income"]).optional() }).optional()).query(async ({ input }) => {
    return listFinCategories(input?.type);
  }),
  create: publicProcedure.input(z.object({
    name: z.string().min(1),
    type: z.enum(["expense", "income"]),
    icon: z.string().optional(),
    color: z.string().optional(),
  })).mutation(async ({ input }) => {
    const id = await createFinCategory(input);
    return { id };
  }),
  update: publicProcedure.input(z.object({
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
  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await updateFinCategory(input.id, { active: false });
    return { success: true };
  }),
});

// ===== TRANSACTIONS ROUTER =====
export const finTransactionsRouter = router({
  list: publicProcedure.input(z.object({
    type: z.enum(["payable", "receivable"]).optional(),
    status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
    categoryId: z.number().optional(),
    startDate: z.number().optional(),
    endDate: z.number().optional(),
    search: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return listFinTransactions(input || {});
  }),
  
  get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const tx = await getFinTransaction(input.id);
    if (!tx) throw new TRPCError({ code: "NOT_FOUND" });
    return tx;
  }),
  
  create: publicProcedure.input(z.object({
    type: z.enum(["payable", "receivable"]),
    description: z.string().min(1),
    amount: z.string(),
    dueDate: z.number(),
    status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
    paidDate: z.number().nullable().optional(),
    categoryId: z.number().nullable().optional(),
    supplier: z.string().optional(),
    vehicle: z.string().optional(),
    barcode: z.string().optional(),
    notes: z.string().optional(),
    receiptUrl: z.string().optional(),
    receiptKey: z.string().optional(),
    recurrence: z.enum(["none", "monthly", "weekly", "yearly"]).optional(),
    // Quando a recorrência é "monthly", gera esta quantidade de contas (uma por mês).
    recurrenceMonths: z.number().int().min(1).max(60).optional(),
    installmentNumber: z.number().optional(),
    installmentTotal: z.number().optional(),
    needsApproval: z.boolean().optional(),
    createdByName: z.string().optional(),
    // Vale/adiantamento: quando informado, a conta é vinculada a um colaborador
    // e reflete automaticamente no Financeiro dos Vendedores.
    sellerId: z.number().optional(),
  })).mutation(async ({ input, ctx }) => {
    const { recurrenceMonths, ...txInput } = input;
    const approvalStatus = input.needsApproval ? "pending_approval" as const : "none" as const;

    // Recorrência mensal: gera N contas (uma por mês), mantendo o dia de vencimento
    // (com clamp para meses mais curtos). Demais recorrências geram 1 conta.
    const months = input.recurrence === "monthly" ? Math.max(1, Math.min(recurrenceMonths ?? 1, 60)) : 1;
    const base = new Date(input.dueDate);
    const addMonths = (n: number) => {
      const d = new Date(base.getFullYear(), base.getMonth() + n, 1, base.getHours(), base.getMinutes(), base.getSeconds());
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(base.getDate(), lastDay));
      return d.getTime();
    };

    const ids: number[] = [];
    for (let i = 0; i < months; i++) {
      const dueDate = months > 1 ? addMonths(i) : input.dueDate;
      const description = months > 1 ? `${input.description} (${i + 1}/${months})` : input.description;
      const id = await createFinTransaction({
        ...txInput,
        description,
        dueDate,
        categoryId: input.categoryId ?? undefined,
        paidDate: input.paidDate ?? undefined,
        installmentNumber: months > 1 ? i + 1 : input.installmentNumber,
        installmentTotal: months > 1 ? months : input.installmentTotal,
        createdBy: ctx.user?.id,
        approvalStatus,
      });
      ids.push(id);

      // Integração Vale do Colaborador: espelha cada conta gerada como vale do vendedor.
      if (input.sellerId) {
        const d = new Date(dueDate);
        await createSellerAdvance({
          sellerId: input.sellerId,
          amount: reaisToCents(input.amount),
          description,
          date: dueDate,
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          createdBy: ctx.user?.id,
          finTransactionId: id,
          tenantId: getCurrentTenantId(),
        });
      }
    }

    // Send notification to owner when approval is needed
    if (input.needsApproval) {
      const amt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(input.amount) || 0);
      notifyOwner({
        title: "Autoriza\u00e7\u00e3o de Pagamento",
        content: `${input.createdByName || "Financeiro"} lan\u00e7ou uma conta que precisa de autoriza\u00e7\u00e3o:\n\n${input.description} - ${amt}\n${input.supplier ? "Fornecedor: " + input.supplier : ""}\nVencimento: ${new Date(input.dueDate).toLocaleDateString("pt-BR")}`,
      }).catch(() => {});
    }
    return { id: ids[0], ids };
  }),
  
  update: publicProcedure.input(z.object({
    id: z.number(),
    description: z.string().optional(),
    amount: z.string().optional(),
    dueDate: z.number().optional(),
    status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
    paidDate: z.number().nullable().optional(),
    categoryId: z.number().nullable().optional(),
    supplier: z.string().optional(),
    vehicle: z.string().optional(),
    barcode: z.string().optional(),
    notes: z.string().optional(),
    receiptUrl: z.string().optional(),
    receiptKey: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateFinTransaction(id, { ...data, categoryId: data.categoryId ?? undefined, paidDate: data.paidDate ?? undefined });
    // Mantém o vale do colaborador sincronizado com a conta (valor/descrição/data).
    // Efeito colateral: não deve impedir a atualização da conta caso falhe.
    if (data.amount !== undefined || data.description !== undefined || data.dueDate !== undefined) {
      const sync: { amount?: number; description?: string; date?: number; month?: number; year?: number } = {};
      if (data.amount !== undefined) sync.amount = reaisToCents(data.amount);
      if (data.description !== undefined) sync.description = data.description;
      if (data.dueDate !== undefined) {
        const d = new Date(data.dueDate);
        sync.date = data.dueDate;
        sync.month = d.getMonth() + 1;
        sync.year = d.getFullYear();
      }
      try {
        await updateAdvanceByFinTransaction(id, sync);
      } catch (err) {
        console.warn("[finTransactions.update] falha ao sincronizar vale vinculado (ignorado):", err);
      }
    }
    return { success: true };
  }),

  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    // Remove o vale vinculado (se houver) antes de excluir a conta de origem.
    // A limpeza do vale é um efeito colateral e não deve impedir a exclusão da
    // conta caso falhe (ex.: coluna finTransactionId ausente antes da migração).
    try {
      await deleteAdvanceByFinTransaction(input.id);
    } catch (err) {
      console.warn("[finTransactions.delete] falha ao remover vale vinculado (ignorado):", err);
    }
    await deleteFinTransaction(input.id);
    return { success: true };
  }),
  
  markPaid: publicProcedure.input(z.object({
    id: z.number(),
    paidDate: z.number().optional(),
  })).mutation(async ({ input }) => {
    await markAsPaid(input.id, input.paidDate || Date.now());
    return { success: true };
  }),

  approveTransaction: publicProcedure.input(z.object({
    id: z.number(),
    approved: z.boolean(),
    approvedBy: z.string(),
  })).mutation(async ({ input }) => {
    const status = input.approved ? "approved" as const : "rejected" as const;
    await updateFinTransaction(input.id, {
      approvalStatus: status,
      approvedBy: input.approvedBy,
      approvedAt: Date.now(),
    });
    return { success: true };
  }),
  
  dashboard: publicProcedure.input(z.object({
    month: z.number().optional(),
    year: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return getFinDashboard(input?.month, input?.year);
  }),

  overdue: publicProcedure.query(async () => {
    return getOverdueTransactions();
  }),

  upcomingDue: publicProcedure.input(z.object({
    days: z.number().default(3),
  }).optional()).query(async ({ input }) => {
    return getUpcomingDueTransactions(input?.days || 3);
  }),

  // ===== FINANCIAL ALERTS (vencendo hoje, amanhã, atrasadas) =====
  alerts: publicProcedure.query(async () => {
    return getFinancialAlerts();
  }),

  // Send alert notification for due bills
  sendAlertNotification: publicProcedure.mutation(async () => {
    const alerts = await getFinancialAlerts();
    const { summary } = alerts;
    const parts: string[] = [];
    
    if (summary.overdueCount > 0) {
      const amt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(summary.overdueTotal);
      parts.push(`\u26a0\ufe0f ${summary.overdueCount} conta(s) ATRASADA(S) - Total: ${amt}`);
    }
    if (summary.dueTodayCount > 0) {
      const amt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(summary.dueTodayTotal);
      parts.push(`\ud83d\udfe1 ${summary.dueTodayCount} conta(s) VENCE HOJE - Total: ${amt}`);
    }
    if (summary.dueTomorrowCount > 0) {
      const amt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(summary.dueTomorrowTotal);
      parts.push(`\ud83d\udfe0 ${summary.dueTomorrowCount} conta(s) vence AMANH\u00c3 - Total: ${amt}`);
    }
    if (summary.dueWeekCount > 0) {
      const amt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(summary.dueWeekTotal);
      parts.push(`\ud83d\udfe2 ${summary.dueWeekCount} conta(s) vence esta SEMANA - Total: ${amt}`);
    }
    
    if (parts.length === 0) {
      return { sent: false, message: "Nenhuma conta pendente" };
    }
    
    // List details of today's and overdue bills
    const detailLines: string[] = [];
    for (const t of [...alerts.overdue.slice(0, 5), ...alerts.dueToday.slice(0, 5)]) {
      const amt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(t.amount));
      const date = new Date(t.dueDate).toLocaleDateString("pt-BR");
      detailLines.push(`  \u2022 ${t.description}${t.supplier ? ` (${t.supplier})` : ''} - ${amt} - Venc: ${date}`);
    }
    
    const content = parts.join("\n") + (detailLines.length > 0 ? "\n\nDetalhes:\n" + detailLines.join("\n") : "");
    
    await notifyOwner({
      title: "\ud83d\udcb0 Alerta Financeiro - Contas Vencendo",
      content,
    }).catch(() => {});
    
    return { sent: true, message: content, summary };
  }),
  
  // OCR: scan document with camera
  scanDocument: publicProcedure.input(z.object({
    imageBase64: z.string(),
    docType: z.enum(["boleto", "nota_fiscal", "conta"]),
    mimeType: z.string().default("image/jpeg"),
  })).mutation(async ({ input }) => {
    try {
      const buffer = Buffer.from(input.imageBase64, "base64");
      const fileName = `fin-scan-${Date.now()}.${input.mimeType.includes("png") ? "png" : "jpg"}`;
      const { url: imageUrl, key: imageKey } = await storagePut(`financial/${fileName}`, buffer, input.mimeType);
      
      const prompt = await parseDocumentWithLLM(imageUrl, input.docType);
      
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
      let parsed: any = {};
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        parsed = JSON.parse(jsonMatch[1]?.trim() || content.trim());
      } catch {
        parsed = { raw: content };
      }
      
      return { success: true, data: parsed, imageUrl, imageKey };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao processar documento: ${error.message}`,
      });
    }
  }),
  
  uploadReceipt: publicProcedure.input(z.object({
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

  // Parse audio transcription to create a financial transaction automatically
  parseAudio: publicProcedure.input(z.object({
    audioUrl: z.string(),
    context: z.enum(["conta_pagar", "conta_receber", "gasolina"]).default("conta_pagar"),
  })).mutation(async ({ input }) => {
    try {
      const { transcribeAudio } = await import("../_core/voiceTranscription");
      const transcription = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: "pt",
        prompt: "Transcrição de lançamento financeiro de loja de carros",
      });
      
      if ('error' in transcription) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro na transcrição: ${transcription.error}` });
      }
      
      const text = transcription.text;
      
      const systemPrompt = input.context === "gasolina"
        ? `Você é um assistente financeiro de uma loja de carros. Analise o texto transcrito de um áudio e extraia informações de abastecimento. Retorne APENAS JSON válido:
{
  "vehicleModel": "modelo do veículo mencionado (ex: Corolla, Civic, HB20)",
  "vehiclePlate": "placa do veículo se mencionada (ex: ABC1D23)",
  "fuelType": "gasolina, etanol, diesel ou gnv",
  "liters": número de litros (decimal),
  "pricePerLiter": preço por litro (decimal),
  "totalCost": valor total (decimal),
  "gasStation": "nome do posto se mencionado",
  "odometer": quilometragem se mencionada (inteiro),
  "notes": "observações adicionais"
}
Se algum campo não for mencionado, use null. Se o total não for mencionado mas litros e preço sim, calcule. Se litros não forem mencionados mas total e preço sim, calcule.`
        : `Você é um assistente financeiro de uma loja de carros. Analise o texto transcrito de um áudio e extraia informações de uma conta ${input.context === "conta_pagar" ? "a pagar" : "a receber"}. Retorne APENAS JSON válido:
{
  "type": "${input.context === "conta_pagar" ? "payable" : "receivable"}",
  "description": "descrição da conta",
  "amount": valor em reais (decimal, ex: 500.00),
  "supplier": "fornecedor ou cliente mencionado",
  "category": "categoria sugerida: IPVA, Transferência, Seguro, Mecânica, Funilaria, Lavagem, Gasolina, Comissões, Aluguel, Energia, Internet, Venda de Veículo, Financiamento, Consignação ou Outros",
  "dueDate": "data de vencimento se mencionada no formato DD/MM/YYYY",
  "notes": "observações adicionais"
}
Se algum campo não for mencionado, use null.`;
      
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Texto transcrito: "${text}"` },
        ],
      });
      
      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
      let parsed: any = {};
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        parsed = JSON.parse(jsonMatch[1]?.trim() || content.trim());
      } catch {
        parsed = { raw: content };
      }
      
      return { success: true, transcription: text, data: parsed };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro ao processar áudio: ${error.message}`,
      });
    }
  }),
});

// ===== FUEL ROUTER =====
export const fuelRouter = router({
  list: publicProcedure.input(z.object({
    month: z.number().optional(),
    year: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return listFuelRecords(input || undefined);
  }),
  
  create: publicProcedure.input(z.object({
    vehicleModel: z.string().min(1),
    vehiclePlate: z.string().optional(),
    fuelType: z.enum(["gasolina", "etanol", "diesel", "gnv"]).default("gasolina"),
    liters: z.string(),
    pricePerLiter: z.string(),
    totalCost: z.string(),
    odometer: z.number().optional(),
    gasStation: z.string().optional(),
    notes: z.string().optional(),
    receiptUrl: z.string().optional(),
    receiptKey: z.string().optional(),
    fuelDate: z.number(),
  })).mutation(async ({ input, ctx }) => {
    return createFuelRecord({ ...input, createdBy: ctx.user?.id });
  }),
  
  update: publicProcedure.input(z.object({
    id: z.number(),
    vehicleModel: z.string().optional(),
    vehiclePlate: z.string().optional(),
    fuelType: z.enum(["gasolina", "etanol", "diesel", "gnv"]).optional(),
    liters: z.string().optional(),
    pricePerLiter: z.string().optional(),
    totalCost: z.string().optional(),
    odometer: z.number().optional(),
    gasStation: z.string().optional(),
    notes: z.string().optional(),
    fuelDate: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    return updateFuelRecord(id, data);
  }),
  
  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    return deleteFuelRecord(input.id);
  }),
  
  dashboard: publicProcedure.input(z.object({
    month: z.number().optional(),
    year: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return getFuelDashboard(input?.month, input?.year);
  }),
});
