# Refactor de Identidade: `actorType` no lugar de ID negativo com offset

## Análise

O app tem **4 tipos de ator autenticado** — dono via OAuth (tabela `users`), gerente com login por senha (tabela `managers`), vendedor (tabela `sellers`) e admin de CRM (tabela `admins`) — cada um com seu próprio `id` autoincrement independente (um `sellers.id=5` e um `admins.id=5` são registros completamente diferentes). Pra caber os 4 num único campo `ctx.user.id: number` (o tipo `TrpcContext.user` era forçado a ser `User`, o schema da tabela `users`), `server/_core/context.ts` **codificava o tipo do ator no sinal e na faixa de valor do id**:

- OAuth (dono): `id` positivo real
- Gerente: `id = -manager.id`
- Vendedor: `id = -(1000000 + seller.id)`
- Admin de CRM: `id = -(2000000 + admin.id)`

Essa aritmética era refeita, de forma independente, em **6 lugares diferentes**: `server/tenantMiddleware.ts` (`resolveTenantId`), `server/authHelpers.ts` (`getPrivacySellerId`), `server/_core/trpc.ts` (`managerOrAdminProcedure`), `server/routers.ts` (duas rotas), mais uma reimplementação solta em `server/manager-access.test.ts` (não importava de lugar nenhum — só duplicava os mesmos números mágicos).

**Dois bugs reais encontrados** (não só um problema estético):
1. `resolveTenantId` checava `user.id < -1000000` **antes** de checar `loginMethod === "crm_admin"`. Como o id de um admin de CRM é `-(2000000 + admin.id)`, sempre `< -1000000`, **todo admin de CRM caía no branch de vendedor**, tentava achar um seller com id inexistente, e o tenant era resolvido pelo fallback padrão em vez do tenant real — em qualquer rota legada sem slug na URL, com um token JWT antigo sem `tenantId` embutido (tokens mais novos são pegos antes por `assertTenantMatch`).
2. `managers.me` fazia `if (ctx.user.id < 0)` pra decidir "é gerente" — mas todo ator não-OAuth tem id negativo (vendedor e admin de CRM também). Um vendedor-gerente ou admin de CRM que chamasse esse endpoint recebia de volta um objeto "manager" com id fabricado sem sentido.

O próprio projeto já tinha o padrão certo em outro lugar (`password_reset_tokens`: `userType: enum('admin','manager','seller') + userId: int`) — só não tinha sido replicado pro contexto de autenticação.

## Feature

`server/_core/context.ts` ganhou um tipo explícito:

```ts
export type AuthActor = User & {
  actorType: "oauth" | "manager" | "seller" | "crm_admin";
  sellerRole?: "vendedor" | "gerente"; // só quando actorType === "seller"
};
```

`id` passou a ser **sempre o id real** da tabela de origem (nunca mais negativo/com offset); `TrpcContext.user` é `AuthActor | null`. Nenhum código de produção fora dos 6 pontos mapeados dependia do sinal/faixa do `id` (confirmado por varredura ampla antes da mudança) — trocar o `id` de "negativo com offset" pra "real e positivo" foi seguro pro resto do app.

## Plano de Implementação

| Arquivo | Mudança |
|---|---|
| `server/_core/context.ts` | Tipo `AuthActor`; os 3 branches não-OAuth passam a montar `id` real + `actorType` explícito; branch OAuth ganha `actorType: "oauth"` |
| `server/tenantMiddleware.ts` (`resolveTenantId`) | `if/else if` por `user.actorType` em vez de faixa numérica — corrige o bug do admin de CRM |
| `server/authHelpers.ts` (`getPrivacySellerId`) | `ctx: TrpcContext` (era `any`); `ctx.user.actorType !== "seller"` em vez de aritmética; **bônus**: remove uma query ao banco que só existia pra buscar o `sellerRole`, já disponível direto no contexto |
| `server/_core/trpc.ts` (`managerOrAdminProcedure`) | `isManager`/`isCrmAdmin` via `actorType`; `adminProcedure` **não muda** (continua só `role === "admin"`, preserva quem tem acesso hoje) |
| `server/routers.ts` | `sellers.uploadMyPhoto` (~L341) e `managers.me` (~L2735) trocam aritmética por `actorType` — corrige o bug do `managers.me` |
| `server/manager-access.test.ts` | Reescrito do zero: parou de reimplementar a lógica inline, passou a exercitar `resolveTenantId`/`managerOrAdminProcedure`/`getPrivacySellerId` de verdade contra dados reais no banco de teste |

Fora de escopo (documentado, não resolvido aqui): existem **dois conceitos de "gerente" sobrepostos** — um registro na tabela `managers` (login próprio) e um `seller` com `sellerRole = "gerente"` (vendedor promovido). É uma decisão de modelagem de dados maior, não a mesma classe de problema do encoding de ID.

## Resultados

- Typecheck limpo (o discriminated union tipado faz qualquer uso incorreto virar erro de compilação, não bug silencioso).
- Suíte completa de testes: **nenhuma regressão nova** — a lista de falhas pré-existentes (17, todas de outras áreas: credenciais Z-API ausentes no ambiente de dev, snapshots desatualizados) é idêntica à de antes do refactor.
- `manager-access.test.ts` passou de 13 testes que reimplementavam lógica local pra 13 testes que exercitam o código de produção de verdade, incluindo o teste de regressão específico do bug do admin de CRM.
- Testado ao vivo no preview: login como admin de CRM (`/t/loja-demo/crm/admin` carregou com dados reais), gerente (`/t/loja-demo/gerente`, painel correto após o reload — cache do React Query pós-login é um problema à parte, não relacionado a este refactor), vendedor comum (`/t/loja-demo/minha-area/1`) — e confirmado que a proteção de IDOR contra acessar dados de outro vendedor (`/minha-area/999`) continua bloqueando corretamente.

## Como Testar

1. `npx tsc --noEmit -p .`.
2. `npx vitest run server/manager-access.test.ts server/seller-auth.test.ts server/seller-login.test.ts server/tenant-security.test.ts server/tenant-limits.test.ts`.
3. (Opcional, mais lento) `npx vitest run` completo — comparar a lista de falhas com a de antes do refactor pra confirmar que não há regressão nova.
4. No preview, com os usuários de seed (`scripts/seed-demo-tenant.mjs`): logar como `admin-lojademo`, `gerente-lojademo` e `vendedor-lojademo` (senha `senha123` em todos) via `/t/loja-demo/login`, confirmar que cada um cai na área certa.
5. Logado como vendedor comum, tentar acessar `/t/loja-demo/minha-area/<id-de-outro-vendedor>` — deve mostrar "Você não tem permissão para acessar os dados deste colaborador."
