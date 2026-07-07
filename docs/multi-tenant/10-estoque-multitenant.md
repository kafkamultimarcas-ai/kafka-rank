# Estoque Multi-Tenant: URL própria por loja

## Análise

Pergunta que motivou esta investigação: "já está correto o multitenant no estoque? cada loja vê somente seu estoque?". Resposta, confirmada por leitura direta do código: **não** — e era mais grave do que "falta multi-tenant", era um **vazamento de dados entre lojas já ativo**, só mascarado pelo fato de existir apenas 1 tenant real em produção até então.

Estado encontrado em `server/inventory-scraper.ts`:
- `BASE_URL`, `STOCK_PAGE_URL`, `API_URL` e `COD_LOJA = "1750"` eram **constantes hardcoded** apontando pro site da Kafka Multimarcas (plataforma "LitoralCar").
- `syncInventory()` não recebia parâmetro nenhum, não iterava tenants, e gravava linhas em `inventoryVehicles`/`inventorySyncLogs` sem setar `tenantId` (caía no `.default(1)` da coluna).
- A busca de veículo existente pra decidir update-vs-insert era `where(eq(inventoryVehicles.externalId, externalId))` — **sem tenant** — e a lógica que marca como "sold" o que sumiu do sync usava `notInArray(inventoryVehicles.externalId, syncedExternalIds)` — também **sem tenant**. Assim que uma segunda loja sincronizasse, IDs externos colidentes (prováveis, já que cada revenda numera do zero) se sobrescreveriam ou marcariam veículos de outra loja como vendidos.

E o mais crítico, em `server/routers/inventoryRouter.ts`: **nenhum procedure filtrava por tenant** — `list`, `getById`, `brands`, `stats`, `syncLogs` e as mutations `reserve`/`markSold`/`markAvailable` (todas via `eq(inventoryVehicles.id, input.id)`, sem checar dono) liam/gravavam o estoque inteiro do banco, de qualquer loja. O mesmo padrão se repetia em: `server/routers.ts` (busca por placa), `server/routers/crmRouter.ts` (CRUD manual de veículo + `sendVehicle` + contexto do assistente de IA), `server/ai-attendant.ts` (`searchVehicles`), `server/webhooks.ts` (lookups de lead/webhook) e `server/routers/whatsappRouter.ts` (`sendVehicle`).

O lado bom: parte da base já existia e só precisava ser **conectada**, não inventada:
- `drizzle/schema.ts` já tinha `tenants.inventoryUrl` (coluna `text`) — existia e não era usada em lugar nenhum.
- `inventorySyncLogs` já tinha `tenantId` com índice — só faltava ser preenchido corretamente.
- `crmRouter.ts::getTenantSettings`/`updateTenantSettings` já liam e gravavam `inventoryUrl` no banco.
- `CrmAdminDashboard.tsx` já tinha um `<Input>` "URL do Estoque" ligado a esse mutation — só que na seção errada (aba **Ajustes** → "Dados da Loja"), quando o pedido explícito era ficar na aba **Integrações**, junto com Z-API/Meta.
- A resposta da API do LitoralCar já inclui `cod_loja` no próprio payload — ou seja, não foi preciso um segundo campo de configuração pro código da loja, só a URL base.

## Feature

Cada loja agora sincroniza o próprio estoque a partir da própria URL, configurada em **Ajustes → Integrações → Estoque de Veículos**, com isolamento completo de dados entre tenants em toda a cadeia (sync, leitura pública, CRM, atendente de IA, WhatsApp).

## Plano de Implementação

| Arquivo | Mudança |
|---|---|
| `drizzle/schema.ts` | Índice único composto `uniqueIndex(...).on(table.tenantId, table.externalId)` em `inventoryVehicles` (migration `0076_chemical_kabuki.sql`) — impede colisão de `externalId` entre lojas a nível de banco |
| `server/inventory-scraper.ts` | `syncInventory(tenantId, baseUrl)` parametrizado (antes não recebia argumento nenhum); `cod_loja` derivado da própria resposta da API em vez de constante fixa; novo `syncAllTenants()` itera `SELECT id, inventoryUrl FROM tenants WHERE inventoryUrl IS NOT NULL AND inventoryUrl != ''` e sincroniza cada um; todo insert/update em `inventoryVehicles`/`inventorySyncLogs` seta `tenantId` explicitamente; lookup de `externalId` e marcação de "sold" escopados por `(tenantId, externalId)` |
| `server/routers/inventoryRouter.ts` | Os 9 procedures (`list`, `getById`, `brands`, `stats`, `sync`, `syncLogs`, `reserve`, `markSold`, `markAvailable`) passam a filtrar por `getCurrentTenantId()`; `sync` busca a `inventoryUrl` do tenant atual antes de chamar `syncInventory`; mutations verificam `affectedRows` e lançam erro se o veículo pertence a outra loja (fecha IDOR) |
| `server/routers.ts`, `server/routers/crmRouter.ts`, `server/ai-attendant.ts`, `server/webhooks.ts`, `server/routers/whatsappRouter.ts` | Mesmo padrão replicado em todo ponto de leitura/escrita de `inventoryVehicles` fora do router principal (busca por placa, CRUD manual, envio de veículo por WhatsApp, contexto do atendente de IA, lookups de webhook/lead) |
| `client/src/pages/crm/CrmAdminDashboard.tsx` | Campo "URL do Estoque" removido de `StoreDataPanel` (aba Ajustes); novo `InventoryIntegrationPanel()` criado na aba Integrações, mesmo padrão visual do `WhatsAppZapiPanel` — input de URL, botão "Salvar URL", botão "Sincronizar Agora" (`trpc.inventory.sync`) e exibição do último log de sync (`trpc.inventory.syncLogs`) |
| Dado (não schema) | Backfill único: `tenants.inventoryUrl` da Kafka Multimarcas preenchido com `https://www.kafkamultimarcas.com.br`, pra não regredir a sincronização já em produção quando o orquestrador passou a exigir URL por tenant |

Fora de escopo (não é a mesma classe de problema, documentado à parte): os outros ~9 tipos de dado por loja (leads, vendas, financeiro etc.) já eram corretamente multi-tenant antes desta mudança — o estoque era a exceção isolada.

## Resultados

- Typecheck limpo.
- `vitest run server/inventory.test.ts`: 19/19 testes passando, incluindo novos casos estáticos que travam a regressão: assinatura de `syncInventory` exige `tenantId`/`baseUrl`, ausência da constante de URL única, presença do índice único no schema, e `getCurrentTenantId()` referenciado em todos os 9 procedures do router.
- Suíte completa: as falhas remanescentes são pré-existentes (confirmado rodando o mesmo conjunto de arquivos com `git stash` antes desta mudança — falham igual, por motivos não relacionados: credenciais Z-API ausentes no ambiente de dev, componente `TenantSettingsPanel` renomeado numa leva de trabalho anterior sem atualizar `tenant-settings.test.ts`).
- Antes de aplicar o índice único, 2 linhas duplicadas idênticas foram encontradas em produção (`inventory_vehicles` ids 184/185 — mesmo veículo já vendido, resíduo de uma condição de corrida numa sincronização passada) e removidas com autorização explícita do usuário.
- Testado ao vivo: subida do servidor disparou a sincronização automática usando o novo fluxo (`syncAllTenants()` → `syncInventory(1, "https://www.kafkamultimarcas.com.br")`), log confirmando `Found: 128, Added: 0, Updated: 128, Removed: 0` — a Kafka Multimarcas continua sincronizando normalmente após o backfill.

## Como Testar

1. `npx tsc --noEmit -p .`.
2. `npx vitest run server/inventory.test.ts`.
3. No preview: em **Ajustes → Integrações → Estoque de Veículos**, confirmar que o campo de URL aparece ali (não mais em "Dados da Loja"), salvar uma URL e clicar "Sincronizar Agora".
4. Configurar `inventoryUrl` de um segundo tenant de teste e sincronizar ambos — confirmar isolamento tanto no painel admin quanto na vitrine pública (`/estoque`): veículos de uma loja não aparecem pra outra, e tentar `reserve`/`markSold`/`markAvailable` numa `id` de outro tenant deve lançar erro em vez de mutar.
