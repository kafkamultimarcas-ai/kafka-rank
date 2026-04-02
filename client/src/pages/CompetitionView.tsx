import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Trophy, Medal, Swords, Crown, Zap, Shield, Star, ChevronRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Helper: get initials
function getInitials(name: string) {
  return name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

// Helper: position colors
function positionStyle(pos: number) {
  if (pos === 1) return { bg: "bg-gradient-to-br from-yellow-400 to-amber-600", text: "text-white", border: "border-yellow-500/50", glow: "shadow-yellow-500/30" };
  if (pos === 2) return { bg: "bg-gradient-to-br from-gray-300 to-gray-500", text: "text-white", border: "border-gray-400/50", glow: "shadow-gray-400/20" };
  if (pos === 3) return { bg: "bg-gradient-to-br from-amber-600 to-amber-800", text: "text-white", border: "border-amber-700/50", glow: "shadow-amber-600/20" };
  return { bg: "bg-accent", text: "text-accent-foreground", border: "border-border", glow: "" };
}

// Sports-style player avatar
function PlayerAvatar({ seller, size = "lg" }: { seller: any; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-24 h-24 text-2xl",
  };
  const borderSizes = {
    sm: "border-2",
    md: "border-2",
    lg: "border-3",
    xl: "border-4",
  };

  if (seller?.photoUrl) {
    return (
      <div className={`${sizes[size]} rounded-full overflow-hidden ${borderSizes[size]} border-primary/50 shadow-lg shadow-primary/20 shrink-0`}>
        <img src={seller.photoUrl} alt={seller.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-heading font-bold ${borderSizes[size]} border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shrink-0`}>
      {getInitials(seller?.name || "?")}
    </div>
  );
}

// VS Match Card - Sports style
function MatchCard({ match, isHighlight }: { match: any; isHighlight?: boolean }) {
  const sellerA = match.sellerA;
  const sellerB = match.sellerB;
  const teamA = match.teamA;
  const teamB = match.teamB;
  const nameA = teamA?.name || sellerA?.nickname || sellerA?.name || "TBD";
  const nameB = teamB?.name || sellerB?.nickname || sellerB?.name || "TBD";
  const scoreA = match.scoreA || 0;
  const scoreB = match.scoreB || 0;
  const isFinished = match.status === "finished";
  const winnerIsA = isFinished && match.winnerId && (match.winnerId === match.sellerAId || match.winnerId === match.teamAId);
  const winnerIsB = isFinished && match.winnerId && (match.winnerId === match.sellerBId || match.winnerId === match.teamBId);

  return (
    <div className={`relative rounded-2xl overflow-hidden ${isHighlight ? "border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/10" : "border border-border/50"}`}>
      {/* Match header */}
      {isHighlight && (
        <div className="bg-gradient-to-r from-yellow-500/20 via-yellow-500/10 to-yellow-500/20 px-3 py-1 flex items-center justify-center gap-1">
          <Crown className="w-3 h-3 text-yellow-400" />
          <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
            {match.round === 1 ? "FINAL" : `Rodada ${match.round}`}
          </span>
        </div>
      )}

      <div className="bg-gradient-to-b from-card to-card/80 p-4">
        {/* Player A */}
        <div className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-all ${winnerIsA ? "bg-green-500/10 border border-green-500/20" : winnerIsB ? "opacity-50" : ""}`}>
          <PlayerAvatar seller={sellerA || { name: teamA?.name || "TBD" }} size="md" />
          <div className="flex-1 min-w-0">
            <p className={`font-heading font-bold text-sm truncate ${winnerIsA ? "text-green-400" : "text-foreground"}`}>{nameA}</p>
            {teamA && <p className="text-[10px] text-muted-foreground">{teamA.name}</p>}
          </div>
          <div className={`text-2xl font-heading font-black tabular-nums ${winnerIsA ? "text-green-400" : "text-foreground"}`}>
            {scoreA}
          </div>
          {winnerIsA && <Crown className="w-5 h-5 text-yellow-400 shrink-0" />}
        </div>

        {/* VS Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
              <Swords className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>

        {/* Player B */}
        <div className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-all ${winnerIsB ? "bg-green-500/10 border border-green-500/20" : winnerIsA ? "opacity-50" : ""}`}>
          <PlayerAvatar seller={sellerB || { name: teamB?.name || "TBD" }} size="md" />
          <div className="flex-1 min-w-0">
            <p className={`font-heading font-bold text-sm truncate ${winnerIsB ? "text-green-400" : "text-foreground"}`}>{nameB}</p>
            {teamB && <p className="text-[10px] text-muted-foreground">{teamB.name}</p>}
          </div>
          <div className={`text-2xl font-heading font-black tabular-nums ${winnerIsB ? "text-green-400" : "text-foreground"}`}>
            {scoreB}
          </div>
          {winnerIsB && <Crown className="w-5 h-5 text-yellow-400 shrink-0" />}
        </div>

        {/* Match status */}
        {!isFinished && (
          <div className="mt-2 text-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              AO VIVO
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Ranking podium for top 3
function Podium({ ranking }: { ranking: any[] }) {
  if (!ranking || ranking.length < 1) return null;
  const top3 = ranking.slice(0, 3);
  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3.length >= 2 ? [top3[1], top3[0]] : [top3[0]];
  const heights = ["h-24", "h-32", "h-20"];
  const podiumHeights = top3.length >= 3 ? [heights[1], heights[0], heights[2]] : top3.length >= 2 ? [heights[1], heights[0]] : [heights[0]];

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 mb-8 pt-8">
      {podiumOrder.map((entry, idx) => {
        const pos = entry.position;
        const style = positionStyle(pos);
        const seller = entry.seller;
        const isFirst = pos === 1;
        return (
          <div key={entry.participant.id} className="flex flex-col items-center">
            {/* Crown for 1st */}
            {isFirst && <Crown className="w-8 h-8 text-yellow-400 mb-1 animate-bounce" />}
            
            {/* Avatar */}
            <div className="relative mb-2">
              <PlayerAvatar seller={seller} size={isFirst ? "xl" : "lg"} />
              {/* Position badge */}
              <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full ${style.bg} ${style.text} flex items-center justify-center font-heading font-black text-sm shadow-lg ${style.glow}`}>
                {pos}
              </div>
            </div>

            {/* Name */}
            <p className={`font-heading font-bold text-center ${isFirst ? "text-base text-yellow-400" : "text-sm text-foreground"} max-w-[100px] truncate`}>
              {seller?.nickname || seller?.name}
            </p>
            <p className="text-xs text-primary font-heading font-bold">{entry.participant.points} pts</p>
            <p className="text-[10px] text-muted-foreground">{entry.participant.salesCount} vendas</p>

            {/* Podium block */}
            <div className={`${podiumHeights[idx]} w-20 sm:w-24 mt-2 rounded-t-xl ${style.bg} flex items-start justify-center pt-3 shadow-lg ${style.glow}`}>
              <span className={`font-heading font-black text-2xl ${style.text}`}>
                {pos === 1 ? <Trophy className="w-8 h-8" /> : pos === 2 ? <Medal className="w-7 h-7" /> : <Medal className="w-6 h-6" />}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CompetitionView() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const competitionId = parseInt(params.id || "0");
  const [activeTab, setActiveTab] = useState<"ranking" | "bracket" | "teams">("ranking");

  const { data: competition } = trpc.competitions.getById.useQuery({ id: competitionId });
  const { data: ranking } = trpc.competitions.ranking.useQuery({ id: competitionId });
  const { data: teamRanking } = trpc.competitions.teamRanking.useQuery({ id: competitionId });
  const { data: bracketMatches } = trpc.bracket.list.useQuery({ competitionId });

  const isTeamComp = competition?.type === "team" || competition?.type === "group";
  const hasBracket = bracketMatches && bracketMatches.length > 0;

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Group bracket matches by round
  const matchesByRound = new Map<number, any[]>();
  if (bracketMatches) {
    for (const m of bracketMatches) {
      const round = m.round || 1;
      if (!matchesByRound.has(round)) matchesByRound.set(round, []);
      matchesByRound.get(round)!.push(m);
    }
  }
  const roundNames = (total: number, round: number) => {
    const diff = total - round;
    if (diff === 0) return "FINAL";
    if (diff === 1) return "SEMIFINAL";
    if (diff === 2) return "QUARTAS DE FINAL";
    return `RODADA ${round}`;
  };
  const totalRounds = matchesByRound.size;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Sports style */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
        <div className="relative container flex items-center gap-4 h-16">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading font-black text-base sm:text-lg text-foreground truncate uppercase tracking-wide">
              {competition.name}
            </h1>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              {competition.status === "active" && (
                <span className="inline-flex items-center gap-1 text-green-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> AO VIVO
                </span>
              )}
              {competition.status === "finished" && <span className="text-muted-foreground">Encerrada</span>}
              {competition.status === "draft" && <span className="text-yellow-400">Rascunho</span>}
            </p>
          </div>
        </div>
      </header>

      {/* Competition Stats Bar */}
      <div className="bg-card/50 border-b border-border">
        <div className="container py-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</p>
              <p className="font-heading font-bold text-xs text-foreground">
                {competition.type === "individual" ? "Individual" : "Equipes"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pts/Venda</p>
              <p className="font-heading font-bold text-xs text-primary">{competition.pointsPerSale}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Início</p>
              <p className="text-xs text-foreground">{new Date(competition.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fim</p>
              <p className="text-xs text-foreground">{new Date(competition.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="container pt-4">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("ranking")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "ranking"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Classificação
          </button>
          {hasBracket && (
            <button
              onClick={() => setActiveTab("bracket")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "bracket"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Swords className="w-3.5 h-3.5" /> Mata-Mata
            </button>
          )}
          {isTeamComp && (
            <button
              onClick={() => setActiveTab("teams")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "teams"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Equipes
            </button>
          )}
        </div>
      </div>

      <div className="container pb-8">
        {/* ===== RANKING TAB ===== */}
        {activeTab === "ranking" && (
          <div>
            {/* Podium for top 3 */}
            {!isTeamComp && ranking && ranking.length >= 1 && (
              <Podium ranking={ranking} />
            )}

            {/* Full ranking list */}
            {!isTeamComp && ranking && ranking.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="h-4 w-4 text-primary" />
                  <h2 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">Ranking Completo</h2>
                </div>
                {ranking.map((entry) => {
                  const style = positionStyle(entry.position);
                  return (
                    <div
                      key={entry.participant.id}
                      className={`rounded-xl border p-3 flex items-center gap-3 ${entry.position <= 3 ? `${style.border} shadow-md ${style.glow}` : "border-border/50"}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-heading font-black text-sm shrink-0 ${style.bg} ${style.text}`}>
                        {entry.position}
                      </div>
                      <PlayerAvatar seller={entry.seller} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold text-sm text-foreground truncate">
                          {entry.seller?.nickname || entry.seller?.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{entry.participant.salesCount} vendas</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-heading font-black text-primary text-lg">{entry.participant.points}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">pontos</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Team ranking in ranking tab */}
            {isTeamComp && teamRanking && teamRanking.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <h2 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">Ranking por Equipes</h2>
                </div>
                {teamRanking.map((team, idx) => {
                  const style = positionStyle(idx + 1);
                  return (
                    <div key={team.team.id} className={`rounded-xl border overflow-hidden ${idx < 3 ? `${style.border} shadow-md ${style.glow}` : "border-border/50"}`}>
                      <div className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-black text-sm ${style.bg} ${style.text}`}>
                          {idx + 1}
                        </div>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-heading font-bold text-sm" style={{ backgroundColor: team.team.color }}>
                          {team.team.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-bold text-sm text-foreground truncate">{team.team.name}</p>
                          <p className="text-[10px] text-muted-foreground">{team.members.length} membros</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-heading font-black text-primary text-lg">{team.totalPoints}</p>
                          <p className="text-[9px] text-muted-foreground">{team.totalSales} vendas</p>
                        </div>
                      </div>
                      {/* Team members */}
                      <div className="px-4 pb-3 space-y-1">
                        {team.members.map(member => (
                          <div key={member.participant.id} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-background/50">
                            <PlayerAvatar seller={member.seller} size="sm" />
                            <span className="text-xs text-foreground flex-1 truncate">{member.seller?.nickname || member.seller?.name}</span>
                            <span className="text-xs font-heading font-bold text-primary">{member.participant.points} pts</span>
                            <span className="text-[10px] text-muted-foreground">{member.participant.salesCount}v</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== BRACKET / MATA-MATA TAB ===== */}
        {activeTab === "bracket" && hasBracket && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Swords className="h-5 w-5 text-red-400" />
              <h2 className="font-heading font-black text-lg text-foreground uppercase tracking-wider">Mata-Mata</h2>
            </div>

            {Array.from(matchesByRound.entries())
              .sort(([a], [b]) => a - b)
              .map(([round, matches]) => (
                <div key={round}>
                  {/* Round header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-red-500/30 to-transparent" />
                    <span className="text-xs font-heading font-black text-red-400 uppercase tracking-widest px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                      {roundNames(totalRounds, round)}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-l from-red-500/30 to-transparent" />
                  </div>

                  {/* Matches */}
                  <div className="space-y-3">
                    {matches.sort((a: any, b: any) => (a.matchOrder || 0) - (b.matchOrder || 0)).map((match: any) => (
                      <MatchCard key={match.id} match={match} isHighlight={round === 1 || matches.length === 1} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ===== TEAMS TAB ===== */}
        {activeTab === "teams" && isTeamComp && teamRanking && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <h2 className="font-heading font-black text-lg text-foreground uppercase tracking-wider">Equipes</h2>
            </div>

            {teamRanking.map((team, idx) => (
              <div key={team.team.id} className="rounded-2xl border border-border/50 overflow-hidden">
                {/* Team banner */}
                <div className="p-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${team.team.color}20, transparent)` }}>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-heading font-black text-xl shadow-lg" style={{ backgroundColor: team.team.color }}>
                    {team.team.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-black text-foreground text-base">{team.team.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-primary font-heading font-bold">{team.totalPoints} pts</span>
                      <span className="text-xs text-muted-foreground">{team.totalSales} vendas</span>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-black text-sm ${positionStyle(idx + 1).bg} ${positionStyle(idx + 1).text}`}>
                    #{idx + 1}
                  </div>
                </div>

                {/* Team members as player cards */}
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {team.members.map(member => (
                    <div key={member.participant.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30">
                      <PlayerAvatar seller={member.seller} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold text-sm text-foreground truncate">{member.seller?.nickname || member.seller?.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs text-primary font-bold">{member.participant.points} pts</span>
                          <span className="text-[10px] text-muted-foreground">{member.participant.salesCount} vendas</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {activeTab === "ranking" && (!ranking || ranking.length === 0) && (!teamRanking || teamRanking.length === 0) && (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-heading">Nenhum resultado ainda</p>
            <p className="text-xs text-muted-foreground/60 mt-1">A competição ainda não tem vendas registradas</p>
          </div>
        )}
      </div>
    </div>
  );
}
