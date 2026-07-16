# Feature Plan: Cadastro Completo de Veículos no Estoque

## CAPABILITY

Hoje a tela administrativa de estoque em `/admin/estoque` e `/t/:slug/admin/estoque` funciona como um painel de consulta e operação rápida sobre `inventory_vehicles`, com foco em sincronização, reserva, venda e visualização. A nova capacidade pedida é transformar essa área em um módulo administrativo completo, com uma ação clara de `Cadastrar`, abrindo uma nova rota dedicada para cadastro manual de veículos com formulário avançado, dividido por abas, cobrindo dados comerciais, técnicos, operacionais, financeiros e de mídia. Depois de entregue, a loja poderá cadastrar veículos manualmente sem depender apenas do scraper, com estrutura suficiente para operação real de estoque e evolução futura do funil comercial.

## CONTEXTO ATUAL ENCONTRADO

### Frontend

- A rota atual de estoque admin aponta para `AdminInventory` em [client/src/App.tsx](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/client/src/App.tsx:154).
- A tela atual está em [client/src/pages/admin/AdminInventory.tsx](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/client/src/pages/admin/AdminInventory.tsx:1).
- Essa tela lista veículos, filtra, sincroniza, reserva, marca como vendido e disponibiliza novamente.
- Não existe hoje botão de `Cadastrar` nem rota dedicada de criação.
- O estoque público consome o mesmo domínio de dados via `trpc.inventory.*` em [client/src/pages/Estoque.tsx](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/client/src/pages/Estoque.tsx:125).

### Backend

- O router principal do estoque real está em [server/routers/inventoryRouter.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/server/routers/inventoryRouter.ts:1).
- O schema real usado hoje pelo admin e pelo estoque público é `inventory_vehicles` em [drizzle/schema.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/drizzle/schema.ts:1257).
- O router `crmInventory` já foi adaptado para ler e escrever em `inventory_vehicles`, e não mais em `crm_inventory`, em [server/routers/crmRouter.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/server/routers/crmRouter.ts:469).
- O `create` atual existe, mas é mínimo: recebe basicamente marca, modelo, ano, placa, cor e preço. Isso é insuficiente para um cadastro robusto.

### Conclusão arquitetural atual

- O sistema já convergiu, na prática, para `inventory_vehicles` como fonte principal do estoque operacional.
- A tabela `crm_inventory` permanece no schema como legado, mas não deve virar a base da nova feature.
- A feature nova deve evoluir `inventory_vehicles` e `inventoryRouter`, e não abrir um segundo cadastro paralelo que gere duplicidade de estoque.

## CONSTRAINTS

### Regras fixas

- A nova feature deve respeitar multi-tenant em todas as leituras e escritas via `tenantId`.
- O cadastro manual deve conviver com veículos sincronizados sem quebrar o fluxo atual de sync.
- A listagem atual de estoque admin deve continuar funcionando durante a evolução.
- O estoque público e demais integrações que leem `inventory_vehicles` não podem ser quebrados.
- O cadastro precisa ser compatível com o status atual do sistema: `available`, `reserved`, `sold`.

### Invariantes recomendados

- Deve existir uma rota dedicada para cadastro, separada da tela de listagem.
- O cadastro manual deve gravar no mesmo domínio de estoque usado pelo restante do produto.
- Não devemos depender de `externalId` do scraper para itens manuais como se todos viessem de integração externa.
- Devemos introduzir metadados de origem do veículo para distinguir:
  - sincronizado do site
  - cadastrado manualmente
  - eventualmente importado de integração futura

### Limitações do modelo atual

- `inventory_vehicles` foi pensado inicialmente para sync externo e não cobre bem:
  - dados documentais
  - custos detalhados
  - metadados de publicação
  - origem do veículo
  - rastreabilidade operacional
  - validações de completude de cadastro
- O `create` atual não suporta upload estruturado de galeria, opcionais ricos, observações comerciais e campos internos.

### Trust boundaries

- O formulário admin é interno, mas ainda precisa de validação forte no backend.
- Uploads e URLs de mídia não devem confiar em payloads livres sem validação.
- Campos sensíveis como preço, custo, placa, chassi e renavam devem ser normalizados no servidor.

## IMPLEMENTATION CONTRACT

## 1. Nova experiência de navegação

### Rotas novas

- ` /admin/estoque/cadastrar`
- ` /t/:slug/admin/estoque/cadastrar`
- Recomendado desde já prever rota de edição futura:
  - ` /admin/estoque/:id/editar`
  - ` /t/:slug/admin/estoque/:id/editar`

### Comportamento da tela atual

- Manter `AdminInventory` como listagem/gestão.
- Adicionar CTA primário `Cadastrar Veículo`.
- Ação deve navegar para a nova rota dedicada.

## 2. Estrutura UX do formulário

### Direção de interface

- Não usar modal.
- Usar página dedicada, com cabeçalho forte, progresso visual e formulário em abas.
- Layout desktop com navegação lateral ou topo fixo de abas.
- Layout mobile com tabs horizontais roláveis e ações fixas no rodapé.

### Abas recomendadas

#### Aba 1: Identificação

- Marca
- Modelo
- Versão
- Ano modelo
- Ano fabricação
- Placa
- Chassi
- Renavam
- Cor
- Categoria
- Carroceria
- Portas
- Combustível
- Câmbio
- Motor
- Quilometragem
- Estado do veículo
- Origem do veículo
  - manual
  - integração
  - repasse
  - troca

#### Aba 2: Comercial

- Título de exibição
- Slug interno ou slug sugerido
- Descrição curta
- Descrição longa
- Opcionais
- Destaques comerciais
- Preço principal
- Preço promocional
- Preço FIPE
- Aceita troca
- Blindado
- Destaque no estoque
- Exibir no estoque público

#### Aba 3: Financeiro

- Preço de custo
- Custo de preparação
- Custo documental
- Custo de transporte
- Custo de comissão previsto
- Outras despesas
- Margem desejada
- Valor mínimo de venda
- Observações financeiras

#### Aba 4: Operação e Status

- Status do estoque
- Data de entrada
- Loja ou unidade
- Responsável pelo cadastro
- Chave de integração externa opcional
- Número interno do estoque
- Observações operacionais
- Tags internas

#### Aba 5: Mídia

- Foto principal
- Galeria de fotos
- URL externa opcional
- Vídeo opcional
- Ordem das fotos
- Legenda opcional
- Marcação de foto principal

#### Aba 6: Documentação e Observações

- Procedência
- Manual e chave reserva
- Revisões
- Laudo cautelar
- Sinistros observados
- Pendências documentais
- Campo livre de observações

## 3. Proposta de modelagem de dados

### Decisão principal

Evoluir `inventory_vehicles` como tabela canônica do estoque.

### Campos recomendados para adicionar

- `sourceType`: enum
  - `sync`
  - `manual`
  - `integration`
- `isPublished`: boolean
- `isFeatured`: boolean
- `internalCode`: string
- `manufactureYear`: int
- `modelYear`: int
- `chassis`: string
- `renavam`: string
- `acceptsTradeIn`: boolean
- `isArmored`: boolean
- `entryDate`: bigint ou timestamp
- `purchasePrice`: int
- `preparationCost`: int
- `documentationCost`: int
- `transportCost`: int
- `commissionCost`: int
- `otherCosts`: int
- `minimumSalePrice`: int
- `videoUrl`: text
- `highlightItems`: text json
- `internalTags`: text json
- `galleryMeta`: text json
- `manualCreatedBySellerId`: int nullable
- `lastManualUpdateBySellerId`: int nullable

### Campos existentes que podem ser reaproveitados

- `brand`
- `model`
- `version`
- `motor`
- `year`
- `color`
- `fuel`
- `km`
- `price`
- `photoUrl`
- `photos`
- `optionals`
- `externalUrl`
- `slug`
- `bodyType`
- `transmission`
- `plate`
- `doors`
- `fipePrice`
- `offerPrice`
- `vehicleState`
- `category`
- `observation`
- `status`

### Regra importante sobre `externalId`

- Para cadastro manual, não usar o mesmo significado semântico do scraper.
- Opção recomendada:
  - manter `externalId` obrigatório, mas gerar valor interno estável como `manual-{nanoid}`
- Melhor opção de médio prazo:
  - permitir `externalId` nullable e separar `sourceType`

## 4. Contrato de backend

### Ajustes no router `inventoryRouter`

Criar procedimentos novos:

- `inventory.createDetailed`
- `inventory.updateDetailed`
- `inventory.getAdminById`
- `inventory.uploadPhoto` ou integração com storage já existente
- `inventory.validatePlate` opcional

### Validações obrigatórias

- `brand`, `model`, `price`, `status`, `sourceType`
- normalização de placa para uppercase
- números monetários sem string solta no backend
- limites de tamanho para descrições e arrays
- sanitização de links e mídia

### Regras de persistência

- veículos manuais entram com `sourceType = manual`
- `status` padrão: `available`
- `isPublished` padrão recomendado: `false`
- publicação pública só após cadastro minimamente completo

## 5. Contrato de frontend

### Nova página sugerida

- `client/src/pages/admin/AdminInventoryCreate.tsx`

### Componentes sugeridos

- `client/src/components/inventory/VehicleFormShell.tsx`
- `client/src/components/inventory/VehicleFormTabs.tsx`
- `client/src/components/inventory/VehicleBasicTab.tsx`
- `client/src/components/inventory/VehicleCommercialTab.tsx`
- `client/src/components/inventory/VehicleFinancialTab.tsx`
- `client/src/components/inventory/VehicleMediaTab.tsx`
- `client/src/components/inventory/VehicleOperationalTab.tsx`
- `client/src/components/inventory/VehicleDocumentationTab.tsx`

### Estado do formulário

- usar `react-hook-form` + `zod`
- `draft` local por aba é opcional, mas recomendado
- exibir validação por aba e indicador de completude
- permitir `Salvar rascunho` e `Salvar e publicar` se a regra de negócio fizer sentido

### Ações primárias

- `Salvar rascunho`
- `Salvar veículo`
- `Salvar e cadastrar outro`
- `Cancelar`

## 6. Impactos em outras superfícies

### Estoque público

- Deve continuar listando apenas veículos elegíveis.
- Recomendado passar a filtrar por:
  - `status = available`
  - `isPublished = true`

### CRM e módulos relacionados

- Financeiro já consome `crmInventory.list`, que hoje lê de `inventory_vehicles`.
- Cadastro novo precisa manter compatibilidade com esse consumo.
- Custos por veículo podem futuramente aproveitar os novos identificadores internos.

### Sincronização externa

- O sync não pode sobrescrever campos manuais internos sem regra clara.
- Recomendação sênior:
  - campos vindos do scraper só atualizam subset “externo”
  - campos internos/comerciais manuais ficam preservados

## NON-GOALS

- Não redesenhar toda a listagem de estoque nesta primeira entrega.
- Não migrar agora todos os fluxos antigos de `crm_inventory` legado se eles não estiverem ativos.
- Não implementar importação em massa por CSV nesta fase.
- Não unificar imediatamente cadastro, edição, publicação e workflow editorial avançado em uma única entrega se isso atrasar a entrega principal.

## RISCOS E CUIDADOS

### Risco 1: sobrescrever cadastro manual durante sync

Mitigação:

- introduzir `sourceType`
- proteger campos internos contra overwrite cego
- documentar claramente quais campos o sync pode atualizar

### Risco 2: formulário gigante e difícil de usar

Mitigação:

- dividir por abas
- agrupar por contexto
- mostrar resumo lateral de completude
- salvar incrementalmente

### Risco 3: schema crescer sem estratégia

Mitigação:

- usar campos escalares para dados críticos
- usar JSON apenas para listas naturalmente flexíveis como destaques, tags e metadados de galeria

### Risco 4: quebra do estoque público

Mitigação:

- manter retrocompatibilidade de campos existentes
- adicionar novos filtros de publicação de forma backward-compatible

## OPEN QUESTIONS

- O cadastro manual deve publicar imediatamente no estoque público ou entrar como rascunho?
- Chassi e renavam são obrigatórios para todos os veículos ou só para uso interno quando houver disponibilidade?
- Existe conceito de unidades ou lojas físicas distintas dentro do mesmo tenant?
- O time quer upload real de imagens para storage próprio ou só colar URLs nesta primeira fase?
- O preço hoje está em reais inteiros em `inventory_vehicles`; vamos manter esse padrão ou migrar para centavos no domínio de estoque?
- O campo `year` deve continuar único ou devemos separar definitivamente `manufactureYear` e `modelYear`?
- A edição do veículo entra já nesta entrega ou o foco é apenas cadastro inicial + listagem com CTA?

## HANDOFF

Status recomendado: `ready for direct implementation`, com uma pequena decisão de arquitetura antes de codar a migration final.

### Recomendação sênior de implementação

#### Fase 1: base estrutural

- criar nova rota frontend de cadastro
- adicionar CTA `Cadastrar Veículo` em `AdminInventory`
- criar schema zod do formulário
- criar mutation `inventory.createDetailed`

#### Fase 2: modelagem persistente

- adicionar migration em `inventory_vehicles`
- incluir `sourceType`, publicação, anos separados, custos e metadados internos
- ajustar `inventory.list` e `inventory.getById`

#### Fase 3: UX de formulário premium

- implementar formulário por abas
- validação contextual por aba
- galeria de fotos
- resumo lateral e barra de progresso

#### Fase 4: endurecimento

- testes de router
- testes de validação
- testes de navegação da nova rota
- revisão de compatibilidade com estoque público e financeiro

### Próxima lane ECC indicada

- `tdd-workflow` para implementar começando pelo contrato do router
- `verification-loop` para validar build, typecheck e testes
- `frontend-design` para executar a página de cadastro com qualidade visual alta sem ficar genérica
