# Observabilidade e Alertas de Cobrança

## Análise

O caminho crítico de cobrança (webhook `/api/webhooks/asaas`, `server/webhooks.ts`) processa pagamento de verdade via ASAAS, mas só tinha `console.log/warn/error` sem estrutura, nenhum error tracking e nenhum alerta — se falhasse (DB fora do ar por um segundo, e-mail falhando), ninguém ficava sabendo. Decisão do usuário: **sem serviço externo (Sentry etc.)** — solução 100% interna, reaproveitando infraestrutura já existente (Resend pra e-mail, painel Super Admin, MySQL).

**Bug real de correção encontrado durante a investigação** (não só falta de log): em `server/webhooks.ts`, o fluxo era (1) checar idempotência por `(tenantId, asaasPaymentId, eventType)`, (2) inserir o evento em `subscription_events`, (3) só depois atualizar `tenants.status`/enviar e-mail/criar notificação — **sem transação**. Se o processo caísse ou o DB falhasse entre o insert (2) e o update do tenant (3), o registro de idempotência já existia. Quando o ASAAS reenviasse o webhook (ele reenvia em erro 5xx), a checagem de idempotência encontrava o evento e devolvia `{duplicate: true}` **sem nunca reprocessar a ativação** — cliente pago, loja nunca ativada, sem autocorreção possível mesmo com retry.

## Feature

1. **Logger estruturado** — `server/_core/logger.ts`, usando `pino` (+ `pino-pretty` em dev). JSON em produção, formato legível em dev. Escopo: caminho de cobrança (`webhooks.ts`, `billingRouter.ts`, `asaasService.ts`) + captura global de erro no bootstrap — não é uma migração geral dos ~266 `console.*` do resto do projeto.
2. **Correção do bug de idempotência** — insert do evento + transição de estado (`PAYMENT_CONFIRMED`/`RECEIVED`/`OVERDUE`) agora rodam dentro de uma `db.transaction()` em `resolveTenantId`/webhook handler. Falha no meio desfaz tudo, inclusive o registro de idempotência — o próximo retry do ASAAS reprocessa do zero corretamente. Efeitos "soft" (e-mail, notificação) ficam **fora** da transação: se falharem, não pedem retry do ASAAS (o pagamento já foi processado), só geram um alerta de severidade menor.
3. **Alerta interno durável** — tabela nova `billing_alerts` (`drizzle/schema.ts`) + `server/billingAlertService.ts` (`createBillingAlert()`): grava o alerta, loga estruturado, e se `severity === "critical"` dispara e-mail (via `emailService.ts`, novo `EmailType: "billing_critical_alert"`) pros Super Admins ativos com `role === "owner"`.
4. **Timeout no client HTTP do ASAAS** — `server/asaasService.ts` não tinha timeout nas chamadas `fetch`; adicionado `AbortController` (30s).
5. **Captura global no bootstrap** — `server/_core/index.ts`: `process.on("unhandledRejection"/"uncaughtException")`, `onError` no `createExpressMiddleware` do tRPC, error-handling middleware do Express no fim da cadeia — nenhum dos três existia antes.
6. **Unificação na tela de Logs do Super Admin** (não uma aba separada) — `billing_alert` virou um terceiro `logType` em `server/routers/platformLogsRouter.ts`, ao lado de `email`/`subscription` já existentes (ver documento 03, seção 5). `getRareEventsCount` (badge da aba "Logs") passou a somar também alertas críticos não resolvidos.

## Plano de Implementação

| Arquivo | Mudança |
|---|---|
| `server/_core/logger.ts` (novo) | Logger pino |
| `drizzle/schema.ts` | Tabela `billingAlerts` (`severity`, `code`, `message`, `context` JSON, `resolved`, `resolvedAt`, `resolvedBy`) |
| `server/billingAlertService.ts` (novo) | `createBillingAlert()` |
| `server/emailService.ts` | `EmailType: "billing_critical_alert"` + `sendBillingCriticalAlertEmail()` |
| `server/webhooks.ts` | `db.transaction()` envolvendo insert+transição; logs estruturados; alertas nos pontos de falha |
| `server/asaasService.ts` | Timeout via `AbortController` |
| `server/routers/billingRouter.ts` | Alerta (`severity: "warning"`) quando `AsaasError` é capturado em `subscribe`/`cancelSubscription` |
| `server/_core/index.ts` | `unhandledRejection`/`uncaughtException`, `onError` do tRPC, error handler Express |
| `server/routers/platformLogsRouter.ts` | `listBillingAlertLogs()`, `resolveBillingAlert`, `billing_alert` no `logTypeSchema`, `getById`, `getRareEventsCount` |
| `client/src/pages/SuperAdmin.tsx` | `PlatformLogsSection`/`PlatformLogDetailModal` ganham o terceiro tipo (ícone, filtro de severidade, botão "Marcar resolvido"); aba separada "Alertas" criada e depois **removida** (ver Resultados) |
| `.env.example` (novo) | Documenta todas as env vars já usadas e nunca documentadas, mais `LOG_LEVEL` |

## Resultados

- Typecheck limpo. 16/16 testes de billing/webhook passando, incluindo 3 novos que provam a correção do bug: falha simulada em transação não deixa rastro (rollback total) e cria alerta crítico; reenviar o mesmo evento depois da falha reprocessa certo (não cai em `duplicate: true` fantasma); falha simulada no envio de e-mail ainda responde 200 (não pede retry) e gera alerta de aviso.
- Migration `billing_alerts` gerada e aplicada (`npm run db:push`).
- **Correção de rota**: a primeira versão criou uma aba "Alertas" separada no Super Admin. Isso foi revertido a pedido do usuário — tudo foi consolidado na aba "Logs" já existente, como um terceiro `logType`, pra não fragmentar onde o Super Admin olha pra saber se algo está errado.
- Bug lateral encontrado e corrigido durante os testes: extrair `logger.error`/`logger.warn` como referência solta (`const log = severity === "critical" ? logger.error : logger.warn`) quebrava o pino em runtime (perde o `this` interno) — corrigido com `.bind(logger)`.
- Testado ao vivo: login no Super Admin, aba "Logs" com filtro "Alerta de Cobrança" funcionando, sem erros no console.

## Como Testar

1. `npx tsc --noEmit -p .`.
2. `npx vitest run server/billing.test.ts server/asaas-webhook.test.ts`.
3. `npm run db:push` (se a migration ainda não estiver aplicada no ambiente).
4. Teste manual: `curl` simulando POST pro `/api/webhooks/asaas` com token certo e evento `PAYMENT_CONFIRMED` — log estruturado no console, fluxo normal de ativação.
5. No Super Admin (`/super-admin`, aba "Logs"): filtrar por "Alerta de Cobrança", confirmar que a listagem e o botão "Marcar resolvido" funcionam (linha da tabela e modal de detalhe).
