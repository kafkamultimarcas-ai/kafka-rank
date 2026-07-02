# Kafka Rank Multi-Tenant SaaS

## CAPABILITY

Kafka Rank deve evoluir de uma aplicação centrada na loja principal para uma plataforma SaaS multi-tenant vendável para múltiplas lojas, onde cada loja possui identidade própria, usuários próprios, integrações próprias e isolamento rígido de dados. Após essa entrega, uma nova loja poderá ser criada pelo Super Admin, receber sua URL de acesso, seu branding, seus administradores, suas credenciais de integração e operar no mesmo produto sem risco de vazamento entre tenants.

## CONSTRAINTS

- O sistema já possui base multi-tenant no banco, com `tenantId` em grande parte das tabelas de negócio e tabela `tenants` com `slug`, branding, plano, módulos e credenciais.
- A borda do sistema ainda não é tenant-aware de forma confiável. Quando o tenant não é conhecido, o backend cai em `tenantId = 1`.
- O login de admin CRM e vendedor depende do tenant atual antes mesmo do login, então o fluxo de entrada precisa resolver o tenant antes da autenticação.
- O frontend ainda está fortemente acoplado à marca Kafka Rank / Kafka Multimarcas.
- Existem integrações externas e webhooks que hoje podem depender implicitamente do tenant padrão.
- A migração precisa preservar a loja atual como tenant legado sem quebrar operação em produção.
- A solução deve escalar para dezenas ou centenas de lojas sem exigir criação manual de rotas por loja.

## CURRENT STATE

### O que já existe

- Tabela `tenants` com:
  - `slug`
  - `logoUrl`
  - `primaryColor` / `secondaryColor`
  - `plan`
  - `maxSellers` / `maxAdmins`
  - `enabledModules`
  - `zapiInstanceId` / `zapiToken` / `zapiClientToken`
  - `status`
- Resolução de tenant no contexto tRPC com `tenantId` por request.
- Uso extensivo de `getCurrentTenantId()` em `db.ts`, `crmDb.ts` e `finDb.ts`.
- Portal Super Admin com criação e edição de tenants.
- Lookup de tenant por slug no backend.

### O que está incompleto ou arriscado

- Fallback para `tenantId = 1` quando o tenant não é resolvido.
- Rotas de acesso ainda globais (`/login-vendedor`, `/crm/admin/login`, `/admin`).
- Branding hardcoded em várias telas e textos de widget/WhatsApp.
- Login admin CRM e vendedor ainda não recebem tenant explicitamente na borda.
- Webhooks e integrações não possuem um protocolo claro e universal para identificar tenant antes do processamento.
- Algumas automações e textos operacionais ainda citam Kafka Multimarcas.

## RECOMMENDED ARCHITECTURE

### Decisão principal

A recomendação é adotar **URL por tenant via slug em path** na primeira fase:

- `/t/:tenantSlug/login`
- `/t/:tenantSlug/admin/login`
- `/t/:tenantSlug/crm`
- `/t/:tenantSlug/app/...`

Essa é a melhor opção para o estado atual do projeto porque:

- reaproveita o `slug` já existente;
- evita dependência inicial de DNS e wildcard subdomain;
- exige menos mudança de infraestrutura;
- encaixa naturalmente no roteamento atual do frontend;
- permite futura migração para subdomínio sem refatorar o domínio de negócio.

### Evolução futura

Depois da estabilização, o sistema pode aceitar também:

- `https://loja1.kafkarank.com`
- `https://loja2.kafkarank.com`

Internamente, a regra de resolução de tenant deve suportar múltiplas fontes:

1. `tenantSlug` na URL
2. subdomínio
3. header assinado para integrações
4. fallback explícito apenas para compatibilidade controlada

O tenant nunca deve mais ser inferido silenciosamente para `1` em fluxos críticos.

## IMPLEMENTATION CONTRACT

### Actors

- Super Admin
- Admin da loja
- Gerente da loja
- Vendedor da loja
- Integrações externas da loja
- Sistema de background/jobs/webhooks

### Surfaces

- Frontend React
- tRPC API
- Middleware de tenant
- Autenticação admin/seller/OAuth
- Webhooks
- Widget embedável
- WhatsApp / Z-API
- Super Admin portal

### Required states

- `TenantProvisioned`
  - tenant criado no banco com slug, status, limites, módulos e branding mínimo
- `TenantAccessible`
  - rotas da loja resolvem corretamente o tenant
- `TenantAuthenticated`
  - logins de admin/vendedor ocorrem no contexto do tenant correto
- `TenantIntegrated`
  - integrações usam credenciais da própria loja
- `TenantBranded`
  - login, CRM, widget e páginas públicas respeitam identidade da loja
- `TenantOperable`
  - loja consegue operar módulos habilitados sem tocar dados de outra loja

### Tenant resolution contract

Toda request deve sair da borda com `tenantContext` explícito:

```ts
type TenantContext = {
  tenantId: number;
  tenantSlug: string;
  source: "path" | "subdomain" | "token" | "session";
};
```

Regras:

- Rotas web autenticáveis devem resolver tenant por slug ou subdomínio antes de consultar usuários.
- Sessões/JWTs devem carregar `tenantId` e `tenantSlug`.
- Webhooks devem identificar tenant via token próprio, slug explícito ou credencial vinculada ao tenant.
- Requests sem tenant resolvido devem falhar com erro claro em fluxos críticos.

## ROUTING AND ACCESS MODEL

### Melhor opção recomendada

Usar a mesma tela base, mas dentro de um contexto de tenant:

- `kafkarank.com/t/loja1/login`
- `kafkarank.com/t/loja1/admin/login`
- `kafkarank.com/t/loja2/login`

### Por que não criar URLs fixas como `/loja1-login`

- não escala;
- gera manutenção manual a cada loja nova;
- mistura tenant routing com definição de rota estática;
- dificulta evolução para subdomínio ou white-label.

### UX recomendada

- A URL da loja já define contexto e branding.
- A tela de login é compartilhada como componente.
- Se o usuário acessar a home raiz `kafkarank.com`, o sistema pode:
  - mostrar página institucional;
  - permitir busca/seletor de loja;
  - ou redirecionar para um fluxo “encontre sua loja”.

## AUTHENTICATION DESIGN

### Admin CRM

Hoje:

- `adminAuth.login` consulta admin dentro do tenant corrente.
- O tenant corrente antes do login não é confiável quando a entrada é global.

Alvo:

- `adminAuth.login` deve receber `tenantSlug` ou operar dentro de uma rota já tenant-resolved.
- O token deve conter:

```ts
{
  adminId: number;
  tenantId: number;
  tenantSlug: string;
  role: "owner" | "admin";
  type: "admin_auth";
}
```

- `adminAuth.me` deve validar consistência entre token e tenant atual.

### Seller login

Alvo:

- o login deve acontecer apenas dentro do tenant resolvido;
- a busca por username deve ser sempre filtrada pelo tenant correto;
- o cookie/session do vendedor deve carregar `tenantId` e `tenantSlug`.

### OAuth

Se o OAuth continuar existindo para áreas específicas:

- o vínculo do usuário com tenant deve ser explícito;
- se um usuário puder existir em mais de um tenant, o modelo precisará de tabela relacional própria;
- se não houver esse requisito, manter `users.tenantId` como fonte única.

## DATA MODEL CHANGES

### Obrigatórias

- Garantir que `admins` esteja sempre com `tenantId` válido e não nulo.
- Adicionar índices compostos nos principais pontos de lookup:
  - `admins(tenantId, username)`
  - `sellers(tenantId, username)`
  - `crm_integrations(tenantId, apiToken)`
  - `tenants(slug)`
- Garantir unicidade por tenant onde fizer sentido:
  - username de vendedor único por tenant
  - username de admin único por tenant

### Recomendadas

- Criar tabela de auditoria de provisionamento de tenant.
- Criar tabela ou campo estruturado para configuração de domínio customizado por tenant, se isso entrar no roadmap.
- Avaliar criptografia de segredos por tenant para Z-API e futuras integrações.

## BACKEND CHANGES

### 1. Tenant resolver central

Criar um resolvedor único para Express/tRPC com esta ordem:

1. slug em path
2. subdomínio
3. token de integração
4. JWT/cookie com `tenantId`
5. fallback legado controlado apenas em endpoints explicitamente permitidos

### 2. Remover fallback silencioso

Substituir comportamento atual de “default 1” por:

- erro `TENANT_NOT_RESOLVED` em auth, CRM, webhooks e integrações;
- modo legado temporário apenas para rotas antigas durante migração;
- logging estruturado sempre que o sistema cair no modo legado.

### 3. Context e middleware

- adicionar `tenantSlug` ao contexto;
- validar coerência entre tenant da sessão e tenant resolvido pela rota;
- rejeitar sessão de tenant A acessando rota de tenant B.

### 4. Webhooks

Padronizar identificação do tenant:

- Meta/Google/form generic: token de integração vinculado a um tenant;
- WhatsApp: credencial ou endpoint específico da loja;
- widget público: slug obrigatório no path ou token público de widget vinculado ao tenant.

Exemplo:

- `/api/t/:tenantSlug/webhooks/widget/lead`
- `/api/t/:tenantSlug/webhooks/whatsapp`

ou, alternativamente:

- `/api/webhooks/widget/:tenantSlug`

### 5. Serviços externos

- Z-API já tem base tenant-aware, mas todos os chamadores devem passar `tenantId` correto;
- textos gerados dinamicamente devem usar nome/branding do tenant atual;
- o widget embutido deve renderizar nome, cor e copy da loja.

## FRONTEND CHANGES

### Routing

Migrar de rotas globais para rotas tenantizadas:

- `/t/:slug/login`
- `/t/:slug/admin/login`
- `/t/:slug/crm/admin`
- `/t/:slug/minha-area/:sellerId`

### Tenant bootstrap

Ao carregar uma rota tenantizada:

1. buscar dados públicos do tenant por slug;
2. armazenar tenant context em provider;
3. aplicar branding;
4. renderizar páginas com identidade da loja.

### Branding provider

Criar `TenantBrandingProvider` com:

- `tenant.name`
- `tenant.logoUrl`
- `tenant.primaryColor`
- `tenant.secondaryColor`
- `tenant.enabledModules`

Aplicar em:

- login vendedor
- login admin
- widget
- telas de CRM
- cabeçalhos e textos institucionais

### Module gating

Usar `enabledModules` no frontend e backend:

- esconder navegação de módulos desabilitados no frontend;
- bloquear acesso real no backend.

## SECURITY AND ISOLATION

### Non-negotiable rules

- Nenhum fluxo autenticado deve operar sem tenant resolvido.
- Todo JWT/cookie interno deve carregar `tenantId`.
- Todo token deve ser validado contra tenant da rota/contexto.
- Toda integração externa deve ser mapeável a um único tenant.
- Logs de erro devem registrar `tenantId`, `tenantSlug`, `requestId` e origem de resolução.

### Critical risks

- Vazamento cross-tenant por fallback para tenant 1.
- Webhooks processados no tenant errado.
- Sessão válida de uma loja usada em URL de outra.
- Branding incorreto dando falsa percepção de isolamento.

### Recommended hardening

- Criptografar segredos por tenant.
- Adicionar testes de segurança cross-tenant para auth, CRM, financeiro, webhooks e uploads.
- Adicionar rate limit por tenant e por IP em logins e webhooks.

## MIGRATION STRATEGY

### Phase 0 - Observability first

- Instrumentar logs de resolução de tenant.
- Mapear endpoints ainda dependentes de fallback.
- Confirmar tenant legado atual como baseline.

### Phase 1 - Tenant routing foundation

- Criar tenant resolver unificado.
- Adicionar suporte a `/t/:slug/...`.
- Criar provider público de branding.
- Manter rotas antigas funcionando em paralelo.

### Phase 2 - Auth hardening

- Refatorar login admin e seller para exigir tenant resolvido.
- Incluir `tenantId` e `tenantSlug` em tokens.
- Validar coerência rota/token/sessão.

### Phase 3 - Webhooks and integrations

- Tenantizar widget e endpoints externos.
- Revisar Z-API, Meta, Google, generic lead, email parser.
- Eliminar dependência de tenant padrão nesses fluxos.

### Phase 4 - Branding and UX

- Remover hardcodes de Kafka Rank / Kafka Multimarcas.
- Aplicar branding dinâmico nas telas de entrada e CRM.
- Criar landing root com seletor de loja ou discovery flow.

### Phase 5 - SaaS operations

- Finalizar onboarding automatizado de tenant.
- Adicionar status operacional por loja.
- Adicionar relatórios de uso e suporte no Super Admin.

## TEST STRATEGY

### Unit

- tenant resolver
- parser de slug/subdomínio
- consistência token x tenant
- branding provider

### Integration

- login admin por tenant
- login seller por tenant
- CRUD CRM isolado por tenant
- financeiro isolado por tenant
- widget e webhooks roteando para tenant correto

### E2E

- criação de tenant no Super Admin
- acesso via URL da loja
- login admin da loja
- cadastro de vendedor
- criação de lead
- envio/recepção de WhatsApp
- tentativa de acessar tenant errado com sessão válida

## NON-GOALS

- White-label completo com domínio customizado nesta primeira fase
- Billing recorrente automatizado com gateway de pagamento
- Multi-tenant com banco separado por loja
- Marketplace de plugins por tenant
- Reescrita total do sistema de auth

## OPEN QUESTIONS

- O acesso institucional na raiz será público, seletor de loja ou redirect?
- Admin da loja e vendedor usarão sempre URL própria da loja ou também haverá “busca de loja” por nome/CNPJ?
- O OAuth ainda é parte central da operação futura ou ficará restrito a backoffice?
- Haverá necessidade de um mesmo usuário operar em mais de uma loja?
- O roadmap inclui domínio próprio por loja no curto prazo?
- Quais integrações externas precisam ser SaaS-ready já no MVP comercial?

## HANDOFF

Status recomendado: **ready for implementation after architecture review**.

Próximos trilhos sugeridos:

1. `tdd-workflow`
2. `security-review`
3. `verification-loop`

## SENIOR IMPLEMENTATION PLAN

### Sprint 1

- Criar `tenant resolver` único para path/session/token.
- Introduzir novas rotas `/t/:slug/...`.
- Criar `TenantProvider` no frontend.
- Expor endpoint público de bootstrap do tenant.

### Sprint 2

- Refatorar `adminAuth` e `seller login`.
- Incluir `tenantId` em JWTs.
- Bloquear inconsistência entre tenant da URL e tenant da sessão.
- Adicionar testes de auth cross-tenant.

### Sprint 3

- Tenantizar widget, WhatsApp e webhooks de leads.
- Revisar integrações por token/credencial.
- Remover referências hardcoded de Kafka Multimarcas.

### Sprint 4

- Completar branding dinâmico.
- Gating por módulos habilitados.
- Melhorias de onboarding no Super Admin.
- Documentar runbook operacional de criação de nova loja.

## ACCEPTANCE CRITERIA

- Uma nova loja pode ser criada no Super Admin e recebe slug próprio.
- A loja acessa o sistema por URL própria sem conflito com outras lojas.
- Login admin e vendedor só funcionam dentro do tenant correto.
- Nenhuma consulta de negócio crítica depende de fallback implícito para tenant 1.
- Branding da loja aparece nas telas de login e CRM.
- Integrações e webhooks operam usando credenciais/configurações da própria loja.
- Testes cross-tenant cobrem autenticação, CRM e integrações principais.
