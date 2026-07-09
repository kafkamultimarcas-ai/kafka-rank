import { trpc } from "@/lib/trpc";
import { Trophy, Zap, Target, Award, X, Flame } from "lucide-react";
import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useBranding } from "@/contexts/TenantContext";

const CAR_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

const CATEGORY_LABELS: Record<string, string> = {
  vendas: "Vendas", fei: "F&I", consignacao: "Consignação",
  despachante: "Despachante", feirao: "Feirão", pre_vendas: "Pré-Vendas",
};

type AlertType = {
  id: number;
  type: "overtake" | "newLeader" | "sale";
  title: string;
  subtitle: string;
  color: string;
};

function TVRaceCar({ seller, points, maxPoints, rank, color, isLeader }: {
  seller: { name: string; nickname?: string | null; photoUrl?: string | null; competitionPhotoUrl?: string | null };
  points: number; maxPoints: number; rank: number; color: string; isLeader?: boolean;
}) {
  const progress = maxPoints > 0 ? Math.max(5, Math.min(92, (points / maxPoints) * 87 + 5)) : 5;
  const photo = seller.competitionPhotoUrl || seller.photoUrl;

  return (
    <div className="relative mb-1.5 group">
      <div className={`relative h-16 rounded-lg overflow-hidden transition-all ${
        isLeader ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border border-yellow-500/30 shadow-lg shadow-yellow-500/10" :
        rank <= 3 ? "bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10" :
        "bg-white/[0.03] border border-white/5"
      }`}>
        {/* Track lines */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 98%, rgba(255,255,255,0.1) 98%, rgba(255,255,255,0.1) 100%)",
          backgroundSize: "10% 100%"
        }} />

        {/* Position badge */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
            rank === 1 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/50" :
            rank === 2 ? "bg-gray-400 text-black" :
            rank === 3 ? "bg-amber-700 text-white" :
            "bg-white/10 text-white/50"
          }`}>
            {rank}
          </div>
        </div>

        {/* Car + Avatar moving */}
        <div
          className="absolute top-1/2 flex items-center gap-1.5 transition-all duration-[2500ms] ease-out"
          style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
        >
          {photo ? (
            <img src={photo} alt="" className={`w-10 h-10 rounded-full object-cover border-2 shadow-lg ${
              isLeader ? "ring-2 ring-yellow-400/50" : ""
            }`} style={{ borderColor: color }} />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 shadow-lg" style={{ backgroundColor: color, borderColor: color }}>
              {seller.name.charAt(0)}
            </div>
          )}
          {/* Car SVG */}
          <svg width="52" height="26" viewBox="0 0 52 26" className="drop-shadow-lg">
            <defs>
              <linearGradient id={`car-${rank}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <path d="M4 18 L7 7 L17 4 L36 4 L44 8 L48 18 Z" fill={`url(#car-${rank})`} />
            <path d="M12 7 L16 4 L28 4 L24 7 Z" fill="rgba(255,255,255,0.3)" />
            <circle cx="14" cy="21" r="4" fill="#111" stroke="#333" strokeWidth="1" />
            <circle cx="14" cy="21" r="1.5" fill="#555" />
            <circle cx="39" cy="21" r="4" fill="#111" stroke="#333" strokeWidth="1" />
            <circle cx="39" cy="21" r="1.5" fill="#555" />
            {isLeader && <circle cx="48" cy="10" r="2" fill="#F59E0B" className="animate-pulse" />}
          </svg>
          {isLeader && <Flame className="w-4 h-4 text-orange-400 animate-pulse absolute -top-3 left-6" />}
        </div>

        {/* Finish line */}
        <div className="absolute right-0 top-0 bottom-0 w-2" style={{
          background: "repeating-conic-gradient(#fff 0% 25%, #222 0% 50%) 0 0 / 5px 5px",
        }} />

        {/* Name + Points */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-right z-10">
          <p className={`text-sm font-bold truncate max-w-[120px] ${isLeader ? "text-yellow-300" : "text-white"}`}>
            {seller.nickname || seller.name}
          </p>
          <p className={`text-xs font-bold tabular-nums ${isLeader ? "text-yellow-400" : "text-orange-400"}`}>
            {points} pts
          </p>
        </div>
      </div>
    </div>
  );
}

function TheatricalAlert({ alert, onDone }: { alert: AlertType; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 5000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="animate-bounce-in text-center">
        <div className={`px-10 py-8 rounded-2xl border-2 shadow-2xl backdrop-blur-xl ${
          alert.type === "newLeader" ? "bg-yellow-500/20 border-yellow-500 shadow-yellow-500/30" :
          alert.type === "overtake" ? "bg-red-500/20 border-red-500 shadow-red-500/30" :
          "bg-green-500/20 border-green-500 shadow-green-500/30"
        }`}>
          <p className="text-xl font-bold text-white/70 uppercase tracking-[0.3em] mb-2">
            {alert.type === "newLeader" ? "NOVA LIDERANÇA!" :
             alert.type === "overtake" ? "ULTRAPASSAGEM!" :
             "NOVA VENDA!"}
          </p>
          <p className="text-4xl sm:text-5xl font-heading font-black text-white mb-2">{alert.title}</p>
          <p className="text-xl text-white/80">{alert.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function TVMode() {
  const { logoUrl, name: brandName } = useBranding();
  const { data: competitions } = trpc.competitions.list.useQuery({ status: "active" }, { refetchInterval: 10000 });
  const activeComp = competitions?.[0];
  const compId = activeComp?.id || 0;

  const { data: ranking } = trpc.competitions.ranking.useQuery(
    { id: compId },
    { enabled: compId > 0, refetchInterval: 10000 }
  );

  const now = new Date();
  const { data: goals } = trpc.goals.list.useQuery({ month: now.getMonth() + 1, year: now.getFullYear() });
  const storeGoals = useMemo(() => (goals || []).filter(g => g.type === "store"), [goals]);

  const maxPoints = useMemo(() => {
    if (!ranking || ranking.length === 0) return 10;
    const max = Math.max(...ranking.map(r => r.participant.points));
    return Math.max(max, activeComp?.goalTarget || 10);
  }, [ranking, activeComp]);

  // Alerts system
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const prevRankingRef = useRef<typeof ranking>(null);
  const alertIdRef = useRef(0);

  useEffect(() => {
    if (!ranking || !prevRankingRef.current) {
      prevRankingRef.current = ranking;
      return;
    }
    const prev = prevRankingRef.current;
    const newAlerts: AlertType[] = [];

    ranking.forEach(entry => {
      const prevEntry = prev.find(p => p.participant.sellerId === entry.participant.sellerId);
      if (!prevEntry) return;

      const name = entry.seller?.nickname || entry.seller?.name || "?";

      if (entry.position === 1 && prevEntry.position > 1) {
        newAlerts.push({
          id: ++alertIdRef.current,
          type: "newLeader",
          title: name.toUpperCase(),
          subtitle: "Assumiu a liderança da competição!",
          color: "#F59E0B",
        });
      } else if (entry.position < prevEntry.position && entry.position > 1) {
        newAlerts.push({
          id: ++alertIdRef.current,
          type: "overtake",
          title: `${name} subiu para P${entry.position}!`,
          subtitle: "Ultrapassagem na pista!",
          color: "#EF4444",
        });
      }

      if (entry.participant.points > prevEntry.participant.points) {
        const diff = entry.participant.points - prevEntry.participant.points;
        if (!newAlerts.some(a => a.type === "newLeader" || a.type === "overtake")) {
          newAlerts.push({
            id: ++alertIdRef.current,
            type: "sale",
            title: name,
            subtitle: `+${diff} ponto${diff > 1 ? "s" : ""}!`,
            color: "#10B981",
          });
        }
      }
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
    }
    prevRankingRef.current = ranking;
  }, [ranking]);

  const dismissAlert = useCallback(() => {
    setAlerts(prev => prev.slice(1));
  }, []);

  // Clock
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen
  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    enterFullscreen();
  }, []);

  return (
    <div className="min-h-screen bg-[#060612] text-white cursor-none select-none" onClick={enterFullscreen}>
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a2e] via-[#060612] to-[#1a0a0a] pointer-events-none" />
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(239,68,68,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.06) 0%, transparent 40%)"
      }} />

      {/* Theatrical Alert */}
      {alerts.length > 0 && <TheatricalAlert alert={alerts[0]} onDone={dismissAlert} />}

      {/* Header */}
      <header className="relative flex items-center justify-between px-8 py-4 bg-black/50 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-5">
          <img src={logoUrl} alt="" className="h-12 w-12 rounded-xl shadow-lg" />
          <div>
            <h1 className="font-heading font-black text-2xl tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              {brandName.toUpperCase()}
            </h1>
            <p className="text-xs text-white/40 tracking-wider">Competição de Vendas — Ao Vivo</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          {activeComp && (
            <div className="text-right">
              <p className="text-base font-heading font-bold text-orange-400">{activeComp.name}</p>
              <p className="text-xs text-white/40">
                {CATEGORY_LABELS[activeComp.category || "vendas"]}
                {" — "}
                {new Date(activeComp.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} a {new Date(activeComp.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="font-heading font-bold text-3xl tabular-nums tracking-tight">
              {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs text-white/40">{time.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); document.exitFullscreen?.(); window.history.back(); }}
            className="p-2 hover:bg-white/10 rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5 text-white/30" />
          </button>
        </div>
      </header>

      <div className="relative flex gap-6 p-6 h-[calc(100vh-80px)]">
        {/* Left: Race Track */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Podium */}
          {ranking && ranking.length >= 3 && (
            <div className="flex items-end justify-center gap-8 mb-6 py-4">
              {/* 2nd */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {ranking[1]?.seller?.photoUrl ? (
                    <img src={ranking[1].seller.competitionPhotoUrl || ranking[1].seller.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover border-3 border-gray-400 shadow-xl" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center text-xl font-bold border-3 border-gray-400 shadow-xl">
                      {ranking[1]?.seller?.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-sm font-bold truncate max-w-[100px] mt-2">{ranking[1]?.seller?.nickname || ranking[1]?.seller?.name}</p>
                <p className="text-sm text-orange-400 font-bold tabular-nums">{ranking[1]?.participant.points} pts</p>
                <div className="w-24 h-16 bg-gradient-to-t from-gray-700/50 to-gray-600/30 rounded-t-lg mt-2 flex items-center justify-center border border-gray-500/30">
                  <span className="font-heading text-3xl font-black text-gray-400">2</span>
                </div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center -mt-8">
                <Trophy className="h-10 w-10 text-yellow-400 mb-2 drop-shadow-lg animate-pulse" />
                <div className="relative">
                  {ranking[0]?.seller?.photoUrl ? (
                    <img src={ranking[0].seller.competitionPhotoUrl || ranking[0].seller.photoUrl} alt="" className="w-22 h-22 rounded-full object-cover border-4 border-yellow-500 shadow-2xl ring-4 ring-yellow-500/30" style={{ width: "88px", height: "88px" }} />
                  ) : (
                    <div className="rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-3xl font-bold border-4 border-yellow-500 shadow-2xl" style={{ width: "88px", height: "88px" }}>
                      {ranking[0]?.seller?.name?.charAt(0)}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg border-2 border-[#060612]">
                    <span className="text-xs font-black text-black">1</span>
                  </div>
                </div>
                <p className="text-lg font-black truncate max-w-[130px] mt-2 bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                  {ranking[0]?.seller?.nickname || ranking[0]?.seller?.name}
                </p>
                <p className="text-base text-yellow-400 font-bold tabular-nums">{ranking[0]?.participant.points} pts</p>
                <div className="w-28 h-20 bg-gradient-to-t from-yellow-600/30 to-yellow-500/10 rounded-t-lg mt-2 flex items-center justify-center border border-yellow-500/40 shadow-lg shadow-yellow-500/10">
                  <span className="font-heading text-4xl font-black text-yellow-500">1</span>
                </div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {ranking[2]?.seller?.photoUrl ? (
                    <img src={ranking[2].seller.competitionPhotoUrl || ranking[2].seller.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-3 border-amber-700 shadow-xl" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-lg font-bold border-3 border-amber-700 shadow-xl">
                      {ranking[2]?.seller?.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-sm font-bold truncate max-w-[100px] mt-2">{ranking[2]?.seller?.nickname || ranking[2]?.seller?.name}</p>
                <p className="text-sm text-orange-400 font-bold tabular-nums">{ranking[2]?.participant.points} pts</p>
                <div className="w-20 h-12 bg-gradient-to-t from-amber-900/40 to-amber-800/20 rounded-t-lg mt-2 flex items-center justify-center border border-amber-700/30">
                  <span className="font-heading text-2xl font-black text-amber-700">3</span>
                </div>
              </div>
            </div>
          )}

          {/* Race Lanes */}
          <div className="flex-1 overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-orange-400" />
              <h2 className="font-heading font-bold text-lg text-white/80 tracking-wide">PISTA DE COMPETIÇÃO</h2>
              {ranking && ranking.length > 0 && (
                <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  ATUALIZAÇÃO A CADA 10s
                </span>
              )}
            </div>
            {ranking && ranking.map((entry, idx) => (
              <TVRaceCar
                key={entry.participant.id}
                seller={entry.seller || { name: "?" }}
                points={entry.participant.points}
                maxPoints={maxPoints}
                rank={entry.position}
                color={CAR_COLORS[idx % CAR_COLORS.length]}
                isLeader={entry.position === 1}
              />
            ))}
            {(!ranking || ranking.length === 0) && (
              <div className="flex flex-col items-center justify-center h-40 text-white/30 gap-2">
                <Zap className="w-8 h-8 text-white/10" />
                <p className="text-lg">Aguardando competição...</p>
                <p className="text-sm text-white/20">Ative uma competição no painel admin</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats & Goals */}
        <div className="w-80 shrink-0 flex flex-col gap-4 overflow-auto">
          {/* Competition Goal */}
          {activeComp?.goalTarget && activeComp.goalTarget > 0 && ranking && (
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-5 border border-white/10 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-orange-400" />
                <span className="text-sm font-heading font-bold text-white/80 tracking-wide">META DA COMPETIÇÃO</span>
              </div>
              {(() => {
                const total = ranking.reduce((s, r) => s + r.participant.points, 0);
                const pct = Math.min(100, Math.round((total / activeComp.goalTarget) * 100));
                return (
                  <>
                    <div className="flex items-end justify-between mb-3">
                      <span className="font-heading font-black text-4xl tabular-nums">{total}</span>
                      <span className="text-base text-white/40">/ {activeComp.goalTarget}</span>
                    </div>
                    <div className="w-full h-4 rounded-full bg-white/10 overflow-hidden shadow-inner">
                      <div className={`h-full rounded-full transition-all duration-1000 ${
                        pct >= 100 ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/30" :
                        pct >= 75 ? "bg-gradient-to-r from-orange-500 to-yellow-500" :
                        "bg-gradient-to-r from-orange-600 to-orange-400"
                      }`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-sm text-white/50 mt-2 font-bold">{pct}% concluído</p>
                    {pct >= 100 && (
                      <p className="text-sm text-emerald-400 mt-1 flex items-center gap-1 font-bold">
                        <Award className="h-4 w-4" /> META BATIDA! PARABÉNS!
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Store Goals */}
          {storeGoals.map(goal => {
            const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
            return (
              <div key={goal.id} className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-heading font-bold text-white/70 tracking-wide">
                    META {CATEGORY_LABELS[goal.category]?.toUpperCase() || "LOJA"}
                  </span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="font-heading font-bold text-2xl tabular-nums">{goal.currentValue}</span>
                  <span className="text-sm text-white/40">/ {goal.targetValue}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                </div>
                {goal.bonusDescription && (
                  <p className="text-[11px] text-yellow-400 mt-2 flex items-center gap-1 font-medium">
                    <Award className="h-3 w-3" /> {goal.bonusDescription}
                  </p>
                )}
              </div>
            );
          })}

          {/* Ranking Table */}
          {ranking && ranking.length > 0 && (
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-5 border border-white/10 flex-1 overflow-auto">
              <h3 className="text-sm font-heading font-bold text-white/80 mb-4 tracking-wide flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                CLASSIFICAÇÃO GERAL
              </h3>
              <div className="space-y-2.5">
                {ranking.map((entry, idx) => (
                  <div key={entry.participant.id} className={`flex items-center gap-3 py-1.5 px-2 rounded-lg transition-all ${
                    idx === 0 ? "bg-yellow-500/10 border border-yellow-500/20" :
                    idx < 3 ? "bg-white/[0.03]" : ""
                  }`}>
                    <span className={`w-6 text-center text-sm font-black ${
                      idx === 0 ? "text-yellow-400" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-600" : "text-white/30"
                    }`}>
                      {entry.position}
                    </span>
                    {(entry.seller?.competitionPhotoUrl || entry.seller?.photoUrl) ? (
                      <img src={entry.seller.competitionPhotoUrl || entry.seller.photoUrl || ""} alt="" className="w-8 h-8 rounded-full object-cover shadow" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow" style={{ backgroundColor: CAR_COLORS[idx % CAR_COLORS.length] }}>
                        {entry.seller?.name?.charAt(0)}
                      </div>
                    )}
                    <span className={`text-sm font-medium truncate flex-1 ${idx === 0 ? "text-yellow-300 font-bold" : "text-white"}`}>
                      {entry.seller?.nickname || entry.seller?.name}
                    </span>
                    <span className={`text-sm font-bold tabular-nums ${idx === 0 ? "text-yellow-400" : "text-orange-400"}`}>
                      {entry.participant.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        .animate-bounce-in {
          animation: bounceIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
