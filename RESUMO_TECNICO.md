# Kafka Rank — Resumo Técnico do Projeto

## Visão Geral

O **Kafka Rank** é um sistema completo de gestão e gamificação para uma loja de veículos multimarcas (Kafka Multimarcas). Ele abrange competições de vendas, CRM com integração WhatsApp, controle financeiro, pós-venda, estoque, agendamentos, F&I, despachante, consignação e muito mais.

**Domínio em produção:** [https://kafkarank.com](https://kafkarank.com)

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React + TypeScript | React 19, TS 5.9 |
| **Estilização** | Tailwind CSS + shadcn/ui | Tailwind 4 |
| **Roteamento (client)** | Wouter | 3.x |
| **State/Data Fetching** | TanStack React Query + tRPC | RQ 5, tRPC 11 |
| **Backend** | Node.js + Express + tRPC | Node 22, Express 4 |
| **ORM** | Drizzle ORM | 0.44 |
| **Banco de Dados** | MySQL (TiDB Cloud) | MySQL 8 compat |
| **Bundler** | Vite | 7.x |
| **Build Backend** | esbuild | 0.25 |
| **Testes** | Vitest | 2.x |
| **Gerenciador de Pacotes** | pnpm | 10.4 |
| **Deploy/Hosting** | Manus Cloud (Autoscale/Serverless) | Cloud Run |
| **Storage (S3)** | AWS S3 (via Manus Forge API) | — |
| **Autenticação** | Manus OAuth + JWT (vendedores/gerentes) | — |
| **Integração WhatsApp** | Z-API | — |
| **Integração Meta** | Meta Graph API (Lead Ads) | v21.0 |
| **IA/LLM** | Manus Forge LLM API | — |
| **Push Notifications** | Web Push (VAPID) | — |

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 19 + Tailwind 4 + shadcn/ui + Wouter + tRPC Client  │
│  (SPA servida pelo mesmo servidor Express)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (tRPC over /api/trpc)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  Express 4 + tRPC 11 (procedures tipadas end-to-end)        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐     │
│  │ routers.ts  │  │    db.ts     │  │  webhooks.ts   │     │
│  │ (3650 LOC)  │  │  (3861 LOC)  │  │  (Z-API/Meta)  │     │
│  └─────────────┘  └──────────────┘  └────────────────┘     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐     │
│  │ crmDb.ts    │  │  finDb.ts    │  │ tenantDb.ts    │     │
│  └─────────────┘  └──────────────┘  └────────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │ Drizzle ORM (mysql2)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                             │
│  MySQL 8 (TiDB Cloud) — 68 tabelas — Multi-tenant           │
└─────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐  ┌──────────┐  ┌──────────────┐
   │  AWS S3     │  │  Z-API   │  │  Meta Graph  │
   │  (storage)  │  │  (WhApp) │  │  (Lead Ads)  │
   └─────────────┘  └──────────┘  └──────────────┘
```

---

## Estrutura de Diretórios

```
kafka_sales_competition/
├── client/                    # Frontend React
│   ├── public/                # Arquivos estáticos (favicon, manifest, sw.js)
│   ├── src/
│   │   ├── pages/             # 27 páginas públicas
│   │   │   ├── admin/         # 26 páginas administrativas
│   │   │   └── crm/           # 8 páginas CRM
│   │   ├── components/        # Componentes reutilizáveis + shadcn/ui
│   │   ├── contexts/          # React Contexts (Auth, Theme)
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # tRPC client, utils
│   │   ├── App.tsx            # Rotas (60+ rotas)
│   │   ├── main.tsx           # Entry point + Providers
│   │   └── index.css          # Tema global (CSS variables)
│   └── index.html             # HTML template
├── server/                    # Backend
│   ├── _core/                 # Framework (NÃO EDITAR)
│   │   ├── index.ts           # Entry point do servidor
│   │   ├── context.ts         # tRPC context (auth)
│   │   ├── oauth.ts           # Manus OAuth
│   │   ├── env.ts             # Variáveis de ambiente
│   │   ├── llm.ts             # Helper LLM
│   │   ├── imageGeneration.ts # Helper geração de imagem
│   │   └── notification.ts    # Notificações owner
│   ├── routers.ts             # Procedures tRPC (3650 LOC)
│   ├── db.ts                  # Queries Drizzle (3861 LOC)
│   ├── crmDb.ts               # Queries CRM
│   ├── finDb.ts               # Queries Financeiro
│   ├── tenantDb.ts            # Multi-tenancy (AsyncLocalStorage)
│   ├── tenantMiddleware.ts    # Middleware tenant
│   ├── zapi-service.ts        # Integração Z-API (WhatsApp)
│   ├── webhooks.ts            # Webhooks (Z-API, Meta)
│   ├── pushService.ts         # Web Push notifications
│   ├── ai-attendant.ts        # IA atendente (SDR)
│   ├── alert-checker.ts       # Verificador de alertas
│   ├── storage.ts             # Helpers S3
│   └── *.test.ts              # 57 arquivos de teste
├── drizzle/                   # Schema + Migrations
│   ├── schema.ts              # 68 tabelas MySQL (1452 LOC)
│   ├── meta/                  # Metadata Drizzle
│   └── *.sql                  # 63 migrations
├── shared/                    # Tipos compartilhados
├── patches/                   # Patches de dependências
├── package.json               # Dependências e scripts
├── tsconfig.json              # Configuração TypeScript
├── vite.config.ts             # Configuração Vite
├── drizzle.config.ts          # Configuração Drizzle Kit
└── todo.md                    # Tracking de features
```

---

## Métricas do Projeto

| Métrica | Valor |
|---------|-------|
| Total de linhas de código (TS/TSX) | ~84.000 |
| Arquivos frontend (.tsx) | 137 |
| Arquivos backend (.ts) | 101 |
| Arquivos de teste (.test.ts) | 57 |
| Tabelas no banco | 68 |
| Migrations SQL | 63 |
| Rotas no frontend | 60+ |
| Páginas React | 61 |

---

## Módulos Funcionais

| Módulo | Descrição |
|--------|-----------|
| **Competições/Ranking** | Gamificação de vendas com pista de corrida, pódio, alertas ao vivo |
| **Vendas** | Registro, aprovação, pontuação, metas mensais |
| **F&I** | Fichas de financiamento, bancos, retornos |
| **Despachante** | Transferências, documentos, status de transferência |
| **Consignação** | Controle de pátio, regra 7 dias, entrada/saída |
| **Agendamentos** | Cadastro, comparecimento, resgate 48h, contagem regressiva |
| **CRM** | Pipeline de leads, distribuição, integração WhatsApp/Meta |
| **Financeiro** | Contas a pagar/receber, categorias, DRE |
| **Pós-Venda** | Chamados, oficinas, orçamentos, gastos |
| **Estoque** | Veículos, scraping automático, FIPE |
| **Marketing** | Estratégias, tarefas, campanhas |
| **IA Atendente** | SDR automático via WhatsApp (Z-API + LLM) |
| **Modo TV** | Dashboard para TV da loja com ranking ao vivo |
| **Multi-Tenant** | Suporte a múltiplas lojas com isolamento de dados |

---

## Banco de Dados

- **Tipo:** MySQL 8 (hospedado no TiDB Cloud)
- **ORM:** Drizzle ORM com schema declarativo
- **Multi-tenancy:** Implementado via `tenantId` em todas as tabelas + AsyncLocalStorage
- **Migrations:** Geradas via `pnpm drizzle-kit generate`, aplicadas via `webdev_execute_sql`

### Tabelas Principais (68 total)

- `users`, `sellers`, `managers`, `admins` — Autenticação e perfis
- `competitions`, `teams`, `competition_participants` — Gamificação
- `sales`, `fei_records`, `consignment_records`, `dispatch_records`, `sdr_records` — Registros por setor
- `crm_leads`, `crm_messages`, `crm_pipeline_stages`, `crm_activities` — CRM
- `fin_categories`, `fin_transactions` — Financeiro
- `pv_chamados`, `pv_gastos`, `pv_orcamentos` — Pós-Venda
- `inventory_vehicles` — Estoque
- `goals`, `notifications`, `push_subscriptions` — Metas e notificações
- `tenants` — Multi-tenancy

---

## Autenticação

O sistema possui **3 níveis de autenticação**:

1. **Dono (Owner):** Manus OAuth — acesso total
2. **Gerentes:** Login por usuário/senha (JWT) — acesso admin completo
3. **Vendedores/Colaboradores:** Login por usuário/senha (JWT) — acesso à "Minha Área" do setor

---

## Integrações Externas

| Integração | Finalidade | Configuração |
|------------|-----------|--------------|
| **Z-API** | WhatsApp Business (envio/recebimento de mensagens) | `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN` |
| **Meta Graph API** | Lead Ads do Facebook/Instagram | Webhook + Page Access Token |
| **Manus Forge LLM** | IA atendente, frases motivacionais, planos de ação | `BUILT_IN_FORGE_API_KEY` (automático) |
| **AWS S3** | Upload de fotos, vídeos, documentos | Via Manus Forge (automático) |
| **Web Push (VAPID)** | Notificações push iOS/Android | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |

---

## Repositório e Versionamento

### Situação Atual

O código está versionado via **Git interno do Manus** (não há repositório GitHub/GitLab externo configurado):

```
origin  s3://vida-prod-gitrepo/webdev-git/310419663028900346/NKs9YYU4Bt79zUwnWH56wx
```

### Como Exportar para GitHub

No painel de gerenciamento do Manus:
1. Acesse **More (⋯) → GitHub**
2. Escolha o owner e nome do repositório
3. O código será exportado para um repositório GitHub

### Como Clonar (após exportar para GitHub)

```bash
# 1. Clonar o repositório
git clone https://github.com/<org>/kafka_sales_competition.git
cd kafka_sales_competition

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente (.env na raiz)
DATABASE_URL=mysql://user:pass@host:port/database?ssl={"rejectUnauthorized":true}
JWT_SECRET=<secret>
VITE_APP_ID=<manus_app_id>
OAUTH_SERVER_URL=https://api.manus.im
OWNER_OPEN_ID=<owner_id>
ZAPI_INSTANCE_ID=<z-api-instance>
ZAPI_TOKEN=<z-api-token>
ZAPI_CLIENT_TOKEN=<z-api-client-token>
BUILT_IN_FORGE_API_URL=<forge-url>
BUILT_IN_FORGE_API_KEY=<forge-key>

# 4. Rodar em desenvolvimento
pnpm dev

# 5. Build para produção
pnpm build
pnpm start

# 6. Rodar testes
pnpm test

# 7. Verificar TypeScript
pnpm check
```

---

## Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| Dev | `pnpm dev` | Inicia servidor de desenvolvimento (hot reload) |
| Build | `pnpm build` | Build de produção (Vite + esbuild) |
| Start | `pnpm start` | Inicia servidor de produção |
| Check | `pnpm check` | Verificação TypeScript (sem emitir) |
| Test | `pnpm test` | Executa testes com Vitest |
| Format | `pnpm format` | Formata código com Prettier |
| DB Generate | `pnpm drizzle-kit generate` | Gera migrations SQL |

---

## Fluxo de Desenvolvimento

```
1. Alterar schema → drizzle/schema.ts
2. Gerar migration → pnpm drizzle-kit generate
3. Aplicar SQL → via webdev_execute_sql ou cliente MySQL
4. Criar/editar queries → server/db.ts (ou crmDb.ts, finDb.ts)
5. Criar/editar procedures → server/routers.ts
6. Criar/editar UI → client/src/pages/
7. Escrever testes → server/*.test.ts
8. Rodar testes → pnpm test
9. Verificar tipos → pnpm check
```

---

## Padrões de Código

- **tRPC-first:** Toda comunicação frontend↔backend é via tRPC (nunca fetch/axios direto)
- **Superjson:** Serialização automática de Date, BigInt, etc.
- **Procedures tipadas:** `publicProcedure` (qualquer um) vs `protectedProcedure` (autenticado)
- **Zod validation:** Inputs validados com Zod em todas as procedures
- **Drizzle ORM:** Queries tipadas, sem SQL raw (exceto migrations)
- **shadcn/ui:** Componentes UI consistentes (Button, Card, Dialog, etc.)
- **Tailwind 4:** Estilização via classes utilitárias
- **Multi-tenant:** Todas as queries filtram por `tenantId` automaticamente

---

## Deploy e Hosting

- **Plataforma:** Manus Cloud (Cloud Run — Autoscale/Serverless)
- **Domínios:**
  - `kafkarank.com` (principal)
  - `www.kafkarank.com`
  - `kafkasales-nks9yyu4.manus.space` (staging)
- **SSL:** Automático
- **Processo:** Checkpoint → Publish no painel Manus

---

## Observações Importantes para Novos Desenvolvedores

1. **NÃO editar** arquivos em `server/_core/` — é infraestrutura do framework
2. **NÃO colocar** imagens/vídeos em `client/public/` — usar S3 via `storagePut()`
3. **NÃO usar** fetch/axios no frontend — sempre tRPC
4. **NÃO hardcodar** porta do servidor — usar `process.env.PORT`
5. O arquivo `server/routers.ts` é o coração do backend (3650 linhas) — considere split em módulos
6. O arquivo `server/db.ts` contém todas as queries (3861 linhas) — idem
7. Multi-tenancy é transparente via `getCurrentTenantId()` no AsyncLocalStorage
8. Testes rodam com Vitest e mocam o banco — ver `server/auth.logout.test.ts` como referência
9. O projeto usa **pnpm** (não npm/yarn) — respeitar o lockfile
10. Variáveis de ambiente são injetadas automaticamente em produção pelo Manus Cloud

---

## Contato e Acesso

- **Produção:** https://kafkarank.com
- **Painel Admin:** Login via OAuth (dono) ou usuário/senha (gerente)
- **Código:** Exportar via GitHub no painel Manus (Settings → GitHub)
- **Banco:** Acessível via painel Database no Manus (Settings → conexão com SSL)
