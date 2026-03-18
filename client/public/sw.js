const CACHE_NAME = "kafka-rank-v3";
const OFFLINE_URL = "/";

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch - network first for navigation
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

// Push Notification received
self.addEventListener("push", (event) => {
  let data = {
    title: "Kafka Rank",
    body: "Nova atualização na corrida!",
    tag: "kafka-rank",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data.title = payload.title || data.title;
      data.body = payload.body || data.body;
      data.tag = payload.tag || data.tag;
      if (payload.icon) data.icon = payload.icon;
      if (payload.badge) data.badge = payload.badge;
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag,
    renotify: true,
    requireInteraction: false,
    data: {
      url: "/",
    },
    actions: [
      {
        action: "open",
        title: "Ver Ranking",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click - open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle push subscription change (e.g., when browser refreshes keys)
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // Re-register with server
        return fetch("/api/trpc/push.subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            json: {
              endpoint: subscription.endpoint,
              p256dh: btoa(
                String.fromCharCode.apply(
                  null,
                  new Uint8Array(subscription.getKey("p256dh"))
                )
              ),
              auth: btoa(
                String.fromCharCode.apply(
                  null,
                  new Uint8Array(subscription.getKey("auth"))
                )
              ),
            },
          }),
        });
      })
  );
});
