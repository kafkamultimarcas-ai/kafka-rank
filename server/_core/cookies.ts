import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

// Origem (protocolo+host) da requisição, respeitando proxy reverso — usado pra
// montar links absolutos em e-mail (ex: link de redefinição de senha).
export function getRequestOrigin(req: Request): string {
  const protocol = isSecureRequest(req) ? "https" : "http";
  return `${protocol}://${req.get("host")}`;
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    // SameSite=None exige Secure — navegadores descartam o cookie silenciosamente se
    // Secure estiver ausente. Em HTTP puro (dev local) isso derrubava toda sessão de
    // vendedor/gerente logo após o login. Lax funciona para navegação same-origin (é
    // o caso aqui, multi-tenant por path e não por subdomínio) e não exige Secure.
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
