import pino from "pino";
import { ENV } from "./env";

// Logger estruturado: JSON em produção (qualquer host que capture stdout já
// ganha logs grepáveis por campo), formato legível em dev via pino-pretty.
// Escopo atual: caminho crítico de cobrança (webhooks ASAAS, billingRouter,
// asaasService) e captura global de erro no bootstrap — não substitui os
// demais console.* do projeto nesta rodada.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(ENV.isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
        },
      }),
});
