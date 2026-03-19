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
