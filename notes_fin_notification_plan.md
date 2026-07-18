# Financial Notification Implementation Plan

## Key Files:
- `client/src/features/financeiro/components/FinanceiroHeader.tsx` - Add NotificationCenter
- `client/src/pages/Financeiro.tsx` - Add deep-link support (read URL params, pass to ContasTab)
- `client/src/features/financeiro/tabs/ContasTab.tsx` - Accept initialContaId prop
- `client/src/features/financeiro/contas/useContasState.ts` - Accept initialExpandedId param
- `server/routers.ts` - sellers.login (line ~155) - hook notification generation after login
- `server/db.ts` - createNotification function
- `server/finDb.ts` - getFinancialAlerts() function
- `server/tenantUrls.ts` - buildCurrentTenantPath() for actionUrl
- `client/src/components/NotificationCenter.tsx` - Add bill_due/bill_overdue types

## Implementation Steps:

### 1. FinanceiroHeader - Add NotificationCenter
- Import NotificationCenter
- Add it between brand and logout button
- Pass sellerId from sellerSession

### 2. Deep-link support in Financeiro.tsx
- Read URL search params (?tab=contas&contaId=123)
- If tab param present, set mainTab accordingly
- If contaId present, pass to ContasTab as initialContaId

### 3. ContasTab - Accept initialContaId prop
- Add prop interface: { initialContaId?: number }
- Pass to useContasState

### 4. useContasState - Accept initialExpandedId
- Add param: initialExpandedId?: number
- Use it as initial value for expandedId state

### 5. Backend - Generate notifications on login
- In sellers.login mutation (line ~188), after successful login:
  - If seller.department === "financeiro"
  - Call getFinancialAlerts()
  - For each overdue + dueToday bill, create notification with:
    - type: "bill_overdue" or "bill_due_today"
    - sellerId: seller.id
    - targetType: "seller"
    - actionUrl: buildCurrentTenantPath('/financeiro?tab=contas&contaId=X')
  - Deduplicate: don't create if same bill notification already exists today

### 6. NotificationCenter - Add icon/color for bill types
- getNotifIcon: bill_due_today → "💰", bill_overdue → "🚨💰"
- getNotifColor: bill_due_today → "border-l-yellow-500", bill_overdue → "border-l-red-500"

## Key Data:
- notifications table: id, sellerId, targetType, type, title, message, read, actionUrl, createdAt, tenantId
- createNotification(data: InsertNotification) in server/db.ts
- getFinancialAlerts() in server/finDb.ts returns { overdue[], dueToday[], dueTomorrow[], dueThisWeek[] }
- sellers.me returns: { id, name, nickname, photoUrl, department, sellerRole }
- NotificationCenter props: { sellerId?: number, isAdmin?: boolean }
- buildCurrentTenantPath(pathname) in server/tenantUrls.ts
