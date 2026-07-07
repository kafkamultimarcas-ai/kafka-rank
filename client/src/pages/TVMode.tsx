import { trpc } from "@/lib/trpc";
import { Trophy, Zap, Target, Award, X } from "lucide-react";
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

function TVRaceCar({ seller, points, maxPoints, rank, color }: {
  seller: { name: string; nickname?: string | null; photoUrl?: string | null };
  points: number; maxPoints: number; rank: number; color: string;
}) {
  const progress = maxPoints > 0 ? Math.max(5, Math.min(90, (points / maxPoints) * 85 + 5)) : 5;

  return (
    <div className="relative mb-2">
      <div className="relative h-14 rounded-lg bg-white/5 border border-white/10 overflow-hidden">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <span className={`text-sm font-bold ${rank <= 3 ? "text-orange-400" : "text-white/40"}`}>P{rank}</span>
        </div>
        <div
          className="absolute top-1/2 flex items-center gap-2 transition-all duration-[2000ms] ease-out"
          style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
        >
          {seller.photoUrl ? (
            <img src={seller.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover border-2 shadow-lg" style={{ borderColor: color }} />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white border-2" style={{ backgroundColor: color, borderColor: color }}>
              {seller.name.charAt(0)}
            </div>
          )}
          <svg width="48" height="24" viewBox="0 0 48 24" className="drop-shadow-md">
            <path d="M3 17 L6 6 L16 4 L34 4 L42 8 L46 17 Z" fill={color} opacity="0.9" />
            <circle cx="13" cy="20" r="3.5" fill="#111" />
            <circle cx="37" cy="20" r="3.5" fill="#111" />
          </svg>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-2" style={{
          background: "repeating-conic-gradient(#fff 0% 25%, #333 0% 50%) 0 0 / 4px 4px",
        }} />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-right">
          <p className="text-xs font-bold text-white truncate max-w-[100px]">{seller.nickname || seller.name}</p>
          <p className="text-[10px] font-bold text-orange-400">{points} pts</p>
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
        <div className={`px-8 py-6 rounded-2xl border-2 shadow-2xl backdrop-blur-xl ${
          alert.type === "newLeader" ? "bg-yellow-500/20 border-yellow-500" :
          alert.type === "overtake" ? "bg-red-500/20 border-red-500" :
          "bg-green-500/20 border-green-500"
        }`}>
          <p className="text-lg font-bold text-white/70 uppercase tracking-widest mb-1">
            {alert.type === "newLeader" ? "🏆 NOVA LIDERANÇA!" :
             alert.type === "overtake" ? "⚡ ULTRAPASSAGEM!" :
             "🎯 NOVA VENDA!"}
          </p>
          <p className="text-3xl sm:text-4xl font-heading font-black text-white mb-1">{alert.title}</p>
          <p className="text-lg text-white/80">{alert.subtitle}</p>
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

    // Check for position changes
    ranking.forEach(entry => {
      const prevEntry = prev.find(p => p.participant.sellerId === entry.participant.sellerId);
      if (!prevEntry) return;

      const name = entry.seller?.nickname || entry.seller?.name || "?";

      // New leader
      if (entry.position === 1 && prevEntry.position > 1) {
        newAlerts.push({
          id: ++alertIdRef.current,
          type: "newLeader",
          title: name.toUpperCase(),
          subtitle: "Assumiu a liderança da competição!",
          color: "#F59E0B",
        });
      }
      // Overtake
      else if (entry.position < prevEntry.position && entry.position > 1) {
        newAlerts.push({
          id: ++alertIdRef.current,
          type: "overtake",
          title: `${name} subiu para P${entry.position}!`,
          subtitle: "Ultrapassagem na pista!",
          color: "#EF4444",
        });
      }

      // New points (sale)
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
    <div className="min-h-screen bg-[#0a0a1a] text-white cursor-none" onClick={enterFullscreen}>
      {/* Theatrical Alert */}
      {alerts.length > 0 && <TheatricalAlert alert={alerts[0]} onDone={dismissAlert} />}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-black/40 border-b border-white/10">
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="font-heading font-black text-xl tracking-tight">{brandName.toUpperCase()}</h1>
            <p className="text-xs text-white/50">Competição de Vendas — Ao Vivo</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {activeComp && (
            <div className="text-right">
              <p className="text-sm font-heading font-bold text-orange-400">{activeComp.name}</p>
              <p className="text-xs text-white/40">
                {CATEGORY_LABELS[activeComp.category || "vendas"]}
                {" — "}
                {new Date(activeComp.startDate).toLocaleDateString("pt-BR")} a {new Date(activeComp.endDate).toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="font-heading font-bold text-2xl tabular-nums">
              {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs text-white/40">{time.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); document.exitFullscreen?.(); window.history.back(); }}
            className="p-2 hover:bg-white/10 rounded-lg cursor-pointer"
          >
            <X className="h-5 w-5 text-white/40" />
          </button>
        </div>
      </header>

      <div className="flex gap-6 p-6 h-[calc(100vh-64px)]">
        {/* Left: Race Track */}
        <div className="flex-1 flex flex-col">
          {/* Podium */}
          {ranking && ranking.length >= 3 && (
            <div className="flex items-end justify-center gap-6 mb-6 py-4">
              {/* 2nd */}
              <div className="flex flex-col items-center">
                {ranking[1]?.seller?.photoUrl ? (
                  <img src={ranking[1].seller.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-400 shadow-lg mb-1" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-lg font-bold border-2 border-gray-400 mb-1">
                    {ranking[1]?.seller?.name?.charAt(0)}
                  </div>
                )}
                <p className="text-sm font-bold truncate max-w-[90px]">{ranking[1]?.seller?.nickname || ranking[1]?.seller?.name}</p>
                <p className="text-xs text-orange-400 font-bold">{ranking[1]?.participant.points} pts</p>
                <div className="w-20 h-14 bg-gray-700/50 rounded-t-lg mt-1 flex items-center justify-center border border-white/10">
                  <span className="font-heading text-2xl font-bold text-gray-400">2</span>
                </div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center -mt-6">
                <Trophy className="h-8 w-8 text-yellow-500 mb-1" />
                {ranking[0]?.seller?.photoUrl ? (
                  <img src={ranking[0].seller.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border-3 border-yellow-500 shadow-lg mb-1" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-yellow-600 flex items-center justify-center text-2xl font-bold border-3 border-yellow-500 mb-1">
                    {ranking[0]?.seller?.name?.charAt(0)}
                  </div>
                )}
                <p className="text-base font-black truncate max-w-[110px]">{ranking[0]?.seller?.nickname || ranking[0]?.seller?.name}</p>
                <p className="text-sm text-orange-400 font-bold">{ranking[0]?.participant.points} pts</p>
                <div className="w-24 h-18 bg-yellow-500/20 rounded-t-lg mt-1 flex items-center justify-center border border-yellow-500/50">
                  <span className="font-heading text-3xl font-bold text-yellow-500">1</span>
                </div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center">
                {ranking[2]?.seller?.photoUrl ? (
                  <img src={ranking[2].seller.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-amber-700 shadow-lg mb-1" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-amber-800 flex items-center justify-center text-base font-bold border-2 border-amber-700 mb-1">
                    {ranking[2]?.seller?.name?.charAt(0)}
                  </div>
                )}
                <p className="text-sm font-bold truncate max-w-[90px]">{ranking[2]?.seller?.nickname || ranking[2]?.seller?.name}</p>
                <p className="text-xs text-orange-400 font-bold">{ranking[2]?.participant.points} pts</p>
                <div className="w-18 h-12 bg-amber-900/30 rounded-t-lg mt-1 flex items-center justify-center border border-white/10">
                  <span className="font-heading text-xl font-bold text-amber-700">3</span>
                </div>
              </div>
            </div>
          )}

          {/* Race Lanes */}
          <div className="flex-1 overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-orange-400" />
              <h2 className="font-heading font-bold text-base text-white/80">PISTA DE COMPETIÇÃO</h2>
            </div>
            {ranking && ranking.map((entry, idx) => (
              <TVRaceCar
                key={entry.participant.id}
                seller={entry.seller || { name: "?" }}
                points={entry.participant.points}
                maxPoints={maxPoints}
                rank={entry.position}
                color={CAR_COLORS[idx % CAR_COLORS.length]}
              />
            ))}
            {(!ranking || ranking.length === 0) && (
              <div className="flex items-center justify-center h-40 text-white/30">
                <p>Nenhuma competição ativa</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats & Goals */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          {/* Competition Goal */}
          {activeComp?.goalTarget && activeComp.goalTarget > 0 && ranking && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-orange-400" />
                <span className="text-xs font-heading font-bold text-white/70">META DA COMPETIÇÃO</span>
              </div>
              {(() => {
                const total = ranking.reduce((s, r) => s + r.participant.points, 0);
                const pct = Math.min(100, Math.round((total / activeComp.goalTarget) * 100));
                return (
                  <>
                    <div className="flex items-end justify-between mb-2">
                      <span className="font-heading font-bold text-3xl">{total}</span>
                      <span className="text-sm text-white/40">/ {activeComp.goalTarget}</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? "bg-emerald-500" : "bg-orange-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-white/40 mt-1">{pct}% concluído</p>
                    {pct >= 100 && (
                      <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-bold">
                        <Award className="h-3 w-3" /> META BATIDA!
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
              <div key={goal.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-heading font-bold text-white/70">
                    META {CATEGORY_LABELS[goal.category]?.toUpperCase() || "LOJA"}
                  </span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="font-heading font-bold text-2xl">{goal.currentValue}</span>
                  <span className="text-sm text-white/40">/ {goal.targetValue}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? "bg-emerald-500" : "bg-orange-500"}`} style={{ width: `${pct}%` }} />
                </div>
                {goal.bonusDescription && (
                  <p className="text-[10px] text-yellow-400 mt-2 flex items-center gap-1">
                    <Award className="h-3 w-3" /> {goal.bonusDescription}
                  </p>
                )}
              </div>
            );
          })}

          {/* Ranking Table */}
          {ranking && ranking.length > 0 && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex-1 overflow-auto">
              <h3 className="text-xs font-heading font-bold text-white/70 mb-3">CLASSIFICAÇÃO</h3>
              <div className="space-y-2">
                {ranking.map((entry, idx) => (
                  <div key={entry.participant.id} className="flex items-center gap-2">
                    <span className={`w-6 text-center text-xs font-bold ${idx < 3 ? "text-orange-400" : "text-white/40"}`}>
                      {entry.position}
                    </span>
                    {entry.seller?.photoUrl ? (
                      <img src={entry.seller.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: CAR_COLORS[idx % CAR_COLORS.length] }}>
                        {entry.seller?.name?.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-medium text-white truncate flex-1">{entry.seller?.nickname || entry.seller?.name}</span>
                    <span className="text-xs font-bold text-orange-400 tabular-nums">{entry.participant.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS for bounce animation */}
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
