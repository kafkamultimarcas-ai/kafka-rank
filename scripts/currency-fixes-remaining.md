# Currency Mask Fixes Remaining

## New Component: client/src/components/ui/money-input.tsx
- MoneyInput: stores formatted pt-BR string ("50.000,00"), accepts only digits, real-time mask
- Compatible with existing parseCurrencyToNumber functions

## Files to Update (replace local CurrencyInput/FinCurrencyInput or plain inputs with MoneyInput):

### 1. RegisterSale.tsx (lines 33-47)
- Remove local CurrencyInput function (lines 33-47)
- Import MoneyInput from "@/components/ui/money-input"
- Replace all `<CurrencyInput` with `<MoneyInput` (lines 796, 846, 973, 980, 1125)
- Keep formatCurrency and parseCurrencyToNumber (still used in submit)

### 2. AdminSales.tsx (lines 17-28)
- Remove local formatCurrency, parseCurrencyToNumber, CurrencyInput
- Import MoneyInput
- Replace `<CurrencyInput` with `<MoneyInput` (lines 220, 262)

### 3. AdminFinanceiro.tsx (lines 14-25)
- Remove local formatCurrencyVal, parseCurrencyStr, FinCurrencyInput
- Import MoneyInput
- Replace `<FinCurrencyInput` with `<MoneyInput` (lines 653, 796)
- Update parseCurrencyStr usage to work with formatted string

### 4. AdminApprovals.tsx (lines 710, 731)
- Import MoneyInput
- Replace `<Input value={editForm.value}... replace(/[^0-9]/g, '')` with MoneyInput
- Update submit: parseInt(editForm.value) → parseCurrencyToNumber(editForm.value)

### 5. AdminPosVenda.tsx (line 797)
- Remove local formatCurrencyPV (line 11-14)
- Import MoneyInput
- Replace `<Input ... onBlur={formatCurrencyPV}` with `<MoneyInput`

### 6. AdminBonusVehicles.tsx (line 253)
- Import MoneyInput
- Replace `<Input value={bonusAmount}` with `<MoneyInput`

### 7. AdminGoals.tsx (lines 884, 1046)
- Import MoneyInput
- Replace `<Input type="number" value={bonusValue}` with `<MoneyInput`
- Replace `<Input type="number" value={editBonusValue}` with `<MoneyInput`

### 8. AdminFei.tsx (line 535)
- Import MoneyInput
- Replace `<Input value={editForm.financedValue}` with `<MoneyInput`

### 9. ConsignmentControl.tsx (line 653)
- Import MoneyInput
- Replace the manual onBlur format with `<MoneyInput`

### 10. FichaFinanciamento.tsx (lines 294, 400)
- Import MoneyInput
- Replace `<Input type="number" value={valorFinanciado}` with `<MoneyInput`
- Replace `<Input value={renda}` with `<MoneyInput`

### 11. MesaCredito.tsx (lines 419, 537)
- Import MoneyInput
- Replace `<Input type="number" value={editForm.valorFinanciado}` with `<MoneyInput`
- Replace `<Input value={bancoValorParcela} type="number"` with `<MoneyInput`

### 12. MinhaArea.tsx (lines 2339, 2739)
- Import MoneyInput
- Replace costValueDisplay manual onBlur with `<MoneyInput`
- Replace novoItemValor plain input with `<MoneyInput`

### 13. CrmAdminDashboard.tsx (line 921)
- Import MoneyInput
- Replace `<Input type="number" value={form.amount}` with `<MoneyInput`

### 14. CrmFinancial.tsx (line 370)
- Import MoneyInput
- Replace `<Input type="number" value={amount}` with `<MoneyInput`

### 15. AdminVehicleCosts.tsx (line 169)
- Remove local parseCurrencyInput, formatCurrencyInput, currencyToNumber
- Import MoneyInput
- Replace the manual onBlur format with `<MoneyInput`

### 16. VehicleDetail.tsx
- Remove local formatCurrencyInput
- Import MoneyInput
- Replace all onBlur formatCurrencyInput patterns with `<MoneyInput`

## parseCurrencyToNumber helper (keep in files that need it):
```ts
function parseCurrencyToNumber(val: string): number {
  const cleaned = val.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  return parseFloat(cleaned) || 0;
}
```

## NOTE: InventoryVehicleForm.tsx already uses the cents-based CurrencyInput correctly - DO NOT change.
## NOTE: SimuladorFinanciamento.tsx already has proper real-time mask - DO NOT change.
