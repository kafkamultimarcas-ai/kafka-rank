-- Integração Vale do Colaborador entre o módulo Financeiro (contas) e o Financeiro dos Vendedores.
-- Quando o Financeiro lança uma conta do tipo "Vale" para um colaborador, ela passa a gerar
-- também um registro em seller_advances, vinculado pela conta de origem.

ALTER TABLE `fin_transactions`
  ADD COLUMN `sellerId` int;
--> statement-breakpoint
ALTER TABLE `seller_advances`
  ADD COLUMN `finTransactionId` int;
