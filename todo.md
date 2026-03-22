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

## Vídeo nos Treinamentos
- [x] Adicionar campos videoUrl e videoKey na tabela trainings
- [x] Suporte a URL externa (YouTube, Vimeo) com player embutido
- [x] Suporte a upload de vídeo direto para S3
- [x] Formulário admin com opção de link OU upload de vídeo
- [x] Exibição do vídeo na página pública de treinamentos
- [x] Opção de excluir/trocar vídeo sem excluir o treinamento
- [x] Opção de excluir treinamento inteiro (já existia)
- [x] 72 testes passando

## Treinamentos Pré-populados
- [x] Treinamento: Como Vender 1 Carro por Dia (com vídeo YouTube)
- [x] Treinamento: Tempo de Resposta - O Segredo dos Top Vendedores (com vídeo YouTube)
- [x] Treinamento: Apresentação Visual - Como Encantar na Primeira Impressão (com vídeo YouTube)
- [x] Treinamento: 10 Técnicas de Vendas que Realmente Funcionam (com vídeo YouTube)
- [x] Treinamento: 5 Técnicas de Fechamento (com vídeo YouTube)
- [x] Vídeos do YouTube encontrados e vinculados a cada treinamento

## Setores e Pré-Vendas/SDR
- [x] Adicionar campo "setor" na tabela sellers (vendas, pre_vendas, fei, consignacao, despachante)
- [x] Filtro por setor na tela admin de Vendedores
- [x] Exibir setor no card de cada vendedor com badge colorido
- [x] Nova categoria de competição: pré-vendas (agendamentos e leads convertidos)
- [x] Formulário de registro de pré-vendas (SDR): agendamentos e leads
- [x] Aprovação de registros de pré-vendas no admin (aba SDR)
- [x] Pontuação: agendamento = 1pt, lead convertido = 3pts

## Bugs e Melhorias - Competições
- [x] Bug: competição mostrando como "Encerrada" - causa: datas de 2025 em vez de 2026, corrigido no banco
- [x] Bug: venda do Leo não contando - causa: competitionId era NULL, corrigido e vinculado
- [x] Adicionar botão de editar competição (datas, nome, descrição, categoria, meta, pontos)
- [x] Adicionar botão de reativar competição encerrada
- [x] Corrigir datas da competição para 18/03/2026 até 29/03/2026
- [x] Auto-selecionar competição quando só tem uma ativa na categoria
- [x] Categoria Pré-Vendas adicionada na criação de competições
- [x] 72 testes passando

## Grande Atualização - Funcionalidades das Screenshots
- [x] Modo Painel TV: tela cheia para TV da loja com ranking, pódio, pista, alertas ao vivo (/tv)
- [x] Alertas teatrais: ULTRAPASSAGEM e NOVA LIDERANÇA com animações (LiveAlerts + useLiveFeed)
- [x] Barra de progresso da meta: visual com porcentagem na pista e Home
- [x] Agendamentos para vendedores: cadastro completo (nome, telefone, email, descrição, carro)
- [x] Número automático de agendamento (#A001, #A002...)
- [x] Botão "Cliente compareceu" no agendamento
- [x] Aprovação de comparecimento pelo gerente (aprovar, reprovar, não compareceu)
- [x] Só gera ponto quando gerente aprova comparecimento
- [x] Sorteio no feirão: sortear prêmios pelo número do agendamento (AdminSorteio)
- [x] Agenda do feirão na TV: total de agendamentos + ranking
- [x] Treinamentos visíveis para vendedor na Home (link rápido)
- [x] Padronizar nomenclatura: Corrida → Competição em toda a UI
- [x] Botão de voz para registrar venda falando (reconhecimento de voz + IA preenche campos)

## Metas da Loja e Individuais
- [x] Tabela de metas no banco (loja geral + individual por vendedor)
- [x] Admin: criar/editar metas mensais da loja e individuais (AdminGoals)
- [x] Admin: definir bônus por atingir meta
- [x] Todos veem: meta da loja, meta individual, barra de progresso na Home
- [x] Alerta visual quando meta é atingida (badge verde + confete)

## Pista de Corrida Animada
- [x] Pista horizontal com carros posicionados por pontos (RaceTrack reescrito)
- [x] Animação: carro avança com transição suave de 1.5s
- [x] Alerta "ULTRAPASSAGEM!" via LiveAlerts com som
- [x] Funciona no celular e no Modo TV
- [x] Criar nova logo/branding profissional para Kafka Rank (K com bandeira quadriculada)

## Atualização para Publicação
- [x] Forçar novo checkpoint para habilitar botão Publish/Atualizar

## Aba Meus Agendamentos (Vendedores)
- [x] Rota backend: vendedor listar seus agendamentos por sellerId
- [x] Rota backend: vendedor criar agendamento individual (sem precisar de login admin)
- [x] Rota backend: vendedor marcar "Cliente Compareceu" (markAttendance já existe)
- [x] Página MeusAgendamentos: listagem com status, criação, botão compareceu
- [x] Adicionar rota /agendamentos/:sellerId no App.tsx
- [x] Adicionar link "Agendamentos" na Home e header
- [x] Testes das novas rotas (72 testes passando)
- [x] Revisão completa de bugs em todo o sistema
- [x] Verificar e corrigir erros de TypeScript, console e rede (0 erros TS, 0 erros console, 0 erros rede)

## Gatilhos de Agendamento (Contagem Regressiva + Resgate)
- [x] Backend: lógica de expiração automática (1h após horário → marca "não compareceu") - implementado via frontend detection
- [x] Backend: rota para reagendar cliente que não veio
- [x] Frontend: contagem regressiva em tempo real no card do agendamento
- [x] Frontend: destaque amarelo "CLIENTE ESPERADO AGORA" quando horário chegar
- [x] Frontend: marcação automática visual "NÃO COMPARECEU" com destaque vermelho
- [x] Frontend: seção "Resgatar Clientes" com botão ligar/WhatsApp e reagendar
- [x] Frontend: botão "Confirmar Chegada" destacado quando horário chegar
- [x] Testes das novas funcionalidades (72 testes passando, 0 erros TS)

## Refatoração Agendamentos
- [x] Backend: auto-aprovar agendamentos (sem necessidade de aprovação do admin)
- [x] Backend: rota admin para listar todos os agendamentos e excluir
- [x] Frontend: aba Agendamentos visível na Home para vendedores (com relógio/tempo)
- [x] Frontend: remover botão excluir do vendedor (só admin pode excluir)
- [x] Frontend: remover mensagem "Aguardando aprovação" do registro de agendamento
- [x] Admin: página Agendamentos no sidebar com visão geral de todos
- [x] Admin: botão excluir agendamento na página admin

## Correções Urgentes
- [x] Agendamento auto-aprovado (sem aprovação do admin)
- [x] Aba Agendamentos visível na Home para vendedores (card destacado com borda vermelha)
- [x] Só admin pode excluir agendamentos (vendedor não tem botão excluir)
- [x] Verificar e corrigir alertas de vendas entre vendedores (fix polling bug)

## Admin Agendamentos + Resgate 48h
- [x] Página AdminAgendamentos no sidebar (listar, editar, excluir todos)
- [x] Aba Resgate automática: leads 48h+ sem comparecimento
- [x] Rota no App.tsx e link no DashboardLayout sidebar

## Login Separado para Gerentes
- [x] Backend: tabela managers (username, password hash, nome, role)
- [x] Backend: rota de login por senha (gera token JWT)
- [x] Backend: middleware que aceita tanto OAuth (dono) quanto token de gerente
- [x] Frontend: tela de login admin por senha (usuário + senha)
- [x] Frontend: proteger rotas admin com verificação de token gerente ou OAuth
- [x] Admin: página para criar/editar/excluir contas de gerente (só dono pode)
- [x] Gerente tem acesso completo ao painel admin (mesma autonomia)

## Meta Automática ao Aprovar Vendas
- [x] Backend: ao aprovar venda, incrementar automaticamente a meta da loja na categoria correspondente
- [x] Vendas "Sem campanha" contam só na meta geral, vendas com campanha contam na meta + competição
- [x] Decrementar meta se venda for rejeitada/excluída após aprovação

## Origem do Lead (Controle de Fonte)
- [x] Adicionar campo leadSource na tabela sales (lead_loja, lead_vendedor)
- [x] Campo obrigatório no formulário de registro de venda
- [ ] Exibir origem do lead no painel admin de aprovações
- [ ] Estatísticas de origem de leads para o admin

## Sistema de Notificações Avançado
- [x] Notificação persistente para admin/gerente quando vendedor registra venda/F&I/consignação/despachante
- [x] Notificação para vendedor quando agendamento está expirando
- [x] Notificação para vendedor quando é ultrapassado na competição
- [x] Alerta de inatividade: vendedor que não acessa há 8h recebe push
- [x] Sons de alerta nas notificações push (vibração + som no celular)
- [x] Centro de notificações no app (sino com badge de contagem)
- [x] Corrigir bug do registro por voz (strict:true com required:[])
- [ ] Corrigir bug do LiveAlerts (hooks condicionais)

## Bug: Agendamento contando no ranking de vendas
- [x] Separar pontos de agendamento/SDR dos pontos de vendas no ranking
- [x] Agendamento só registra quantidade, não gera pontos automaticamente
- [x] Ponto de agendamento só conta quando gerente aprova comparecimento do cliente

## Login Individual para Vendedores
- [x] Adicionar campos username e passwordHash na tabela sellers
- [x] Rota de login por senha para vendedores (gera token JWT)
- [x] Tela de login para vendedores (usuário + senha)
- [x] Isolamento de dados: vendedor só vê seus próprios agendamentos/dados de clientes
- [x] Admin pode criar/resetar senha de vendedor

## Login Individual por Setor (Todos os Colaboradores)
- [x] Login funciona para todos os setores: Vendas, Pré-Vendas/SDR, F&I, Consignação, Despachante
- [x] Minha Área mostra dados específicos do setor do colaborador logado
- [x] F&I logado vê seus registros de F&I (fichas, bancos, retornos)
- [x] Consignação logado vê seus registros de consignação (veículos no pátio, datas)
- [x] Despachante logado vê seus registros de despachante (transferências, documentos)
- [x] Pré-Vendas/SDR logado vê seus agendamentos e leads
- [x] Vendas logado vê seus agendamentos e vendas
- [x] Cada colaborador vê apenas seus próprios dados, sem acesso aos dados dos outros

## Privacidade de Dados por Vendedor
- [x] Metas individuais privadas: vendedor só vê a meta dele (por questão de bônus)
- [x] Dados de clientes isolados: agendamentos com telefone/email só visíveis para o vendedor que criou
- [x] Ranking continua público/geral para todos
- [x] Rota backend protegida: metas individuais filtradas por sellerId do vendedor logado
- [x] Rota backend protegida: agendamentos com dados de cliente só retornam para o vendedor dono

## Ranking Mensal de Vendas (Meta da Loja)
- [x] Rota backend para ranking mensal: vendas aprovadas por vendedor no mês atual
- [x] Componente de ranking mensal que abre ao clicar na meta da loja
- [x] Ranking separado da campanha criada - baseado apenas em vendas aprovadas do mês

## Bugs Reportados (19/03 - Urgente)
- [x] BUG: Vendas duplicadas no perfil - Emanuel tem 2 vendas mas mostra 4 vendas/4 pontos (recalculado no banco)
- [x] BUG: Ranking mensal mostrando "nenhuma venda" mesmo com 22 vendas registradas (corrigido CAST timestamp)
- [x] BUG: Caracteres unicode quebrados no texto (corrigido em todos os arquivos)
- [x] BUG: Vendas aprovadas não gerando pontos no ranking da competição (vinculadas à competição 1, pontos recalculados)

## CRM - Módulo Completo

### Login Admin Próprio (Independente da Manus)
- [x] Tabela admins no banco (username, passwordHash, nome, role=owner, permissions)
- [x] Rota de login admin por senha (gera JWT com role=owner)
- [x] Tela de login admin em /crm/admin/login (independente do OAuth Manus)
- [x] Admin owner tem acesso total: equipe, competições, CRM, integrações, configurações
- [x] Manter login Manus como super-admin para manutenção técnica

### Schema CRM - Banco de Dados
- [x] Tabela crm_leads (id, sellerId, tenantId, nome, telefone, email, veiculoInteresse, origem, etapa, score, observacoes, createdAt, updatedAt)
- [x] Tabela crm_pipeline_stages (id, departamento, nome, ordem, cor)
- [x] Tabela crm_activities (id, leadId, sellerId, tipo, descricao, createdAt)
- [x] Tabela crm_inventory (id, marca, modelo, ano, placa, cor, preco, status, fotos, createdAt)
- [x] Tabela crm_inventory_alerts (id, inventoryId, leadId, sellerId, notificado, createdAt)
- [x] Tabela crm_campaigns (id, nome, mensagem, filtros, status, enviadoCount, createdAt)
- [x] Tabela crm_integrations (id, tipo, config, status, lastSync)
- [x] Migração SQL para todas as tabelas

### Backend CRM - Rotas tRPC
- [x] CRUD leads (criar, editar, listar, buscar, mover etapa, arquivar)
- [x] Busca rápida de leads (por nome, telefone, placa, veículo)
- [x] Atividades do lead (timeline: ligação, WhatsApp, visita, observação)
- [x] Registro de observação por voz (transcrição automática)
- [x] CRUD estoque de veículos (cadastrar, editar, vender, remover)
- [x] Busca inteligente: carro novo no estoque → achar clientes interessados
- [x] Score automático de lead (quente/morno/frio baseado em atividade)
- [x] Alertas de follow-up (leads sem contato há 48h)
- [x] Dashboard marketing (leads por origem, conversão, custo)
- [x] Dashboard financeiro (negócios em andamento, valores, comissões)

### Frontend CRM - Centro de Comando (Mobile-First)
- [x] Tela única "Centro de Comando" para vendedor: leads do dia, agendamentos, notificações
- [x] Barra de busca rápida no topo (nome, telefone, placa)
- [x] Card de lead com ações diretas: WhatsApp, Ligar, Mudar Etapa, Agendar, Observação
- [x] Botão WhatsApp abre wa.me/numero com mensagem pré-formatada
- [x] Botão Ligar abre tel:numero
- [x] Mudar etapa com 2 toques no mobile
- [x] Registro de observação por voz (microfone)
- [x] Design mobile-first: funciona perfeitamente no celular

### Frontend CRM - Pipeline Visual por Setor
- [x] Pipeline Vendas: Lead → Contato → Visita Agendada → Negociação → Proposta → Venda Fechada
- [x] Pipeline SDR: Lead Recebido → Qualificado → Agendamento → Compareceu → Convertido
- [x] Pipeline Consignação: Veículo Recebido → Avaliado → Anunciado → Negociação → Vendido
- [x] Pipeline F&I: Cliente → Análise Crédito → Aprovado → Contrato
- [x] Drag-and-drop no desktop, toque para mover no mobile
- [x] Cada vendedor vê só seus leads, gerente vê todos

### Frontend CRM - Visões por Setor
- [x] Visão Vendedor: Centro de Comando + seus leads + agendamentos
- [x] Visão SDR: leads para qualificar + agendamentos + transferir para vendedor
- [x] Visão Consignação: veículos consignados + interessados + status
- [x] Visão Gerente: funil completo da equipe + aprovações + métricas
- [x] Visão Marketing: dashboard origens + conversão + gráficos
- [x] Visão Financeiro: negócios em crédito/contrato + valores + comissões

### Busca Inteligente de Estoque
- [x] Cadastro de veículos no estoque (marca, modelo, ano, placa, preço, fotos)
- [x] Quando veículo entra no estoque, buscar leads com interesse compatível
- [x] Notificar vendedor: "Entrou [veículo] - você tem X clientes interessados!"
- [x] Botão direto para WhatsApp com mensagem personalizada sobre o veículo

### Score e Alertas de Follow-up
- [x] Score automático: quente (respondeu rápido, agendou), morno (sem contato 24-48h), frio (sem contato 72h+)
- [x] Indicador visual de temperatura no card do lead (vermelho/amarelo/azul)
- [x] Alerta: "Você tem X clientes sem contato há 48h" com destaque
- [x] Alerta de follow-up programado (vendedor define "ligar amanhã às 14h")

### Estrutura de Integração (API)
- [x] API REST pública com autenticação por token para integrações externas
- [x] Endpoint POST /api/webhooks/lead - receber leads de plataformas externas
- [x] Endpoint POST /api/webhooks/leads/bulk - importar leads em massa
- [x] Endpoint POST /api/webhooks/sig/sale - sincronizar vendas do SIG
- [x] Endpoint POST /api/webhooks/whatsapp - webhook WhatsApp
- [x] Documentação da API em /api/webhooks/docs
- [x] Estrutura para futura integração WhatsApp Business API
- [x] Estrutura para futura leitura de e-mails (leads OLX, Webmotors, SóCarrão)
- [x] Testes automatizados do CRM (23 testes passando, 106 total)

## Bug: Setor do vendedor não salva como SDR
- [x] Bug: ao editar vendedor e mudar setor para SDR/Pré-Vendas, salva como Vendas
- [x] Corrigir lógica de update do setor no backend (campo department faltava no input do sellers.update)

## Melhorias CRM - Análise de Mercado

### Prioridade 1 - Corrigir cards de setor no Admin
- [x] Cards de setor clicáveis no Painel Geral (filtrar leads ao clicar)
- [x] Navegação para lista de leads filtrada por departamento

### Prioridade 2 - Templates de mensagem WhatsApp
- [x] Tabela de templates no banco (crm_message_templates)
- [x] Templates padrão por situação (primeiro contato, follow-up, feirão, veículo disponível)
- [x] Seletor de template ao clicar WhatsApp no card do lead
- [x] Variáveis dinâmicas ({nome}, {veiculo}, {vendedor})

### Prioridade 3 - Dashboard individual do vendedor
- [x] Mini-dashboard no topo do CRM do vendedor
- [x] Métricas: leads ativos, quentes, convertidos no mês, taxa de conversão
- [x] Alertas de tempo (5min urgente, 20min transferência)

### Prioridade 4 - Permissões granulares para admins
- [x] Campo permissions (JSON) na tabela admins
- [x] Checkboxes de permissão ao criar/editar admin
- [x] Filtrar visão do admin baseado nas permissões
- [x] Admin Principal (owner) tem todas as permissões

### Prioridade 5 - Sequência de follow-up automática
- [x] Tabela crm_follow_up_tasks no banco
- [x] Ao criar lead, gerar tarefas automáticas baseadas na sequência
- [x] Exibir próxima ação programada no card do lead

### Prioridade 6 - Distribuição automática de leads (round robin)
- [x] Configuração de round robin por departamento
- [x] Ao receber lead via webhook, distribuir para próximo vendedor
- [x] Registro de quem recebeu e quando

### Prioridade 7 - Notificações do CRM
- [x] Notificação de novo lead atribuído (alerta 5min)
- [x] Notificação de follow-up atrasado (alertas visuais)
- [x] Notificação de veículo novo que bate com interesse

### Prioridade 8 - Tabela FIPE integrada
- [x] Busca de preço FIPE por marca/modelo/ano
- [x] Exibir preço FIPE no cadastro de estoque
- [x] Comparativo preço loja vs FIPE

## Melhorias CRM v2 - Alertas de Tempo + Visual

- [x] Alerta 5 minutos: vendedor recebe alerta urgente se não respondeu lead novo
- [x] Transferência automática 20 minutos: lead sem resposta transfere para próximo vendedor
- [x] Cards de setor clicáveis no admin (filtrar leads ao clicar)
- [x] Templates de mensagem WhatsApp com variáveis dinâmicas
- [x] Dashboard individual do vendedor (métricas pessoais)
- [x] Permissões granulares para admins (checkboxes por módulo)
- [x] Sequência de follow-up automática com tarefas programadas
- [x] Distribuição round-robin de leads por departamento
- [x] Tabela FIPE integrada no estoque
- [x] Revisão completa de bugs

## Módulo Financeiro Completo
- [x] Tabela fin_transactions (contas a pagar e receber)
- [x] Tabela fin_categories (categorias personalizáveis)
- [x] Contas a Pagar (cadastro, vencimento, status, categorias)
- [x] Contas a Receber (cadastro, vencimento, status, categorias)
- [x] Leitor de câmera para boletos (OCR via LLM Vision)
- [x] Leitor de câmera para notas fiscais (OCR via LLM Vision)
- [x] Leitor de câmera para contas (luz, água, etc)
- [x] Dashboard financeiro (resumo, fluxo de caixa, vencimentos próximos)
- [x] Categorias de despesas/receitas (personalizáveis)
- [x] Filtros por período, categoria, status
- [x] Alertas de vencimento (contas próximas do vencimento)
- [x] Marcar como pago/recebido em 1 toque
- [x] Anexar comprovantes (foto/arquivo via S3)
- [x] Relatório mensal simplificado

## CRM Tela Principal do Vendedor + Integrações

### CRM como tela principal do vendedor
- [x] Ao logar, vendedor vê painel de leads direto (não precisa navegar)
- [x] Leads novos em destaque com badge de origem (OLX, Webmotors, Instagram, etc)
- [x] Indicador visual de qual plataforma o lead veio

### Webhooks de Integração
- [x] Webhook Meta Lead Ads (Instagram/Facebook Ads)
- [x] Webhook Google Ads (formulário de lead)
- [x] Webhook genérico (qualquer plataforma/chatbot)
- [x] Parser de e-mail para leads de OLX/Webmotors/SóCarrão/iCarros
- [x] Identificação automática da origem do lead

### Widget/Formulário Embeddable
- [x] Widget JavaScript embeddable para landing pages
- [x] Formulário captura nome, telefone, interesse, veículo
- [x] Tracking de UTM (utm_source, utm_medium, utm_campaign)
- [x] Lead cai no CRM com origem "Landing Page" + dados da campanha

### Documentação de Integração
- [x] Documentação completa com passo a passo para cada integração
- [x] Guia Meta Business (Instagram/Facebook Lead Ads)
- [x] Guia Google Ads
- [x] Guia plataformas (OLX, Webmotors, etc)
- [x] Guia landing pages (como colar o widget)

## Bugs e Melhorias - Março 2026

### Bugs
- [x] Agendamentos contando como venda no ranking
- [x] Outros setores (F&I, Despachante, etc) aparecendo no ranking de vendedores - filtrar só vendedores
- [x] Rank da meta misturado com rank da competição - separar claramente
- [x] Alertas/notificações cortando a tela (não cabe, corta a imagem)
- [x] F&I sem opção "Retorno 0" no campo de retorno
- [x] F&I sem campo de observação para anotações

### Novas funcionalidades
- [x] Ranking de agendamentos (quem mais agendou e quem compareceu)

## Controle de Consignação Completo

### Regras de Negócio
- [x] Data de entrada obrigatória no registro de consignação
- [x] Verificação de duplicidade por placa: bloqueia se mesmo carro em menos de 60 dias
- [x] Após 60 dias: permite registrar mas mostra aviso com data da primeira consignação
- [x] Dar saída do pátio (não exclui, mantém registro histórico)
- [x] Controle automático dos 7 dias no pátio

### Aba de Controle de Pátio
- [x] Aba separada com veículos atualmente no pátio (contagem de dias)
- [x] Destaque para veículos que completaram 7 dias (meta consignação)
- [x] Histórico de veículos que já saíram
- [x] Visibilidade restrita: apenas admin, gerente e setor consignação

## Bug - Erro de Publicação
- [x] Corrigir erro que impede publicação da versão recente (aplicado code-splitting para reduzir bundle)

## Bugs Críticos - Ranking e Meta (21/03)
- [x] Ranking mensal de vendas mostra "Nenhuma venda registrada" (corrigido: vendedores tinham department=NULL)
- [x] Vendas não estão indo para a meta mensal corretamente (corrigido: meta recalculada para 28 vendas reais)
- [x] Total de vendas no painel geral filtrado para apenas vendedores (department=vendas)
- [x] Garantir que apenas vendas de veículos contem no ranking de vendas e na meta (F&I/SDR/Desp/Consig não incrementam totalSales)

## Auditoria Completa do Sistema (21/03 noite)
- [x] Recalcular totalSales de TODOS os vendedores baseado em vendas reais aprovadas
- [x] Recalcular totalPoints de TODOS os vendedores (vendas + F&I + SDR + consignação + despachante)
- [x] Recalcular pontos dos participantes de competições
- [x] Recalcular currentValue da meta de vendas (28/50)
- [x] Verificar perfil de cada vendedor - filtrar apenas aprovadas na lista de vendas recentes
- [x] Garantir que ranking mensal, competição e meta estejam sincronizados

## Editar Vendas no Admin (21/03)
- [x] Rota backend para editar venda (modelo, valor, vendedor, status)
- [x] Recalcular pontos automaticamente ao mudar status (aprovar/rejeitar)
- [x] Botão de editar venda no admin (lápis) ao lado do excluir
- [x] Modal de edição com campos: modelo, valor, vendedor, status, origem do lead
- [x] Poder re-aprovar venda rejeitada ou rejeitar venda aprovada
- [x] Vendas rejeitadas com destaque visual (borda vermelha + opacidade reduzida)
- [x] Vendas pendentes com destaque visual (borda amarela)
- [x] Alerta de impacto ao mudar status (aviso sobre pontos)
- [x] 13 testes passando para edição de vendas

## Bugs e Melhorias - Equipe (22/03)
- [x] Bug: Botão de ativar/desativar colaborador - adicionado diálogo de confirmação para evitar cliques acidentais
- [x] Adicionar tooltips nos ícones do card de colaborador (explicar o que cada ícone faz)
- [x] Reativar Andréia Vieegas (F&I) que foi desativada acidentalmente
- [x] Badge "Inativo" visível quando colaborador está desativado
- [x] Borda vermelha no card de colaboradores inativos

## Painel Visual F&I para Colaboradores (22/03)
- [x] Colaborador F&I vê todos os seus registros na Minha Área com abas de filtro
- [x] Separar registros por status: Todas, Aprovadas, Pendentes, Rejeitadas com abas
- [x] Visual claro com badges de status (verde=aprovado, amarelo=pendente, vermelho=rejeitado)
- [x] Cards coloridos por status com borda lateral e detalhes completos
- [x] Contadores de resumo (total aprovadas, pendentes, rejeitadas) para F&I na Minha Área
- [x] Admin tem página dedicada F&I (/admin/fei) no sidebar com filtros e ações
- [x] Admin pode aprovar/rejeitar/re-aprovar direto da página F&I
- [x] Filtro por colaborador na página admin F&I
- [x] Mostrar detalhes de cada registro (placa, CPF, banco, valor, retorno, data, observações)
