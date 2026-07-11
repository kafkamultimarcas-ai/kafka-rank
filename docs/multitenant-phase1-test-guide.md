# Guia de Teste Local - Multitenant

Este guia prepara o ambiente local para validar a Fase 1 e a base atual do multitenant.

## 1. Pré-requisitos

- Docker Desktop ativo
- Node.js 24+
- `pnpm` instalado

## 2. Subir banco

No diretório do projeto:

```powershell
docker start kafka-mysql
```

Se o container não existir ainda, crie ou restaure a instância MySQL usada pelo projeto antes de continuar.

## 3. Instalar dependências

```powershell
pnpm install
```

Se o Windows bloquear symlink, abra o PowerShell como administrador e rode novamente.

## 4. Aplicar schema

```powershell
pnpm db:push
```

Resultado esperado:

- migrations aplicadas com sucesso
- sem erro de conexão com MySQL

## 5. Popular tenants de teste

```powershell
pnpm seed:demo-tenant
pnpm seed:second-tenant
```

Esses seeds são idempotentes. Eles criam ou atualizam:

- o super admin global (`super@local.test`, username interno `superadmin`)
- tenant `loja-demo`
- tenant `auto-veloz`
- usuários de admin, gerente e vendedores para validação cruzada

## 6. Subir a aplicação

```powershell
pnpm dev
```

## 7. URLs principais

```text
http://localhost:3000/login
http://localhost:3000/super-admin
http://localhost:3000/t/loja-demo/admin
http://localhost:3000/t/auto-veloz/admin
http://localhost:3000/t/loja-demo/crm/admin
http://localhost:3000/t/auto-veloz/crm/admin
```

## 8. Credenciais

### Plataforma

- Super Admin: `super@local.test` / `senha123`

### Loja Demo

- Admin: `admin@loja-demo.local` / `senha123`
- Manager: `gerente@loja-demo.local` / `senha123`
- Vendedor vendas: `vendedor@loja-demo.local` / `senha123`
- Seller com papel gerente: `gerente-painel@loja-demo.local` / `senha123`
- Financeiro: `financeiro@loja-demo.local` / `senha123`
- Pós-venda: `posvenda@loja-demo.local` / `senha123`

### Auto Veloz

- Admin: `admin@auto-veloz.local` / `senha123`
- Manager: `gerente@auto-veloz.local` / `senha123`
- Vendedor vendas: `vendedor@auto-veloz.local` / `senha123`
- Seller com papel gerente: `gerente-painel@auto-veloz.local` / `senha123`

## 9. Roteiro de teste manual

### Login humano oficial

1. Abra `http://localhost:3000/login`
2. Entre com `admin@loja-demo.local` / `senha123`
3. Confirme redirecionamento para a área da loja
4. Faça logout e repita com `admin@auto-veloz.local` / `senha123`
5. Confirme que branding, sessão e navegação pertencem à loja correta

### Redirecionamento por papel

Teste em `http://localhost:3000/login`:

- `vendedor@loja-demo.local` / `senha123` deve ir para `/t/loja-demo/minha-area/:sellerId`
- `gerente-painel@loja-demo.local` / `senha123` deve ir para `/t/loja-demo/gerente`
- `financeiro@loja-demo.local` / `senha123` deve ir para `/t/loja-demo/financeiro`
- `posvenda@loja-demo.local` / `senha123` deve ir para `/t/loja-demo/pos-venda`
- `gerente@loja-demo.local` / `senha123` deve ir para `/t/loja-demo/gerente`

### Isolamento entre lojas

1. Faça login em `loja-demo`
2. Troque manualmente a URL para `/t/auto-veloz/...`
3. Confirme que a sessão não vaza dados da loja anterior
4. Valide que listas, branding e acessos continuam isolados

### Super Admin

1. Abra `http://localhost:3000/login`
2. Entre com `super@local.test` / `senha123`
3. Confira listagem de tenants
4. Edite uma loja
5. Valide slug, telefone, login inicial e dados do plano

### Slug inválido

1. Abra `http://localhost:3000/t/slug-inexistente/login`
2. Confirme redirecionamento para `/login`

## 10. Testes automatizados recomendados

### Verificação rápida do núcleo multitenant

```powershell
pnpm vitest run --fileParallelism=false client/src/lib/tenant.test.ts server/tenant-auth-unified.test.ts server/tenant-coherence.test.ts server/tenant-security.test.ts server/webhooks-tenant.test.ts server/module-gating.test.ts server/tenant-limits.test.ts server/secret-crypto.test.ts server/tenant-health.test.ts server/storage-tenant.test.ts server/zapi-tenant-fallback.test.ts server/seller-results-tenant.test.ts
```

### Tipagem

```powershell
pnpm exec tsc --noEmit
```

### Build de produção

```powershell
pnpm build
```

## 11. Observações

- O caminho oficial de login humano agora é `/login`
- O portal `/super-admin` continua separado
- Algumas rotas legadas com slug ainda existem por compatibilidade, mas o fluxo recomendado para QA deve usar `/login`
