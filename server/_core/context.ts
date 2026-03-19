import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import jwt from "jsonwebtoken";
import { ENV } from "./env";
import { getManagerById } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1) Try OAuth session first (owner/admin)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // 2) If no OAuth user, try manager JWT cookie
  if (!user) {
    try {
      const managerToken = opts.req.cookies?.manager_session;
      if (managerToken) {
        const payload = jwt.verify(managerToken, ENV.cookieSecret) as { managerId: number; username: string };
        const manager = await getManagerById(payload.managerId);
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

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
