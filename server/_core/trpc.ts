import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Manager OR Admin procedure - allows:
// 1. Admin users (OAuth owner with role='admin')
// 2. Managers from managers table (negative ID, role='admin')
// 3. CRM admins (negative ID with crm_admin login)
// 4. Seller-gerente (sellers with sellerRole='gerente')
export const managerOrAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const isAdmin = ctx.user.role === 'admin';
    const isManager = ctx.user.id < 0 && ctx.user.id > -1000000; // Managers from managers table
    const isCrmAdmin = ctx.user.loginMethod === 'crm_admin';
    const isSellerGerente = (ctx.user as any).sellerRole === 'gerente';

    if (!isAdmin && !isManager && !isCrmAdmin && !isSellerGerente) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores e gerentes" });
    }

    const editorName = ctx.user.name || 
      (isManager ? `Gerente #${-ctx.user.id}` : 
       isSellerGerente ? `Gerente ${ctx.user.name}` : 'Admin');

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        isAdmin,
        isManager: isManager || isSellerGerente,
        editorName,
      },
    });
  }),
);
