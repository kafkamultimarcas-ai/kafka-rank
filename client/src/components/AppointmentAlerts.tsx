import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Phone, X, AlertTriangle } from "lucide-react";

interface AppointmentAlertsProps {
  sellerId?: number;
}

function playUrgentSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Urgent alarm: rapid beeps
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(800, ctx.currentTime + i * 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.15);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.15);
    }
  } catch {
    // Audio not supported
  }
}

export default function AppointmentAlerts({ sellerId }: AppointmentAlertsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const soundPlayedRef = useRef<Set<number>>(new Set());

  const { data: expiringAppointments } = trpc.alerts.checkExpiringAppointments.useQuery(
    { sellerId: sellerId || 0 },
    {
      enabled: !!sellerId,
      refetchInterval: 30000, // Check every 30 seconds
    }
  );

  // Play sound for new expiring appointments
  useEffect(() => {
    if (!expiringAppointments) return;
    for (const apt of expiringAppointments) {
      if (!soundPlayedRef.current.has(apt.id) && !dismissedIds.has(apt.id)) {
        soundPlayedRef.current.add(apt.id);
        playUrgentSound();
      }
    }
  }, [expiringAppointments, dismissedIds]);

  const visibleAlerts = (expiringAppointments || []).filter(a => !dismissedIds.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 max-w-sm mx-auto pointer-events-none">
      <AnimatePresence>
        {visibleAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 20 }}
            className="pointer-events-auto"
          >
            <div className={`rounded-xl border shadow-2xl backdrop-blur-md overflow-hidden ${
              alert.status === 'expired'
                ? 'bg-red-950/95 border-red-500/60'
                : 'bg-orange-950/95 border-orange-500/60'
            }`}>
              {/* Pulsing top bar */}
              <div className={`h-1.5 w-full animate-pulse ${
                alert.status === 'expired'
                  ? 'bg-gradient-to-r from-red-600 via-red-400 to-red-600'
                  : 'bg-gradient-to-r from-orange-600 via-yellow-400 to-orange-600'
              }`} />

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    alert.status === 'expired'
                      ? 'bg-red-500/30 animate-pulse'
                      : 'bg-orange-500/30'
                  }`}>
                    {alert.status === 'expired' ? (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-orange-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-wider ${
                      alert.status === 'expired' ? 'text-red-400' : 'text-orange-400'
                    }`}>
                      {alert.status === 'expired' ? 'Cliente n\u00e3o veio!' : 'Agendamento em breve!'}
                    </p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {alert.customerName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {alert.minutesLeft <= 0
                        ? `Hor\u00e1rio passou h\u00e1 ${Math.abs(alert.minutesLeft)} min - Ligue agora!`
                        : `Chega em ${alert.minutesLeft} minutos`
                      }
                    </p>
                  </div>

                  <button
                    onClick={() => setDismissedIds(prev => { const next = new Set(Array.from(prev)); next.add(alert.id); return next; })}
                    className="flex-shrink-0 text-white/50 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
