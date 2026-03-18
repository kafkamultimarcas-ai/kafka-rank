import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Flag, ArrowLeft, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

const CAR_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

function RaceCar({ seller, position, total, points, rank, color }: {
  seller: { name: string; nickname?: string | null; photoUrl?: string | null };
  position: number; total: number; points: number; rank: number; color: string;
}) {
  const progress = total > 1 ? Math.max(8, Math.min(95, 95 - ((rank - 1) / (total - 1)) * 70)) : 85;

  return (
    <div className="relative mb-2">
      {/* Lane */}
      <div className="relative h-20 sm:h-24 rounded-lg bg-secondary/50 border border-border overflow-hidden">
        {/* Track markings */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-[2px] border-t-2 border-dashed border-border/50" />
        </div>
        {/* Position label */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
          <span className="text-xs font-heading font-bold text-muted-foreground">P{rank}</span>
        </div>
        {/* Car + Driver */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out flex items-center gap-2"
          style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
        >
          {/* Car body */}
          <div className="relative">
            <svg width="80" height="40" viewBox="0 0 80 40" className="drop-shadow-lg">
              {/* Car body */}
              <path d="M10 28 L15 12 L30 8 L55 8 L70 15 L75 28 Z" fill={color} opacity="0.9" />
              {/* Windshield */}
              <path d="M32 10 L38 10 L36 18 L30 18 Z" fill="oklch(0.6 0.02 250)" opacity="0.6" />
              {/* Spoiler */}
              <path d="M12 12 L18 6 L20 12 Z" fill={color} opacity="0.7" />
              {/* Wheels */}
              <circle cx="25" cy="32" r="6" fill="oklch(0.2 0.01 250)" />
              <circle cx="25" cy="32" r="3" fill="oklch(0.4 0.01 250)" />
              <circle cx="60" cy="32" r="6" fill="oklch(0.2 0.01 250)" />
              <circle cx="60" cy="32" r="3" fill="oklch(0.4 0.01 250)" />
              {/* Racing number */}
              <text x="50" y="23" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Orbitron">{rank}</text>
            </svg>
            {/* Driver photo */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              {seller.photoUrl ? (
                <img
                  src={seller.photoUrl}
                  alt={seller.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 shadow-lg"
                  style={{ borderColor: color }}
                />
              ) : (
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 shadow-lg"
                  style={{ backgroundColor: color, borderColor: color }}
                >
                  {seller.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Finish line */}
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-primary/20 to-transparent" />
        {/* Name and points */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-right">
          <p className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[100px] sm:max-w-[140px]">
            {seller.nickname || seller.name}
          </p>
          <p className="text-xs font-heading text-primary font-bold">{points} pts</p>
        </div>
      </div>
    </div>
  );
}

export default function RaceTrack() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const competitionId = parseInt(params.id || "0");

  const { data: competition } = trpc.competitions.getById.useQuery({ id: competitionId });
  const { data: ranking } = trpc.competitions.ranking.useQuery({ id: competitionId });
  const { data: teamRanking } = trpc.competitions.teamRanking.useQuery({ id: competitionId });

  const isTeamComp = competition?.type === "team" || competition?.type === "group";

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando corrida...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <Flag className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">{competition.name}</h1>
              <p className="text-xs text-muted-foreground">
                {competition.type === "individual" ? "Individual" : competition.type === "team" ? "Equipes" : "Grupos"}
                {" — "}
                {competition.status === "active" ? "Em andamento" : "Encerrada"}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {competition.status === "active" && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                AO VIVO
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="container py-6 sm:py-8">
        {/* Race Track - Individual */}
        {!isTeamComp && ranking && ranking.length > 0 && (
          <div>
            {/* Podium for top 3 */}
            {ranking.length >= 3 && (
              <div className="flex items-end justify-center gap-3 sm:gap-6 mb-8 py-6">
                {/* 2nd place */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    {ranking[1]?.seller?.photoUrl ? (
                      <img src={ranking[1].seller.photoUrl} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-gray-400 shadow-lg" />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-600 flex items-center justify-center text-xl font-bold text-white border-3 border-gray-400">
                        {ranking[1]?.seller?.name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-xs font-bold text-white shadow">2</div>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground text-center truncate max-w-[80px] sm:max-w-[100px]">{ranking[1]?.seller?.nickname || ranking[1]?.seller?.name}</p>
                  <p className="text-xs font-heading text-primary">{ranking[1]?.participant.points} pts</p>
                  <div className="w-20 sm:w-24 h-16 sm:h-20 racing-card mt-2 flex items-center justify-center">
                    <span className="font-heading text-2xl sm:text-3xl font-bold text-gray-400">2</span>
                  </div>
                </div>
                {/* 1st place */}
                <div className="flex flex-col items-center -mt-4">
                  <Trophy className="h-8 w-8 text-yellow-500 mb-2" />
                  <div className="relative mb-2">
                    {ranking[0]?.seller?.photoUrl ? (
                      <img src={ranking[0].seller.photoUrl} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-3 border-yellow-500 shadow-lg glow-orange" />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-yellow-600 flex items-center justify-center text-2xl font-bold text-white border-3 border-yellow-500 glow-orange">
                        {ranking[0]?.seller?.name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-sm font-bold text-white shadow">1</div>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-foreground text-center truncate max-w-[100px] sm:max-w-[120px]">{ranking[0]?.seller?.nickname || ranking[0]?.seller?.name}</p>
                  <p className="text-sm font-heading text-primary font-bold">{ranking[0]?.participant.points} pts</p>
                  <div className="w-24 sm:w-28 h-20 sm:h-24 racing-card mt-2 flex items-center justify-center glow-orange">
                    <span className="font-heading text-3xl sm:text-4xl font-bold text-primary">1</span>
                  </div>
                </div>
                {/* 3rd place */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2">
                    {ranking[2]?.seller?.photoUrl ? (
                      <img src={ranking[2].seller.photoUrl} alt="" className="w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover border-3 border-amber-700 shadow-lg" />
                    ) : (
                      <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-amber-800 flex items-center justify-center text-lg font-bold text-white border-3 border-amber-700">
                        {ranking[2]?.seller?.name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-white shadow">3</div>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground text-center truncate max-w-[80px] sm:max-w-[100px]">{ranking[2]?.seller?.nickname || ranking[2]?.seller?.name}</p>
                  <p className="text-xs font-heading text-primary">{ranking[2]?.participant.points} pts</p>
                  <div className="w-18 sm:w-22 h-14 sm:h-16 racing-card mt-2 flex items-center justify-center">
                    <span className="font-heading text-xl sm:text-2xl font-bold text-amber-700">3</span>
                  </div>
                </div>
              </div>
            )}

            {/* Race lanes */}
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-bold text-lg text-foreground">PISTA DE CORRIDA</h2>
            </div>
            <div className="space-y-1">
              {ranking.map((entry, idx) => (
                <RaceCar
                  key={entry.participant.id}
                  seller={entry.seller || { name: "?" }}
                  position={idx}
                  total={ranking.length}
                  points={entry.participant.points}
                  rank={entry.position}
                  color={CAR_COLORS[idx % CAR_COLORS.length]}
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
              <h2 className="font-heading font-bold text-lg text-foreground">CORRIDA POR EQUIPES</h2>
            </div>
            {teamRanking.map((team, tidx) => (
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
                <div className="space-y-1">
                  {team.members.map((member, midx) => (
                    <RaceCar
                      key={member.participant.id}
                      seller={member.seller || { name: "?" }}
                      position={midx}
                      total={team.members.length}
                      points={member.participant.points}
                      rank={midx + 1}
                      color={team.team.color}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {(!ranking || ranking.length === 0) && (!teamRanking || teamRanking.length === 0) && (
          <div className="racing-card p-12 text-center">
            <Flag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-bold text-lg text-foreground mb-2">Nenhum participante ainda</h3>
            <p className="text-muted-foreground">O administrador precisa adicionar vendedores a esta competição.</p>
          </div>
        )}
      </div>
    </div>
  );
}
