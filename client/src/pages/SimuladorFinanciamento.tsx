import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Calendar,
  Car,
  DollarSign,
  Info,
  Percent,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import IAMFloatingButton from "@/components/IAMFloatingButton";
import { buildTenantPath, getCurrentTenantSlug } from "@/lib/tenant";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PRAZO_OPTIONS = [12, 18, 24, 36, 48, 60];

export default function SimuladorFinanciamento() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const [, navigate] = useLocation();
  const tenantSlug = getCurrentTenantSlug();
  const { data: config } = trpc.iamConfig.get.useQuery();

  const [valorVeiculo, setValorVeiculo] = useState("");
  const [entrada, setEntrada] = useState("");
  const [prazo, setPrazo] = useState(48);

  const taxaMensal = config?.financingRate ? parseFloat(config.financingRate) : 2.2;

  const resultado = useMemo(() => {
    const veiculo = parseFloat(valorVeiculo.replace(/\D/g, "")) / 100;
    const entradaValue = parseFloat(entrada.replace(/\D/g, "")) / 100;

    if (!veiculo || veiculo <= 0) return null;

    const valorFinanciado = veiculo - (entradaValue || 0);
    if (valorFinanciado <= 0) return null;

    const taxa = taxaMensal / 100;
    // Fórmula Price: PMT = PV * [i * (1+i)^n] / [(1+i)^n - 1]
    const fator = Math.pow(1 + taxa, prazo);
    const parcela = valorFinanciado * (taxa * fator) / (fator - 1);
    const totalPago = parcela * prazo;
    const totalJuros = totalPago - valorFinanciado;

    return {
      valorVeiculo: veiculo,
      entrada: entradaValue || 0,
      valorFinanciado,
      parcela,
      totalPago,
      totalJuros,
      prazo,
      taxa: taxaMensal,
    };
  }, [entrada, prazo, taxaMensal, valorVeiculo]);

  function handleCurrencyInput(value: string, setter: (nextValue: string) => void) {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) {
      setter("");
      return;
    }

    const amount = parseInt(numbers, 10) / 100;
    setter(amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(sellerId ? buildTenantPath(tenantSlug, `/minha-area/${sellerId}`) : buildTenantPath(tenantSlug, "/"))}
            className="text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Simulador de Financiamento</h1>
            <p className="text-[10px] text-white/60">Simulação ilustrativa • Taxa: {taxaMensal}% a.m.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <p className="text-[11px] text-amber-300/80">
            <strong>Simulação ilustrativa.</strong> Os valores podem variar conforme análise de crédito, banco e condições do financiamento.
          </p>
        </div>

        <Card className="border-emerald-500/20">
          <CardContent className="space-y-4 pt-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Car className="h-3.5 w-3.5 text-emerald-400" />
                Valor do Veículo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={valorVeiculo}
                  onChange={(event) => handleCurrencyInput(event.target.value, setValorVeiculo)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-border/50 bg-muted/20 py-3 pl-10 pr-4 text-lg font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                Entrada (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-400">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={entrada}
                  onChange={(event) => handleCurrencyInput(event.target.value, setEntrada)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-border/50 bg-muted/20 py-3 pl-10 pr-4 text-lg font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-violet-400" />
                Prazo (meses)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRAZO_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setPrazo(option)}
                    className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                      prazo === option
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                        : "border border-border/50 bg-muted/30 text-muted-foreground hover:border-emerald-500/30"
                    }`}
                  >
                    {option}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/30 bg-muted/20 p-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Percent className="h-3.5 w-3.5 text-amber-400" />
                Taxa mensal
              </span>
              <span className="text-sm font-bold text-amber-400">{taxaMensal}% a.m.</span>
            </div>
          </CardContent>
        </Card>

        {resultado && (
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardContent className="space-y-3 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400">RESULTADO DA SIMULAÇÃO</h3>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 p-4 text-center">
                <p className="mb-1 text-xs text-muted-foreground">Parcela mensal</p>
                <p className="text-3xl font-black text-emerald-400">{formatCurrency(resultado.parcela)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{resultado.prazo}x parcelas fixas</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-border/20 py-2">
                  <span className="text-xs text-muted-foreground">Valor do veículo</span>
                  <span className="text-sm font-semibold">{formatCurrency(resultado.valorVeiculo)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/20 py-2">
                  <span className="text-xs text-muted-foreground">Entrada</span>
                  <span className="text-sm font-semibold text-blue-400">- {formatCurrency(resultado.entrada)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/20 py-2">
                  <span className="text-xs text-muted-foreground">Valor financiado</span>
                  <span className="text-sm font-bold">{formatCurrency(resultado.valorFinanciado)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/20 py-2">
                  <span className="text-xs text-muted-foreground">Total de juros</span>
                  <span className="text-sm font-semibold text-red-400">{formatCurrency(resultado.totalJuros)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-medium text-muted-foreground">Total a pagar</span>
                  <span className="text-sm font-black text-foreground">{formatCurrency(resultado.totalPago)}</span>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="mb-1 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <Info className="h-3 w-3" /> ARGUMENTO DE VENDA
                </p>
                <p className="text-xs text-emerald-300/80">
                  "Por apenas <strong>{formatCurrency(resultado.parcela)}/mês</strong> em {resultado.prazo}x,
                  {resultado.entrada > 0 ? ` com entrada de ${formatCurrency(resultado.entrada)},` : ""} você sai dirigindo
                  seu carro hoje mesmo! Não perca essa oportunidade!"
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="pb-8 text-center">
          <p className="text-[10px] text-muted-foreground/50">
            Simulação baseada na tabela Price • Taxa ilustrativa de {taxaMensal}% a.m.
          </p>
        </div>
      </div>

      {sellerId && <IAMFloatingButton sellerId={parseInt(sellerId, 10)} />}
    </div>
  );
}
