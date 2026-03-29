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
- [x] Corrigir bug do LiveAlerts (hooks condicionais) - já corrigido, sem hooks condicionais

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

## Módulo Pós-Venda (23/03)

### Schema e Backend
- [x] Tabela oficinas_parceiras (id, nome, telefone, endereco, observacoes, active)
- [x] Tabela pos_venda_chamados (id, cliente_nome, cliente_telefone, carro_modelo, carro_placa, problema_relatado, observacoes, vendedor_id, responsavel_pv_id, oficina_id, status, data_entrada_agendada, data_entrada_real, prazo_entrega, data_entrega_real, created_at, updated_at)
- [x] Tabela pos_venda_gastos (id, chamado_id, descricao, valor, foto_nota_url, status_aprovacao, autorizado_por, created_at)
- [x] Tabela pos_venda_historico (id, chamado_id, acao, descricao, usuario, created_at)
- [x] Funções db.ts para CRUD de chamados, oficinas e gastos
- [x] Rotas tRPC para pós-venda (abrir chamado, listar, atualizar status, adicionar gasto, aprovar gasto)

### Frontend - Vendedor
- [x] Botão "Abrir Chamado" na página de Pós-Venda
- [x] Formulário simples: nome cliente, telefone, carro, placa, problema, observações, vendedor
- [x] Modal super simples com poucos campos essenciais

### Frontend - Painel Pós-Venda
- [x] Lista visual com cards coloridos por status (Cliente / Carro / Problema / Status / Data)
- [x] Filtros por contadores: Todos | Abertos | Agendados | Em serviço | Finalizados | Entregues
- [x] Detalhes do chamado ao clicar (modal com abas)
- [x] Agendar data de entrada do veículo
- [x] Selecionar/digitar oficina parceira
- [x] Definir prazo de entrega ao cliente
- [x] Adicionar observações e anotações (histórico)
- [x] Anexar fotos de notas de serviço (upload S3)
- [x] Registrar gastos com descrição e valor
- [x] Busca por cliente, placa, modelo ou ticket
- [x] Alertas visuais de prazo vencido/vencendo

### Frontend - Admin/Financeiro
- [x] Tela dedicada "Gastos PV" no sidebar com filtros (Pendente / Autorizado / Pago / Recusado)
- [x] Gerente autoriza ou recusa gasto
- [x] Financeiro marca como pago
- [x] Resumo financeiro com totais por status
- [x] Cada gasto vinculado ao chamado, cliente, carro e oficina
- [x] Link para ver nota fiscal anexada

### Alertas
- [x] Alertas de prazo na página de Pós-Venda (vencidos em vermelho, vencendo em amarelo)
- [x] Badge "ATRASADO" animado nos cards com prazo vencido
- [x] Contadores visuais por status para visão rápida

### Cadastro de Oficinas
- [x] CRUD de oficinas parceiras via rotas tRPC
- [x] Seleção de oficina no chamado (dropdown) ou digitar nome manualmente
- [x] 16 testes passando para o módulo pós-venda

## Pós-Venda na Minha Área do Vendedor (23/03)
- [x] Botão "Abrir Chamado Pós-Venda" nas Ações Rápidas da Minha Área
- [x] Vendedor consegue abrir chamado direto da sua área com modal simples
- [x] Vendedor vê lista dos chamados que ele abriu com status atualizado e filtros
- [x] Formulário simples de abertura (nome cliente, telefone, carro, placa, problema, observações)
- [x] Cards coloridos por status com alerta de prazo vencido

## Pós-Venda na Tela Principal (23/03)
- [x] Botão "Pós-Venda" nos Quick Links do header da Home
- [x] Seção dedicada "PÓS-VENDA" na Home com botão de acesso
- [x] Página pública /pos-venda com seleção de vendedor, abertura de chamado e acompanhamento
- [x] Cards expansíveis com detalhes do chamado, filtros por status e contadores

## Bug: Plano de Ação não chega ao vendedor (23/03)
- [x] Investigado: faltava criar notificação + push ao criar plano de ação
- [x] Corrigido: agora ao criar plano, cria notificação no banco + envia push notification
- [x] Vendedor recebe alerta "Novo Plano de Ação" com detalhes do plano

## Filtros por Mês em Todas as Telas (23/03)
- [x] Componente MonthFilter reutilizável criado (setas prev/next, botão "Ver Todos")
- [x] Filtro por mês na tela de Vendas (admin)
- [x] Filtro por mês na tela de Pós-Venda
- [x] Filtro por mês na tela de F&I
- [x] Filtro por mês na tela de Gastos PV (Financeiro)
- [x] Dashboard admin com seletor de mês e visão geral (vendas, F&I, pós-venda, equipe)
- [x] Top vendedores do mês selecionado no dashboard
- [x] Histórico mensal acessível navegando entre meses

## Pacote de Melhorias (24/03)

### Bugs e Correções
- [x] Pós-venda: testado e funcionando (criar chamado + mudar status OK)
- [x] Chamado pós-venda: lista de vendedores já filtra apenas department=vendas
- [x] Motivação do rank: ultrapassagens agora filtram apenas vendedores (department=vendas)
- [x] Labels corrigidos: TOP VENDEDORES → TOP EQUIPE (Home + Dashboard)

### Novo Colaborador
- [x] Setor "Pós-Venda" já existe na lista de setores (pos_venda)
- [x] Setor "Marketing" já existe na lista de setores

### Vendas
- [x] Busca por texto (vendedor, modelo, descrição) na tela de vendas
- [x] Filtro dropdown por vendedor individual na tela de vendas

### Controle de Pátio → Consignação
- [x] Renomear "Controle de Pátio" para "Consignação"
- [x] Cadastro de veículos consignados já existia
- [x] Filtro por mês na consignação adicionado
- [x] Busca por placa/modelo/proprietário na consignação
- [x] Controle de duplicidade por placa (60 dias) já existia
- [x] Aba de veículos 7 dias (meta) já existia
- [x] Registro de saída sem excluir histórico já existia

### Painel de Marketing
- [x] Criar página de Marketing no admin (com sidebar)
- [x] Estratégias de marketing com CRUD completo (criar, editar, excluir)
- [x] Tarefas de marketing com CRUD, prioridade, prazo, responsável
- [x] Vincular tarefas a estratégias
- [x] Filtro por status e busca por texto
- [x] Cards de estatísticas (estratégias, tarefas, em andamento, concluídas)

### Melhorias Extras
- [ ] Notificações visuais (sininho com contador no header)
- [ ] Metas individuais por vendedor
- [ ] Busca global no topo

## Módulo Financeiro - Contas a Pagar (24/03)

### Categorias Personalizáveis
- [x] Tabelas de categorias e transações financeiras já existiam no banco
- [x] CRUD de categorias (criar, editar, excluir) - com cores personalizáveis
- [x] Exibir categorias como abas na tela financeira (16 categorias pré-cadastradas)

### Contas a Pagar
- [x] CRUD completo de contas (criar, editar, excluir, marcar como pago)
- [x] Status: pendente, vencido, pago, cancelado
- [x] Filtro por mês (navegador de mês), por categoria (abas), por status, por tipo
- [x] Busca por texto (descrição, fornecedor)
- [x] Resumo financeiro: cards A Pagar, Pago, A Receber, Vencidas
- [x] Código de barras, fornecedor, recorrência, observações

### Notificações de Vencimento
- [x] Endpoint de contas vencidas (overdue) e próximas do vencimento (upcomingDue)
- [x] Card de "Vencidas" no dashboard com contagem
- [x] Badge visual de status em cada conta (Pendente, Vence em breve, Vencido, Pago)

### Interface
- [x] Página admin do financeiro com abas dinâmicas (AdminFinanceiro)
- [x] Cards de resumo (A Pagar, Pago, A Receber, Vencidas)
- [x] Sidebar com link para o financeiro
- [x] 195 testes passando (12 novos testes do financeiro)

## Integração Meta Lead Ads (Facebook/Instagram)
- [x] Melhorar webhook Meta para buscar dados completos do lead via Graph API
- [x] Adicionar verificação de assinatura do webhook (X-Hub-Signature-256)
- [x] Config armazenada no banco (crm_integrations) via página admin
- [x] Criar página de configuração da integração Meta no admin
- [x] Instruções passo a passo para o usuário configurar no Facebook Developers

## Correção de Bugs e Atualização Geral
- [x] SEGURANÇA: passwordHash excluído de listSellers e getSellerById (safeSellerColumns)
- [x] DOM: button aninhado no AdminFinanceiro corrigido (trocado por span com role=button)
- [x] Meta webhook: busca dados completos do lead via Graph API (nome, telefone, email)
- [x] Meta webhook: verifica assinatura X-Hub-Signature-256 com crypto.timingSafeEqual
- [x] Meta webhook: valida verify_token contra config da integração
- [x] Página de configuração Meta no admin (AdminMetaIntegration) com passo a passo
- [x] Rotas getMetaConfig, saveMetaConfig, testMetaConnection no crmRouter
- [x] Sidebar com link Meta Ads
- [x] 204 testes passando (9 novos testes de segurança e Meta)

## Correção Ranking por Setor
- [x] Ranking de vendas: APENAS vendedores (department=vendas) - backend getMonthlyRanking
- [x] Ranking de agendamentos: vendedores + SDR (department=vendas ou pre_vendas) - backend getAppointmentRanking
- [x] Outros setores (despachante, consignação, F&I, pós-venda, marketing) NÃO aparecem no ranking
- [x] updateSaleTotals bloqueia pontos para setores fora do ranking
- [x] Pontos zerados no banco para setores não-vendas (despachante, F&I, consignação)
- [x] Home: TOP EQUIPE filtra apenas vendedores
- [x] AdminDashboard: TOP EQUIPE filtra apenas vendedores
- [x] AdminSellers: mostra "Sem ranking" para setores não-vendas
- [x] SellerProfile: esconde pontos/vendas para setores não-vendas
- [x] MinhaArea: esconde pontos para setores não-vendas
- [x] RegisterSale: filtra vendedores por departamento conforme categoria
- [x] useLiveFeed: ultrapassagens só entre vendedores (já corrigido anteriormente)
- [x] 225 testes passando (21 novos testes de ranking)

## Painel Dedicado Pós-Venda (CONCLUÍDO)
- [x] Painel exclusivo na MinhaArea quando department=pos_venda
- [x] Visão ampla: TODOS os chamados dos vendedores (não só os dele)
- [x] Cards de estatísticas: abertos, agendados, em serviço, finalizados, entregues
- [x] Filtro por status (tabs interativas)
- [x] Busca por cliente/veículo/vendedor
- [x] Modal de detalhes do chamado com info completa
- [x] Atualizar status direto do painel (rota updateBySeller - só pos_venda)
- [x] Notificação push quando vendedor abre novo chamado (sendPushNewPvChamado)
- [x] Notifica admin/gerente também (sendPushToAll)
- [x] Acesso via login do colaborador (department=pos_venda)
- [x] Visual limpo e fácil de usar no celular
- [x] 234 testes passando (9 novos testes do pós-venda)

## Login Individual por Colaborador
- [x] Corrigir bug de criação de login/senha para colaboradores - já funcional
- [x] Remover necessidade de código de acesso geral - cada um entra com seu login
- [x] Tela de login individual (nome de usuário + senha)
- [x] Cada colaborador acessa sua "Minha Área" com login próprio
- [ ] Histórico de último acesso (data/hora) registrado no banco
- [ ] Admin pode ver último acesso de cada colaborador
- [ ] CRM e sistema acessíveis via login individual

## Consignação Integrada com Vendas
- [ ] Ao registrar venda, detectar pela placa se é veículo consignado
- [ ] Se for consignado, marcar automaticamente como "Vendido" na consignação
- [ ] Registrar dados de pagamento ao proprietário (conta, PIX, data pagamento)
- [ ] Vincular venda ao registro de consignação
- [ ] Controle de pagamento: status (pendente, pago), forma (conta/PIX), data programada

## Consignação - Controle Financeiro Completo
- [ ] Adicionar campo valor de custo (quanto o cliente deixou o carro)
- [ ] Adicionar campo se é quitado ou tem quitação pendente + valor da quitação
- [ ] Adicionar campo valor de venda da loja (preço de venda ao público)
- [ ] Calcular % de lucro da loja automaticamente
- [ ] Acesso restrito: valores visíveis apenas para consignação, admin e gerente
- [ ] Vendedores NÃO veem valores de custo
- [ ] Integração com vendas: detectar carro consignado pela placa ao registrar venda
- [ ] Marcar automaticamente como vendido na consignação quando venda é registrada
- [ ] Registrar dados de pagamento ao proprietário (conta bancária, PIX, data)
- [ ] Programar data de pagamento ao cliente no sistema

## Login Individual - Melhorias
- [x] PRIORIDADE: Investigar e corrigir bug do login individual (causa: cookie-parser não instalado, req.cookies undefined)
- [x] Testar fluxo completo: definir senha no admin → login em /login-vendedor (testado com leo/1234)
- [x] Bloquear/desbloquear acesso individual sem afetar outros (já existia no AdminSellers com toggle ativar/desativar)
- [x] Mostrar último acesso no admin (tela de Equipe) - exibe tempo relativo (agora, Xmin, Xh, Xd)
- [x] Indicador visual de quem tem login definido (badge azul com username) e quem não tem (badge amarelo "Sem login")

## Bug - Cadastro de Colaborador
- [x] Bug: não consegue cadastrar novo colaborador e definir função/setor (causa: campo department não estava no input do sellers.create)
- [x] Investigar erro no formulário de criação e na mutation sellers.create

## Bug - Agendamentos
- [x] Bug: página de agendamentos dá "An unexpected error occurred" - era o bug de hooks do MinhaArea.tsx já corrigido, versão publicada atualizada

## Melhorias Agendamentos
- [x] Mostrar data de criação do agendamento (quando o vendedor criou)
- [x] Mostrar data/hora agendada de forma visível nos cards
- [x] Resgate automático após 48h sem comparecimento com alerta visual pulsante
- [x] Status "Cliente Aguardando" visível na tela
- [x] Alerta sonoro/visual de resgate do lead

## IA Vendedor de Carros
- [ ] Criar área "IA Vendedor" na Minha Área do vendedor
- [ ] Upload de print de conversa (imagem) para análise da IA
- [ ] IA especialista em vendas de carros: estratégia, quebra de objeção, perfil comportamental
- [ ] Sugestões de resposta baseadas no contexto da conversa
- [ ] Usar LLM integrado do sistema (sem custo adicional)

## IA Super Agente - Requisitos Expandidos
- [ ] Especialista em vendas de carros (quebra objeção, fechamento, perfil comportamental)
- [ ] Estrategista de marketing (conteúdo viral, ideias de vídeos, construção de conteúdo)
- [ ] Especialista em consignação de carros (objeções, contratos, negociação com proprietário)
- [ ] Especialista em financiamento de carros (simulação, argumentos, bancos)
- [ ] Especialista em despachante (documentação, transferência, emplacamento)
- [ ] Especialista em gestão de equipe (motivação, metas, liderança)
- [ ] Especialista em agendamento e resgate de leads (scripts, gatilhos mentais)
- [ ] Especialista em pós-venda (fidelização, indicação, satisfação)
- [ ] Gatilhos mentais avançados (urgência, escassez, prova social, autoridade)
- [ ] Humanizado e acessível (linguagem clara, exemplos práticos)
- [ ] Interface com categorias de consulta rápida
- [ ] Upload de print de conversa para análise

## IAM - Acesso Global e Mensagem Motivacional
- [ ] Botão flutuante do IAM visível em todas as páginas do vendedor
- [ ] Mensagem motivacional personalizada ao abrir o app (como um gestor de alta performance)
- [ ] Categorias de consulta rápida intuitivas
- [ ] Interface de chat intuitiva para qualquer dúvida

## IAM - Funcionalidades Extras
- [ ] Modo "Me ajuda a responder AGORA" (print → resposta pronta em 1 toque)
- [ ] Simulador de financiamento integrado (valor, entrada, prazo → argumento de venda)
- [ ] Gerador de script de ligação personalizado
- [ ] Criador de mensagem de follow-up (reengajamento de lead frio)
- [ ] Ideias de conteúdo do dia (posts/vídeos para redes sociais)
- [ ] Modo Objeção Rápida (botões prontos: "Tá caro", "Vou pensar", etc)
- [ ] Consultor de documentação/despachante
- [ ] Dica de pós-venda (lembrete de follow-up)

## IAM - Configuração pelo Admin
- [x] Tabela iam_config no banco para armazenar configurações do admin
- [x] Tela admin para configurar: contexto do dia (feirão, movimento fraco, meta apertada), mensagem personalizada, instruções extras
- [x] IAM usa contexto admin nas respostas (adapta tom, urgência, foco)
- [x] Mensagem motivacional do dia configurável pelo admin
- [x] Alertas de ação para engajar vendedores na plataforma

## IAM - Acesso na Tela Principal
- [x] Adicionar card destacado do IAM na Home com dropdown de vendedores para acesso direto
- [x] Card com features rápidas: Quebrar objeções, Analisar conversa, Ideias de conteúdo, Scripts de venda

## Bug - IAM Enviar Print
- [x] Bug: botão de enviar print não abre galeria/câmera do celular (removido capture=environment que forçava só câmera)

## IAM - Fechamento de Vendas
- [x] Adicionar categoria "Fechamento de Vendas" nas especialidades do IAM (com ícone Trophy dourado)

## Simulador de Financiamento
- [x] Criar simulador de financiamento ilustrativo com taxa configurável pelo admin (padrão 2.2%)
- [x] Campos: valor do veículo, entrada, prazo (12-60 meses)
- [x] Mostrar: parcela mensal, valor total, juros totais, argumento de venda
- [x] Acessível na Minha Área (vendas/F&I) e rota /simulador-financiamento
- [x] Aviso de "simulação ilustrativa"
- [x] Taxa configurável pelo admin em Admin > Configurar IAM

## Reconhecimento de Voz no IAM
- [x] Botão de microfone no IAM para gravar voz (verde, ao lado da câmera)
- [x] Converter áudio em texto usando Web Speech API do navegador (pt-BR)
- [x] Funcionar no celular (Android e iOS via Chrome)

## Área de Consulta de Cliente
- [ ] Campo para registrar score e situação do cliente manualmente

## Simulador Visível na Tela Principal
- [x] Adicionar simulador de financiamento embutido na Home (não só link, mas o simulador real)
- [x] Fácil acesso para qualquer vendedor usar direto

## Bug Fix - MinhaArea Hooks
- [x] Corrigir bug "Rendered more hooks than during the previous render" em MinhaArea.tsx:220 (já corrigido - hooks movidos antes dos early returns)

## Varredura Completa de Bugs - 25/03/2026
- [x] TypeScript: 0 erros (npx tsc --noEmit limpo)
- [x] Build: OK em 28.45s (apenas warnings de chunk size esperados)
- [x] 245 testes passando (17 arquivos)
- [x] Console browser: 0 erros recentes
- [x] Network requests: 100% status 200
- [x] DevServer: 0 erros recentes
- [x] Todas as rotas HTTP respondendo 200
- [x] APIs tRPC funcionando
- [x] Warning DialogContent "Missing Description" corrigido (aria-describedby)

## Bug Fix - Crash ao clicar em Vendas (Metas da Loja)
- [x] Corrigir crash "An unexpected error occurred" ao clicar em Vendas (não reproduzível no dev - versão antiga publicada)
- [x] Varredura completa de bugs no sistema

## Melhoria: Fluxo Completo de Documentos (Vendedor ↔ Despachante)
- [x] Adicionar campos de documento emitido na tabela dispatch_records (documentUrl, documentKey, transferredAt, originalSellerId)
- [x] Criar tabela sale_documents para vendedor enviar CNH + Comprovante de Residência por venda
- [x] Vendedor faz upload de CNH e Comprovante de Residência para cada venda
- [x] Documentos visíveis na Home quando vendedor lança venda (fácil e visual)
- [x] Documentos visíveis na MinhaArea com alerta grande e botões visuais
- [x] Alerta "Documentos Pendentes" na tela do vendedor se não enviou docs
- [x] Venda só fica 100% concluída quando docs são enviados
- [x] Despachante acessa automaticamente os documentos enviados pelo vendedor
- [x] Despachante marca transferência e inclui documento emitido
- [x] Vendedor vê status da transferência e acessa documento emitido

## Melhoria: Flag de Feirão nos Agendamentos
- [x] Adicionar campo booleano 'isFeirão' na tabela de agendamentos
- [x] Ícone selecionável ao criar agendamento para marcar como Feirão
- [x] Filtro para visualizar apenas agendamentos de Feirão
- [x] Visual diferenciado para agendamentos de Feirão (ícone, badge)

## Varredura de Bugs e Auditoria de Segurança
- [x] Varredura completa de bugs (logs, TypeScript, testes, console) - 0 erros
- [x] Auditoria de segurança: SQL Injection - PROTEGIDO (Drizzle ORM parametrizado)
- [x] Auditoria de segurança: XSS - PROTEGIDO (React auto-escaping)
- [x] Auditoria de segurança: Exposição de dados sensíveis - PROTEGIDO (safeSellerColumns)
- [x] Auditoria de segurança: Autenticação e autorização - PROTEGIDO (bcrypt, JWT, adminProcedure)
- [x] Auditoria de segurança: CSRF e cookies - PROTEGIDO (httpOnly, secure, sameSite)
- [x] Auditoria de segurança: Rate limiting e brute force - IMPLEMENTADO (express-rate-limit)
- [x] Auditoria de segurança: Upload de arquivos - IMPLEMENTADO (10MB max, validação)
- [x] Auditoria de segurança: Headers de segurança - IMPLEMENTADO (helmet: HSTS, X-Frame, etc)
- [x] Corrigir vulnerabilidades: rate limiting, helmet, upload limits, hash código acesso
- [x] Testes de segurança automatizados (10 testes específicos de segurança)

## Bug Fix - Erros reportados pelo usuário (26/03)
- [x] Diagnosticar e corrigir todos os bugs atuais (rate limiter muito baixo causava 429)
- [x] Varredura completa de logs e console (0 erros em todas as páginas)
- [x] Corrigir emojis escapados no RegisterSale.tsx
- [x] Corrigir warning de trust proxy no rate limiter
- [x] Aumentar rate limit de 200 para 500 req/min nas rotas /api/

## Próximos Passos
- [x] Notificação push para documentos pendentes (enviada quando venda é aprovada)
- [x] Notificação push para documento transferido (enviada quando despachante marca transferência)

## Melhoria: Setor Financeiro + Pós-Venda Visual + Login Setorial
- [x] Adicionar setor "Financeiro" na lista de setores (schema + frontend) - já existe no banco
- [x] Financeiro tem acesso a toda tela do Pós-Venda (página /financeiro com aba Pós-Venda)
- [x] Aba exclusiva de Contas só para Financeiro (Pós-Venda NÃO acessa)
- [x] Login de Financeiro e Pós-Venda pela tela principal com senha (redirect por department)
- [x] Redesign visual do Pós-Venda - painel organizado com cards por status
- [x] Filtro de abas no Pós-Venda (Todos, Abertos, Em Andamento, Resolvidos)
- [x] Pós-Venda não precisa selecionar nome - já mostra tudo ao entrar
- [x] Botões de WhatsApp e Ligação direta no card do chamado do Pós-Venda
- [x] Campo de observação no card do chamado para pós-venda anotar o que está sendo feito
- [x] Responsável do pós-venda visível no card do chamado

## Sistema de Orçamentos e Peças no Pós-Venda
- [x] Tabela pv_orcamentos: itens (peça/serviço), valor, quantidade, foto/scanner do orçamento, status aprovação
- [x] Pós-Venda pode lançar peças e serviços dentro do chamado do veículo
- [x] Pós-Venda pode escanear/fotografar orçamento da mecânica e anexar ao chamado
- [x] Financeiro vê todos os orçamentos pendentes e aprova/reprova cada item
- [x] Controle de valores: total do orçamento, total aprovado, total reprovado
- [x] Histórico de aprovações/reprovações no chamado

## Melhorias nos Agendamentos do Vendedor
- [x] Botão "Jogar pro Feirão" no card do agendamento (marcar como feirão rapidamente)
- [x] Botão "Editar/Reagendar" para vendedor alterar data, horário, nome, telefone, carro
- [x] Rota backend para marcar agendamento como feirão (toggle)
- [x] Rota backend para vendedor editar/reagendar agendamento

## Ranking Feirão e Vínculo Telefone Agendamento↔Venda
- [x] Ranking visual do Feirão: tela pública mostrando quem mais agendou pro feirão com contagem
- [x] Conferência de comparecimento do feirão: painel para verificar se cliente veio
- [x] Vínculo por telefone: ao registrar venda, cruzar telefone com agendamentos e identificar origem
- [x] Alerta para SDR: quando vendedor lançar venda de cliente que estava no agendamento da SDR
- [x] Controle de comissão SDR: pré-vendas vê quais clientes dela foram convertidos em venda
- [x] Rota backend: ranking feirão (quem mais agendou pro feirão)
- [x] Rota backend: buscar agendamento por telefone (cruzamento)
- [x] Rota backend: vincular venda ao agendamento de origem

## Mesa de Crédito / Ficha de Financiamento
- [x] Tabela fichas_financiamento: dados completos do cliente (nome, CPF, RG, nascimento, estado civil, mãe, pai, cidade nasceu, email, telefone, CEP, endereço, profissão, renda, local trabalho, referência pessoal)
- [x] Tabela ficha_bancos: status por banco (aprovado, recusado, análise), observação, valor parcela
- [x] Dados do veículo: modelo, placa, ano, valor financiado
- [x] Upload foto CNH/RG do cliente (S3) com visualização clicável
- [x] 16 bancos cadastrados: Santander, Bradesco, Itaú, Pan, C6, Safra, BBC, Omni, Daycoval, BV, Ailos, Sicoob, Listo, Carbank, Porto Seguro
- [x] Formulário completo na tela principal para vendedor preencher ficha
- [x] Fila de aprovação para F&I por ordem de chegada
- [x] Cronômetro visível mostrando tempo de espera de cada ficha
- [x] F&I atualiza status por banco: aprovado/recusado/análise + observação + valor parcela
- [x] Vendedor vê status da sua ficha e retorno dos bancos
- [x] Observações do vendedor sobre bancos já tentados
- [x] Consulta FIPE por placa (placeholder - API não disponível)

## Bugs
- [x] Bug: não consegue criar login para setor Consignação (verificado: login já está criado no banco)
- [x] Bug: data da consignação deve ser fixa (data do lançamento) e não editável pela consignação (contagem dos 7 dias depende dela)
- [x] Campo leilão (sim/não) no formulário de consignação
- [x] Campo quitação (quitado/financiado) no formulário de consignação
- [x] Campo valor de quitação quando financiado
- [x] Campo valor de custo (valor que o consignado deixou)
- [x] Campo observações na consignação
- [x] Verificar outros bugs gerais no sistema (fipePrice 0 fix, privacy filters, gerente bypass)

## Controle de Acesso por Setor
- [x] Primeiro acesso: vendedor cria login/senha no primeiro acesso
- [x] Agendamentos privados: cada vendedor vê APENAS os seus agendamentos (getPrivacySellerId)
- [x] Fichas de financiamento privadas: vendedor vê apenas as suas fichas (getFichaPrivacySellerId)
- [x] CRM privado: cada vendedor vê apenas seus dados (listBySeller com sellerId)
- [x] Estoque consignação visível para todos (veículos disponíveis) - página /estoque pública
- [x] Ranking e meta visíveis para todos - já implementado
- [x] Admin controla: bloquear/desbloquear vendedor, alterar senha, excluir
- [x] Admin define permissões por módulo para cada vendedor/setor (managerPerms)
- [x] Setores isolados: Pós-Venda não vê Financeiro, Consignação não vê Vendas, etc. (department-based routing)

## Bug: Não consegue alterar comparecimento do agendamento
- [x] Botão para alternar comparecimento (veio/não veio) no card do agendamento
- [x] Permitir corrigir status de comparecimento errado diretamente no card

## Login Individual e Controle de Acesso (PRIORIDADE)
- [x] Remover tela de código de acesso geral (ENTRAR NA COMPETIÇÃO)
- [x] Tela principal: login individual com usuário e senha
- [x] Primeiro acesso: vendedor escolhe seu nome na lista e cria usuário/senha (com seleção de setor)
- [x] Após login, redirecionar direto para MinhaArea do vendedor logado
- [x] Cada vendedor vê APENAS seus dados (agendamentos, fichas, CRM)
- [x] Admin controla: editar setor, resetar senha, bloquear/desbloquear vendedor
- [x] Consignação e ranking visíveis para todos (dados compartilhados)
- [x] Botão de corrigir comparecimento no card do agendamento

## Segurança do Primeiro Acesso
- [x] Reforçar: só vendedores já cadastrados pelo admin podem criar login
- [x] Após criar login, vendedor some da lista e não pode criar novamente
- [x] Esconder link "Primeiro acesso" quando não há vendedores sem login
- [x] Backend: validar que vendedor existe, está ativo e não tem login antes de permitir primeiro acesso
- [x] Mensagem clara na tela de que o acesso é exclusivo para equipe Kafka Multimarcas

## Papel de Gerente (acesso intermediário)
- [x] Adicionar campo sellerRole (vendedor/gerente) na tabela sellers
- [x] Criar tabela manager_permissions para controlar acesso por módulo
- [x] Backend: rotas de gerente verificam permissões definidas pelo admin
- [x] Admin pode marcar colaborador como gerente (toggle no card) e definir permissões
- [x] Gerente faz login pelo mesmo sistema, mas é redirecionado para painel especial (/gerente)
- [x] Painel do gerente mostra apenas módulos liberados pelo admin
- [x] Admin controla: quais módulos o gerente pode ver/editar (17 módulos disponíveis)
- [x] Botão "Gerente" aparece no header quando logado como gerente
- [x] 350 testes passando

## Edição de Registros F&I
- [x] Backend: rota para editar registro F&I (valor, placa, CPF, banco, retorno, observações, data pgto)
- [x] Frontend: botão de editar (lápis azul) no card F&I com dialog de edição completo
- [x] Admin pode editar registros aprovados, pendentes ou rejeitados
- [x] 357 testes passando

## Bug: Notificações não funcionam para vendedores
- [x] Investigado: push subscribe não enviava sellerId, NotificationCenter não recebia sellerId
- [x] Corrigido: usePushNotifications agora aceita sellerId e envia ao backend
- [x] Corrigido: NotificationCenter recebe sellerId na Home e MinhaArea
- [x] Adicionadas notificações de rejeição (vendas, F&I, consignação, despachante)
- [x] Push + notificação in-app para vendedor em todas aprovações/rejeições
- [x] 357 testes passando

## Bug/Melhoria: Painel do Gerente
- [x] Gerente está acessando painel admin em vez de painel próprio
- [x] Vendas mostra "Nenhuma venda" - gerente deve ver vendas de TODOS os vendedores (getPrivacySellerId bypass)
- [x] Agendamentos mostra 0 - gerente deve ver agendamentos de TODOS (getPrivacySellerId bypass)
- [x] Criar painel do gerente com visual melhor e mais prático (dashboard com stats, top 5, ações pendentes)
- [x] Botão grande e claro na Home para acessar painel gerente
- [x] Gerente vê dados consolidados de toda a equipe nos módulos permitidos
- [x] Separar completamente painel gerente do painel admin

## Bug: Ranking mostrando pontos errados (pontos > vendas)
- [x] Wesley tem 8 vendas mas mostra 9 pts - corrigido: agendamentos somavam no totalPoints
- [x] Matheus tem 4 vendas mas mostra 5 pts - corrigido: agendamentos somavam no totalPoints
- [x] Investigar cálculo de pontuação no ranking - causa: updateSaleTotals com incrementSales=false somava totalPoints
- [x] Corrigir lógica de pontuação: totalPoints agora reflete APENAS vendas de veículos, recalculado no banco

## Bug: Valores das vendas divididos por 100
- [x] Etios sedan mostra R$ 460,00 quando deveria ser R$ 46.000,00 - corrigido: exibição dividia por 100
- [x] Tiida mostra R$ 460,00 quando deveria ser R$ 46.000,00 - corrigido
- [x] Cronos mostra R$ 629,00 quando deveria ser R$ 62.900,00 - corrigido
- [x] Investigar se problema é no salvamento ou exibição - era na exibição (/ 100) e envio (* 100)
- [x] Corrigir valores existentes no banco de dados - F&I e despachante divididos por 100
- [x] Garantir que formulário de registro de venda trate valores corretamente - removido * 100
- [x] Padronizar: todos os valores agora são em reais inteiros, sem centavos

## Integração de Estoque (kafkamultimarcas.com.br)
- [x] Criar tabela inventory_vehicles no banco de dados
- [x] Criar scraper backend para puxar veículos do site (API LitoralCar com session cookie)
- [x] Implementar job de sincronização automática (a cada 15 min) - 93 veículos sincronizados
- [x] Criar rotas tRPC para listar/buscar estoque (list, getById, brands, stats, sync, reserve, markSold)
- [x] Criar página de Estoque no frontend (AdminInventory com grid, filtros, galeria, ações)
- [x] Integrar seleção de veículo do estoque no registro de vendas (VehicleSelector com busca + foto + preço auto)
- [x] Mostrar estoque no painel do gerente (sidebar Estoque no DashboardLayout)
- [x] Testes para scraper e rotas (14 testes, 385 total passando)

## Webhook WhatsApp Z-API
- [x] Atualizar webhook /api/webhooks/whatsapp para aceitar formato Z-API nativo (phone, text.message, momment, fromMe, isGroup)
- [x] Suporte a mídia: imagem, áudio, vídeo, documento (URLs Z-API)
- [x] Ignorar mensagens enviadas por nós (fromMe) e de grupos (isGroup)
- [x] Usar senderName do Z-API para nome do lead
- [x] Rota configureWebhook no whatsappRouter para configurar URL do webhook no Z-API
- [x] Atualizar zapi-service.ts para usar endpoint correto (update-webhook-received)
- [x] Documentação da API atualizada com formato Z-API
- [x] Testes do formato Z-API (14 testes passando)

## Disparo em Massa WhatsApp via CRM
- [ ] Criar rota tRPC para disparo em massa (filtrar leads + enviar mensagem via Z-API)
- [ ] Suporte a templates de mensagem com variáveis ({nome}, {veiculo}, etc.)
- [ ] Filtros: por etapa, origem, score, vendedor, data
- [ ] Controle de rate-limit (delay entre envios para não bloquear Z-API)
- [ ] Log de disparos (quantos enviados, falhas, etc.)
- [ ] Interface frontend no CRM para selecionar leads e compor mensagem
- [ ] Preview da mensagem antes de enviar
- [ ] Feedback em tempo real do progresso do disparo

## Bugs Reportados
- [x] Estoque no CRM mostrando dados placeholder (Hyundai HB20 repetido) em vez dos veículos reais do scraper
- [x] Corrigir seção de estoque do CRM Admin para usar inventory_vehicles (dados reais do site)

## Novas Solicitações - Estoque e CRM na Home
- [x] Corrigir CRM para usar inventory_vehicles (dados reais) em vez de crm_inventory (placeholder)
- [x] Adicionar aba Estoque na tela principal (Home) para vendedores verem veículos
- [x] Adicionar aba CRM/Leads na tela principal para vendedores acessarem seus leads
- [x] Configurar acesso SDR (pré-vendas) para qualificar e distribuir leads manualmente (assignToSeller, bulkAssign, listUnassigned)
- [x] Implementar disparo em massa WhatsApp para SDRs

## Sessão Noturna - Tudo pronto para feirão ama- [x] Importar chats recentes do WhatsApp Business via Z-APIra banco de leads do CRM
- [x] Disparo em massa WhatsApp completo (templates, filtros, preview, rate-limit, log)
- [ ] Caça aos bugs - revisar e corrigir todos os problemas encontrados

## Limpeza e UX do CRM Admin
- [x] Limpar leads de teste ("Cliente Teste CRM") do banco de dados (64 removidos)
- [x] CRM Admin abre direto na tela "Todos os Leads" como primeira página (em vez do Painel Geral)

## Sistema CRM 100% Produção - Visual e Funcional
- [x] Limpar todos os resíduos de teste do banco (leads, atividades, logs)
- [x] Verificar API Z-API conectada e webhook recebendo leads reais
- [x] Melhorar visual dos cards de leads no CRM Admin (nome, telefone, origem, tempo, ações rápidas)
- [x] Melhorar tela "Meus Leads" do vendedor - visual intuitivo com ações rápidas (WhatsApp, ligar, agendar)
- [x] Cards com cores por status/temperatura do lead (quente=vermelho, morno=amarelo, frio=azul)
- [x] Mostrar tempo desde último contato no card do lead
- [x] Botões de ação rápida maiores e mais visíveis (WhatsApp, Ligar)
- [x] Filtros visuais por status/temperatura na listagem de leads

## Bug: Mensagens WhatsApp não viram leads no CRM
- [x] Investigar webhook Z-API - mensagens chegam no WhatsApp mas não aparecem no CRM
- [x] Corrigir processamento do webhook para criar leads automaticamente (removido validateToken do webhook WhatsApp + reconfigurado URL na Z-API)

## Reformulação Completa do CRM
- [x] Chat WhatsApp integrado no CRM (enviar/receber mensagens, histórico de conversas)
- [x] Armazenar mensagens WhatsApp no banco de dados (tabela crm_messages)
- [x] Backend: procedures para listar mensagens e enviar mensagem via Z-API
- [x] Redesenhar CRM Admin: layout simples, visual, sem abas desnecessárias
- [x] Tela principal: lista de leads à esquerda + chat à direita (estilo WhatsApp Web)
- [x] Redesenhar tela vendedor (Meus Leads): mesma UX simplificada com chat
- [x] Remover abas/menus confusos, manter só o essencial

## CRM Overhaul Completo
- [x] Tabela crm_messages para histórico de chat WhatsApp
- [x] Webhook salva mensagens recebidas na tabela crm_messages
- [x] Procedures: listar mensagens por lead, enviar mensagem via Z-API
- [x] Alerta 5 min SDR: lead novo sem resposta gera alerta visual
- [x] Alerta 10 min vendedor: sem resposta auto-transfere para outro vendedor + aviso
- [x] Análise de atendimento por IA: nota visual por conversa (tempo, qualidade, conversão)
- [x] Dashboard performance vendedor: tempo médio resposta, taxa conversão, nota IA
- [x] Frontend: CRM estilo WhatsApp Web (lista leads esquerda + chat direita)
- [x] Frontend: alertas visuais de tempo de resposta
- [x] Frontend: painel de notas IA e performance

## Bug: SDR não vê leads + Financeiro bloqueado + Painel Permissões
- [ ] SDR (pre_vendas) deve ver leads não atribuídos (sellerId=0) no CRM /crm
- [ ] Financeiro deve conseguir lançar contas (verificar bloqueio)
- [ ] Criar painel de permissões por função no gerente (controlar o que cada cargo acessa/faz)
- [ ] Gerente define permissões: quem vê leads, quem pode lançar financeiro, quem acessa ranking, etc.

## Bug: Senha Tissiane + SDR acesso total
- [x] Resetar senha da Tissiane para 111025
- [x] Investigar bug de troca de senha (hash não bate após mudar)
- [x] SDR deve ter acesso TOTAL a todos os leads (não só os não atribuídos) para administrar e transferir

## Financeiro Bloqueado
- [ ] Investigar o que bloqueia o acesso ao módulo financeiro
- [ ] Corrigir e liberar acesso ao financeiro

## AI Lead Scoring
- [ ] Criar tabela/campos para armazenar score do lead (quente/morno/frio)
- [ ] Implementar algoritmo de scoring baseado em: tempo de resposta, mensagens trocadas, agendamento, simulação financiamento
- [ ] Exibir indicador visual (quente/morno/frio) no card do lead no CRM
- [ ] Atualizar score automaticamente quando lead interage
- [ ] Filtro por temperatura no painel SDR e vendedor

## Automação de Follow-up WhatsApp
- [ ] Criar tabela para sequências de follow-up (templates + intervalos)
- [ ] Tela admin para criar/editar sequências de follow-up
- [ ] Motor de execução automática que envia mensagens via Z-API nos intervalos definidos
- [ ] Parar sequência quando lead responde
- [ ] Log de mensagens enviadas automaticamente
- [ ] Indicador visual de "em sequência automática" no card do lead

## Integração com Portais de Anúncio
- [ ] Pesquisar APIs disponíveis (OLX, Webmotors, iCarros, Mobiauto, Instagram)
- [ ] Tela de configuração para credenciais dos portais
- [ ] Publicação de veículos do estoque nos portais com 1 clique
- [ ] Sincronização de status (vendido/disponível)
- [ ] Recebimento de leads dos portais direto no CRM

## Bug Fixes
- [x] Leads mostram "SEM RESPOSTA" mesmo quando cliente já respondeu no WhatsApp (corrigido: webhook agora registra mensagens fromMe como outbound)

## SDR Chat Panel
- [x] Adicionar painel de chat inline na tela da SDR para conversar com leads direto pelo CRM
- [x] SDR deve poder clicar no lead e ver histórico de mensagens + campo para enviar mensagem

## Reformulação Minha Área - Financeiro
- [x] Minha Área do Financeiro: remover ações irrelevantes (Agendamento, Ranking) e mostrar ações do setor
- [x] Botão direto para Contas a Pagar/Receber com permissão de editar
- [x] Botão direto para Pós-Venda
- [x] Nova aba de Gasolina: lançamento de abastecimentos (veículo, litros, valor, km, posto)
- [x] Lançamento por áudio: gravar áudio que IA transcreve e preenche campos automaticamente (contas e gasolina)

## Melhorias Chat CRM
- [x] Áudios mostrando como "Arquivo" - renderizar como player de áudio inline (play/pause)
- [x] Fotos/imagens mostrando como "Arquivo" - renderizar como thumbnail clicável
- [x] Vídeos mostrando como "Arquivo" - renderizar como player de vídeo inline
- [x] Adicionar envio de fotos, vídeos e arquivos pelo chat (botões de anexo)
- [x] Aba de Estoque no chat - enviar ficha de veículo cadastrado direto pro cliente

## Gravação e Envio de Áudio no Chat
- [x] Botão de gravar áudio no chat (segurar para gravar, soltar para enviar)
- [x] Envio do áudio gravado via Z-API como mensagem de voz para o cliente
- [x] Feedback visual durante gravação (ícone pulsando, tempo de gravação)

## Bugs Reportados - 27/03/2026
- [x] Leads não atualizam automaticamente - precisa dar refresh na tela para ver novos leads
- [x] Erro "Veículo não encontrado" ao clicar para enviar veículo do estoque no chat

## Bug - Foto do veículo não enviada - 27/03/2026
- [x] Corrigir envio de foto do veículo junto com a ficha no WhatsApp (pelo menos 1 foto)
- [x] Fallback: se photoUrl vazio, tentar buscar do campo photos ou do site da loja (externalUrl)

## Melhorias Pipeline e Foto - 27/03/2026
- [x] Foto do veículo: proxy via S3 para contornar bloqueio de URL do litoralcar.com.br
- [x] Foto do veículo: enviar TODAS as fotos disponíveis no campo photos[] (não só 1)
- [x] Pipeline: implementar drag & drop para arrastar leads entre colunas (estágios)

## IA Assistente de Vendas no Chat - 27/03/2026
- [x] Backend: procedure tRPC aiSuggestReply que gera sugestão de resposta com contexto (lead, histórico, estoque)
- [x] Backend: tabela crm_ai_settings para salvar config por lead (autoReply on/off)
- [x] Frontend: botão IA (raio/Zap) no chat ao lado do campo de mensagem
- [x] Frontend: modal de sugestão com opção de editar antes de enviar ou enviar direto
- [x] Frontend: prompts rápidos (Quebrar objeção de preço, Agendar visita, Oferecer financiamento, Criar urgência)
- [x] Frontend: campo de prompt customizado para pedir algo específico à IA
- [x] Frontend: toggle de IA Automática por lead (ativar/desativar)
- [x] Modo automático: webhook detecta mensagem inbound e responde via IA quando ativado
- [x] System prompt especializado em vendas automotivas, conversão, agendamento, quebra de objeções
- [x] IA com contexto: nome do lead, interesse, score, histórico de conversa, estoque disponível
- [x] Funciona tanto no painel admin (CrmCommandCenter) quanto na tela SDR (CrmChat)

## Melhorias Consignação - 27/03/2026
- [x] Admin: botão editar consignação (corrigir dados lançados errado)
- [x] Admin: botão excluir consignação (com confirmação)
- [x] Tela Aprovar: rejeição com motivo "Veículo não aceito - Fora de parâmetro da loja"
- [x] Tela Aprovar: campo de observação ao rejeitar para explicar o motivo
- [x] Consignação: exibir motivo da rejeição para o setor de consignação

## Login Automático CRM - 28/03/2026
- [x] Resetar senha do admin 'kafka' (nova senha: kafka2026)
- [x] Login automático: owner do Manus entra direto no CRM admin sem digitar senha
- [x] Limpar contas de teste da tabela admins (78 contas removidas)

## Fix Login Automático - 28/03/2026
- [x] Auto-login sem depender do Manus OAuth - gerar token direto ao acessar a página de login

## Correções Múltiplas - 28/03/2026
- [ ] Documentos de venda: tornar cards clicáveis para acessar/visualizar documentos
- [ ] Documentos de venda: botões de editar e excluir
- [ ] Botão voltar em todas as abas/páginas internas
- [ ] Filtro de leads por temperatura (Morno/Quente/Frio) não funciona - todos aparecem como Morno
- [ ] Bug: toggle IA Automática não clicável
- [ ] IA automática: mensagens muito longas - precisa ser mais curta e humanizada, objetiva
- [ ] Envio de veículo simplificado: só nome do veículo + ano + fotos (sem câmbio, combustível, placa, etc)
- [ ] Fotos enviadas do veículo não aparecem no chat do remetente (só aparece pro destinatário)

## Integração Instagram + Facebook - 28/03/2026
- [ ] Pesquisar e configurar Meta Graph API para Instagram e Facebook
- [ ] Backend: webhook para receber mensagens do Instagram Direct
- [ ] Backend: webhook para receber mensagens do Facebook Messenger
- [ ] Backend: enviar mensagens via Instagram Direct API
- [ ] Backend: enviar mensagens via Facebook Messenger API
- [ ] Frontend: indicador de origem (WhatsApp/Instagram/Facebook) nos leads e chat
- [ ] Frontend: seletor de canal ao enviar mensagem (quando lead tem múltiplos canais)
- [ ] Leads do Instagram e Facebook entram automaticamente no CRM

## Melhorias Solicitadas - 28/03/2026 (Sessão 2)

### Despachante - Acesso Completo
- [ ] Visualizar todos os documentos lançados com det- [x] Permitir editar notas/observações de documentos
- [x] Permitir excluir registros de documentos
- [x] Filtros funcionando corretamente por status

### Financeiro - Notificações de Autorização de Pagamento
- [x] Separar contas operacionais (aluguel, água, luz) das que precisam autorização
- [x] Campo "requer autorização" ao lançar conta especial
- [x] Notificação push quando conta que precisa autorização é lançada
- [x] Fluxo: lançou → conferiu → pede autorização → notificação ao admin/gerente

### Distribuição de Leads com Timers
- [x] Distribuição automática por ordem de chegada (round-robin entre SDRs)
- [x] Identificação visual por cor/nome de cada SDR
- [x] Timer SDR: aviso em 5 minutos se não respondeu
- [x] Timer SDR: transfere para outra SDR se não responder em 5 minutos
- [x] Timer Vendedor: aviso em 5 minutos que cliente aguardando
- [x] Timer Vendedor: transfere lead se passar de 10 minutos sem resposta
- [x] Notificação visual de "cliente aguardando" com contagem regressiva

### Visual e UX Geral
- [x] Destacar áreas mais importantes com cores e tamanhos
- [x] Adicionar botões faltando em todas as abas
- [x] Melhorar praticidade geral - menos cliques, mais ações diretas
- [x] Tornar interface mais visual e intuitiva

### Varredura Completa de Bugs
- [x] Análise de todas as telas e módulos
- [x] Corrigir todos os bugs encontrados na varredura
- [x] Verificar botões não funcionais em todas as páginas
- [x] Verificar abas sem funcionalidade de edição

## Financeiro - Acesso e Funcionalidades (28/03 sessão 2)
- [x] Financeiro deve conseguir lançar tudo por áudio (contas a pagar, receber, gasolina)
- [x] Admin deve ter acesso à tela do Financeiro (ver tudo que o financeiro vê)
- [x] Verificar se tela do financeiro está acessível e funcional
- [x] Garantir que lançamento por áudio funciona na tela principal do financeiro

## Melhorias F&I - 28/03
- [x] F&I (financeiro) poder editar registros que lançou errado (não só admin)
- [x] Adicionar campo nome do cliente (além do CPF)
- [x] Busca automática por placa - puxar modelo/marca FIPE
- [x] CEP automático - preencher endereço ao digitar CEP
- [x] Ficha cadastral completa para financiamento (nome, CPF, RG, nascimento, estado civil, mãe, email, telefone, CEP, endereço, profissão, renda, local trabalho, foto CNH/RG)
- [x] Simplificar aba de cadastro inicial (mais básica)

## Bugs CRM Chat + IA - 28/03
- [x] Leads não sobem na lista quando recebem nova mensagem (já ordena por lastContactDate DESC)
- [x] Tempo "sem resposta" atualiza corretamente (verifica se última msg é inbound sem resposta)
- [x] Toggle IA Automática funciona (button type=button, z-10, pointer-events-none no knob)
- [x] Modos de IA configuráveis: Modo Normal vs Modo Feirão (tabela crm_ai_global_config)
- [x] Modo Feirão: configurar benefícios/promoções e IA responde focada nisso tentando agendar
- [x] Opção de alternar entre modos na configuração do CRM (SettingsView > AiModeConfig)
- [x] Mostrar telefone do cliente na lista de leads (abaixo do nome)
- [x] IA suggestReply e auto-reply no webhook usam modo global (Normal/Feirão)
- [x] 418 testes passando

## Bugs CRM Chat - Correção Urgente 28/03
- [x] Chat mostra só mensagens do cliente → ativado enableNotifySentByMe no Z-API para capturar outbound
- [x] Leads mostram "Sem mensagens" → alterado para "Novo lead" quando sem info
- [x] Timer "sem resposta" verificado e funciona corretamente
- [x] Webhook atualizado para processar mensagens outbound via notifySentByMe
- [x] listMessages retorna todas as mensagens (inbound + outbound) corretamente
- [x] Integração WhatsApp funcional com status dinâmico nas Configurações

## Bugs CRM - Toast + Outbound Messages 28/03
- [x] Toast "Configuração salva!" corrigido (duration=3000, closeButton, richColors, z-index 999999)
- [x] Webhook agora captura mensagens outbound (enableNotifySentByMe ativado)
- [x] Outbound messages mostram label "Vendedor" ou "⚡ IA Kafka"
- [x] Z-API webhook processa eventos de mensagem enviada
- [x] Botões "Reconfigurar Webhook" e "Ativar Captura Outbound" nas Configurações
- [x] 418 testes passando

## Funcionalidades Agendamentos - 28/03
- [x] Exportar PDF: botão Imprimir no header gera HTML com lista de resgates e ativos para impressão
- [x] Transferir agendamento para outro vendedor (botão Transferir + dropdown de vendedores)
- [x] Resgate automático via IA no WhatsApp (botão IA Resgate gera msg personalizada e envia pelo Z-API)
- [x] Follow-up automático 20min: alert-checker verifica agendamentos 20min+ atrasados e envia msg IA no WhatsApp
- [x] 425 testes passando

## Bugs Críticos CRM - 29/03
- [ ] IA respondendo 2x (mensagem duplicada no WhatsApp)
- [ ] Layout do chat precisa parecer mais com WhatsApp (balões, cores, espaçamento)
- [ ] Distribuição de leads deve ir APENAS para SDRs, não para vendedores
- [ ] Botão de distribuição automática precisa ser mais visível
- [ ] Toggle IA Automática não funciona (não ativa)
- [ ] Cruzamento venda x agendamento: notificar admin e SDR quando venda é fechada de um agendamento
- [ ] Área dedicada para SDR (pré-vendas) separada do vendedor

## Bugs CRM - Outbound + Hora Lead - 29/03
- [x] Conversas do WhatsApp respondidas pelo vendedor agora capturadas (notifySentByMe reativado com sucesso)
- [x] Mostrar hora/data que o lead chegou na lista ("Chegou: 29/03, 15:30")
- [x] Timer "sem resposta" funciona corretamente (verifica última msg inbound sem resposta outbound)
- [x] Z-API notifySentByMe reativado com sucesso (retornou {"value":true})
- [x] Chat redesenhado estilo WhatsApp (cores #005c4b outbound, #1f2c33 inbound, bg #0b141a)
- [x] Deduplicação de mensagens no webhook (messageId cache + AI auto-reply check)
- [x] Distribuição de leads corrigida para ir apenas para SDRs (pre_vendas)
- [x] 425 testes passando

## Bugs CRM Críticos - 29/03 (Rodada 2)
- [ ] Mensagens no chat mostram apenas nome do remetente sem conteúdo (WILSON ZANDONA sem texto)
- [ ] Conversas do WhatsApp real não aparecem no CRM (ex: conversa Pedro Honda City)
- [ ] IA enviando mensagens follow-up repetidas (mesma msg várias vezes)
- [ ] Adicionar botão de voltar no chat mobile

## Correção: Mensagens do WhatsApp não aparecem no CRM
- [x] Webhook: extração completa de conteúdo para TODOS os tipos de mensagem Z-API (texto, imagem, áudio, vídeo, documento, sticker, localização, contato, botões, templates, enquetes, carrossel, produto, pedido)
- [x] Webhook: detecção correta de messageType para cada formato de payload
- [x] Webhook: skip automático de notificações do sistema, reações, votos de enquete e newsletters
- [x] Webhook: deduplicação melhorada de mensagens outbound (AI + CRM) com janela de 2 min e match por zapiMessageId
- [x] Chat: exibição de placeholder para mensagens de mídia sem texto (áudio, sticker, localização, contato, enquete, etc.)
- [x] Chat: aplicado tanto no CrmChat quanto no CrmCommandCenter
- [x] Botão de voltar sempre visível no chat (não apenas no mobile)
