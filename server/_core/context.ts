import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import jwt from "jsonwebtoken";
import { ENV } from "./env";
import { getManagerById, getSellerById } from "../db";
import { getAdminById } from "../crmDb";
import { parse as parseCookieHeader } from "cookie";
import { resolveTenantContext, assertTenantMatch } from "../tenantMiddleware";
import { withTenantAsync } from "../tenantDb";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: (User & { sellerRole?: string }) | null;
  tenantId: number;
  tenantSlug: string | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: (User & { sellerRole?: string }) | null = null;
  const requestTenantResolution = await resolveTenantContext(opts.req, null);

  // 1) Try OAuth session first (owner/admin)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // 2) If no OAuth user, try manager JWT cookie
  if (!user) {
    try {
      const cookies = parseCookieHeader(opts.req.headers.cookie || "");
        const managerToken = cookies.manager_session;
      if (managerToken) {
        const payload = jwt.verify(managerToken, ENV.cookieSecret) as { managerId: number; username: string; tenantId?: number };
        if (!assertTenantMatch(payload.tenantId, requestTenantResolution.tenantId)) {
          console.warn(`[SECURITY] TENANT_MISMATCH manager_session: token tenantId=${payload.tenantId}, request tenantId=${requestTenantResolution.tenantId}`);
          throw new Error("TENANT_MISMATCH");
        }
        const manager = await withTenantAsync(requestTenantResolution.tenantId, () => getManagerById(payload.managerId));
        if (manager && manager.active) {
          // Create a virtual user object with admin role so adminProcedure works
          user = {
            id: -manager.id, // negative ID to distinguish from real users
            openId: `manager_${manager.id}`,
            name: manager.name,
            email: null,
            loginMethod: "password",
            role: "admin",
            createdAt: manager.createdAt,
            updatedAt: manager.updatedAt,
            lastSignedIn: new Date(),
          } as User;
        }
      }
    } catch (error) {
      // Invalid or expired manager token, ignore
    }
  }

  // 3) If no OAuth/manager, try CRM admin Bearer token (for SDR/admin CRM access)
  if (!user) {
    try {
      const authHeader = opts.req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const payload = jwt.verify(token, ENV.cookieSecret) as { adminId: number; role: string; type: string; tenantId?: number };
        if (payload.type === "admin_auth" && payload.adminId) {
          if (!assertTenantMatch(payload.tenantId, requestTenantResolution.tenantId)) {
            console.warn(`[SECURITY] TENANT_MISMATCH admin_auth: token tenantId=${payload.tenantId}, request tenantId=${requestTenantResolution.tenantId}`);
            throw new Error("TENANT_MISMATCH");
          }
          const admin = await withTenantAsync(requestTenantResolution.tenantId, () => getAdminById(payload.adminId));
          if (admin && admin.active) {
            user = {
              id: -(2000000 + admin.id),
              openId: `crm_admin_${admin.id}`,
              name: admin.name,
              email: null,
              loginMethod: "crm_admin",
              role: "admin",
              createdAt: admin.createdAt,
              updatedAt: admin.updatedAt,
              lastSignedIn: new Date(),
            } as User;
          }
        }
      }
    } catch (error) {
      // Invalid or expired CRM admin token, ignore
    }
  }

  // 4) If no OAuth user, no manager, no CRM admin, try seller JWT cookie
  if (!user) {
    try {
      const cookies2 = parseCookieHeader(opts.req.headers.cookie || "");
        const sellerToken = cookies2.seller_session;
      if (sellerToken) {
        const payload = jwt.verify(sellerToken, ENV.cookieSecret) as { sellerId: number; username: string; tenantId?: number };
        if (!assertTenantMatch(payload.tenantId, requestTenantResolution.tenantId)) {
          console.warn(`[SECURITY] TENANT_MISMATCH seller_session: token tenantId=${payload.tenantId}, request tenantId=${requestTenantResolution.tenantId}`);
          throw new Error("TENANT_MISMATCH");
        }
        const seller = await withTenantAsync(requestTenantResolution.tenantId, () => getSellerById(payload.sellerId));
        if (seller && seller.active) {
          // Create a virtual user object - gerente gets special flag
          user = {
            id: -(1000000 + seller.id), // large negative offset to distinguish from managers
            openId: `seller_${seller.id}`,
            name: seller.name,
            email: seller.email,
            loginMethod: "seller_password",
            role: "user",
            createdAt: seller.createdAt,
            updatedAt: seller.updatedAt,
            lastSignedIn: new Date(),
            sellerRole: seller.sellerRole || 'vendedor', // Pass sellerRole to context
          } as User & { sellerRole?: string };
        }
      }
    } catch (error) {
      // Invalid or expired seller token, ignore
    }
  }

  const tenantResolution = requestTenantResolution.tenantSlug
    ? requestTenantResolution
    : await resolveTenantContext(opts.req, user);

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantId: tenantResolution.tenantId,
    tenantSlug: tenantResolution.tenantSlug,
  };
}
