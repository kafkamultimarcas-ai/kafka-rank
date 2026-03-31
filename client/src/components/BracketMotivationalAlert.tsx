import { trpc } from "@/lib/trpc";
import { Swords, Flame, X } from "lucide-react";
import { useState } from "react";

export default function BracketMotivationalAlert({ sellerId }: { sellerId: number }) {
  const { data: alerts } = trpc.bracket.meusAlertas.useQuery(
    { sellerId },
    { refetchInterval: 60_000 } // Refresh every minute
  );
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  if (!alerts || alerts.length === 0) return null;

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.matchId));
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="container pt-3 space-y-2">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.matchId}
          className="relative overflow-hidden rounded-lg border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 p-3 sm:p-4 animate-pulse-slow"
        >
          {/* Animated background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 animate-pulse" />

          <div className="relative flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Swords className="h-5 w-5 text-orange-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Flame className="h-3.5 w-3.5 text-red-400" />
                <span className="text-sm font-bold text-orange-400">
                  Você está atrás no mata-mata!
                </span>
              </div>
              <p className="text-xs text-foreground/80">
                <span className="font-bold text-foreground">{alert.competitionName}</span>
                {" — "}
                <span className="text-red-400 font-bold">{alert.myScore}</span>
                <span className="text-muted-foreground"> x </span>
                <span className="text-green-400 font-bold">{alert.opponentScore}</span>
                {" contra "}
                <span className="font-medium text-foreground">{alert.opponentName}</span>
              </p>
              <p className="text-[11px] text-orange-400/80 mt-1 font-medium">
                Corre que dá tempo! Cada venda é um gol!
              </p>
            </div>

            <button
              onClick={() => setDismissed(prev => { const next = new Set(prev); next.add(alert.matchId); return next; })}
              className="shrink-0 p-1 rounded-full hover:bg-secondary/50 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
