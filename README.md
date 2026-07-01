# Kafka Rank

**Sistema completo de gestão, competição e CRM para revendas de veículos.**

Kafka Rank é uma plataforma SaaS multi-tenant desenvolvida para lojas de veículos seminovos. O sistema gerencia vendas, agendamentos, ranking de vendedores, feirões, despachante, F&I, consignação, estoque, financeiro, pós-venda e CRM com WhatsApp integrado.

---

## Visão Geral

| Aspecto | Detalhe |
|---|---|
| **Frontend** | React 19 + TypeScript 5.9 + Tailwind CSS 4 + shadcn/ui |
| **Backend** | Node.js 22 + Express 4 + tRPC 11 |
| **Banco de Dados** | MySQL 8 (TiDB Cloud) com Drizzle ORM |
| **Autenticação** | OAuth2 (Manus Auth) + JWT Sessions |
| **Testes** | Vitest (57+ arquivos de teste) |
| **Comunicação** | Z-API (WhatsApp Business) |
| **Deploy** | Manus Cloud (Autoscale/Serverless) |
| **Domínio** | [kafkarank.com](https://kafkarank.com) |

---

## Módulos do Sistema

### Vendas e Competição
- Ranking de vendedores com gamificação (troféus, medalhas, posições)
- Competições por edição (feirões) com metas individuais e coletivas
- Registro de vendas com aprovação por gerente
- Central de Resultados consolidada

### Agendamentos
- Agendamento de clientes por vendedores e SDRs
- Controle de comparecimento (veio / não veio / pendente)
- Resgate de leads 48h+ sem retorno

### F&I (Financiamento e Seguros)
- Registro de fichas de financiamento por banco
- Controle de valores financiados e aprovações
- Simulador de financiamento integrado

### Despachante
- Controle de documentação veicular
- Status de transferência (aguardando → recebido → em transferência → transferido)
- Integração com fluxo de vendas

### Consignação
- Controle de veículos consignados (entrada/saída do pátio)
- Registro de proprietários e condições

### Estoque
- Sincronização automática com site (LitoralCar)
- Galeria de fotos por veículo
- Controle de custos por veículo
- Veículos bônus

### Financeiro
- Contas a pagar e a receber
- Fluxo de caixa por categoria
- Comissões de vendedores
- Adiantamentos

### Pós-Venda
- Chamados de clientes
- Orçamentos com itens detalhados
- Oficinas parceiras
- Histórico de atendimentos

### CRM com WhatsApp
- Integração Z-API (envio/recepção de mensagens)
- IA Atendente com qualificação automática de leads
- Pipeline de vendas (Kanban)
- Disparo em massa
- Importação de contatos/chats
- Leads de portais (Webmotors, OLX, iCarros) via email-parser
- Leads de Meta (Instagram/Facebook) e Google Ads via webhooks

### Gestão de Equipe
- Painel do Gerente com mentoria IA
- Planos de ação por vendedor
- Treinamentos
- Metas mensais configuráveis

### Multi-Tenant (SaaS)
- Isolamento completo de dados por loja
- Super Admin para gerenciar tenants
- Configuração independente de WhatsApp por loja
- Portal de login separado por tenant

---

## Estrutura do Projeto

```
kafka-rank/
├── client/                    # Frontend React
│   ├── public/                # Arquivos estáticos (favicon, robots.txt)
│   └── src/
│       ├── components/        # Componentes reutilizáveis (shadcn/ui)
│       ├── contexts/          # React Contexts (Auth, Theme)
│       ├── hooks/             # Custom hooks
│       ├── lib/               # Utilitários (tRPC client, utils)
│       └── pages/             # Páginas organizadas por módulo
│           ├── admin/         # Painel administrativo (30+ telas)
│           └── crm/           # CRM e WhatsApp (8 telas)
├── server/                    # Backend Node.js
│   ├── _core/                 # Framework (OAuth, context, LLM, etc.)
│   ├── routers/               # tRPC routers por domínio
│   ├── db.ts                  # Query helpers (Drizzle)
│   ├── routers.ts             # Router principal tRPC
│   ├── webhooks.ts            # Webhooks (WhatsApp, SIG, Meta, Google)
│   ├── zapi-service.ts        # Integração Z-API (WhatsApp)
│   ├── ai-attendant.ts        # IA Atendente WhatsApp
│   ├── inventory-scraper.ts   # Sincronização de estoque
│   └── alert-checker.ts       # Verificador de alertas
├── drizzle/                   # Schema e migrações do banco
│   ├── schema.ts              # 68 tabelas definidas
│   └── migrations/            # SQL de migrações
├── shared/                    # Tipos e constantes compartilhados
├── package.json
├── tsconfig.json
├── vite.config.ts
└── drizzle.config.ts
```

---

## Pré-requisitos

- **Node.js** >= 22.x
- **pnpm** >= 9.x
- **MySQL 8** (ou TiDB Cloud)
- **Conta Z-API** (para WhatsApp) — opcional

---

## Instalação e Configuração

### 1. Clonar o repositório

```bash
git clone https://github.com/kafkamultimarcas-ai/kafka-rank.git
cd kafka-rank
```

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# === OBRIGATÓRIAS ===

# Banco de dados MySQL (TiDB ou MySQL 8 local)
DATABASE_URL="mysql://usuario:senha@host:porta/database?ssl={\"rejectUnauthorized\":true}"

# Segredo para assinar cookies JWT
JWT_SECRET="sua-chave-secreta-aleatoria-aqui"

# OAuth (Manus Auth) - necessário para login
VITE_APP_ID="seu-app-id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://id.manus.im"

# Dono do sistema
OWNER_OPEN_ID="open-id-do-owner"
OWNER_NAME="Nome do Owner"

# === OPCIONAIS (funcionalidades extras) ===

# Z-API (WhatsApp Business)
ZAPI_INSTANCE_ID="sua-instancia"
ZAPI_TOKEN="seu-token"
ZAPI_CLIENT_TOKEN="seu-client-token"
ZAPI_API_URL="https://api.z-api.io"

# LLM (IA Atendente, Mentoria, etc.)
BUILT_IN_FORGE_API_URL="url-da-api-llm"
BUILT_IN_FORGE_API_KEY="chave-da-api-llm"

# Push Notifications (Web Push)
VAPID_PUBLIC_KEY="chave-publica-vapid"
VAPID_PRIVATE_KEY="chave-privada-vapid"
```

### 4. Configurar o banco de dados

O schema possui 68 tabelas. Para criar todas:

```bash
# Gerar migrações a partir do schema
pnpm drizzle-kit generate

# Aplicar migrações no banco
pnpm drizzle-kit migrate
```

Ou, se preferir aplicar manualmente, os arquivos SQL estão em `drizzle/migrations/`.

### 5. Rodar em desenvolvimento

```bash
pnpm dev
```

O servidor inicia em `http://localhost:3000` com hot-reload (Vite HMR para frontend, tsx watch para backend).

### 6. Build para produção

```bash
pnpm build
pnpm start
```

---

## Scripts Disponíveis

| Script | Descrição |
|---|---|
| `pnpm dev` | Inicia o servidor de desenvolvimento com hot-reload |
| `pnpm build` | Compila frontend (Vite) e backend (esbuild) |
| `pnpm start` | Inicia o servidor de produção |
| `pnpm check` | Verifica tipos TypeScript (sem emitir) |
| `pnpm test` | Executa todos os testes (Vitest) |
| `pnpm format` | Formata código com Prettier |
| `pnpm db:push` | Gera e aplica migrações do banco |

---

## Arquitetura

### Comunicação Frontend ↔ Backend

O projeto usa **tRPC** para comunicação tipada end-to-end. Não há REST routes manuais — tudo passa por procedures tipadas:

```typescript
// Backend (server/routers.ts)
sales: {
  list: protectedProcedure.query(async ({ ctx }) => { ... }),
  register: protectedProcedure.input(z.object({ ... })).mutation(async ({ input }) => { ... }),
}

// Frontend (qualquer página)
const { data } = trpc.sales.list.useQuery();
const register = trpc.sales.register.useMutation();
```

### Autenticação

- OAuth2 via Manus Auth (login social)
- JWT armazenado em cookie HttpOnly
- `protectedProcedure` injeta `ctx.user` automaticamente
- Roles: `admin` | `user` (extensível)

### Multi-Tenancy

- Cada loja é um `tenant` com dados isolados
- Tabela `tenants` armazena configurações por loja (WhatsApp, branding, etc.)
- Queries filtram automaticamente por `tenantId`
- Super Admin gerencia todos os tenants

### Integrações

| Integração | Protocolo | Status |
|---|---|---|
| Z-API (WhatsApp) | REST + Webhook | Funcional |
| SIG Veículos (DMS) | Webhook (inbound) | Endpoints prontos |
| Webmotors | Email-parser | Parcial |
| OLX | Email-parser | Parcial |
| Meta (Instagram/FB) | Webhook | Funcional |
| Google Ads | Webhook | Funcional |
| LitoralCar (Site) | Scraping | Funcional |

---

## Webhooks Disponíveis

O sistema expõe os seguintes endpoints para integrações externas:

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/webhooks/whatsapp` | POST | Recebe mensagens do Z-API |
| `/api/webhooks/sig/sale` | POST | Sincroniza venda do SIG Web |
| `/api/webhooks/sig/inventory` | POST | Sincroniza estoque do SIG Web |
| `/api/webhooks/meta/lead` | POST | Recebe leads do Meta Lead Ads |
| `/api/webhooks/google/lead` | POST | Recebe leads do Google Ads |
| `/api/webhooks/email-lead` | POST | Recebe leads parseados de email |
| `/api/webhooks/docs` | GET | Documentação completa da API |

Todos os endpoints (exceto WhatsApp) requerem header `x-api-token` para autenticação.

---

## Testes

```bash
# Executar todos os testes
pnpm test

# Executar testes de um arquivo específico
pnpm vitest run server/auth.logout.test.ts

# Modo watch (desenvolvimento)
pnpm vitest
```

Os testes cobrem:
- Autenticação e logout
- CRUD de vendas, agendamentos, F&I, despachante
- Busca cross-setor por veículo
- Sincronização de estoque
- Webhooks

---

## Deploy

O projeto está configurado para deploy no **Manus Cloud** (Autoscale/Serverless no Google Cloud Run):

- Build automático via `pnpm build`
- Porta dinâmica (não hardcoded)
- Variáveis de ambiente injetadas pelo runtime
- SSL automático
- Domínio personalizado: kafkarank.com

Para deploy em outros provedores (Railway, Render, etc.), basta configurar as variáveis de ambiente e rodar `pnpm build && pnpm start`.

---

## Contribuindo

1. Crie uma branch a partir de `main`:
   ```bash
   git checkout -b feature/minha-feature
   ```

2. Faça suas alterações seguindo o padrão do projeto:
   - Schema → `drizzle/schema.ts`
   - Query helpers → `server/db.ts`
   - Procedures → `server/routers.ts` ou `server/routers/*.ts`
   - UI → `client/src/pages/*.tsx`

3. Rode os testes:
   ```bash
   pnpm test
   pnpm check
   ```

4. Commit e push:
   ```bash
   git commit -m "feat: descrição da feature"
   git push origin feature/minha-feature
   ```

5. Abra um Pull Request para `main`.

### Convenções de Commit

- `feat:` — Nova funcionalidade
- `fix:` — Correção de bug
- `docs:` — Documentação
- `refactor:` — Refatoração sem mudança de comportamento
- `test:` — Adição/correção de testes
- `chore:` — Tarefas de manutenção

---

## Banco de Dados — Tabelas Principais

| Módulo | Tabelas |
|---|---|
| **Vendas** | `sales`, `saleDocuments`, `sellers`, `sellerBonuses`, `sellerAdvances` |
| **Competição** | `competitions`, `competitionParticipants`, `competitionSnapshots`, `feiraoEditions` |
| **Agendamentos** | `sdrRecords` |
| **F&I** | `feiRecords`, `feiAuditLogs`, `fichasFinanciamento`, `fichaBancos` |
| **Despachante** | `dispatchRecords` |
| **Consignação** | `consignmentRecords` |
| **Estoque** | `inventoryVehicles`, `inventorySyncLogs`, `vehicleCosts`, `vehicleCostItems` |
| **Financeiro** | `finTransactions`, `finCategories`, `commissionRules` |
| **Pós-Venda** | `pvChamados`, `pvOrcamentos`, `pvOrcamentoItens`, `pvGastos`, `pvOficinas`, `pvHistorico` |
| **CRM** | `crmLeads`, `crmMessages`, `crmActivities`, `crmFollowUpTasks`, `crmPipelineStages`, `crmInventory`, `crmInventoryAlerts`, `crmBulkSendLogs`, `crmCampaigns`, `crmMessageTemplates`, `crmIntegrations`, `crmLeadDistribution` |
| **Gestão** | `managers`, `managerTasks`, `managerAlerts`, `managerMentorMessages`, `managerPermissions`, `goals`, `actionPlans`, `trainings`, `mktStrategies`, `mktTasks` |
| **Sistema** | `users`, `tenants`, `admins`, `superAdmins`, `teams`, `notifications`, `pushSubscriptions`, `appSettings`, `iamConfig`, `motivationalQuotes` |

---

## Tecnologias Utilizadas

**Frontend:**
- React 19, TypeScript 5.9, Tailwind CSS 4
- shadcn/ui (Radix UI), Lucide Icons
- tRPC Client, TanStack React Query
- Framer Motion, Recharts
- Wouter (roteamento)

**Backend:**
- Node.js 22, Express 4, tRPC 11
- Drizzle ORM, MySQL2
- Jose/JWT, Bcrypt
- Axios, Cheerio (scraping)
- Web Push, Nodemailer

**Infraestrutura:**
- TiDB Cloud (MySQL compatível)
- AWS S3 (armazenamento de arquivos)
- Z-API (WhatsApp Business)
- Manus Cloud (deploy)

---

## Licença

Projeto proprietário — todos os direitos reservados.

---

## Contato

- **Empresa:** Kafka Multimarcas
- **Site:** [kafkamultimarcas.com.br](https://www.kafkamultimarcas.com.br)
- **Sistema:** [kafkarank.com](https://kafkarank.com)
