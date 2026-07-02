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
3. **Rodar as migrations 0064–0066 em staging/produção** — só validadas contra o banco de desenvolvimento local; a Fase H (username) exige auditoria prévia de duplicatas, a Fase G (`crm_ai_global_config`) precisa ser exercitada contra o schema real de produção (as tabelas existem lá mas não neste ambiente local).
4. **Branding dos templates de campanha em `CrmAdminDashboard.tsx`** — bloqueado por uma questão de encoding do arquivo nesta sessão, precisa de outra abordagem de edição.
5. **Tabelas do Atendente IA (`credit_applications`, `ai_appointments`, colunas de `crm_ai_global_config`) sem migration aplicada** — achado na Fase M; qualquer uso real de ficha de crédito/agendamento via IA vai falhar em runtime. Sinalizado como tarefa à parte.
6. **Error tracking com correlação de tenantId, expurgo de dado no soft-delete de tenant, e-mail automático de onboarding** — achados da Fase L, importantes para operar em produção com múltiplos clientes mas não bloqueantes para um piloto controlado.
7. **Testes de segurança cross-tenant mais amplos** — hoje cobertos os pontos críticos (auth, webhooks, Z-API, config de IA, limites de plano, uploads); não há suite sistemática de "ataque" cobrindo todo o CRM/financeiro.

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
