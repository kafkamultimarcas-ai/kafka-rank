import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { sendPushNewPvChamado } from "../pushService";

// ===== PÓS-VENDA ROUTER =====

export const pvChamadosRouter = router({
  // Abrir chamado (vendedor - simples e rápido)
  create: publicProcedure.input(z.object({
    clienteNome: z.string().min(1),
    clienteTelefone: z.string().optional(),
    carroModelo: z.string().min(1),
    carroPlaca: z.string().optional(),
    problemaRelatado: z.string().min(1),
    observacoes: z.string().optional(),
    vendedorId: z.number(),
  })).mutation(async ({ input }) => {
    const ticketNumber = await db.getNextPvTicketNumber();
    const id = await db.createPvChamado({
      ticketNumber,
      clienteNome: input.clienteNome,
      clienteTelefone: input.clienteTelefone ?? null,
      carroModelo: input.carroModelo,
      carroPlaca: input.carroPlaca ?? null,
      problemaRelatado: input.problemaRelatado,
      observacoes: input.observacoes ?? null,
      vendedorId: input.vendedorId,
    });
    // Notificar setor pós-venda sobre novo chamado
    const seller = await db.getSellerById(input.vendedorId);
    const vendedorName = seller?.nickname || seller?.name || 'Vendedor';
    sendPushNewPvChamado(vendedorName, input.clienteNome, input.carroModelo, ticketNumber).catch(console.error);

    return { id, ticketNumber, message: `Chamado ${ticketNumber} aberto com sucesso!` };
  }),

  // Listar chamados (com filtros)
  list: publicProcedure.input(z.object({
    status: z.string().optional(),
    vendedorId: z.number().optional(),
    responsavelPvId: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return db.listPvChamados(input || {});
  }),

  // Buscar chamado por ID
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return db.getPvChamadoById(input.id);
  }),

  // Atualizar chamado (pós-venda/admin)
  update: adminProcedure.input(z.object({
    id: z.number(),
    status: z.string().optional(),
    responsavelPvId: z.number().optional(),
    oficinaId: z.number().optional(),
    oficinaNome: z.string().optional(),
    dataEntradaAgendada: z.number().optional(),
    dataEntradaReal: z.number().optional(),
    prazoEntrega: z.number().optional(),
    dataEntregaReal: z.number().optional(),
    observacoes: z.string().optional(),
    servicoRealizado: z.string().optional(),
    clienteNome: z.string().optional(),
    clienteTelefone: z.string().optional(),
    carroModelo: z.string().optional(),
    carroPlaca: z.string().optional(),
    problemaRelatado: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const { id, ...data } = input;
    const usuario = ctx.user?.name || 'Admin';
    return db.updatePvChamado(id, data, usuario);
  }),

  // Deletar chamado
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.deletePvChamado(input.id);
    return { success: true };
  }),

  // Contadores por status
  counts: publicProcedure.query(async () => {
    return db.getPvChamadosCounts();
  }),

  // Alertas de prazo
  alertas: adminProcedure.query(async () => {
    return db.getPvChamadosAlerta();
  }),

  // Atualizar chamado pelo colaborador de pós-venda (sem precisar ser admin)
  updateBySeller: publicProcedure.input(z.object({
    id: z.number(),
    sellerId: z.number(), // ID do colaborador de pós-venda logado
    status: z.string().optional(),
    responsavelPvId: z.number().optional(),
    oficinaId: z.number().optional(),
    oficinaNome: z.string().optional(),
    dataEntradaAgendada: z.number().optional(),
    dataEntradaReal: z.number().optional(),
    prazoEntrega: z.number().optional(),
    dataEntregaReal: z.number().optional(),
    observacoes: z.string().optional(),
    servicoRealizado: z.string().optional(),
  })).mutation(async ({ input }) => {
    // Verificar se o seller é do setor pós-venda
    const seller = await db.getSellerById(input.sellerId);
    if (!seller || seller.department !== 'pos_venda') {
      throw new Error('Apenas colaboradores do setor Pós-Venda podem atualizar chamados.');
    }
    const { id, sellerId, ...data } = input;
    const usuario = seller.nickname || seller.name;
    return db.updatePvChamado(id, data, usuario);
  }),

  // Histórico do chamado
  historico: publicProcedure.input(z.object({ chamadoId: z.number() })).query(async ({ input }) => {
    return db.listPvHistorico(input.chamadoId);
  }),
});

export const pvGastosRouter = router({
  // Listar gastos (por chamado ou geral)
  list: publicProcedure.input(z.object({
    chamadoId: z.number().optional(),
    statusAprovacao: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return db.listPvGastos(input?.chamadoId, input?.statusAprovacao);
  }),

  // Criar gasto
  create: adminProcedure.input(z.object({
    chamadoId: z.number(),
    descricao: z.string().min(1),
    valor: z.string(), // decimal como string
    fotoNotaUrl: z.string().optional(),
    fotoNotaKey: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const usuario = ctx.user?.name || 'Admin';
    const id = await db.createPvGasto({
      chamadoId: input.chamadoId,
      descricao: input.descricao,
      valor: input.valor,
      fotoNotaUrl: input.fotoNotaUrl ?? null,
      fotoNotaKey: input.fotoNotaKey ?? null,
    }, usuario);
    return { id, message: 'Gasto registrado!' };
  }),

  // Upload foto da nota
  uploadNota: adminProcedure.input(z.object({
    fileName: z.string(),
    fileBase64: z.string(),
    contentType: z.string(),
  })).mutation(async ({ input }) => {
    const suffix = nanoid(8);
    const key = `pv-notas/${suffix}-${input.fileName}`;
    const buffer = Buffer.from(input.fileBase64, 'base64');
    const { url } = await storagePut(key, buffer, input.contentType);
    return { url, key };
  }),

  // Atualizar status do gasto (autorizar/recusar/pagar)
  updateStatus: adminProcedure.input(z.object({
    id: z.number(),
    statusAprovacao: z.enum(["pendente", "autorizado", "recusado", "pago"]),
  })).mutation(async ({ input, ctx }) => {
    const autorizadoPor = ctx.user?.name || 'Admin';
    await db.updatePvGastoStatus(input.id, input.statusAprovacao, autorizadoPor);
    return { success: true };
  }),

  // Deletar gasto
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.deletePvGasto(input.id);
    return { success: true };
  }),

  // Gastos pendentes (contagem + total)
  pendentes: adminProcedure.query(async () => {
    return db.getPvGastosPendentes();
  }),

  // Resumo financeiro
  resumo: adminProcedure.query(async () => {
    return db.getPvGastosResumo();
  }),

  // Todos os gastos com info do chamado (tela financeira)
  listAll: adminProcedure.input(z.object({
    statusAprovacao: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return db.listAllPvGastosWithChamado(input?.statusAprovacao);
  }),
});

export const pvOficinasRouter = router({
  list: publicProcedure.query(async () => {
    return db.listOficinas();
  }),

  create: adminProcedure.input(z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const id = await db.createOficina({
      name: input.name,
      phone: input.phone ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
    });
    return { id, message: 'Oficina cadastrada!' };
  }),

  update: adminProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    active: z.boolean().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.updateOficina(id, data);
    return { success: true };
  }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.deleteOficina(input.id);
    return { success: true };
  }),
});
