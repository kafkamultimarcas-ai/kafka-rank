# Análise e Plano de Implementação: Módulo de NF-e para Santa Catarina

## Objetivo

Este documento propõe a implementação de um módulo de NF-e para o Kafka Rank, com foco inicial em operações de loja de veículos em Santa Catarina, considerando:

- emissão de NF-e modelo 55;
- preparação do sistema para contingência, cancelamento, inutilização e consulta de status;
- aderência operacional ao fluxo atual de `vendas`, `estoque`, `financeiro`, `crm` e `fichas`;
- viabilidade técnica e regulatória para produção.

O objetivo não é substituir contador, consultoria fiscal ou parametrização tributária por empresa. O módulo deve ser construído como plataforma operacional e auditável, com regras fiscais parametrizáveis por tenant e validação humana nos pontos críticos.

## Resumo Executivo

### Conclusão principal

A implementação é viável, mas **não recomendo começar emitindo NF-e “100% nativa” direto contra SEFAZ/SVRS na primeira entrega**.

A recomendação mais segura para lançamento é:

1. construir o **domínio interno de faturamento fiscal** no produto;
2. suportar **cadastro fiscal, pré-validação, geração do payload fiscal e trilha de auditoria**;
3. integrar primeiro com um **provedor emissor de NF-e** ou com uma camada isolada de emissão;
4. só depois avaliar emissão direta via web services oficiais se houver volume, maturidade operacional e necessidade real de reduzir custo por nota.

### Motivos

- NF-e não é só “gerar XML”; envolve certificado, assinatura, regras fiscais, eventos, contingência, rejeições, numeração, CSC/credenciamento, armazenamento de XML/protocolo e operação com impacto financeiro e tributário.
- Em Santa Catarina existe exigência operacional de SAT/credenciamento do desenvolvedor/programa aplicativo em alguns fluxos de autorização de uso de processamento de dados, o que adiciona camada regulatória estadual.
- O projeto já possui bons domínios de `sales`, `inventory`, `financeiro`, `crm` e multi-tenant, então faz sentido acoplar a NF-e como **novo bounded context**, e não como “mais um campo na venda”.

## Base Oficial Considerada

### NF-e e documentação nacional

- O Portal Nacional da NF-e publica o MOC, schemas e notas técnicas, que são a base para integração e validação da NF-e.  
  Fonte: Portal SVRS, seção Documentos, com MOC 7.00, anexos e schemas atualizados em 2025 e 2026.  
  Link: https://dfe-portal.svrs.rs.gov.br/NFe/Documentos

- O MOC 7.00 é descrito como o documento que define as especificações e critérios técnicos necessários para a integração entre os portais das secretarias de fazenda e os sistemas emissores.  
  Fonte: https://dfe-portal.svrs.rs.gov.br/NFe/Documentos

- O pacote de schemas e as NTs recentes mostram que o leiaute continua evoluindo, inclusive com adequações da Reforma Tributária em 2025/2026.  
  Fonte: https://dfe-portal.svrs.rs.gov.br/NFe/Documentos  
  Fonte: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY%3D

### Serviços web e autorizador

- O portal de serviços do ecossistema NF-e lista os serviços de autorização, retorno, eventos, consulta de protocolo e inutilização, inclusive no ambiente SVRS.  
  Fonte: https://dfe-portal.svrs.rs.gov.br/Nfe/Servicos

- O próprio portal SVRS lista Santa Catarina entre as Secretarias de Fazenda atendidas no ambiente.  
  Fonte: https://dfe-portal.svrs.rs.gov.br/Nfe/Servicos

### Santa Catarina

- A página da SEF/SC sobre NF-e reforça que o portal divulga o Projeto NF-e coordenado pelo ENCAT em parceria com a RFB.  
  Fonte: https://www.sef.sc.gov.br/saiba-mais/nfe-nota-fiscal-eletronica

- A SEF/SC informa que a consulta completa de NF-e para participantes da operação requer autenticação por usuário/senha ou certificado digital.  
  Fonte: https://www.sef.sc.gov.br/saiba-mais/nfe-nota-fiscal-eletronica

- A SEF/SC disponibiliza web service de download de XML para contabilistas/empresas catarinenses vinculados ao CNPJ/CPF e identificados por certificado digital.  
  Fonte: https://www.sef.sc.gov.br/saiba-mais/web-service-para-download-de-nfe

- A SEF/SC publica serviço formal para autorização de uso de processamento de dados para emissão de documentos fiscais, com requisitos como cadastro no SAT, credenciamento do desenvolvedor e declaração conforme Ato DIAT 33/2023.  
  Fonte: https://www.sef.sc.gov.br/servicos/solicitar-a-autorizacao-de-uso-de-processamento-de-dados-para-emissao-de-documentos-fiscais

## Leitura do Cenário Atual do Projeto

### O que o sistema já tem hoje

- Multi-tenant maduro com `tenantId` espalhado nas tabelas principais.
- Cadastro de vendas em `sales`.
- Estoque e domínio operacional de veículos.
- CRM com cliente, telefone, placa e origem do lead.
- Financeiro com contas a pagar/receber.
- Estrutura administrativa com módulos por tenant.

### Pontos do domínio que já ajudam a NF-e

- `sales` já possui:
  - `vehicleModel`
  - `vehiclePlate`
  - `value`
  - `customerName`
  - `customerCpf`
  - `customerEmail`
  - `customerPhone`

- `inventory` e `crm` já ajudam a preencher:
  - veículo
  - comprador
  - placa
  - contexto comercial

### Gaps importantes hoje

O projeto **não tem ainda** um domínio fiscal próprio para NF-e. Faltam:

- dados fiscais do emitente por tenant;
- série e numeração por ambiente;
- certificado digital A1 e rotação segura;
- CST/CSOSN, CFOP, NCM, CEST, origem, unidade comercial/tributável;
- regras de ICMS, PIS, COFINS, IPI, FCP, DIFAL e preparação para IBS/CBS;
- endereços fiscais completos de emitente e destinatário;
- trilha de eventos da nota;
- armazenamento do XML assinado, XML autorizado, protocolo, DANFE e eventos;
- fila resiliente de emissão/reenvio/consulta.

## Escopo Recomendado da Primeira Versão

### Escopo V1 recomendado

- emissão de NF-e modelo 55 para venda de veículo;
- fluxo por tenant;
- homologação e produção separadas;
- cadastro fiscal do emitente;
- cadastro mínimo fiscal do comprador;
- geração de pré-nota;
- validação antes de transmitir;
- autorização;
- cancelamento dentro da janela permitida;
- inutilização de faixa;
- download/armazenamento de XML e DANFE;
- trilha de auditoria operacional;
- integração com `sales` e `inventory`.

### Fora da V1

- NFC-e;
- NFS-e nacional;
- CT-e/MDF-e;
- carta de correção eletrônica em primeira entrega;
- manifesto automatizado de destinatário;
- cálculo tributário universal para qualquer segmento;
- emissão para múltiplos cenários complexos sem parametrização do contador.

## Estratégia Recomendada

## Opção A: emissão direta contra SEFAZ/SVRS

### Vantagens

- menor custo variável por nota;
- domínio total do fluxo;
- independência de terceiro.

### Desvantagens

- maior risco regulatório e operacional;
- necessidade de lidar com XML, assinatura, cadeia ICP-Brasil, rejeições e contingência desde o início;
- manutenção contínua com NTs e alterações de schema;
- operação crítica mais difícil em ambiente multi-tenant.

## Opção B: domínio interno + provedor emissor

### Vantagens

- acelera time-to-market;
- reduz risco de assinatura, transmissão e contingência na primeira versão;
- facilita suporte e homologação por loja;
- deixa o projeto focado no fluxo de negócio e auditoria.

### Desvantagens

- custo por nota ou mensalidade;
- dependência de terceiro;
- necessidade de mapear payload interno para payload do provedor.

## Decisão recomendada

Para este produto, recomendo:

- **V1**: domínio interno fiscal + integração com provedor;
- **V2**: camada de abstração `NfeProvider` com possibilidade de `provider = external | sefaz-direct`;
- **V3**: avaliar emissão direta apenas se houver justificativa financeira e equipe para sustentar o compliance técnico.

## Arquitetura Proposta

## Novo bounded context

Criar um módulo próprio, por exemplo:

- `server/routers/nfeRouter.ts`
- `server/nfeDb.ts`
- `server/nfe/`
- `client/src/pages/admin/AdminNfe.tsx`
- `client/src/features/nfe/...`

## Entidades novas sugeridas

### `tenant_fiscal_profiles`

Dados fiscais por tenant:

- razão social
- nome fantasia
- CNPJ
- IE
- CRT
- CNAE
- regime tributário
- endereço fiscal completo
- telefone/email fiscal
- ambiente padrão
- série padrão
- próximo número por série/ambiente

### `tenant_certificates`

- tenantId
- tipo do certificado
- alias
- validade inicial/final
- fingerprint
- blob criptografado
- senha criptografada ou referência externa
- status

### `nfe_operation_profiles`

Perfil parametrizável por operação:

- tipo de operação
- CFOP padrão
- natureza da operação
- finalidade
- indicador de presença
- indicador de consumidor final
- política de frete
- regras fiscais padrão

### `nfe_invoices`

Cabeçalho da nota:

- tenantId
- saleId
- customerId opcional
- inventoryVehicleId opcional
- status
- ambiente
- modelo
- série
- número
- chave de acesso
- protocolo
- recibo/lote
- motivo rejeição
- datas de emissão/autorização/cancelamento
- totais
- XML gerado
- XML assinado
- XML autorizado
- DANFE URL

### `nfe_invoice_items`

- invoiceId
- itemNumber
- descrição
- NCM
- CEST
- CFOP
- unidade
- quantidade
- valor unitário
- valor total
- origem
- CST/CSOSN
- bases e valores tributários

### `nfe_events`

- invoiceId
- tipo do evento
- status
- protocolo
- payload
- resposta
- criado por
- timestamp

### `nfe_audit_logs`

- invoiceId opcional
- actorType
- actorId
- ação
- payload resumido
- before/after
- timestamp

## Interfaces de domínio

### `FiscalProfileService`

- gerencia emitente, série, ambiente e parâmetros fiscais.

### `NfeDraftService`

- converte `sale + inventory + customer + tenant profile` em uma pré-nota validável.

### `TaxRuleEngine`

- aplica regras parametrizadas do tenant.
- na V1, deve ser configurável e conservador, não “mágico”.

### `NfeProvider`

Contrato único:

- `validateDraft`
- `authorize`
- `queryStatus`
- `cancel`
- `invalidateRange`
- `downloadDanfe`

Implementações:

- `ExternalProviderNfeProvider`
- `DirectSefazNfeProvider` futuro

## Fluxo Operacional Recomendado

## Fluxo principal

1. venda aprovada/confirmada no sistema;
2. usuário clica em `Gerar NF-e`;
3. sistema monta `draft`;
4. sistema valida dados faltantes;
5. usuário revisa preview fiscal;
6. emissão entra em fila;
7. provider/SEFAZ autoriza;
8. sistema persiste chave, protocolo, XML autorizado e DANFE;
9. venda vira `faturada`;
10. financeiro e pós-venda podem consumir esse estado.

## Fluxos secundários

- cancelar NF-e;
- inutilizar numeração;
- reenviar consulta;
- regenerar DANFE;
- exportar XML;
- reconciliar nota emitida fora do sistema.

## Integrações com módulos atuais

## `sales`

A nota deve nascer preferencialmente de uma venda consolidada.

Sugestões:

- adicionar `invoiceStatus` em `sales`;
- adicionar `nfeInvoiceId` em `sales`;
- bloquear emissão duplicada sem override controlado;
- permitir vínculo 1:1 padrão entre venda e NF-e.

## `inventory`

Usar estoque para preencher:

- descrição comercial;
- placa/chassi/ano/modelo;
- eventualmente RENAVAM, combustível, cor e dados técnicos.

Também faz sentido marcar:

- `sold` já existe no domínio operacional;
- criar `fiscalReleasedAt` ou equivalente para rastrear quando o faturamento ocorreu.

## `crm`

Ajudará com:

- nome;
- telefone;
- email;
- CPF e endereço se o CRM passar a capturar isso melhor.

Mas o CRM não deve ser a fonte única de dados fiscais sem uma etapa de confirmação.

## `financeiro`

O módulo de NF-e deve conversar com financeiro em dois sentidos:

- leitura: entender valor da operação, sinal, pagamento, sinalização de comissão;
- escrita: registrar evento financeiro/fiscal, taxas do provedor, eventuais ajustes.

Não recomendo misturar emissão fiscal com contas a pagar/receber no mesmo agregado.

## Frontend Recomendado

## Tela administrativa nova

Criar rota dedicada, por exemplo:

- `/admin/nfe`
- `/t/:slug/admin/nfe`

### Subtelas

- `Configurações Fiscais`
- `Certificado Digital`
- `Operações e Regras`
- `NF-es`
- `Fila de Emissão`
- `Inutilizações e Eventos`

### Fluxos de UI

- wizard de configuração inicial;
- preview da nota antes da transmissão;
- timeline de eventos por nota;
- fila com retry manual;
- filtros por status: rascunho, pendente, autorizada, rejeitada, cancelada.

## Segurança e Compliance

## Certificado

O certificado A1 é um ativo crítico. Recomendação:

- armazenar criptografado;
- preferir envelope encryption ou KMS quando possível;
- nunca deixar senha em texto puro;
- registrar validade e expiração com alerta proativo.

## Dados pessoais

NF-e envolve PII:

- nome
- CPF/CNPJ
- endereço
- telefone/email

Recomendação:

- access control forte por tenant e papel;
- audit log de visualização/download;
- política de retenção e backup;
- mascaramento parcial em telas administrativas quando não necessário.

## Integridade operacional

- não permitir editar XML autorizado;
- toda correção deve virar evento ou nova emissão;
- trilha de auditoria imutável para ações críticas.

## Riscos Principais

## Risco fiscal

Maior risco do projeto. O erro não é só técnico; pode gerar documento inválido, tributação errada ou problema contábil.

Mitigação:

- homologação com contador da loja;
- perfis fiscais parametrizados por tenant;
- checklist de ativação;
- regras tributárias explicitadas e revisáveis.

## Risco técnico

- rejeições por schema/NT;
- contingência mal tratada;
- falha de sincronização entre venda e nota;
- duplicidade de emissão.

Mitigação:

- fila idempotente;
- chave única por `tenant + série + número + ambiente`;
- estado transacional bem modelado;
- retries com backoff;
- reconciliação por consulta.

## Risco regulatório em SC

Santa Catarina explicita requisitos de SAT, credenciamento do desenvolvedor e declaração AUPD/Ato DIAT 33/2023 para autorização de uso de processamento de dados em certos fluxos estaduais.

Mitigação:

- tratar o go-live fiscal como trilha operacional separada por tenant;
- validar com contador e com o time jurídico/tributário qual credenciamento se aplica ao modelo final adotado;
- se o provedor assumir parte disso, refletir essa responsabilidade contratualmente.

## Plano de Implementação

## Fase 0: Descoberta fiscal e decisão de integração

### Entregas

- mapear cenário tributário real das lojas alvo;
- definir se a V1 usará provedor ou emissão direta;
- definir matriz de operações suportadas;
- fechar checklist regulatório de SC por tenant.

### Saídas concretas

- matriz fiscal por operação;
- RACI com contador;
- decisão `build vs provider`.

## Fase 1: Fundamentos de dados

### Entregas

- novas tabelas fiscais;
- migrations;
- `nfeDb.ts`;
- seed mínima opcional para ambiente demo.

### Critério de pronto

- tenant consegue ter perfil fiscal completo e ambientes separados.

## Fase 2: Configuração administrativa

### Entregas

- tela de `Configurações Fiscais`;
- cadastro de emitente;
- upload/gestão de certificado;
- séries e numeração;
- perfis de operação.

### Critério de pronto

- um tenant consegue ficar “pronto para homologação”.

## Fase 3: Draft e validação

### Entregas

- `NfeDraftService`;
- preview da NF-e;
- validador de obrigatoriedade;
- logs de inconsistência por venda.

### Critério de pronto

- para uma venda elegível, o sistema gera draft consistente sem transmitir.

## Fase 4: Emissão

### Entregas

- provider adapter;
- fila de emissão;
- autorização em homologação;
- persistência de XML/protocolo/DANFE.

### Critério de pronto

- emissão homologada ponta a ponta com tenant piloto.

## Fase 5: Eventos e operação

### Entregas

- cancelamento;
- inutilização;
- consulta de status;
- retry manual;
- dashboard operacional da fila.

### Critério de pronto

- operação básica de produção sem intervenção em banco.

## Fase 6: Fechamento operacional

### Entregas

- integração com financeiro e pós-venda;
- alertas de falha;
- exportação XML;
- trilha de auditoria refinada;
- testes E2E e playbook de suporte.

### Critério de pronto

- módulo apto a rollout controlado.

## Roadmap Técnico Sugerido no Repositório

## Backend

- `server/routers/nfeRouter.ts`
- `server/nfeDb.ts`
- `server/nfe/NfeDraftService.ts`
- `server/nfe/NfeProvider.ts`
- `server/nfe/providers/ExternalProviderNfeProvider.ts`
- `server/nfe/validators/`
- `server/nfe/mappers/`
- `server/nfe/jobs/`

## Frontend

- `client/src/pages/admin/AdminNfe.tsx`
- `client/src/features/nfe/components/`
- `client/src/features/nfe/hooks/`
- `client/src/features/nfe/utils/`

## Banco

- novas tabelas `tenant_fiscal_profiles`, `tenant_certificates`, `nfe_invoices`, `nfe_invoice_items`, `nfe_events`, `nfe_audit_logs`, `nfe_operation_profiles`

## Regras de Produto Recomendadas

- só emitir NF-e a partir de venda com status elegível;
- bloquear emissão se CPF/CNPJ/endereço/regra fiscal estiverem incompletos;
- separar `rascunho fiscal` de `nota autorizada`;
- nunca apagar XML autorizado;
- toda ação crítica requer usuário autenticado e log.

## Ordem de Prioridade

### Alta

- perfil fiscal por tenant;
- certificado e segurança;
- draft fiscal;
- fila de emissão;
- vínculo com venda.

### Média

- DANFE e exportações;
- cancelamento/inutilização;
- dashboard operacional.

### Baixa para V1

- automações avançadas;
- reconciliação massiva;
- emissão direta sem provedor.

## Recomendação Final

Se o objetivo é lançar com qualidade e baixo risco:

- **não começar por XML + SEFAZ direto**;
- **começar por um módulo fiscal interno bem modelado**;
- **emitir via provedor na primeira versão**;
- **validar em homologação com 1 tenant piloto de SC**;
- **evoluir para emissão direta só depois do produto provar aderência operacional**.

O melhor desenho para este repositório é um módulo de NF-e como domínio próprio, multi-tenant, acoplado a `sales` e `inventory`, com UI administrativa, trilha de auditoria e contrato de provider.

## Referências Oficiais

- SEF/SC, página NF-e: https://www.sef.sc.gov.br/saiba-mais/nfe-nota-fiscal-eletronica
- SEF/SC, autorização de uso de processamento de dados: https://www.sef.sc.gov.br/servicos/solicitar-a-autorizacao-de-uso-de-processamento-de-dados-para-emissao-de-documentos-fiscais
- SEF/SC, web service de download de NFe: https://www.sef.sc.gov.br/saiba-mais/web-service-para-download-de-nfe
- SVRS, documentos da NF-e: https://dfe-portal.svrs.rs.gov.br/NFe/Documentos
- SVRS, serviços web da NF-e: https://dfe-portal.svrs.rs.gov.br/Nfe/Servicos
- Portal Nacional NF-e, NT 2025.002: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY%3D

## Observação de Atualização

Este documento foi elaborado em 18/07/2026. Como o ecossistema NF-e sofre alterações frequentes de schema, NT, credenciamento e regras tributárias, toda implementação deve revalidar a documentação oficial perto do início da homologação e do go-live.
