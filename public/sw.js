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
    icon: "/logo.png",
    badge: "/logo.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
