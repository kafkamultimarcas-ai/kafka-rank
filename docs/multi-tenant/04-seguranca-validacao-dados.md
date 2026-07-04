# Segurança e Validação de Dados

Tudo que protege dado (isolamento entre lojas, credencial), qualidade de dado (CPF/CNPJ/telefone/e-mail) e abuso (rate limit).

## 1. Isolamento cross-tenant

- Coberto em detalhe no documento 01 (seção 1). Resumo: `tenantId` obrigatório em toda tabela de dado, filtrado automaticamente via `getCurrentTenantId()` (`AsyncLocalStorage`), testado por varredura automática do schema (`tenant-security.test.ts`).
- Credenciais Z-API (WhatsApp) são **por loja**, não uma só pra plataforma inteira — cada tenant tem `zapiInstanceId`/`zapiToken`/`zapiClientToken` próprios, **criptografados em repouso** no banco (Fase J, anterior a esta leva de trabalho).
- Rate limit por loja+IP (`tenantAwareKey`, `server/_core/index.ts`) em vez de só por IP, em rotas sensíveis — evita que uma loja "barulhenta" ou vários usuários atrás do mesmo IP compartilhado consumam a cota de outra loja.

## 2. Validação de documento e contato

### 2.1. Antes desta branch
`billingRouter.subscribe` validava CPF/CNPJ só por `min(11)` caracteres — aceitava `"11111111111"` ou qualquer sequência de 11 dígitos. Nenhum outro formulário do sistema tinha validação real de CPF/CNPJ/telefone.

### 2.2. `shared/validators.ts` (novo, compartilhado front+back)

| Função | Valida |
|---|---|
| `isValidCPF` | Checksum real dos dois dígitos verificadores, rejeita todos os dígitos iguais (`"11111111111"`) |
| `isValidCNPJ` | Mesma ideia, algoritmo de CNPJ |
| `isValidCpfCnpj` | Aceita os dois formatos, decide pelo tamanho (11 ou 14 dígitos) |
| `isValidBrazilianPhone` | DDD entre 11-99, celular precisa ter o `9` na frente, aceita com/sem código do país `55` |
| `isValidEmail` | Formato básico (não substitui confirmação por e-mail) |

Usado no backend via `.refine()` do Zod (rejeita a requisição inteira antes de gastar uma chamada real na ASAAS) e no frontend pra validação on-blur com mensagem de erro inline.

### 2.3. `client/src/lib/masks.ts` (novo)
`maskCpfCnpj`/`maskPhone` — formatação a partir dos dígitos crus (funciona digitando ou colando um valor já formatado).

### 2.4. Onde foi aplicado
Não ficou só na tela de assinatura — uma auditoria dedicada (agente de exploração, não achado por amostragem) levantou **todos os formulários reais** que capturam CPF/telefone/e-mail de cliente:

| Arquivo | Campos |
|---|---|
| `client/src/pages/Assinatura.tsx` | CPF/CNPJ, telefone, e-mail de cobrança |
| `client/src/pages/RegisterSale.tsx` | 4 categorias (vendas, F&I, consignação, pré-vendas) — telefone/CPF/e-mail de cliente |
| `client/src/pages/FichaFinanciamento.tsx` | CPF, telefone, e-mail, telefone de referência pessoal |
| `client/src/pages/admin/AdminSellers.tsx` | Telefone/e-mail de vendedor |
| `client/src/pages/ConsignmentControl.tsx` | Telefone do proprietário (edição) |

`client/src/pages/public/ComercialCadastro.tsx` (cadastro self-service) já tinha máscara/validação própria (`client/src/lib/tenantForm.ts`, `formatPhone`/`isValidEmail`) construída numa fase anterior — não foi duplicado, ficou como estava.

## 3. Rate limiting (visão consolidada)

| Rota | Limite | Chave |
|---|---|---|
| Login (admin/gerente/vendedor/super admin) | 10/15min | loja+IP |
| Cadastro self-service de loja | 5/hora | IP (loja ainda não existe nesse ponto) |
| Webhook `/api/webhooks/widget` | 30/min | loja+IP |
| Webhook `/api/webhooks/asaas` | Generoso, IP only | IP (não é por loja — vem da conta da plataforma) |
| "Esqueci minha senha" (`passwordReset.requestReset`) | 5/hora | loja+IP |
| API geral | 500/min | IP |

## 4. Segurança do Super Admin

- JWT do Super Admin usa um secret **separado** do resto do app (`SUPER_SECRET`, `server/superAdminAuth.ts`) — testado explicitamente (`tenant-security.test.ts`) pra garantir que comprometer um token de loja não dá acesso ao portal master.
- `verifySuperToken`/`signSuperToken` foram extraídos de dentro do `superAdminRouter.ts` pra esse arquivo dedicado, reaproveitados também pelo `platformLogsRouter`/`subscriptionLogsRouter` sem duplicar a lógica de autenticação do portal.

## 5. O que ainda não existe (ver documento 05 pra priorização)

- Revogação de sessão: JWT de 30 dias não pode ser invalidado antes de expirar — redefinir a senha não derruba um token já emitido.
- `moduleRequiredProcedure` só aplicado em Marketing como referência — outros módulos (CRM, Financeiro, Pós-venda, Estoque, IAM) não têm esse enforcement na própria procedure.
- Auditoria completa de SQL raw no fluxo de IA (`ai-attendant.ts`) — hoje seguro transitivamente (todo acesso passa por um `leadId` que já pertence ao tenant certo), mas sem defesa em profundidade.
- Testes de segurança cross-tenant cobrem os pontos críticos (auth, webhooks, Z-API, config de IA, limites de plano, uploads, reset de senha) mas não uma suíte sistemática de "ataque" cobrindo todo o CRM/financeiro.
