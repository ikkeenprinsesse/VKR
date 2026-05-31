// Service Worker — обработка Web Push уведомлений
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "TutorSpace", body: event.data.text() };
  }

  const options = {
    body: payload.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: payload.tag || "tutorspace",
    data: { url: payload.url || "/" },
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "TutorSpace", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
