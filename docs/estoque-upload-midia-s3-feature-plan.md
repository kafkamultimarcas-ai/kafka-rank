# Feature Plan: Upload de Fotos e Vídeos no Estoque com S3

## CAPABILITY

Hoje o cadastro de veículos no estoque aceita mídia apenas por URL, com os campos `photoUrl`, `photos[]` e `videoUrl`. A capacidade desejada é evoluir o módulo de estoque para permitir upload real de arquivos de imagem e vídeo no momento do cadastro e da edição do veículo, usando bucket S3 da Amazon como armazenamento padrão, sem quebrar o modo atual por link.

O resultado esperado é:

- upload de fotos e vídeos como fluxo principal
- manutenção do fluxo atual por URL externa
- compatibilidade com integrações que continuarão fornecendo links
- persistência multi-tenant segura
- base arquitetural pronta para escalar com reorder, capa principal, remoção e auditoria

## CONTEXTO ATUAL ENCONTRADO

### Frontend

- O cadastro/admin de estoque passa pelo formulário em [client/src/components/inventory/InventoryVehicleForm.tsx](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/client/src/components/inventory/InventoryVehicleForm.tsx).
- O formulário hoje trabalha com:
  - `photoUrl`
  - `videoUrl`
  - `photosText` para galeria via lista de URLs
- A experiência atual é orientada a link manual, sem fluxo nativo de upload.

### Shared contract

- O schema compartilhado do estoque está em [shared/inventory.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/shared/inventory.ts).
- Hoje o contrato forte é URL-based:
  - `photoUrl: optionalUrl`
  - `photos: string[]`
  - `videoUrl: optionalUrl`
- Isso confirma que todo o domínio atual assume mídia já resolvida como URL pública.

### Backend

- O router principal do estoque está em [server/routers/inventoryRouter.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/server/routers/inventoryRouter.ts).
- O persist atual faz:
  - `photoUrl` como capa principal
  - `photos` como lista serializada
  - `videoUrl` como URL opcional
- Não existe hoje mutation específica de upload de mídia do estoque.

### Armazenamento

- Já existe uma abstração de storage em [server/storage.ts](C:/Users/pfsou/Projetos/Brothers-Labs/kafka/kafka-rank/server/storage.ts).
- O projeto já utiliza `storagePut(...)` em outros módulos.
- Essa camada hoje já resolve:
  - prefixo por tenant
  - upload de binário
  - geração de URL final
- Arquiteturalmente, isso é importante porque evita acoplamento direto do estoque ao provider.

### Referências internas já existentes

O sistema já tem padrões prontos de upload em outros domínios, por exemplo:

- financeiro
- ficha
- pós-venda
- custos de veículo
- CRM/mídias

Isso reduz risco de implementação, porque o produto já possui:

- contrato cliente → backend com arquivo serializado
- validação backend
- persistência em storage
- gravação da URL final no domínio de negócio

## OBJETIVO DE ARQUITETURA

Permitir que o estoque suporte dois modos de mídia de forma nativa:

### Modo 1: Upload

Fluxo padrão da UI.

- usuário seleciona imagem ou vídeo
- backend envia para storage/S3
- sistema grava URL resolvida e metadados

### Modo 2: Link externo

Fluxo de compatibilidade e integração.

- usuário ou integração informa URL como hoje
- sistema valida e persiste
- não há upload do binário

### Regra central

O domínio de estoque não deve “escolher um ou outro”. Ele deve suportar ambos, com o upload como padrão de UX e link externo como modo compatível.

## DECISÃO SÊNIOR RECOMENDADA

### Recomendação principal

Implementar uma camada de mídia estruturada para estoque, mas preservar os campos atuais como contrato de compatibilidade.

Em vez de tentar sobreviver apenas com `photoUrl`, `photos[]` e `videoUrl`, o ideal é introduzir um modelo de mídia mais rico, mantendo sincronização backward-compatible com os campos legados.

### Por que não ficar só nos campos atuais

Os campos atuais não representam bem:

- tipo da mídia
- origem da mídia
- ordem consistente
- foto principal
- metadados do arquivo
- chave de storage
- exclusão/limpeza futura
- coexistência entre upload e link

### Por que não quebrar o modelo atual agora

Hoje outros consumidores já leem:

- `photoUrl`
- `photos`
- `videoUrl`

Então a evolução correta é:

1. adicionar um modelo estruturado
2. continuar populando os campos legados
3. migrar consumidores gradualmente quando fizer sentido

## PROPOSTA DE MODELAGEM

## Opção A: Evolução mínima

Continuar armazenando só:

- `photoUrl`
- `photos`
- `videoUrl`

E apenas trocar a origem dessas URLs:

- antes: coladas manualmente
- depois: geradas por upload para S3

### Vantagens

- menor custo inicial
- sem nova tabela
- menor esforço de rollout

### Desvantagens

- fraco para vídeos múltiplos
- difícil manter ordenação rica
- sem metadados de arquivo
- sem rastreabilidade de origem
- limpeza de storage mais frágil

## Opção B: Modelo estruturado de mídia

Criar tabela dedicada, por exemplo `inventory_vehicle_media`, e manter sincronização com os campos atuais da tabela de veículo.

### Recomendação

Esta é a opção recomendada para lançamento sólido.

### Estrutura sugerida

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

### Campos legados que devem continuar existindo

Na tabela principal do veículo:

- `photoUrl`
- `photos`
- `videoUrl`

### Regra de sincronização recomendada

- `photoUrl` = URL da imagem primária
- `photos` = array ordenado das imagens ativas
- `videoUrl` = URL do vídeo principal ou primeiro vídeo ativo

Isso garante compatibilidade com:

- estoque público
- CRM
- integrações
- telas legadas

## ESTRATÉGIA DE STORAGE

## Recomendação arquitetural

Não acoplar o módulo de estoque diretamente ao AWS SDK como primeira camada de uso.

O caminho mais sênior aqui é:

- manter `server/storage.ts` como abstração
- fazer o provider final apontar para o bucket S3 da Amazon
- deixar o estoque depender do contrato de storage, e não do provedor

### Benefícios

- reaproveita padrão já existente do projeto
- reduz duplicação
- facilita troca futura de provider
- centraliza tenant prefix, naming, ACL/presign e observabilidade

### Se a equipe quiser AWS nativo no app

Criar uma interface de provider, por exemplo:

- `StorageProvider.put`
- `StorageProvider.delete`
- `StorageProvider.getPublicUrl`
- `StorageProvider.getSignedUploadUrl`

Com implementações:

- provider atual do projeto
- provider S3

Mesmo nesse cenário, o estoque ainda deve consumir a abstração.

## ESTRATÉGIA DE CHAVES NO BUCKET

Padrão recomendado:

- `t/<tenantId>/inventory/<vehicleId>/images/<uuid>.<ext>`
- `t/<tenantId>/inventory/<vehicleId>/videos/<uuid>.<ext>`

### Regras importantes

- nunca confiar no nome original do arquivo como key final
- normalizar extensão a partir do mime validado
- manter tenant isolado por prefixo
- não misturar mídias de estoque com outros domínios no mesmo path

## FLUXO FUNCIONAL PROPOSTO

## 1. Cadastro do veículo

Ao criar ou editar um veículo, a seção de mídia deve permitir:

- upload múltiplo de imagens
- upload de vídeo
- informar links manualmente
- definir foto principal
- reordenar galeria
- remover item antes de salvar

## 2. UX recomendada

Na aba de mídia:

- bloco principal `Adicionar mídia`
- subtabs ou toggle:
  - `Upload de arquivos`
  - `Usar link externo`

### Upload de arquivos

- drag and drop
- seleção múltipla para imagens
- seleção simples ou controlada para vídeo
- preview imediato
- barra de progresso
- estado de erro por item
- ação para definir capa

### Link externo

- manter campos compatíveis com o modelo atual
- `Foto principal (URL)`
- `Galeria (URLs)`
- `Vídeo (URL)`

### Regra de UX

O modo por upload deve aparecer como padrão.
O modo por link deve existir como opção avançada/compatível.

## CONTRATO DE BACKEND RECOMENDADO

## Procedimentos sugeridos

- `inventory.uploadMedia`
- `inventory.deleteMedia`
- `inventory.reorderMedia`
- `inventory.setPrimaryMedia`
- `inventory.listMedia`

E manter:

- `inventory.createDetailed`
- `inventory.updateDetailed`

### Responsabilidade de cada um

#### `inventory.uploadMedia`

- recebe arquivo e contexto do veículo
- valida mime, extensão e tamanho
- envia para storage
- persiste item em `inventory_vehicle_media`
- recalcula compatibilidade em `photoUrl/photos/videoUrl`

#### `inventory.deleteMedia`

- marca mídia como removida
- opcionalmente agenda exclusão física do bucket
- recalcula capa/listas legadas

#### `inventory.reorderMedia`

- recebe ordenação final
- reaplica `sortOrder`
- recalcula `photos`

#### `inventory.setPrimaryMedia`

- define capa principal entre imagens
- recalcula `photoUrl`

## CONTRATO DE FRONTEND RECOMENDADO

## Componentização sugerida

- `InventoryVehicleMediaTab`
- `InventoryMediaUploader`
- `InventoryMediaDropzone`
- `InventoryMediaPreviewGrid`
- `InventoryMediaLinkFields`
- `InventoryMediaVideoCard`

## Estado sugerido

Separar claramente:

- `uploadedMediaDraft[]`
- `externalMediaDraft[]`
- `removedMediaIds[]`
- `primaryMediaId`

### Regra de composição antes do submit

O frontend não deve montar a verdade final apenas em `photoUrl/photos/videoUrl`.
Ele deve trabalhar com um draft rico e o backend consolida.

## COMPATIBILIDADE COM O MODELO ATUAL

## Invariante obrigatória

Enquanto existirem consumidores legados, o backend deve continuar garantindo:

- `photoUrl` sempre coerente
- `photos` sempre coerente
- `videoUrl` sempre coerente

### Compatibilidade com integração por link

Integrações de estoque que continuarem mandando links devem seguir válidas.

Exemplos:

- integração externa envia galeria por URL
- scraper/sync preenche `photoUrl/photos`
- operador manual cola uma URL de vídeo hospedada externamente

Tudo isso deve seguir funcionando sem obrigar upload.

## REGRAS DE NEGÓCIO RECOMENDADAS

### Imagens

- múltiplas imagens permitidas
- exatamente uma imagem primária quando houver imagens
- ordem explícita
- limite máximo por veículo

### Vídeos

- suportar pelo menos um vídeo principal no V1
- permitir evolução para múltiplos vídeos no modelo estruturado

### Modo misto

Permitir coexistência entre:

- imagens por upload
- imagens por link
- vídeo por upload
- vídeo por link

### Fonte/origem

Registrar a origem da mídia:

- upload manual
- link manual
- integração

Isso ajuda em auditoria, suporte e futuras rotinas de sync.

## VALIDAÇÕES E SEGURANÇA

## Backend

- validar mime real permitido
- validar extensão coerente com mime
- limitar tamanho por arquivo
- limitar quantidade por veículo
- rejeitar payloads enormes
- rejeitar URLs inválidas no modo link
- isolar mídia por tenant
- impedir acesso cruzado de tenant

## Frontend

- bloquear extensões não suportadas antes do submit
- exibir feedback imediato
- impedir enviar vídeo acima do limite
- mostrar estado de upload e falha por item

## Regras sugeridas de tamanho

Exemplo inicial seguro:

- imagem: até 8 MB por arquivo
- vídeo: até 80 MB no V1 server-mediated

### Observação importante

Se o backend atual estiver trabalhando com payload base64 e limite de body relativamente baixo, vídeo grande via base64 vai escalar mal.

Por isso a recomendação senior é:

- V1: upload server-mediated apenas se o limite for controlado
- V2: presigned upload ou multipart direto para S3 para vídeos maiores

## ESTRATÉGIA DE UPLOAD

## Alternativa 1: Upload via backend

Fluxo:

1. frontend lê arquivo
2. envia para mutation
3. backend faz upload ao storage/S3
4. backend retorna item persistido

### Vantagens

- consistente com o padrão já usado no projeto
- menor complexidade inicial
- mais simples para imagens pequenas e médias

### Desvantagens

- base64 aumenta payload
- vídeos grandes pressionam memória e tempo de request
- escala pior

## Alternativa 2: Presigned URL / direct-to-S3

Fluxo:

1. frontend pede autorização de upload
2. backend gera presigned
3. frontend sobe direto ao S3
4. backend recebe confirmação/finalização
5. backend persiste item de mídia

### Vantagens

- melhor para vídeo
- menos carga no app server
- maior escalabilidade

### Desvantagens

- fluxo mais complexo
- exige controle mais cuidadoso de finalização e limpeza de uploads órfãos

## Recomendação prática

### Fase 1

- imagens por upload via backend
- vídeo por link ou upload controlado com limite pequeno

### Fase 2

- presigned/direct upload para vídeo
- opcionalmente também para imagens

## IMPACTOS EM OUTROS MÓDULOS

## Estoque público

Não deve quebrar.

Como continuará consumindo URLs, ele permanece compatível se `photoUrl/photos/videoUrl` continuarem sendo mantidos.

## CRM

Hoje já existem fluxos que usam URLs de imagem do estoque para envio de mídia ao lead.
Logo:

- não remover campos legados
- garantir URLs acessíveis
- garantir que capa e galeria continuem consistentes

## Integrações

Integrações que trazem link devem continuar funcionais sem mudança obrigatória.

## Limpeza de mídia

Ao excluir mídia ou veículo, o sistema deve ter estratégia para:

- remover referência do banco
- recalcular compatibilidade
- opcionalmente apagar objeto no bucket
- evitar órfãos

## MIGRAÇÃO RECOMENDADA

## Etapa 1

Adicionar tabela estruturada de mídia.

## Etapa 2

Backfill opcional dos veículos existentes:

- `photoUrl` vira item primário de imagem
- `photos[]` viram itens ordenados
- `videoUrl` vira item de vídeo

## Etapa 3

Passar a UI a consumir a tabela de mídia.

## Etapa 4

Manter sincronização reversa para os campos legados.

## FASES DE IMPLEMENTAÇÃO

## Fase 1: Fundacional

- definir contrato de mídia do estoque
- criar migration de `inventory_vehicle_media`
- criar camada service/repository de mídia
- reaproveitar `storage.ts`

## Fase 2: Backend funcional

- `uploadMedia`
- `deleteMedia`
- `setPrimaryMedia`
- `reorderMedia`
- consolidação automática em `photoUrl/photos/videoUrl`

## Fase 3: Frontend admin

- aba de mídia com upload
- modo link preservado
- preview
- reorder
- capa principal
- progresso e erros

## Fase 4: Hardening

- limites
- observabilidade
- cleanup
- testes

## Fase 5: Escala

- presigned upload para vídeos
- processamento assíncrono
- extração de metadados
- compressão/thumbnail opcional

## TESTES RECOMENDADOS

## Unitários

- normalização de mídia
- cálculo de capa
- serialização compatível para `photoUrl/photos/videoUrl`

## Integração

- upload image
- upload video
- link externo
- modo misto
- reorder
- delete
- proteção multi-tenant

## E2E

- cadastrar veículo com upload de imagens
- cadastrar veículo com link externo
- editar veículo e trocar capa
- remover mídia
- validar persistência final no card/lista do estoque

## RISCOS E MITIGAÇÕES

### Risco 1: payload grande demais

Mitigação:

- limitar tamanho
- começar com imagens
- adotar direct-to-S3 para vídeos grandes

### Risco 2: quebrar integrações por link

Mitigação:

- manter modo link oficialmente suportado
- preservar contrato legado

### Risco 3: inconsistência entre tabela nova e campos antigos

Mitigação:

- centralizar consolidação em service único
- nunca deixar frontend escrever diretamente os campos legados sem passar pela regra de consolidação

### Risco 4: arquivos órfãos no bucket

Mitigação:

- soft delete no banco
- rotina de cleanup
- logs por storage key

### Risco 5: UX confusa com dois modos

Mitigação:

- upload como padrão
- link como modo secundário
- linguagem simples: `Enviar arquivo` e `Usar link`

## NON-GOALS

- não reescrever agora todo consumo legado de mídia do estoque
- não obrigar integrações a usar upload
- não depender de processamento de vídeo avançado no V1
- não transformar essa feature em DAM completo de mídia

## OPEN QUESTIONS

- O V1 precisa suportar múltiplos vídeos ou apenas um?
- O bucket será privado com URL assinada ou público com URL direta?
- O storage atual do projeto já será apontado para S3 ou haverá provider novo?
- A exclusão do veículo deve apagar fisicamente as mídias no mesmo ato ou apenas agendar cleanup?
- Há necessidade de thumbnails e compressão já no V1?
- Existe limite comercial esperado de quantidade de fotos por veículo?

## HANDOFF

Status recomendado: `ready for implementation`.

### Recomendação sênior final

Para entrega robusta sem retrabalho, o melhor caminho é:

1. criar uma tabela estruturada de mídia do estoque
2. manter `photoUrl/photos/videoUrl` como camada de compatibilidade
3. usar upload como experiência padrão
4. manter link externo como modo suportado
5. reaproveitar a abstração de storage já existente e conectá-la ao S3
6. deixar direct-to-S3 para vídeos grandes como evolução natural de segunda fase

### Resultado arquitetural dessa abordagem

- não quebra o legado
- suporta integração por link
- habilita upload real com S3
- melhora governança de mídia
- prepara o estoque para escala e lançamento com padrão sênior
