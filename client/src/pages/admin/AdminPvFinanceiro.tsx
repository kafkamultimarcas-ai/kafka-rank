import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DollarSign, CheckCircle2, Clock, XCircle, CreditCard,
  Car, User, FileText, ExternalLink
} from "lucide-react";

function formatCurrency(val: string | number | null | undefined) {
  if (!val) return "R$ 0,00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_GASTO: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pendente: { label: "Pendente", color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Clock },
  autorizado: { label: "Autorizado", color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle2 },
  recusado: { label: "Recusado", color: "text-red-400", bg: "bg-red-500/10", icon: XCircle },
  pago: { label: "Pago", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CreditCard },
};

export default function AdminPvFinanceiro() {
  const [filter, setFilter] = useState("todos");
  const resumoQuery = trpc.pvGastos.resumo.useQuery();
  const gastosQuery = trpc.pvGastos.listAll.useQuery({ statusAprovacao: filter !== "todos" ? filter : undefined });
  const statusMutation = trpc.pvGastos.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); gastosQuery.refetch(); resumoQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const resumo = resumoQuery.data || { pendente: 0, autorizado: 0, recusado: 0, pago: 0 };
  const gastos = gastosQuery.data || [];
  const totalGeral = resumo.pendente + resumo.autorizado + resumo.pago;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" />
            Financeiro Pós-Venda
          </h1>
          <p className="text-muted-foreground text-sm">Controle de gastos com aprovação</p>
        </div>

        {/* Resumo financeiro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "pendente", label: "Pendente", value: resumo.pendente, color: "text-yellow-400", border: "border-yellow-500/30" },
            { key: "autorizado", label: "Autorizado", value: resumo.autorizado, color: "text-green-400", border: "border-green-500/30" },
            { key: "pago", label: "Pago", value: resumo.pago, color: "text-emerald-400", border: "border-emerald-500/30" },
            { key: "total", label: "Total Geral", value: totalGeral, color: "text-orange-400", border: "border-orange-500/30" },
          ].map((s) => (
            <Card key={s.key} className={`${s.border} border-l-4`}>
              <CardContent className="p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                <div className={`text-xl font-bold ${s.color}`}>{formatCurrency(s.value)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "todos", label: "Todos" },
            { key: "pendente", label: "Pendentes" },
            { key: "autorizado", label: "Autorizados" },
            { key: "pago", label: "Pagos" },
            { key: "recusado", label: "Recusados" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                filter === f.key ? "bg-orange-600 text-white" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de gastos */}
        <div className="space-y-3">
          {gastos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum gasto encontrado</p>
            </div>
          )}
          {gastos.map((g: any) => {
            const st = STATUS_GASTO[g.statusAprovacao] || STATUS_GASTO.pendente;
            const StIcon = st.icon;
            return (
              <Card key={g.id} className="border-l-4" style={{ borderLeftColor: st.color === "text-yellow-400" ? "#eab308" : st.color === "text-green-400" ? "#22c55e" : st.color === "text-emerald-400" ? "#10b981" : "#ef4444" }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${st.bg} shrink-0`}>
                      <StIcon className={`h-5 w-5 ${st.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color} font-medium`}>{st.label}</span>
                        {g.chamado && (
                          <span className="font-mono text-xs text-muted-foreground">{g.chamado.ticketNumber}</span>
                        )}
                      </div>
                      <p className="font-semibold mt-1">{g.descricao}</p>
                      <div className="text-2xl font-bold text-orange-400 mt-1">{formatCurrency(g.valor)}</div>
                      {g.chamado && (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2 flex-wrap">
                          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{g.chamado.clienteNome}</span>
                          <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" />{g.chamado.carroModelo}</span>
                          {g.chamado.carroPlaca && <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{g.chamado.carroPlaca}</span>}
                        </div>
                      )}
                      {g.autorizadoPor && <p className="text-xs text-muted-foreground mt-1">Autorizado por: {g.autorizadoPor}</p>}
                      {g.fotoNotaUrl && (
                        <a href={g.fotoNotaUrl} target="_blank" rel="noopener" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1">
                          <ExternalLink className="h-3 w-3" /> Ver nota fiscal
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {g.statusAprovacao === "pendente" && (
                        <>
                          <Button size="sm" variant="outline" className="text-xs border-green-500/50 text-green-400 h-7" onClick={() => statusMutation.mutate({ id: g.id, statusAprovacao: "autorizado" })}>
                            Autorizar
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs border-red-500/50 text-red-400 h-7" onClick={() => statusMutation.mutate({ id: g.id, statusAprovacao: "recusado" })}>
                            Recusar
                          </Button>
                        </>
                      )}
                      {g.statusAprovacao === "autorizado" && (
                        <Button size="sm" variant="outline" className="text-xs border-emerald-500/50 text-emerald-400 h-7" onClick={() => statusMutation.mutate({ id: g.id, statusAprovacao: "pago" })}>
                          Marcar Pago
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
