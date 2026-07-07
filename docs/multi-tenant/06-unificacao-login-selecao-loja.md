# Unificação de Login + Seleção de Loja

## Análise

Levantamento (via exploração direta do código, não amostragem) encontrou **5 telas de login funcionalmente independentes** no app, cada uma com seu próprio formulário de usuário/senha:

1. `client/src/pages/SellerLogin.tsx` (`/t/:slug/login`) — usa `tenantAuth.login` (admin → gerente → vendedor). **Correta**, é a que devia ser a única por loja.
2. `client/src/components/AccessGate.tsx` — wrapper global (`App.tsx`) que, em qualquer rota legada sem `/t/:slug` (Home, `/registrar-venda`, etc.), mostrava seu próprio formulário com `sellers.login` direto.
3. `client/src/pages/crm/CrmAdminLogin.tsx` (`/crm/admin/login`) — com slug já redirecionava certo, mas sem slug mostrava formulário próprio com `adminAuth.login`.
4. `ManagerLoginScreen` dentro de `client/src/components/DashboardLayout.tsx` (rota `/admin` sem slug) — formulário próprio com `managers.login`.
5. `client/src/pages/SuperAdmin.tsx` (`/super-admin`) — `superAdmin.login`. **Correta**, é o único ponto de entrada do dono da plataforma.

Além disso, o modal "Entrar na sua loja" na home comercial (`ComercialHome.tsx`) pedia pro visitante **digitar de cabeça** o nome/slug da loja, sem validar se ela existia — erro de digitação caía numa tela de "Loja não encontrada".

Pedido: reduzir tudo isso a exatamente dois pontos de entrada — `/super-admin` e `/t/:slug/login` — e, em qualquer lugar que hoje pergunta "qual é sua loja", sempre mostrar uma lista real de lojas (Select pesquisável) em vez de texto livre ou formulário de senha solto.

## Feature

**`client/src/components/StoreLoginPicker.tsx`** (novo componente compartilhado):
- Consome `trpc.superAdmin.listActiveTenants` (já existia, comentário no código já dizia "for login selector").
- Combobox pesquisável (Popover + Command do shadcn/cmdk, não um `<select>` simples) — digitar filtra a lista de lojas em tempo real.
- Botão "Continuar" navega para `getTenantLoginPath(slug)` (`/t/<slug>/login`).
- Usado em 5 lugares: modal da home comercial, `/login-vendedor` (SellerLogin sem slug), `AccessGate` (fallback quando não há sessão nem `?invite=`), `CrmAdminLogin` sem slug, `ManagerLoginScreen` sem slug.

Componentes shadcn novos criados como pré-requisito (não existiam no projeto): `client/src/components/ui/popover.tsx`, `client/src/components/ui/command.tsx`.

## Plano de Implementação

| Arquivo | Mudança |
|---|---|
| `ComercialHome.tsx` (`LoginPrompt`) | Input de texto livre → `<StoreLoginPicker />` |
| `SellerLogin.tsx` (bloco sem `tenantSlug`) | Idem — vira a página canônica de "escolha sua loja" (`getTenantLoginPath(null)` sempre aponta pra cá) |
| `AccessGate.tsx` | Removido `sellers.login` e o formulário de usuário/senha do modo `"login"`; adicionado `/login-vendedor` a `BYPASS_ROUTES` (sem isso o próprio AccessGate interceptava a rota antes do `SellerLogin` renderizar); fluxo de "Primeiro acesso" via `?invite=` mantido intacto (não é login, é convite) |
| `CrmAdminLogin.tsx` | Bloco sem slug (só alcançável quando o `useEffect` de redirect não dispara) trocado por `<StoreLoginPicker />`; `loginMutation`/`changePasswordMutation` removidos (ficaram mortos) |
| `DashboardLayout.tsx` (`ManagerLoginScreen`) | Formulário `managers.login` removido; botão "Login como Proprietário (Manus)" (OAuth do dono, sistema à parte) mantido |

## Resultados

- Typecheck limpo, sem regressão nos testes existentes.
- Testado ao vivo no preview: modal da home comercial listando as 4 lojas reais de teste (Auto Veloz Motors, Kafka multimarcas, Loja de SP, Loja Demo Multi), busca por texto filtrando corretamente, seleção + Continuar navegando pro `/t/<slug>/login` certo.
- `/login-vendedor` mostra o mesmo picker (antes mostrava um input de slug sem validação).
- Rota legada sem sessão (ex: `/registrar-venda`) mostra o picker em vez do formulário de usuário/senha antigo do `AccessGate`.
- `/crm/admin/login` e `/admin` sem sessão mostram o picker; `/t/:slug/admin/login` continua redirecionando direto pro login oficial da loja (comportamento preexistente, sem regressão).
- Fluxo de "Primeiro acesso" com `?invite=` continua funcionando sem alteração.

## Como Testar

1. `npx tsc --noEmit -p .`.
2. Abrir `/comercial`, clicar em "Já tenho uma loja" — deve aparecer um combobox pesquisável com lojas reais, não um campo de texto livre.
3. Digitar parte do nome de uma loja no combobox e confirmar que a lista filtra.
4. Selecionar uma loja + Continuar — deve navegar pra `/t/<slug>/login`.
5. Acessar `/login-vendedor` diretamente — mesmo picker.
6. Deslogado, acessar uma rota legada sem slug (`/`, `/registrar-venda`) — `AccessGate` deve mostrar o picker, não um formulário de senha.
7. Acessar `/crm/admin/login` e `/admin` sem sessão — picker em ambos; `/t/<slug>/admin/login` deve redirecionar direto pro login da loja.
