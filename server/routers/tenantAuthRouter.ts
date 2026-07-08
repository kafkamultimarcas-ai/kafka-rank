import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import * as db from "../db";
import * as crmDb from "../crmDb";
import { getTenantLimits } from "../tenantService";
import { findIdentityByEmail, normalizeEmail } from "../emailPolicy";
import { withTenantAsync } from "../tenantDb";
import { getDb, withRetry } from "../db";
import { superAdmins } from "../../drizzle/schema";
import { signSuperToken } from "../superAdminAuth";

type UnifiedLoginResult = {
  userType: "admin" | "manager" | "seller" | "super_admin";
  id: number;
  name: string;
  role: string;
  department?: string;
  sellerRole?: string;
  mustChangePassword?: boolean;
  token?: string;
  redirectPath: string;
  tenantSlug: string | null;
  tenantId: number | null;
  trialEndsAt: number | null;
  trialExpired: boolean;
  subscriptionSuspended: boolean;
};

function buildSellerRedirect(department: string, sellerRole: string, sellerId: number): string {
  if (department === "pos_venda") return "/pos-venda";
  if (department === "financeiro") return "/financeiro";
  if (sellerRole === "gerente") return "/gerente";
  return `/minha-area/${sellerId}`;
}

async function findSuperAdminByEmail(email: string) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");
  const rows = await withRetry(() =>
    dbConn.select().from(superAdmins).where(eq(superAdmins.email, email)).limit(1)
  );
  return rows[0] ?? null;
}

export const tenantAuthRouter = router({
  loginPreviewByEmail: publicProcedure.input(z.object({
    email: z.string().min(3),
  })).query(async ({ input }) => {
    const email = normalizeEmail(input.email);
    if (!email) return null;

    const identity = await findIdentityByEmail(email);
    if (identity?.active) {
      return {
        userType: identity.userType,
        name: identity.name,
        tenantName: identity.tenantName,
        tenantSlug: identity.tenantSlug,
        roleLabel:
          identity.userType === "admin"
            ? "Administrador"
            : identity.userType === "manager"
              ? "Gerente"
              : identity.sellerRole === "gerente"
                ? "Gerente"
                : "Vendedor",
      };
    }

    const superAdmin = await findSuperAdminByEmail(email).catch(() => null);
    if (!superAdmin?.active) return null;

    return {
      userType: "super_admin" as const,
      name: superAdmin.name,
      tenantName: "Portal Super Admin",
      tenantSlug: null,
      roleLabel: superAdmin.role === "owner" ? "Super Admin" : "Suporte",
    };
  }),

  // Login unificado por email. Resolve automaticamente tenant ou portal master.
  loginByEmail: publicProcedure.input(z.object({
    email: z.string().min(3),
    password: z.string().min(1),
  })).mutation(async ({ input, ctx }): Promise<UnifiedLoginResult> => {
    const email = normalizeEmail(input.email);
    if (!email) throw new Error("E-mail obrigatório");

    const identity = await findIdentityByEmail(email);
    if (!identity || !identity.active) {
      const superAdmin = await findSuperAdminByEmail(email).catch(() => null);
      if (!superAdmin || !superAdmin.active) {
        throw new Error("E-mail ou senha inválidos");
      }

      const superPasswordValid = await bcrypt.compare(input.password, superAdmin.passwordHash);
      if (!superPasswordValid) throw new Error("E-mail ou senha inválidos");

      return {
        userType: "super_admin",
        id: superAdmin.id,
        name: superAdmin.name,
        role: superAdmin.role,
        token: signSuperToken(superAdmin.id, superAdmin.role || "support"),
        redirectPath: "/super-admin",
        tenantSlug: null,
        tenantId: null,
        trialEndsAt: null,
        trialExpired: false,
        subscriptionSuspended: false,
      };
    }

    const valid = await bcrypt.compare(input.password, identity.passwordHash);
    if (!valid) throw new Error("E-mail ou senha inválidos");

    const limits = await getTenantLimits(identity.tenantId);
    const trialInfo = {
      trialEndsAt: limits?.trialEndsAt ?? null,
      trialExpired: limits?.trialExpired ?? false,
      subscriptionSuspended: limits?.status === "suspended",
    };
    const cookieOptions = getSessionCookieOptions(ctx.req);

    if (identity.userType === "admin") {
      const token = jwt.sign(
        { adminId: identity.userId, role: identity.role, type: "admin_auth", tenantId: identity.tenantId, tenantSlug: identity.tenantSlug },
        ENV.cookieSecret,
        { expiresIn: "30d" }
      );
      await withTenantAsync(identity.tenantId, () => crmDb.updateAdmin(identity.userId, { lastAccess: Date.now() } as any));
      return {
        userType: "admin",
        id: identity.userId,
        name: identity.name,
        role: identity.role || "admin",
        mustChangePassword: identity.mustChangePassword || false,
        token,
        redirectPath: "/admin",
        tenantSlug: identity.tenantSlug,
        tenantId: identity.tenantId,
        ...trialInfo,
      };
    }

    if (identity.userType === "manager") {
      const token = jwt.sign(
        { managerId: identity.userId, tenantId: identity.tenantId, tenantSlug: identity.tenantSlug },
        ENV.cookieSecret,
        { expiresIn: "30d" }
      );
      ctx.res.clearCookie("manager_session", { ...cookieOptions, maxAge: -1 });
      ctx.res.cookie("manager_session", token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      return {
        userType: "manager",
        id: identity.userId,
        name: identity.name,
        role: "manager",
        redirectPath: "/gerente",
        tenantSlug: identity.tenantSlug,
        tenantId: identity.tenantId,
        ...trialInfo,
      };
    }

    const department = identity.department || "vendas";
    const sellerRole = identity.sellerRole || "vendedor";
    await withTenantAsync(identity.tenantId, () => db.updateSellerLastAccess(identity.userId));
    const token = jwt.sign(
      { sellerId: identity.userId, tenantId: identity.tenantId, tenantSlug: identity.tenantSlug },
      ENV.cookieSecret,
      { expiresIn: "30d" }
    );
    ctx.res.clearCookie("seller_session", { ...cookieOptions, maxAge: -1 });
    ctx.res.cookie("seller_session", token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return {
      userType: "seller",
      id: identity.userId,
      name: identity.name,
      role: sellerRole,
      department,
      sellerRole,
      redirectPath: buildSellerRedirect(department, sellerRole, identity.userId),
      tenantSlug: identity.tenantSlug,
      tenantId: identity.tenantId,
      ...trialInfo,
    };
  }),

  // Login legado por username, ainda escopado por tenant.
  login: publicProcedure.input(z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  })).mutation(async ({ input, ctx }): Promise<UnifiedLoginResult> => {
    if (!ctx.tenantSlug || ctx.tenantId <= 0) {
      throw new Error("Loja não encontrada. Acesse pelo link da sua loja.");
    }

    const limits = await getTenantLimits(ctx.tenantId);
    const trialInfo = {
      trialEndsAt: limits?.trialEndsAt ?? null,
      trialExpired: limits?.trialExpired ?? false,
      subscriptionSuspended: limits?.status === "suspended",
    };

    const username = input.username.trim();

    const admin = await crmDb.getAdminByUsername(username);
    if (admin && admin.active) {
      const valid = await bcrypt.compare(input.password, admin.passwordHash);
      if (valid) {
        const token = jwt.sign(
          { adminId: admin.id, role: admin.role, type: "admin_auth", tenantId: (admin as any).tenantId, tenantSlug: ctx.tenantSlug },
          ENV.cookieSecret,
          { expiresIn: "30d" }
        );
        await crmDb.updateAdmin(admin.id, { lastAccess: Date.now() } as any);
        return {
          userType: "admin",
          id: admin.id,
          name: admin.name,
          role: admin.role,
          mustChangePassword: (admin as any).mustChangePassword || false,
          token,
          redirectPath: "/admin",
          tenantSlug: ctx.tenantSlug,
          tenantId: ctx.tenantId,
          ...trialInfo,
        };
      }
    }

    const manager = await db.getManagerByUsername(username);
    if (manager && manager.active) {
      const valid = await bcrypt.compare(input.password, manager.passwordHash);
      if (valid) {
        const token = jwt.sign(
          { managerId: manager.id, username: manager.username, tenantId: (manager as any).tenantId, tenantSlug: ctx.tenantSlug },
          ENV.cookieSecret,
          { expiresIn: "30d" }
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie("manager_session", { ...cookieOptions, maxAge: -1 });
        ctx.res.cookie("manager_session", token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return {
          userType: "manager",
          id: manager.id,
          name: manager.name,
          role: "manager",
          redirectPath: "/gerente",
          tenantSlug: ctx.tenantSlug,
          tenantId: ctx.tenantId,
          ...trialInfo,
        };
      }
    }

    const seller = await db.getSellerByUsername(username);
    if (seller && seller.active && seller.passwordHash) {
      const valid = await bcrypt.compare(input.password, seller.passwordHash);
      if (valid && seller.username && seller.username.toLowerCase() === username.toLowerCase()) {
        await db.updateSellerLastAccess(seller.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie("seller_session", { ...cookieOptions, maxAge: -1 });
        const token = jwt.sign(
          { sellerId: seller.id, username: seller.username, tenantId: (seller as any).tenantId, tenantSlug: ctx.tenantSlug },
          ENV.cookieSecret,
          { expiresIn: "30d" }
        );
        ctx.res.cookie("seller_session", token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

        const department = seller.department || "vendas";
        const sellerRole = seller.sellerRole || "vendedor";
        return {
          userType: "seller",
          id: seller.id,
          name: seller.name,
          role: sellerRole,
          department,
          sellerRole,
          redirectPath: buildSellerRedirect(department, sellerRole, seller.id),
          tenantSlug: ctx.tenantSlug,
          tenantId: ctx.tenantId,
          ...trialInfo,
        };
      }
    }

    throw new Error("Usuário ou senha inválidos");
  }),
});
