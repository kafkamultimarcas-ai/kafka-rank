import { useLiveFeed } from "@/hooks/useLiveFeed";
import { X, Zap, TrendingUp, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LiveAlerts() {
  const { alerts, dismissAlert } = useLiveFeed();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="pointer-events-auto"
          >
            <div
              className={`relative overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md ${
                alert.type === "overtake"
                  ? "bg-yellow-950/90 border-yellow-500/50"
                  : "bg-emerald-950/90 border-emerald-500/50"
              }`}
            >
              {/* Animated gradient bar on top */}
              <div
                className={`h-1 w-full ${
                  alert.type === "overtake"
                    ? "bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500"
                    : "bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500"
                }`}
                style={{
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s linear infinite",
                }}
              />

              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Seller photo or icon */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                      alert.type === "overtake"
                        ? "bg-yellow-500/20 ring-2 ring-yellow-500"
                        : "bg-emerald-500/20 ring-2 ring-emerald-500"
                    }`}
                  >
                    {alert.sellerPhoto ? (
                      <img
                        src={alert.sellerPhoto}
                        alt={alert.sellerName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-white">
                        {alert.sellerName.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Alert type badge */}
                    <div className="flex items-center gap-2 mb-1">
                      {alert.type === "overtake" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-400 uppercase tracking-wider">
                          <TrendingUp className="h-3 w-3" />
                          Ultrapassagem!
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          <Zap className="h-3 w-3" />
                          Nova Venda!
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <p className="text-sm font-semibold text-white leading-tight">
                      {alert.message}
                    </p>

                    {/* Value if available */}
                    {alert.value && (
                      <p className="flex items-center gap-1 mt-1 text-xs text-emerald-400 font-mono">
                        <DollarSign className="h-3 w-3" />
                        R$ {alert.value.toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="flex-shrink-0 text-white/50 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Auto-dismiss progress bar */}
              <div className="h-0.5 bg-white/10">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 15, ease: "linear" }}
                  className={`h-full ${
                    alert.type === "overtake" ? "bg-yellow-500" : "bg-emerald-500"
                  }`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
