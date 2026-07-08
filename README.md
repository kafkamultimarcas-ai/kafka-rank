# Kafka Rank

**Sistema completo de gestão, competição e CRM para revendas de veículos.**

Kafka Rank é uma plataforma SaaS multi-tenant desenvolvida para lojas de veículos seminovos. O sistema gerencia vendas, agendamentos, ranking de vendedores, feirões, despachante, F&I, consignação, estoque, financeiro, pós-venda e CRM com WhatsApp integrado.

---

## Visão Geral

| Aspecto | Detalhe |
|---|---|
| **Frontend** | React 19 + TypeScript 5.9 + Tailwind CSS 4 + shadcn/ui |
| **Backend** | Node.js 22 + Express 4 + tRPC 11 |
| **Banco de Dados** | MySQL 8 (TiDB Cloud) com Drizzle ORM — 76 migrations |
| **Autenticação** | OAuth2 (Manus Auth, dono da plataforma) + JWT por sessão (gerente/vendedor/admin de CRM) |
| **Multi-Tenant** | Isolamento por loja via `/t/:slug/...`, login único global em `/login` |
| **Pagamentos** | ASAAS (assinatura, troca de plano, cancelamento, webhook idempotente) |
| **Observabilidade** | Logger estruturado (pino) + alertas internos de cobrança, sem serviço externo |
| **Testes** | Vitest (~79 arquivos, ~832 testes) |
| **Comunicação** | Z-API (WhatsApp Business), credenciais por loja criptografadas |
| **Gerenciador de pacotes** | pnpm |
| **Deploy** | Manus Cloud (Autoscale/Serverless) |
| **Domínio** | [kafkarank.com](https://kafkarank.com) |

> **Documentação completa da transformação multi-tenant/SaaS**: [`docs/multi-tenant/`](docs/multi-tenant/README.md) — arquitetura, planos/pagamentos, e-mails/logs, segurança, e a [análise de prontidão pra vendas](docs/multi-tenant/09-analise-prontidao-vendas.md) (o que falta, em ordem de prioridade, pra vender pra uma loja real).

---

## Status do Projeto

Multi-tenant, autenticação e cobrança já funcionam de ponta a ponta em ambiente de desenvolvimento (testado ao vivo, incluindo dois tenants isolados rodando lado a lado). **Antes de vender pra uma loja real**, o que falta é majoritariamente **validação em ambiente real**, não código novo:

- ⚠️ Trabalho recente ainda não commitado na branch `feat/multi-tenant` — ver `git status`.
- ⚠️ Termos de Uso / Política de Privacidade são texto-placeholder (`client/src/pages/public/ComercialLegal.tsx` avisa isso explicitamente) — pendência jurídica, não técnica.
- ⚠️ Migrations, integração ASAAS e e-mail transacional nunca rodaram contra staging/sandbox/Resend reais — só validados em dev local e testes automatizados.

Lista completa, com esforço estimado por item e ordem recomendada: [**`docs/multi-tenant/09-analise-prontidao-vendas.md`**](docs/multi-tenant/09-analise-prontidao-vendas.md).

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
- Isolamento completo de dados por loja (`tenantId` em toda tabela, filtrado automaticamente via `AsyncLocalStorage` — não é responsabilidade de cada query lembrar de filtrar)
- **Login único global**: `https://kafkarank.com/login` — um único formulário por e-mail, resolve automaticamente admin → gerente → vendedor → super admin e redireciona para a área correta. `https://kafkarank.com/super-admin` continua sendo o portal do dono da plataforma depois de autenticado. Rotas antigas como `/t/:slug/login`, `/crm/admin/login` e `/admin/login` permanecem só como redirecionamento compatível.
- Cadastro self-service de loja nova (`/comercial/cadastro`) — provisiona tenant + admin dono + seed de CRM numa chamada só
- "Esqueci minha senha" self-service por loja, com token de uso único
- Planos (Trial/Basic/Pro/Enterprise) com cobrança recorrente via **ASAAS** — assinar, trocar de plano, cancelar, tudo com proteção contra cobrança duplicada
- Super Admin (`/super-admin`) — CRUD de lojas, branding, módulos habilitados, limites de plano, logs unificados (e-mail + assinatura + alertas de cobrança numa tela só)
- Configuração independente de WhatsApp (Z-API) por loja, credenciais criptografadas em repouso (AES-256-GCM)
- Rate limiting por loja+IP em rotas sensíveis (login, reset de senha, cadastro) — não deixa uma loja "barulhenta" consumir a cota de outra atrás do mesmo IP compartilhado

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
│   ├── schema.ts              # ~77 tabelas definidas
│   └── migrations/            # 76 migrations SQL geradas via drizzle-kit
├── shared/                    # Tipos e constantes compartilhados
├── package.json
├── tsconfig.json
├── vite.config.ts
└── drizzle.config.ts
```

---

## Guia Completo: Rodar o Projeto Localmente (Passo a Passo)

Este guia assume que você está em um Mac ou Linux. No Windows, use WSL2.

---

### Pré-requisitos

Instale antes de começar:

| Ferramenta | Versão | Como instalar |
|---|---|---|
| **Node.js** | >= 22.x | `nvm install 22` ou [nodejs.org](https://nodejs.org) |
| **pnpm** | >= 9.x | `npm install -g pnpm` |
| **MySQL 8** | 8.0+ | Docker (recomendado) ou instalação local |
| **Git** | qualquer | `sudo apt install git` ou `brew install git` |

---

### Passo 1: Clonar o repositório

```bash
git clone https://github.com/kafkamultimarcas-ai/kafka-rank.git
cd kafka-rank
```

---

### Passo 2: Instalar dependências

```bash
pnpm install
```

Isso instala frontend e backend de uma vez (monorepo com workspace único).

---

### Passo 3: Subir o banco de dados (MySQL via Docker)

A forma mais fácil é usar Docker. Se não tem Docker, instale: [docker.com](https://www.docker.com/get-started)

```bash
# Subir MySQL 8 com Docker (porta 3306)
docker run -d \
  --name kafka-mysql \
  -e MYSQL_ROOT_PASSWORD=root123 \
  -e MYSQL_DATABASE=kafka_rank \
  -p 3306:3306 \
  mysql:8.0 \
  --default-authentication-plugin=mysql_native_password
```

Aguarde ~10 segundos para o MySQL iniciar. Verifique:

```bash
docker logs kafka-mysql 2>&1 | grep "ready for connections"
```

**Se a porta 3306 já estiver em uso** (comum quando há outro projeto com MySQL/Docker rodando na máquina — confira com `docker ps`), suba numa porta diferente e ajuste o `DATABASE_URL` no `.env` de acordo:

```bash
docker run -d \
  --name kafka-mysql \
  -e MYSQL_ROOT_PASSWORD=root123 \
  -e MYSQL_DATABASE=kafka_rank \
  -p 3307:3306 \
  mysql:8.0 \
  --default-authentication-plugin=mysql_native_password
```

```env
DATABASE_URL="mysql://root:root123@localhost:3307/kafka_rank"
```

Se você já tinha um container `kafka-mysql` parado com dados (`docker ps -a`) e só precisa liberar a porta, não é preciso apagá-lo: crie o novo container com outro nome (`--name kafka-mysql-local`, por exemplo) reaproveitando o volume de dados do container antigo (`docker inspect kafka-mysql --format '{{json .Mounts}}'` mostra o nome do volume) com `-v <nome-do-volume>:/var/lib/mysql` no comando acima.

**Alternativa sem Docker (MySQL local):**
```bash
# Se já tem MySQL instalado localmente:
mysql -u root -p -e "CREATE DATABASE kafka_rank;"
```

**Alternativa com TiDB Cloud (produção):**
Use a connection string fornecida pelo TiDB Cloud diretamente no `.env`.

---

### Passo 4: Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env   # se existir
# ou crie manualmente:
touch .env
```

Preencha o `.env` com o seguinte conteúdo:

```env
# ============================================
# OBRIGATÓRIAS (sistema não roda sem estas)
# ============================================

# Banco de dados MySQL
# Se usou Docker acima:
DATABASE_URL="mysql://root:root123@localhost:3306/kafka_rank"
# Se usa TiDB Cloud:
# DATABASE_URL="mysql://user:pass@host:4000/db?ssl={\"rejectUnauthorized\":true}"

# Segredo para JWT (gere um aleatório)
JWT_SECRET="minha-chave-secreta-super-segura-aqui-123"

# OAuth (Manus Auth) - necessário para login funcionar
VITE_APP_ID="seu-app-id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://id.manus.im"

# Dono do sistema (primeiro admin)
OWNER_OPEN_ID="open-id-do-owner"
OWNER_NAME="Nome do Owner"

# ============================================
# OPCIONAIS (funcionalidades extras)
# ============================================

# Z-API (WhatsApp Business) - só se for testar WhatsApp
ZAPI_INSTANCE_ID=""
ZAPI_TOKEN=""
ZAPI_CLIENT_TOKEN=""
ZAPI_API_URL="https://api.z-api.io"

# LLM / IA (Atendente, Mentoria) - só se for testar IA
BUILT_IN_FORGE_API_URL=""
BUILT_IN_FORGE_API_KEY=""

# Push Notifications - só se for testar notificações
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""

# ASAAS (cobrança/assinatura) - só se for testar fluxo de pagamento
ASAAS_API_URL="https://api-sandbox.asaas.com/v3"
ASAAS_API_KEY=""
ASAAS_WEBHOOK_TOKEN=""

# Resend (e-mail transacional) - sem isso, e-mail cai só no log do console
RESEND_API_KEY=""
```

> Lista completa e comentada de todas as env vars (inclusive as usadas só internamente, como `LOG_LEVEL`): [`.env.example`](.env.example).

---

### Passo 5: Criar as tabelas no banco de dados

O projeto usa **Drizzle ORM** para gerenciar o schema (~77 tabelas). Execute:

```bash
# Gerar os arquivos de migração SQL a partir do schema TypeScript
pnpm drizzle-kit generate

# Aplicar as migrações no banco (cria todas as tabelas)
pnpm drizzle-kit migrate
```

Se der erro de conexão, verifique se o MySQL está rodando:
```bash
docker ps  # deve mostrar kafka-mysql rodando
```

---

### Passo 6: Rodar o projeto em modo desenvolvimento

```bash
pnpm dev
```

Isso inicia **frontend + backend** juntos em um único processo:
- Frontend (React + Vite) com Hot Module Replacement
- Backend (Express + tRPC) com auto-reload via `tsx watch`
- Tudo na porta **http://localhost:3000**

O terminal vai mostrar:
```
Server running on http://localhost:3000/
```

Abra no navegador: **http://localhost:3000**

---

### Passo 7: Build para produção (opcional)

```bash
# Compilar frontend (Vite) e backend (esbuild)
pnpm build

# Iniciar servidor de produção
pnpm start
```

Em produção, o servidor serve os arquivos estáticos do frontend e a API no mesmo processo.

---

### Passo 8: Rodar os testes

```bash
# Executar todos os testes
pnpm test

# Executar em modo watch (re-roda ao salvar)
pnpm vitest

# Executar um teste específico
pnpm vitest run server/auth.logout.test.ts
```

---

### Passo 9: Verificar tipos TypeScript

```bash
pnpm check
```

Se não mostrar erros, está tudo certo.

---

### Resumo dos Comandos (Cola Rápida)

```bash
# Setup completo (copie e cole tudo de uma vez):
git clone https://github.com/kafkamultimarcas-ai/kafka-rank.git
cd kafka-rank
pnpm install
docker run -d --name kafka-mysql -e MYSQL_ROOT_PASSWORD=root123 -e MYSQL_DATABASE=kafka_rank -p 3306:3306 mysql:8.0 --default-authentication-plugin=mysql_native_password
sleep 15  # esperar MySQL iniciar
# Criar .env (edite com suas credenciais)
echo 'DATABASE_URL="mysql://root:root123@localhost:3306/kafka_rank"' > .env
echo 'JWT_SECRET="dev-secret-123"' >> .env
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
pnpm dev
```

---

### Troubleshooting

| Problema | Solução |
|---|---|
| `Error: DATABASE_URL is required` | Verifique se o `.env` existe e tem `DATABASE_URL` |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL não está rodando. `docker start kafka-mysql` |
| `Access denied for user` | Senha errada no `DATABASE_URL`. Verifique no Docker |
| Porta 3306 já em uso (`port is already allocated`) | Outro projeto/container está usando a porta. Suba o MySQL numa porta diferente (ex: `3307`) e ajuste o `DATABASE_URL` — ver seção "Passo 3" acima |
| `pnpm: command not found` | `npm install -g pnpm` |
| `node: command not found` | Instale Node.js 22+ via nvm: `nvm install 22` |
| Porta 3000 ocupada | Mate o processo: `lsof -ti:3000 \| xargs kill` |
| Login não funciona | Precisa das credenciais OAuth (VITE_APP_ID, etc.) |
| WhatsApp não funciona | Precisa configurar Z-API com instância ativa |

---

### Parar e limpar o ambiente

```bash
# Parar o servidor dev
Ctrl+C

# Parar o MySQL Docker
docker stop kafka-mysql

# Remover o container MySQL (perde os dados locais)
docker rm kafka-mysql
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

Existem **4 tipos de ator autenticado**, cada um numa tabela própria (`users`, `managers`, `sellers`, `admins`), unificados no contexto tRPC (`ctx.user`) através de um campo explícito `actorType: "oauth" | "manager" | "seller" | "crm_admin"` — nunca por inferência de faixa numérica de ID (ver [documento 08](docs/multi-tenant/08-refactor-identidade-actortype.md) pro histórico de por que isso importa: a versão anterior escondia bugs reais de resolução de tenant).

- **Dono da plataforma**: OAuth2 via Manus Auth, JWT em cookie HttpOnly.
- **Admin/gerente/vendedor de uma loja**: senha própria, um único formulário em `/login` (`tenantAuth.loginByEmail` resolve o papel automaticamente), sessão em cookie HttpOnly (gerente/vendedor) ou token retornado ao cliente (admin de CRM).
- Todo JWT de sessão de loja carrega `tenantId` embutido, validado (`assertTenantMatch`) contra o tenant resolvido pela URL a cada request — impede um token de uma loja ser usado em outra.
- `protectedProcedure`/`adminProcedure`/`managerOrAdminProcedure` (`server/_core/trpc.ts`) fazem o gate de permissão a partir de `ctx.user.role`/`actorType`/`sellerRole`.

### Multi-Tenancy

- Cada loja é um `tenant` com dados isolados; resolução é **por path** (`/t/:slug/...`), não por subdomínio.
- Tabela `tenants` armazena configurações por loja (WhatsApp, branding, planos, limites, `asaasCustomerId`).
- Toda query de leitura/escrita nas camadas de dados já filtra por `getCurrentTenantId()` internamente (`AsyncLocalStorage`) — testado automaticamente por uma varredura de schema (`server/tenant-security.test.ts`) que falha se alguém esquecer `tenantId` numa tabela nova.
- Super Admin gerencia todos os tenants (criar, editar, ver saúde/limites, logs unificados).

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
- Autenticação e logout, isolamento cross-tenant, IDOR (vendedor não acessa dado de outro vendedor)
- CRUD de vendas, agendamentos, F&I, despachante, consignação
- Cobrança (ASAAS: assinar, trocar plano, cancelar, webhook idempotente e transacional)
- Busca cross-setor por veículo
- Sincronização de estoque
- Webhooks

Estado atual (~79 arquivos, ~832 testes): a maioria passa; um pequeno número de suítes falha de forma **flaky** (resultado varia entre execuções — sinal de dependência de estado/timing, não bug confirmado) e `server/zapi.test.ts` falha de forma consistente porque depende de credenciais reais do Z-API não configuradas neste ambiente. Nenhuma falha conhecida está no caminho de auth/tenant/cobrança. Detalhe em [`docs/multi-tenant/09-analise-prontidao-vendas.md`](docs/multi-tenant/09-analise-prontidao-vendas.md).

**Não há CI configurado** (`.github/workflows/` não existe) — os testes só rodam manualmente/local por enquanto.

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
| **Cobrança/Observabilidade** | `subscriptionEvents` (auditoria de webhook ASAAS), `billingAlerts` (alertas internos de falha de cobrança), `emailLogs`, `passwordResetTokens` |

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
