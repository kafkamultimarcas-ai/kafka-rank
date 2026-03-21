import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, BellRing, X, Check, CheckCheck, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface NotificationCenterProps {
  sellerId?: number;
  isAdmin?: boolean;
}

// Sound generator for notification alerts
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    // Pleasant notification chime: C5 -> E5 -> G5
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not supported
  }
}

export default function NotificationCenter({ sellerId, isAdmin }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const [, setLocation] = useLocation();

  // Fetch notifications
  const { data: notifications, refetch: refetchNotifications } = isAdmin
    ? trpc.notifications.adminList.useQuery(undefined, { refetchInterval: 15000 })
    : trpc.notifications.list.useQuery(
        sellerId ? { sellerId } : undefined,
        { refetchInterval: 15000, enabled: !!sellerId }
      );

  // Unread count
  const { data: unreadData, refetch: refetchUnread } = isAdmin
    ? trpc.notifications.unreadCountAdmin.useQuery(undefined, { refetchInterval: 10000 })
    : trpc.notifications.unreadCountSeller.useQuery(
        { sellerId: sellerId || 0 },
        { refetchInterval: 10000, enabled: !!sellerId }
      );

  const unreadCount = unreadData?.count ?? 0;

  // Play sound when new notification arrives
  useEffect(() => {
    if (unreadCount > prevCount && prevCount > 0) {
      playNotificationSound();
    }
    setPrevCount(unreadCount);
  }, [unreadCount, prevCount]);

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnread();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnread();
    },
  });

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate({
      targetType: isAdmin ? "admin" : "seller",
      sellerId: sellerId,
    });
  }, [isAdmin, sellerId, markAllReadMutation]);

  const handleNotificationClick = (notif: any) => {
    if (!notif.read) {
      markReadMutation.mutate({ id: notif.id });
    }
    if (notif.actionUrl) {
      setLocation(notif.actionUrl);
      setIsOpen(false);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "pending_sale":
      case "pending_fei":
      case "pending_consignment":
      case "pending_dispatch":
        return "📋";
      case "sale_approved":
      case "fei_approved":
      case "consignment_approved":
      case "dispatch_approved":
        return "✅";
      case "overtake":
        return "🔥";
      case "appointment_expiring":
        return "⏰";
      case "inactivity":
        return "👋";
      case "rescue":
        return "🚨";
      default:
        return "🔔";
    }
  };

  const getNotifColor = (type: string) => {
    if (type.includes("pending")) return "border-l-yellow-500";
    if (type.includes("approved")) return "border-l-green-500";
    if (type === "overtake") return "border-l-red-500";
    if (type.includes("expiring") || type === "rescue") return "border-l-orange-500";
    return "border-l-blue-500";
  };

  const timeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-yellow-400 animate-bounce" />
        ) : (
          <Bell className="w-5 h-5 text-gray-400" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-12 z-50 sm:w-96 max-h-[75vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-yellow-400" />
                  Notificações
                  {unreadCount > 0 && (
                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
                      {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Ler tudo
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-700 rounded">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto max-h-[60vh]">
                {!notifications || notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors border-l-4 ${getNotifColor(notif.type)} ${
                        !notif.read ? "bg-gray-800/30" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">{getNotifIcon(notif.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-semibold truncate ${!notif.read ? "text-white" : "text-gray-400"}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-600">{timeAgo(notif.createdAt)}</span>
                            {notif.actionUrl && (
                              <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                                <ExternalLink className="w-2.5 h-2.5" />
                                Ver
                              </span>
                            )}
                          </div>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markReadMutation.mutate({ id: notif.id });
                            }}
                            className="p-1 hover:bg-gray-700 rounded flex-shrink-0"
                            title="Marcar como lida"
                          >
                            <Check className="w-3 h-3 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
