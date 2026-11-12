// Panel → Buzón: mensajes que te mandan desde la app y nombres de plantas
// que la gente corrige (para saber en qué se equivoca la IA).
import { useState } from "react";
import { C, tarjeta, tituloTarjeta, textoSuave, botonChico, EsqueletoTarjetas, MensajeError, useDatosAdmin, llamarAdmin, hace } from "./comun";

export default function Buzon({ password, onCambio }) {
  const { datos, error, cargar, setDatos } = useDatosAdmin(password, "/api/admin/buzon");
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function marcar(id, leida) {
    setAviso(null);
    const antes = datos;
    setDatos((d) => ({ ...d, sugerencias: d.sugerencias.map((s) => (s.id === id ? { ...s, leida } : s)), sinLeer: d.sinLeer + (leida ? -1 : 1) }));
    try {
      await llamarAdmin(password, "/api/admin/buzon", { id, leida });
      onCambio?.();
    } catch (e) {
      setDatos(antes);
      setAviso(e.message);
    }
  }
  async function marcarTodas() {
    setAviso(null);
    try {
      await llamarAdmin(password, "/api/admin/buzon", { todas: true });
      setDatos((d) => ({ ...d, sugerencias: d.sugerencias.map((s) => ({ ...s, leida: true })), sinLeer: 0 }));
      onCambio?.();
    } catch (e) {
      setAviso(e.message);
    }
  }

  if (error) return <MensajeError onReintentar={cargar}>{error}</MensajeError>;
  if (!datos) return <EsqueletoTarjetas n={3} />;
  const visibles = datos.sugerencias.filter((s) => !soloNuevos || !s.leida);

  return (
    <div>
      <div style={tarjeta}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <p style={{ ...tituloTarjeta, margin: 0 }}>Mensajes de la app {datos.sinLeer > 0 && <span style={{ background: C.red, color: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 12, marginLeft: 4 }}>{datos.sinLeer}</span>}</p>
          {datos.puedeMarcar && datos.sinLeer > 0 && (
            <button onClick={marcarTodas} style={{ ...botonChico, background: C.tileBg }}>Marcar todo leído</button>
          )}
        </div>
        <p style={{ ...textoSuave, margin: "6px 0 10px" }}>Lo que la gente te escribe desde el botón ⓘ de Mi jardín.</p>
        {datos.puedeMarcar && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.inkSoft, marginBottom: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={soloNuevos} onChange={(e) => setSoloNuevos(e.target.checked)} /> Solo los no leídos
          </label>
        )}
        {!datos.puedeMarcar && <p style={{ ...textoSuave, color: C.amber }}>Para marcar mensajes como leídos, corre supabase-revision-6.sql.</p>}
        {aviso && <p style={{ ...textoSuave, color: C.red }}>{aviso}</p>}
        {visibles.length === 0 ? (
          <p style={{ ...textoSuave, padding: "16px 0", textAlign: "center" }}>{datos.sugerencias.length ? "No hay mensajes nuevos." : "Todavía nadie ha escrito."}</p>
        ) : (
          visibles.map((s) => (
            <div key={s.id} style={{ padding: "12px 0", borderTop: "1px solid " + C.cardLine, opacity: s.leida ? 0.65 : 1 }}>
              <p style={{ margin: 0, fontSize: 14, color: C.ink, lineHeight: 1.5, whiteSpace: "pre-wrap", fontWeight: s.leida ? 400 : 600 }}>{s.mensaje}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 12, color: C.inkSoft }}>{hace(s.fecha)}</span>
                {datos.puedeMarcar && (
                  <button onClick={() => marcar(s.id, !s.leida)} style={{ ...botonChico, background: "transparent", color: C.green, padding: "4px 6px" }}>
                    {s.leida ? "Marcar no leído" : "Marcar leído"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={tarjeta}>
        <p style={tituloTarjeta}>Nombres que la gente corrige</p>
        <p style={{ ...textoSuave, marginBottom: 8 }}>
          Cuando alguien cambia el nombre que dio la IA. Si un cambio se repite mucho, avísame y ajusto la IA para esa planta.
        </p>
        {datos.correcciones.length === 0 ? (
          <p style={{ ...textoSuave, padding: "10px 0", textAlign: "center" }}>Nadie ha corregido nombres todavía.</p>
        ) : (
          datos.correcciones.map((c) => (
            <div key={c.cambio} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: "1px solid " + C.cardLine, fontSize: 13.5 }}>
              <span style={{ color: C.ink }}>{c.cambio}</span>
              <strong style={{ color: c.n >= 3 ? C.red : C.inkSoft, whiteSpace: "nowrap" }}>{c.n} {c.n === 1 ? "vez" : "veces"}</strong>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
