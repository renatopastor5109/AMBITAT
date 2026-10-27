// Panel de administrador de Ámbitat: aquí ves todas las citas de
// mantenimiento que reservan tus clientes. Se entra con la contraseña que
// guardas en Vercel como ADMIN_PASSWORD (nunca está escrita en el código).
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { diaCDMX, sumarDias, diaSemana } from "../lib/fechas";
import { tamanoPorClave, TAMANOS, PRECIO_MINIMO, PRECIO_MAXIMO, formatoPrecio } from "../lib/servicio";
import { AGENDA_INICIAL, HORARIOS_POSIBLES, NOMBRES_DIAS_SEMANA, normalizarAgenda } from "../lib/agenda";

const C = {
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

const F = "'Inter', sans-serif";

const MOTIVOS_CONFLICTO = {
  sin_lugar: "Pagó cuando ese horario o ese día ya estaba lleno.",
  pago_tras_cancelar: "Pagó una reservación que ya había cancelado.",
  fecha_pasada: "El pago llegó cuando la fecha de la visita ya había pasado.",
};

const ESTADOS = {
  pagado: { label: "Pagado", color: C.green },
  pendiente_pago: { label: "Pendiente de pago", color: "#8a6110" },
  completado: { label: "Completada", color: C.blue },
  cancelado: { label: "Cancelado", color: C.red },
  conflicto: { label: "Por resolver", color: C.red },
};

const CLAVE_SESION = "ambitat-admin-pw";

// Siluetas grises mientras carga una sección.
function EsqueletoTarjetas({ n = 2 }) {
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

function leerSesion() {
  try {
    return sessionStorage.getItem(CLAVE_SESION) || "";
  } catch {
    return "";
  }
}
function guardarSesion(v) {
  try {
    if (v) sessionStorage.setItem(CLAVE_SESION, v);
    else sessionStorage.removeItem(CLAVE_SESION);
  } catch {}
}

// "YYYY-MM-DD" de hoy en hora de la Ciudad de México
const hoyISO = () => diaCDMX();
// "1:00 pm" -> 780, para poder ordenar las citas por hora
function horaAMinutos(h) {
  const m = /(\d+):(\d+)\s*(am|pm)/i.exec(h || "");
  if (!m) return 0;
  let hh = parseInt(m[1], 10) % 12;
  if (m[3].toLowerCase() === "pm") hh += 12;
  return hh * 60 + parseInt(m[2], 10);
}
function fechaLarga(iso) {
  const s = new Date(iso + "T00:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function linkMaps(direccion) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(direccion + ", Ciudad de México");
}
function linkWhatsApp(r) {
  let tel = (r.telefono || "").replace(/\D/g, "");
  if (tel.length === 10) tel = "52" + tel; // número mexicano sin lada de país
  const msg = `Hola ${r.nombre_contacto}, te escribo de Ámbitat para confirmar tu cita de mantenimiento el ${fechaLarga(r.fecha).toLowerCase()} a las ${r.hora}.`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [draft, setDraft] = useState("");
  const [reservaciones, setReservaciones] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState("calendario"); // calendario | proximas | historial | agenda | ajustes
  const [agenda, setAgenda] = useState(null);
  const [agendaError, setAgendaError] = useState(null);
  const [precios, setPrecios] = useState(null);
  const [verPendientes, setVerPendientes] = useState(false);
  const [actualizando, setActualizando] = useState(null);

  useEffect(() => {
    const guardada = leerSesion();
    if (guardada) cargar(guardada);
  }, []);

  async function cargar(pw) {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reservaciones", { headers: { "x-admin-password": pw } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar las citas");
      setPassword(pw);
      guardarSesion(pw);
      setReservaciones(data.reservaciones);
      fetch("/api/admin/agenda", { headers: { "x-admin-password": pw } })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          setAgenda(normalizarAgenda(d.agenda || AGENDA_INICIAL));
          setAgendaError(null);
        })
        // Si no se pudo leer, NO se usan los valores de fábrica (para no guardarlos encima por error).
        .catch((e) => setAgendaError(e.message || "No se pudo leer tu agenda. Toca Actualizar."));
      fetch("/api/admin/precios", { headers: { "x-admin-password": pw } })
        .then(async (r) => {
          const d = await r.json();
          if (r.ok) setPrecios(d.precios);
        })
        .catch(() => {});
    } catch (err) {
      setError(err.message);
      if (!reservaciones) {
        setPassword("");
        guardarSesion("");
      }
    }
    setCargando(false);
  }

  async function cambiarEstado(id, estado) {
    setActualizando(id);
    try {
      const res = await fetch("/api/admin/actualizar-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ id, estado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar");
      setReservaciones((prev) =>
        prev.map((r) => (r.id !== id ? r : estado === "reembolso_depositado" ? { ...r, reembolso_estado: "depositado" } : { ...r, estado }))
      );
    } catch (err) {
      alert(err.message);
    }
    setActualizando(null);
  }

  // Guarda la agenda. Regresa true si se guardó.
  async function guardarAgenda(nueva) {
    try {
      const res = await fetch("/api/admin/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ agenda: nueva }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setAgenda(data.agenda);
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  }

  async function guardarPrecios(nuevos) {
    try {
      const res = await fetch("/api/admin/precios", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ precios: nuevos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setPrecios(data.precios);
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  }

  function alternarBloqueo(fecha) {
    if (!agenda) return;
    const bloqueada = agenda.fechasBloqueadas.includes(fecha);
    if (!bloqueada && !window.confirm(`¿Bloquear el ${fechaLarga(fecha).toLowerCase()}? Nadie podrá reservar ese día. Las citas que ya tengas ese día se quedan.`)) return;
    guardarAgenda({
      ...agenda,
      fechasBloqueadas: bloqueada ? agenda.fechasBloqueadas.filter((f) => f !== fecha) : [...agenda.fechasBloqueadas, fecha],
    });
  }

  function salir() {
    guardarSesion("");
    setPassword("");
    setReservaciones(null);
    setDraft("");
  }

  const hoy = hoyISO();

  const resumen = useMemo(() => {
    if (!reservaciones) return null;
    const en7Dias = sumarDias(hoy, 6);
    const confirmadas = reservaciones.filter((r) => r.estado === "pagado");
    return {
      proximos7: confirmadas.filter((r) => r.fecha >= hoy && r.fecha <= en7Dias).length,
      proximas: confirmadas.filter((r) => r.fecha >= hoy).length,
      pendientes: reservaciones.filter((r) => r.estado === "pendiente_pago" && r.metodo_pago === "oxxo" && r.fecha >= hoy).length,
      conflictos: reservaciones.filter((r) => r.estado === "conflicto").length,
      depositos: reservaciones.filter((r) => r.reembolso_estado === "pendiente_manual").length,
      cobrado: reservaciones
        .filter((r) => r.estado === "pagado" || r.estado === "completado")
        .reduce((s, r) => s + (r.precio_centavos || 0), 0),
    };
  }, [reservaciones, hoy]);

  const grupos = useMemo(() => {
    if (!reservaciones) return [];
    const lista = reservaciones.filter((r) => {
      if (vista === "proximas") {
        if (r.fecha < hoy) return false;
        return r.estado === "pagado" || r.estado === "conflicto" || (verPendientes && r.estado === "pendiente_pago");
      }
      return r.estado === "completado" || r.estado === "cancelado" || (r.fecha < hoy && r.estado === "pagado");
    });
    const porFecha = {};
    lista.forEach((r) => {
      (porFecha[r.fecha] = porFecha[r.fecha] || []).push(r);
    });
    const fechas = Object.keys(porFecha).sort();
    if (vista === "historial") fechas.reverse();
    return fechas.map((f) => ({
      fecha: f,
      citas: porFecha[f].sort((a, b) => horaAMinutos(a.hora) - horaAMinutos(b.hora)),
    }));
  }, [reservaciones, vista, verPendientes, hoy]);

  return (
    <>
      <Head>
        <title>Panel · Ámbitat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: ${C.bg}; }
        .admin-pestanas::-webkit-scrollbar { display: none; }
        .admin-esq { background: linear-gradient(90deg, #EFE6CC 25%, #f7f1e1 50%, #EFE6CC 75%); background-size: 200% 100%; animation: adminEsq 1.3s ease-in-out infinite; border-radius: 6px; }
        @keyframes adminEsq { from { background-position: 100% 0; } to { background-position: -100% 0; } }
        @media (prefers-reduced-motion: reduce) { .admin-esq { animation: none; } }
        * { box-sizing: border-box; }
        a { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 16px 40px", minHeight: "100vh", fontFamily: F }}>
        {!reservaciones ? (
          <div style={{ background: C.card, borderRadius: 22, padding: "26px 20px", marginTop: 60 }}>
            <img src="/logo.png" alt="Ámbitat" style={{ height: 34, display: "block", marginBottom: 18 }} />
            <h1 style={{ fontWeight: 800, fontSize: 22, color: C.ink, margin: "0 0 4px" }}>Panel de citas</h1>
            <p style={{ fontSize: 13.5, color: C.inkSoft, margin: "0 0 18px" }}>Solo para administración de Ámbitat.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) cargar(draft.trim());
              }}
            >
              <input
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Contraseña"
                autoFocus
                style={{ width: "100%", border: "1px solid " + C.cardLine, borderRadius: 12, padding: "12px 14px", fontFamily: F, fontSize: 15, color: C.ink, background: C.tileBg }}
              />
              {error && <p style={{ color: C.red, fontSize: 13, margin: "10px 0 0" }}>{error}</p>}
              <button
                type="submit"
                disabled={cargando || !draft.trim()}
                style={{ marginTop: 14, width: "100%", padding: "13px 0", borderRadius: 14, border: "none", background: cargando || !draft.trim() ? C.cardLine : C.green, color: cargando || !draft.trim() ? C.inkSoft : "#fff", fontFamily: F, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
              >
                {cargando ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.inkSoft, margin: 0 }}>Ámbitat</p>
                <h1 style={{ fontWeight: 800, fontSize: 24, color: C.ink, margin: "2px 0 0", letterSpacing: "-0.01em" }}>Panel de citas</h1>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => cargar(password)} disabled={cargando} style={botonChico}>
                  {cargando ? "..." : "Actualizar"}
                </button>
                <button onClick={salir} style={botonChico}>Salir</button>
              </div>
            </div>

            {error && <p style={{ color: C.red, fontSize: 13, margin: "0 0 12px" }}>{error}</p>}

            {resumen.conflictos > 0 && (
              <div style={{ background: C.red, color: "#fff", borderRadius: 14, padding: "12px 14px", marginBottom: 14, fontSize: 13.5, lineHeight: 1.4 }}>
                <strong>{resumen.conflictos === 1 ? "1 cita pagada está" : `${resumen.conflictos} citas pagadas están`} por resolver</strong>{" "}
                (normalmente un pago en OXXO que llegó tarde). Búscala en Próximas: dice el motivo. Escríbele al cliente y, cuando lo resuelvas, márcala con los botones de la cita.
              </div>
            )}

            {resumen.depositos > 0 && (
              <div style={{ background: C.amber, color: C.ink, borderRadius: 14, padding: "12px 14px", marginBottom: 14, fontSize: 13.5, lineHeight: 1.4 }}>
                <strong>{resumen.depositos === 1 ? "1 cliente canceló" : `${resumen.depositos} clientes cancelaron`} y pagó en OXXO:</strong>{" "}
                hay que depositarle a mano. Búscalo en Historial (dice “DEPOSÍTALE”).
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              <Stat valor={resumen.proximos7} label="Citas en los próximos 7 días" destacado />
              <Stat valor={resumen.proximas} label="Próximas confirmadas" />
              <Stat valor={resumen.pendientes} label="Esperando pago (OXXO)" />
              <Stat valor={`$${(resumen.cobrado / 100).toLocaleString("es-MX")}`} label="Cobrado en total" />
            </div>

            <div className="admin-pestanas" style={{ display: "flex", background: C.card, borderRadius: 14, padding: 4, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none" }}>
              {[
                ["calendario", "Calendario"],
                ["proximas", "Próximas"],
                ["historial", "Historial"],
                ["agenda", "Servicio"],
                ["crecer", "Crecer"],
                ["ajustes", "Ajustes"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setVista(k)}
                  style={{ flex: "1 0 auto", whiteSpace: "nowrap", border: "none", borderRadius: 11, padding: "10px 12px", fontFamily: F, fontWeight: 700, fontSize: 13, cursor: "pointer", background: vista === k ? C.green : "transparent", color: vista === k ? "#fff" : C.inkSoft }}
                >
                  {l}
                </button>
              ))}
            </div>

            {vista === "proximas" && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.inkSoft, margin: "0 0 14px 4px", cursor: "pointer" }}>
                <input type="checkbox" checked={verPendientes} onChange={(e) => setVerPendientes(e.target.checked)} />
                Mostrar también las que aún no pagan
              </label>
            )}

            {vista === "crecer" ? (
              <Crecer password={password} />
            ) : vista === "agenda" ? (
              <>
                {precios && <PreciosConfig precios={precios} onGuardar={guardarPrecios} />}
                <ZonasConfig password={password} />
                {agenda ? (
                  <AgendaConfig agenda={agenda} onGuardar={guardarAgenda} />
                ) : (
                  agendaError ? <p style={{ textAlign: "center", color: C.red, fontSize: 14 }}>{agendaError}</p> : <EsqueletoTarjetas />
                )}
              </>
            ) : vista === "ajustes" ? (
              <Ajustes password={password} />
            ) : vista === "calendario" ? (
              <Calendario
                reservaciones={reservaciones}
                hoy={hoy}
                actualizando={actualizando}
                onCambiarEstado={cambiarEstado}
                agenda={agenda}
                onAlternarBloqueo={alternarBloqueo}
              />
            ) : grupos.length === 0 ? (
              <p style={{ textAlign: "center", color: C.inkSoft, fontSize: 14, padding: "40px 0" }}>
                {vista === "proximas" ? "No tienes citas próximas por ahora." : "Todavía no hay citas en el historial."}
              </p>
            ) : (
              grupos.map((g) => (
                <div key={g.fecha} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 4px 8px" }}>
                    <p style={{ fontWeight: 800, fontSize: 15, color: C.ink, margin: 0 }}>
                      {g.fecha === hoy ? "Hoy · " : ""}
                      {fechaLarga(g.fecha)}
                    </p>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, margin: 0 }}>
                      {g.citas.length} {g.citas.length === 1 ? "cita" : "citas"}
                    </p>
                  </div>
                  {g.citas.map((r) => (
                    <Cita key={r.id} r={r} actualizando={actualizando === r.id} onCambiarEstado={cambiarEstado} />
                  ))}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </>
  );
}

// ---------- Ajustes: ¿qué falta configurar para crear cuentas? ----------
function Ajustes({ password }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [correo, setCorreo] = useState("");
  const [prueba, setPrueba] = useState(null); // { ok, mensaje }
  const [enviando, setEnviando] = useState(false);

  async function revisar() {
    setError(null);
    try {
      const r = await fetch("/api/admin/estado-config", { headers: { "x-admin-password": password } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo revisar");
      setDatos(d);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    revisar();
  }, []);

  async function probarCorreo(e) {
    e.preventDefault();
    setEnviando(true);
    setPrueba(null);
    try {
      const r = await fetch("/api/admin/probar-correo", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ correo }),
      });
      const d = await r.json();
      setPrueba(
        r.ok
          ? { ok: true, mensaje: "Enviado. Revisa tu bandeja (y spam): si el correo trae un código de 6 dígitos, todo está bien. Si solo trae un enlace, falta poner {{ .Token }} en la plantilla \"Magic Link\"." }
          : { ok: false, mensaje: d.error }
      );
    } catch {
      setPrueba({ ok: false, mensaje: "No se pudo conectar." });
    }
    setEnviando(false);
  }

  const tarjeta = { background: C.card, borderRadius: 18, padding: "16px 16px", marginBottom: 12 };
  const titulo = { fontWeight: 800, fontSize: 15, color: C.ink, margin: "0 0 10px" };
  const Fila = ({ ok, nombre, detalle, opcional }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderTop: "1px solid " + C.cardLine }}>
      <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", background: ok ? C.green : opcional ? C.amber : C.red }}>
        {ok ? "✓" : opcional ? "–" : "✕"}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.ink }}>{nombre}</p>
        {detalle && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.4 }}>{detalle}</p>}
      </div>
    </div>
  );

  if (error) return <p style={{ color: C.red, fontSize: 13.5 }}>{error}</p>;
  if (!datos) return <EsqueletoTarjetas n={3} />;
  const a = datos.auth;

  return (
    <div>
      <div style={tarjeta}>
        <p style={titulo}>Crear cuenta e iniciar sesión</p>
        {!a ? (
          <p style={{ color: C.red, fontSize: 13 }}>No se pudo leer la configuración de Supabase: {datos.authError}</p>
        ) : (
          <>
            <Fila ok={a.sinCuenta} nombre="Usar la app sin cuenta" detalle={a.sinCuenta ? "Activo: la gente entra directo y la cuenta se pide después." : "Apagado: actívalo en Supabase → Authentication → Sign In / Providers → Allow anonymous sign-ins."} />
            <Fila ok={a.google} nombre="Continuar con Google" detalle={a.google ? "Activo." : "Falta activarlo (paso 1 de la guía)."} />
            <Fila ok={a.correo} nombre="Continuar con correo" detalle={a.correo ? "Activo. Usa el botón de abajo para revisar que el correo sí llegue." : "Apagado en Supabase → Sign In / Providers → Email."} />
            <Fila ok={a.registroAbierto} nombre="Registro de cuentas nuevas" detalle={a.registroAbierto ? "Abierto." : "Cerrado: nadie nuevo puede crear cuenta."} />
            <Fila ok={a.apple} opcional nombre="Continuar con Apple" detalle={a.apple ? "Activo." : "Opcional, para más adelante (paso 4 de la guía)."} />
            <Fila ok={a.facebook} opcional nombre="Continuar con Facebook" detalle={a.facebook ? "Activo." : "Opcional."} />
          </>
        )}
        {datos.callback && (
          <p style={{ fontSize: 12, color: C.inkSoft, margin: "10px 0 0", lineHeight: 1.45, wordBreak: "break-all" }}>
            URL de regreso para Google y Apple: <strong style={{ color: C.ink }}>{datos.callback}</strong>
          </p>
        )}
      </div>

      <div style={tarjeta}>
        <p style={titulo}>Probar el correo de acceso</p>
        <p style={{ fontSize: 13, color: C.inkSoft, margin: "0 0 10px", lineHeight: 1.45 }}>
          Manda el mismo correo que recibe un cliente. Prueba con un correo que no sea el tuyo de Supabase para ver si ya llega a cualquiera.
        </p>
        <form onSubmit={probarCorreo} style={{ display: "flex", gap: 8 }}>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            style={{ flex: 1, minWidth: 0, border: "1px solid " + C.cardLine, borderRadius: 12, padding: "11px 12px", fontFamily: F, fontSize: 16, color: C.ink, background: C.tileBg }}
          />
          <button type="submit" disabled={enviando || !correo.trim()} style={{ ...botonChico, background: C.green, color: "#fff", border: "none", padding: "0 16px" }}>
            {enviando ? "..." : "Enviar"}
          </button>
        </form>
        {prueba && <p style={{ fontSize: 13, color: prueba.ok ? C.green : C.red, margin: "10px 0 0", lineHeight: 1.45 }}>{prueba.mensaje}</p>}
      </div>

      <div style={tarjeta}>
        <p style={titulo}>Variables de Vercel</p>
        {datos.variables.map((v) => (
          <Fila key={v.nombre} ok={v.lista} opcional={v.nombre === "GOOGLE_MAPS_API_KEY" || v.nombre === "NEXT_PUBLIC_SITE_URL"} nombre={v.nombre} detalle={v.para} />
        ))}
      </div>
      <button onClick={revisar} style={{ ...botonChico, width: "100%", padding: "12px 0" }}>Volver a revisar</button>
    </div>
  );
}

// ---------- Crecer: tarjetas en viveros (QR) e invitaciones ----------
function Crecer({ password }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [nombre, setNombre] = useState("");
  const [zona, setZona] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(null); // slug con el QR abierto
  const origen = typeof window !== "undefined" ? window.location.origin : "https://ambitat.vercel.app";

  async function cargar() {
    setError(null);
    try {
      const r = await fetch("/api/admin/crecimiento", { headers: { "x-admin-password": password } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDatos(d);
    } catch (e) {
      setError(e.message || "No se pudo cargar.");
    }
  }
  useEffect(() => {
    cargar();
  }, []);

  async function enviar(cuerpo) {
    setGuardando(true);
    try {
      const r = await fetch("/api/admin/crecimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(cuerpo),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await cargar();
      return d;
    } catch (e) {
      alert(e.message || "No se pudo guardar.");
      return null;
    } finally {
      setGuardando(false);
    }
  }

  const tarjeta = { background: C.card, borderRadius: 18, padding: "16px 16px", marginBottom: 12 };
  const pesos = (c) => `$${Math.round((c || 0) / 100).toLocaleString("es-MX")}`;
  const Numero = ({ v, l }) => (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: C.ink }}>{v}</p>
      <p style={{ margin: 0, fontSize: 11, color: C.inkSoft, lineHeight: 1.25 }}>{l}</p>
    </div>
  );

  if (error) return <p style={{ color: C.red, fontSize: 14, textAlign: "center" }}>{error}</p>;
  if (!datos) return <EsqueletoTarjetas n={3} />;

  return (
    <div>
      <div style={tarjeta}>
        <p style={{ fontWeight: 800, fontSize: 15, color: C.ink, margin: "0 0 4px" }}>Tarjetas en viveros</p>
        <p style={{ fontSize: 12.5, color: C.inkSoft, margin: "0 0 12px", lineHeight: 1.45 }}>
          Da de alta cada vivero o tienda donde dejes tarjetas. Cada uno tiene su propio QR, así sabes cuánta gente llega de ahí y cuántos terminan contratándote.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const d = await enviar({ nombre, zona });
            if (d?.slug) {
              setNombre("");
              setZona("");
              setAbierto(d.slug);
            }
          }}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (ej. Vivero Coyoacán)" style={campoAdmin} />
          <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Zona (opcional, ej. Coyoacán)" style={campoAdmin} />
          <button type="submit" disabled={guardando || !nombre.trim()} style={{ ...botonChico, background: nombre.trim() ? C.green : C.cardLine, color: nombre.trim() ? "#fff" : C.inkSoft, padding: "12px 0" }}>
            {guardando ? "Guardando..." : "Agregar vivero"}
          </button>
        </form>
      </div>

      {datos.viveros.length === 0 ? (
        <p style={{ textAlign: "center", color: C.inkSoft, fontSize: 13.5, margin: "8px 0 16px" }}>Todavía no das de alta ningún vivero.</p>
      ) : (
        datos.viveros.map((v) => {
          const link = `${origen}/v/${v.slug}`;
          const qr = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=${encodeURIComponent(link)}`;
          return (
            <div key={v.slug} style={{ ...tarjeta, opacity: v.activo ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: C.ink }}>{v.nombre}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: C.inkSoft, wordBreak: "break-all" }}>
                    {v.zona ? `${v.zona} · ` : ""}
                    {link.replace(/^https?:\/\//, "")}
                  </p>
                </div>
                <button onClick={() => enviar({ slug: v.slug, activo: !v.activo })} style={{ ...botonChico, background: C.tileBg, flexShrink: 0 }}>
                  {v.activo ? "Pausar" : "Reactivar"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12, padding: "10px 0", borderTop: "1px solid " + C.cardLine, borderBottom: "1px solid " + C.cardLine }}>
                <Numero v={v.personas} l="llegaron" />
                <Numero v={v.conPlantas} l="registraron planta" />
                <Numero v={v.clientes} l="te contrataron" />
                <Numero v={pesos(v.ingresos)} l="ingresos" />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setAbierto(abierto === v.slug ? null : v.slug)} style={{ ...botonChico, flex: 1, background: C.green, color: "#fff", padding: "10px 0" }}>
                  {abierto === v.slug ? "Ocultar QR" : "Ver QR"}
                </button>
                <button
                  onClick={() => navigator.clipboard?.writeText(link).then(() => alert("Enlace copiado"))}
                  style={{ ...botonChico, flex: 1, background: C.tileBg, padding: "10px 0" }}
                >
                  Copiar enlace
                </button>
              </div>
              {abierto === v.slug && (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <img src={qr} alt={`Código QR de ${v.nombre}`} style={{ width: "100%", maxWidth: 260, background: "#fff", borderRadius: 14 }} />
                  <p style={{ fontSize: 12, color: C.inkSoft, margin: "6px 0 0" }}>
                    Para imprimirlo:{" "}
                    <a href={qr} target="_blank" rel="noopener" style={{ color: C.green, fontWeight: 700 }}>
                      abrir el QR en grande
                    </a>{" "}
                    y guardarlo como imagen.
                  </p>
                </div>
              )}
            </div>
          );
        })
      )}

      <div style={tarjeta}>
        <p style={{ fontWeight: 800, fontSize: 15, color: C.ink, margin: "0 0 4px" }}>Invita a un amigo</p>
        <p style={{ fontSize: 12.5, color: C.inkSoft, margin: "0 0 10px", lineHeight: 1.45 }}>
          El amigo recibe $100 de descuento en su primer mantenimiento y quien lo invitó gana $100 de crédito cuando el amigo paga.
        </p>
        <div style={{ display: "flex", gap: 6, padding: "10px 0", borderTop: "1px solid " + C.cardLine }}>
          <Numero v={datos.invitaciones.personas} l="amigos invitados" />
          <Numero v={datos.invitaciones.clientes} l="te contrataron" />
          <Numero v={pesos(datos.invitaciones.ingresos)} l="ingresos" />
          <Numero v={datos.invitaciones.creditosDados} l="créditos dados" />
        </div>
      </div>
    </div>
  );
}

const campoAdmin = { width: "100%", border: "1px solid #e2d7b8", borderRadius: 12, padding: "11px 12px", fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#221C13", background: "#EFE6CC" };

// ---------- Zonas donde das servicio (se ven en /conoce) ----------
function ZonasConfig({ password }) {
  const [zonas, setZonas] = useState(null);
  const [borrador, setBorrador] = useState("");
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    fetch("/api/admin/zonas", { headers: { "x-admin-password": password } })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || "No se pudieron cargar las zonas.");
        setZonas(d.zonas);
        setBorrador(d.zonas.join("\n"));
      })
      .catch((e) => setError(e.message));
  }, [password]);
  const lista = borrador.split(/\n|,/).map((z) => z.trim()).filter(Boolean);
  const hayCambios = zonas && lista.join("|") !== zonas.join("|");
  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/zonas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ zonas: lista }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo guardar.");
      setZonas(d.zonas);
      setBorrador(d.zonas.join("\n"));
      setListo(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "16px 16px", marginBottom: 12 }}>
      <p style={{ fontWeight: 800, fontSize: 15, color: C.ink, margin: "0 0 4px" }}>Zonas donde das servicio</p>
      <p style={{ fontSize: 12.5, color: C.inkSoft, margin: "0 0 10px", lineHeight: 1.45 }}>
        Una por renglón (alcaldías o colonias). Aparecen en tu página de presentación{" "}
        <a href="/conoce" target="_blank" rel="noopener" style={{ color: C.green, fontWeight: 700 }}>/conoce</a>.
      </p>
      {zonas === null && !error ? (
        <div className="admin-esq" style={{ height: 96, borderRadius: 12 }} />
      ) : (
        <textarea
          value={borrador}
          onChange={(e) => {
            setListo(false);
            setBorrador(e.target.value);
          }}
          rows={5}
          aria-label="Zonas donde das servicio, una por renglón"
          placeholder={"Coyoacán\nBenito Juárez\nCuauhtémoc"}
          style={{ ...campoAdmin, resize: "vertical", lineHeight: 1.45 }}
        />
      )}
      {error && <p style={{ color: C.red, fontSize: 13, margin: "8px 0 0" }}>{error}</p>}
      <button
        onClick={guardar}
        disabled={guardando || !hayCambios || lista.length === 0}
        style={{ marginTop: 10, width: "100%", padding: "13px 0", borderRadius: 14, border: "none", background: hayCambios && lista.length ? C.green : C.cardLine, color: hayCambios && lista.length ? "#fff" : C.inkSoft, fontFamily: F, fontWeight: 800, fontSize: 15, cursor: hayCambios ? "pointer" : "default" }}
      >
        {guardando ? "Guardando..." : hayCambios ? `Guardar ${lista.length} ${lista.length === 1 ? "zona" : "zonas"}` : listo ? "Guardado ✓" : "Sin cambios"}
      </button>
    </div>
  );
}

// ---------- Precios del mantenimiento ----------
function PreciosConfig({ precios, onGuardar }) {
  const aPesos = (p) => Object.fromEntries(TAMANOS.map((t) => [t.key, String(Math.round((p[t.key] || t.precio) / 100))]));
  const [borrador, setBorrador] = useState(() => aPesos(precios));
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  useEffect(() => setBorrador(aPesos(precios)), [precios]);

  const errores = {};
  TAMANOS.forEach((t) => {
    const v = Number(borrador[t.key]);
    if (!/^\d+$/.test(borrador[t.key] || "") || v * 100 < PRECIO_MINIMO || v * 100 > PRECIO_MAXIMO) {
      errores[t.key] = `Entre ${formatoPrecio(PRECIO_MINIMO)} y ${formatoPrecio(PRECIO_MAXIMO)}`;
    }
  });
  const hayErrores = Object.keys(errores).length > 0;
  const hayCambios = TAMANOS.some((t) => Number(borrador[t.key]) * 100 !== precios[t.key]);

  async function guardar() {
    if (hayErrores) return;
    if (!window.confirm("¿Guardar los nuevos precios? Se aplican a las reservaciones nuevas desde este momento (las ya pagadas no cambian).")) return;
    setGuardando(true);
    const ok = await onGuardar(Object.fromEntries(TAMANOS.map((t) => [t.key, Number(borrador[t.key]) * 100])));
    setGuardando(false);
    if (ok) setListo(true);
  }

  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "16px 16px", marginBottom: 12 }}>
      <p style={{ fontWeight: 800, fontSize: 15, color: C.ink, margin: "0 0 4px" }}>Precios del mantenimiento</p>
      <p style={{ fontSize: 12.5, color: C.inkSoft, margin: "0 0 12px", lineHeight: 1.45 }}>
        En pesos, con impuestos incluidos. Se actualizan solos en la Tienda y en los Términos.
      </p>
      {TAMANOS.map((t) => (
        <label key={t.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid " + C.cardLine }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 700, fontSize: 14, color: C.ink }}>Jardín {t.nombre.toLowerCase()}</span>
            <span style={{ display: "block", fontSize: 12, color: errores[t.key] ? C.red : C.inkSoft }}>{errores[t.key] || t.incluye[0]}</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", background: C.tileBg, border: "1px solid " + (errores[t.key] ? C.red : C.cardLine), borderRadius: 12, padding: "0 10px" }}>
            <span style={{ color: C.inkSoft, fontWeight: 700 }}>$</span>
            <input
              inputMode="numeric"
              value={borrador[t.key]}
              onChange={(e) => {
                setListo(false);
                setBorrador((b) => ({ ...b, [t.key]: e.target.value.replace(/\D/g, "").slice(0, 6) }));
              }}
              aria-label={`Precio jardín ${t.nombre.toLowerCase()} en pesos`}
              style={{ width: 80, border: "none", background: "transparent", padding: "10px 4px", fontFamily: F, fontSize: 16, fontWeight: 700, color: C.ink, textAlign: "right" }}
            />
          </span>
        </label>
      ))}
      <button
        onClick={guardar}
        disabled={guardando || !hayCambios || hayErrores}
        style={{ marginTop: 12, width: "100%", padding: "13px 0", borderRadius: 14, border: "none", background: hayCambios && !hayErrores ? C.green : C.cardLine, color: hayCambios && !hayErrores ? "#fff" : C.inkSoft, fontFamily: F, fontWeight: 800, fontSize: 15, cursor: hayCambios && !hayErrores ? "pointer" : "default" }}
      >
        {guardando ? "Guardando..." : hayCambios ? "Guardar precios" : listo ? "Guardado ✓" : "Sin cambios"}
      </button>
    </div>
  );
}

// ---------- Agenda: cuántas visitas aceptas, qué días y a qué horas ----------
function AgendaConfig({ agenda, onGuardar }) {
  const [a, setA] = useState(agenda);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  useEffect(() => setA(agenda), [agenda]);
  const cambiar = (campo, valor) => {
    setListo(false);
    setA((x) => ({ ...x, [campo]: valor }));
  };
  const alternar = (campo, v) => cambiar(campo, a[campo].includes(v) ? a[campo].filter((x) => x !== v) : [...a[campo], v]);
  const hayCambios = JSON.stringify(normalizarAgenda(a)) !== JSON.stringify(agenda);

  const tarjeta = { background: C.card, borderRadius: 18, padding: "16px 16px", marginBottom: 12 };
  const titulo = { fontWeight: 800, fontSize: 15, color: C.ink, margin: "0 0 4px" };
  const ayuda = { fontSize: 12.5, color: C.inkSoft, margin: "0 0 12px", lineHeight: 1.45 };
  const pastilla = (activa) => ({
    border: activa ? "2px solid " + C.green : "1px solid " + C.cardLine,
    background: activa ? C.green : C.tileBg,
    color: activa ? "#fff" : C.ink,
    borderRadius: 12,
    padding: "9px 12px",
    fontFamily: F,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  });
  const Contador = ({ campo, min, max, sufijo }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button aria-label="Menos" onClick={() => cambiar(campo, Math.max(min, a[campo] - 1))} style={{ ...botonChico, width: 44, height: 44, fontSize: 20, background: C.tileBg }}>−</button>
      <span style={{ fontSize: 22, fontWeight: 800, color: C.ink, minWidth: 30, textAlign: "center" }}>{a[campo]}</span>
      <button aria-label="Más" onClick={() => cambiar(campo, Math.min(max, a[campo] + 1))} style={{ ...botonChico, width: 44, height: 44, fontSize: 20, background: C.tileBg }}>+</button>
      <span style={{ fontSize: 13, color: C.inkSoft }}>{sufijo}</span>
    </div>
  );

  async function guardar() {
    setGuardando(true);
    const ok = await onGuardar(normalizarAgenda(a));
    setGuardando(false);
    if (ok) setListo(true);
  }

  return (
    <div>
      <div style={tarjeta}>
        <p style={titulo}>Visitas a la misma hora</p>
        <p style={ayuda}>Cuántos clientes pueden reservar exactamente el mismo horario. Si trabajas solo, déjalo en 1.</p>
        <Contador campo="capacidadPorHorario" min={1} max={10} sufijo={a.capacidadPorHorario === 1 ? "visita por horario" : "visitas por horario"} />
      </div>

      <div style={tarjeta}>
        <p style={titulo}>Máximo de visitas por día</p>
        <p style={ayuda}>Cuando un día llega a este número, ya no se puede reservar ninguna hora de ese día.</p>
        <Contador campo="maximoPorDia" min={1} max={30} sufijo={a.maximoPorDia === 1 ? "visita al día" : "visitas al día"} />
      </div>

      <div style={tarjeta}>
        <p style={titulo}>Días que trabajas</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button key={d} onClick={() => alternar("diasSemana", d)} aria-pressed={a.diasSemana.includes(d)} style={pastilla(a.diasSemana.includes(d))}>
              {NOMBRES_DIAS_SEMANA[d]}
            </button>
          ))}
        </div>
      </div>

      <div style={tarjeta}>
        <p style={titulo}>Horarios</p>
        <p style={ayuda}>La hora a la que llegas. Toca para activar o quitar.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {HORARIOS_POSIBLES.map((h) => (
            <button key={h} onClick={() => alternar("horarios", h)} aria-pressed={a.horarios.includes(h)} style={pastilla(a.horarios.includes(h))}>
              {h}
            </button>
          ))}
        </div>
      </div>

      <div style={tarjeta}>
        <p style={titulo}>Anticipación mínima</p>
        <p style={ayuda}>Con cuántos días de anticipación hay que reservar.</p>
        <Contador campo="anticipacionDias" min={1} max={14} sufijo={a.anticipacionDias === 1 ? "día (desde mañana)" : "días"} />
      </div>

      <div style={tarjeta}>
        <p style={titulo}>Días bloqueados</p>
        <p style={ayuda}>Vacaciones o días que no puedes. También los bloqueas tocando el día en el Calendario.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="date"
            value={nuevaFecha}
            min={hoyISO()}
            onChange={(e) => setNuevaFecha(e.target.value)}
            style={{ flex: 1, minWidth: 0, border: "1px solid " + C.cardLine, borderRadius: 12, padding: "10px 12px", fontFamily: F, fontSize: 16, color: C.ink, background: C.tileBg }}
          />
          <button
            disabled={!nuevaFecha}
            onClick={() => {
              if (nuevaFecha && !a.fechasBloqueadas.includes(nuevaFecha)) cambiar("fechasBloqueadas", [...a.fechasBloqueadas, nuevaFecha].sort());
              setNuevaFecha("");
            }}
            style={{ ...botonChico, background: C.green, color: "#fff", padding: "0 16px" }}
          >
            Bloquear
          </button>
        </div>
        {a.fechasBloqueadas.length === 0 ? (
          <p style={{ fontSize: 13, color: C.inkSoft, margin: "10px 0 0" }}>No tienes días bloqueados.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {a.fechasBloqueadas.map((f) => (
              <span key={f} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.tileBg, borderRadius: 999, padding: "6px 6px 6px 12px", fontSize: 13, color: C.ink }}>
                {fechaLarga(f)}
                <button onClick={() => alternar("fechasBloqueadas", f)} aria-label={`Desbloquear ${f}`} style={{ border: "none", background: C.card, borderRadius: "50%", width: 24, height: 24, cursor: "pointer", color: C.red, fontWeight: 800 }}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {(a.diasSemana.length === 0 || a.horarios.length === 0) && (
        <p style={{ color: C.red, fontSize: 13, margin: "0 4px 10px" }}>Ojo: sin días u horarios activos nadie podrá reservar.</p>
      )}
      <button
        onClick={guardar}
        disabled={guardando || !hayCambios}
        style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: hayCambios ? C.green : C.cardLine, color: hayCambios ? "#fff" : C.inkSoft, fontFamily: F, fontWeight: 800, fontSize: 15, cursor: hayCambios ? "pointer" : "default" }}
      >
        {guardando ? "Guardando..." : hayCambios ? "Guardar cambios" : listo ? "Guardado ✓" : "Sin cambios"}
      </button>
      <p style={{ fontSize: 12, color: C.inkSoft, margin: "10px 4px 0", lineHeight: 1.45 }}>
        Los cambios aplican para reservaciones nuevas. Las citas que ya tienes no se mueven.
      </p>
    </div>
  );
}

// ---------- Calendario mensual de citas ----------
const NOMBRES_DIAS = ["L", "M", "M", "J", "V", "S", "D"];

function Calendario({ reservaciones, hoy, actualizando, onCambiarEstado, agenda, onAlternarBloqueo }) {
  const [mes, setMes] = useState(hoy.slice(0, 7)); // "YYYY-MM"
  const [seleccionado, setSeleccionado] = useState(hoy);

  const [y, m] = mes.split("-").map(Number);
  const diasDelMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const primero = `${mes}-01`;
  const huecoInicial = (diaSemana(primero) + 6) % 7; // semana empieza en lunes
  const nombreMesTexto = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
  const nombreMes = nombreMesTexto.charAt(0).toUpperCase() + nombreMesTexto.slice(1);

  // Citas por día (sin las canceladas)
  const porDia = useMemo(() => {
    const mapa = {};
    reservaciones.forEach((r) => {
      if (r.estado === "cancelado") return;
      (mapa[r.fecha] = mapa[r.fecha] || []).push(r);
    });
    Object.values(mapa).forEach((lista) => lista.sort((a, b) => horaAMinutos(a.hora) - horaAMinutos(b.hora)));
    return mapa;
  }, [reservaciones]);

  const citasMes = Object.entries(porDia).filter(([f]) => f.startsWith(mes)).reduce((n, [, l]) => n + l.length, 0);

  function moverMes(delta) {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const nuevo = d.toISOString().slice(0, 7);
    setMes(nuevo);
    setSeleccionado(nuevo === hoy.slice(0, 7) ? hoy : `${nuevo}-01`);
  }

  const celdas = [];
  for (let k = 0; k < huecoInicial; k++) celdas.push(null);
  for (let d = 1; d <= diasDelMes; d++) celdas.push(`${mes}-${String(d).padStart(2, "0")}`);

  const delDia = porDia[seleccionado] || [];
  const canceladasDelDia = reservaciones.filter((r) => r.fecha === seleccionado && r.estado === "cancelado").length;
  const flecha = { ...botonChico, width: 40, height: 40, padding: 0, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <div>
      <div style={{ background: C.card, borderRadius: 20, padding: "14px 12px 12px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
          <button onClick={() => moverMes(-1)} aria-label="Mes anterior" style={flecha}>‹</button>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 16, color: C.ink, margin: 0 }}>{nombreMes}</p>
            <p style={{ fontSize: 12, color: C.inkSoft, margin: "2px 0 0" }}>
              {citasMes === 0 ? "Sin citas" : `${citasMes} ${citasMes === 1 ? "cita" : "citas"}`}
              {mes !== hoy.slice(0, 7) && (
                <>
                  {" · "}
                  <button
                    onClick={() => {
                      setMes(hoy.slice(0, 7));
                      setSeleccionado(hoy);
                    }}
                    style={{ background: "none", border: "none", padding: 0, color: C.green, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: F }}
                  >
                    Ir a hoy
                  </button>
                </>
              )}
            </p>
          </div>
          <button onClick={() => moverMes(1)} aria-label="Mes siguiente" style={flecha}>›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
          {NOMBRES_DIAS.map((n, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 11.5, fontWeight: 700, color: i >= 5 ? C.green : C.inkSoft, padding: "2px 0 6px" }}>
              {n}
            </div>
          ))}
          {celdas.map((f, i) => {
            if (!f) return <div key={"v" + i} />;
            const citas = porDia[f] || [];
            const esHoy = f === hoy;
            const sel = f === seleccionado;
            // Días en que trabajas (según tu agenda) y días bloqueados
            const trabaja = agenda ? agenda.diasSemana.includes(diaSemana(f)) : i % 7 >= 5;
            const bloqueado = !!agenda?.fechasBloqueadas.includes(f);
            const pasado = f < hoy;
            return (
              <button
                key={f}
                onClick={() => setSeleccionado(f)}
                aria-label={`${fechaLarga(f)}: ${citas.length} ${citas.length === 1 ? "cita" : "citas"}${bloqueado ? " (bloqueado)" : ""}`}
                aria-pressed={sel}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1.05",
                  minHeight: 42,
                  border: esHoy && !sel ? "2px solid " + C.green : "none",
                  borderRadius: 12,
                  background: sel ? C.green : bloqueado ? "repeating-linear-gradient(135deg, rgba(156,59,46,0.10) 0 4px, transparent 4px 8px)" : trabaja ? "rgba(63,93,62,0.08)" : "transparent",
                  color: sel ? "#fff" : pasado ? "#a89c80" : C.ink,
                  cursor: "pointer",
                  fontFamily: F,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: 0,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: citas.length ? 800 : 500, textDecoration: bloqueado && !sel ? "line-through" : "none" }}>{Number(f.slice(8))}</span>
                <span style={{ display: "flex", gap: 3, height: 6 }}>
                  {citas.slice(0, 4).map((r) => (
                    <span
                      key={r.id}
                      style={{ width: 6, height: 6, borderRadius: "50%", background: sel ? "#fff" : (ESTADOS[r.estado] || {}).color || C.inkSoft }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginTop: 12 }}>
          {["pagado", "pendiente_pago", "completado", "conflicto"].map((k) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.inkSoft }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: ESTADOS[k].color }} />
              {k === "conflicto" ? "Duplicada" : ESTADOS[k].label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 4px 8px" }}>
        <p style={{ fontWeight: 800, fontSize: 15, color: C.ink, margin: 0 }}>
          {seleccionado === hoy ? "Hoy · " : ""}
          {fechaLarga(seleccionado)}
        </p>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, margin: 0 }}>
          {delDia.length} {delDia.length === 1 ? "cita" : "citas"}
        </p>
      </div>
      {agenda && seleccionado >= hoy && (
        <button
          onClick={() => onAlternarBloqueo(seleccionado)}
          style={{ ...botonChico, width: "100%", marginBottom: 10, padding: "11px 0", color: agenda.fechasBloqueadas.includes(seleccionado) ? C.green : C.red }}
        >
          {agenda.fechasBloqueadas.includes(seleccionado) ? "Desbloquear este día (volver a aceptar citas)" : "Bloquear este día (no aceptar citas)"}
        </button>
      )}
      {delDia.length === 0 ? (
        <p style={{ textAlign: "center", color: C.inkSoft, fontSize: 14, padding: "24px 0" }}>
          Sin citas este día{canceladasDelDia ? ` (${canceladasDelDia} cancelada${canceladasDelDia > 1 ? "s" : ""})` : ""}.
        </p>
      ) : (
        delDia.map((r) => <Cita key={r.id} r={r} actualizando={actualizando === r.id} onCambiarEstado={onCambiarEstado} />)
      )}
    </div>
  );
}

const botonChico = {
  background: C.card,
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  fontFamily: F,
  fontWeight: 700,
  fontSize: 12.5,
  color: C.ink,
  cursor: "pointer",
};

function Stat({ valor, label, destacado }) {
  return (
    <div style={{ background: destacado ? C.green : C.card, borderRadius: 16, padding: "14px 14px" }}>
      <p style={{ fontWeight: 800, fontSize: 24, color: destacado ? "#fff" : C.ink, margin: 0, letterSpacing: "-0.01em" }}>{valor}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: destacado ? "rgba(255,255,255,0.8)" : C.inkSoft, margin: "2px 0 0" }}>{label}</p>
    </div>
  );
}

function Cita({ r, actualizando, onCambiarEstado }) {
  const est = ESTADOS[r.estado] || { label: r.estado, color: C.inkSoft };
  const accion = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, flex: 1, minWidth: 0, padding: "10px 8px", borderRadius: 11, fontFamily: F, fontWeight: 700, fontSize: 12.5, textDecoration: "none", cursor: "pointer", border: "none" };
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", marginBottom: 8, opacity: r.estado === "cancelado" ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 17, color: C.ink, margin: 0 }}>{r.hora}</p>
          <p style={{ fontWeight: 600, fontSize: 14, color: C.ink, margin: "2px 0 0" }}>{r.nombre_contacto}</p>
        </div>
        <span style={{ flexShrink: 0, fontWeight: 700, fontSize: 11, color: est.color, background: est.color + "1F", padding: "5px 10px", borderRadius: 10 }}>
          {est.label}
        </span>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        <p style={{ fontSize: 13, color: C.ink, margin: 0 }}>📍 {r.direccion || "Sin dirección"}</p>
        <p style={{ fontSize: 13, color: C.inkSoft, margin: 0 }}>
          📞 {r.telefono}
          {r.correo ? ` · ${r.correo}` : ""}
        </p>
        {r.notas && <p style={{ fontSize: 13, color: C.inkSoft, margin: 0, lineHeight: 1.4 }}>📝 {r.notas}</p>}
        <p style={{ fontSize: 12, color: C.inkSoft, margin: 0 }}>
          {tamanoPorClave(r.tamano) ? `Jardín ${tamanoPorClave(r.tamano).nombre.toLowerCase()} · ` : ""}
          ${(r.precio_centavos / 100).toFixed(0)} MXN{r.metodo_pago ? ` · ${r.metodo_pago === "oxxo" ? "OXXO" : "Tarjeta"}` : ""}
        </p>
        {r.reembolso_estado && (
          <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0, color: r.reembolso_estado === "pendiente_manual" ? C.red : C.inkSoft }}>
            {r.reembolso_estado === "hecho"
              ? `Cancelada por el cliente · se le devolvieron $${((r.reembolso_centavos || 0) / 100).toFixed(0)} a su tarjeta`
              : r.reembolso_estado === "pendiente_manual"
              ? `Cancelada por el cliente · DEPOSÍTALE $${((r.reembolso_centavos || 0) / 100).toFixed(0)} (pagó en OXXO)`
              : r.reembolso_estado === "depositado"
              ? `Cancelada por el cliente · ya se le depositaron $${((r.reembolso_centavos || 0) / 100).toFixed(0)}`
              : "Cancelada por el cliente · sin reembolso"}
          </p>
        )}
        {r.estado === "conflicto" && (
          <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0, color: C.red }}>
            {MOTIVOS_CONFLICTO[r.conflicto_motivo] || "Pagó un horario que ya estaba ocupado."} Pagó con {r.metodo_pago === "oxxo" ? "OXXO (reembolso por depósito)" : "tarjeta (reembolso desde Stripe)"}.
          </p>
        )}
        {r.reembolso_estado === "revisar" && (
          <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0, color: C.red }}>
            Se cortó la conexión con Stripe al reembolsar: revisa en Stripe si el reembolso se hizo. Si no, hazlo desde ahí.
          </p>
        )}
        {(r.reembolso_estado === "pendiente_manual" || r.reembolso_estado === "revisar") && (
          <button
            onClick={() => window.confirm("¿Ya le regresaste su dinero a este cliente?") && onCambiarEstado(r.id, "reembolso_depositado")}
            disabled={actualizando}
            style={{ alignSelf: "flex-start", marginTop: 4, padding: "8px 12px", borderRadius: 10, border: "none", background: C.green, color: "#fff", fontFamily: F, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
          >
            {actualizando ? "..." : r.reembolso_estado === "revisar" ? "Ya está reembolsado" : "Ya le deposité"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {r.direccion && (
          <a href={linkMaps(r.direccion)} target="_blank" rel="noopener noreferrer" style={{ ...accion, background: C.tileBg, color: C.ink }}>
            Cómo llegar
          </a>
        )}
        <a href={linkWhatsApp(r)} target="_blank" rel="noopener noreferrer" style={{ ...accion, background: C.tileBg, color: C.ink }}>
          WhatsApp
        </a>
        {r.estado === "conflicto" && (
          <>
            <button onClick={() => window.confirm("¿Ya acordaste la visita con el cliente? (si le cambiaste la fecha, la verás igual; avísale)") && onCambiarEstado(r.id, "pagado")} disabled={actualizando} style={{ ...accion, background: C.green, color: "#fff" }}>
              Mantener la cita
            </button>
            <button onClick={() => window.confirm("¿Ya le regresaste todo su dinero?") && onCambiarEstado(r.id, "cancelado")} disabled={actualizando} style={{ ...accion, background: C.tileBg, color: C.red }}>
              Ya le reembolsé
            </button>
          </>
        )}
        {r.estado === "pagado" && (
          <button onClick={() => onCambiarEstado(r.id, "completado")} disabled={actualizando} style={{ ...accion, background: C.green, color: "#fff" }}>
            {actualizando ? "..." : "Marcar completada"}
          </button>
        )}
        {r.estado === "completado" && (
          <button onClick={() => onCambiarEstado(r.id, "pagado")} disabled={actualizando} style={{ ...accion, background: "transparent", color: C.inkSoft, border: "1px solid " + C.cardLine }}>
            {actualizando ? "..." : "Deshacer"}
          </button>
        )}
      </div>
    </div>
  );
}
