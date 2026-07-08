# Status do Multitenant para QA

## Resumo executivo

O projeto já tem uma base multitenant funcional e testável localmente. O fluxo principal já existe, com login unificado em `/login`, contexto de tenant no backend, isolamento de sessão, webhooks tenant-aware, storage com prefixo por tenant, limites de plano e portal separado de Super Admin.

Hoje o status é adequado para:

- homologação interna
- rodada de QA funcional
- piloto controlado com lojas de teste

Hoje ainda não considero como 100% finalizado para rollout irrestrito sem nova rodada de validação operacional.

## Percentual estimado

- Pronto para QA: `85% a 90%`
- Pronto para produção final sem ressalvas: `70% a 75%`

Essa diferença existe porque o núcleo multitenant está bom, mas ainda há pendências em áreas adjacentes, testes legados e itens operacionais fora do fluxo feliz.

## O que já foi entregue

### Base de tenant

1. Resolução de tenant por slug e contexto de requisição
2. Propagação via `AsyncLocalStorage`
3. Contexto tRPC tenant-aware
4. Rotas frontend com `/t/:slug/...`

### Autenticação

1. Login humano oficial em `/login`
2. Retorno padronizado com papel, permissões e redirect
3. Separação do portal `/super-admin`
4. Validação de coerência entre sessão e tenant da URL

### Isolamento de dados

1. Correção de hardcodes relevantes de `tenantId`
2. Webhooks com resolução explícita de tenant
3. Push, notificações e links principais ajustados para slug
4. Uploads com prefixo `t/<tenantId>/`
5. Índices de `tenantId` no banco

### Operação SaaS

1. CRUD de tenants no Super Admin
2. Seed de tenants de teste
3. Limites de plano para vendedores e admins
4. Base para gate de módulos
5. Healthcheck e melhorias de segurança em credenciais

## O que validei nesta branch

### Passou

- `pnpm build`
- `pnpm exec tsc --noEmit`
- bateria multitenant focal com 85 testes passando

### Suíte completa

Rodando `pnpm test -- --fileParallelism=false`:

- 69 arquivos de teste
- 65 arquivos passaram
- 4 arquivos falharam
- 752 testes passaram
- 10 testes falharam

## Falhas atuais da suíte completa

### Não bloqueiam a validação do multitenant

1. `server/zapi.test.ts`
   Falha por ausência de credenciais reais de Z-API no `.env` local.

2. `server/meta-security.test.ts`
   Tem timeout em testes legados pesados. Indica necessidade de ajuste de timeout ou refino do teste, não regressão clara do multitenant.

3. `server/crm.test.ts`
   Espera stages seeded para `pre_vendas` e `consignacao` no tenant local. Hoje o seed local não garante isso.

### Gap real fora do núcleo multitenant

1. `server/ai-attendant.test.ts`
   Aponta ausência de tabelas usadas pelo Atendente IA:
   - `crm_ai_global_config`
   - `ai_appointments`

Isso é um gap real de schema/feature paralela, mas não invalida a entrega do multitenant base.

## Essencial que ainda falta

### Antes de chamar de completo

1. Fechar a auditoria do fluxo de IA com SQL raw e garantir filtro explícito por tenant em todos os pontos restantes.
2. Expandir o gate de módulos para os demais domínios além do marketing.
3. Consolidar mais testes de regressão manual nas áreas CRM, financeiro, pós-venda e estoque em mais de um tenant.
4. Limpar mais resíduos antigos de texto e acentuação em telas menos centrais.

### Antes de produção mais ampla

1. Error tracking com `tenantId`
2. Política de desativação e exclusão de tenant
3. Onboarding automatizado de credenciais da loja
4. Nova rodada de revisão de webhooks e integrações externas em ambiente staging

## Conclusão prática

Sim, já existe uma versão boa o suficiente para rodar localmente e iniciar QA.

A leitura mais honesta hoje é:

- multitenant funcional: sim
- pronto para teste/homologação: sim
- pronto para rollout final sem mais uma rodada: ainda não

O fluxo que deve ser tratado como oficial na validação é:

- loja acessa `http://localhost:3000/login`
- plataforma acessa `http://localhost:3000/super-admin`

## Passo a passo curto para QA local

```powershell
docker start kafka-mysql
pnpm install
pnpm db:push
pnpm seed:demo-tenant
pnpm seed:second-tenant
pnpm dev
```

Depois:

1. teste `http://localhost:3000/super-admin`
2. teste `http://localhost:3000/login`
3. valide os usuários de `loja-demo` e `auto-veloz` nesse mesmo `/login`
4. valide redirecionamentos por papel
5. valide isolamento cruzado entre as duas lojas

## Credencial padrão dos seeds

Todos os usuários criados pelos seeds locais usam a mesma senha:

- `senha123`

## Depois disso, use senha123 para todos os usuários seedados, inclusive:

- super@local.test
- admin@kafka-multimarcas.local
- admin@loja-demo.local
- gerente@loja-demo.local
- vendedor@loja-demo.local
- gerente-painel@loja-demo.local
- financeiro@loja-demo.local
- posvenda@loja-demo.local
- admin@auto-veloz.local
- gerente@auto-veloz.local
- vendedor@auto-veloz.local
- gerente-painel@auto-veloz.local
- pedrofelipe@loja-sp.local

Após alterar isso, rode novamente:

```powershell
pnpm seed:demo-tenant
pnpm seed:second-tenant
```
