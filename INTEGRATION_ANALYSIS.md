# Análise de Integrações - Kafka Multimarcas (Jul 2026)

## Integrações Existentes no Código

### 1. Z-API (WhatsApp)
- **Arquivo:** `server/zapi-service.ts`
- **Router:** `server/routers/whatsappRouter.ts`
- **Status:** Credenciais globais configuradas via ENV (ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN)
- **Credenciais no tenant:** NULL (tenant 1 não tem credenciais próprias, usa ENV global)
- **Status da conexão:** `connected: false, smartphoneConnected: false` - DESCONECTADO!
- **Funcionalidades:**
  - sendText, sendImage, sendDocument, sendAudio, sendVideo, sendLink
  - sendBulk (máx 500 mensagens)
  - getContacts, getChats (importação)
  - setWebhook, enableNotifySentByMe
  - getStatus, getProfilePicture
- **Webhook URL:** `https://kafkarank.com/api/webhooks/whatsapp/kafka-multimarcas`
- **Webhook handler:** Processa mensagens recebidas, salva no CRM, detecta duplicatas
- **AI Attendant:** Integrado - responde automaticamente via IA

### 2. Estoque (Inventory Scraper)
- **Arquivo:** `server/inventory-scraper.ts`
- **Router:** `server/routers/inventoryRouter.ts`
- **Status:** FUNCIONANDO - 124 veículos sincronizados
- **URL:** `https://www.kafkamultimarcas.com.br/` (campo `inventoryUrl` no tenant)
- **Método:** Scraping via PHP API (`/acoes.php?acao=pegarEstoque`) com session cookie
- **Intervalo:** A cada 15 minutos
- **Último sync:** "Done in 8201ms. Found: 124, Added: 0, Updated: 116, Removed: 0"

### 3. Meta/Facebook/Instagram
- **Arquivo:** `server/metaMessagingService.ts`
- **Router:** Parte do `crmRouter.ts`
- **Webhook:** `POST /api/webhooks/meta/leadgen` (Lead Gen Forms)
- **Webhook verify:** `GET /api/webhooks/meta/verify`
- **Status:** SEM configuração no banco (nenhuma integração "facebook" encontrada)
- **Funcionalidades:** sendText, sendImage, sendPrivateReply (Instagram DM)

### 4. OLX
- **Status:** 202 registros na tabela `crm_integrations` (duplicados!)
- **Webhook:** `POST /api/webhooks/lead` (genérico, aceita source=olx)
- **Problema:** Muitas entradas duplicadas no banco

### 5. SIG Web (Sistema de Gestão)
- **Webhook:** `POST /api/webhooks/sig/sale` - Sincroniza vendas
- **Webhook:** `POST /api/webhooks/sig/inventory` - Sincroniza estoque
- **Status:** 1 registro na tabela `crm_integrations`

### 6. Google Ads
- **Webhook:** `POST /api/webhooks/google/lead` - Leads de Google Ads

### 7. Widget de Captura
- **Webhook:** `POST /api/webhooks/widget/lead` - Widget embeddable para site
- **Script:** `GET /api/webhooks/widget.js` - Script para embed

### 8. Email Parser
- **Webhook:** `POST /api/webhooks/email-parser` - Parseia emails de leads

### 9. Asaas (Pagamentos/Assinatura)
- **Webhook:** `POST /api/webhooks/asaas` - Eventos de pagamento da plataforma

### 10. AI Attendant
- **Arquivo:** `server/ai-attendant.ts`
- **Status:** Funcional (usa invokeLLM)
- **Funcionalidades:** Auto-resposta, qualificação de leads, envio de fotos de veículos

### 11. Campaign Dispatch
- **Arquivo:** `server/campaign-dispatch.ts`
- **Status:** Funcional (usa Z-API para envio em massa)

## Problemas Identificados

### CRÍTICOS:
1. **Z-API DESCONECTADO** - O WhatsApp não está conectado. O telefone precisa escanear o QR code novamente.
2. **202 registros OLX duplicados** - Precisa limpar duplicatas no banco

### LOGS PREOCUPANTES:
1. **Alert Checker spam** - Muitos leads com "já foi transferido 3x (max: 3)" - indica leads antigos que ficaram presos no loop
2. **Connection lost** - Erro `PROTOCOL_CONNECTION_LOST` no MySQL (conexão perdida, mas auto-reconecta)
3. **TVMode exitFullscreen error** - Bug menor no fullscreen da TV

### MELHORIAS SUGERIDAS:
1. Salvar credenciais Z-API no tenant (não só no ENV global) para multi-tenant funcionar
2. Limpar duplicatas OLX no banco
3. Configurar integração Meta/Facebook
4. Reduzir spam do Alert Checker para leads que já atingiram max transferências

## Dados do CRM
- Total leads: 3.219
- Total mensagens: 29.557
- Fontes: whatsapp (3.108), manual (109), trafego_pago (2)
- Veículos no estoque: 124
