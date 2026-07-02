import "dotenv/config";
import express, { type Request } from "express";
import { createServer } from "http";
import net from "net";
import { sql } from "drizzle-orm";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ipKeyGenerator } from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerWebhookRoutes } from "../webhooks";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { extractTenantSlugFromRequest } from "../tenantMiddleware";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy (necessário para rate limiting correto atrás de proxy/load balancer)
  app.set('trust proxy', 1);

  // ===== HEALTHCHECK =====
  // Endpoint simples para infra de deploy/load balancer, sem passar por rate limit,
  // helmet ou cliente tRPC. Verifica conectividade real com o banco.
  app.get("/health", async (_req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        res.status(503).json({ status: "error", db: "unavailable" });
        return;
      }
      await db.execute(sql`SELECT 1`);
      res.status(200).json({ status: "ok", db: "connected" });
    } catch (error) {
      res.status(503).json({ status: "error", db: "unavailable" });
    }
  });

  // ===== SECURITY HEADERS (Helmet) =====
  app.use(helmet({
    contentSecurityPolicy: false, // Desabilitado para não quebrar Vite/React em dev
    crossOriginEmbedderPolicy: false, // Necessário para embeds de vídeo/imagem
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Permite carregar recursos CDN
  }));

  // ===== RATE LIMITING =====
  // Rate limit para API: 500 requests por minuto por IP (não aplicar em assets estáticos)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Tente novamente em 1 minuto." },
  });
  app.use("/api/", apiLimiter);

  // Chave composta por loja + IP: evita que uma loja "barulhenta" (ou vários usuários atrás
  // do mesmo IP/proxy de uma loja) consuma a cota de outra loja atrás do mesmo IP compartilhado.
  const tenantAwareKey = (req: Request) => {
    const slug = extractTenantSlugFromRequest(req) || "no-tenant";
    return `${slug}:${ipKeyGenerator(req.ip ?? "unknown")}`;
  };

  // Rate limit para login: 10 tentativas por 15 minutos por loja+IP (anti brute force)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
    keyGenerator: tenantAwareKey,
  });
  // Aplicar rate limit de login nas rotas de autenticação (nomes reais dos procedures)
  app.use("/api/trpc/sellers.login", loginLimiter);
  app.use("/api/trpc/sellers.firstAccess", loginLimiter);
  app.use("/api/trpc/managers.login", loginLimiter);
  app.use("/api/trpc/access.verify", loginLimiter);
  app.use("/api/trpc/superAdmin.login", loginLimiter);
  app.use("/api/trpc/adminAuth.login", loginLimiter);
  app.use("/api/trpc/tenantAuth.login", loginLimiter);

  // Rate limit para webhooks públicos: 30 por minuto por loja+IP (anti spam)
  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Rate limit excedido para webhooks." },
    keyGenerator: tenantAwareKey,
  });
  app.use("/api/webhooks/widget", webhookLimiter);

  // Rate limit para uploads: 20 por minuto por IP
  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitos uploads. Tente novamente em 1 minuto." },
  });
  app.use("/api/trpc/saleDocuments.uploadCnh", uploadLimiter);
  app.use("/api/trpc/saleDocuments.uploadComprovante", uploadLimiter);
  app.use("/api/trpc/sellers.uploadPhoto", uploadLimiter);

  // Configure body parser with size limit for file uploads (reduzido de 50mb para 16mb)
  app.use(express.json({ limit: "16mb" }));
  app.use(express.urlencoded({ limit: "16mb", extended: true }));

  // Rota de proxy para download direto de imagem (salvar na galeria do celular)
  app.get("/api/photo-download", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) { res.status(400).json({ error: "URL required" }); return; }
      const response = await fetch(url);
      if (!response.ok) { res.status(502).json({ error: "Failed to fetch" }); return; }
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/jpeg";
      const filename = (req.query.name as string) || "foto.jpg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length.toString());
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: "Download failed" });
    }
  });

  // Rota para visualizar imagem inline (iOS - segure para salvar)
  app.get("/api/photo-view", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) { res.status(400).json({ error: "URL required" }); return; }
      const response = await fetch(url);
      if (!response.ok) { res.status(502).json({ error: "Failed to fetch" }); return; }
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Content-Length", buffer.length.toString());
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: "View failed" });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // CRM webhook endpoints for external integrations
  registerWebhookRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start inventory sync from kafkamultimarcas.com.br every 15 minutes
    import("../inventory-scraper").then(m => m.startInventorySync(15)).catch(e => console.error("[Inventory Sync] Failed to start:", e));
    import("../alert-checker").then(m => m.startAlertChecker(2)).catch(e => console.error("[Alert Checker] Failed to start:", e));
  });
}

startServer().catch(console.error);
