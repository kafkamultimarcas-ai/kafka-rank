# Arquitetura Multi-Tenant

Como uma única instância do Kafka Rank atende várias lojas (tenants) isoladas entre si, do banco de dados até a sessão do usuário.

## 1. Isolamento de dados

### 1.1. Coluna `tenantId` em toda tabela de dado
- Praticamente toda tabela de `drizzle/schema.ts` tem `tenantId: int("tenantId").notNull()` (tabelas criadas antes da conversão multi-tenant têm `.default(1)` pra manter compatibilidade com os dados que já existiam sob o tenant 1 — tabelas criadas depois, como `subscription_events`, `password_reset_tokens`, `email_logs`, não precisam desse default).
- Exceção documentada e testada: `tenants`, `superAdmins`, `emailVerificationCodes` — não fazem sentido por-loja.
- [`server/tenant-security.test.ts`](../../server/tenant-security.test.ts) garante isso automaticamente: varre `drizzle/schema.ts` procurando toda `mysqlTable` e falha se alguma tabela nova não tiver `tenantId` e não estiver na lista de exceções permitidas. Qualquer tabela nova que alguém esquecer de isolar quebra o CI/teste local na hora.

### 1.2. Resolução do tenant por request
- Multi-tenant é **por path**, não por subdomínio: `/t/:slug/...`. `server/tenantMiddleware.ts` (`extractTenantSlugFromRequest`, `resolveTenantContext`) resolve o slug da URL pra um `tenantId` real, uma vez por request.
- `server/_core/trpc.ts`: todo `publicProcedure` passa por um `tenantMiddleware` que roda a procedure inteira dentro de `tenantStorage.run({ tenantId }, next)` — usando `AsyncLocalStorage` do Node. Isso permite que qualquer função em `server/db.ts`/`server/crmDb.ts` chame `getCurrentTenantId()` (`server/tenantDb.ts`) sem precisar receber o tenantId como parâmetro explícito em toda assinatura de função.
- Consequência prática: **toda query de leitura/escrita nas camadas de dados (`db.ts`, `crmDb.ts`) já filtra por `getCurrentTenantId()` internamente** — não é responsabilidade de cada router lembrar de filtrar.
- Pontos que fogem desse fluxo (e por quê): o webhook do ASAAS (`server/webhooks.ts`, rota `/api/webhooks/asaas`) não tem slug na URL — o tenant é resolvido casando `payment.customer` com `tenants.asaasCustomerId`, e a partir daí a lógica roda dentro de `withTenantAsync(tenant.id, ...)` pra ainda usar as mesmas funções de dados tenant-aware.

### 1.3. Enforcement de plano e módulo
- `tenants.maxSellers` / `tenants.maxAdmins` — checados em `createSeller`/`createManager` (`server/db.ts`) antes de inserir, com erro claro pedindo upgrade de plano quando o limite bate.
- `tenants.enabledModules` (JSON) — `requireModule()` em `server/_core/trpc.ts` é um middleware que barra o acesso a um módulo (hoje aplicado como referência em Marketing; **ainda não estendido pros demais módulos**, ver documento 05).
- `getTenantLimits()`/`clearTenantLimitsCache()` (`server/tenantService.ts`) — cache em memória dos limites de cada tenant, invalidado toda vez que o plano muda (webhook de pagamento, troca de plano, cancelamento).

## 2. Autenticação unificada (login único por loja)

### 2.1. Um único formulário, múltiplos tipos de conta
- `client/src/pages/UnifiedLogin.tsx`, rota `/login` — é o formulário humano principal do sistema. Não pergunta papel nem loja: recebe e-mail e senha.
- `server/routers/tenantAuthRouter.ts` (`tenantAuth.loginByEmail`) resolve a identidade pelo e-mail e tenta autenticar na ordem **admin → gerente → vendedor**, com fallback separado para **super admin**.
- Cada tipo de conta emite seu próprio JWT (`admin_auth`, sessão de gerente, sessão de vendedor, token de super admin) e seu próprio redirect (`/admin`, `/gerente`, `/minha-area/:id`, `/pos-venda`, `/financeiro`, `/super-admin` conforme o papel).

### 2.2. Sessões: cookie vs. localStorage
- **Admin**: token JWT devolvido na resposta, guardado em `localStorage` (`crm_admin_token`) pelo frontend, mandado como Bearer/parâmetro em cada chamada.
- **Gerente e vendedor**: token em cookie `HttpOnly` (`manager_session`/`seller_session`), com opções calculadas por `getSessionCookieOptions()` (`server/_core/cookies.ts`).
- **Bug crítico corrigido nesta branch (Fase N)**: o cookie estava fixo em `SameSite=None`, que exige `Secure` — em desenvolvimento local (HTTP puro), o navegador descarta esse cookie silenciosamente, e a sessão de vendedor/gerente "funcionava" no login mas nunca ficava logada de fato. Corrigido pra `sameSite: secure ? "none" : "lax"`, calculado por `isSecureRequest(req)` (detecta HTTPS direto ou via `x-forwarded-proto` atrás de proxy).
- `getRequestOrigin(req)` (mesmo arquivo) foi adicionado depois, reaproveitando a mesma detecção de HTTPS, pra montar links absolutos em e-mail (reset de senha, boas-vindas) sem precisar de uma env var de URL fixa quando existe uma request de onde derivar o host.

### 2.3. "Esqueci minha senha" (self-service, Fase U)
Antes desta branch, só existia reset de senha feito **por um admin/super admin** (em massa ou individual) — nenhum usuário conseguia redefinir a própria senha sozinho.

Passo a passo do fluxo implementado:
1. Usuário clica "Esqueci minha senha" no login (`SellerLogin.tsx`) → vai pra `/t/:slug/esqueci-senha` (`client/src/pages/EsqueciSenha.tsx`).
2. Digita o e-mail → `passwordReset.requestReset` (`server/routers/passwordResetRouter.ts`) procura esse e-mail nas três tabelas (admin → gerente → vendedor, mesma ordem de prioridade do login).
3. Se achar uma conta ativa, gera um token aleatório de 32 bytes (`crypto.randomBytes`), guarda **só o hash SHA-256** dele em `password_reset_tokens` (nunca o token bruto — mesmo princípio de nunca guardar senha em texto puro), com expiração de 30 minutos.
4. Manda e-mail (`sendPasswordResetEmail`) com um link `/t/:slug/redefinir-senha?token=...`.
5. **Sempre devolve sucesso genérico**, exista ou não o e-mail — evita que alguém descubra quais e-mails estão cadastrados testando um por um.
6. Usuário abre o link → `client/src/pages/RedefinirSenha.tsx` lê o token da URL, usuário digita a nova senha → `passwordReset.confirmReset` valida hash + expiração + que o token pertence ao **mesmo tenant** da URL atual (um token gerado na loja A não funciona confirmando na loja B), troca a senha com `bcrypt.hash(senha, 10)` (mesmo custo usado no resto do app) e marca o token como usado (não reutilizável).
- Rate limit dedicado: `passwordResetLimiter` (5 pedidos/hora por loja+IP) em `/api/trpc/passwordReset.requestReset` (`server/_core/index.ts`), evita floodar caixa de entrada alheia.
- Paridade entre os três tipos de conta: `managers` não tinha coluna de e-mail (só `admins`/`sellers` tinham) — foi adicionada (`drizzle/schema.ts`, migration `0071`) especificamente pra viabilizar esse fluxo pra gerente também.

### 2.4. Cadastro self-service de loja nova (Fase Q)
- Rota pública `/comercial` (`client/src/pages/public/ComercialHome.tsx`, landing) → `/comercial/cadastro` (`ComercialCadastro.tsx`, formulário).
- `publicSignupRouter.create` (`server/routers/publicSignupRouter.ts`) provisiona a loja inteira numa chamada: cria o `tenant` (plano trial, limites mais apertados que o trial criado manualmente pelo Super Admin — 5 vendedores/1 admin), cria o admin dono, aplica as tabelas de seed (pipeline do CRM, categorias financeiras).
- Proteções: honeypot (campo invisível via CSS, bot que preenche tudo cai nele), rate limit dedicado (`signupLimiter`, 5 cadastros/hora por IP — não dá pra usar chave por-loja porque a loja ainda não existe nesse ponto).
- Devolve o mesmo formato de token que o login normal de admin devolveria — o frontend trata como login bem-sucedido e cai direto no painel da loja recém-criada.
- Desde a Fase V, dispara `sendSignupWelcomeEmail` (ver documento 03) confirmando a criação por e-mail.

### 2.5. Atualização — unificação de login e identidade do ator (leva de trabalho posterior)

- A afirmação da seção 2.1 evoluiu de novo numa leva posterior: o login por slug foi supersedido por `/login`, com resolução da loja pelo e-mail. As rotas antigas com slug foram mantidas apenas como redirecionamento compatível.
- O objeto de sessão (`ctx.user` em `server/_core/context.ts`) que representa admin/gerente/vendedor codificava o tipo do ator via sinal e offset numérico do `id` (ex: vendedor = `-(1000000 + seller.id)`). Isso escondia dois bugs reais (um deles neste próprio arquivo, em `resolveTenantId`). Substituído por um campo explícito `actorType` — ver [documento 08](08-refactor-identidade-actortype.md).

### 2.6. Roteamento e proteção de rotas novas (bug recorrente, cuidado ao adicionar rota)
- `client/src/components/AccessGate.tsx` mantém uma lista `BYPASS_ROUTES` + uma regex `isTenantBypassRoute` que decide quais caminhos **não** passam pelo gate de login legado.
- **Toda vez que uma rota pública/tenant nova foi adicionada nesta branch** (`/comercial`, `/assinatura`, `/esqueci-senha`, `/redefinir-senha`) ela precisou ser adicionada manualmente a essa lista — esquecer isso faz a rota nova cair no formulário de login antigo em vez de renderizar a página certa. Esse mesmo bug se repetiu 3 vezes ao longo da branch; ao criar uma rota pública nova, checar `AccessGate.tsx` primeiro.

## 3. Provisionamento de tenant

- `server/tenantProvisioning.ts` (`provisionTenant`, `checkSlugAndUsernameAvailability`) é compartilhado entre o Super Admin (criação manual de loja) e o cadastro self-service — extraído nesta branch pra não duplicar a lógica de criar tenant + seed + admin dono nos dois fluxos.
- Provisiona automaticamente uma linha em `crm_ai_global_config` (config do Atendente IA) pra loja nova — sem isso, salvar configuração de IA numa loja falharia silenciosamente (achado e corrigido na Fase U, ver documento 05 pra detalhe da migration que faltava).

## 4. Testes que garantem essa arquitetura

- [`server/tenant-security.test.ts`](../../server/tenant-security.test.ts) — schema tem `tenantId` em toda tabela esperada; `db.ts`/`crmDb.ts`/`finDb.ts` usam `getCurrentTenantId()` nas queries; middleware/contexto resolvem tenant corretamente; Super Admin usa JWT secret separado do resto do app.
- [`server/public-signup.test.ts`](../../server/public-signup.test.ts) — cadastro self-service cria loja com limites corretos, rejeita slug duplicado, isolamento de disponibilidade de slug/username entre lojas.
- [`server/password-reset.test.ts`](../../server/password-reset.test.ts) — fluxo completo de reset (pedir → e-mail → confirmar), token não reutilizável, expira, **e principalmente: token de uma loja não funciona confirmando em outra**.
- Um segundo tenant de teste real foi criado numa fase anterior desta branch especificamente pra validar isolamento cross-tenant fora de testes automatizados (dois tenants rodando lado a lado, verificado manualmente via `curl`).
