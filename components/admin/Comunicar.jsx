// Panel → Comunicar: un anuncio que sale arriba en la app y notificaciones
// a todos los que tienen los avisos activados.
import { useEffect, useState } from "react";
import { C, F, tarjeta, tituloTarjeta, textoSuave, campoAdmin, botonChico, botonPrincipal, EsqueletoTarjetas, MensajeError, useDatosAdmin, llamarAdmin, hace } from "./comun";
import { MAX_TEXTO_ANUNCIO, MAX_TITULO_PUSH, MAX_TEXTO_PUSH, HORAS_ENTRE_AVISOS } from "../../lib/anuncio";

const DESTINOS = [
  ["", "Sin botón"],
  ["/app?ir=tienda", "Reservar mantenimiento (Tienda)"],
  ["/app?ir=camara", "Tomar foto a una planta"],
  ["/app?ir=comunidad", "Comunidad"],
  ["/conoce", "Página de presentación"],
  ["otro", "Otro enlace (https://...)"],
];
const DESTINOS_PUSH = [["/", "La app (Mi jardín)"], ...DESTINOS.filter(([v]) => v !== "" && v !== "otro")];
function enCuanto(ms) {
  const h = Math.floor(ms / 3600e3);
  const m = Math.ceil((ms % 3600e3) / 60000);
  return h ? `${h} h ${m} min` : `${m} min`;
}
const TONOS = [
  ["verde", "Verde", "#DDE6D3"],
  ["ambar", "Amarillo", "#F6E3B4"],
  ["azul", "Azul", "#DCE8F1"],
];
const etiqueta = { display: "block", fontSize: 13, fontWeight: 700, color: C.ink, margin: "12px 0 6px" };
const contador = (t, max) => <span style={{ float: "right", fontWeight: 500, color: t.length > max * 0.9 ? C.red : C.inkSoft }}>{t.length}/{max}</span>;

function destinoDe(enlace) {
  if (!enlace) return ["", ""];
  return DESTINOS.some(([v]) => v === enlace) ? [enlace, ""] : ["otro", enlace];
}

function Anuncio({ password, inicial, onGuardado }) {
  const [a, setA] = useState(inicial);
  const [destino, setDestino] = useState(() => destinoDe(inicial.enlace)[0]);
  const [otro, setOtro] = useState(() => destinoDe(inicial.enlace)[1]);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);
  const enlace = destino === "otro" ? otro.trim() : destino;
  const cambiar = (k, v) => {
    setMsg(null);
    setA((x) => ({ ...x, [k]: v }));
  };

  async function guardar(activo) {
    setGuardando(true);
    setMsg(null);
    try {
      const d = await llamarAdmin(password, "/api/admin/comunicar", { tipo: "anuncio", anuncio: { ...a, activo, enlace } });
      setA(d.anuncio);
      onGuardado(d.anuncio);
      setMsg({ ok: true, texto: activo ? "Publicado. La gente lo ve al abrir la app (puede tardar 1 minuto)." : "Anuncio apagado." });
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    }
    setGuardando(false);
  }
  const fondo = TONOS.find(([k]) => k === a.tono)?.[2] || TONOS[0][2];

  return (
    <div style={tarjeta}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ ...tituloTarjeta, margin: 0 }}>Anuncio en la app</p>
        <span style={{ fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "3px 10px", background: inicial.activo ? C.green : C.cardLine, color: inicial.activo ? "#fff" : C.inkSoft }}>
          {inicial.activo ? "Publicado" : "Apagado"}
        </span>
      </div>
      <p style={{ ...textoSuave, margin: "6px 0 0" }}>Sale arriba en Mi jardín. Cada persona lo puede cerrar; si cambias el texto, vuelve a salir.</p>

      <label style={etiqueta} htmlFor="anuncio-texto">Texto {contador(a.texto, MAX_TEXTO_ANUNCIO)}</label>
      <textarea id="anuncio-texto" value={a.texto} maxLength={MAX_TEXTO_ANUNCIO} rows={3} onChange={(e) => cambiar("texto", e.target.value)} placeholder="Ej. Esta semana hay lugares libres el sábado. ¡Reserva tu mantenimiento!" style={{ ...campoAdmin, fontSize: 15, resize: "vertical", lineHeight: 1.45 }} />

      <label style={etiqueta} htmlFor="anuncio-destino">Botón</label>
      <select id="anuncio-destino" value={destino} onChange={(e) => { setDestino(e.target.value); setMsg(null); }} style={campoAdmin}>
        {DESTINOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      {destino === "otro" && <input value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="https://..." aria-label="Enlace del botón" style={{ ...campoAdmin, marginTop: 8 }} />}
      {destino && (
        <input value={a.boton} maxLength={24} onChange={(e) => cambiar("boton", e.target.value)} placeholder="Texto del botón (ej. Reservar)" aria-label="Texto del botón" style={{ ...campoAdmin, marginTop: 8 }} />
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 140px" }}>
          <span style={etiqueta}>Color</span>
          <div role="radiogroup" aria-label="Color del anuncio" style={{ display: "flex", gap: 6 }}>
            {TONOS.map(([k, t, bg]) => (
              <button key={k} role="radio" aria-checked={a.tono === k} onClick={() => cambiar("tono", k)} style={{ ...botonChico, background: bg, outline: a.tono === k ? "2px solid " + C.ink : "none", padding: "8px 10px" }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={etiqueta} htmlFor="anuncio-hasta">Mostrar hasta (opcional)</label>
          <input id="anuncio-hasta" type="date" value={a.hasta} onChange={(e) => cambiar("hasta", e.target.value)} style={campoAdmin} />
        </div>
      </div>

      {a.texto.trim() && (
        <>
          <span style={etiqueta}>Así se ve</span>
          <div style={{ background: fondo, borderRadius: 16, padding: "12px 14px", display: "flex", gap: 10 }}>
            <span aria-hidden="true">📣</span>
            <div>
              <p style={{ margin: 0, fontSize: 13.5, color: C.ink, lineHeight: 1.45 }}>{a.texto}</p>
              {enlace && <span style={{ display: "inline-block", marginTop: 8, background: C.ink, color: C.card, borderRadius: 999, padding: "6px 12px", fontWeight: 800, fontSize: 12 }}>{a.boton || "Ver más"}</span>}
            </div>
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={() => guardar(true)} disabled={guardando || !a.texto.trim() || (destino === "otro" && !/^https:\/\//.test(otro.trim()))} style={{ ...botonPrincipal(!guardando && !!a.texto.trim()), flex: 2 }}>
          {guardando ? "Guardando..." : inicial.activo ? "Actualizar anuncio" : "Publicar anuncio"}
        </button>
        {inicial.activo && (
          <button onClick={() => guardar(false)} disabled={guardando} style={{ ...botonChico, flex: 1, background: C.tileBg }}>Apagar</button>
        )}
      </div>
      {msg && <p style={{ fontSize: 13, color: msg.ok ? C.green : C.red, margin: "10px 0 0" }}>{msg.texto}</p>}
    </div>
  );
}

function Notificacion({ password, suscripciones, siguienteEnvio, historialDisponible, onEnviado }) {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState("/");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const espera = siguienteEnvio ? new Date(siguienteEnvio).getTime() - ahora : 0;
  const bloqueado = espera > 0;
  const listo = titulo.trim() && texto.trim() && !bloqueado && suscripciones > 0 && historialDisponible;

  async function enviar() {
    if (!window.confirm(`¿Mandar esta notificación a ${suscripciones} ${suscripciones === 1 ? "persona" : "personas"}? No se puede deshacer.`)) return;
    setEnviando(true);
    setMsg(null);
    try {
      const d = await llamarAdmin(password, "/api/admin/comunicar", { tipo: "push", titulo, texto, url: destino });
      setMsg({ ok: true, texto: `Enviada a ${d.enviados} ${d.enviados === 1 ? "persona" : "personas"}${d.fallidos ? ` (${d.fallidos} no se pudieron entregar${d.vencidas ? `; ${d.vencidas} ya habían desinstalado y se quitaron` : ""})` : ""}.` });
      setTitulo("");
      setTexto("");
      onEnviado();
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    }
    setEnviando(false);
  }

  return (
    <div style={tarjeta}>
      <p style={tituloTarjeta}>Notificación a todos</p>
      <p style={textoSuave}>
        Le llega al celular a las <strong style={{ color: C.ink }}>{suscripciones}</strong> {suscripciones === 1 ? "persona" : "personas"} que activaron los avisos. Úsala poco (máximo una cada {HORAS_ENTRE_AVISOS} horas): si llegan muchas, la gente apaga también los avisos de riego.
      </p>
      {!historialDisponible && <p style={{ ...textoSuave, color: C.red, marginTop: 8 }}>Para mandar notificaciones, corre supabase-revision-6.sql en Supabase.</p>}

      <label style={etiqueta} htmlFor="push-titulo">Título {contador(titulo, MAX_TITULO_PUSH)}</label>
      <input id="push-titulo" value={titulo} maxLength={MAX_TITULO_PUSH} onChange={(e) => { setTitulo(e.target.value); setMsg(null); }} placeholder="Ej. 🌿 Lugares libres este sábado" style={campoAdmin} />
      <label style={etiqueta} htmlFor="push-texto">Mensaje {contador(texto, MAX_TEXTO_PUSH)}</label>
      <textarea id="push-texto" value={texto} maxLength={MAX_TEXTO_PUSH} rows={3} onChange={(e) => { setTexto(e.target.value); setMsg(null); }} placeholder="Ej. Reserva tu mantenimiento y deja tus plantas listas para el frío." style={{ ...campoAdmin, fontSize: 15, resize: "vertical", lineHeight: 1.45 }} />
      <label style={etiqueta} htmlFor="push-destino">Al tocarla, abre</label>
      <select id="push-destino" value={destino} onChange={(e) => setDestino(e.target.value)} style={campoAdmin}>
        {DESTINOS_PUSH.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>

      {(titulo.trim() || texto.trim()) && (
        <>
          <span style={etiqueta}>Así se ve en el celular</span>
          <div style={{ background: "#fff", borderRadius: 16, padding: "10px 12px", display: "flex", gap: 10, boxShadow: "0 6px 18px -10px rgba(0,0,0,0.35)" }}>
            <img src="/icon-192.png" alt="" style={{ width: 34, height: 34, borderRadius: 8 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: C.ink }}>{titulo || "Título"}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: C.ink, lineHeight: 1.35 }}>{texto || "Mensaje"}</p>
            </div>
          </div>
        </>
      )}
      <button onClick={enviar} disabled={!listo || enviando} style={{ ...botonPrincipal(!!listo && !enviando), marginTop: 14, fontFamily: F }}>
        {enviando ? "Enviando..." : bloqueado ? `Podrás mandar otra en ${enCuanto(espera)}` : suscripciones === 0 ? "Nadie tiene los avisos activados aún" : `Mandar a ${suscripciones} ${suscripciones === 1 ? "persona" : "personas"}`}
      </button>
      {msg && <p style={{ fontSize: 13, color: msg.ok ? C.green : C.red, margin: "10px 0 0" }}>{msg.texto}</p>}
    </div>
  );
}

export default function Comunicar({ password }) {
  const { datos, error, cargar, setDatos } = useDatosAdmin(password, "/api/admin/comunicar");
  if (error) return <MensajeError onReintentar={cargar}>{error}</MensajeError>;
  if (!datos) return <EsqueletoTarjetas n={2} />;
  return (
    <div>
      <Anuncio password={password} inicial={datos.anuncio} onGuardado={(anuncio) => setDatos((d) => ({ ...d, anuncio }))} />
      <Notificacion password={password} suscripciones={datos.suscripciones} siguienteEnvio={datos.siguienteEnvio} historialDisponible={datos.historialDisponible} onEnviado={cargar} />
      {datos.envios.length > 0 && (
        <div style={tarjeta}>
          <p style={tituloTarjeta}>Notificaciones enviadas</p>
          {datos.envios.map((e) => (
            <div key={e.id} style={{ padding: "9px 0", borderTop: "1px solid " + C.cardLine }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: C.ink }}>{e.titulo}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: C.ink }}>{e.texto}</p>
              <p style={{ ...textoSuave, fontSize: 12, marginTop: 3 }}>{hace(e.created_at)} · llegó a {e.enviados}{e.fallidos ? ` · ${e.fallidos} fallaron` : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
