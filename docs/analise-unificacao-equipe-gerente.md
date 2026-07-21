# Análise e Plano de Unificação: Equipe + Gerente

## 1. Situação Atual

O sistema possui **duas entidades separadas** para representar pessoas que acessam o painel administrativo:

| Aspecto | Sellers (Equipe) | Managers (Gerentes) |
|---------|-----------------|-------------------|
| **Tabela** | `sellers` (32 colunas) | `managers` (9 colunas) |
| **Login** | `sellers.login` → cookie `seller_session` | `managers.login` → cookie `manager_session` |
| **actorType** | `"seller"` | `"manager"` |
| **Papel gerencial** | `sellerRole = "gerente"` na tabela sellers | Registro na tabela managers |
| **Permissões** | `manager_permissions` (vinculada a `sellerId`) | Acesso total ao painel (sem granularidade) |
| **Página admin** | `AdminSellers.tsx` (744 linhas) | `AdminGerentes.tsx` (242 linhas) |
| **Painel do gerente** | `GerentePanel.tsx` (usa seller-gerente) | Também usa `GerentePanel.tsx` (com ID negativo) |
| **Funcionalidades** | Foto, nickname, phone, department, leadBlock, ban, pontos, competição | Apenas nome, email, username, senha |

### O Problema

Existem **dois caminhos** para criar um gerente:
1. **Caminho A** — Na tela "Equipe" (`AdminSellers`): criar um vendedor e depois alternar o `sellerRole` para "gerente". Isso dá acesso ao `GerentePanel` e permite configurar permissões granulares por módulo.
2. **Caminho B** — Na tela "Gerentes" (`AdminGerentes`): criar um registro na tabela `managers`. Isso dá acesso total ao painel admin (sem permissões granulares), com ID negativo no sistema.

Isso gera confusão porque:
- O gerente criado pelo Caminho B **não aparece** na listagem de Equipe
- O gerente do Caminho A **não aparece** na listagem de Gerentes
- O `managerMentorRouter` precisa lidar com IDs positivos (seller-gerente) e negativos (manager)
- São **duas telas de cadastro**, **dois fluxos de login**, **dois cookies** diferentes

---

## 2. Análise de Dependências

### 2.1 Backend — Arquivos que referenciam `managers`

| Arquivo | Uso |
|---------|-----|
| `server/_core/context.ts` | Autentica `manager_session` cookie → `actorType: "manager"` |
| `server/_core/trpc.ts` | `managerOrAdminProcedure` aceita `actorType === "manager"` |
| `server/_core/index.ts` | Rate limiter em `managers.login` |
| `server/db.ts` | CRUD: `createManager`, `getManagerByUsername`, `getManagerById`, `listManagers`, `updateManager`, `deleteManager` |
| `server/routers.ts` | Router `managers` (login, logout, me, list, create, update, delete) |
| `server/routers/managerMentorRouter.ts` | `verifyGerente()` — aceita ID negativo (manager) ou positivo (seller-gerente) |
| `server/tenantMiddleware.ts` | Resolve `tenantId` a partir de `managers.tenantId` |
| `server/emailPolicy.ts` | Verifica unicidade de email na tabela managers |
| `server/usernamePolicy.ts` | Verifica unicidade de username na tabela managers |

### 2.2 Frontend — Componentes que usam `managers`

| Componente | Uso |
|-----------|-----|
| `DashboardLayout.tsx` | `trpc.managers.me.useQuery()` para detectar se é manager logado |
| `GerentePanel.tsx` | `trpc.managers.me.useQuery()` + usa `managerId` negativo |
| `AdminGerentes.tsx` | CRUD completo da tabela managers |
| `TrialExpiredGate.tsx` | Verifica `managers.me` para trial |
| `SellerLogin.tsx` | Só usa `sellers.login` (managers logam por outro caminho) |

### 2.3 Funcionalidades exclusivas de cada entidade

**Sellers (que managers NÃO têm):**
- Foto de perfil e foto de competição
- Nickname
- Telefone
- Departamento (vendas, pre_vendas, fei, consignacao, despachante, financeiro, pos_venda)
- Pontos e vendas acumuladas
- Bloqueio/ban de leads
- Token de convite
- Último acesso

**Managers (que sellers-gerente NÃO têm):**
- Nenhuma funcionalidade exclusiva — tudo que o manager faz, o seller-gerente também faz

---

## 3. Conclusão da Análise

> **A tabela `managers` é redundante.** O campo `sellerRole = "gerente"` na tabela `sellers` já cumpre 100% do papel do gerente, com a vantagem de ter permissões granulares (`manager_permissions`), foto, departamento, etc.

A tabela `managers` foi provavelmente criada como um atalho inicial para dar acesso admin a outras pessoas, mas com a evolução do sistema (seller-gerente + permissões), ela se tornou desnecessária e causa duplicidade.

---

## 4. Plano de Implementação — Unificação

### Estratégia: Migrar managers → sellers com `sellerRole = "gerente"`

A ideia é **eliminar a tabela `managers`** e fazer com que todo gerente seja um registro na tabela `sellers` com `sellerRole = "gerente"`. A tela `AdminGerentes` será removida e substituída por um filtro/aba na tela de Equipe.

### Fase 1 — Migração de Dados (banco)

1. Para cada registro em `managers`, criar um registro correspondente em `sellers` com:
   - `name`, `email`, `username`, `passwordHash` → copiados
   - `sellerRole` = `"gerente"`
   - `department` = `"gestao"` (novo departamento)
   - `active` = valor atual do manager
2. Mapear o ID antigo (managers.id) para o novo (sellers.id) para atualizar referências

### Fase 2 — Backend (autenticação e routers)

1. **Remover** o router `managers` (login, logout, me, list, create, update, delete)
2. **Atualizar** `context.ts` para remover parsing de `manager_session` cookie
3. **Atualizar** `trpc.ts` — `managerOrAdminProcedure` não precisa mais checar `actorType === "manager"`
4. **Atualizar** `managerMentorRouter.ts` — remover lógica de ID negativo
5. **Atualizar** `emailPolicy.ts` e `usernamePolicy.ts` — remover checagem na tabela managers
6. **Atualizar** `tenantMiddleware.ts` — remover fallback para managers
7. **Manter** compatibilidade: durante transição, aceitar `manager_session` cookie e redirecionar para novo login

### Fase 3 — Frontend (tela unificada)

1. **Remover** `AdminGerentes.tsx`
2. **Atualizar** `AdminSellers.tsx` para:
   - Adicionar filtro/aba "Gerentes" que mostra sellers com `sellerRole = "gerente"`
   - No formulário de criação, permitir escolher o tipo (Vendedor / Gerente)
   - Manter o botão de alternar role (já existe)
   - Manter o dialog de permissões (já existe)
3. **Atualizar** `DashboardLayout.tsx`:
   - Remover `trpc.managers.me.useQuery()`
   - Remover item "Gerentes" do menu (fica tudo em "Equipe")
   - Detectar gerente apenas por `sellerQuery.data.sellerRole === "gerente"`
4. **Atualizar** `GerentePanel.tsx`:
   - Remover lógica de ID negativo
   - Usar apenas o `sellerId` do seller-gerente logado
5. **Atualizar** `SellerLogin.tsx`:
   - Já funciona (sellers.login já autentica gerentes)
6. **Remover** referências a `managers.login`, `managers.me`, `managers.logout`

### Fase 4 — Limpeza

1. Remover tabela `managers` do schema (manter migration de DROP)
2. Remover funções de db.ts relacionadas a managers
3. Atualizar testes

---

## 5. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Gerentes existentes perdem acesso | Migrar dados ANTES de remover o login antigo |
| Cookie `manager_session` ativo em browsers | Manter parsing temporário que redireciona para /login |
| ID negativo no managerMentorRouter | Migrar para usar apenas IDs positivos (sellers) |
| Testes quebram | Atualizar testes em paralelo |

---

## 6. Estimativa de Esforço

| Fase | Complexidade | Arquivos afetados |
|------|-------------|-------------------|
| Migração de dados | Baixa | 1 script SQL |
| Backend (auth + routers) | Média | 7 arquivos |
| Frontend (tela unificada) | Média | 5 arquivos |
| Limpeza + testes | Baixa | 4 arquivos |
| **Total** | **Média-Alta** | **~17 arquivos** |

---

## 7. Resultado Final Esperado

- **Uma única tela** "Equipe" com abas/filtros: Vendedores, Gerentes, Todos
- **Um único fluxo de login** (`sellers.login`) para vendedores e gerentes
- **Um único cookie** (`seller_session`) para toda a equipe
- **Permissões granulares** para gerentes (já existem via `manager_permissions`)
- **Código mais simples** — eliminação de ~500 linhas de código duplicado
- **UX consistente** — gerente é apenas um "tipo" dentro da equipe
