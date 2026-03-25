import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import {
  DollarSign, Calculator, ArrowLeft, TrendingUp,
  Calendar, Percent, Car, AlertTriangle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import IAMFloatingButton from "@/components/IAMFloatingButton";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PRAZO_OPTIONS = [12, 18, 24, 36, 48, 60];

export default function SimuladorFinanciamento() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const [, navigate] = useLocation();
  const { data: config } = trpc.iamConfig.get.useQuery();

  const [valorVeiculo, setValorVeiculo] = useState("");
  const [entrada, setEntrada] = useState("");
  const [prazo, setPrazo] = useState(48);

  const taxaMensal = config?.financingRate ? parseFloat(config.financingRate) : 2.20;

  const resultado = useMemo(() => {
    const veiculo = parseFloat(valorVeiculo.replace(/\D/g, "")) / 100;
    const ent = parseFloat(entrada.replace(/\D/g, "")) / 100;

    if (!veiculo || veiculo <= 0) return null;
    const valorFinanciado = veiculo - (ent || 0);
    if (valorFinanciado <= 0) return null;

    const taxa = taxaMensal / 100;
    // Fórmula Price: PMT = PV * [i * (1+i)^n] / [(1+i)^n - 1]
    const fator = Math.pow(1 + taxa, prazo);
    const parcela = valorFinanciado * (taxa * fator) / (fator - 1);
    const totalPago = parcela * prazo;
    const totalJuros = totalPago - valorFinanciado;

    return {
      valorVeiculo: veiculo,
      entrada: ent || 0,
      valorFinanciado,
      parcela,
      totalPago,
      totalJuros,
      prazo,
      taxa: taxaMensal,
    };
  }, [valorVeiculo, entrada, prazo, taxaMensal]);

  function handleCurrencyInput(value: string, setter: (v: string) => void) {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) { setter(""); return; }
    const num = parseInt(numbers) / 100;
    setter(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(sellerId ? `/minha-area/${sellerId}` : "/")} className="text-white/80 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Simulador de Financiamento</h1>
            <p className="text-[10px] text-white/60">Simulação ilustrativa • Taxa: {taxaMensal}% a.m.</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Aviso */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-300/80">
            <strong>Simulação ilustrativa.</strong> Os valores podem variar conforme análise de crédito, banco e condições do financiamento.
          </p>
        </div>

        {/* Valor do Veículo */}
        <Card className="border-emerald-500/20">
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <Car className="h-3.5 w-3.5 text-emerald-400" />
                Valor do Veículo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-emerald-400 font-bold">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={valorVeiculo}
                  onChange={e => handleCurrencyInput(e.target.value, setValorVeiculo)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/50 bg-muted/20 text-lg font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                Entrada (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-blue-400 font-bold">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={entrada}
                  onChange={e => handleCurrencyInput(e.target.value, setEntrada)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/50 bg-muted/20 text-lg font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            {/* Prazo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                <Calendar className="h-3.5 w-3.5 text-violet-400" />
                Prazo (meses)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRAZO_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => setPrazo(p)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                      prazo === p
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                        : "bg-muted/30 text-muted-foreground border border-border/50 hover:border-emerald-500/30"
                    }`}
                  >
                    {p}x
                  </button>
                ))}
              </div>
            </div>

            {/* Taxa */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-amber-400" />
                Taxa mensal
              </span>
              <span className="text-sm font-bold text-amber-400">{taxaMensal}% a.m.</span>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {resultado && (
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400">RESULTADO DA SIMULAÇÃO</h3>
              </div>

              {/* Parcela destaque */}
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30">
                <p className="text-xs text-muted-foreground mb-1">Parcela mensal</p>
                <p className="text-3xl font-black text-emerald-400">{formatCurrency(resultado.parcela)}</p>
                <p className="text-xs text-muted-foreground mt-1">{resultado.prazo}x parcelas fixas</p>
              </div>

              {/* Detalhes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground">Valor do veículo</span>
                  <span className="text-sm font-semibold">{formatCurrency(resultado.valorVeiculo)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground">Entrada</span>
                  <span className="text-sm font-semibold text-blue-400">- {formatCurrency(resultado.entrada)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground">Valor financiado</span>
                  <span className="text-sm font-bold">{formatCurrency(resultado.valorFinanciado)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground">Total de juros</span>
                  <span className="text-sm font-semibold text-red-400">{formatCurrency(resultado.totalJuros)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-muted-foreground font-medium">Total a pagar</span>
                  <span className="text-sm font-black text-foreground">{formatCurrency(resultado.totalPago)}</span>
                </div>
              </div>

              {/* Argumento de venda */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mt-3">
                <p className="text-[10px] text-emerald-400 font-bold mb-1 flex items-center gap-1">
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

        {/* Dica */}
        <div className="text-center pb-8">
          <p className="text-[10px] text-muted-foreground/50">
            Simulação baseada na tabela Price • Taxa ilustrativa de {taxaMensal}% a.m.
          </p>
        </div>
      </div>

      {sellerId && <IAMFloatingButton sellerId={parseInt(sellerId)} />}
    </div>
  );
}
