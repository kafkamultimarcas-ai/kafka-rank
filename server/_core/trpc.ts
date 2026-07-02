import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { tenantStorage } from "../tenantDb";
import { getTenantLimits } from "../tenantService";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

// Tenant middleware - wraps ALL procedures with AsyncLocalStorage tenant context
// This makes getCurrentTenantId() available in all db functions automatically
const tenantMiddleware = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  const tenantId = ctx.tenantId > 0 ? ctx.tenantId : 0;
  // Run the entire procedure within the tenant context
  return tenantStorage.run({ tenantId }, () => next({ ctx }));
});

// ALL procedures go through tenant middleware first
export const publicProcedure = t.procedure.use(tenantMiddleware);

/**
 * Middleware que exige o módulo `moduleName` habilitado em `tenants.enabledModules` para o
 * tenant resolvido na request. Tenants sem `enabledModules` configurado (null/vazio) passam —
 * não quebra dados legados que nunca definiram a lista.
 */
function requireModule(moduleName: string) {
  return t.middleware(async ({ ctx, next }) => {
    const limits = await getTenantLimits(ctx.tenantId);
    if (limits && limits.enabledModules.length > 0 && !limits.enabledModules.includes(moduleName)) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Módulo "${moduleName}" não está habilitado para esta loja.` });
    }
    return next({ ctx });
  });
}

/** Base pública (sem exigir login) + gate de módulo. Uso: rotas de leitura de um módulo. */
export function moduleRequiredProcedure(moduleName: string) {
  return publicProcedure.use(requireModule(moduleName));
}

/** Base autenticada + gate de módulo. Uso: rotas de escrita/administração de um módulo. */
export function protectedModuleRequiredProcedure(moduleName: string) {
  return protectedProcedure.use(requireModule(moduleName));
}

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

export const protectedProcedure = publicProcedure.use(requireUser);

export const adminProcedure = publicProcedure.use(
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
export const managerOrAdminProcedure = publicProcedure.use(
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
