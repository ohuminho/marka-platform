/* MARKA first-party service worker. Push payloads contain only routing and call metadata. */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "MARKA", body: "Tens uma nova notificação." };
  }

  const title = typeof payload.title === "string" ? payload.title.slice(0, 80) : "MARKA";
  const body = typeof payload.body === "string" ? payload.body.slice(0, 180) : "Tens uma nova notificação.";
  const url = typeof payload.url === "string" && payload.url.startsWith("/") && !payload.url.startsWith("//")
    ? payload.url
    : "/app/notifications";

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/marka-icon.svg",
    badge: "/marka-icon.svg",
    tag: typeof payload.tag === "string" ? payload.tag.slice(0, 120) : "marka-notification",
    renotify: true,
    requireInteraction: payload.kind === "INCOMING_CALL",
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data && typeof event.notification.data.url === "string"
    ? event.notification.data.url
    : "/app/notifications";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("navigate" in client) await client.navigate(target);
      await client.focus();
      return;
    }
    await self.clients.openWindow(target);
  })());
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Subscription rotation is reconciled on the next explicit user visit/consent check.
  // Never create a replacement subscription without the user-facing application context.
});
