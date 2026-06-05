import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { DollarSign, Users, TrendingUp } from "lucide-react";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function FinanceiroVendedores() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = trpc.sellerResults.financialOverview.useQuery({ month, year });

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro Vendedores</h1>
            <p className="text-sm text-muted-foreground">Resumo de comissões, bônus e vales por vendedor</p>
          </div>
          <div className="flex gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
              {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : data ? (
          <>
            {/* Totais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Total a Pagar</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(data.totals.totalToPay)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Total Vendas</p>
                <p className="text-xl font-bold text-foreground">{data.totals.totalSales}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Total Vales</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(data.totals.totalAdvances)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">Total Bônus</p>
                <p className="text-xl font-bold text-yellow-400">{formatCurrency(data.totals.totalBonuses)}</p>
              </div>
            </div>

            {/* Tabela por vendedor */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">Vendedor</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Vendas</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Ajuda Custo</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Comissão</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Bônus Meta</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Bônus Carros</th>
                      <th className="text-right p-3 font-medium text-muted-foreground text-red-400">Vales</th>
                      <th className="text-right p-3 font-medium text-emerald-400">Líquido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sellers.map((s: any) => (
                      <tr key={s.sellerId} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 font-medium text-foreground">{s.name}</td>
                        <td className="p-3 text-center font-bold">{s.salesCount}</td>
                        <td className="p-3 text-right">{formatCurrency(s.helpAllowance)}</td>
                        <td className="p-3 text-right">{formatCurrency(s.totalCommission)}</td>
                        <td className="p-3 text-right text-yellow-400">{s.commissionBonus > 0 ? formatCurrency(s.commissionBonus) : '-'}</td>
                        <td className="p-3 text-right text-yellow-400">{s.totalBonuses > 0 ? formatCurrency(s.totalBonuses) : '-'}</td>
                        <td className="p-3 text-right text-red-400">{s.totalAdvances > 0 ? `-${formatCurrency(s.totalAdvances)}` : '-'}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{formatCurrency(s.netEarnings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
