export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  zapiInstanceId: process.env.ZAPI_INSTANCE_ID ?? "",
  zapiToken: process.env.ZAPI_TOKEN ?? "",
  zapiApiUrl: process.env.ZAPI_API_URL ?? "https://api.z-api.io",
  zapiClientToken: process.env.ZAPI_CLIENT_TOKEN ?? "",
  asaasApiUrl: process.env.ASAAS_API_URL ?? "https://api-sandbox.asaas.com/v3",
  asaasApiKey: process.env.ASAAS_API_KEY
    ? Buffer.from(process.env.ASAAS_API_KEY, "base64").toString("utf-8")
    : "",
  asaasWebhookToken: process.env.ASAAS_WEBHOOK_TOKEN ?? "",
  asaasWalletId: process.env.ASAAS_WALLET_ID ?? "",
  // Origem pública da aplicação — usada só por jobs em background (ex: aviso de
  // trial acabando) que precisam montar link absoluto sem ter uma request HTTP
  // de onde derivar o host, diferente de getRequestOrigin(req).
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
};
