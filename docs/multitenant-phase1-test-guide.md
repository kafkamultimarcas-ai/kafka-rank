# Multitenant Phase 1 Test Guide

## Seed demo

Run:

```powershell
pnpm seed:demo-tenant
```

This seed is idempotent and creates or updates:

- `superadmin`
- tenant `loja-demo`
- CRM admin for the tenant
- seller users for `vendas`, `financeiro`, `pos_venda`
- one seller with `sellerRole = gerente`
- one record in `managers`

## URLs

```text
http://localhost:3000/super-admin
http://localhost:3000/t/loja-demo/login
http://localhost:3000/t/loja-demo/crm/admin/login
http://localhost:3000/t/loja-demo/crm/admin
http://localhost:3000/t/loja-demo/gerente
http://localhost:3000/t/loja-demo/financeiro
http://localhost:3000/t/loja-demo/pos-venda
```

## Credentials

- Super admin: `superadmin` / `super123`
- CRM admin: `admin-lojademo` / `admin123`
- Seller vendas: `vendedor-lojademo` / `seller123`
- Seller gerente: `gerente-seller-lojademo` / `gerente123`
- Seller financeiro: `financeiro-lojademo` / `finance123`
- Seller pós-venda: `posvenda-lojademo` / `pos12345`
- Manager table: `gerente-lojademo` / `gerente123`

## Test steps

1. Run the database and migrations:

```powershell
pnpm db:push
```

2. Seed the tenant:

```powershell
pnpm seed:demo-tenant
```

3. Start the app:

```powershell
pnpm dev
```

4. Validate tenant resolution:

- Open `http://localhost:3000/t/loja-demo/login`
- Confirm the page loads with the tenant branding/name

5. Validate CRM admin tenant login:

- Open `http://localhost:3000/t/loja-demo/crm/admin/login`
- Login with `admin-lojademo` / `admin123`
- Confirm redirect to `/t/loja-demo/crm/admin`

6. Validate seller route redirects:

- Login with `vendedor-lojademo` / `seller123`
- Expect redirect to `/t/loja-demo/minha-area/:sellerId`

- Login with `gerente-seller-lojademo` / `gerente123`
- Expect redirect to `/t/loja-demo/gerente`

- Login with `financeiro-lojademo` / `finance123`
- Expect redirect to `/t/loja-demo/financeiro`

- Login with `posvenda-lojademo` / `pos12345`
- Expect redirect to `/t/loja-demo/pos-venda`

7. Validate invalid tenant slug:

- Open `http://localhost:3000/t/slug-inexistente/login`
- Expect “Loja não encontrada”
