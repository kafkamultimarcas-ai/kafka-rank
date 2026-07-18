import { Banknote, Edit2, Loader2, Receipt, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupplierCombobox } from "@/components/SupplierCombobox";
import { VehicleCombobox } from "@/components/VehicleCombobox";
import { AudioLauncher } from "@/features/financeiro/components/AudioLauncher";
import type { AudioLauncherContext } from "@/features/financeiro/components/AudioLauncher";
import type { ContaFormType } from "@/features/financeiro/contas/useContasState";
import { maskCurrencyInput } from "@/features/financeiro/utils/form";
import type { FinCategory, FinTransaction, ParseAudioResult, Seller } from "@/features/financeiro/types";

interface ContaFormProps {
  categories: FinCategory[];
  sellersList: Seller[];
  sellerNameById: Record<number, string>;
  editingTx: FinTransaction | null;
  txType: ContaFormType;
  setTxType: (value: ContaFormType) => void;
  txDescription: string;
  setTxDescription: (value: string) => void;
  txAmount: string;
  setTxAmount: (value: string) => void;
  txDueDate: string;
  setTxDueDate: (value: string) => void;
  txSupplier: string;
  setTxSupplier: (value: string) => void;
  txVehicle: string;
  setTxVehicle: (value: string) => void;
  txNotes: string;
  setTxNotes: (value: string) => void;
  txCategoryId: number | null;
  setTxCategoryId: (value: number | null) => void;
  txNeedsApproval: boolean;
  setTxNeedsApproval: (value: boolean) => void;
  txRecurrence: string;
  setTxRecurrence: (value: string) => void;
  txRecurrenceMonths: number;
  setTxRecurrenceMonths: (value: number) => void;
  txIsVale: boolean;
  setTxIsVale: (value: boolean) => void;
  txSellerId: number | null;
  setTxSellerId: (value: number | null) => void;
  onAudioResult: (parsed: ParseAudioResult) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ContaForm(props: ContaFormProps) {
  const {
    categories,
    sellersList,
    sellerNameById,
    editingTx,
    txType,
    setTxType,
    txDescription,
    setTxDescription,
    txAmount,
    setTxAmount,
    txDueDate,
    setTxDueDate,
    txSupplier,
    setTxSupplier,
    txVehicle,
    setTxVehicle,
    txNotes,
    setTxNotes,
    txCategoryId,
    setTxCategoryId,
    txNeedsApproval,
    setTxNeedsApproval,
    txRecurrence,
    setTxRecurrence,
    txRecurrenceMonths,
    setTxRecurrenceMonths,
    txIsVale,
    setTxIsVale,
    txSellerId,
    setTxSellerId,
    onAudioResult,
    onSubmit,
    isSubmitting,
  } = props;

  const audioContext: AudioLauncherContext = txType === "receivable" ? "conta_receber" : "conta_pagar";

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-500">Tipo *</label>
          <select
            value={txType}
            onChange={(event) => setTxType(event.target.value as ContaFormType)}
            className="h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white"
          >
            <option value="payable">A Pagar</option>
            <option value="receivable">A Receber</option>
            <option value="paid">Paga</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-500">Categoria</label>
          <select
            value={txCategoryId?.toString() || ""}
            onChange={(event) => setTxCategoryId(event.target.value ? Number(event.target.value) : null)}
            className="h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white"
          >
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {editingTx && txIsVale && txSellerId && (
        <div className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3">
          <Banknote className="h-4 w-4 text-orange-400" />
          <p className="text-xs font-bold text-orange-300">
            Vale de {sellerNameById[txSellerId] || "colaborador"}
          </p>
        </div>
      )}

      {txType === "payable" && !editingTx && (
        <div className="space-y-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-orange-400" />
              <div>
                <p className="text-xs font-bold text-orange-300">Vale / Adiantamento</p>
                <p className="text-[10px] text-gray-500">Reflete no Financeiro dos Vendedores</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextValue = !txIsVale;
                setTxIsVale(nextValue);
                if (!nextValue) {
                  setTxSellerId(null);
                }
              }}
              className={`relative h-6 w-11 rounded-full transition-all ${txIsVale ? "bg-orange-500" : "bg-gray-700"}`}
            >
              <div className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${txIsVale ? "left-5.5" : "left-0.5"}`} />
            </button>
          </div>

          {txIsVale && (
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Colaborador *</label>
              <select
                value={txSellerId?.toString() || ""}
                onChange={(event) => setTxSellerId(event.target.value ? Number(event.target.value) : null)}
                className="h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white"
              >
                <option value="">Selecione o colaborador...</option>
                {sellersList.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.nickname || seller.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold uppercase text-gray-500">Descrição *</label>
        <Input
          value={txDescription}
          onChange={(event) => setTxDescription(event.target.value)}
          placeholder={txIsVale ? "Ex: vale de julho, adiantamento..." : "Ex: boleto energia, aluguel da loja..."}
          className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-500">Valor (R$) *</label>
          <Input
            value={txAmount}
            onChange={(event) => setTxAmount(maskCurrencyInput(event.target.value))}
            inputMode="numeric"
            placeholder="0,00"
            className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-500">Vencimento *</label>
          <Input
            type="date"
            value={txDueDate}
            onChange={(event) => setTxDueDate(event.target.value)}
            className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-gray-500">Fornecedor</label>
        <SupplierCombobox value={txSupplier} onChange={setTxSupplier} />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase text-gray-500">Veículo</label>
        <VehicleCombobox value={txVehicle} onChange={setTxVehicle} />
      </div>

      {!editingTx && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500">Recorrência</label>
            <select
              value={txRecurrence}
              onChange={(event) => setTxRecurrence(event.target.value)}
              className="h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white"
            >
              <option value="none">Sem recorrência</option>
              <option value="monthly">Mensal</option>
              <option value="weekly">Semanal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          {txRecurrence === "monthly" && (
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500">Qtd. de meses *</label>
              <Input
                type="number"
                min={1}
                max={60}
                value={txRecurrenceMonths}
                onChange={(event) => setTxRecurrenceMonths(Math.max(1, Math.min(60, Number(event.target.value) || 1)))}
                inputMode="numeric"
                className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
              />
              <p className="mt-1 text-[10px] text-gray-500">Gera 1 conta por mês.</p>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="text-[10px] font-bold uppercase text-gray-500">Observações</label>
        <Input
          value={txNotes}
          onChange={(event) => setTxNotes(event.target.value)}
          placeholder="Notas adicionais..."
          className="h-10 border-gray-700 bg-gray-800 text-sm text-white"
        />
      </div>

      {!editingTx && (
        <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-400" />
            <div>
              <p className="text-xs font-bold text-purple-300">Precisa de Autorização</p>
              <p className="text-[10px] text-gray-500">Envia notificação para o gestor aprovar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTxNeedsApproval(!txNeedsApproval)}
            className={`relative h-6 w-11 rounded-full transition-all ${txNeedsApproval ? "bg-purple-500" : "bg-gray-700"}`}
          >
            <div className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${txNeedsApproval ? "left-5.5" : "left-0.5"}`} />
          </button>
        </div>
      )}

      {!editingTx && <AudioLauncher onResult={onAudioResult} context={audioContext} />}

      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="h-11 w-full bg-emerald-600 font-bold text-white hover:bg-emerald-500"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : editingTx ? (
          <>
            <Edit2 className="mr-2 h-4 w-4" /> Salvar Alterações
          </>
        ) : (
          <>
            <Receipt className="mr-2 h-4 w-4" /> Lançar Conta
          </>
        )}
      </Button>
    </>
  );
}
