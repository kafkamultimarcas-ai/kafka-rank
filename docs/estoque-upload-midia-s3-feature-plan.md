# Estoque Upload de Mídia S3 Feature Plan

Data de atualização: 2026-07-19

## Objetivo

Evoluir o módulo de estoque para suportar upload real de imagens e vídeos de veículo, mantendo compatibilidade total com o modelo atual por link:

- `photoUrl`
- `photos`
- `videoUrl`

O padrão de uso passa a ser upload de arquivo. O modo por link continua suportado para operação manual e integrações existentes.

## Status Atual

Esta feature já está parcialmente implementada no código local.

### Já entregue

- Tabela estruturada `inventory_vehicle_media`
- Sincronização com os campos legados do veículo
- Upload via backend para storage
- Leitura de mídia por veículo
- Exclusão lógica da mídia
- Definição de capa principal
- Reordenação de mídia no backend
- Rate limit específico para upload de mídia do estoque
- Form de estoque com upload local e upload imediato em edição
- Extração de metadados no frontend
  - largura
  - altura
  - duração
- Exclusão física do objeto no bucket quando houver credenciais S3 configuradas
- Testes automatizados cobrindo helper de mídia, router e isolamento de storage

### Em uso híbrido

Hoje o fluxo já suporta dois mundos ao mesmo tempo:

- mídia enviada por upload
- mídia cadastrada por URL externa

## Arquitetura Recomendada

### Modelo de dados

Tabela dedicada: `inventory_vehicle_media`

Campos:

- `id`
- `tenantId`
- `inventoryVehicleId`
- `mediaType`
  - `image`
  - `video`
- `sourceMode`
  - `upload`
  - `external_url`
  - `integration`
- `storageProvider`
  - `s3`
  - `external`
- `url`
- `storageKey`
- `fileName`
- `mimeType`
- `fileSizeBytes`
- `width`
- `height`
- `durationSeconds`
- `sortOrder`
- `isPrimary`
- `status`
  - `active`
  - `deleted`
  - `processing`
- `createdBySellerId`
- `createdAt`
- `updatedAt`
- `deletedAt`

### Campos legados preservados

Na tabela principal do veículo, seguem válidos:

- `photoUrl`
- `photos`
- `videoUrl`

### Regra de sincronização

- `photoUrl` = imagem principal ativa
- `photos` = array ordenado das imagens ativas
- `videoUrl` = primeiro vídeo ativo

Isso mantém compatibilidade com:

- estoque público
- integrações
- CRM
- telas legadas

## Estratégia de Storage

### Caminho de chave

Padrão adotado:

- `t/<tenantId>/inventory/<vehicleId>/images/<uuid>.<ext>`
- `t/<tenantId>/inventory/<vehicleId>/videos/<uuid>.<ext>`

### Abstração usada

O módulo continua consumindo `server/storage.ts`, e não depende diretamente de S3 em todas as operações.

Hoje a estratégia está assim:

- upload: via storage proxy atual do projeto
- delete físico: via AWS SDK quando as envs S3 estão configuradas

Isso permite rollout gradual sem quebrar o padrão já usado no restante do sistema.

## Configuração Operacional

### Variáveis já necessárias para upload

- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`

### Variáveis necessárias para exclusão física no bucket

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`

### Variáveis opcionais

- `AWS_S3_ENDPOINT`
- `AWS_S3_FORCE_PATH_STYLE=true`

### Comportamento sem credenciais S3

Se as envs S3 não estiverem configuradas:

- o upload continua funcionando
- a mídia é removida do banco
- a referência legacy é recalculada
- a exclusão física do objeto é marcada como `skipped`

Isso evita quebrar a operação, mas deve ser tratado como gap de infraestrutura até produção.

## Fluxos Suportados

### 1. Cadastro com upload

1. usuário seleciona imagens e vídeos
2. frontend extrai metadados
3. veículo é salvo
4. arquivos pendentes são enviados
5. backend persiste `inventory_vehicle_media`
6. backend sincroniza `photoUrl/photos/videoUrl`

### 2. Edição com upload imediato

1. usuário abre veículo existente
2. adiciona mídia
3. frontend sobe arquivo imediatamente
4. backend persiste item de mídia
5. backend recalcula campos legados

### 3. Cadastro ou edição por link

1. operador informa URLs
2. backend converte isso em mídia estruturada `external_url`
3. backend mantém consistência com os campos legados

### 4. Remoção de mídia enviada

1. mídia é marcada como `deleted`
2. backend tenta exclusão física no bucket quando aplicável
3. backend recalcula capa e listas legadas
4. auditoria registra o resultado

### 5. Reordenação

1. frontend permite reordenar visualmente
2. backend persiste `sortOrder`
3. backend recalcula `photos`

## UX Atual e Recomendada

### Já presente localmente

- upload de arquivos na aba de mídia
- preview de imagem e vídeo
- cards de mídia enviada
- cards de fila local no create
- capa principal por botão
- metadados básicos exibidos
- reordenação local/backend preparada

### Padrão recomendado para lançamento

- upload como fluxo primário
- links como modo compatível
- feedback de tamanho e tipo por item
- indicação clara de capa
- indicação visual de ordem

## Limites Atuais

### Implementados

- imagem: até `8 MB`
- vídeo: até `9 MB`

### Observação importante

Como o upload atual ainda passa por base64 e backend:

- é bom para imagens pequenas e médias
- é aceitável para vídeos curtos
- não é o desenho ideal para vídeos maiores

## Melhorias Prioritárias Recomendadas

### P0

- validar visualmente drag and drop desktop/mobile
- corrigir todos os textos remanescentes com acentuação quebrada no form do estoque
- adicionar feedback explícito quando `storageDeleteSkipped = true`
- adicionar teste de integração cobrindo `deleteMedia` com `storageDelete`

### P1

- adicionar reorder também para mídia por link estruturada
- permitir “definir capa” na fila local do create sem depender de ordem manual
- adicionar limite configurável de quantidade de imagens por veículo
- impedir múltiplos vídeos quando a regra de negócio exigir apenas um

### P2

- extração de thumbnail de vídeo
- compressão ou resize opcional de imagem
- rotina de cleanup para mídia órfã
- telemetria de falhas por upload, delete e reorder

### P3

- presigned upload direto para S3
- multipart upload para vídeos grandes
- fila assíncrona para processamento de mídia

## Próximos Passos de Arquitetura

### Recomendação de lançamento

Lançar com o modelo híbrido atual, desde que os itens abaixo sejam fechados:

1. ambiente S3 de produção configurado
2. validação visual da aba de mídia no estoque
3. revisão final de strings e acentuação
4. teste manual de:
   - create com imagem
   - create com vídeo
   - edit com upload imediato
   - delete com exclusão física
   - reorder persistido
   - fluxo por link

### Recomendação de segunda fase

Migrar vídeos grandes para upload direto ao bucket com presigned URL:

- menos memória no backend
- menos latência
- menos risco de timeout
- melhor escalabilidade

## Riscos e Mitigações

### Payload de vídeo grande

Mitigação:

- manter limite baixo no V1
- planejar presigned upload no V2

### Inconsistência entre tabela nova e legado

Mitigação:

- nunca atualizar `photoUrl/photos/videoUrl` fora da rotina de consolidação central

### Objeto órfão no bucket

Mitigação:

- delete físico no fluxo normal
- futura rotina de varredura por `storageKey`

### Falta de credenciais S3 em produção

Mitigação:

- checklist de infra antes do deploy
- alerta em operação quando delete for `skipped`

## Checklist Operacional

Antes do deploy:

- rodar migration `0080_inventory_vehicle_media.sql`
- validar `BUILT_IN_FORGE_API_URL`
- validar `BUILT_IN_FORGE_API_KEY`
- validar `AWS_REGION`
- validar `AWS_ACCESS_KEY_ID`
- validar `AWS_SECRET_ACCESS_KEY`
- validar `AWS_S3_BUCKET`
- validar permissão de delete no bucket
- testar upload e delete em tenant real de homologação

Depois do deploy:

- monitorar criação de mídia por tenant
- monitorar falhas de upload
- monitorar deletes com `storageDeleteSkipped`
- revisar crescimento do bucket

## Arquivos Principais da Feature

- [drizzle/0080_inventory_vehicle_media.sql](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/drizzle/0080_inventory_vehicle_media.sql)
- [drizzle/schema.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/drizzle/schema.ts)
- [shared/inventory.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/shared/inventory.ts)
- [server/inventoryMedia.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/server/inventoryMedia.ts)
- [server/storage.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/server/storage.ts)
- [server/routers/inventoryRouter.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/server/routers/inventoryRouter.ts)
- [client/src/components/inventory/InventoryVehicleForm.tsx](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/client/src/components/inventory/InventoryVehicleForm.tsx)
- [client/src/pages/admin/AdminInventoryCreate.tsx](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/client/src/pages/admin/AdminInventoryCreate.tsx)
- [client/src/pages/admin/AdminInventoryEdit.tsx](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/client/src/pages/admin/AdminInventoryEdit.tsx)

## Conclusão

O desenho escolhido continua sendo o mais sólido para lançamento:

1. mídia estruturada própria
2. compatibilidade com legado
3. upload como padrão
4. link como compatibilidade
5. caminho aberto para escalar com presigned upload depois

Hoje a base já ficou pronta para operação real com bem menos retrabalho futuro.
