import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Flag, ArrowLeft, Trophy, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompetitionView() {
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
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">{competition.name}</h1>
            <p className="text-xs text-muted-foreground">
              {competition.status === "finished" ? "Encerrada" : competition.status === "active" ? "Ativa" : "Rascunho"}
            </p>
          </div>
        </div>
      </header>

      <div className="container py-6 sm:py-8">
        {/* Competition Info */}
        <div className="racing-card p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="font-heading font-bold text-sm text-foreground">
                {competition.type === "individual" ? "Individual" : competition.type === "team" ? "Equipes" : "Grupos"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pontos/Venda</p>
              <p className="font-heading font-bold text-sm text-primary">{competition.pointsPerSale}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Início</p>
              <p className="text-sm text-foreground">{new Date(competition.startDate).toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fim</p>
              <p className="text-sm text-foreground">{new Date(competition.endDate).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        </div>

        {/* Individual Ranking */}
        {!isTeamComp && ranking && ranking.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-bold text-lg text-foreground">CLASSIFICAÇÃO FINAL</h2>
            </div>
            <div className="space-y-2">
              {ranking.map((entry) => (
                <div
                  key={entry.participant.id}
                  className={`racing-card p-4 flex items-center gap-4 ${entry.position <= 3 ? "border-primary/30" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-sm shrink-0 ${
                    entry.position === 1 ? "bg-yellow-500 text-white" :
                    entry.position === 2 ? "bg-gray-400 text-white" :
                    entry.position === 3 ? "bg-amber-700 text-white" :
                    "bg-accent text-accent-foreground"
                  }`}>
                    {entry.position <= 3 ? <Medal className="h-5 w-5" /> : entry.position}
                  </div>
                  {entry.seller?.photoUrl ? (
                    <img src={entry.seller.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-lg font-bold text-accent-foreground border-2 border-border shrink-0">
                      {entry.seller?.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{entry.seller?.nickname || entry.seller?.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.participant.salesCount} vendas</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-heading font-bold text-primary">{entry.participant.points}</p>
                    <p className="text-xs text-muted-foreground">pontos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Ranking */}
        {isTeamComp && teamRanking && teamRanking.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-bold text-lg text-foreground">CLASSIFICAÇÃO POR EQUIPES</h2>
            </div>
            {teamRanking.map((team, idx) => (
              <div key={team.team.id} className="racing-card p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-heading font-bold"
                    style={{ backgroundColor: team.team.color }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-foreground">{team.team.name}</h3>
                    <p className="text-sm text-muted-foreground">{team.totalPoints} pts — {team.totalSales} vendas</p>
                  </div>
                </div>
                <div className="space-y-2 pl-4 border-l-2" style={{ borderColor: team.team.color }}>
                  {team.members.map(member => (
                    <div key={member.participant.id} className="flex items-center gap-3 py-1">
                      {member.seller?.photoUrl ? (
                        <img src={member.seller.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
                          {member.seller?.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <span className="text-sm text-foreground flex-1">{member.seller?.nickname || member.seller?.name}</span>
                      <span className="text-xs font-heading text-primary">{member.participant.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
