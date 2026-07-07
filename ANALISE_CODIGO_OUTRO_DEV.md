# Análise Completa do Código do Outro Dev (Branch feat/multi-tenant)

## Resumo Executivo

O outro dev implementou uma camada completa de **multi-tenancy SaaS** no commit `361f2ca` (Merge PR #3), incluindo login unificado por email, planos de assinatura com gateway ASAAS, cadastro público de lojas, painel Super Admin expandido, e sistema de logs/alertas. Porém, **o código atual (7449e59) não contém a maioria dessas features** — elas foram removidas/revertidas durante um reset anterior (provavelmente conflito de merge). O servidor atual roda sem erros, mas com funcionalidade reduzida.

---

## 1. Status dos Módulos — O Que FOI Implementado vs O Que EXISTE Hoje

| Módulo | No Merge (361f2ca) | No Código Atual (7449e59) | Status |
|--------|-------------------|--------------------------|--------|
| `billingRouter.ts` | Sim (180 linhas) | **NÃO EXISTE** | REMOVIDO |
| `tenantAuthRouter.ts` | Sim (297 linhas) | **NÃO EXISTE** | REMOVIDO |
| `passwordResetRouter.ts` | Sim (105 linhas) | **NÃO EXISTE** | REMOVIDO |
| `publicSignupRouter.ts` | Sim (71 linhas) | **NÃO EXISTE** | REMOVIDO |
| `subscriptionLogsRouter.ts` | Sim (84 linhas) | **NÃO EXISTE** | REMOVIDO |
| `platformLogsRouter.ts` | Sim (314 linhas) | **NÃO EXISTE** | REMOVIDO |
| `tenantPublicRouter.ts` | Sim (16 linhas) | **NÃO EXISTE** | REMOVIDO |
| `asaasService.ts` | Sim (145 linhas) | **NÃO EXISTE** | REMOVIDO |
| `tenantService.ts` | Sim (169 linhas) | **NÃO EXISTE** | REMOVIDO |
| `tenantProvisioning.ts` | Sim (200 linhas) | **NÃO EXISTE** | REMOVIDO |
| `billingAlertService.ts` | Sim (60 linhas) | **NÃO EXISTE** | REMOVIDO |
| `usernamePolicy.ts` | Sim (65 linhas) | **NÃO EXISTE** | REMOVIDO |
| `emailPolicy.ts` | Sim (~130 linhas) | **NÃO EXISTE** | REMOVIDO |
| `superAdminAuth.ts` | Sim (17 linhas) | **NÃO EXISTE** (inline no superAdminRouter) | INLINED |
| `authHelpers.ts` | Sim (20 linhas) | **NÃO EXISTE** (inline no routers.ts) | INLINED |
| `tenantUrls.ts` | Sim | **NÃO EXISTE** | REMOVIDO |
| `_core/logger.ts` (pino) | Sim | **NÃO EXISTE** (pino instalado mas logger.ts removido) | REMOVIDO |
| `_core/secretCrypto.ts` | Sim | **NÃO EXISTE** | REMOVIDO |
| `shared/plans.ts` | Sim (planos/preços) | **NÃO EXISTE** | REMOVIDO |
| `shared/validators.ts` | Sim (CPF/CNPJ/phone) | **NÃO EXISTE** | REMOVIDO |
| `trialReminderJob.ts` | Sim (scheduler) | **NÃO EXISTE** | REMOVIDO |
| `emailService.ts` | 326 linhas (completo) | 142 linhas (só OTP/verificação) | PARCIAL |
| `superAdminRouter.ts` | 408 linhas (com health/zapi/provisioning) | 407 linhas (sem health/zapi/provisioning) | DEGRADADO |
| `webhooks.ts` | 2231 linhas (com ASAAS webhook) | 1713 linhas (sem ASAAS webhook) | DEGRADADO |
| `_core/env.ts` | Com ASAAS vars + APP_URL | Sem ASAAS vars | DEGRADADO |
| `_core/index.ts` schedulers | 4 schedulers (inventory, alert, trial, inactive) | 2 schedulers (inventory, alert) | DEGRADADO |

---

## 2. Frontend — Páginas Removidas

| Página/Componente | No Merge | Atual | Status |
|-------------------|----------|-------|--------|
| `UnifiedLogin.tsx` | Sim (login por email) | **NÃO EXISTE** | REMOVIDO |
| `EsqueciSenha.tsx` | Sim | **NÃO EXISTE** | REMOVIDO |
| `RedefinirSenha.tsx` | Sim | **NÃO EXISTE** | REMOVIDO |
| `Assinatura.tsx` | Sim (tela de planos) | **NÃO EXISTE** | REMOVIDO |
| `AssinaturaContent.tsx` | Sim (450 linhas) | **NÃO EXISTE** | REMOVIDO |
| `TenantContext.tsx` | Sim (branding dinâmico) | **NÃO EXISTE** | REMOVIDO |
| `TrialExpiredGate.tsx` | Sim (bloqueio trial) | **NÃO EXISTE** | REMOVIDO |
| `TrialStatusBanner.tsx` | Sim | **NÃO EXISTE** | REMOVIDO |
| `ComercialHome.tsx` | Sim (landing page) | **NÃO EXISTE** | REMOVIDO |
| `ComercialCadastro.tsx` | Sim (signup público) | **NÃO EXISTE** | REMOVIDO |
| `ComercialLegal.tsx` | Sim (termos/privacidade) | **NÃO EXISTE** | REMOVIDO |
| `StoreLoginPicker.tsx` | Sim | **NÃO EXISTE** | REMOVIDO |
| `AccessGate.tsx` | Sim | **NÃO EXISTE** | REMOVIDO |
| Rotas `/t/:slug/*` | Sim (todas duplicadas) | **NÃO EXISTEM** | REMOVIDO |
| Rota `/login` | UnifiedLogin | SellerLogin (antigo) | REVERTIDO |
| Rota `/` | ComercialHome | Home (antigo) | REVERTIDO |

---

## 3. Análise Técnica do Código do Outro Dev (Qualidade)

### 3.1 billingRouter.ts — ASAAS Integration
- **Qualidade: BOA**. Fluxo correto: cria customer → cria subscription → redireciona pro checkout hospedado
- Trata upgrade/downgrade (PUT em vez de criar segunda assinatura)
- Usa `clearTenantLimitsCache` após mudanças
- Tratamento de erro com `createBillingAlert` para rastreabilidade
- **Problema**: `cancelSubscription` não muda o `plan` de volta para "trial" — fica sem plano

### 3.2 tenantAuthRouter.ts — Login Unificado por Email
- **Qualidade: BOA**. Resolve admin/manager/seller/super_admin pelo email
- Preview em tempo real (mostra nome/loja antes de digitar senha)
- Mantém login legado por username como fallback
- Seta cookies corretos por tipo de sessão
- **Problema**: `loginPreviewByEmail` expõe se um email existe no sistema (information disclosure)

### 3.3 passwordResetRouter.ts — Esqueci Senha
- **Qualidade: BOA**. Token SHA-256 com TTL de 30min, resposta genérica (não revela se email existe)
- Busca nas 3 tabelas (admin/manager/seller)
- Marca token como usado após reset

### 3.4 publicSignupRouter.ts — Cadastro Público
- **Qualidade: BOA**. Honeypot anti-bot, validação de disponibilidade em tempo real
- Usa `provisionTenant` que cria tudo atomicamente (tenant + admin + pipeline + categorias)
- Envia email de boas-vindas

### 3.5 platformLogsRouter.ts — Logs Unificados
- **Qualidade: BOA**. Agrega 3 fontes (subscription_events, email_logs, billing_alerts)
- Normaliza formato para exibição unificada
- Badge de eventos raros (chargebacks, estornos)
- Resolve billing_alert como "tratado"

### 3.6 webhooks.ts — ASAAS Webhook
- **Qualidade: EXCELENTE**. Validação por token fixo, resolução de tenant por asaasCustomerId
- Transação atômica (grava evento + muda status)
- Dedup por asaasPaymentId
- Efeitos soft fora da transação (email/notificação)
- Tratamento de eventos raros (não reage, só loga)

### 3.7 tenantService.ts / tenantProvisioning.ts
- **Qualidade: BOA**. Cache de limites, provisioning atômico com pipeline/categorias padrão
- Geração de slug único e username único

### 3.8 emailService.ts (versão expandida)
- **Qualidade: BOA**. Log de todos os emails enviados, tipagem forte de EmailType
- Graceful degradation quando RESEND_API_KEY não configurada

### 3.9 shared/plans.ts
- **Qualidade: EXCELENTE**. Fonte única de verdade para preços/limites
- Usado tanto no backend quanto no frontend

---

## 4. O Que Precisa Ser Feito Para Restaurar

### Prioridade CRÍTICA (para o sistema funcionar como SaaS multi-tenant):

1. **Restaurar arquivos de backend** do commit 361f2ca:
   - `server/routers/billingRouter.ts`
   - `server/routers/tenantAuthRouter.ts`
   - `server/routers/passwordResetRouter.ts`
   - `server/routers/publicSignupRouter.ts`
   - `server/routers/subscriptionLogsRouter.ts`
   - `server/routers/platformLogsRouter.ts`
   - `server/routers/tenantPublicRouter.ts`
   - `server/asaasService.ts`
   - `server/tenantService.ts`
   - `server/tenantProvisioning.ts`
   - `server/billingAlertService.ts`
   - `server/usernamePolicy.ts`
   - `server/emailPolicy.ts`
   - `server/superAdminAuth.ts`
   - `server/authHelpers.ts`
   - `server/tenantUrls.ts`
   - `server/_core/logger.ts`
   - `server/_core/secretCrypto.ts`
   - `server/trialReminderJob.ts`
   - `shared/plans.ts`
   - `shared/validators.ts`

2. **Atualizar `server/routers.ts`** para importar e registrar os 7 routers removidos

3. **Atualizar `server/_core/env.ts`** para incluir variáveis ASAAS + APP_URL

4. **Atualizar `server/_core/index.ts`** para registrar os schedulers removidos (trialReminder, inactiveDispatch)

5. **Atualizar `server/emailService.ts`** para incluir as funções de email transacional removidas

6. **Atualizar `server/webhooks.ts`** para incluir o endpoint `/api/webhooks/asaas`

7. **Atualizar `server/routers/superAdminRouter.ts`** para incluir `getTenantHealth`, `checkAvailability`, e integração com Z-API/secretCrypto

### Prioridade ALTA (frontend):

8. **Restaurar páginas frontend**:
   - `UnifiedLogin.tsx`, `EsqueciSenha.tsx`, `RedefinirSenha.tsx`
   - `Assinatura.tsx`, `AssinaturaContent.tsx`
   - `TenantContext.tsx`, `TrialExpiredGate.tsx`, `TrialStatusBanner.tsx`
   - `ComercialHome.tsx`, `ComercialCadastro.tsx`, `ComercialLegal.tsx`
   - `StoreLoginPicker.tsx`, `AccessGate.tsx`

9. **Atualizar `App.tsx`** para incluir rotas `/t/:slug/*`, `/login` → UnifiedLogin, `/` → ComercialHome

10. **Restaurar `client/src/lib/tenant.ts`** e `client/src/lib/tenantForm.ts`

### Prioridade MÉDIA (configuração):

11. **Configurar secrets** no ambiente:
    - `ASAAS_API_KEY` (gateway de pagamento)
    - `ASAAS_WEBHOOK_TOKEN` (validação de webhooks)
    - `ASAAS_API_URL` (sandbox vs produção)
    - `RESEND_API_KEY` (envio de emails)
    - `APP_URL` (URL pública da aplicação)

---

## 5. Problemas Identificados no Código do Outro Dev

| # | Problema | Severidade | Onde |
|---|----------|-----------|------|
| 1 | `getPrivacySellerId` usa `-(ctx.user.id + 1000000)` — lógica invertida/incorreta comparada com a versão do merge que usa `ctx.user.actorType` | Alta | routers.ts L36-42 |
| 2 | `cancelSubscription` não reseta o plano para trial/free | Média | billingRouter.ts |
| 3 | `loginPreviewByEmail` expõe existência de email (information disclosure) | Baixa | tenantAuthRouter.ts |
| 4 | SuperAdminRouter usa `publicProcedure` com token manual em vez de middleware | Baixa | superAdminRouter.ts |
| 5 | `zapiToken` é salvo em plaintext no `updateTenant` (atual) — merge usava `encryptSecret` | Alta | superAdminRouter.ts L243-245 |
| 6 | `inactive-dispatch.ts` existe mas não é registrado no index.ts | Média | _core/index.ts |

---

## 6. Recomendação

A abordagem mais segura é **restaurar os arquivos do commit 361f2ca** usando `git show 361f2ca:<path> > <path>` para cada arquivo listado acima, depois ajustar conflitos pontuais com o código atual. Isso é preferível a reescrever tudo do zero, já que o código do outro dev está bem estruturado e funcional.

**Estimativa de esforço**: ~2-3 horas para restaurar todos os arquivos + ajustar imports + testar.
