# Currency Mask Application Plan

## Strategy
The existing approach in most files is "format on blur" (user types freely, onBlur formats to pt-BR with 2 decimals).
The best approach for consistency is to use the SimuladorFinanciamento pattern: 
- inputMode="numeric"
- Strip all non-digits on change
- Format as cents/100 with 2 fixed decimals in real-time

We'll create a reusable `MoneyInput` component that:
1. Accepts only numbers
2. Shows formatted value with 2 decimal places in real-time (as user types)
3. Stores raw cents as string
4. Has a "R$" prefix

## Shared Component: client/src/components/ui/currency-input.tsx
Already updated to use cents-based approach with 2 fixed decimals.

## Files to Update (monetary value fields only, NOT quantity/count fields):

### 1. AdminApprovals.tsx (lines 710, 731)
- value field: `editForm.value` - currently strips non-digits manually
- transferValue field: `editForm.transferValue` - same pattern
- Both store raw integer values already, just need proper formatting display

### 2. AdminPosVenda.tsx (line 797)
- valor field: uses formatCurrencyPV on blur
- Replace with real-time mask

### 3. AdminBonusVehicles.tsx (line 253)
- bonusAmount field: plain text input
- Replace with currency mask

### 4. AdminGoals.tsx (lines 884, 1046)
- bonusValue: type="number" - monetary bonus
- editBonusValue: type="number" - edit monetary bonus

### 5. AdminFei.tsx (line 535)
- editForm.financedValue: text with inputMode="decimal"
- Replace with currency mask

### 6. ConsignmentControl.tsx (line 653)
- editRecord.costValueDisplay: manual format on blur
- Replace with real-time mask

### 7. FichaFinanciamento.tsx (lines 294, 400)
- valorFinanciado: type="number" - valor financiado
- renda: plain text - renda mensal

### 8. MesaCredito.tsx (lines 419, 537)
- editForm.valorFinanciado: type="number"
- bancoValorParcela: type="number" - valor da parcela

### 9. MinhaArea.tsx (lines 2339, 2739)
- editConsignRecord.costValueDisplay: manual format on blur
- novoItemValor: plain text input for item value

### 10. CrmAdminDashboard.tsx (line 921)
- form.amount: type="number" step="0.01"

### 11. CrmFinancial.tsx (line 370)
- amount: type="number" step="0.01"

### 12. SimuladorFinanciamento.tsx (lines 117, 135)
- Already using handleCurrencyInput with proper mask - OK, no change needed

### 13. RegisterSale.tsx
- Already has local CurrencyInput with formatCurrency on blur - needs update to real-time

### 14. AdminSales.tsx
- Already has local CurrencyInput with formatCurrency on blur - needs update to real-time

### 15. AdminFinanceiro.tsx (line 653/796)
- FinCurrencyInput: formatCurrencyVal on blur - needs update to real-time

### 16. AdminVehicleCosts.tsx (line 169)
- formatCurrencyInput on blur - needs update to real-time

### 17. VehicleDetail.tsx (lines 127, 198)
- formatCurrencyInput on blur - needs update to real-time

## NOT monetary (skip):
- SuperAdmin.tsx: maxSellers, maxAdmins (quantity)
- AdminGoals.tsx: targetValue, editValue, editTarget (quantity/count)
- AdminCompetitions.tsx: goalTarget, pointsPerSale (quantity)
- RankingFeirao.tsx: newEditionNumber (edition number)
- MesaCredito.tsx: bancoQtdParcelas (quantity), bancoTaxa (percentage)
- MinhaArea.tsx: novoItemQtd (quantity)
- AdminFinanceiro.tsx: txRecurrenceMonths (quantity)
- CrmAdminDashboard.tsx: campFilterInactiveDays, campMaxRecipients, campIntervalSec, campMaxPerDay (config numbers)
