# Kafka Sales Competition - TODO

## Backend / Banco de Dados
- [x] Schema: tabelas vendedores, competições, equipes, vendas, treinamentos, frases, planos de ação
- [x] CRUD vendedores (adicionar, editar, remover, upload foto S3)
- [x] CRUD competições (individual, 2v2, grupos personalizados)
- [x] Registro de vendas com pontuação
- [x] Upload e gerenciamento de fotos via S3
- [x] Integração LLM para frases motivacionais e planos de ação
- [x] Notificações automáticas (mudança ranking, ultrapassagem, metas, fim competição)
- [x] Mini treinamentos com conteúdo educacional

## Painel Administrativo (protegido por autenticação)
- [x] Dashboard admin com visão geral
- [x] Gerenciar vendedores (CRUD + foto)
- [x] Criar/editar/encerrar competições (individual, 2v2, grupos)
- [x] Registrar vendas e ajustar pontuação
- [x] Gerenciar mini treinamentos
- [x] Gerenciar planos de ação por vendedor

## Dashboard Público (pista de corrida)
- [x] Pista de corrida visual com carros e fotos dos vendedores
- [x] Ranking ao vivo com posições na pista
- [x] Frases motivacionais diárias
- [x] Notificações em tempo real (ultrapassagem, mudança ranking)
- [x] Visualização de competições ativas e encerradas

## Páginas Adicionais
- [x] Estatísticas individuais e comparativas (metáforas de corrida)
- [x] Histórico de competições e performance
- [x] Mini treinamentos (conteúdo educacional)
- [x] Planos de ação personalizados por vendedor

## Design e Responsividade
- [x] Tema visual de corrida imersivo
- [x] Interface responsiva (celular + notebook)
- [x] Carros com fotos dos vendedores integradas
- [x] Grid de largada como tabela de classificação

## Testes
- [x] Testes unitários das rotas tRPC (63 testes passando)

## PWA e Acesso Restrito
- [x] Configurar manifest.json para PWA instalável
- [x] Adicionar service worker para funcionamento offline
- [x] Criar ícones do app para iOS e Android
- [x] Implementar sistema de código de acesso interno
- [x] Proteger todas as páginas públicas com código de acesso
- [x] Permitir admin definir/alterar código de acesso
- [x] Testes das novas funcionalidades (32 testes passando)

## Correções
- [x] Bug: quotes.latest retorna undefined quando não há frases cadastradas
- [x] Renomear app para "Kafka Rank" em todos os lugares

## Frases Motivacionais 365 dias
- [x] Gerar 365 frases motivacionais para vendedores de veículos
- [x] Inserir todas as 365 frases no banco de dados
- [x] Configurar exibição automática da frase do dia (rotação por dia do ano)

## Registro de Vendas pelos Vendedores (com aprovação)
- [x] Adicionar campo status (pendente/aprovada/rejeitada) na tabela de vendas
- [x] Criar rota pública para vendedor registrar venda (seleciona seu nome, modelo, valor)
- [x] Criar página pública simples para vendedor registrar venda
- [x] Painel admin de aprovação/rejeição de vendas pendentes
- [x] Notificação para admin quando vendedor registrar venda
- [x] Ranking considerar apenas vendas aprovadas
- [x] Testes das novas funcionalidades (32 testes passando)

## Excluir Vendas
- [x] Rota backend para excluir venda (admin) - reverte pontos automaticamente
- [x] Botão de excluir venda no painel Admin > Vendas com confirmação

## Acesso Admin pelo Celular
- [x] Adicionar botão de login discreto na Home para admin acessar pelo celular
- [x] Botão Admin visível após login do dono (amarelo, destaque)

## Alertas Visuais e Sonoros
- [x] Sistema de polling para detectar novas vendas em tempo real (a cada 10s)
- [x] Alertas visuais animados quando alguém registrar venda (verde)
- [x] Alerta especial quando alguém ultrapassar outro no ranking (amarelo)
- [x] Sons de alerta (beep para venda, motor para ultrapassagem)
- [x] Banner animado com foto do vendedor, barra de progresso e dismiss

## Notificações Push (iOS + Android)
- [x] Gerar VAPID keys para Web Push
- [x] Tabela no banco para salvar push subscriptions
- [x] Atualizar service worker para receber push
- [x] Backend: endpoint para salvar subscription e enviar push (pushService.ts)
- [x] Frontend: pedir permissão e registrar subscription (usePushNotifications hook + botão na Home)
- [x] Disparar push quando venda for aprovada, ultrapassagem no ranking, nova competição
- [x] Testes das funcionalidades de push (41 testes passando)

## Correções de Navegação
- [x] Adicionar botão de voltar na tela de Aprovar Vendas (admin fica preso após aprovar tudo)
- [x] Verificar e corrigir navegação em todas as páginas admin e públicas (AdminApprovals agora usa DashboardLayout com sidebar)

## Novos Tipos de Campanha (Multi-Setor)
- [x] Expandir competições com campo categoria (vendas, fei, consignacao, despachante, feirao)
- [x] F&I: registro com placa, CPF, banco, valor financiado, retorno (R1-R5)
- [x] Consignação: meta mensal, regra de 7 dias no pátio, campanhas de feirão
- [x] Despachante: transferências realizadas + bônus por documentos pagos pelo cliente
- [x] Feirão: campanhas especiais temporárias para vendedores
- [x] Formulários de registro específicos por categoria de campanha
- [x] Admin: criar/gerenciar campanhas por categoria com campos específicos
- [x] Dashboard: exibir competições organizadas por categoria com badges coloridos
- [x] Suporte a múltiplas competições paralelas (validado)
- [x] Testes dos novos setores (63 testes passando)

## Ajustes F&I e Consignação
- [x] F&I: remover campo "Valor retorno" e adicionar "Data pagamento da ficha"
- [x] Consignação: adicionar campo "Data de saída" para controle dos 7 dias (entrada/saída)
- [x] Admin pode atualizar data de saída da consignação quando carro sair do pátio (rota updateExit)
- [x] Cálculo automático dos 7 dias baseado em entrada e saída
- [x] Consignação: adicionar telefone do proprietário do veículo
- [x] 65 testes passando após todos os ajustes
