import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Shuffle, Trash2, Trophy, Swords, Crown, ChevronRight, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type BracketPanelProps = {
  competitionId: number;
  competitionType: string; // "individual" | "team" | "group" | "1v1"
  competitionStatus: string; // "draft" | "active" | "finished"
};

export default function BracketPanel({ competitionId, competitionType, competitionStatus }: BracketPanelProps) {
  const utils = trpc.useUtils();
  const { data: matches, isLoading } = trpc.bracket.list.useQuery({ competitionId });
  const sortear = trpc.bracket.sortear.useMutation({
    onSuccess: (data) => {
      utils.bracket.list.invalidate();
      toast.success(`Chaves sorteadas! ${data.matches} confronto(s) criado(s)`);
    },
    onError: (err) => toast.error(err.message || "Erro ao sortear chaves"),
  });
  const limpar = trpc.bracket.limpar.useMutation({
    onSuccess: () => {
      utils.bracket.list.invalidate();
      toast.success("Chaves removidas!");
    },
  });
  const atualizarPlacar = trpc.bracket.atualizarPlacar.useMutation({
    onSuccess: () => {
      utils.bracket.list.invalidate();
    },
  });
  const definirVencedor = trpc.bracket.definirVencedor.useMutation({
    onSuccess: () => {
      utils.bracket.list.invalidate();
      toast.success("Vencedor definido!");
    },
  });

  const [confirmClear, setConfirmClear] = useState(false);

  const isTeamType = competitionType === "team" || competitionType === "group";

  // Group matches by round
  const roundsMap = useMemo(() => {
    if (!matches || matches.length === 0) return new Map<number, typeof matches>();
    const map = new Map<number, typeof matches>();
    for (const m of matches) {
      const round = m.round;
      if (!map.has(round)) map.set(round, []);
      map.get(round)!.push(m);
    }
    return map;
  }, [matches]);

  const rounds = useMemo(() => {
    return Array.from(roundsMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [roundsMap]);

  const totalRounds = rounds.length;

  function getRoundLabel(round: number) {
    if (totalRounds === 1) return "Final";
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semifinal";
    if (round === totalRounds - 2) return "Quartas";
    return `Rodada ${round}`;
  }

  function getEntityName(match: any, side: "A" | "B") {
    if (isTeamType) {
      const team = side === "A" ? match.teamA : match.teamB;
      return team?.name || "—";
    } else {
      const seller = side === "A" ? match.sellerA : match.sellerB;
      return seller?.name || seller?.nickname || "—";
    }
  }

  function getEntityColor(match: any, side: "A" | "B") {
    if (isTeamType) {
      const team = side === "A" ? match.teamA : match.teamB;
      return team?.color || "#6B7280";
    }
    return side === "A" ? "#EF4444" : "#3B82F6";
  }

  function getEntityId(match: any, side: "A" | "B") {
    if (isTeamType) {
      return side === "A" ? match.teamAId : match.teamBId;
    }
    return side === "A" ? match.sellerAId : match.sellerBId;
  }

  function isWinner(match: any, side: "A" | "B") {
    if (match.status !== "finished" || !match.winnerId) return false;
    const entityId = getEntityId(match, side);
    return match.winnerId === entityId;
  }

  function handleIncrementScore(match: any, side: "A" | "B") {
    const newScoreA = side === "A" ? match.scoreA + 1 : match.scoreA;
    const newScoreB = side === "B" ? match.scoreB + 1 : match.scoreB;
    atualizarPlacar.mutate({ matchId: match.id, scoreA: newScoreA, scoreB: newScoreB });
  }

  function handleDecrementScore(match: any, side: "A" | "B") {
    const newScoreA = side === "A" ? Math.max(0, match.scoreA - 1) : match.scoreA;
    const newScoreB = side === "B" ? Math.max(0, match.scoreB - 1) : match.scoreB;
    atualizarPlacar.mutate({ matchId: match.id, scoreA: newScoreA, scoreB: newScoreB });
  }

  function handleDefineWinner(match: any, side: "A" | "B") {
    const winnerId = getEntityId(match, side);
    if (!winnerId) return;
    definirVencedor.mutate({
      matchId: match.id,
      winnerId,
      winnerType: isTeamType ? "team" : "seller",
    });
  }

  if (isLoading) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-secondary/30 animate-pulse">
        <div className="h-6 bg-secondary/50 rounded w-40 mb-3" />
        <div className="h-24 bg-secondary/50 rounded" />
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-red-400" />
          <span className="font-heading font-bold text-foreground text-sm">Mata-Mata</span>
        </div>
        <div className="flex items-center gap-2">
          {(!matches || matches.length === 0) && competitionStatus !== "finished" && (
            <Button
              size="sm"
              onClick={() => sortear.mutate({ competitionId })}
              disabled={sortear.isPending}
              className="racing-gradient text-white gap-1 text-xs h-8"
            >
              <Shuffle className="h-3 w-3" />
              {sortear.isPending ? "Sorteando..." : "Sortear Chaves"}
            </Button>
          )}
          {matches && matches.length > 0 && competitionStatus !== "finished" && (
            <>
              {confirmClear ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-destructive">Tem certeza?</span>
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { limpar.mutate({ competitionId }); setConfirmClear(false); }}>
                    Sim
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirmClear(false)}>
                    Não
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground gap-1" onClick={() => setConfirmClear(true)}>
                  <Trash2 className="h-3 w-3" />
                  Limpar
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {(!matches || matches.length === 0) && (
        <div className="p-6 rounded-lg bg-secondary/20 border border-dashed border-border text-center">
          <Swords className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Nenhuma chave sorteada ainda.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isTeamType
              ? "Crie equipes e adicione participantes, depois clique em 'Sortear Chaves'."
              : "Adicione participantes, depois clique em 'Sortear Chaves'."}
          </p>
        </div>
      )}

      {/* Bracket visualization */}
      {matches && matches.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-6 min-w-fit pb-2">
            {rounds.map(([round, roundMatches]) => (
              <div key={round} className="flex flex-col gap-3 min-w-[260px]">
                {/* Round header */}
                <div className="flex items-center gap-2 mb-1">
                  {round === totalRounds ? (
                    <Trophy className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    round === totalRounds ? "text-yellow-400" : "text-muted-foreground"
                  }`}>
                    {getRoundLabel(round)}
                  </span>
                </div>

                {/* Matches */}
                {(roundMatches || []).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    isTeamType={isTeamType}
                    isFinal={round === totalRounds}
                    isActive={competitionStatus === "active"}
                    getEntityName={getEntityName}
                    getEntityColor={getEntityColor}
                    getEntityId={getEntityId}
                    isWinner={isWinner}
                    onIncrementScore={handleIncrementScore}
                    onDecrementScore={handleDecrementScore}
                    onDefineWinner={handleDefineWinner}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match, isTeamType, isFinal, isActive,
  getEntityName, getEntityColor, getEntityId, isWinner,
  onIncrementScore, onDecrementScore, onDefineWinner,
}: {
  match: any;
  isTeamType: boolean;
  isFinal: boolean;
  isActive: boolean;
  getEntityName: (m: any, s: "A" | "B") => string;
  getEntityColor: (m: any, s: "A" | "B") => string;
  getEntityId: (m: any, s: "A" | "B") => number | null;
  isWinner: (m: any, s: "A" | "B") => boolean;
  onIncrementScore: (m: any, s: "A" | "B") => void;
  onDecrementScore: (m: any, s: "A" | "B") => void;
  onDefineWinner: (m: any, s: "A" | "B") => void;
}) {
  const isFinished = match.status === "finished";
  const nameA = getEntityName(match, "A");
  const nameB = getEntityName(match, "B");
  const colorA = getEntityColor(match, "A");
  const colorB = getEntityColor(match, "B");
  const winnerA = isWinner(match, "A");
  const winnerB = isWinner(match, "B");
  const isBye = !getEntityId(match, "B");

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${
      isFinal ? "border-yellow-500/40 bg-yellow-500/5" :
      isFinished ? "border-border/50 bg-secondary/10 opacity-80" :
      "border-border bg-secondary/20"
    }`}>
      {/* Side A */}
      <div className={`flex items-center gap-2 px-3 py-2.5 ${
        winnerA ? "bg-green-500/15" : ""
      }`}>
        <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: colorA }} />
        <span className={`text-sm flex-1 truncate ${
          winnerA ? "font-bold text-green-400" : isFinished && !winnerA ? "text-muted-foreground" : "text-foreground"
        }`}>
          {nameA}
        </span>
        {winnerA && <Crown className="h-4 w-4 text-yellow-400 shrink-0" />}
        {/* Score controls */}
        {isActive && !isFinished && !isBye && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => onDecrementScore(match, "A")}
              className="w-5 h-5 rounded text-xs text-muted-foreground hover:bg-secondary/50 flex items-center justify-center"
            >
              -
            </button>
            <span className="text-lg font-heading font-bold text-foreground w-6 text-center">
              {match.scoreA}
            </span>
            <button
              onClick={() => onIncrementScore(match, "A")}
              className="w-5 h-5 rounded text-xs text-green-400 hover:bg-green-500/20 flex items-center justify-center"
            >
              +
            </button>
          </div>
        )}
        {(isFinished || isBye) && (
          <span className="text-lg font-heading font-bold text-foreground w-6 text-center shrink-0">
            {match.scoreA}
          </span>
        )}
      </div>

      {/* VS divider */}
      <div className="flex items-center justify-between px-3 py-0.5 bg-secondary/30 border-y border-border/30">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
          {isBye ? "BYE" : "vs"}
        </span>
        {/* Winner buttons */}
        {isActive && !isFinished && !isBye && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDefineWinner(match, "A")}
              className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              title={`${nameA} venceu`}
            >
              A vence
            </button>
            <button
              onClick={() => onDefineWinner(match, "B")}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              title={`${nameB} venceu`}
            >
              B vence
            </button>
          </div>
        )}
        {isFinished && match.winnerId && (
          <span className="text-[10px] text-green-400 font-medium">Encerrado</span>
        )}
      </div>

      {/* Side B */}
      <div className={`flex items-center gap-2 px-3 py-2.5 ${
        winnerB ? "bg-green-500/15" : ""
      }`}>
        <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: colorB }} />
        <span className={`text-sm flex-1 truncate ${
          winnerB ? "font-bold text-green-400" : isFinished && !winnerB ? "text-muted-foreground" : "text-foreground"
        }`}>
          {isBye ? "—" : nameB}
        </span>
        {winnerB && <Crown className="h-4 w-4 text-yellow-400 shrink-0" />}
        {isActive && !isFinished && !isBye && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => onDecrementScore(match, "B")}
              className="w-5 h-5 rounded text-xs text-muted-foreground hover:bg-secondary/50 flex items-center justify-center"
            >
              -
            </button>
            <span className="text-lg font-heading font-bold text-foreground w-6 text-center">
              {match.scoreB}
            </span>
            <button
              onClick={() => onIncrementScore(match, "B")}
              className="w-5 h-5 rounded text-xs text-green-400 hover:bg-green-500/20 flex items-center justify-center"
            >
              +
            </button>
          </div>
        )}
        {(isFinished || isBye) && (
          <span className="text-lg font-heading font-bold text-foreground w-6 text-center shrink-0">
            {isBye ? "—" : match.scoreB}
          </span>
        )}
      </div>

      {/* Motivational alert for losing side */}
      {isActive && !isFinished && !isBye && match.scoreA !== match.scoreB && (
        <div className="px-3 py-1.5 bg-orange-500/10 border-t border-orange-500/20">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-orange-400 shrink-0" />
            <span className="text-[10px] text-orange-400 font-medium">
              {match.scoreA > match.scoreB
                ? `${nameB} está atrás! Corre que dá tempo!`
                : `${nameA} está atrás! Corre que dá tempo!`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
