// Anuncio que sale arriba en "Mi jardín" (lo editas en /admin → Comunicar).
export const MAX_TEXTO_ANUNCIO = 180;
export const MAX_TITULO_PUSH = 60;
export const MAX_TEXTO_PUSH = 180;
export const HORAS_ENTRE_AVISOS = 12; // para no llenar de notificaciones a la gente

const TONOS = ["verde", "ambar", "azul"];
const limpiar = (t, max) => (typeof t === "string" ? t.replace(/\s+/g, " ").trim().slice(0, max) : "");

// Solo se aceptan enlaces dentro de la app (/tienda) o https.
export function enlaceValido(url) {
  if (typeof url !== "string" || !url.trim()) return "";
  const u = url.trim();
  if (/^\/(?!\/)[\w\-./?=&%#]*$/.test(u)) return u.slice(0, 200);
  if (/^https:\/\/[^\s"'<>]+$/i.test(u)) return u.slice(0, 300);
  return "";
}

export function normalizarAnuncio(a) {
  const x = a && typeof a === "object" ? a : {};
  const texto = limpiar(x.texto, MAX_TEXTO_ANUNCIO);
  const hasta = typeof x.hasta === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.hasta) ? x.hasta : "";
  return {
    activo: x.activo === true && !!texto,
    texto,
    enlace: enlaceValido(x.enlace),
    boton: limpiar(x.boton, 24),
    tono: TONOS.includes(x.tono) ? x.tono : "verde",
    hasta, // último día que se muestra (vacío = hasta que lo apagues)
    id: typeof x.id === "string" ? x.id.slice(0, 40) : "",
  };
}

// ¿Se debe mostrar hoy?
export function anuncioVigente(a, hoy) {
  return !!a && a.activo && !!a.texto && (!a.hasta || a.hasta >= hoy);
}
