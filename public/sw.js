// Este archivo corre en segundo plano en el navegador, incluso con la app cerrada.
// Su único trabajo es mostrar la notificación cuando llega un push del servidor.

self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Ámbitat", body: event.data ? event.data.text() : "Una de tus plantas necesita atención." };
  }

  const title = data.title || "Ámbitat";
  const options = {
    body: data.body || "Una de tus plantas necesita atención.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  // Si la app ya está abierta, la trae al frente en lugar de abrir otra.
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (ventanas) {
      for (const v of ventanas) {
        if ("focus" in v) return v.focus();
      }
      return clients.openWindow(url);
    })
  );
});
