# Auditoria Completa - Kafka Rank CRM

> ⚠️ **Contexto**: documento sem data explícita, provavelmente anterior à branch `feat/multi-tenant`. Os números de dados (vendedores, leads) abaixo são um retrato de um momento específico, não o estado atual. Os itens de performance (índices em `crm_leads`/`crm_activities`) não foram reverificados nesta rodada — ver [`docs/multi-tenant/09-analise-prontidao-vendas.md`](docs/multi-tenant/09-analise-prontidao-vendas.md) pra lista de prioridades atualizada (não cobre performance de índice, então esse item pode continuar válido).

## Dados Atuais do Sistema
- **Vendedores:** 18 cadastrados
- **Leads CRM:** 342
- **Mensagens WhatsApp:** 3.302
- **Veículos no estoque:** 149
- **Vendas registradas:** 46
- **Transações financeiras:** 7
- **Chamados pós-venda:** 11
- **Atividades CRM:** 319.531 (tabela mais pesada: 9.73 MB)
- **Banco total:** ~11 MB (muito leve)

## Arquitetura Atual - Single Tenant
- Z-API: 1 instância WhatsApp hardcoded via env vars (ZAPI_INSTANCE_ID, ZAPI_TOKEN)
- Scraper de estoque: hardcoded para kafkamultimarcas.com.br
- Sem campo storeId/tenantId em nenhuma tabela
- Todos os vendedores compartilham o mesmo banco
- Login via seller_session (cookie) sem isolamento por loja

## Para Nova Loja Piloto - Opções

### Opção A: Nova Instância (Recomendada)
- Criar novo projeto Manus com banco separado
- Configurar Z-API com nova instância WhatsApp
- Trocar URL do scraper para o site da nova loja
- Cadastrar vendedores do zero
- **Prós:** Isolamento total, sem risco de misturar dados
- **Prós:** Pode personalizar para a nova loja
- **Contras:** Manutenção de 2 projetos separados

### Opção B: Multi-tenant (Futuro)
- Adicionar storeId em TODAS as tabelas (30+ tabelas)
- Refatorar TODAS as queries para filtrar por storeId
- Configurar múltiplas instâncias Z-API
- Configurar múltiplos scrapers
- **Estimativa:** 2-3 semanas de desenvolvimento
- **Recomendação:** Fazer quando tiver 3+ lojas

## Capacidade do Servidor
- Banco atual: 11 MB (TiDB serverless aguenta TB)
- 200 veículos: sem impacto (hoje tem 149)
- Scraper roda a cada 15 min: leve
- Alert-checker roda a cada 2 min: leve
- Webhook Z-API: event-driven, sem polling
- **Conclusão:** Servidor aguenta tranquilo 200 veículos e mais leads

## Bugs Encontrados na Auditoria
1. CrmAdminDashboard: setState durante render (navigate) - CORRIGIDO
2. crm_leads sem índice em sellerId (performance) - PENDENTE
3. crm_activities com 320k registros sem índice - PENDENTE
4. Tabela crm_activities crescendo rápido (9.73 MB) - precisa cleanup

## Painéis e Status

### Funcionando
- Login vendedor/gerente/admin
- Dashboard competição
- Registro de vendas
- Aprovações (vendas, F&I, consignação)
- CRM Chat WhatsApp (envio/recebimento)
- Pipeline de leads
- Estoque sincronizado
- Pós-venda (chamados, orçamentos)
- Financeiro (contas a pagar/receber)
- Simulador de financiamento
- Ficha de financiamento
- Mesa de crédito
- Marketing (estratégias, tarefas)
- Treinamentos
- Planos de ação
- Metas
- Agendamentos SDR
- Sorteio
- Modo TV
- Gerente Panel (mentor IA)
- IAM Config (contexto do dia)
- Documentos de venda
- Controle de pátio (consignação)

### Precisam Atenção
- SDR Distribution: UI não implementada ainda
- Índices do banco: faltam em tabelas críticas
- crm_activities: limpeza periódica necessária
