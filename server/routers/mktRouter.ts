import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

// ===== MARKETING ROUTER =====

export const mktStrategiesRouter = router({
  list: publicProcedure.query(async () => {
    return db.listMktStrategies();
  }),

  create: protectedProcedure.input(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(["planejada", "em_andamento", "concluida", "cancelada"]).optional(),
    startDate: z.number().optional(),
    endDate: z.number().optional(),
    budget: z.number().optional(),
    responsibleId: z.number().optional(),
  })).mutation(async ({ input }) => {
    return db.createMktStrategy({
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? "geral",
      status: input.status ?? "planejada",
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      budget: input.budget ?? null,
      responsibleId: input.responsibleId ?? null,
    });
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(["planejada", "em_andamento", "concluida", "cancelada"]).optional(),
    startDate: z.number().optional(),
    endDate: z.number().optional(),
    budget: z.number().optional(),
    responsibleId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.updateMktStrategy(id, data as any);
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({
    id: z.number(),
  })).mutation(async ({ input }) => {
    await db.deleteMktStrategy(input.id);
    return { success: true };
  }),
});

export const mktTasksRouter = router({
  list: publicProcedure.input(z.object({
    strategyId: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return db.listMktTasks(input?.strategyId);
  }),

  create: protectedProcedure.input(z.object({
    strategyId: z.number().optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(["pendente", "em_andamento", "concluida", "cancelada"]).optional(),
    priority: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    dueDate: z.number().optional(),
    assignedToId: z.number().optional(),
  })).mutation(async ({ input }) => {
    return db.createMktTask({
      strategyId: input.strategyId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "pendente",
      priority: input.priority ?? "media",
      dueDate: input.dueDate ?? null,
      assignedToId: input.assignedToId ?? null,
    });
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["pendente", "em_andamento", "concluida", "cancelada"]).optional(),
    priority: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
    dueDate: z.number().optional(),
    assignedToId: z.number().optional(),
    strategyId: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.updateMktTask(id, data as any);
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({
    id: z.number(),
  })).mutation(async ({ input }) => {
    await db.deleteMktTask(input.id);
    return { success: true };
  }),
});
