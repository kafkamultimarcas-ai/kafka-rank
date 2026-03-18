import { useEffect, useRef, useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";

interface FeedAlert {
  id: number;
  type: "new_sale" | "overtake";
  sellerName: string;
  sellerPhoto: string | null;
  vehicleModel: string | null;
  value: number | null;
  message: string;
  timestamp: number;
}

// Generate alert sounds using Web Audio API
function playSound(type: "sale" | "overtake") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === "sale") {
      // Short cheerful beep for new sale
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } else {
      // Racing engine rev sound for overtake
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.6);
    }
  } catch (e) {
    // Audio not supported, silently fail
  }
}

export function useLiveFeed() {
  const [alerts, setAlerts] = useState<FeedAlert[]>([]);
  const lastCheckRef = useRef(Date.now() - 60000); // Start checking from 1 min ago
  const previousRankingRef = useRef<Map<number, number>>(new Map());
  const seenSaleIdsRef = useRef<Set<number>>(new Set());

  // Poll for recent sales every 10 seconds
  const { data: recentSales } = trpc.feed.recent.useQuery(
    { since: lastCheckRef.current },
    {
      refetchInterval: 10000,
      refetchIntervalInBackground: false,
    }
  );

  // Poll ranking for overtake detection
  const { data: sellersList } = trpc.sellers.list.useQuery(
    { activeOnly: true },
    { refetchInterval: 10000 }
  );

  // Process new sales
  useEffect(() => {
    if (!recentSales || recentSales.length === 0) return;

    const newAlerts: FeedAlert[] = [];

    for (const sale of recentSales) {
      if (seenSaleIdsRef.current.has(sale.id)) continue;
      seenSaleIdsRef.current.add(sale.id);

      newAlerts.push({
        id: sale.id,
        type: "new_sale",
        sellerName: sale.sellerNickname || sale.sellerName || "Vendedor",
        sellerPhoto: sale.sellerPhoto,
        vehicleModel: sale.vehicleModel,
        value: sale.value,
        message: `${sale.sellerNickname || sale.sellerName} vendeu um ${sale.vehicleModel || "veículo"}!`,
        timestamp: Date.now(),
      });
    }

    if (newAlerts.length > 0) {
      playSound("sale");
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));
    }
  }, [recentSales]);

  // Detect overtakes
  useEffect(() => {
    if (!sellersList || sellersList.length === 0) return;

    const currentRanking = new Map<number, number>();
    const sorted = [...sellersList].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
    sorted.forEach((seller, index) => {
      currentRanking.set(seller.id, index + 1);
    });

    if (previousRankingRef.current.size > 0) {
      for (const [sellerId, currentPos] of Array.from(currentRanking.entries())) {
        const prevPos = previousRankingRef.current.get(sellerId);
        if (prevPos && currentPos < prevPos) {
          const seller = sellersList.find(s => s.id === sellerId);
          if (seller) {
            const overtakenSeller = sorted[currentPos]; // The one who was overtaken
            const alertId = Date.now() + sellerId;
            if (!seenSaleIdsRef.current.has(alertId)) {
              seenSaleIdsRef.current.add(alertId);
              playSound("overtake");
              setAlerts(prev => [{
                id: alertId,
                type: "overtake" as const,
                sellerName: seller.nickname || seller.name,
                sellerPhoto: seller.photoUrl,
                vehicleModel: null,
                value: null,
                message: `${seller.nickname || seller.name} ultrapassou e subiu para ${currentPos}° lugar!`,
                timestamp: Date.now(),
              }, ...prev].slice(0, 10));
            }
          }
        }
      }
    }

    previousRankingRef.current = currentRanking;
  }, [sellersList]);

  // Auto-dismiss alerts after 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setAlerts(prev => prev.filter(a => Date.now() - a.timestamp < 15000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dismissAlert = useCallback((id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return { alerts, dismissAlert };
}
