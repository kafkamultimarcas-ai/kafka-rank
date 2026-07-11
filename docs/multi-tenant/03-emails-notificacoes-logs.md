# E-mails, Notificações e Logs

Quando o sistema manda e-mail, quando usa o sininho do header, e como o Super Admin acompanha tudo isso numa tela só.

## 1. Critério: e-mail vs. notificação in-app

Levantamento feito antes de implementar (mantido aqui porque explica as escolhas de arquitetura abaixo):

| Evento | Sininho (in-app) | E-mail | Por quê |
|---|---|---|---|
| Cadastro de loja concluído | — | ✅ | Ninguém está logado ainda pra ver notificação |
| Assinatura confirmada | ✅ | ✅ | Comprovante precisa sobreviver fora da sessão |
| Assinatura suspensa | ✅ | ✅ | Precisa alcançar o admin mesmo sem ele abrir o sistema |
| Trial acabando (5/3/1 dias) | ✅ se logado | ✅ | Ninguém fica logado esperando o trial vencer |
| Troca de plano confirmada | ✅ (toast imediato) | ✅ (comprovante) | — |
| Redefinição de senha | — | ✅ | Já coberto no documento 01 |
| Vendedor/gerente cadastrado | — | ✅ opcional | Link de acesso, nunca senha em texto puro |
| Venda, lead, ficha, aprovação pendente | ✅ (já existia) | ❌ | Alto volume — e-mail seria ruído |
| Evento raro de webhook ASAAS (chargeback/reembolso) | ✅ (Super Admin) | ❌ | Log/badge já resolve, e-mail não é o canal certo pra isso |

## 2. Sistema de e-mail transacional

### 2.1. Antes desta branch
Só existia `sendVerificationEmail`/`sendOTP` (código de 6 dígitos por e-mail, usado em login/registro), e nenhum e-mail relacionado a assinatura ou cadastro de loja.

### 2.2. `server/emailService.ts` — arquitetura atual
- **`dispatchEmail()`** é a função central: chama o Resend (`ENV.RESEND_API_KEY`) e, **sucesso ou falha**, grava uma linha em `email_logs`. Se o Resend não estiver configurado (ambiente local), o conteúdo só vai pro console e o log é gravado como "sent" mesmo assim — mesmo comportamento de sempre, só que agora auditável.
- Toda função de envio (`sendVerificationEmail`, `sendPasswordResetEmail`, `sendSignupWelcomeEmail`, `sendSubscriptionConfirmedEmail`, `sendSubscriptionSuspendedEmail`, `sendTrialEndingEmail`, `sendUserWelcomeEmail`, `sendPlanChangedEmail`) é uma casca fina em cima de `dispatchEmail()`, reaproveitando um único template HTML (`emailShell()`).
- `email_logs` (`drizzle/schema.ts`, migration `0072`): `tenantId` (nullable — nem todo e-mail tem tenant resolvido, ex. OTP antes da sessão existir), `emailType`, `toEmail`, `subject`, `status` (`sent`/`failed`), `providerId` (id do Resend, se sucesso), `errorMessage`.

### 2.3. Onde cada e-mail é disparado

| Função | Disparado em |
|---|---|
| `sendVerificationEmail`/`sendOTP` | Login/registro por código (já existia) |
| `sendPasswordResetEmail` | `passwordResetRouter.requestReset` |
| `sendSignupWelcomeEmail` | `publicSignupRouter.create`, depois de provisionar a loja |
| `sendSubscriptionConfirmedEmail` | Webhook ASAAS, `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` |
| `sendSubscriptionSuspendedEmail` | Webhook ASAAS, `PAYMENT_OVERDUE` |
| `sendTrialEndingEmail` | Job diário de trial (seção 4) |
| `sendUserWelcomeEmail` | `sellers.create`/`managers.create`, só se um e-mail foi informado |
| `sendPlanChangedEmail` | `billingRouter.subscribe`, quando é troca de plano (não assinatura nova) |

Nenhuma dessas chamadas manda senha em texto puro por e-mail — vendedor sempre usa "primeiro acesso" pra escolher a própria senha; gerente recebe só o link de login mesmo quando o admin já definiu uma senha na hora de criar a conta.

## 3. Notificações in-app (o "sininho")

- Já existia antes desta branch: `client/src/components/NotificationCenter.tsx` (ícone de sino no header, contador de não lidas, som de alerta, polling de 15s), tabela `notifications`, router `notifications.*`, variantes admin e vendedor.
- Usado até então só pra eventos operacionais (venda nova, lead, ficha, alertas de gerente) via um helper genérico `createNotification()`.
- Esta branch **reaproveitou a mesma infraestrutura** pra eventos comerciais novos: `subscription_confirmed`, `subscription_suspended`, `trial_ending` — sem precisar desenhar um sistema de notificação novo, só plugar nos pontos certos (webhook ASAAS, job de trial).

## 4. Job diário de trial acabando

- `server/trialReminderJob.ts` — varre todas as lojas com `status: "trial"`, calcula dias restantes (`Math.ceil`), dispara e-mail + notificação nos limiares **5, 3 e 1 dia** restantes.
- Idempotência: `tenants.trialReminderDaysSent` (ex: `"5,3"`) guarda quais avisos já foram mandados — sem precisar de uma tabela de controle separada.
- Registrado em `server/_core/index.ts` no mesmo padrão já usado por outros jobs do projeto (`inventory-scraper`, `alert-checker`): `setInterval`, roda a cada 6 horas. **Não existe scheduler tipo cron no projeto** — como o envio é idempotente, rodar a checagem mais de uma vez por dia é seguro (a segunda vez só encontra o dia já registrado e pula).
- `ENV.appUrl` (env var `APP_URL`) foi adicionado especificamente porque um job em background não tem uma request HTTP de onde derivar o host (diferente do `getRequestOrigin(req)` usado nos routers) — precisa de uma origem configurada.

## 5. Log unificado no Super Admin

> **Atualização (leva de trabalho posterior)**: um terceiro `logType` (`billing_alert`) foi adicionado a este mesmo sistema, junto com a correção de um bug real de idempotência no webhook ASAAS e logger estruturado — ver [documento 07](07-observabilidade-alertas-cobranca.md). A primeira tentativa criou uma aba "Alertas" separada; foi revertida a pedido do usuário pra manter tudo nesta mesma tela de Logs.

### 5.1. Antes desta branch
A tela do Super Admin só tinha "Logs de Assinaturas" (`subscriptionLogsRouter`), cobrindo só `subscription_events`.

### 5.2. `server/routers/platformLogsRouter.ts` (novo)
- `list` normaliza `email_logs` e `subscription_events` num formato comum (`id`, `logType`, `tenantName`, `title`, `detail`, `status`, `createdAt`), filtrável por:
  - **Tipo** (`logType`: e-mail / assinatura / todos)
  - Loja (`tenantId`)
  - Status
  - **Intervalo de data** (`startDate`/`endDate`)
- No modo "todos os tipos", busca de cada tabela separadamente e mescla em memória ordenado por data (paginação exata entre duas tabelas diferentes exigiria `UNION` em SQL — pro volume de log de uma plataforma, essa aproximação é suficiente e bem mais simples).
- `getById` roteia pra tabela certa conforme o `logType` pedido.
- `getRareEventsCount` — conta eventos de `subscription_events` dos últimos 30 dias que são `PAYMENT_DELETED`/`PAYMENT_REFUNDED`/chargeback (eventos que o webhook grava mas não reage automaticamente, ver documento 02) — vira **badge amarelo** na aba de Logs. Não é um sistema de "lido/não lido", só uma contagem recente que chama atenção — decisão deliberada pra não construir uma tabela de leitura por admin sem necessidade comprovada.

### 5.3. Frontend
- `client/src/pages/SuperAdmin.tsx`: `SubscriptionLogsSection`/`SubscriptionEventDetailModal` viraram `PlatformLogsSection`/`PlatformLogDetailModal`, consumindo `platformLogs.*`. Seletor de Tipo, dois inputs de data (início/fim), badge colorido por tipo de log na tabela, badge de eventos raros na aba de navegação.
- `subscriptionLogsRouter.ts` original **não foi removido** (ainda coberto por `billing.test.ts`) — só não é mais consumido pela tela, pra não quebrar teste existente sem necessidade real.

## 6. Testes

- [`server/email-logs.test.ts`](../../server/email-logs.test.ts) — toda função de envio grava o `emailType` certo em `email_logs`.
- [`server/asaas-webhook.test.ts`](../../server/asaas-webhook.test.ts) — confirma e-mail + notificação nos branches de confirmação/suspensão (ver documento 02).
- [`server/platform-logs.test.ts`](../../server/platform-logs.test.ts) — filtro por tipo, mescla "todos", intervalo de data, `getRareEventsCount`, isolamento por token de Super Admin.
- [`server/trial-reminder-job.test.ts`](../../server/trial-reminder-job.test.ts) — limiar certo (5/3/1), idempotência (não reenvia no mesmo dia), sem falso positivo fora do limiar, loja sem e-mail não quebra o job, loja fora de trial é ignorada.
- [`server/user-welcome-email.test.ts`](../../server/user-welcome-email.test.ts) — vendedor/gerente com e-mail recebe boas-vindas; sem e-mail, não manda nada (não quebra).

## 7. Pendências desta área

- Nenhum e-mail desta branch foi testado com o Resend de verdade (`RESEND_API_KEY` não configurada neste ambiente) — tudo validado via log no console.
- Tela de logs unificada nunca foi aberta num navegador real.
- E-mail de boas-vindas de vendedor/gerente linka só pro login geral da loja, não pra um link de primeiro acesso direto — dá pra evoluir reaproveitando a infraestrutura de token do `passwordResetRouter`.
