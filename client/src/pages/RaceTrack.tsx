import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Trophy, Zap, Target, Award, Swords, Crown, Shield, Flame, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028900346/NKs9YYU4Bt79zUwnWH56wx/kafka-rank-logo-gTPVVbk3XkgaZ4gQf48tvP.webp";

const CAR_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

// ===== PLAYER AVATAR =====
function PlayerAvatar({ name, photoUrl, size = "md", borderColor, isMe, onPhotoChange }: {
  name: string; photoUrl?: string | null; size?: "sm" | "md" | "lg" | "xl"; borderColor?: string;
  isMe?: boolean; onPhotoChange?: () => void;
}) {
  const sizes = { sm: "w-8 h-8 text-[10px]", md: "w-12 h-12 text-sm", lg: "w-16 h-16 text-lg", xl: "w-20 h-20 text-xl" };
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const bColor = borderColor || "border-primary/40";
  const borderStyle = typeof borderColor === 'string' && borderColor.startsWith('#') ? { borderColor } : {};
  const borderClass = typeof borderColor === 'string' && borderColor.startsWith('#') ? '' : bColor;

  const avatar = photoUrl ? (
    <div className={`${sizes[size]} rounded-full overflow-hidden border-2 ${borderClass} shadow-lg shrink-0`}
      style={borderStyle}>
      <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
    </div>
  ) : (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-heading font-bold border-2 ${borderClass} bg-gradient-to-br from-primary/20 to-primary/5 text-primary shrink-0`}
      style={borderStyle}>
      {initials}
    </div>
  );

  if (isMe && onPhotoChange) {
    return (
      <div className="relative cursor-pointer group" onClick={onPhotoChange}>
        {avatar}
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-4 h-4 text-white" />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background">
          <Camera className="w-2.5 h-2.5 text-primary-foreground" />
        </div>
      </div>
    );
  }

  return avatar;
}

// ===== FOOTBALL SCOREBOARD MATCH CARD =====
function FootballMatchCard({ match, roundLabel, mySellerId, onPhotoChange }: { match: any; roundLabel?: string; mySellerId?: number | null; onPhotoChange?: () => void }) {
  const sellerA = match.sellerA;
  const sellerB = match.sellerB;
  const isMyA = mySellerId && (match.sellerAId === mySellerId);
  const isMyB = mySellerId && (match.sellerBId === mySellerId);
  const teamA = match.teamA;
  const teamB = match.teamB;
  const nameA = sellerA?.nickname || sellerA?.name || teamA?.name || "TBD";
  const nameB = sellerB?.nickname || sellerB?.name || teamB?.name || "TBD";
  const photoA = sellerA?.competitionPhotoUrl || sellerA?.photoUrl || null;
  const photoB = sellerB?.competitionPhotoUrl || sellerB?.photoUrl || null;
  const scoreA = match.scoreA || 0;
  const scoreB = match.scoreB || 0;
  const isFinished = match.status === "finished";
  const winnerIsA = isFinished && match.winnerId && (match.winnerId === match.sellerAId || match.winnerId === match.teamAId);
  const winnerIsB = isFinished && match.winnerId && (match.winnerId === match.sellerBId || match.winnerId === match.teamBId);
  const isFinal = roundLabel === "FINAL";

  return (
    <div className={`rounded-2xl overflow-hidden ${isFinal ? "border-2 border-yellow-500/40 shadow-lg shadow-yellow-500/10" : "border border-border/40"}`}>
      {/* Round label */}
      {roundLabel && (
        <div className={`text-center py-1.5 ${isFinal ? "bg-gradient-to-r from-yellow-500/15 via-yellow-500/25 to-yellow-500/15" : "bg-card/80"}`}>
          <span className={`text-[10px] font-heading font-black uppercase tracking-[0.2em] ${isFinal ? "text-yellow-400" : "text-muted-foreground"}`}>
            {isFinal && "🏆 "}{roundLabel}
          </span>
        </div>
      )}

      {/* Scoreboard */}
      <div className="bg-gradient-to-b from-[#0a0a1a] to-[#111128] p-4">
        {/* Live badge */}
        {!isFinished && (
          <div className="text-center mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-green-500/15 border border-green-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">AO VIVO</span>
            </span>
          </div>
        )}

        {/* Main scoreboard: Photo Name SCORE x SCORE Name Photo */}
        <div className="flex items-center justify-between gap-2">
          {/* Player A side */}
          <div className={`flex-1 flex flex-col items-center gap-2 ${winnerIsB && isFinished ? "opacity-40" : ""}`}>
            <div className="relative">
              <PlayerAvatar name={nameA} photoUrl={photoA} size="lg" borderColor={winnerIsA ? "#22c55e" : teamA?.color} isMe={!!isMyA} onPhotoChange={onPhotoChange} />
              {winnerIsA && (
                <div className="absolute -top-2 -right-1">
                  <Crown className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
                </div>
              )}
            </div>
            <p className={`font-heading font-bold text-xs text-center leading-tight max-w-[80px] ${winnerIsA ? "text-green-400" : "text-foreground"}`}>
              {nameA}
            </p>
          </div>

          {/* Score center */}
          <div className="flex items-center gap-0 shrink-0">
            <div className={`w-12 h-14 rounded-l-xl flex items-center justify-center ${winnerIsA ? "bg-green-500/20 border border-green-500/30" : "bg-white/5 border border-white/10"}`}>
              <span className={`font-heading font-black text-3xl tabular-nums ${winnerIsA ? "text-green-400" : "text-foreground"}`}>{scoreA}</span>
            </div>
            <div className="w-8 h-14 flex items-center justify-center bg-red-500/10 border-y border-red-500/20">
              <span className="font-heading font-black text-red-400 text-xs">VS</span>
            </div>
            <div className={`w-12 h-14 rounded-r-xl flex items-center justify-center ${winnerIsB ? "bg-green-500/20 border border-green-500/30" : "bg-white/5 border border-white/10"}`}>
              <span className={`font-heading font-black text-3xl tabular-nums ${winnerIsB ? "text-green-400" : "text-foreground"}`}>{scoreB}</span>
            </div>
          </div>

          {/* Player B side */}
          <div className={`flex-1 flex flex-col items-center gap-2 ${winnerIsA && isFinished ? "opacity-40" : ""}`}>
            <div className="relative">
              <PlayerAvatar name={nameB} photoUrl={photoB} size="lg" borderColor={winnerIsB ? "#22c55e" : teamB?.color} isMe={!!isMyB} onPhotoChange={onPhotoChange} />
              {winnerIsB && (
                <div className="absolute -top-2 -right-1">
                  <Crown className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
                </div>
              )}
            </div>
            <p className={`font-heading font-bold text-xs text-center leading-tight max-w-[80px] ${winnerIsB ? "text-green-400" : "text-foreground"}`}>
              {nameB}
            </p>
          </div>
        </div>

        {/* Finished badge */}
        {isFinished && (
          <div className="text-center mt-3">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Encerrado</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== RACE CAR =====
function RaceCar({ seller, points, maxPoints, rank, color, animate }: {
  seller: { name: string; nickname?: string | null; photoUrl?: string | null; competitionPhotoUrl?: string | null };
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
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-[1px] border-t border-dashed border-border/30" />
        </div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
          <span className={`text-xs font-heading font-bold ${rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>P{rank}</span>
        </div>
        <div
          className="absolute top-1/2 flex items-center gap-1 transition-all duration-[1500ms] ease-out"
          style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
        >
          {(seller.competitionPhotoUrl || seller.photoUrl) ? (
            <img src={seller.competitionPhotoUrl || seller.photoUrl!} alt={seller.name}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 shadow-lg shrink-0"
              style={{ borderColor: color }} />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 shadow-lg shrink-0"
              style={{ backgroundColor: color, borderColor: color }}>
              {seller.name.charAt(0)}
            </div>
          )}
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
        <div className="absolute right-0 top-0 bottom-0 w-3">
          <div className="h-full w-full" style={{ background: "repeating-conic-gradient(#fff 0% 25%, #333 0% 50%) 0 0 / 6px 6px" }} />
        </div>
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

// ===== MAIN COMPONENT =====
export default function RaceTrack() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const competitionId = parseInt(params.id || "0");
  const [animate, setAnimate] = useState(true);
  const [activeTab, setActiveTab] = useState<"corrida" | "matamata" | "equipes">("corrida");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: competition } = trpc.competitions.getById.useQuery({ id: competitionId });
  const { data: ranking } = trpc.competitions.ranking.useQuery({ id: competitionId }, { refetchInterval: 15000 });
  const { data: teamRanking } = trpc.competitions.teamRanking.useQuery({ id: competitionId }, { refetchInterval: 15000 });
  const { data: bracketMatches } = trpc.bracket.list.useQuery({ competitionId }, { refetchInterval: 15000 });
  const { data: sellerSession } = trpc.sellers.me.useQuery();
  const utils = trpc.useUtils();

  const uploadPhotoMut = trpc.sellers.uploadMyPhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto atualizada!");
      utils.competitions.ranking.invalidate();
      utils.competitions.teamRanking.invalidate();
      utils.bracket.list.invalidate();
      utils.sellers.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePhotoClick = useCallback(() => {
    if (uploading) return;
    fileInputRef.current?.click();
  }, [uploading]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      toast.error('Imagem muito grande. M\u00e1ximo 7MB.');
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        await uploadPhotoMut.mutateAsync({ base64, mimeType: file.type });
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
    // Reset input
    e.target.value = '';
  }, [uploadPhotoMut]);

  const mySellerId = sellerSession?.id || null;

  const isTeamComp = competition?.type === "team" || competition?.type === "group";
  const hasBracket = bracketMatches && bracketMatches.length > 0;

  // Auto-switch to matamata tab if bracket exists and no ranking yet
  useEffect(() => {
    if (hasBracket && activeTab === "corrida") {
      // If there are bracket matches, default to matamata view
      setActiveTab("matamata");
    }
  }, [hasBracket]);

  const maxPoints = useMemo(() => {
    if (!ranking || ranking.length === 0) return 10;
    const max = Math.max(...ranking.map(r => r.participant.points));
    return Math.max(max, competition?.goalTarget || 10);
  }, [ranking, competition]);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Group bracket matches by round
  const matchesByRound = useMemo(() => {
    const map = new Map<number, any[]>();
    if (bracketMatches) {
      for (const m of bracketMatches) {
        const round = m.round || 1;
        if (!map.has(round)) map.set(round, []);
        map.get(round)!.push(m);
      }
    }
    return map;
  }, [bracketMatches]);

  const totalRounds = matchesByRound.size;
  const roundName = (round: number) => {
    const diff = totalRounds - round;
    if (diff === 0) return "FINAL";
    if (diff === 1) return "SEMIFINAL";
    if (diff === 2) return "QUARTAS DE FINAL";
    return `RODADA ${round}`;
  };

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando competição...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
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
          {sellerSession && (
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground hover:text-primary" onClick={handlePhotoClick} disabled={uploading}>
              <Camera className="w-3.5 h-3.5" />
              {uploading ? "Enviando..." : "Minha Foto"}
            </Button>
          )}
          {competition.status === "active" && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              AO VIVO
            </span>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-card/30">
        <div className="container flex gap-1 py-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("corrida")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "corrida"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Corrida
          </button>
          {hasBracket && (
            <button
              onClick={() => setActiveTab("matamata")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "matamata"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Swords className="w-3.5 h-3.5" /> Mata-Mata
            </button>
          )}
          {isTeamComp && (
            <button
              onClick={() => setActiveTab("equipes")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "equipes"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Equipes
            </button>
          )}
        </div>
      </div>

      <div className="container py-6">
        {/* Goal Progress Bar */}
        {competition.goalTarget && competition.goalTarget > 0 && ranking && ranking.length > 0 && activeTab === "corrida" && (
          <div className="racing-card p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-heading font-bold text-foreground">META DA COMPETIÇÃO</span>
            </div>
            {(() => {
              const totalPoints = ranking.reduce((sum, r) => sum + r.participant.points, 0);
              const pct = Math.min(100, Math.round((totalPoints / competition.goalTarget!) * 100));
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

        {/* ===== CORRIDA TAB ===== */}
        {activeTab === "corrida" && (
          <>
            {/* Race Track - Individual */}
            {!isTeamComp && ranking && ranking.length > 0 && (
              <div>
                {ranking.length >= 3 && (
                  <div className="flex items-end justify-center gap-3 sm:gap-6 mb-8 py-4">
                    {/* 2nd place */}
                    <div className="flex flex-col items-center">
                      <div className="relative mb-2">
                        <PlayerAvatar name={ranking[1]?.seller?.name || "?"} photoUrl={ranking[1]?.seller?.competitionPhotoUrl || ranking[1]?.seller?.photoUrl} size="lg" borderColor="#9ca3af" isMe={mySellerId === ranking[1]?.seller?.id} onPhotoChange={handlePhotoClick} />
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
                        <PlayerAvatar name={ranking[0]?.seller?.name || "?"} photoUrl={ranking[0]?.seller?.competitionPhotoUrl || ranking[0]?.seller?.photoUrl} size="xl" borderColor="#eab308" isMe={mySellerId === ranking[0]?.seller?.id} onPhotoChange={handlePhotoClick} />
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
                        <PlayerAvatar name={ranking[2]?.seller?.name || "?"} photoUrl={ranking[2]?.seller?.competitionPhotoUrl || ranking[2]?.seller?.photoUrl} size="md" borderColor="#b45309" isMe={mySellerId === ranking[2]?.seller?.id} onPhotoChange={handlePhotoClick} />
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
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-heading font-bold text-lg shadow"
                          style={{ backgroundColor: team.team.color }}>
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
          </>
        )}

        {/* ===== MATA-MATA TAB ===== */}
        {activeTab === "matamata" && hasBracket && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Swords className="h-5 w-5 text-red-400" />
              <h2 className="font-heading font-black text-lg text-foreground uppercase tracking-wider">Mata-Mata</h2>
            </div>

            {Array.from(matchesByRound.entries())
              .sort(([a], [b]) => a - b)
              .map(([round, matches]) => (
                <div key={round} className="space-y-3">
                  {/* Round divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gradient-to-r from-red-500/30 to-transparent" />
                    <span className="text-[10px] font-heading font-black text-red-400 uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                      {roundName(round)}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-l from-red-500/30 to-transparent" />
                  </div>

                  {/* Match cards */}
                  {matches
                    .sort((a: any, b: any) => (a.matchOrder || 0) - (b.matchOrder || 0))
                    .map((match: any) => (
                      <FootballMatchCard
                        key={match.id}
                        match={match}
                        roundLabel={matches.length === 1 || round === totalRounds ? roundName(round) : undefined}
                        mySellerId={mySellerId}
                        onPhotoChange={handlePhotoClick}
                      />
                    ))}
                </div>
              ))}
          </div>
        )}

        {/* ===== EQUIPES TAB ===== */}
        {activeTab === "equipes" && isTeamComp && teamRanking && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <h2 className="font-heading font-black text-lg text-foreground uppercase tracking-wider">Equipes</h2>
            </div>

            {teamRanking.map((team, idx) => (
              <div key={team.team.id} className="rounded-2xl border border-border/50 overflow-hidden">
                <div className="p-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${team.team.color}20, transparent)` }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-heading font-black text-lg shadow-lg"
                    style={{ backgroundColor: team.team.color }}>
                    {team.team.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-black text-foreground">{team.team.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-primary font-heading font-bold">{team.totalPoints} pts</span>
                      <span className="text-xs text-muted-foreground">{team.totalSales} vendas</span>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-black text-sm ${
                    idx === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-white" :
                    idx === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white" :
                    idx === 2 ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white" :
                    "bg-accent text-accent-foreground"
                  }`}>
                    #{idx + 1}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {team.members.map(member => (
                    <div key={member.participant.id} className="flex items-center gap-3 p-2 rounded-xl bg-background/50">
                      <PlayerAvatar name={member.seller?.name || "?"} photoUrl={member.seller?.competitionPhotoUrl || member.seller?.photoUrl} size="sm" borderColor={team.team.color} />
                      <span className="text-xs text-foreground flex-1 truncate font-semibold">{member.seller?.nickname || member.seller?.name}</span>
                      <span className="text-xs font-heading font-bold text-primary">{member.participant.points} pts</span>
                      <span className="text-[10px] text-muted-foreground">{member.participant.salesCount}v</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {activeTab === "corrida" && (!ranking || ranking.length === 0) && (!teamRanking || teamRanking.length === 0) && (
          <div className="racing-card p-12 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-bold text-lg text-foreground mb-2">Nenhum participante ainda</h3>
            <p className="text-muted-foreground">O administrador precisa adicionar vendedores a esta competição.</p>
          </div>
        )}

        {activeTab === "matamata" && !hasBracket && (
          <div className="racing-card p-12 text-center">
            <Swords className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-bold text-lg text-foreground mb-2">Mata-Mata não iniciado</h3>
            <p className="text-muted-foreground">O administrador precisa sortear as chaves do Mata-Mata.</p>
          </div>
        )}
      </div>
    </div>
  );
}
