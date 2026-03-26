import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export function usePushNotifications(sellerId?: number) {
  const [permission, setPermission] = useState<string>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const vapidKeyQuery = trpc.push.getVapidKey.useQuery();

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      // Check if already subscribed
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidKeyQuery.data?.key) return false;

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") return false;

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKeyQuery.data.key),
      });

      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error("Invalid subscription");
      }

      // Save to server with sellerId
      await subscribeMutation.mutateAsync({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        ...(sellerId ? { sellerId } : {}),
      });

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error("[Push] Subscribe error:", error);
      return false;
    }
  }, [isSupported, vapidKeyQuery.data?.key, subscribeMutation, sellerId]);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    isLoading: subscribeMutation.isPending,
  };
}

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(outputArray);
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
