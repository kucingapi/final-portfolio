// The dashboard's service worker (scope /dashboard): it shows the pings the server sends and opens the
// dashboard when one is tapped. It caches nothing. Registered by src/components/dashboard/push.ts.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  // Every push must show a notification: iPhone stops delivering to a site that pushes silently.
  event.waitUntil(
    self.registration.showNotification(data.title || "Dashboard", {
      body: data.body || "",
      tag: data.tag,
      renotify: Boolean(data.tag),
      icon: "/dashboard/icon-192.png",
      badge: "/dashboard/badge-96.png",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).pathname.startsWith("/dashboard"));
      if (!open) return self.clients.openWindow(url);
      await open.focus();
      return open.navigate(url).catch(() => self.clients.openWindow(url));
    })(),
  );
});
