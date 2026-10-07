// Panel de administrador de Ámbitat: aquí ves todas las citas de
// mantenimiento que reservan tus clientes. Se entra con la contraseña que
// guardas en Vercel como ADMIN_PASSWORD (nunca está escrita en el código).
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { diaCDMX, sumarDias, diaSemana } from "../lib/fechas";
import { tamanoPorClave } from "../lib/servicio";

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

const ESTADOS = {
  pagado: { label: "Pagado", color: C.green },
  pendiente_pago: { label: "Pendiente de pago", color: "#8a6110" },
  completado: { label: "Completada", color: C.blue },
  cancelado: { label: "Cancelado", color: C.red },
  conflicto: { label: "Horario duplicado · reembolsar", color: C.red },
};

const CLAVE_SESION = "ambitat-admin-pw";

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

// "YYYY-MM-DD" de hoy en la hora local del teléfono/computadora
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
  const [vista, setVista] = useState("proximas"); // proximas | calendario | historial
  const [mes, setMes] = useState(() => hoyISO().slice(0, 7)); // "YYYY-MM" del calendario
  const [diaSel, setDiaSel] = useState(() => hoyISO());
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
      setReservaciones((prev) => prev.map((r) => (r.id === id ? { ...r, estado } : r)));
    } catch (err) {
      alert(err.message);
    }
    setActualizando(null);
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
    const dia = diaSemana(hoy); // 0 domingo, 6 sábado
    const finde = dia === 0 ? [hoy] : [sumarDias(hoy, 6 - dia), sumarDias(hoy, 7 - dia)];
    const confirmadas = reservaciones.filter((r) => r.estado === "pagado");
    return {
      esteFinde: confirmadas.filter((r) => finde.includes(r.fecha)).length,
      proximas: confirmadas.filter((r) => r.fecha >= hoy).length,
      pendientes: reservaciones.filter((r) => r.estado === "pendiente_pago" && r.fecha >= hoy).length,
      conflictos: reservaciones.filter((r) => r.estado === "conflicto").length,
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
                <strong>{resumen.conflictos === 1 ? "1 cita pagó" : `${resumen.conflictos} citas pagaron`} un horario que ya estaba ocupado</strong>{" "}
                (normalmente un pago en OXXO que llegó tarde). Escríbele al cliente para cambiar el horario o hazle el reembolso desde Stripe.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              <Stat valor={resumen.esteFinde} label="Citas este fin de semana" destacado />
              <Stat valor={resumen.proximas} label="Próximas confirmadas" />
              <Stat valor={resumen.pendientes} label="Esperando pago (OXXO)" />
              <Stat valor={`$${(resumen.cobrado / 100).toLocaleString("es-MX")}`} label="Cobrado en total" />
            </div>

            <div style={{ display: "flex", background: C.card, borderRadius: 14, padding: 4, marginBottom: 12 }}>
              {[
                ["proximas", "Próximas"],
                ["calendario", "Calendario"],
                ["historial", "Historial"],
              ].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setVista(k)}
                  style={{ flex: 1, border: "none", borderRadius: 11, padding: "10px 0", fontFamily: F, fontWeight: 700, fontSize: 13.5, cursor: "pointer", background: vista === k ? C.green : "transparent", color: vista === k ? "#fff" : C.inkSoft }}
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

            {vista === "calendario" ? (
              <Calendario
                reservaciones={reservaciones}
                mes={mes}
                setMes={setMes}
                diaSel={diaSel}
                setDiaSel={setDiaSel}
                hoy={hoy}
                actualizando={actualizando}
                onCambiarEstado={cambiarEstado}
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

const NOMBRES_DIAS = ["L", "M", "M", "J", "V", "S", "D"];

// Prioridad de colores en cada día: lo urgente primero.
function colorDelDia(citas) {
  if (citas.some((r) => r.estado === "conflicto")) return C.red;
  if (citas.some((r) => r.estado === "pagado")) return C.green;
  if (citas.some((r) => r.estado === "pendiente_pago")) return C.amber;
  return C.blue; // solo completadas
}

function Calendario({ reservaciones, mes, setMes, diaSel, setDiaSel, hoy, actualizando, onCambiarEstado }) {
  const [anio, numMes] = mes.split("-").map(Number);

  // Citas por día (las canceladas no cuentan en el calendario)
  const porDia = useMemo(() => {
    const m = {};
    reservaciones.forEach((r) => {
      if (r.estado === "cancelado") return;
      (m[r.fecha] = m[r.fecha] || []).push(r);
    });
    return m;
  }, [reservaciones]);

  const diasDelMes = new Date(Date.UTC(anio, numMes, 0)).getUTCDate();
  const primero = `${mes}-01`;
  const huecos = (diaSemana(primero) + 6) % 7; // la semana empieza en lunes
  const celdas = [];
  for (let i = 0; i < huecos; i++) celdas.push(null);
  for (let d = 1; d <= diasDelMes; d++) celdas.push(`${mes}-${String(d).padStart(2, "0")}`);

  const nombreMes = new Date(Date.UTC(anio, numMes - 1, 1)).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
  const irAMes = (delta) => {
    const f = new Date(Date.UTC(anio, numMes - 1 + delta, 1));
    setMes(f.toISOString().slice(0, 7));
  };
  const irAHoy = () => {
    setMes(hoy.slice(0, 7));
    setDiaSel(hoy);
  };

  // Todas las citas del día elegido (incluye canceladas, atenuadas)
  const delDia = reservaciones
    .filter((r) => r.fecha === diaSel)
    .sort((a, b) => horaAMinutos(a.hora) - horaAMinutos(b.hora));

  const citasMes = celdas.reduce((n, f) => n + (f && porDia[f] ? porDia[f].length : 0), 0);
  const flecha = { background: C.tileBg, border: "none", borderRadius: 10, width: 36, height: 36, fontFamily: F, fontWeight: 800, fontSize: 18, color: C.ink, cursor: "pointer" };

  return (
    <div>
      <div style={{ background: C.card, borderRadius: 18, padding: "14px 12px 12px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={() => irAMes(-1)} aria-label="Mes anterior" style={flecha}>‹</button>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 16, color: C.ink, margin: 0, textTransform: "capitalize" }}>{nombreMes}</p>
            <p style={{ fontSize: 12, color: C.inkSoft, margin: "1px 0 0" }}>
              {citasMes} {citasMes === 1 ? "cita" : "citas"} este mes
              {mes !== hoy.slice(0, 7) && (
                <>
                  {" · "}
                  <button onClick={irAHoy} style={{ background: "none", border: "none", padding: 0, fontFamily: F, fontSize: 12, fontWeight: 700, color: C.green, cursor: "pointer", textDecoration: "underline" }}>
                    ir a hoy
                  </button>
                </>
              )}
            </p>
          </div>
          <button onClick={() => irAMes(1)} aria-label="Mes siguiente" style={flecha}>›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {NOMBRES_DIAS.map((n, i) => (
            <p key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.inkSoft, margin: "0 0 2px" }}>{n}</p>
          ))}
          {celdas.map((f, i) => {
            if (!f) return <div key={"v" + i} />;
            const citas = porDia[f] || [];
            const esHoy = f === hoy;
            const elegido = f === diaSel;
            const col = citas.length ? colorDelDia(citas) : null;
            return (
              <button
                key={f}
                onClick={() => setDiaSel(f)}
                style={{
                  aspectRatio: "1 / 1.05",
                  borderRadius: 11,
                  border: elegido ? "2px solid " + C.green : esHoy ? "2px solid " + C.amber : "2px solid transparent",
                  background: elegido ? C.tileBg : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  padding: 0,
                  fontFamily: F,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: esHoy || elegido ? 800 : 600, color: C.ink }}>{Number(f.slice(8))}</span>
                {col ? (
                  <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: col, color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    {citas.length}
                  </span>
                ) : (
                  <span style={{ height: 18 }} />
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 12, paddingLeft: 4 }}>
          {[
            [C.green, "Pagada"],
            [C.amber, "Esperando pago"],
            [C.red, "Conflicto"],
            [C.blue, "Completada"],
          ].map(([c, l]) => (
            <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.inkSoft }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "0 4px 8px" }}>
        <p style={{ fontWeight: 800, fontSize: 15, color: C.ink, margin: 0 }}>
          {diaSel === hoy ? "Hoy · " : ""}
          {fechaLarga(diaSel)}
        </p>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, margin: 0 }}>
          {delDia.length} {delDia.length === 1 ? "cita" : "citas"}
        </p>
      </div>
      {delDia.length === 0 ? (
        <p style={{ textAlign: "center", color: C.inkSoft, fontSize: 14, padding: "24px 0" }}>No hay citas este día.</p>
      ) : (
        delDia.map((r) => <Cita key={r.id} r={r} actualizando={actualizando === r.id} onCambiarEstado={onCambiarEstado} />)
      )}
    </div>
  );
}

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
