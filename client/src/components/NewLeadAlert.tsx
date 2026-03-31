import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { AlertTriangle, X, MessageCircle, Phone, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewLeadAlertProps {
  sellerId: number;
}

// Aggressive alert sound - loud siren-like beep
function playNewLeadSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // First beep - high urgency
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      const startTime = ctx.currentTime + i * 0.3;
      osc.frequency.setValueAtTime(880, startTime);
      osc.frequency.setValueAtTime(1100, startTime + 0.1);
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    }
  } catch {
    // Audio not supported
  }
}

// Vibrate device if supported
function vibrateDevice() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  } catch {}
}

export default function NewLeadAlert({ sellerId }: NewLeadAlertProps) {
  const [, setLocation] = useLocation();
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(() => {
    try {
      const stored = sessionStorage.getItem(`dismissed_lead_alerts_${sellerId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [hasPlayedSound, setHasPlayedSound] = useState<Set<number>>(new Set());
  const prevLeadIdsRef = useRef<Set<number>>(new Set());

  // Poll for urgent notifications (new leads) every 10 seconds
  const { data: notifications } = trpc.notifications.list.useQuery(
    { sellerId },
    { refetchInterval: 10000, enabled: !!sellerId }
  );

  // Filter only unread urgent/new lead notifications from last 30 min
  const newLeadAlerts = (notifications || []).filter((n: any) => {
    if (n.read) return false;
    if (dismissedIds.has(n.id)) return false;
    // Only show urgent type (new lead / transfer)
    if (n.type !== 'urgent') return false;
    // Only show notifications from last 30 min
    const age = Date.now() - new Date(n.createdAt).getTime();
    if (age > 30 * 60 * 1000) return false;
    return true;
  });

  // Play sound and vibrate when new alerts appear
  useEffect(() => {
    if (newLeadAlerts.length === 0) return;
    const currentIds = new Set(newLeadAlerts.map((n: any) => n.id));
    const newIds = Array.from(currentIds).filter(id => !prevLeadIdsRef.current.has(id) && !hasPlayedSound.has(id));
    
    if (newIds.length > 0) {
      playNewLeadSound();
      vibrateDevice();
      setHasPlayedSound(prev => {
        const next = new Set(prev);
        newIds.forEach(id => next.add(id));
        return next;
      });
    }
    prevLeadIdsRef.current = currentIds;
  }, [newLeadAlerts, hasPlayedSound]);

  const handleDismiss = useCallback((id: number) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try { sessionStorage.setItem(`dismissed_lead_alerts_${sellerId}`, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }, [sellerId]);

  const handleDismissAll = useCallback(() => {
    const allIds = newLeadAlerts.map((n: any) => n.id);
    setDismissedIds(prev => {
      const next = new Set(prev);
      allIds.forEach((id: number) => next.add(id));
      try { sessionStorage.setItem(`dismissed_lead_alerts_${sellerId}`, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }, [newLeadAlerts, sellerId]);

  const handleGoToCRM = useCallback(() => {
    setLocation("/crm");
  }, [setLocation]);

  if (newLeadAlerts.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-[100] px-2 pt-2 pointer-events-none">
      <div className="max-w-lg mx-auto space-y-2">
        {newLeadAlerts.slice(0, 3).map((alert: any) => (
          <div
            key={alert.id}
            className="pointer-events-auto animate-pulse-fast rounded-xl border-2 border-red-500 bg-gradient-to-r from-red-950 via-red-900 to-red-950 shadow-2xl shadow-red-500/30 overflow-hidden"
          >
            {/* Red urgency bar */}
            <div className="h-1.5 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 animate-shimmer" />
            
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/30 border-2 border-red-400 flex items-center justify-center animate-bounce-slow">
                    <Zap className="h-6 w-6 text-red-300" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-red-100 truncate">{alert.title}</h3>
                    <p className="text-sm text-red-300/90 mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-800/50 text-red-400 hover:text-red-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleGoToCRM}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold gap-2 h-10 text-sm shadow-lg"
                >
                  <MessageCircle className="h-4 w-4" />
                  VER LEAD AGORA
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDismiss(alert.id)}
                  className="border-red-700 text-red-300 hover:bg-red-900/50 h-10"
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        ))}

        {newLeadAlerts.length > 3 && (
          <div className="pointer-events-auto text-center">
            <button
              onClick={handleGoToCRM}
              className="text-sm text-red-400 font-bold underline hover:text-red-300"
            >
              + {newLeadAlerts.length - 3} alertas • Ver todos no CRM
            </button>
          </div>
        )}

        {newLeadAlerts.length > 1 && (
          <div className="pointer-events-auto text-center pb-1">
            <button
              onClick={handleDismissAll}
              className="text-xs text-red-500/60 hover:text-red-400 transition-colors"
            >
              Dispensar todos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
