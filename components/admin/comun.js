// Piezas que comparten todas las secciones del panel /admin.
import { useCallback, useEffect, useState } from "react";

export const C = {
  bg: "#EAC468",
  card: "#F5EFDD",
  cardLine: "#e2d7b8",
  tileBg: "#EFE6CC",
  ink: "#221C13",
  inkSoft: "#6b6047",
  green: "#3F5D3E",
  greenDark: "#28402A",
  amber: "#D6A23D",
  red: "#9C3B2E",
  blue: "#3E7CA6",
};

export const F = "'Inter', sans-serif";

export const tarjeta = { background: C.card, borderRadius: 18, padding: "16px 16px", marginBottom: 12 };
export const tituloTarjeta = { fontWeight: 800, fontSize: 15, color: C.ink, margin: "0 0 10px" };
export const textoSuave = { fontSize: 12.5, color: C.inkSoft, margin: 0, lineHeight: 1.45 };
export const campoAdmin = { width: "100%", border: "1px solid " + C.cardLine, borderRadius: 12, padding: "11px 12px", fontFamily: F, fontSize: 16, color: C.ink, background: C.tileBg };
export const botonChico = { background: C.card, border: "none", borderRadius: 10, padding: "8px 12px", fontFamily: F, fontWeight: 700, fontSize: 12.5, color: C.ink, cursor: "pointer" };
export const botonPrincipal = (activo = true) => ({
  width: "100%",
  padding: "13px 0",
  borderRadius: 14,
  border: "none",
  background: activo ? C.green : C.cardLine,
  color: activo ? "#fff" : C.inkSoft,
  fontFamily: F,
  fontWeight: 800,
  fontSize: 15,
  cursor: activo ? "pointer" : "default",
});

export const pesos = (centavos) => "$" + Math.round((centavos || 0) / 100).toLocaleString("es-MX");

// "52 55 1234 5678" o "5512345678" → enlace de WhatsApp
export function enlaceWhatsAppA(telefono, mensaje) {
  let tel = String(telefono || "").replace(/\D/g, "");
  if (tel.length === 10) tel = "52" + tel;
  return `https://wa.me/${tel}${mensaje ? "?text=" + encodeURIComponent(mensaje) : ""}`;
}

// Siluetas grises mientras carga una sección.
export function EsqueletoTarjetas({ n = 2 }) {
  return (
    <div role="status" aria-label="Cargando">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ background: C.card, borderRadius: 18, padding: 16, marginBottom: 12 }}>
          <div className="admin-esq" style={{ width: "40%", height: 15 }} />
          <div className="admin-esq" style={{ width: "85%", height: 11, marginTop: 12 }} />
          <div className="admin-esq" style={{ width: "65%", height: 11, marginTop: 8 }} />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <div className="admin-esq" style={{ flex: 1, height: 38, borderRadius: 12 }} />
            <div className="admin-esq" style={{ flex: 1, height: 38, borderRadius: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Stat({ valor, label, destacado, detalle }) {
  return (
    <div style={{ background: destacado ? C.green : C.card, borderRadius: 16, padding: "14px 14px" }}>
      <p style={{ fontWeight: 800, fontSize: 24, color: destacado ? "#fff" : C.ink, margin: 0, letterSpacing: "-0.01em" }}>{valor}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: destacado ? "rgba(255,255,255,0.8)" : C.inkSoft, margin: "2px 0 0" }}>{label}</p>
      {detalle && <p style={{ fontSize: 11.5, color: destacado ? "rgba(255,255,255,0.75)" : C.inkSoft, margin: "4px 0 0" }}>{detalle}</p>}
    </div>
  );
}

export function MensajeError({ children, onReintentar }) {
  return (
    <div style={{ ...tarjeta, textAlign: "center" }}>
      <p style={{ color: C.red, fontSize: 13.5, margin: 0, lineHeight: 1.45 }}>{children}</p>
      {onReintentar && (
        <button onClick={onReintentar} style={{ ...botonChico, background: C.tileBg, marginTop: 10 }}>
          Reintentar
        </button>
      )}
    </div>
  );
}

// Llama a una API del panel con la contraseña. Regresa el JSON o lanza el error.
export async function llamarAdmin(password, ruta, cuerpo) {
  const r = await fetch(ruta, {
    method: cuerpo ? "POST" : "GET",
    headers: { "x-admin-password": password, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "No se pudo conectar. Intenta de nuevo.");
  return d;
}

// Carga datos de una API del panel: { datos, error, cargar, setDatos }
export function useDatosAdmin(password, ruta) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await llamarAdmin(password, ruta));
    } catch (e) {
      setError(e.message);
    }
  }, [password, ruta]);
  useEffect(() => {
    cargar();
  }, [cargar]);
  return { datos, error, cargar, setDatos };
}

export function hace(iso) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? "ayer" : `hace ${d} días`;
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
}
