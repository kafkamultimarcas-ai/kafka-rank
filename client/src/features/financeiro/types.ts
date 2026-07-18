import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type Seller = RouterOutputs["sellers"]["list"][number];
export type SellerSession = RouterOutputs["sellers"]["me"];
export type FinCategory = RouterOutputs["finCategories"]["list"][number];
export type FinTransactionListResponse = RouterOutputs["finTransactions"]["list"];
export type FinTransaction = FinTransactionListResponse extends { items: infer T }
  ? T extends Array<infer Item>
    ? Item
    : never
  : never;
export type FinancialAlerts = RouterOutputs["finTransactions"]["alerts"];
export type FinancialAlertItem = NonNullable<FinancialAlerts["overdue"]>[number];
export type FuelRecord = RouterOutputs["fuel"]["list"][number];
export type FuelDashboard = RouterOutputs["fuel"]["dashboard"];
export type InventoryVehicle = RouterOutputs["crmInventory"]["list"][number];
export type PosVendaChamado = RouterOutputs["pvChamados"]["list"][number];
export type SupplierListResponse = RouterOutputs["suppliers"]["list"];
export type Supplier = SupplierListResponse["items"][number];
export type ParseAudioContaResult = {
  type?: "payable" | "receivable" | null;
  description?: string | null;
  amount?: number | string | null;
  supplier?: string | null;
  category?: string | null;
  dueDate?: string | null;
  notes?: string | null;
};
export type ParseAudioGasolinaResult = {
  vehicleModel?: string | null;
  vehiclePlate?: string | null;
  fuelType?: "gasolina" | "etanol" | "diesel" | "gnv" | null;
  liters?: number | string | null;
  pricePerLiter?: number | string | null;
  totalCost?: number | string | null;
  gasStation?: string | null;
  odometer?: number | string | null;
  notes?: string | null;
};
export type ParseAudioResult = ParseAudioContaResult & ParseAudioGasolinaResult;
