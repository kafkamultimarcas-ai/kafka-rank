import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from "../supplierDb";

export const supplierRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      personType: z.enum(["fisica", "juridica"]).optional(),
      active: z.boolean().optional(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      const params = input as any || {};
      return listSuppliers({
        search: params.search,
        personType: params.personType,
        active: params.active,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getSupplierById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      personType: z.enum(["fisica", "juridica"]),
      name: z.string().min(1),
      cpfCnpj: z.string().optional(),
      rg: z.string().optional(),
      nationality: z.string().optional(),
      profession: z.string().optional(),
      birthDate: z.number().optional(),
      gender: z.enum(["masculino", "feminino", "outro"]).optional(),
      maritalStatus: z.enum(["solteiro", "casado", "divorciado", "viuvo", "outro"]).optional(),
      cep: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      neighborhood: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      mobile: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return createSupplier(input);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      personType: z.enum(["fisica", "juridica"]).optional(),
      name: z.string().min(1).optional(),
      cpfCnpj: z.string().optional(),
      rg: z.string().optional(),
      nationality: z.string().optional(),
      profession: z.string().optional(),
      birthDate: z.number().nullable().optional(),
      gender: z.enum(["masculino", "feminino", "outro"]).nullable().optional(),
      maritalStatus: z.enum(["solteiro", "casado", "divorciado", "viuvo", "outro"]).nullable().optional(),
      cep: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      neighborhood: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      mobile: z.string().optional(),
      notes: z.string().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateSupplier(id, data as any);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteSupplier(input.id);
    }),
});
