import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createFichaFinanciamento,
  listFichasFinanciamento,
  getFichaById,
  updateFichaFinanciamento,
  listFichaBancos,
  updateFichaBanco,
  getFichaFilaCount,
  deleteFichaFinanciamento,
  getSellerById,
  createNotification,
} from "../db";
import { ENV } from "../_core/env";
import jwt from "jsonwebtoken";
import { getPrivacySellerId as getFichaPrivacySellerId } from "../authHelpers";
import { storagePut } from "../storage";
import { BANCOS_FINANCIAMENTO } from "../../drizzle/schema";

// ===== FICHAS DE FINANCIAMENTO ROUTER =====
export const fichaRouter = router({
  // Vendedor cria ficha
  create: protectedProcedure.input(z.object({
    sellerId: z.number(),
    // Veículo
    veiculo: z.string().optional(),
    placa: z.string().optional(),
    anoModelo: z.string().optional(),
    valorFipe: z.number().optional(),
    valorFinanciado: z.number().optional(),
    // Dados pessoais
    nomeCompleto: z.string().min(1),
    cpf: z.string().min(1),
    rg: z.string().optional(),
    dataNascimento: z.string().optional(),
    estadoCivil: z.string().optional(),
    nomeMae: z.string().optional(),
    nomePai: z.string().optional(),
    cidadeNasceu: z.string().optional(),
    email: z.string().optional(),
    telefone: z.string().optional(),
    cep: z.string().optional(),
    endereco: z.string().optional(),
    profissao: z.string().optional(),
    renda: z.string().optional(),
    localTrabalho: z.string().optional(),
    referenciaNome: z.string().optional(),
    referenciaTelefone: z.string().optional(),
    // Observações
    observacoesVendedor: z.string().optional(),
    // Bancos já tentados pelo vendedor
    bancosTentados: z.array(z.string()).optional(),
  })).mutation(async ({ input, ctx }) => {
    const privacySellerId = await getFichaPrivacySellerId(ctx);
    if (privacySellerId && input.sellerId !== privacySellerId) {
      throw new Error('Você só pode criar fichas como você mesmo');
    }
    const effectiveSellerId = privacySellerId ?? input.sellerId;
    const fichaId = await createFichaFinanciamento({
      sellerId: effectiveSellerId,
      veiculo: input.veiculo,
      placa: input.placa?.toUpperCase(),
      anoModelo: input.anoModelo,
      valorFipe: input.valorFipe,
      valorFinanciado: input.valorFinanciado,
      nomeCompleto: input.nomeCompleto,
      cpf: input.cpf,
      rg: input.rg,
      dataNascimento: input.dataNascimento,
      estadoCivil: input.estadoCivil,
      nomeMae: input.nomeMae,
      nomePai: input.nomePai,
      cidadeNasceu: input.cidadeNasceu,
      email: input.email,
      telefone: input.telefone,
      cep: input.cep,
      endereco: input.endereco,
      profissao: input.profissao,
      renda: input.renda,
      localTrabalho: input.localTrabalho,
      referenciaNome: input.referenciaNome,
      referenciaTelefone: input.referenciaTelefone,
      observacoesVendedor: input.observacoesVendedor,
    });

    // Marcar bancos já tentados pelo vendedor
    if (input.bancosTentados && input.bancosTentados.length > 0) {
      const bancos = await listFichaBancos(fichaId);
      for (const b of bancos) {
        if (input.bancosTentados.includes(b.banco)) {
          await updateFichaBanco(b.id, { tentadoPorVendedor: true });
        }
      }
    }

    // Notificar F&I
    const seller = await getSellerById(input.sellerId);
    const { listSellers } = await import("../db");
    const allSellers = await listSellers();
    const feiSellers = allSellers.filter((s: any) => s.department === "fei" && s.active);
    for (const fei of feiSellers) {
      await createNotification({
        sellerId: fei.id,
        type: "info",
        title: "Nova ficha de financiamento",
        message: `${seller?.name || "Vendedor"} enviou ficha de ${input.nomeCompleto} para a mesa de crédito`,
      });
    }

    return { id: fichaId, message: "Ficha enviada para a mesa de crédito!" };
  }),

  // Upload CNH
  uploadCnh: publicProcedure.input(z.object({
    fichaId: z.number(),
    base64: z.string(),
    filename: z.string(),
    mimeType: z.string(),
  })).mutation(async ({ input }) => {
    const buffer = Buffer.from(input.base64, "base64");
    const ext = input.filename.split(".").pop() || "jpg";
    const key = `fichas/${input.fichaId}/cnh-${Date.now()}.${ext}`;
    const { url } = await storagePut(key, buffer, input.mimeType);
    await updateFichaFinanciamento(input.fichaId, { cnhFotoUrl: url, cnhFotoKey: key });
    return { url };
  }),

  // Listar fichas (vendedor vê as dele, F&I vê todas)
  list: publicProcedure.input(z.object({
    sellerId: z.number().optional(),
    status: z.string().optional(),
  }).optional()).query(async ({ input, ctx }) => {
    const privacySellerId = await getFichaPrivacySellerId(ctx);
    if (privacySellerId) {
      return listFichasFinanciamento({ ...input, sellerId: privacySellerId });
    }
    return listFichasFinanciamento(input);
  }),

  // Listagem paginada server-side (Mesa de Crédito) — filtro status/busca + ordenação
  listPaged: publicProcedure.input(z.object({
    status: z.string().optional(),
    search: z.string().optional(),
    offset: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(100).default(20),
  })).query(async ({ input, ctx }) => {
    const privacySellerId = await getFichaPrivacySellerId(ctx);
    const all = await listFichasFinanciamento(privacySellerId ? { sellerId: privacySellerId } : {});
    let list = all;
    if (input.status && input.status !== "todos") list = list.filter((f: any) => f.status === input.status);
    const q = input.search?.toLowerCase().trim();
    if (q) {
      list = list.filter((f: any) =>
        f.nomeCompleto?.toLowerCase().includes(q) ||
        f.cpf?.includes(q) ||
        f.placa?.toLowerCase().includes(q) ||
        f.veiculo?.toLowerCase().includes(q)
      );
    }
    // Na fila primeiro, depois em análise, parciais, aprovadas, recusadas; mais antigo primeiro
    const order: Record<string, number> = { na_fila: 0, em_analise: 1, parcial: 2, aprovado: 3, recusado: 4 };
    list = [...list].sort((a: any, b: any) => {
      const diff = (order[a.status] ?? 5) - (order[b.status] ?? 5);
      if (diff !== 0) return diff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return { items: list.slice(input.offset, input.offset + input.limit), total: list.length };
  }),

  // Detalhe da ficha com bancos
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const ficha = await getFichaById(input.id);
    if (!ficha) throw new TRPCError({ code: "NOT_FOUND", message: "Ficha não encontrada" });
    const bancos = await listFichaBancos(input.id);
    return { ...ficha, bancos };
  }),

  // F&I pega ficha para analisar (inicia cronômetro)
  iniciarAnalise: publicProcedure.input(z.object({
    fichaId: z.number(),
    feiSellerId: z.number(),
  })).mutation(async ({ input }) => {
    const fei = await getSellerById(input.feiSellerId);
    await updateFichaFinanciamento(input.fichaId, {
      status: "em_analise",
      feiResponsavelId: input.feiSellerId,
      feiResponsavelNome: fei?.name || "F&I",
      inicioAnalise: Date.now(),
    });
    return { message: "Análise iniciada" };
  }),

  // F&I atualiza status de um banco
  updateBanco: publicProcedure.input(z.object({
    bancoId: z.number(),
    status: z.enum(["pendente", "em_analise", "aprovado", "recusado"]),
    observacao: z.string().optional(),
    valorParcela: z.number().optional(),
    qtdParcelas: z.number().optional(),
    taxaJuros: z.string().optional(),
    atualizadoPor: z.string().optional(),
  })).mutation(async ({ input }) => {
    await updateFichaBanco(input.bancoId, {
      status: input.status,
      observacao: input.observacao,
      valorParcela: input.valorParcela,
      qtdParcelas: input.qtdParcelas,
      taxaJuros: input.taxaJuros,
      atualizadoPor: input.atualizadoPor,
      atualizadoEm: Date.now(),
    });
    return { message: "Banco atualizado" };
  }),

  // F&I atualiza data de pagamento do banco
  setDataPagamento: publicProcedure.input(z.object({
    fichaId: z.number(),
    dataPagamentoBanco: z.number(),
  })).mutation(async ({ input }) => {
    await updateFichaFinanciamento(input.fichaId, {
      dataPagamentoBanco: input.dataPagamentoBanco,
    });
    return { message: "Data de pagamento atualizada" };
  }),

  // F&I finaliza análise da ficha
  finalizarAnalise: publicProcedure.input(z.object({
    fichaId: z.number(),
    status: z.enum(["aprovado", "recusado", "parcial"]),
    observacoesFei: z.string().optional(),
    dataPagamentoBanco: z.number().optional(),
  })).mutation(async ({ input }) => {
    const ficha = await getFichaById(input.fichaId);
    await updateFichaFinanciamento(input.fichaId, {
      status: input.status,
      observacoesFei: input.observacoesFei,
      fimAnalise: Date.now(),
      ...(input.dataPagamentoBanco ? { dataPagamentoBanco: input.dataPagamentoBanco } : {}),
    });

    // Notificar vendedor
    if (ficha) {
      const statusLabel = input.status === "aprovado" ? "APROVADA" : input.status === "recusado" ? "RECUSADA" : "PARCIALMENTE APROVADA";
      await createNotification({
        sellerId: ficha.sellerId,
        type: input.status === "aprovado" ? "success" : input.status === "recusado" ? "warning" : "info",
        title: `Ficha ${statusLabel}`,
        message: `A ficha de ${ficha.nomeCompleto} foi ${statusLabel.toLowerCase()} pela mesa de crédito${input.observacoesFei ? `: ${input.observacoesFei}` : ""}`,
      });
    }

    return { message: "Análise finalizada" };
  }),

  // F&I adiciona observação
  addObservacao: publicProcedure.input(z.object({
    fichaId: z.number(),
    observacoesFei: z.string(),
  })).mutation(async ({ input }) => {
    await updateFichaFinanciamento(input.fichaId, { observacoesFei: input.observacoesFei });
    return { message: "Observação salva" };
  }),

  // Contagem da fila
  filaCount: publicProcedure.query(async () => {
    return getFichaFilaCount();
  }),

  // Lista de bancos disponíveis
  bancos: publicProcedure.query(() => {
    return BANCOS_FINANCIAMENTO;
  }),

  // F&I edita dados da ficha (corrigir valores, digitação, etc.)
  editFicha: publicProcedure.input(z.object({
    fichaId: z.number(),
    // Veículo
    veiculo: z.string().optional(),
    placa: z.string().optional(),
    anoModelo: z.string().optional(),
    valorFipe: z.number().optional(),
    valorFinanciado: z.number().optional(),
    // Dados pessoais
    nomeCompleto: z.string().optional(),
    cpf: z.string().optional(),
    rg: z.string().optional(),
    dataNascimento: z.string().optional(),
    estadoCivil: z.string().optional(),
    nomeMae: z.string().optional(),
    nomePai: z.string().optional(),
    cidadeNasceu: z.string().optional(),
    email: z.string().optional(),
    telefone: z.string().optional(),
    cep: z.string().optional(),
    endereco: z.string().optional(),
    profissao: z.string().optional(),
    renda: z.string().optional(),
    localTrabalho: z.string().optional(),
    referenciaNome: z.string().optional(),
    referenciaTelefone: z.string().optional(),
    observacoesVendedor: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { fichaId, ...updateData } = input;
    // Remove undefined values
    const cleanData: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        cleanData[key] = key === 'placa' && typeof value === 'string' ? value.toUpperCase() : value;
      }
    }
    if (Object.keys(cleanData).length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum campo para atualizar" });
    }
    await updateFichaFinanciamento(fichaId, cleanData);
    return { message: "Ficha atualizada com sucesso" };
  }),

  // Deletar ficha
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteFichaFinanciamento(input.id);
    return { message: "Ficha excluída" };
  }),
});
