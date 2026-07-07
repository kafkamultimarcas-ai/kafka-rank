# Planos, Assinaturas e Pagamentos

Como o trial de 30 dias vira cobrança de verdade, como o sistema reage a pagamento/atraso, e o que existe hoje pra trocar/cancelar plano.

## 1. Preço como fonte única de verdade

- [`shared/plans.ts`](../../shared/plans.ts) — único lugar onde `basic`/`pro`/`enterprise` têm preço, limites (`maxSellers`/`maxAdmins`) e descrição definidos. Consumido tanto pelo backend (`billingRouter`, `asaasService`, pra saber quanto cobrar de verdade) quanto pelas telas de preço do frontend (`ComercialHome.tsx`, `Assinatura.tsx`) — elimina o risco clássico de a vitrine mostrar um preço e o sistema cobrar outro.
- Preços atuais (com desconto de lançamento já aplicado): Basic R$499 (de R$799), Pro R$699 (de R$999), Enterprise R$999/mês (marketing anuncia como "12x R$999/plano anual" — mesmo valor total, cobrado como assinatura mensal recorrente simples na ASAAS, sem usar parcelamento de cartão de verdade — decisão deliberada de simplicidade).
- `LAUNCH_PROMO_LIMIT = 100` ("primeiras 100 lojas") é hoje só texto na tela — **não há contagem real de quantas lojas já assinaram**, ver documento 05.

## 2. Trial de 30 dias

1. Loja nova (self-service ou criada pelo Super Admin) nasce com `status: "trial"` e `trialEndsAt` = agora + 30 dias.
2. `getTenantLimits()` (`server/tenantService.ts`) computa `trialExpired = status === "trial" && trialEndsAt < now()` — **só considera expirado se o status ainda for "trial"**, protegendo lojas já migradas pra pago de bloqueio acidental por causa de um `trialEndsAt` antigo que nunca foi limpo.
3. Login (`tenantAuthRouter.login`) e as queries `me` (admin/gerente/vendedor) devolvem `trialEndsAt`/`trialExpired`/`subscriptionSuspended` junto com os dados da sessão.
4. `client/src/components/TrialExpiredGate.tsx` — overlay global e **não fechável**, montado como irmão do `AccessGate` em `App.tsx`. Bloqueia quando `trialExpired` OU `subscriptionSuspended` são verdadeiros, com mensagem diferente pra cada caso, botão único levando pra `/t/:slug/assinatura`.

## 3. Integração com ASAAS

### 3.1. Decisão de arquitetura
Checkout usa a **página hospedada do ASAAS** (redirect) — nenhum dado de cartão passa pelo nosso servidor, elimina escopo de PCI compliance, e é mais rápido/seguro de construir do que formulário próprio com tokenização.

### 3.2. Wrapper da API — `server/asaasService.ts`
Credencial única global (`ENV.asaasApiKey`) — é a conta ASAAS da própria plataforma, diferente do Z-API que é uma credencial por loja.

| Função | O que faz |
|---|---|
| `createCustomer` | `POST /customers` — cria o cliente na ASAAS (nome, CPF/CNPJ, e-mail, telefone) |
| `createSubscription` | `POST /subscriptions` — cria assinatura nova, `billingType: "UNDEFINED"` (cliente escolhe cartão/PIX/boleto no checkout) |
| `updateSubscription` | `PUT /subscriptions/:id` — troca de plano numa assinatura já existente (ver seção 5) |
| `cancelSubscription` | `DELETE /subscriptions/:id` |
| `getCheckoutUrl` | busca a cobrança `PENDING` mais recente da assinatura e devolve `invoiceUrl` — é pra lá que o admin é redirecionado pra pagar |

### 3.3. Webhook — `POST /api/webhooks/asaas` (`server/webhooks.ts`)
Diferente dos outros webhooks do projeto (que são por-loja com `x-api-token`): este é **global** da conta ASAAS da plataforma. Passo a passo de cada chamada recebida:

1. Valida `ASAAS_WEBHOOK_TOKEN` configurado (503 se não) e o header `asaas-access-token` bate com ele (401 se não).
2. Resolve o tenant casando `payment.customer` com `tenants.asaasCustomerId` (`getTenantByAsaasCustomerId`). Se não achar, responde 200 + `ignored: true` — **não é erro**, pode ser evento de teste do próprio ASAAS; responder 200 evita retentativa infinita deles.
3. Verifica idempotência: mesma `tenantId` + `asaasPaymentId` + `eventType` já processado antes → 200 + `duplicate: true`, não reprocessa.
4. Grava o evento cru em `subscription_events` (payload completo em `rawPayload`, pra auditoria).
5. Só dois tipos de evento mudam o estado da loja automaticamente:
   - `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` → `status: "active"`, `trialEndsAt: null`, aplica `maxSellers`/`maxAdmins` do plano contratado, manda e-mail de confirmação (`sendSubscriptionConfirmedEmail`) e notificação in-app pro admin.
   - `PAYMENT_OVERDUE` → `status: "suspended"`, manda e-mail (`sendSubscriptionSuspendedEmail`) e notificação in-app.
   - Todos os outros eventos (`PAYMENT_DELETED`, `PAYMENT_REFUNDED`, chargeback etc.) ficam só no log, sem ação automática — evita reagir errado a um evento raro. Ver seção "eventos raros" no documento 03 pra como o Super Admin fica sabendo desses mesmo assim.

### 3.4. `server/routers/billingRouter.ts` (tenant-scoped, `adminProcedure`)

| Procedure | Faz o quê |
|---|---|
| `getMyPlan` | Plano/status/preço atual da loja logada |
| `getMyPaymentHistory` | Histórico paginado de `subscription_events`, isolado por `getCurrentTenantId()` |
| `subscribe` | Cria (ou reaproveita) customer na ASAAS; **se já existe assinatura, troca de plano em vez de criar outra** (seção 5); devolve URL de checkout |
| `cancelSubscription` | Cancela na ASAAS e limpa `subscriptionId` local |

### 3.5. Frontend — `client/src/pages/Assinatura.tsx`
- Cards de plano (preço vindo de `shared/plans.ts`), histórico de pagamento paginado (tabela shadcn).
- `SubscribeDialog`: coleta CPF/CNPJ (com máscara e checksum, ver documento 04), nome de cobrança, e-mail, telefone → chama `billing.subscribe` → redireciona pro checkout.
- Distingue "Assinar agora" (loja sem plano pago) de "Trocar para este plano" (loja já paga, olhando outro card) na cópia e no botão.

## 4. Proteção contra cobrança duplicada (achado crítico corrigido)

**O problema**: antes da correção, `billing.subscribe` sempre chamava `createSubscription`, mesmo se a loja já tinha uma assinatura ativa. Um duplo clique no botão, ou uma tentativa de trocar de plano, criava **uma segunda assinatura de verdade na ASAAS** — cliente cobrado duas vezes.

**A correção**:
1. Se `tenant.subscriptionId` já existe: chama `asaas.updateSubscription(subscriptionId, { plan })` — `PUT` que atualiza o `value` da assinatura existente, com `updatePendingPayments: true` (confirmado contra a documentação oficial da ASAAS: sem essa flag, só cobranças *futuras* usariam o preço novo).
2. Rejeita explicitamente tentar "assinar" o mesmo plano que a loja já tem (`A loja já está no plano X`).
3. `cancelSubscription` agora **limpa o `subscriptionId` local** depois de cancelar na ASAAS — sem isso, a próxima tentativa de assinar tentaria dar `PUT` numa assinatura que não existe mais.
4. Quando é troca de plano (não assinatura nova), pode não haver cobrança `PENDING` no momento exato (ciclo já pago) — nesse caso não há `checkoutUrl` pra redirecionar, e isso não é erro: o frontend mostra "plano atualizado, vale a partir da próxima cobrança" em vez de tentar redirecionar pra `undefined`.

## 5. Testes

- [`server/asaas-webhook.test.ts`](../../server/asaas-webhook.test.ts) — token errado rejeitado; `PAYMENT_CONFIRMED` ativa a loja + grava evento + manda e-mail + notifica; idempotência (webhook reenviado não duplica); `PAYMENT_OVERDUE` suspende + e-mail + notifica; evento de customer desconhecido é ignorado com 200.
- [`server/billing.test.ts`](../../server/billing.test.ts) — `subscribe` cria customer/assinatura corretamente; troca de plano chama `updateSubscription` (não `createSubscription`); rejeita assinar o mesmo plano de novo; rejeita CPF/CNPJ inválido antes de chamar a ASAAS de verdade; isolamento de tenant no histórico de pagamento; `cancelSubscription` limpa o id local; comprovante de troca de plano por e-mail.

## 6. Pendência mais crítica desta área

**Nunca foi testado contra o sandbox real da ASAAS** — tudo construído e validado com base na documentação oficial pesquisada e em mocks, mas sem `ASAAS_API_KEY` configurada neste ambiente. Ver documento 05 pra o roteiro de validação antes de produção.
