import jwt from "jsonwebtoken";

// Super admin JWT secret (separado do secret de auth normal) — extraído de
// superAdminRouter.ts pra ser reaproveitado por outros routers do portal master
// (ex: subscriptionLogsRouter) sem duplicar a lógica de assinar/verificar o token.
const SUPER_SECRET = process.env.JWT_SECRET ? process.env.JWT_SECRET + "_super" : "super_secret_key";

export function signSuperToken(adminId: number, role: string) {
  return jwt.sign({ superAdminId: adminId, role }, SUPER_SECRET, { expiresIn: "24h" });
}

export function verifySuperToken(token: string): { superAdminId: number; role: string } | null {
  try {
    return jwt.verify(token, SUPER_SECRET) as any;
  } catch {
    return null;
  }
}
