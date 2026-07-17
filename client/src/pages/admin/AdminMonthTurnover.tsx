import { useState, useMemo } from "react";
import { trpc } from "../../lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Archive, RotateCcw, Trophy, Medal, Award, TrendingUp, Users, ShoppingCart, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function AdminMonthTurnover() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const [selectedMonth, setSelectedMonth] = useState(previousMonth);
  const [selectedYear, setSelectedYear] = useState(previousYear);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmTurnover, setConfirmTurnover] = useState(false);

  const { data: availableMonths } = trpc.monthTurnover.availableMonths.useQuery();
  const { data: snapshot, isLoading: loadingSnapshot } = trpc.monthTurnover.getSnapshot.useQuery(
    { month: selectedMonth, year: selectedYear },
    { enabled: showHistory }
  );

  const executeMutation = trpc.monthTurnover.execute.useMutation({
    onSuccess: (data) => {
      if (data.alreadyDone) {
        toast.info(`Mês ${MONTH_NAMES[previousMonth]}/${previousYear} já foi arquivado anteriormente.`);
      } else {
        toast.success(`Virada de mês concluída! ${data.sellersArchived} vendedores arquivados, ${data.competitionsArchived} competições salvas.`);
      }
      setConfirmTurnover(false);
    },
    onError: (err) => {
      toast.error(`Erro na virada: ${err.message}`);
      setConfirmTurnover(false);
    },
  });

  const resetMutation = trpc.monthTurnover.resetCounters.useMutation({
    onSuccess: () => {
      toast.success("Contadores zerados com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao zerar: ${err.message}`);
    },
  });

  const hasSnapshotForPreviousMonth = useMemo(() => {
    if (!availableMonths) return false;
    return availableMonths.some(m => m.month === previousMonth && m.year === previousYear);
  }, [availableMonths, previousMonth, previousYear]);

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-red-500" />
            Virada de Mês
          </h1>
          <p className="text-muted-foreground mt-1">
            Arquive os dados do mês anterior e inicie o novo mês com contadores zerados
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/10">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground">
                Mês atual: {MONTH_NAMES[currentMonth]} {currentYear}
              </h3>
              <p className="text-muted-foreground mt-1">
                {hasSnapshotForPreviousMonth
                  ? `✅ ${MONTH_NAMES[previousMonth]}/${previousYear} já foi arquivado. Dados do mês anterior estão salvos.`
                  : `⚠️ ${MONTH_NAMES[previousMonth]}/${previousYear} ainda NÃO foi arquivado. Execute a virada de mês para salvar os dados e zerar os contadores.`
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Virada de Mês */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Archive className="w-5 h-5 text-red-500" />
              Arquivar {MONTH_NAMES[previousMonth]}/{previousYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Salva o ranking, vendas, competições e dados de cada vendedor do mês passado.
              Depois zera os contadores para o novo mês.
            </p>
            {!confirmTurnover ? (
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setConfirmTurnover(true)}
                disabled={hasSnapshotForPreviousMonth}
              >
                {hasSnapshotForPreviousMonth ? "✅ Já arquivado" : "🔄 Executar Virada de Mês"}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-bold text-yellow-500">
                  ⚠️ Tem certeza? Isso vai ZERAR os contadores de todos os vendedores!
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => executeMutation.mutate({ month: previousMonth, year: previousYear })}
                    disabled={executeMutation.isPending}
                  >
                    {executeMutation.isPending ? "Processando..." : "✅ Confirmar Virada"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmTurnover(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reset Manual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RotateCcw className="w-5 h-5 text-orange-500" />
              Zerar Contadores (Manual)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Zera apenas os contadores (vendas e pontos) de todos os vendedores sem arquivar.
              Use com cuidado — os dados não serão salvos.
            </p>
            <Button
              variant="outline"
              className="w-full border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
              onClick={() => {
                if (confirm("Tem certeza? Isso vai ZERAR vendas e pontos de todos os vendedores SEM salvar!")) {
                  resetMutation.mutate();
                }
              }}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? "Zerando..." : "🗑️ Zerar Sem Arquivar"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowHistory(!showHistory)}
          >
            <span className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Histórico de Meses
            </span>
            {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {showHistory && (
          <CardContent className="space-y-4">
            {/* Month Selector */}
            <div className="flex gap-3 items-center">
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={String(m)}>{MONTH_NAMES[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027, 2028].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Available months badges */}
            {availableMonths && availableMonths.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Meses salvos:</span>
                {availableMonths.map(m => (
                  <button
                    key={`${m.month}-${m.year}`}
                    className={`text-xs px-2 py-1 rounded-full transition-colors ${
                      m.month === selectedMonth && m.year === selectedYear
                        ? "bg-red-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => { setSelectedMonth(m.month); setSelectedYear(m.year); }}
                  >
                    {MONTH_NAMES[m.month]}/{m.year}
                  </button>
                ))}
              </div>
            )}

            {loadingSnapshot && (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            )}

            {!loadingSnapshot && snapshot && snapshot.sellers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado salvo para {MONTH_NAMES[selectedMonth]}/{selectedYear}.
                Execute a virada de mês para salvar.
              </div>
            )}

            {!loadingSnapshot && snapshot && snapshot.sellers.length > 0 && (
              <div className="space-y-4">
                {/* Ranking do mês */}
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Ranking de {MONTH_NAMES[selectedMonth]}/{selectedYear}
                </h3>
                <div className="space-y-2">
                  {snapshot.sellers.map((s, idx) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        idx === 0 ? "bg-yellow-500/10 border border-yellow-500/30" :
                        idx === 1 ? "bg-gray-400/10 border border-gray-400/30" :
                        idx === 2 ? "bg-orange-500/10 border border-orange-500/30" :
                        "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-background border">
                          {idx === 0 ? <Trophy className="w-4 h-4 text-yellow-500" /> :
                           idx === 1 ? <Medal className="w-4 h-4 text-gray-400" /> :
                           idx === 2 ? <Award className="w-4 h-4 text-orange-500" /> :
                           s.rank}
                        </span>
                        <div>
                          <span className="font-semibold">{s.sellerName}</span>
                          <span className="text-xs text-muted-foreground ml-2">{s.department}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          {s.totalSales} vendas
                        </span>
                        <span className="font-bold text-red-500">{s.totalPoints} pts</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Competições do mês */}
                {snapshot.competitions.length > 0 && (
                  <>
                    <h3 className="font-bold text-lg flex items-center gap-2 mt-6">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Competições de {MONTH_NAMES[selectedMonth]}/{selectedYear}
                    </h3>
                    <div className="space-y-2">
                      {snapshot.competitions.map(comp => {
                        let ranking: any[] = [];
                        try { ranking = JSON.parse(comp.rankingJson || "[]"); } catch {}
                        return (
                          <Card key={comp.id} className="bg-muted/20">
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold">{comp.competitionName}</span>
                                <span className="text-xs text-muted-foreground">{comp.competitionType} · {comp.category}</span>
                              </div>
                              {comp.championName && (
                                <div className="flex items-center gap-2 text-sm text-yellow-500 mb-2">
                                  <Trophy className="w-4 h-4" />
                                  Campeão: <span className="font-bold">{comp.championName}</span>
                                </div>
                              )}
                              {ranking.length > 0 && (
                                <div className="space-y-1">
                                  {ranking.slice(0, 5).map((r: any) => (
                                    <div key={r.sellerId} className="flex justify-between text-sm">
                                      <span>{r.position}º {r.sellerName}</span>
                                      <span className="text-muted-foreground">{r.points} pts · {r.salesCount} vendas</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
    </DashboardLayout>
  );
}
