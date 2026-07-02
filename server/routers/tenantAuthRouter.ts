import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { publicProcedure, router } from "../_core/trpc";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import * as db from "../db";
import * as crmDb from "../crmDb";

type UnifiedLoginResult = {
  userType: "admin" | "manager" | "seller";
  id: number;
  name: string;
  role: string;
  department?: string;
  sellerRole?: string;
  mustChangePassword?: boolean;
  token?: string;
  redirectPath: string;
};

export const tenantAuthRouter = router({
  // Login único por loja: /t/:slug/login chama esta rota independente do papel do usuário.
  // Tenta admin -> manager -> seller dentro do tenant resolvido e devolve identidade + redirect.
  login: publicProcedure.input(z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  })).mutation(async ({ input, ctx }): Promise<UnifiedLoginResult> => {
    if (!ctx.tenantSlug || ctx.tenantId <= 0) {
      throw new Error("Loja não encontrada. Acesse pelo link da sua loja.");
    }

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
          redirectPath: "/crm/admin",
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
        const redirectPath =
          department === "pos_venda" ? "/pos-venda" :
          department === "financeiro" ? "/financeiro" :
          seller.sellerRole === "gerente" ? "/gerente" :
          `/minha-area/${seller.id}`;

        return {
          userType: "seller",
          id: seller.id,
          name: seller.name,
          role: seller.sellerRole || "vendedor",
          department,
          sellerRole: seller.sellerRole || "vendedor",
          redirectPath,
        };
      }
    }

    throw new Error("Usuário ou senha inválidos");
  }),
});
