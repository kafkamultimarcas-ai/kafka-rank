import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Trophy, Zap, Target, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect, useState } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

const CAR_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

function RaceCar({ seller, points, maxPoints, rank, color, animate }: {
  seller: { name: string; nickname?: string | null; photoUrl?: string | null };
  points: number; maxPoints: number; rank: number; color: string; animate: boolean;
}) {
  const [progress, setProgress] = useState(5);
  const targetProgress = maxPoints > 0 ? Math.max(5, Math.min(88, (points / maxPoints) * 85 + 3)) : 5;

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setProgress(targetProgress), 100 + rank * 150);
      return () => clearTimeout(timer);
    } else {
      setProgress(targetProgress);
    }
  }, [targetProgress, animate, rank]);

  return (
    <div className="relative mb-1.5">
      <div className="relative h-16 sm:h-20 rounded-lg bg-secondary/40 border border-border/50 overflow-hidden">
        {/* Track lane markings */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-[1px] border-t border-dashed border-border/30" />
        </div>
        {/* Position label */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
          <span className={`text-xs font-heading font-bold ${rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>P{rank}</span>
        </div>
        {/* Car + Driver */}
        <div
          className="absolute top-1/2 flex items-center gap-1 transition-all duration-[1500ms] ease-out"
          style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
        >
          {/* Driver avatar */}
          {seller.photoUrl ? (
            <img
              src={seller.photoUrl}
              alt={seller.name}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 shadow-lg shrink-0"
              style={{ borderColor: color }}
            />
          ) : (
            <div
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 shadow-lg shrink-0"
              style={{ backgroundColor: color, borderColor: color }}
            >
              {seller.name.charAt(0)}
            </div>
          )}
          {/* Car SVG */}
          <svg width="56" height="28" viewBox="0 0 56 28" className="drop-shadow-md shrink-0">
            <path d="M4 20 L8 8 L20 5 L40 5 L50 10 L54 20 Z" fill={color} opacity="0.9" />
            <path d="M22 7 L28 7 L26 13 L20 13 Z" fill="white" opacity="0.3" />
            <circle cx="16" cy="23" r="4" fill="#1a1a2e" />
            <circle cx="16" cy="23" r="2" fill="#333" />
            <circle cx="44" cy="23" r="4" fill="#1a1a2e" />
            <circle cx="44" cy="23" r="2" fill="#333" />
            <text x="36" y="17" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="monospace">{rank}</text>
          </svg>
        </div>
        {/* Finish line */}
        <div className="absolute right-0 top-0 bottom-0 w-3">
          <div className="h-full w-full" style={{
            background: "repeating-conic-gradient(#fff 0% 25%, #333 0% 50%) 0 0 / 6px 6px",
          }} />
        </div>
        {/* Name and points overlay */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-right z-10">
          <p className="text-[10px] sm:text-xs font-semibold text-foreground truncate max-w-[70px] sm:max-w-[120px]">
            {seller.nickname || seller.name}
          </p>
          <p className="text-[10px] font-heading text-primary font-bold">{points} pts</p>
        </div>
      </div>
    </div>
  );
}

export default function RaceTrack() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const competitionId = parseInt(params.id || "0");
  const [animate, setAnimate] = useState(true);

  const { data: competition } = trpc.competitions.getById.useQuery({ id: competitionId });
  const { data: ranking } = trpc.competitions.ranking.useQuery({ id: competitionId }, { refetchInterval: 15000 });
  const { data: teamRanking } = trpc.competitions.teamRanking.useQuery({ id: competitionId }, { refetchInterval: 15000 });

  const isTeamComp = competition?.type === "team" || competition?.type === "group";

  const maxPoints = useMemo(() => {
    if (!ranking || ranking.length === 0) return 10;
    const max = Math.max(...ranking.map(r => r.participant.points));
    return Math.max(max, competition?.goalTarget || 10);
  }, [ranking, competition]);

  // Animate on first load
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando competição...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center gap-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img src={LOGO_URL} alt="" className="h-7 w-7 rounded shrink-0" />
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-sm text-foreground truncate">{competition.name}</h1>
              <p className="text-[10px] text-muted-foreground">
                {competition.type === "individual" ? "Individual" : competition.type === "team" ? "Equipes" : "Grupos"}
              </p>
            </div>
          </div>
          {competition.status === "active" && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              AO VIVO
            </span>
          )}
        </div>
      </header>

      <div className="container py-6">
        {/* Goal Progress Bar */}
        {competition.goalTarget && competition.goalTarget > 0 && ranking && ranking.length > 0 && (
          <div className="racing-card p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-heading font-bold text-foreground">META DA COMPETIÇÃO</span>
            </div>
            {(() => {
              const totalPoints = ranking.reduce((sum, r) => sum + r.participant.points, 0);
              const pct = Math.min(100, Math.round((totalPoints / competition.goalTarget) * 100));
              return (
                <>
                  <div className="flex items-end justify-between mb-2">
                    <span className="font-heading font-bold text-2xl text-foreground">{totalPoints}</span>
                    <span className="text-sm text-muted-foreground">/ {competition.goalTarget} pts</span>
                    <span className="text-sm font-bold text-primary">{pct}%</span>
                  </div>
                  <div className="w-full h-4 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {pct >= 100 && (
                    <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-bold">
                      <Award className="h-3 w-3" /> META BATIDA! Parabéns a todos!
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Race Track - Individual */}
        {!isTeamComp && ranking && ranking.length > 0 && (
          <div>
            {/* Podium for top 3 */}
            {ranking.length >= 3 && (
              <div className="flex items-end justify-center gap-3 sm:gap-6 mb-8 py-4">
                {/* 2nd place */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    {ranking[1]?.seller?.photoUrl ? (
                      <img src={ranking[1].seller.photoUrl} alt="" className="w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover border-2 border-gray-400 shadow-lg" />
                    ) : (
                      <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-gray-600 flex items-center justify-center text-lg font-bold text-white border-2 border-gray-400">
                        {ranking[1]?.seller?.name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-xs font-bold text-white shadow">2</div>
                  </div>
                  <p className="text-xs font-semibold text-foreground text-center truncate max-w-[80px]">{ranking[1]?.seller?.nickname || ranking[1]?.seller?.name}</p>
                  <p className="text-xs font-heading text-primary">{ranking[1]?.participant.points} pts</p>
                  <div className="w-20 h-16 racing-card mt-2 flex items-center justify-center">
                    <span className="font-heading text-2xl font-bold text-gray-400">2</span>
                  </div>
                </div>
                {/* 1st place */}
                <div className="flex flex-col items-center -mt-4">
                  <Trophy className="h-7 w-7 text-yellow-500 mb-1" />
                  <div className="relative mb-2">
                    {ranking[0]?.seller?.photoUrl ? (
                      <img src={ranking[0].seller.photoUrl} alt="" className="w-18 h-18 sm:w-22 sm:h-22 rounded-full object-cover border-3 border-yellow-500 shadow-lg glow-orange" />
                    ) : (
                      <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-yellow-600 flex items-center justify-center text-xl font-bold text-white border-3 border-yellow-500 glow-orange">
                        {ranking[0]?.seller?.name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center text-sm font-bold text-white shadow">1</div>
                  </div>
                  <p className="text-sm font-bold text-foreground text-center truncate max-w-[100px]">{ranking[0]?.seller?.nickname || ranking[0]?.seller?.name}</p>
                  <p className="text-sm font-heading text-primary font-bold">{ranking[0]?.participant.points} pts</p>
                  <div className="w-24 h-20 racing-card mt-2 flex items-center justify-center glow-orange">
                    <span className="font-heading text-3xl font-bold text-primary">1</span>
                  </div>
                </div>
                {/* 3rd place */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    {ranking[2]?.seller?.photoUrl ? (
                      <img src={ranking[2].seller.photoUrl} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-amber-700 shadow-lg" />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-amber-800 flex items-center justify-center text-base font-bold text-white border-2 border-amber-700">
                        {ranking[2]?.seller?.name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-white shadow">3</div>
                  </div>
                  <p className="text-xs font-semibold text-foreground text-center truncate max-w-[80px]">{ranking[2]?.seller?.nickname || ranking[2]?.seller?.name}</p>
                  <p className="text-xs font-heading text-primary">{ranking[2]?.participant.points} pts</p>
                  <div className="w-18 h-14 racing-card mt-2 flex items-center justify-center">
                    <span className="font-heading text-xl font-bold text-amber-700">3</span>
                  </div>
                </div>
              </div>
            )}

            {/* Race lanes */}
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-bold text-lg text-foreground">PISTA DE COMPETIÇÃO</h2>
            </div>
            <div className="space-y-0.5">
              {ranking.map((entry, idx) => (
                <RaceCar
                  key={entry.participant.id}
                  seller={entry.seller || { name: "?" }}
                  points={entry.participant.points}
                  maxPoints={maxPoints}
                  rank={entry.position}
                  color={CAR_COLORS[idx % CAR_COLORS.length]}
                  animate={animate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Team Race */}
        {isTeamComp && teamRanking && teamRanking.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-bold text-lg text-foreground">COMPETIÇÃO POR EQUIPES</h2>
            </div>
            {teamRanking.map((team, tidx) => {
              const teamMax = Math.max(...team.members.map(m => m.participant.points), 10);
              return (
                <div key={team.team.id} className="racing-card p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-heading font-bold text-lg shadow"
                      style={{ backgroundColor: team.team.color }}
                    >
                      {tidx + 1}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-foreground">{team.team.name}</h3>
                      <p className="text-sm text-muted-foreground">{team.totalPoints} pts — {team.totalSales} vendas</p>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {team.members.map((member, midx) => (
                      <RaceCar
                        key={member.participant.id}
                        seller={member.seller || { name: "?" }}
                        points={member.participant.points}
                        maxPoints={teamMax}
                        rank={midx + 1}
                        color={team.team.color}
                        animate={animate}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {(!ranking || ranking.length === 0) && (!teamRanking || teamRanking.length === 0) && (
          <div className="racing-card p-12 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-bold text-lg text-foreground mb-2">Nenhum participante ainda</h3>
            <p className="text-muted-foreground">O administrador precisa adicionar vendedores a esta competição.</p>
          </div>
        )}
      </div>
    </div>
  );
}
