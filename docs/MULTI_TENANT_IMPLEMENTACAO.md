# Multi-Tenant SaaS — Estado da Implementação

Documento de referência do que foi implementado na transformação do Kafka Rank em plataforma multi-loja. Complementa (e atualiza) `docs/multitenant-saas-implementation-plan.md`, que descrevia o plano original — várias premissas desse plano já estavam superadas pelo código real no momento em que este documento foi escrito.

## Resumo executivo

**Estado atual**: núcleo do isolamento multi-tenant (autenticação, dados, uploads, Z-API, webhooks, rate limit, criptografia) está implementado, testado e validado ao vivo com dois tenants reais rodando lado a lado. `tsc --noEmit` limpo e suíte de testes em ~99% de aprovação (755/762), com as 7 falhas remanescentes todas identificadas e não relacionadas a isolamento entre lojas.

**Pronto para**: piloto controlado com 1–3 lojas reais, QA funcional e QA de segurança (roteiro de teste manual abaixo). **Não recomendado ainda** para autosserviço/onboarding em massa sem fechar os itens essenciais da seção "O que ainda falta" (ver estimativa de % abaixo).

### O que foi feito, em ordem cronológica

| Fase | O que entrega |
|---|---|
| 1 | Fundação de tenant: `tenantId` nas tabelas, resolução por `/t/:slug/...` |
| Login único | Um único formulário de login por loja, papel resolvido após autenticar |
| 2 | `tenantId` embutido em todos os tokens/cookies + validação de coerência sessão×URL (`assertTenantMatch`) |
| Z-API | Credenciais e envio de WhatsApp isolados por loja (19 pontos de chamada) |
| Webhooks | Lead, Meta, widget e WhatsApp resolvendo o tenant certo por assinatura/telefone |
| Rotas admin | Todas as rotas `/t/:slug/admin/*` cobertas no frontend |
| Branding | Logo/cores dinâmicas por loja nas telas principais |
| F | Bug: bônus de carro gravava sempre no tenant 1 — corrigido |
| G | Bug crítico: configuração do Atendente IA era compartilhada entre **todas** as lojas — isolada |
| H | Unicidade de username agora é por loja, não mais global |
| I | Enforcement real de módulos habilitados e limites de plano (`maxSellers`/`maxAdmins`) |
| J | Credenciais Z-API criptografadas em repouso (AES-256-GCM) + rate limit de login por loja+IP |
| K | Itens residuais de UX/health do Super Admin |
| L | Bug crítico: uploads (CNH, comprovantes, fotos) tinham chave previsível entre lojas — corrigido; +62 índices em `tenantId` |
| M | Bug crítico: rotas autenticadas (`protectedProcedure`) não passavam pelo contexto de tenant e podiam gravar no tenant errado — corrigido; healthcheck HTTP; segundo tenant de teste; suíte de testes saneada (35 → 7 falhas, todas não-bloqueantes) |
| Em andamento (task separada) | Migrations das tabelas do Atendente IA (`credit_applications`, `ai_appointments`) — feature que nunca tinha sido migrada, sinalizada e sendo corrigida em paralelo |

### Estimativa de prontidão

- **Isolamento multi-tenant (o que importa para não vazar dado entre lojas)**: ~95% — auth, dados, uploads, Z-API, webhooks, rate limit e criptografia cobertos e testados; falta só estender o gate de módulo (`moduleRequiredProcedure`) dos outros módulos além de Marketing e uma auditoria de defesa-em-profundidade no SQL raw do Atendente IA.
- **Operação em produção multi-cliente (observabilidade, LGPD, onboarding)**: ~30% — sem error tracking correlacionado por tenant, sem expurgo de dado no soft-delete, onboarding de senha é manual.
- **Geral, para lançamento com autosserviço/escala**: ~70%.
- **Geral, para um piloto controlado com acompanhamento manual**: ~90% — dá para testar e usar com clientes reais hoje, com atenção aos pontos da seção "O que ainda falta".

### Achado que não é sobre código: nada disso está commitado ainda

A branch `feat/multi-tenant` tem um único commit-base (`6e5ce05`, "implementação inicial"). **Todo o trabalho das Fases 2 em diante (Login único, Z-API, Webhooks, F–M — ~60 arquivos, +1650/-700 linhas, 20+ migrations e testes novos) está na working tree, não commitado.** Isso não é um problema de qualidade de código, mas é um bloqueio prático para "entregar pra QA": não dá pra abrir PR, não dá pra revisar diff, e o trabalho está vulnerável a ser perdido (`git stash`/`checkout` acidental, crash de máquina, etc.). Recomendo commitar (em um ou mais commits organizados por fase) antes de considerar isso "entregável" — não fiz isso porque só crio commits quando pedido explicitamente.

## Modelo de URL

`kafkarank.com/t/:slug/...` — cada loja é identificada por um slug na URL (ex: `loja-demo`). Rotas legadas sem slug continuam funcionando e apontam para o tenant padrão (`tenantId = 1`, a loja "Kafka Multimarcas" original).

---

## Fase 1 — Fundação de tenant (já existia antes desta rodada de trabalho)

Base já sólida no repositório antes de qualquer mudança descrita abaixo:

- **Resolvedor central** — [server/tenantMiddleware.ts](../server/tenantMiddleware.ts): resolve o tenant por prioridade `header x-tenant-slug` → `path /t/:slug` → `referer` → `usuário autenticado` → `default (tenant 1)`. Cacheia por 5 minutos.
- **AsyncLocalStorage** — [server/tenantDb.ts](../server/tenantDb.ts): `getCurrentTenantId()` lê o tenant do contexto assíncrono da request; `withTenant`/`withTenantAsync` abrem esse contexto manualmente quando necessário (fora do fluxo tRPC padrão).
- **Middleware tRPC** — [server/_core/trpc.ts](../server/_core/trpc.ts): toda `publicProcedure` já roda dentro de `tenantStorage.run({tenantId}, ...)`.
- **Bootstrap público** — `tenantPublic.getBySlug` / `tenantPublic.current` ([server/routers/tenantPublicRouter.ts](../server/routers/tenantPublicRouter.ts)).
- **Frontend** — `TenantProvider`/`useTenant()` ([client/src/contexts/TenantContext.tsx](../client/src/contexts/TenantContext.tsx)) e rotas parciais `/t/:slug/...` já registradas no `App.tsx`.
- **Super Admin** — CRUD de tenant com provisionamento básico (admin dono + pipeline padrão + categorias financeiras) em [server/routers/superAdminRouter.ts](../server/routers/superAdminRouter.ts).

---

## Login único por loja

Antes: três endpoints de login separados (`sellers.login`, `adminAuth.login`, `managers.login`), cada um com sua própria tela.

Agora existe **um único ponto de entrada por loja**: `/t/:slug/login`, atendido pelo componente [client/src/pages/SellerLogin.tsx](../client/src/pages/SellerLogin.tsx), que chama a rota tRPC nova `tenantAuth.login` ([server/routers/tenantAuthRouter.ts](../server/routers/tenantAuthRouter.ts)).

Como funciona:
1. Exige que o tenant já tenha sido resolvido pela URL (`ctx.tenantSlug` e `ctx.tenantId` válidos) — se não, erro claro em vez de cair silenciosamente no tenant padrão.
2. Tenta autenticar, dentro do tenant, na ordem **admin → manager → seller**.
3. Cada tipo mantém o mecanismo de sessão que já existia (Bearer token para admin, cookie `manager_session`, cookie `seller_session`) — decisão deliberada para não mexer nos middlewares de leitura desses tokens.
4. Retorna `{ userType, role, department?, sellerRole?, mustChangePassword?, token?, redirectPath }`. O `redirectPath` já vem calculado no backend (`/crm/admin`, `/gerente`, `/financeiro`, `/pos-venda`, `/minha-area/:id`).
5. Fluxo de primeiro acesso do admin (troca de senha obrigatória) preservado.

As URLs diretas antigas (`/crm/admin/login` com auto-login do owner, etc.) continuam existindo em paralelo — não foram removidas.

---

## Fase 2 — Autenticação tenant-aware completa

Havia 4 pontos reais de emissão de token (não só 2 como o plano original assumia): `tenantAuth.login` (novo), `adminAuth.login`/`autoLogin` (crmRouter), `sellers.login` e `managers.login` legados (ainda usados por `AccessGate.tsx` e `DashboardLayout.tsx`).

### O que foi feito
- **`tenantId` e `tenantSlug` agora vão em todos os tokens** — seller, manager e admin. Antes só o admin tinha `tenantId`.
- **`crmDb.ts` / `db.ts`** — `getSellerByUsername`, `getManagerByUsername`, `getAdminByUsername` já eram tenant-scoped via `getCurrentTenantId()`; os tokens agora carregam o `tenantId` do próprio registro encontrado.
- **Removido o fallback perigoso `admin.tenantId || 1`** em [server/routers/crmRouter.ts](../server/routers/crmRouter.ts) — se um admin não tiver `tenantId`, isso deve quebrar visivelmente, não virar silenciosamente a loja 1.
- **`adminAuth.autoLogin` simplificado** — removido o parâmetro `input.tenantId` que existia mas nunca era usado (a escopagem real já vinha do tenant resolvido pela URL via ALS).
- **Validação de coerência sessão × URL** — novo helper `assertTenantMatch()` em [server/tenantMiddleware.ts](../server/tenantMiddleware.ts):
  ```ts
  export function assertTenantMatch(tokenTenantId: number | null | undefined, requestTenantId: number): boolean {
    if (tokenTenantId === null || tokenTenantId === undefined) return true; // token legado, tolerado até expirar
    return tokenTenantId === requestTenantId;
  }
  ```
  Chamado em [server/_core/context.ts](../server/_core/context.ts) nos 3 pontos de decodificação de token (`manager_session`, admin Bearer, `seller_session`), **antes** de qualquer lookup no banco. Em caso de divergência, loga `[SECURITY] TENANT_MISMATCH` e trata como não-autenticado.
- **Tokens antigos sem `tenantId`** (emitidos antes dessa mudança) continuam funcionando até expirarem naturalmente em 30 dias — decisão consciente para não forçar logout em massa.

### Residual conhecido
`AccessGate.tsx` (`sellers.login`) e `DashboardLayout.tsx` (`managers.login`) continuam autenticando fora de `/t/:slug` — já recebem `tenantId`/`tenantSlug` no token, mas o usuário chega lá sem passar pela resolução de loja pela URL. Funciona hoje só porque cai no tenant padrão. Migrar essas duas telas para dentro do contexto `/t/:slug` fica para uma próxima rodada.

---

## Z-API multi-tenant

### O problema
`zapi-service.ts` já suportava credenciais por tenant (`getTenantCredentials(tenantId)`), mas **nenhum dos 19 pontos de chamada de `zapi.sendText()`** no projeto passava esse parâmetro — todos usavam as credenciais globais do `.env`, mesmo lojas com Z-API própria configurada.

### A correção
Em vez de editar 19 call sites manualmente (alto risco de esquecer um), a correção foi na origem — [server/zapi-service.ts](../server/zapi-service.ts):

```ts
async function getTenantCredentials(tenantId?: number): Promise<ZapiCredentials> {
  const effectiveTenantId = tenantId ?? getCurrentTenantId();
  if (!effectiveTenantId || effectiveTenantId <= 1) return globalCreds;
  ...
}
```

Quando nenhum `tenantId` é passado explicitamente, cai no tenant resolvido via `AsyncLocalStorage` da request atual. Isso corrige automaticamente qualquer chamador que rode dentro de um contexto tRPC ou de um webhook já tenantizado (ver seção seguinte), sem precisar tocar em cada chamada.

Reforço explícito adicional em `notifySellerViaWhatsApp` ([server/routers/crmRouter.ts](../server/routers/crmRouter.ts)), que agora passa `(seller as any).tenantId` diretamente.

**Verificado que funciona de verdade**: `campaign-dispatch.ts` (disparo de campanha) e `inactive-dispatch.ts` (alerta de inatividade) são chamados de dentro de mutations tRPC — `AsyncLocalStorage` do Node propaga corretamente através de `await`/`Promise`/`setTimeout` agendados dentro desse contexto, então o fix cobre esses fluxos também, mesmo fire-and-forget.

Teste: [server/zapi-tenant-fallback.test.ts](../server/zapi-tenant-fallback.test.ts) — prova que `sendText()` sem `tenantId` explícito usa as credenciais do tenant resolvido via ALS, e que passar `tenantId` explícito continua tendo prioridade.

---

## Webhooks tenant-aware

### O problema
`server/webhooks.ts` registra suas rotas direto no Express (`registerWebhookRoutes(app)`), **fora** do middleware tRPC que abre o contexto de tenant. Resultado: `getCurrentTenantId()` dentro de qualquer webhook sempre caía em `1`. Como `getIntegrationByToken` filtrava por `tenantId = getCurrentTenantId() AND apiToken = token`, **nenhuma loja além da 1 conseguia usar integrações de lead** — o token dela nunca batia com a query.

### A correção
- **`crmDb.getIntegrationByTokenGlobal(token)`** (novo) — busca a integração pelo token **sem** filtrar por tenant, só para descobrir a qual loja ele pertence.
- **`resolveTenantFromToken(req, res)`** substitui o antigo `validateToken()` em `webhooks.ts` — resolve o tenant dono do token e retorna o `tenantId` (ou `null` + resposta de erro já enviada).
- Cada handler agora envolve toda a lógica de negócio em `withTenantAsync(tenantId, async () => { ... })`, garantindo que `getCurrentTenantId()` esteja correto para todas as chamadas `crmDb.*` dentro dele.

Endpoints corrigidos: `/api/webhooks/lead`, `/leads/bulk`, `/generic`, `/email-parser`, `/sig/sale`, `/sig/inventory` (por token) e `/meta/leadgen`, `/meta/verify`, `/google/lead` (por query param `?tenant=slug`, com fallback pro tenant padrão quando ausente — preserva a configuração atual da loja legada).

**Widget público** (`/api/webhooks/widget/lead`, sem token): agora aceita `tenantSlug` no corpo da requisição. O snippet de embed (`widget.js`) ganhou suporte a `data-tenant="slug-da-loja"` no `<script>` tag, e a documentação (`/api/webhooks/docs`) foi atualizada para refletir isso. Sem `tenantSlug`, cai no tenant padrão (não quebra o widget já embedado na loja atual).

**WhatsApp** (`/api/webhooks/whatsapp`): o handler gigante (~500 linhas) foi extraído para uma função nomeada `handleWhatsappWebhook(req, res, tenantId)`, envolvida em `withTenantAsync`. Duas rotas registradas:
- `/api/webhooks/whatsapp` (legada, sem slug) → tenant padrão (1). Mantida para não quebrar a instância Z-API já configurada da loja atual.
- `/api/webhooks/whatsapp/:tenantSlug` (nova) → resolve o tenant pelo path. **Configurar essa URL na instância Z-API de cada loja nova.**

### Residual conhecido — importante
Parte da lógica de resposta automática por IA dentro do handler do WhatsApp usa **SQL raw** (`dbConn.execute(sql\`...\`)`) direto em tabelas como `crm_ai_global_config`, `crm_ai_settings` e trechos de `crm_campaign_recipients`, **sem filtro de `tenantId`** — essas consultas não passam pelos helpers de `crmDb.ts` que já são tenant-scoped. Envolver o handler em `withTenantAsync` resolve as chamadas via `crmDb.*` (criar lead, criar mensagem, buscar lead), mas **não** essas queries raw. Auditar e corrigir esse SQL raw fica como próximo passo — não estava no escopo desta rodada.

Teste comportamental (não estrutural) provando o fim-a-fim: [server/webhooks-tenant.test.ts](../server/webhooks-tenant.test.ts) — dois tokens de tenants diferentes nunca vazam entre si, token inválido/desativado é rejeitado sem criar lead, widget resolve pelo slug do corpo, rota `/whatsapp/:tenantSlug` existe e retorna 404 para loja inexistente.

---

## Cobertura de rotas `/t/:slug/admin/*`

Antes, só existiam variantes tenantizadas para login, minha-área, CRM admin, pós-venda, financeiro e gerente — nenhuma das ~26 rotas `/admin/*` (dashboard, vendedores, competições, vendas, financeiro-admin etc.) tinha equivalente com slug.

Todas foram registradas em pares no [client/src/App.tsx](../client/src/App.tsx): cada `<Route path="/admin/x">` ganhou um `<Route path="/t/:slug/admin/x">` irmão apontando pro mesmo componente — mesmo padrão já usado no arquivo para as rotas tenantizadas existentes (não foi criada uma abstração nova).

### Achado e correção correlata
As novas rotas `/t/:slug/admin/*` seriam bloqueadas pelo [client/src/components/AccessGate.tsx](../client/src/components/AccessGate.tsx), que só liberava (bypass) `login`, `admin/login`, `crm/admin/login` e `crm/admin` dentro de `/t/:slug/...`. O regex de bypass foi ampliado:

```ts
function isTenantBypassRoute(pathname: string): boolean {
  return /^\/t\/[a-z0-9-]+\/(?:login|admin|crm|gerente|pos-venda|financeiro|minha-area)(?:\/|$)/i.test(pathname);
}
```

Sem esse ajuste, as rotas novas existiriam mas nunca seriam alcançáveis — o gate de acesso do storefront legado interceptaria antes.

---

## Branding dinâmico

### Mecanismo
Novo hook `useBranding()` em [client/src/contexts/TenantContext.tsx](../client/src/contexts/TenantContext.tsx), construído sobre o `useTenant()` já existente:

```ts
export function useBranding() {
  const { tenant } = useTenant();
  return {
    name: tenant?.name || DEFAULT_APP_NAME,
    logoUrl: tenant?.logoUrl || DEFAULT_LOGO_URL,
  };
}
```

`DEFAULT_LOGO_URL`/`DEFAULT_APP_NAME` centralizam o fallback "Kafka Rank" que antes estava duplicado em cada arquivo. `document.title` também passou a ser atualizado dinamicamente com o nome da loja.

### Onde foi aplicado
Logo e nome da loja substituindo hardcode em: `AccessGate.tsx`, `SellerLogin.tsx` (já usava padrão parecido, mantido), `CrmAdminLogin.tsx`, `Home.tsx`, `TVMode.tsx`, `GerentePanel.tsx`, `RaceTrack.tsx`, `RankingFeirao.tsx`, `Estoque.tsx`, `PosVenda.tsx`, `MeusAgendamentos.tsx`, `Financeiro.tsx`.

Textos de WhatsApp **enviados de verdade a clientes** (não só exemplos de template) corrigidos em `CrmPipeline.tsx`, `CrmLeadDetail.tsx`, `CrmCommandCenter.tsx` ("Aqui é da Kafka Multimarcas" → nome da loja) e no compartilhamento de veículo em `Estoque.tsx`.

Rodapé de PDFs exportados (`pdfExport.ts`, usado por `MeusAgendamentos.tsx` e `AdminAgendamentos.tsx`) e o relatório financeiro impresso (`Financeiro.tsx`) também passaram a usar o nome da loja.

`SuperAdmin.tsx` **não foi alterado de propósito** — é o portal do operador da plataforma (gerencia todas as lojas), não uma tela de uma loja específica; "Kafka Rank" ali é o nome da plataforma, não de um tenant.

### Residual conhecido (atualizado na Fase K)
- `CrmChat.tsx` e `Aniversariantes.tsx` — **corrigidos na Fase K**, agora usam `useBranding()`.
- `CrmAdminDashboard.tsx` — 3 templates de campanha pré-cadastrados (Feirão, Retorno, Promoção) ainda mencionam "Kafka Multimarcas"; não corrigidos por uma peculiaridade de encoding do arquivo que impediu o match exato da ferramenta de edição nesta sessão (ver Fase K). São exemplos editáveis pelo admin antes de disparar, não texto fixo enviado sem revisão — baixo risco.

---

## Arquivos tocados nesta rodada

**Backend**
- `server/routers/tenantAuthRouter.ts` (novo) — login unificado
- `server/routers.ts` — registro do `tenantAuth`, `tenantId`/`tenantSlug` em `sellers.login`/`managers.login`
- `server/routers/crmRouter.ts` — `tenantId`/`tenantSlug` em `adminAuth.login`/`autoLogin`, fallback removido, `notifySellerViaWhatsApp` corrigido
- `server/_core/context.ts` — validação de coerência tenant×sessão nos 3 tipos de token
- `server/tenantMiddleware.ts` — `assertTenantMatch()`
- `server/zapi-service.ts` — fallback automático de tenant via ALS
- `server/crmDb.ts` — `getIntegrationByTokenGlobal()`
- `server/webhooks.ts` — todos os endpoints tenantizados

**Frontend**
- `client/src/pages/SellerLogin.tsx` — tela de login unificada
- `client/src/App.tsx` — ~26 rotas `/t/:slug/admin/*` novas
- `client/src/components/AccessGate.tsx` — bypass ampliado + branding
- `client/src/contexts/TenantContext.tsx` — `useBranding()`, `document.title` dinâmico
- `client/src/lib/pdfExport.ts` — `brandName` no rodapé
- 12 páginas com branding dinâmico aplicado (ver seção acima)

**Backend — Fases F a K**
- `server/db.ts` — bug do `tenantId: 1` hardcoded no bônus de carro; enforcement de `maxSellers`
- `server/crmDb.ts` — `createAdmin` agora grava `tenantId`; enforcement de `maxAdmins`
- `server/tenantService.ts` — `getTenantLimits()` (módulos + limites de plano, cache 60s)
- `server/_core/trpc.ts` — `moduleRequiredProcedure()` / `protectedModuleRequiredProcedure()`
- `server/routers/mktRouter.ts` — gate de módulo aplicado como referência
- `server/_core/secretCrypto.ts` (novo) — AES-256-GCM para segredos em repouso
- `server/routers/superAdminRouter.ts` — criptografia Z-API, `getTenantHealth`, provisionamento de config de IA na criação do tenant, invalidação de cache
- `server/_core/index.ts` — rate limit por loja+IP, paths de login corrigidos (bug pré-existente)
- `server/webhooks.ts`, `server/ai-attendant.ts`, `server/inactive-dispatch.ts`, `server/routers/crmRouter.ts` — `crm_ai_global_config`/`crm_ai_config_log`/`crm_ai_inactive_dispatch_log` tenant-scoped
- `drizzle/schema.ts` + migrations `0064_ai_config_tenant_scope.sql`, `0065_username_tenant_unique.sql`, `0066_add_tenant_indexes.sql` (Fase L — índice de `tenantId` em 62 tabelas)
- `server/storage.ts` (Fase L) — `storagePut` prefixa toda chave com `t/<tenantId>/`

**Frontend — Fase K**
- `client/src/pages/crm/CrmChat.tsx`, `client/src/pages/admin/Aniversariantes.tsx` — branding dinâmico

**Testes novos**
- `server/tenant-auth-unified.test.ts` (12 testes) — login unificado, 3 papéis, redirects, primeiro acesso
- `server/tenant-coherence.test.ts` (9 testes) — `assertTenantMatch` + sessão cruzada nos 3 tipos de token
- `server/zapi-tenant-fallback.test.ts` (3 testes) — fallback automático de credenciais Z-API
- `server/webhooks-tenant.test.ts` (8 testes) — resolução de tenant por token/slug nos webhooks, isolamento entre tokens
- `server/module-gating.test.ts` (5 testes) — enforcement de `enabledModules`
- `server/tenant-limits.test.ts` (4 testes, integração real com o banco) — enforcement de `maxSellers`/`maxAdmins`
- `server/secret-crypto.test.ts` (5 testes) — roundtrip, compatibilidade com texto plano legado, detecção de adulteração
- `server/tenant-health.test.ts` (2 testes) — endpoint `getTenantHealth`
- `server/crm.test.ts` — ganhou `afterAll` para limpar o admin de teste (corrige acúmulo de dados órfãos, ver seção abaixo)
- `server/storage-tenant.test.ts` (3 testes, Fase L) — prova que duas lojas com a mesma chave relativa geram chaves finais diferentes
- `server/seller-results-tenant.test.ts` — bug de hoisting do `vi.mock` corrigido (`vi.hoisted`), arquivo pré-existente não criado nesta sessão

**Suíte completa**: 743 testes passando (era 697 no início desta sessão), zero regressão real — as 19 falhas restantes são pré-existentes e não relacionadas (confirmado rodando o baseline via `git stash` antes de qualquer mudança).

### Achado durante a validação final: dívida técnica exposta pelo enforcement da Fase I

Ao rodar a suíte completa pela última vez, `server/crm.test.ts > CRM Admin Auth` passou a falhar com `Limite de administradores do plano atingido`. Causa raiz: esse teste cria um admin real no banco (`crmDb.createAdmin`) em todo `beforeAll` **sem limpar depois** — ao longo desta sessão (várias rodadas da suíte completa) isso acumulou 14 admins de teste órfãos no tenant 1, que já estava com `maxAdmins = 2` (default de schema, nunca ajustado). O enforcement novo da Fase I só expôs uma falha de higiene de teste pré-existente. Corrigido: `crm.test.ts` ganhou `afterAll` limpando o admin de teste, e os 14 registros órfãos foram removidos do banco. Fica de lição para produção: **antes de habilitar o enforcement de `maxAdmins`/`maxSellers` em staging/produção, contar quantos admins/vendedores ativos cada tenant já tem e ajustar o limite configurado se necessário** — caso contrário uma loja com uso real acima do default (schema default é `maxAdmins: 2`) fica bloqueada de criar novos administradores até o Super Admin aumentar o limite dela.

---

## Como testar localmente

### 1. Preparar o ambiente

```bash
pnpm install
pnpm run db:push          # aplica migrations pendentes no banco local
pnpm run seed:demo-tenant   # cria/atualiza o tenant "loja-demo" (id 2)
pnpm run seed:second-tenant # cria/atualiza o tenant "auto-veloz" (id independente), para testar isolamento cross-tenant
```

### 2. Rodar a suíte automatizada

```bash
pnpm run check                        # tsc --noEmit — deve ficar limpo, zero erros
pnpm exec vitest run --fileParallelism=false   # suíte completa sequencial (evita falso-positivo de timeout por contenção de pool MySQL quando os arquivos rodam em paralelo)
```

Resultado esperado: **7 falhas conhecidas e documentadas** (seção Fase M acima) — 4 de `.env` sem credencial real de Z-API, 1 de tabela do Atendente IA (`crm_ai_global_config`) ainda sem migration, 2 de seed de pipeline stage faltando para `pre_vendas`/`consignacao` no tenant 1. Qualquer falha fora dessas 7 é regressão nova e deve ser investigada antes de prosseguir.

### 3. Subir o servidor

```bash
pnpm run dev
```

Sobe em `http://localhost:3000` (ou a próxima porta livre, se 3000 estiver ocupada — o script avisa no log qual porta usou).

Checar o healthcheck primeiro:
```bash
curl http://localhost:3000/health
# esperado: {"status":"ok","db":"connected"}
```

### 4. Credenciais dos dois tenants de teste

**`loja-demo`** (id 2) — `http://localhost:3000/t/loja-demo/login`

| Papel | Username | Senha |
|---|---|---|
| Admin CRM | `admin-lojademo` | `senha123` |
| Manager (tabela managers) | `gerente-lojademo` | `senha123` |
| Vendedor | `vendedor-lojademo` | `senha123` |
| Vendedor (role gerente) | `gerente-seller-lojademo` | `senha123` |
| Financeiro | `financeiro-lojademo` | `senha123` |
| Pós-venda | `posvenda-lojademo` | `senha123` |
| Super Admin (global, não é do tenant) | `superadmin` | `senha123` |

**`auto-veloz`** (id independente, gerado no seed) — `http://localhost:3000/t/auto-veloz/login`

| Papel | Username | Senha |
|---|---|---|
| Admin CRM | `admin-autoveloz` | `senha123` |
| Manager (tabela managers) | `gerente-autoveloz` | `senha123` |
| Vendedor | `vendedor-autoveloz` | `senha123` |
| Vendedor (role gerente) | `gerente-seller-autoveloz` | `senha123` |

Login único: qualquer uma das credenciais de uma loja autentica na URL `/t/<slug>/login` dessa loja e redireciona para a área certa automaticamente conforme o papel.

### 5. Roteiro de teste manual — golden path

1. Logar como `admin-lojademo` em `/t/loja-demo/login` → confirmar que cai no CRM admin da loja-demo, com nome/cor/logo da loja-demo no header.
2. Em outra aba (ou anônima), logar como `admin-autoveloz` em `/t/auto-veloz/login` → confirmar branding diferente (cor azul da auto-veloz) e que os dados (leads, pipeline, vendedores) são completamente distintos dos da loja-demo.
3. Criar um lead/tarefa de marketing/venda em cada loja e confirmar que **não aparece** na outra loja ao atualizar a listagem.
4. Copiar o token/cookie de sessão de um admin de uma loja e tentar usá-lo manualmente contra a URL `/t/<outra-loja>/...` (via DevTools ou trocando o cookie) → deve ser rejeitado (`TENANT_MISMATCH` no log do servidor).
5. Testar login de vendedor, gerente e financeiro de cada loja, confirmando que o menu/permissões batem com o papel retornado no login.

### 6. Roteiro de teste manual — isolamento cross-tenant (o que realmente importa validar antes do lançamento)

- Pipeline de CRM: comparar `GET /api/trpc/crmPipeline.getStages` com header `x-tenant-slug: loja-demo` vs `x-tenant-slug: auto-veloz` — devem retornar `tenantId` e estágios completamente diferentes (já validado ao vivo nesta sessão).
- Upload de foto/documento em cada loja → confirmar no bucket/proxy que a chave gerada começa com `t/<tenantId>/...` diferente para cada loja.
- Config do Atendente IA (`crm_ai_global_config`) alterada em uma loja não deve afetar a outra.
- Criar vendedores em cada loja até o limite (`maxSellers` do plano) → confirmar que o enforcement bloqueia no limite certo, por loja.
- Desabilitar um módulo (ex.: `marketing`) em uma loja via Super Admin → confirmar que as rotas desse módulo passam a responder `FORBIDDEN` só naquela loja, a outra continua normal.

### Migrations pendentes de deploy

Antes de subir para staging/produção, rodar `pnpm run db:push` (ou `drizzle-kit migrate`) lá. **Antes disso**, em produção, rodar a auditoria de duplicatas de username (query no início da seção da Fase H) — se houver duplicata de username dentro do mesmo tenant, a migration `0065` vai falhar ao criar a constraint e precisa ser resolvida manualmente primeiro.

---

## Fase F — Bug crítico: bônus de carro sempre gravava no tenant 1

[server/db.ts](../server/db.ts) — `autoLaunchBonus` montava o `InsertSellerBonus` com `tenantId: 1` hardcoded, não o tenant real da venda/vendedor. Qualquer loja que não fosse a padrão teria seus bônus de carro silenciosamente gravados na loja 1. Trocado por `getCurrentTenantId()`.

---

## Fase G — Isolamento da configuração do Atendente IA por tenant (achado mais crítico da auditoria)

### O problema encontrado
`crm_ai_global_config` era uma tabela de **linha única compartilhada por todas as lojas** (`WHERE id = 1` em ~20 pontos espalhados por `webhooks.ts`, `ai-attendant.ts`, `inactive-dispatch.ts` e `crmRouter.ts`). Na prática: se a loja B ligasse "modo feirão" no atendente IA, isso mudava o comportamento do atendente de **todas as outras lojas**. Havia ainda um bug mais grave: `UPDATE crm_ai_settings SET enabled = X` ao ligar/desligar o toggle global, **sem `WHERE`** — desligar a IA em uma loja desligava para os leads de todas as lojas do sistema.

### A correção
- **Migration** [drizzle/0064_ai_config_tenant_scope.sql](../drizzle/0064_ai_config_tenant_scope.sql): adiciona `tenantId` em `crm_ai_global_config`, `crm_ai_config_log` e `crm_ai_inactive_dispatch_log`. Como essas tabelas nunca foram rastreadas pelo Drizzle (só acesso via SQL raw) e não existem neste banco de dev, a migration usa `ALTER TABLE` condicional (`IF EXISTS`/`IF NOT EXISTS` via prepared statement) — idempotente e segura tanto aqui (no-op) quanto em staging/produção (aplica de verdade).
- Todos os `WHERE id = 1` trocados por `WHERE tenantId = ${getCurrentTenantId()}` nos 4 arquivos.
- O `UPDATE crm_ai_settings` sem filtro corrigido para `INNER JOIN crm_leads ... WHERE cl.tenantId = X`.
- `inactive-dispatch.ts` (disparo de reativação de leads inativos) só roda via `triggerInactiveDispatch` (mutation manual, não cron) — já herda o tenant correto do contexto da request, então bastou adicionar os filtros.
- `superAdminRouter.createTenant` agora provisiona a linha de config (`INSERT INTO crm_ai_global_config (tenantId) VALUES (...)`, best-effort) para que a loja nova não dependa de defaults implícitos.

### Residual conhecido
Parte da lógica de IA ainda usa SQL raw sobre `crm_leads`/`crm_messages` filtrado só por `leadId` (não por `tenantId` diretamente) — seguro *transitivamente* porque o `leadId` já vem de uma busca tenant-scoped, mas sem defesa em profundidade caso isso mude no futuro. Não corrigido nesta rodada por ser uma auditoria muito mais ampla (dezenas de queries em `ai-attendant.ts`).

---

## Fase H — Unicidade de username por tenant (schema)

### O problema
`admins.username` e `managers.username` tinham `UNIQUE` **global** no banco (não composto com `tenantId`). Duas lojas diferentes não conseguiam ter, cada uma, um admin ou gerente com o mesmo username (ex: ambas com "admin"). `sellers.username` não tinha nenhuma constraint de unicidade.

### A correção
Migration [drizzle/0065_username_tenant_unique.sql](../drizzle/0065_username_tenant_unique.sql), gerada via `drizzle-kit generate` a partir de mudanças em `drizzle/schema.ts` (novo `uniqueIndex(tenantId, username)` nas 3 tabelas, substituindo o `.unique()` global de `admins`/`managers`). Antes de aplicar, auditamos o banco (`SELECT tenantId, username, COUNT(*) ... HAVING COUNT(*) > 1`) para confirmar zero duplicatas dentro do mesmo tenant — pré-requisito de segurança para esse tipo de migration. **Essa auditoria precisa ser repetida em staging/produção antes de aplicar a migration lá.**

Verificado com um script de integração real contra o banco: dois tenants diferentes agora podem ter o mesmo username; duplicata dentro do mesmo tenant continua sendo rejeitada (`ER_DUP_ENTRY`).

Bônus encontrado no caminho: `crmDb.createAdmin` **nunca setava `tenantId`** ao inserir (dependia do `DEFAULT 1` da coluna) — todo admin criado via "adicionar administrador" no CRM ia parar silenciosamente no tenant 1, mesmo quando criado por um admin de outra loja. Corrigido junto.

---

## Fase I — Enforcement real de módulos e limites de plano

### O problema
`enabledModules` (JSON no tenant) e `maxSellers`/`maxAdmins` existiam no schema mas eram **decorativos** — nada no backend validava. Desabilitar um módulo no Super Admin só escondia o menu no frontend; o limite de vendedores/admins do plano nunca era checado antes de criar mais um.

### A correção
- **`getTenantLimits(tenantId)`** em [server/tenantService.ts](../server/tenantService.ts) — lê e faz parse de `enabledModules`/`maxSellers`/`maxAdmins`, cache de 60s.
- **`moduleRequiredProcedure(moduleName)` / `protectedModuleRequiredProcedure(moduleName)`** em [server/_core/trpc.ts](../server/_core/trpc.ts) — bases de procedure que rejeitam com `FORBIDDEN` se o módulo não estiver em `enabledModules` do tenant. Tenants sem `enabledModules` configurado (legado) passam sempre — não quebra dados antigos.
- Aplicado como referência em [server/routers/mktRouter.ts](../server/routers/mktRouter.ts) (módulo "marketing") — troca de import de `publicProcedure`/`protectedProcedure` por uma constante local com o mesmo nome, shadowing o resto do arquivo sem precisar editar cada procedure individualmente.
- **Enforcement de limite** em `db.createSeller`, `crmDb.createAdmin` e `db.createManager` — conta ativos do tenant e rejeita com mensagem clara se `>= maxSellers`/`maxAdmins`.

### Residual conhecido
O gate de módulo só foi aplicado ao router de Marketing como prova de conceito. Estender para CRM/Financeiro/Pós-venda/Estoque segue o mesmo padrão (trivial por arquivo), mas não foi feito em massa nesta rodada porque nenhum tenant hoje tem módulos restritos (ambos os tenants existentes têm todos os módulos habilitados) — o risco de quebrar produção ao aplicar amplamente sem poder testar contra um tenant realmente restrito era maior que o benefício imediato.

---

## Fase J — Criptografia de credenciais Z-API + rate limit por tenant

- **[server/_core/secretCrypto.ts](../server/_core/secretCrypto.ts)** — AES-256-GCM (chave derivada do `JWT_SECRET` já existente, sem exigir nova variável de ambiente). Formato `v1:iv:authTag:ciphertext`; valores legados em texto plano (sem o prefixo `v1:`) continuam sendo lidos normalmente — compatibilidade retroativa garantida.
- `zapiToken`/`zapiClientToken` criptografados ao salvar em `superAdminRouter.updateTenant`, decriptados ao ler em `zapi-service.getTenantCredentials`.
- `getTenant`/`dashboard` do Super Admin não retornam mais o ciphertext ao frontend — só um booleano `zapiConfigured`.
- **Bug pré-existente corrigido no caminho**: os paths do `loginLimiter` em `server/_core/index.ts` não batiam com os nomes reais dos procedures tRPC (`sellerSession.login` em vez de `sellers.login`, `crmAdmin.login` em vez de `adminAuth.login`) — a proteção contra força bruta **nunca esteve realmente ativa** nos logins de vendedor/admin. Corrigido, e adicionado `tenantAuth.login` (que não existia quando os paths foram escritos).
- **Rate limit agora é por loja+IP** (`tenantAwareKey`, reaproveitando `extractTenantSlugFromRequest`), não só por IP — evita que uma loja atrás de um proxy/NAT compartilhado consuma a cota de outra.

---

## Fase K — Itens residuais

- **Branding**: `CrmChat.tsx` (cabeçalho de impressão) e `Aniversariantes.tsx` (placeholder do template) migrados para `useBranding()`. Templates de campanha em `CrmAdminDashboard.tsx` não foram tocados por uma peculiaridade de encoding no arquivo que impediu o match exato da ferramenta de edição — baixo risco por serem exemplos editáveis pelo admin antes de disparar.
- **`AccessGate.tsx`/`DashboardLayout.tsx`**: analisado com cuidado e **não é o risco que parecia**. Como `isTenantBypassRoute` já libera todas as rotas `/t/:slug/*` do gate, o `AccessGate` só é renderizado em rotas *sem* slug — ou seja, ele só opera no tenant padrão (1) por construção, nunca em contexto de outra loja. É uma inconsistência de UX (duas telas de login diferentes), não um problema de isolamento de dados. Reclassificado de "risco" para "unificação de UX pendente".
- **Super Admin — `getTenantHealth`**: novo endpoint consolidando status Z-API (`zapi.getStatus`), contagem de vendedores/admins vs. limite do plano, integrações ativas e timestamp da última mensagem de WhatsApp da loja.

---

## Fase L — Auditoria de prontidão para lançamento: uploads S3 e índices de banco

Auditoria focada em "o que quebra ou vaza dado com múltiplas lojas pagantes reais" (não só correção multi-tenant). Achou o problema mais grave de toda a iniciativa e um risco de escala real.

### Achado crítico: uploads S3 sem isolamento por tenant
`server/storage.ts` grava pela chave recebida sem normalização de tenant. Nenhum dos ~19 pontos de chamada de `storagePut` incluía `tenantId` no path — inclusive `sale-docs/${sellerId}/cnh-...` e `.../comprovante-...` (**CNH e comprovante de residência de clientes**), fotos de veículo e documentos financeiros. Como `sellerId`/`vehicleId` são PKs sequenciais e globais, as chaves eram previsíveis o suficiente para alguém montar a chave de um arquivo de outra loja.

**Descoberta importante durante a investigação**: `storageGet` (a função que resolveria uma chave para URL sob demanda) nunca é chamada em lugar nenhum do código — o app sempre usa a URL retornada pelo próprio `storagePut` no momento do upload e guarda essa URL numa coluna da tabela (já filtrada por tenant nas leituras). Ou seja, a superfície de risco real não são 19 pontos de leitura, é a previsibilidade da **chave em si**, que pode ter sido usada para montar a URL final no storage.

**Correção**: em vez de editar os 19 pontos de chamada, corrigido na origem — `storagePut` agora prefixa toda chave com `t/<tenantId>/` usando `getCurrentTenantId()` internamente (mesmo padrão usado no fallback do Z-API). Só afeta uploads novos; arquivos já existentes continuam acessíveis pela URL já salva no banco — nenhuma migração de dado necessária. Verificado com [server/storage-tenant.test.ts](../server/storage-tenant.test.ts): duas lojas fazendo upload com a mesma chave relativa geram chaves finais diferentes, sem colisão.

### Índices em `tenantId` (performance/escala)
Nenhuma tabela (fora as 3 com unique index composto da Fase H) tinha índice em `tenantId` — toda query filtrada por tenant em `crm_leads`, `crm_messages`, `sales`, `notifications` etc. era table scan. Adicionado índice simples em `tenantId` nas 62 tabelas restantes do schema que possuem a coluna, via script de transformação (revisado manualmente e validado por `tsc --noEmit` + inspeção pontual) — migration [drizzle/0066_add_tenant_indexes.sql](../drizzle/0066_add_tenant_indexes.sql), 61 `CREATE INDEX` puros, sem nenhum `ALTER`/`DROP` inesperado. Aplicada e verificada no banco local (62 índices confirmados via `information_schema`).

### Residual desta fase
Os demais achados da auditoria de lançamento (sem correção nesta rodada, menor severidade):
- Sem healthcheck HTTP dedicado (`/health`) — só existe a query tRPC `system.health`, que exige cliente tRPC via POST; pode travar deploy com zero-downtime em algumas infraestruturas.
- Sem error tracking (Sentry ou equivalente); os ~125 `console.error` espalhados não incluem `tenantId` para correlação em produção multi-tenant.
- Exclusão de tenant é só soft-delete (`status = "cancelled"`), sem expurgo/anonimização — não atende pedido de exclusão de dado (LGPD) hoje.
- Onboarding de loja nova não envia credencial por e-mail automaticamente (existe Resend configurado, mas só usado para código OTP) — comunicação da senha ao cliente novo é manual.
- Cookie de sessão tem `path: "/"` fixo, compartilhado entre todas as lojas do mesmo domínio — isolamento depende inteiramente da validação de coerência sessão×URL (Fase 2), não do escopo do cookie. Tradeoff arquitetural conhecido do modelo `/t/:slug` (path) em vez de subdomínio.

---

## Fase M — Rodada de testes para lançamento: bug crítico no `protectedProcedure` e preparação da suíte

Trabalho concorrente nesta mesma sessão trocou o fallback de tenant do middleware tRPC (`ctx.tenantId || 1` → `ctx.tenantId > 0 ? ctx.tenantId : 0`, em [server/_core/trpc.ts](../server/_core/trpc.ts)) e o fallback de "tenant padrão" em `resolveTenantId`/`resolveTenantContext` (de `1` fixo para `getDefaultTenantId()` dinâmico, em [server/tenantService.ts](../server/tenantService.ts) e [server/tenantMiddleware.ts](../server/tenantMiddleware.ts)). Individualmente cada mudança é uma melhoria de segurança (falhar fechado em vez de vazar para o tenant 1 por acidente). Mas a suíte de testes pulou de 19 para 35 falhas depois dessas mudanças — investigação encontrou o motivo.

### Achado crítico: `protectedProcedure`/`adminProcedure`/`managerOrAdminProcedure` nunca passavam pelo `tenantMiddleware`

Em [server/_core/trpc.ts](../server/_core/trpc.ts), `publicProcedure` é a única base que roda `tenantMiddleware` (o `t.middleware` que popula o `AsyncLocalStorage` lido por `getCurrentTenantId()`). Só que `protectedProcedure`, `adminProcedure` e `managerOrAdminProcedure` eram construídos direto sobre `t.procedure`, **sem** passar por `publicProcedure` primeiro. Ou seja: toda rota autenticada (a imensa maioria das mutations do app — criar vendedor, aprovar venda, criar lead, tarefa de marketing, ficha F&I, etc.) rodava **fora** do contexto de tenant do `AsyncLocalStorage`.

Antes da mudança concorrente de fallback, isso era mascarado: `getCurrentTenantId()` sem contexto ALS cai no próprio fallback hardcoded de `1` (em [server/tenantDb.ts](../server/tenantDb.ts)), que por acaso é o mesmo valor que o fallback antigo do middleware (`|| 1`) — dois bugs se cancelando. Depois da mudança concorrente, o middleware passou a usar `0` como sentinela de "sem tenant resolvido", enquanto `getCurrentTenantId()` sem contexto ALS continuou caindo em `1` — os dois fallbacks divergiram e o bug ficou visível: **toda mutation feita por um usuário autenticado (admin/gerente/vendedor logado) ignorava o tenant real da sessão e escrevia com o valor do fallback do AsyncLocalStorage vazio**, não o tenant do usuário.

Comprovado com `console.log` temporário: `mktStrategies.create` (via `protectedModuleRequiredProcedure`, admin autenticado) gravava com `tenantId: 1` mesmo com o admin pertencendo a outro tenant, enquanto `mktTasks.list` (via `moduleRequiredProcedure`, rota pública) lia corretamente com `tenantId: 0` do mesmo contexto de teste — a mesma requisição "family" resolvendo tenant diferente dependendo de só ser protegida por autenticação ou não.

**Correção**: `protectedProcedure`, `adminProcedure` e `managerOrAdminProcedure` agora são construídos sobre `publicProcedure` (que já inclui `tenantMiddleware`) em vez de `t.procedure` cru:

```ts
export const protectedProcedure = publicProcedure.use(requireUser);
export const adminProcedure = publicProcedure.use(t.middleware(...));
export const managerOrAdminProcedure = publicProcedure.use(t.middleware(...));
```

Confirmado que não sobrou nenhum outro procedure raiz construído direto sobre `t.procedure` fora de `publicProcedure` (`grep` em todo `server/`). Validado ao vivo com dois tenants reais rodando lado a lado (seção "Como testar localmente" abaixo): login, leitura e escrita isoladas corretamente por tenant depois da correção.

### Drift de mocks/testes exposto pela mesma investigação
- [server/tenant-security.test.ts](../server/tenant-security.test.ts) checava a string literal `resolveTenantId` dentro de `context.ts` — ficou obsoleto quando o trabalho concorrente moveu essa chamada para dentro de `resolveTenantContext` (em `tenantMiddleware.ts`). Ajustado para checar `resolveTenantContext`.
- [server/routers.test.ts](../server/routers.test.ts) mockava `./db` sem os exports `getDb`, `checkDuplicateDispatch`, `checkDuplicateFei`, `getSaleDocumentBySaleId`, `listBracketMatches`, `autoLaunchBonus` — funções adicionadas por trabalho concorrente que os testes de dispatch/F&I/action-plan/consignment passaram a exercitar. Mocks completados.
- [server/crm.test.ts](../server/crm.test.ts) criava contexto de teste sem `tenantId` explícito e criava o admin de teste fora de qualquer contexto de tenant (`beforeAll` chamando `crmDb.createAdmin` direto, sem `withTenantAsync`) — dependia do fallback implícito de `1` para "coincidir" com o tenant onde o admin acabava sendo criado. Corrigido: contexto de teste agora fixa `tenantId: 1` (o tenant legado/original dos dados de seed antigos) e `beforeAll`/`afterAll` usam `withTenantAsync(1, ...)` explicitamente.
- [server/ai-attendant.test.ts](../server/ai-attendant.test.ts) e [server/crm-leads-filter-push.test.ts](../server/crm-leads-filter-push.test.ts) tinham paths absolutos do ambiente cloud original (`/home/ubuntu/kafka_sales_competition/...`), quebrados neste ambiente Windows. Trocados por paths relativos (`path.join(__dirname, ...)`).
- Suíte tem contenção real de pool de conexão MySQL quando os ~70 arquivos de teste rodam em paralelo (padrão do Vitest) — vários testes davam timeout de 5s só por fila de conexão, não por bug. Rodar com `--fileParallelism=false` (ou aumentar `testTimeout`) elimina esse ruído; ver seção "Como testar localmente".

### Resultado
Suíte foi de 35 falhas (pós-regressão) → **7 falhas remanescentes** (chega a 8-9 se rodada em paralelo com a task de migration do Atendente IA por causa de contenção real de conexão no MySQL local — não é bug), todas com causa raiz identificada e não bloqueante para lançamento:
- 4× [server/zapi.test.ts](../server/zapi.test.ts): `.env` local sem credenciais reais de Z-API (`ZAPI_INSTANCE_ID`/`ZAPI_TOKEN`/`ZAPI_CLIENT_TOKEN` vazios) — esperado neste ambiente, não é bug de código.
- 1× [server/ai-attendant.test.ts](../server/ai-attendant.test.ts): tabela `crm_ai_global_config` (colunas do atendente) ainda não existe no banco local. As tabelas `credit_applications`/`ai_appointments` já foram criadas (migration `0067_groovy_next_avengers.sql`, gerada pela task separada disparada nesta sessão) — falta só essa última parte, que a mesma task está resolvendo.
- 2× [server/crm.test.ts](../server/crm.test.ts): pipeline stages dos departamentos `pre_vendas`/`consignacao` não têm dado de seed no tenant 1 local (só `vendas` tem, historicamente). Gap de seed local, não de código.

### Healthcheck HTTP dedicado
Adicionado `GET /health` em [server/_core/index.ts](../server/_core/index.ts), montado antes de qualquer rate limit/helmet, fazendo um `SELECT 1` real no banco. Retorna `200 {"status":"ok","db":"connected"}` ou `503 {"status":"error", ...}` se o banco estiver inacessível — resolve o item que antes só existia como query tRPC (`system.health`), inadequada para healthcheck de load balancer/infra de deploy porque exige cliente tRPC.

### Segundo tenant de teste (`auto-veloz`)
Criado [scripts/seed-second-tenant.mjs](../scripts/seed-second-tenant.mjs) (`pnpm run seed:second-tenant`) — tenant independente com seus próprios admin/gerente/vendedores/pipeline stages, para validar isolamento cross-tenant lado a lado com o `loja-demo` sem depender de dado fabricado ad-hoc. Usado para validar ao vivo (via `curl` com header `x-tenant-slug`) que `crmPipeline.getStages` retorna dados completamente distintos e corretamente escopados para os dois tenants simultaneamente, e que o JWT emitido no login de cada tenant carrega o `tenantId` certo.

---

## O que ainda falta para o multi-tenant estar 100% completo

Em ordem de impacto:

1. **Auditoria completa de SQL raw no fluxo de IA** (`ai-attendant.ts` tem dezenas de queries filtradas só por `leadId`) — hoje seguro transitivamente, mas sem defesa em profundidade.
2. **Estender `moduleRequiredProcedure` para os demais módulos** (CRM, Financeiro, Pós-venda, Estoque, IAM) — hoje só aplicado a Marketing como referência.
3. **Rodar as migrations 0064–0071 em staging/produção** — só validadas contra o banco de desenvolvimento local; a Fase H (username) exige auditoria prévia de duplicatas, a Fase G (`crm_ai_global_config`) precisa ser exercitada contra o schema real de produção. A 0070 (Fase U) já inclui o backfill de config de IA pra lojas existentes, mas só roda de fato quando a migration for aplicada lá.
4. **Branding dos templates de campanha em `CrmAdminDashboard.tsx`** — bloqueado por uma questão de encoding do arquivo nesta sessão, precisa de outra abordagem de edição.
5. ~~Tabelas do Atendente IA sem migration~~ — **resolvido na Fase U**: `crm_ai_global_config`, `crm_ai_config_log` e `crm_ai_inactive_dispatch_log` criadas (migration 0070), com backfill pras lojas que já existiam.
6. **Error tracking com correlação de tenantId, expurgo de dado no soft-delete de tenant, e-mail automático de onboarding** — achados da Fase L, importantes para operar em produção com múltiplos clientes mas não bloqueantes para um piloto controlado.
7. **Testes de segurança cross-tenant mais amplos** — hoje cobertos os pontos críticos (auth, webhooks, Z-API, config de IA, limites de plano, uploads, reset de senha); não há suite sistemática de "ataque" cobrindo todo o CRM/financeiro.
8. **Verificação visual do cadastro self-service, checkout/billing e "esqueci minha senha" no navegador** — tudo implementado e testado via `curl`/testes automatizados, mas nunca aberto num navegador real nesta sessão (sem acesso a ferramenta de preview pro projeto). Texto de "Quem Somos" e páginas de Termos/Privacidade são placeholder, precisam de revisão humana antes de produção.
9. **Validar a integração com ASAAS contra o sandbox real** — implementada com base na documentação oficial pesquisada (Fase S), mas nunca testada contra a API de verdade (sem `ASAAS_API_KEY` configurada neste ambiente). Preencher as credenciais no `.env`, cadastrar o webhook no painel do ASAAS e testar o fluxo completo de assinatura antes de produção.
10. **Sem revogação de sessão** — JWT de admin/gerente/vendedor dura 30 dias sem blacklist; redefinir a senha (Fase U) não invalida um token já emitido antes da troca.
11. **E-mail de "esqueci minha senha" nunca testado com o Resend de verdade** (`RESEND_API_KEY` não configurada neste ambiente — o link só é logado no console do servidor).

> Nota: `AccessGate.tsx`/`CrmAdminLogin.tsx`/`Home.tsx` já mostraram sinais de trabalho concorrente nesta mesma sessão (helpers `buildTenantPath`/`getTenantLoginPath` em `client/src/lib/tenant.ts`) endereçando a unificação de UX de login mencionada em rodadas anteriores deste documento — não verificado/atribuído nesta entrada porque não foi trabalho desta fase.

---

## Fase N — Bug crítico: login de vendedor/gerente "funcionava" mas a sessão nunca ficava logada

Reportado pelo usuário testando o login único em `/t/loja-demo/login`: `admin-lojademo` funcionava normalmente, mas `vendedor-lojademo` caía em "Você precisa fazer login para acessar esta área" logo após logar com sucesso, e `gerente-seller-lojademo` caía em "Acesso Restrito — Esta área é exclusiva para gerentes".

### Causa raiz
[server/_core/cookies.ts](../server/_core/cookies.ts) — `getSessionCookieOptions` sempre retornava `sameSite: "none"`, mas só marcava `secure: true` quando a request já era HTTPS. Em desenvolvimento local (`http://localhost:3000`), isso gera um cookie `Set-Cookie: ...; SameSite=None` **sem** `Secure` — combinação inválida pela especificação, que todo navegador moderno (Chrome, Firefox, Safari) descarta silenciosamente. O login em si funcionava (a resposta HTTP vinha 200 com os dados certos), mas o cookie `seller_session`/`manager_session` nunca era de fato armazenado pelo navegador, então a primeira requisição seguinte já chegava sem sessão.

Login de admin não foi afetado porque usa um token JWT devolvido no corpo da resposta e guardado em `localStorage`, enviado depois via header `Authorization: Bearer` — não depende de cookie.

Confirmado com `curl` simulando o fluxo completo (login → captura do cookie → chamada autenticada) antes e depois da correção; o `Set-Cookie` mudou de `SameSite=None` (sem `Secure`, inválido em HTTP) para `SameSite=Lax` (válido em HTTP, adequado porque o app é same-origin — multi-tenant por path `/t/:slug`, não por subdomínio, então não existe cenário cross-site real aqui).

### Correção
`sameSite` agora acompanha `secure`: `"none"` só quando a request é HTTPS (mantém o comportamento permissivo de produção), `"lax"` quando é HTTP puro (funciona em dev local sem exigir `Secure`). Afeta todos os cookies de sessão do app (`seller_session`, `manager_session`, cookie de OAuth), já que todos passam por essa mesma função.

---

## Fase O — Personalização visual da loja: logo e cores realmente aplicadas + upload de logo

O card "Dados da Loja" no CRM admin (`/t/:slug/crm/admin` → Ajustes) já existia (`crmPerformance.getTenantSettings`/`updateTenantSettings`, `adminProcedure` — self-service pela própria loja, não pelo Super Admin), incluindo campos de cor. Faltavam duas coisas: **as cores salvas não tinham nenhum efeito visual** (eram gravadas no banco e nunca lidas de volta pela UI) e **não existia upload de logo** (só um campo de URL, sem forma de gerar essa URL a partir de um arquivo).

### Cores não tinham efeito
[client/src/contexts/TenantContext.tsx](../client/src/contexts/TenantContext.tsx) aplicava a cor da loja em variáveis CSS `--tenant-primary`/`--tenant-secondary` — que não eram lidas em lugar nenhum do `index.css`. Trocado para sobrescrever diretamente os tokens de tema reais (`--primary`, `--secondary`, `--ring`, `--sidebar-primary`, `--sidebar-ring`), que já alimentam todas as classes utilitárias (`bg-primary`, `text-primary` etc, via `@theme inline` no Tailwind v4) — assim a cor da loja passa a valer em qualquer componente que já usa esses tokens, sem precisar tocar em cada tela. Também troquei `.racing-gradient`/`.glow-orange` (usados em botões/CTAs de destaque em ~18 telas) de valores `oklch(...)` fixos para `var(--primary)` via `color-mix()`, senão os CTAs continuariam laranja mesmo com a loja configurada para outra cor.

### Upload de logo
Não existia mutation de upload — só `updateTenantSettings.logoUrl` (string pronta). Adicionado `crmPerformance.uploadTenantLogo` em [server/routers/crmRouter.ts](../server/routers/crmRouter.ts) (`adminProcedure`, mesmo padrão de `sellers.uploadPhoto`: recebe base64 + mimeType, grava via `storagePut` — que já prefixa a chave por tenant, ver Fase L — e persiste `logoUrl`/`logoKey` direto na tabela `tenants`). UI de upload adicionada no card "Dados da Loja" (preview do logo atual, botão de trocar, fallback para o ícone padrão quando não há logo).

**Limitação encontrada no ambiente local**: o upload em si depende do proxy de storage (`BUILT_IN_FORGE_API_URL`/`BUILT_IN_FORGE_API_KEY`), que não está configurado neste `.env` local — mesma limitação que já bloqueia qualquer upload de arquivo no ambiente local (foto de vendedor, documento, etc.), não é uma regressão desta fase. Validado via `curl` que a rota, autenticação e persistência funcionam corretamente até o ponto do `storagePut`; e que `updateTenantSettings` com uma `logoUrl` manual persiste e propaga corretamente até `tenantPublic.getBySlug` (a query que `useBranding()`/header consomem).

### Header da própria loja mostrando identidade genérica
O sidebar do CRM admin ([client/src/pages/crm/CrmAdminDashboard.tsx](../client/src/pages/crm/CrmAdminDashboard.tsx)) mostrava um ícone de escudo genérico + texto fixo "CRM Gerente", sem logo nem nome da loja — mesmo com o `useBranding()` já disponível no resto do app. Trocado (desktop e mobile) para logo da loja (fallback para a logo padrão do Kafka Rank quando não configurada) + nome da loja, com "CRM Gerente" e o nome do admin logado como subtítulo.

---

## Fase P — Integrações por loja: SIG Web, OLX/Webmotors e Meta Ads (token por tenant, self-service)

O card "Integrações" no Ajustes mostrava badges hardcoded (`status="pendente"`) pra SIG Web e OLX/Webmotors, sem nenhuma interatividade — nem chamava o backend. Investigando, o backend pra isso **já existia e já era multi-tenant desde antes desta fase**: tabela `crm_integrations` (`type`, `apiToken`, `tenantId`), router `crmIntegrations` completo (`list/create/update/delete/regenerateToken`, mais `getMetaConfig/saveMetaConfig/testMetaConnection` pro Meta Ads), e os webhooks receptores (`/api/webhooks/sig/sale`, `/api/webhooks/sig/inventory`, `/api/webhooks/email-parser` para OLX/Webmotors/SóCarrão/iCarros) já resolvendo o tenant certo a partir do token via `resolveTenantFromToken` — o mesmo padrão usado nos outros webhooks tenant-aware da Fase de Webhooks. Faltava só a tela: nenhum componente do frontend chamava esse router.

### O que foi implementado
- **`TokenIntegrationRow`** ([client/src/pages/crm/CrmAdminDashboard.tsx](../client/src/pages/crm/CrmAdminDashboard.tsx)) — componente reutilizável usado pra SIG Web e OLX/Webmotors: mostra status real (pendente/ativo/inativo lido do banco via `crmIntegrations.list`), botão "Ativar Integração" que cria o registro e gera o token, e — quando já configurado — a URL do webhook e o token (mascarado, com revelar/copiar), botão de regenerar token e de remover a integração.
- **`MetaIntegrationPanel`** — mesmo princípio pro Meta Lead Ads (Facebook/Instagram), reaproveitando o padrão de campo mascarado já usado no Z-API (`***configurado***` quando já tem valor salvo, sem nunca reexibir o segredo em claro).
- **Roteamento**: a página de documentação (`IntegrationDocs.tsx`) só existia em `/crm/integracoes` (sem prefixo de loja). Adicionada `/t/:slug/crm/integracoes` e corrigida toda navegação interna da página pra usar o slug do tenant atual. A página agora também busca e lista os tokens reais já configurados da loja (antes só mostrava `SEU_TOKEN_AQUI` como placeholder). Adicionada seção de SIG Web na documentação (não existia nenhuma, apesar do endpoint já existir há tempo).
- Link "Ver documentação completa" adicionado no card de Integrações do Ajustes.

### Validado ao vivo (curl, fluxo completo)
Criei uma integração SIG de teste no tenant `loja-demo`, confirmei que o token gerado autentica corretamente em `/api/webhooks/sig/inventory` (criou o veículo, retornou sucesso), que a mesma chamada **sem** token é rejeitada (`401`) e **com token inválido/de outra loja** também (`403`) — isolamento por tenant funcionando de ponta a ponta. Testei também regenerar token e salvar/ler config do Meta Ads (mascaramento de segredo correto). Dados de teste removidos do banco depois da validação. `tsc --noEmit` limpo, suíte em 755/762 (mesma baseline, sem regressão).

---

## Fase Q — Cadastro self-service de loja: landing pública + formulário de signup

Até esta fase, a única forma de nascer uma loja nova era o Super Admin logar em `/super-admin` e preencher o formulário de `createTenant` — sem cadastro autosserviço nenhum, sem página pública de apresentação do produto. Bloqueio direto pra comercializar a plataforma.

### Backend
- **`server/tenantProvisioning.ts`** (novo) — extraí a lógica de "o que acontece quando uma loja nasce" (insere `tenants`, admin owner, 5 estágios de pipeline, 8 categorias financeiras, linha de `crm_ai_global_config`) de dentro de `superAdminRouter.createTenant` para uma função `provisionTenant()` reaproveitável. Também extraí `checkSlugAndUsernameAvailability()`. `superAdminRouter.createTenant`/`checkAvailability` agora só chamam essas funções — comportamento idêntico ao de antes, só sem duplicação.
- **`server/routers/publicSignupRouter.ts`** (novo) — duas rotas `publicProcedure`, sem exigir nenhum token: `checkAvailability` (mesma checagem em tempo real do Super Admin, só que pública) e `create` (cria a loja de verdade). `create` força **plano trial com limites mais apertados que o trial do Super Admin** (`maxSellers: 5, maxAdmins: 1` contra 10/2) — é autosserviço sem curadoria nenhuma, então mais conservador por padrão. Rejeita se o campo honeypot vier preenchido ou se `acceptedTerms` não for `true`. Ao final, assina o mesmo JWT que `tenantAuth.login`/`adminAuth.login` emitem e devolve `{ tenantId, slug, token, redirectPath }` — o frontend trata como um login de admin bem-sucedido.
- **Rate limit dedicado** ([server/_core/index.ts](../server/_core/index.ts)) — `signupLimiter`, 5 cadastros por hora por IP, aplicado em `/api/trpc/publicSignup.create`, mesmo padrão do `loginLimiter`/`webhookLimiter` já existentes.

### Frontend
- **`client/src/lib/tenantForm.ts`** (novo) — `slugify`, `formatPhone`, `normalizeUsername`, `isValidEmail`, `getAvailabilityMessage` extraídos de dentro de `SuperAdmin.tsx` (onde viviam como funções locais) pra um módulo compartilhado. `SuperAdmin.tsx` e o novo formulário público importam do mesmo lugar — mesma normalização de slug/username nos dois formulários.
- **`client/src/pages/public/ComercialHome.tsx`** (novo, rota `/comercial`) — landing single-page: hero, seção de recursos, **Planos e Preços** (Trial grátis com CTA de cadastro; Basic/Pro/Enterprise com CTA "Falar com vendas" via WhatsApp, sem checkout de verdade — não existe billing implementado), **Quem Somos** (texto institucional — rascunho editável, sem alegações factuais reais sobre a empresa, precisa de revisão humana antes de ir pro ar), botão "Entrar" que abre um campo pra digitar o slug da loja e redireciona pra `/t/:slug/login` (não existe uma tela de login única global, cada loja tem a sua), e footer.
- **`client/src/pages/public/ComercialCadastro.tsx`** (novo, rota `/comercial/cadastro`) — formulário de duas seções (dados da loja + dados do admin), mesmos campos e mesma checagem de disponibilidade em tempo real do `CreateTenantModal` do Super Admin, sem seletor de plano (sempre trial). Campo honeypot escondido via CSS (não via JS, pra pegar bots simples que não executam JS) e checkbox obrigatório de aceite de termos. No sucesso, salva o token em `localStorage` (mesma chave `crm_admin_token` que `SellerLogin.tsx` usa) e redireciona direto pro painel administrativo da loja recém-criada — sem passo de login manual.
- Rotas registradas em `client/src/App.tsx` (lazy-loaded, mesmo padrão das demais páginas).

### Segurança/abuso
Rate limit de 5/hora por IP, honeypot no formulário (sem CAPTCHA — não existe infra pra isso hoje), plano forçado em trial com limites mais apertados que o trial manual, consentimento explícito de termos, e revalidação de unicidade de slug no momento da escrita (`provisionTenant` reconsulta antes de inserir, não confia só na checagem em tempo real anterior).

### Fora do escopo desta fase (deliberado)
Cobrança/Stripe, verificação de e-mail, CAPTCHA de verdade, texto jurídico real de Termos/Privacidade (só placeholder) — documentado em detalhe no plano desta fase.

### Validado
- `tsc --noEmit` limpo.
- Novo [server/public-signup.test.ts](../server/public-signup.test.ts) (5 testes, integração real contra o banco local, com cleanup): cadastro cria tenant/admin/pipeline/categorias com os limites certos e o token retornado autentica como o admin certo no tenant certo; slug duplicado rejeitado; honeypot rejeitado; termos não aceitos rejeitado; `checkAvailability` reflete slug/username já usados.
- Suíte completa: 760/767 (+5 dos testes novos), mesmas 7 falhas conhecidas de sempre, zero regressão.
- Validado via `curl` de ponta a ponta antes de escrever os testes automatizados: `checkAvailability` → `create` → token retornado autentica em `/t/:slug/crm/admin` → slug duplicado rejeitado. Dados de teste removidos do banco depois.
- **Não verificado visualmente no navegador nesta sessão** — a extensão do Chrome não estava conectada e não havia como apontar as ferramentas de preview pra este projeto (porta já ocupada pelo servidor de dev real). As duas páginas novas foram revisadas linha a linha e reaproveitam componentes (`Button`, `Input`, `Checkbox`, classes `racing-card`/`racing-gradient`) já usados e validados em dezenas de outras telas do app — mas recomendo abrir `/comercial` e `/comercial/cadastro` manualmente antes de considerar isso pronto pra produção.

---

## Fase R — Enforcement de expiração de trial + preparação para ASAAS

Auditoria pediu especificamente por isso: até aqui, `trialEndsAt` era gravado no provisionamento mas **nunca verificado em lugar nenhum** — uma loja trial continuava com acesso total pra sempre depois dos 30 dias. Isso foi corrigido, e o schema já foi preparado pra próxima fase (checkout + webhook do ASAAS).

### Enforcement de trial
- **`server/tenantService.ts`** — `getTenantLimits()` (já existente, cacheado 1min, usado pelo module-gating) passou a retornar também `trialEndsAt` e `trialExpired` (calculado: `status === "trial" && trialEndsAt < Date.now()`). Só considera expirado se o `status` do tenant ainda for `"trial"` — se um admin já migrou o plano manualmente sem atualizar o `status`, não bloqueia por engano um cliente pagante.
- **`server/routers/tenantAuthRouter.ts`** (`tenantAuth.login`) — as três variantes de login (admin/manager/seller) agora devolvem `trialEndsAt`/`trialExpired` junto com os dados do usuário logado.
- **`server/routers.ts`** (`sellers.me`, `managers.me`) e **`server/routers/crmRouter.ts`** (`adminAuth.me`) — mesma informação adicionada nas três queries de "quem está logado", pra cobrir sessão já ativa (usuário que loga num dia e volta depois do trial expirar sem relogar).
- **`client/src/components/TrialExpiredGate.tsx`** (novo) — overlay global, não-fechável (sem X, sem clique fora), montado uma vez em `App.tsx` fora do `<Router />`. Checa as três sessões possíveis (`sellers.me`/`managers.me`/`adminAuth.me`) e mostra o modal se qualquer uma delas reportar `trialExpired: true`. Só ativa dentro de rotas `/t/:slug/...` (fora disso não tem tenant pra checar, então não aparece em `/comercial` nem na home antiga). Botão único leva pra `/t/:slug/assinatura`.
- **`client/src/pages/Assinatura.tsx`** (novo, rota `/t/:slug/assinatura`) — página placeholder com os 3 planos pagos (Basic/Pro/Enterprise) e CTA "Falar com vendas" via WhatsApp. Vai virar a tela de checkout de verdade na próxima fase.

### Preparação pra integração completa com ASAAS (próxima demanda — não implementado ainda)
- **Schema**: adicionado `tenants.asaasCustomerId` (migration [drizzle/0068_complex_vision.sql](../drizzle/0068_complex_vision.sql), aplicada localmente). O campo `tenants.subscriptionId` já existia (genérico, comentário antigo dizia "Stripe, etc.") e vai ser reaproveitado pra guardar o ID da assinatura no ASAAS.
- **`.env`**: adicionados placeholders `ASAAS_API_URL` (default sandbox), `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` — mesmo padrão de credencial vazia usado pra Z-API/BUILT_IN_FORGE.

**Pré-análise do que a próxima fase precisa construir** (ASAAS é REST simples com autenticação por API key no header `access_token`, sandbox em `sandbox.asaas.com`, produção em `www.asaas.com`):
1. **Criação de customer** — ao um admin clicar "assinar" em `/assinatura`, criar (ou reaproveitar, se `asaasCustomerId` já existir) um customer no ASAAS via `POST /v3/customers` com nome/e-mail/CPF-CNPJ da loja, salvar o `id` retornado em `tenants.asaasCustomerId`.
2. **Criação de assinatura** — `POST /v3/subscriptions` vinculada ao customer, com `billingType` (BOLETO/PIX/CREDIT_CARD — decidir se o card é digitado direto ou via link de pagamento do ASAAS, que é mais simples de implementar sem PCI compliance), valor conforme `monthlyPrice` do plano escolhido, salvar o `id` em `tenants.subscriptionId`.
3. **Webhook receptor** — novo endpoint público (`/api/webhooks/asaas`, seguindo o mesmo padrão de `server/webhooks.ts`) validando um token compartilhado (`ASAAS_WEBHOOK_TOKEN`, configurado no painel do ASAAS) — não confiar em IP de origem. Eventos principais a tratar: `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` (ativar a loja: `status: "active"`, limpar `trialEndsAt`, ajustar `maxSellers`/`maxAdmins`/`enabledModules` conforme o plano contratado), `PAYMENT_OVERDUE` (agendar suspensão, com carência), `SUBSCRIPTION_DELETED`/inadimplência prolongada (`status: "suspended"`, o que já faz o `TrialExpiredGate` bloquear o acesso, já que o mesmo mecanismo de `status !== "active"` pode ser generalizado pra além de `"trial"`).
4. **Ajuste no `TrialExpiredGate`** — hoje só olha `trialExpired`; vai precisar também bloquear quando `status === "suspended"` por falta de pagamento (mensagem diferente: "assinatura em atraso" em vez de "trial expirou").
5. **Tela `/assinatura` virar checkout de verdade** — formulário de dados de cobrança + redirecionamento pro link de pagamento do ASAAS (ou embed, dependendo do que o ASAAS oferecer pra evitar lidar com dado de cartão diretamente).
6. **Idempotência do webhook** — ASAAS pode reenviar o mesmo evento; usar o `id` do evento/pagamento pra não aplicar a mesma transição de estado duas vezes.

### Validado
- `tsc --noEmit` limpo.
- Migration `0068` gerada via `drizzle-kit generate` (só o `ALTER TABLE ADD asaasCustomerId`, sem nenhuma mudança inesperada) e aplicada no banco local com `drizzle-kit migrate`, coluna confirmada via `SHOW COLUMNS`.
- Novo [server/trial-expiration.test.ts](../server/trial-expiration.test.ts) (5 testes, integração real): `getTenantLimits` marca `trialExpired` corretamente quando vencido, não marca quando ainda dentro do prazo, e — o caso mais importante — **não marca quando o tenant já foi migrado pra um plano pago** mesmo com `trialEndsAt` vencido no passado (protege cliente pagante de bloqueio por engano); `tenantAuth.login` devolve `trialExpired`/`trialEndsAt` corretamente nos dois cenários.
- Validado também via `curl` contra o servidor real: criei uma loja com `trialEndsAt` no passado, login (`tenantAuth.login`) e restauração de sessão (`adminAuth.me`) confirmaram `trialExpired: true` nos dois. Dados de teste removidos depois.
- Suíte completa: 765/772 (+5 dos testes novos), mesmas 7 falhas conhecidas de sempre, zero regressão.
- **O modal (`TrialExpiredGate.tsx`) não foi verificado visualmente no navegador** — mesma limitação de ambiente da Fase Q (sem Chrome conectado nesta sessão). A lógica de exibição foi revisada linha a linha e segue o mesmo padrão de overlay global já usado em `LiveAlerts.tsx`; recomendo testar manualmente criando uma loja com trial vencido e logando nela antes de considerar isso pronto pra produção.

---

## Fase S — Integração completa com ASAAS: checkout, webhook, billing e logs de assinatura

Fecha o ciclo que a Fase R deixou pendente: agora dá pra converter trial em pagamento de verdade, o sistema reage sozinho a evento de pagamento/atraso, e existe visibilidade completa (Super Admin vê tudo, cada loja vê o próprio histórico).

### Decisão de arquitetura confirmada com o usuário
Checkout usa a **página hospedada do ASAAS** (redirect) — nenhum dado de cartão passa pelo nosso servidor, fora do escopo de PCI compliance.

### Pesquisa feita antes de implementar
Documentação oficial do ASAAS (docs.asaas.com) consultada nesta sessão pra evitar implementar em cima de suposição errada — descobri que a URL de produção mudou recentemente (`api.asaas.com/v3`, não mais `asaas.com/api/v3`) e que o webhook de segurança usa o header fixo `asaas-access-token` batendo com um `authToken` configurado no painel do ASAAS.

### Backend
- **`shared/plans.ts`** (novo) — fonte única de preço/limite por plano pago (`basic`/`pro`/`enterprise`), com desconto de lançamento já aplicado. Consumido tanto pelo backend (pra saber quanto cobrar de verdade) quanto pelas duas telas de preço do frontend (`ComercialHome.tsx`, `Assinatura.tsx`) — elimina o risco de a vitrine mostrar um preço e o sistema cobrar outro.
- **`drizzle/schema.ts`** — nova tabela `subscription_events` (log de todo evento de pagamento/assinatura por loja, migration `0069`), com índice em `tenantId` e em `asaasPaymentId` (idempotência). Deliberadamente separada de `fin_transactions`, que é o financeiro interno de cada loja com os próprios clientes dela — conceito diferente de "quanto a loja paga pra plataforma".
- **`server/asaasService.ts`** (novo) — wrapper fino sobre a API do ASAAS (`createCustomer`, `createSubscription`, `getCheckoutUrl`, `cancelSubscription`), mesmo princípio de `zapi-service.ts` mas com credencial única global (é a conta ASAAS da própria plataforma, não uma por loja).
- **`server/webhooks.ts`** — novo `POST /api/webhooks/asaas`. Diferente dos outros webhooks do arquivo: não tem token por-loja, o tenant é resolvido casando o `customer` do payload com `tenants.asaasCustomerId` (`getTenantByAsaasCustomerId()`, novo em `tenantService.ts`). Valida o header `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN`, checa idempotência antes de gravar (mesmo evento reenviado não duplica), e só reage automaticamente a dois eventos — `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` (ativa a loja, limpa `trialEndsAt`, aplica os limites do plano) e `PAYMENT_OVERDUE` (suspende) — os demais ficam só no log, sem ação automática, pra não reagir errado a evento raro.
- **`server/routers/billingRouter.ts`** (novo, `adminProcedure`) — `getMyPlan`, `getMyPaymentHistory` (paginado, isolado por `getCurrentTenantId()`), `subscribe` (cria customer+assinatura no ASAAS, devolve URL de checkout), `cancelSubscription`.
- **`server/routers/subscriptionLogsRouter.ts`** (novo, Super Admin) — `list` (paginado, filtros por loja/tipo de evento/status/data) e `getById` (detalhe com payload cru).
- **`server/superAdminAuth.ts`** (novo) — extraí `SUPER_SECRET`/`signSuperToken`/`verifySuperToken` de dentro de `superAdminRouter.ts` (onde eram privados) pra reaproveitar no `subscriptionLogsRouter`, sem duplicar a lógica de token do portal master.
- Rate limit dedicado (`asaasWebhookLimiter`, IP-based, 60/min) pro webhook — não é por loja porque a chamada vem da conta ASAAS da plataforma, não de um tenant específico.

### Frontend
- **`client/src/pages/Assinatura.tsx`** — vira checkout de verdade: mostra plano atual (ativo/suspenso/nenhum), cards de plano com preço de `shared/plans.ts`, botão "Assinar agora" abre modal coletando CPF/CNPJ e nome de cobrança, chama `billing.subscribe` e redireciona pra URL de checkout do ASAAS. Abaixo, histórico de pagamentos paginado usando os componentes shadcn `table.tsx`/`pagination`-style que **já existiam no projeto sem nunca terem sido usados**.
- **`client/src/pages/SuperAdmin.tsx`** — nova aba "Logs de Assinaturas" no dashboard (alternador ao lado de "Lojas"), com filtros (loja/tipo de evento/status), tabela paginada, clique na linha abre modal com o payload cru do webhook — mesmo padrão visual do `TenantDetailModal` já existente.
- **`client/src/components/TrialExpiredGate.tsx`** — generalizado: agora bloqueia também quando `status === "suspended"` (assinatura em atraso), com mensagem diferente da de trial expirado.
- **`client/src/pages/public/ComercialHome.tsx`** — preços dos planos passaram a vir de `shared/plans.ts` em vez de string hardcoded, pra nunca desalinhar do valor real cobrado.

### Validado
- `tsc --noEmit` limpo.
- Novo [server/asaas-webhook.test.ts](../server/asaas-webhook.test.ts) (5 testes, integração real contra o banco, DB de verdade + handler do Express capturado sem subir servidor): rejeita token errado; ativa a loja e grava o evento em `PAYMENT_CONFIRMED`; **idempotência confirmada** (mesmo evento reenviado não duplica); suspende em `PAYMENT_OVERDUE`; ignora com 200 (sem erro) evento de um customer desconhecido, pra não gerar retentativa infinita do ASAAS.
- Novo [server/billing.test.ts](../server/billing.test.ts) (4 testes, `asaasService` mockado pra não bater na API real): `subscribe` cria customer/assinatura e persiste no tenant certo; **isolamento de tenant confirmado** (loja A não vê histórico de pagamento de loja B); `subscriptionLogs.list` rejeita sem token de Super Admin válido e lista corretamente com token válido.
- Corrigido de quebra um teste pré-existente ([server/tenant-security.test.ts](../server/tenant-security.test.ts)) que checava a string `SUPER_SECRET` dentro de `superAdminRouter.ts` — ficou obsoleto com a extração pra `superAdminAuth.ts`, mesma categoria de ajuste já feita em fases anteriores.
- Validado também via `curl` contra o servidor real: `billing.getMyPlan`/`getMyPaymentHistory` funcionando pra loja real; `billing.subscribe` falha com mensagem clara e sem tocar no banco quando `ASAAS_API_KEY` não está configurada (esperado neste ambiente local); webhook rejeita com 503 quando `ASAAS_WEBHOOK_TOKEN` não está configurado; `subscriptionLogs.list` autentica corretamente com um token real de Super Admin gerado via `superAdmin.login`.
- Suíte completa: 774/781, mesmas 7 falhas conhecidas de sempre (env do Z-API, tabela do Atendente IA, seed de pipeline local), zero regressão nova.
- **Não verificado visualmente no navegador** (Chrome não conectado nesta sessão) — mesma ressalva das fases anteriores. Recomendo testar o fluxo completo manualmente com uma conta sandbox do ASAAS antes de considerar isso pronto pra produção: preencher `ASAAS_API_KEY`/`ASAAS_WEBHOOK_TOKEN` no `.env`, cadastrar o webhook no painel do ASAAS apontando pra `/api/webhooks/asaas`, e testar o fluxo de assinar → pagar no sandbox → confirmar que o webhook chega e ativa a loja.

### O que ainda falta pra essa parte estar 100% (fora do escopo desta fase)
- Validação do endpoint exato de checkout hospedado contra o sandbox real do ASAAS (implementei com base na documentação pesquisada, mas nunca testei contra a API de verdade — sem `ASAAS_API_KEY` configurada neste ambiente não dá pra validar isso).
- Cadastro do webhook no painel do ASAAS (`POST /v3/webhooks` ou pela interface) — passo manual de configuração, não é código.
- E-mail de cobrança automático (o ASAAS pode enviar sozinho, mas depende de configuração na conta).
- Página de fatura/nota fiscal — o ASAAS não emite nota fiscal automaticamente, isso é responsabilidade separada.

## Fase T — Correção de risco de cobrança duplicada + máscara/validação de CPF/CNPJ/telefone/e-mail

Auditoria pós-Fase S encontrou dois problemas reais no fluxo de billing (não hipotéticos — código lido e confirmado): `billing.subscribe` sempre chamava `asaas.createSubscription`, então um duplo clique ou uma tentativa de trocar de plano criava uma **segunda assinatura na ASAAS** (cobrança duplicada de verdade); e a validação de CPF/CNPJ era só `min(11)` caracteres, aceitando qualquer sequência de dígitos.

### Pesquisa feita antes de implementar
Confirmado contra docs.asaas.com (`PUT /v3/subscriptions/{id}`) que dá pra atualizar o `value` de uma assinatura existente, e que o campo `updatePendingPayments: true` aplica o novo valor até em cobranças pendentes já geradas (sem isso, só cobranças futuras usariam o preço novo).

### Backend
- **`shared/validators.ts`** (novo) — checksum real de CPF (`isValidCPF`) e CNPJ (`isValidCNPJ`), aceita os dois formatos (`isValidCpfCnpj`), validador de telefone BR (`isValidBrazilianPhone`, valida DDD e o `9` na frente de celular) e de e-mail (`isValidEmail`). Compartilhado entre backend (Zod `.refine()`) e frontend (validação on-blur) — mesma regra nos dois lados.
- **`server/asaasService.ts`** — novo `updateSubscription(subscriptionId, { plan })`, `PUT /v3/subscriptions/:id` com `value`/`cycle`/`updatePendingPayments: true`.
- **`server/routers/billingRouter.ts`** — `subscribe` agora: se a loja já tem `subscriptionId`, chama `updateSubscription` (troca de plano) em vez de `createSubscription` (evita a segunda assinatura); rejeita tentar "assinar" o mesmo plano que já tem; `cpfCnpj` validado por checksum real; `mobilePhone` validado quando informado. `cancelSubscription` agora limpa o `subscriptionId` local depois de cancelar na ASAAS — sem isso, a próxima tentativa de assinar tentaria dar `PUT` numa assinatura que não existe mais.

### Frontend
- **`client/src/lib/masks.ts`** (novo) — `maskCpfCnpj`/`maskPhone`, formatação on-change a partir dos dígitos crus (funciona digitando ou colando).
- **`client/src/pages/Assinatura.tsx`** — `SubscribeDialog` ganhou máscara + validação on-blur em CPF/CNPJ, telefone e e-mail (mensagem de erro inline); distingue "assinar" de "trocar de plano" na cópia e no botão; trata a resposta sem `checkoutUrl` (troca de plano sem cobrança nova) com toast de sucesso em vez de tentar redirecionar pra `undefined`.
- **Auditoria de todos os formulários reais que capturam CPF/telefone/e-mail de cliente** (agente de exploração dedicado, não achado por amostragem): máscara + validação no submit aplicadas em `RegisterSale.tsx` (4 categorias — vendas, F&I, consignação, pré-vendas), `FichaFinanciamento.tsx` (CPF, telefone, e-mail, telefone de referência), `AdminSellers.tsx` (telefone/e-mail de vendedor) e `ConsignmentControl.tsx` (telefone do proprietário, edição). `ComercialCadastro.tsx` já tinha máscara/validação própria (`tenantForm.ts`) e ficou como estava.

### Validado
- `tsc --noEmit` limpo.
- Novo [server/validators.test.ts](../server/validators.test.ts) (18 testes): CPF/CNPJ válidos e inválidos (dígito verificador errado, todos os dígitos iguais, tamanho errado), telefone (DDD inválido, celular sem o `9`, código do país), e-mail.
- [server/billing.test.ts](../server/billing.test.ts) estendido (+4 testes): troca de plano chama `updateSubscription` e não `createSubscription`; rejeita assinar de novo o mesmo plano; rejeita CPF/CNPJ inválido antes de chamar a ASAAS; `cancelSubscription` limpa o `subscriptionId` local.
- Suíte completa: 795/803 (crescimento de 26 testes novos sobre a Fase S), mesmas 7 falhas conhecidas de sempre (env do Z-API, tabela do Atendente IA, seed de pipeline local), **zero regressão nova**.
- **Não verificado visualmente no navegador** — mesma ressalva de sempre. A troca de plano em particular vale um teste manual contra o sandbox antes de produção, já que depende de como a ASAAS de fato se comporta quando não há cobrança `PENDING` no momento da troca.

## Fase U — Tabelas do Atendente IA sem migration + "esqueci minha senha" self-service

Dois achados do levantamento pós-Fase T, ambos confirmados por leitura direta do código/banco (não hipóteses): `crm_ai_global_config`, `crm_ai_config_log` e `crm_ai_inactive_dispatch_log` eram manipuladas via SQL raw em vários pontos do código (`ai-attendant.ts`, `crmRouter.ts`, `webhooks.ts`, `inactive-dispatch.ts`) mas **nunca existiram no banco** — só `credit_applications`/`ai_appointments` (Fase M) tinham migration; e não existia nenhum jeito de um usuário redefinir a própria senha sem depender de um admin.

### Tabelas do Atendente IA
- Comparei `drizzle/schema.ts` contra o banco local direto (`SHOW TABLES`) em vez de assumir — `credit_applications`/`ai_appointments` já existiam (migration 0067, aplicada); `crm_ai_global_config`/`crm_ai_config_log`/`crm_ai_inactive_dispatch_log` não existiam de jeito nenhum, apesar de usadas em runtime (qualquer tentativa de salvar config de IA ou consultar stats de disparo automático quebrava ou falhava silenciosamente).
- Reconstruí as três tabelas em `drizzle/schema.ts` (`crmAiGlobalConfig`, `crmAiConfigLog`, `crmAiInactiveDispatchLog`) lendo **todos** os `SELECT`/`UPDATE`/`INSERT` raw que as referenciam pra levantar a lista completa de colunas — mesmo essas tabelas continuando a ser manipuladas via SQL raw no código existente (não migrei pra query builder, fora de escopo), agora existe migration e tipo.
- Migration `0070_safe_prodigy.sql` gerada via `drizzle-kit generate` a partir do diff do schema. Adicionei manualmente ao final da migration um backfill (`INSERT ... SELECT ... WHERE NOT IN`) pra criar a linha de config das lojas que já existiam antes desta migration — sem isso, salvar config de IA numa loja já existente daria "sucesso" sem persistir nada (o `provisionTenant` só insere a linha em lojas novas).
- `crm_ai_global_config.tenantId` ganhou `UNIQUE` — uma linha por loja é a invariante que todo o código já assumia (`WHERE tenantId = X LIMIT 1`), agora garantida no banco.

### "Esqueci minha senha" self-service
- Decisão de escopo: como `managers` não tinha coluna de e-mail (só `admins` e `sellers` tinham), adicionei `email` em `managers` pra ter paridade nos três tipos de conta — sem isso o reset ficaria incompleto pra gerente, que já é um papel de login de verdade no `tenantAuthRouter`.
- **`drizzle/schema.ts`** — nova tabela `password_reset_tokens` (migration `0071_third_thor.sql`): `tenantId`, `userType` (admin/manager/seller), `userId`, `tokenHash` (SHA-256, único — nunca guarda o token bruto, mesmo princípio de nunca guardar senha em texto puro), `expiresAt`, `usedAt`.
- **`server/routers/passwordResetRouter.ts`** (novo) — `requestReset` busca por e-mail nas três tabelas (mesma ordem de prioridade do login unificado: admin → gerente → vendedor), gera token aleatório de 32 bytes, guarda só o hash, manda e-mail com link (`sendPasswordResetEmail`, novo em `emailService.ts`, reaproveitando o mesmo remetente/estilo do OTP existente). **Sempre devolve sucesso genérico**, exista ou não o e-mail — evita enumeração de contas. `confirmReset` valida hash+expiração+tenant (um token de uma loja não funciona confirmando em outra) e troca a senha com bcrypt, mesmo custo (10) já usado no resto do app.
- Rate limit dedicado (`passwordResetLimiter`, 5/hora por loja+IP) em `/api/trpc/passwordReset.requestReset` — evita floodar caixa de entrada alheia.
- `server/_core/cookies.ts` ganhou `getRequestOrigin(req)` (exportado) pra montar o link absoluto do e-mail respeitando proxy reverso — mesma lógica de detecção de HTTPS que já existia ali (`isSecureRequest`) pra decidir `sameSite` do cookie, só que agora reaproveitada.
- **Frontend**: `client/src/pages/EsqueciSenha.tsx` e `RedefinirSenha.tsx` (novas), rotas `/t/:slug/esqueci-senha` e `/t/:slug/redefinir-senha`; link "Esqueci minha senha" adicionado no login unificado (`SellerLogin.tsx`). `AccessGate.tsx` ganhou as duas rotas novas em `isTenantBypassRoute` — mesma classe de bug já corrigida antes pra `/comercial`/`/assinatura` (rota nova esquecida na lista de bypass cai no gate de login legado).

### Validado
- `tsc --noEmit` limpo.
- Novo [server/ai-attendant.test.ts](../server/ai-attendant.test.ts) — os dois testes que verificavam `crm_ai_global_config`/`credit_applications` (já existiam, estavam falhando) agora passam.
- Novo [server/password-reset.test.ts](../server/password-reset.test.ts) (6 testes, integração real contra o banco, `sendPasswordResetEmail` mockado só pra capturar o link sem depender de credencial real do Resend): fluxo completo pedir→receber link→redefinir senha de admin; resposta genérica não revela e-mail inexistente e não manda e-mail; token não pode ser reutilizado; token expirado rejeitado; **token de uma loja não funciona confirmando em outra** (isolamento de tenant); fluxo completo também validado pra vendedor.
- Suíte completa: 795/809 numa rodada com contenção de paralelismo (mesma flakiness de sempre nesta sessão — testes que dependem de banco competindo por conexão quando todos os arquivos rodam ao mesmo tempo); rodando os arquivos suspeitos isolados (`meta-security.test.ts`, `public-signup.test.ts`, `pos-venda-panel.test.ts`) todos passam 100%. **Zero regressão real** — as únicas falhas consistentes são as 7 já conhecidas (Z-API sem credencial, 2 testes de pipeline do CRM que dependem de seed local).
- **Não verificado visualmente no navegador** — mesma ressalva de sempre.

### O que ainda falta pra essa parte estar 100% (fora do escopo desta fase)
- E-mail de redefinição de senha nunca testado com o Resend de verdade (`RESEND_API_KEY` não configurada neste ambiente — o link é só logado no console).
- Sem revogação de sessão: mesmo depois de redefinir a senha, um JWT de 30 dias já emitido continua válido até expirar sozinho (esse achado mais amplo, sobre sessão em geral, segue de fora do escopo desta fase).
- Sem limite de tentativas de token errado em `confirmReset` além do rate limit por IP do `requestReset` — um token de 32 bytes aleatórios é praticamente impossível de adivinhar por força bruta, mas não há um limiter dedicado nesse endpoint especificamente.

## Fase V — E-mails transacionais completos + notificações in-app + log unificado no Super Admin

Fecha o levantamento "o que pode ser e-mail vs notificação interna" feito antes desta fase: toda ponta comercial (cadastro, assinatura, trial) agora dispara e-mail de verdade, cada e-mail vira log auditável, e o Super Admin enxerga e-mail e assinatura no mesmo lugar com filtro de tipo e intervalo de data.

### P0 — ciclo comercial (checkout/trial)
- **`drizzle/schema.ts`** — nova tabela `email_logs` (migration `0072`): `tenantId` (nullable — nem todo e-mail tem tenant resolvido, ex. OTP antes da sessão existir), `emailType`, `toEmail`, `subject`, `status` (`sent`/`failed`), `providerId` (id do Resend), `errorMessage`.
- **`server/emailService.ts`** reescrito em torno de um `dispatchEmail()` único: centraliza a chamada ao Resend (ou log no console quando não configurado, mesmo comportamento de sempre) **e** a gravação em `email_logs`, sucesso ou falha. `sendVerificationEmail`/`sendPasswordResetEmail` (já existentes) passaram a usar esse wrapper em vez de duplicar a lógica de envio; novas funções (`sendSignupWelcomeEmail`, `sendSubscriptionConfirmedEmail`, `sendSubscriptionSuspendedEmail`, `sendTrialEndingEmail`, `sendUserWelcomeEmail`, `sendPlanChangedEmail`) reaproveitam o mesmo `emailShell()` de template.
- **`server/routers/publicSignupRouter.ts`** — `create` manda `sendSignupWelcomeEmail` depois de provisionar o tenant (link de acesso montado com `getRequestOrigin(ctx.req)`, mesmo helper da Fase U).
- **`server/webhooks.ts`** — `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` e `PAYMENT_OVERDUE` agora, além de mudar o `status` do tenant, mandam e-mail (`sendSubscriptionConfirmedEmail`/`sendSubscriptionSuspendedEmail`, só se `tenants.email` estiver preenchido) **e** criam notificação in-app pro admin via `createNotification()` (mesma tabela/sistema que já alimenta o sininho do header, `type: "subscription_confirmed"`/`"subscription_suspended"`).
- **`server/routers/platformLogsRouter.ts`** (novo) — `list` normaliza `email_logs` e `subscription_events` num formato comum (`id`, `logType`, `tenantName`, `title`, `detail`, `status`, `createdAt`), filtrável por `logType` (e-mail/assinatura/todos), `tenantId`, `status` e intervalo de data (`startDate`/`endDate`). No modo "todos os tipos" busca de cada tabela e mescla em memória ordenado por data — paginação exata entre duas tabelas exigiria `UNION` em SQL, e pro volume de logs de uma plataforma essa aproximação é suficiente. `getById` roteia pra tabela certa conforme `logType`.
- **Frontend**: `SubscriptionLogsSection`/`SubscriptionEventDetailModal` em `SuperAdmin.tsx` viraram `PlatformLogsSection`/`PlatformLogDetailModal`, consumindo `platformLogs.*` em vez de `subscriptionLogs.*` — seletor de Tipo (Todos/E-mail/Assinatura), inputs de data início/fim, badge colorido por tipo na tabela. `subscriptionLogsRouter.ts` original ficou intocado (ainda coberto por `billing.test.ts`), só não é mais usado pela tela — nada foi removido pra não quebrar teste existente sem necessidade.

### P1 — aviso preventivo de trial + visibilidade de eventos raros
- **`drizzle/schema.ts`** — `tenants.trialReminderDaysSent` (migration `0073`), texto tipo `"5,3"` guardando quais avisos já foram mandados — idempotência do job sem precisar de tabela separada.
- **`server/trialReminderJob.ts`** (novo) — varre lojas com `status: "trial"`, calcula dias restantes (`Math.ceil`), dispara e-mail + notificação in-app nos limiares 5/3/1 dias, só uma vez cada. Registrado em `server/_core/index.ts` no mesmo padrão já usado por `inventory-scraper`/`alert-checker` (`setInterval`, roda a cada 6h — não uma vez exata por dia, porque não existe scheduler tipo cron no projeto; como o envio é idempotente, rodar mais de uma vez por dia é seguro).
- **`server/_core/env.ts`** — novo `ENV.appUrl` (env var `APP_URL`, default `http://localhost:3000`): jobs em background não têm uma request HTTP de onde derivar o host (diferente de `getRequestOrigin(req)`), precisam de uma origem configurada.
- **`server/routers/platformLogsRouter.ts`** — `getRareEventsCount`: conta `subscriptionEvents` dos últimos 30 dias com `eventType` em `PAYMENT_DELETED`/`PAYMENT_REFUNDED`/eventos de chargeback — vira badge amarelo na aba "Logs" do Super Admin. Deliberadamente não é um sistema de "lido/não lido" (tabela de leitura por admin seria overengineering pra esse volume) — é só uma contagem recente que chama atenção.

### P2 — nice-to-have
- **E-mail de boas-vindas pra vendedor/gerente novo** (`sendUserWelcomeEmail`) — manda só o **link de login**, nunca a senha em texto puro: vendedor já usa fluxo de "primeiro acesso" pra escolher a própria senha; gerente é criado com senha definida pelo admin, mas mesmo assim o e-mail não repete essa senha. `managers.create` ganhou campo `email` opcional (coluna já existia desde a Fase U, só não estava exposta no formulário/endpoint).
- **Comprovante de troca de plano** (`sendPlanChangedEmail`) — plugado em `billingRouter.subscribe` quando `isPlanChange` é `true`, manda pro e-mail informado no formulário ou, na falta, pro e-mail cadastrado da loja.

### Validado
- `tsc --noEmit` limpo.
- 6 arquivos de teste novos/estendidos, todos com integração real de banco (mesmo padrão da sessão inteira): [server/email-logs.test.ts](../server/email-logs.test.ts) (5 testes, todo tipo de e-mail grava log certo), [server/asaas-webhook.test.ts](../server/asaas-webhook.test.ts) estendido (+e-mail e notificação nos branches confirmado/suspenso), [server/platform-logs.test.ts](../server/platform-logs.test.ts) (8 testes: filtro por tipo, mescla "todos", intervalo de data, `getRareEventsCount`, isolamento de token), [server/trial-reminder-job.test.ts](../server/trial-reminder-job.test.ts) (5 testes: limiar certo, idempotência, sem falso positivo, loja sem e-mail não quebra, loja fora de trial é ignorada), [server/user-welcome-email.test.ts](../server/user-welcome-email.test.ts) (3 testes), [server/billing.test.ts](../server/billing.test.ts) estendido (comprovante de troca de plano).
- Suíte completa: 823/830, mesmas 6-7 falhas conhecidas de sempre (Z-API sem credencial, pipeline do CRM com seed local) — **zero regressão nova**. `ai-attendant.test.ts` (corrigido na Fase U) continua verde.
- **Não verificado visualmente no navegador** — mesma ressalva de sempre; a seção de logs unificada do Super Admin em particular merece uma conferência visual (badge de eventos raros, seletor de tipo, inputs de data) antes de considerar essa tela pronta pra uso real.

### O que ainda falta pra essa parte estar 100% (fora do escopo desta fase)
- Nenhum e-mail desta fase testado com o Resend de verdade — tudo validado via log no console (`RESEND_API_KEY` não configurada neste ambiente).
- `platformLogs.list` no modo "Todos os tipos" não pagina com precisão perfeita entre as duas tabelas (aproximação documentada acima) — não é um problema pro volume atual, mas merece um `UNION` de verdade se o log crescer muito.
- `getRareEventsCount` não é interativo (não dá pra marcar como "visto") — se isso virar necessário, aí sim compensa desenhar um sistema de leitura por admin.
- E-mail de boas-vindas de vendedor/gerente não foi integrado com um fluxo de "primeiro acesso" com link direto e seguro (hoje só linka pro login geral da loja) — dá pra evoluir reaproveitando a infraestrutura de token do `passwordResetRouter` pra gerar um link de primeiro acesso de uso único.
