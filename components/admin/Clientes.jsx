// Panel → Clientes: todos los que han reservado, con sus datos, su historial
// y tus notas privadas ("portón azul", "tiene perro"...).
import { useMemo, useState } from "react";
import { C, F, tarjeta, textoSuave, campoAdmin, botonChico, EsqueletoTarjetas, MensajeError, pesos, useDatosAdmin, llamarAdmin, enlaceWhatsAppA } from "./comun";
import { tamanoPorClave } from "../../lib/servicio";

const ESTADO = { pagado: "Confirmada", completado: "Completada", cancelado: "Cancelada", pendiente_pago: "Sin pagar", conflicto: "Por resolver" };
const fechaCorta = (f) => new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "2-digit" });

function Cliente({ c, password, onNota, notasDisponibles }) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState(c.nota);
  const [guardando, setGuardando] = useState(false);
  const [estadoNota, setEstadoNota] = useState(null);
  const cambio = nota.trim() !== (c.nota || "").trim();

  async function guardar() {
    setGuardando(true);
    setEstadoNota(null);
    try {
      const d = await llamarAdmin(password, "/api/admin/clientes", { userId: c.userId, nota });
      onNota(c.userId, d.nota);
      setEstadoNota({ ok: true, texto: "Guardada ✓" });
    } catch (e) {
      setEstadoNota({ ok: false, texto: e.message });
    }
    setGuardando(false);
  }

  return (
    <div style={{ ...tarjeta, padding: 0, overflow: "hidden" }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        style={{ width: "100%", background: "none", border: "none", textAlign: "left", padding: "14px 16px", cursor: "pointer", fontFamily: F, display: "flex", gap: 12, alignItems: "center" }}
      >
        <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: "50%", background: c.esCliente ? C.green : C.cardLine, color: c.esCliente ? "#fff" : C.inkSoft, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
          {(c.nombre || "?").trim().charAt(0).toUpperCase()}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 800, fontSize: 15, color: C.ink }}>{c.nombre || "Sin nombre"}</span>
          <span style={{ display: "block", fontSize: 12.5, color: C.inkSoft, marginTop: 2 }}>
            {c.esCliente ? `${c.pagadas} ${c.pagadas === 1 ? "servicio" : "servicios"} · ${pesos(c.cobrado)}` : "Reservó pero no ha pagado"}
            {c.proxima ? ` · próxima: ${fechaCorta(c.proxima.fecha)}` : ""}
          </span>
        </span>
        {c.nota && <span title="Tiene nota" aria-label="Tiene nota" style={{ fontSize: 14 }}>📝</span>}
        <span aria-hidden="true" style={{ color: C.inkSoft, transform: abierto ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
      </button>

      {abierto && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {c.telefono && (
              <a href={enlaceWhatsAppA(c.telefono, `Hola ${c.nombre}, te escribo de Ámbitat.`)} target="_blank" rel="noopener" style={{ ...botonChico, background: "#25D366", color: "#fff", textDecoration: "none" }}>
                WhatsApp
              </a>
            )}
            {c.telefono && (
              <a href={`tel:${c.telefono.replace(/[^\d+]/g, "")}`} style={{ ...botonChico, background: C.tileBg, textDecoration: "none" }}>
                Llamar
              </a>
            )}
            {c.correo && (
              <a href={`mailto:${c.correo}`} style={{ ...botonChico, background: C.tileBg, textDecoration: "none" }}>
                Correo
              </a>
            )}
            {c.direccion && (
              <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(c.direccion + ", Ciudad de México")} target="_blank" rel="noopener" style={{ ...botonChico, background: C.tileBg, textDecoration: "none" }}>
                Mapa
              </a>
            )}
          </div>
          <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.6, marginTop: 10 }}>
            {c.telefono && <div>📞 {c.telefono}</div>}
            {c.correo && <div style={{ wordBreak: "break-all" }}>✉️ {c.correo}</div>}
            {c.direccion && <div>📍 {c.direccion}</div>}
            <div>🪴 {c.plantas} {c.plantas === 1 ? "planta" : "plantas"} en la app{c.ultimaVisita ? ` · última visita ${fechaCorta(c.ultimaVisita)}` : ""}</div>
          </div>

          <p style={{ fontWeight: 800, fontSize: 13, color: C.ink, margin: "14px 0 6px" }}>Tu nota privada</p>
          {notasDisponibles ? (
            <>
              <textarea
                value={nota}
                onChange={(e) => {
                  setNota(e.target.value);
                  setEstadoNota(null);
                }}
                rows={3}
                maxLength={2000}
                placeholder="Ej. portón azul, tiene un perro, prefiere los sábados temprano"
                aria-label={`Nota privada de ${c.nombre}`}
                style={{ ...campoAdmin, fontSize: 14.5, resize: "vertical", lineHeight: 1.45 }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <button onClick={guardar} disabled={!cambio || guardando} style={{ ...botonChico, background: cambio ? C.green : C.cardLine, color: cambio ? "#fff" : C.inkSoft }}>
                  {guardando ? "Guardando..." : "Guardar nota"}
                </button>
                {estadoNota && <span style={{ fontSize: 12.5, color: estadoNota.ok ? C.green : C.red }}>{estadoNota.texto}</span>}
              </div>
            </>
          ) : (
            <p style={textoSuave}>Para guardar notas, corre supabase-revision-6.sql en Supabase.</p>
          )}

          <p style={{ fontWeight: 800, fontSize: 13, color: C.ink, margin: "16px 0 4px" }}>Sus citas</p>
          {c.citas.map((x) => (
            <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderTop: "1px solid " + C.cardLine, fontSize: 13 }}>
              <span style={{ color: C.ink }}>
                {fechaCorta(x.fecha)} · {x.hora} · {tamanoPorClave(x.tamano)?.nombre || x.tamano}
              </span>
              <span style={{ color: x.estado === "completado" || x.estado === "pagado" ? C.green : C.inkSoft, fontWeight: 700, whiteSpace: "nowrap" }}>{ESTADO[x.estado] || x.estado}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Clientes({ password }) {
  const { datos, error, cargar, setDatos } = useDatosAdmin(password, "/api/admin/clientes");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("clientes"); // clientes | todos | proxima
  const lista = useMemo(() => {
    if (!datos) return [];
    const q = busqueda.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return datos.clientes.filter((c) => {
      if (filtro === "clientes" && !c.esCliente) return false;
      if (filtro === "proxima" && !c.proxima) return false;
      if (!q) return true;
      const texto = [c.nombre, c.telefono, c.correo, c.direccion, c.nota].join(" ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return texto.includes(q) || (c.telefono || "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || "~");
    });
  }, [datos, busqueda, filtro]);

  if (error) return <MensajeError onReintentar={cargar}>{error}</MensajeError>;
  if (!datos) return <EsqueletoTarjetas n={3} />;
  const total = datos.clientes.filter((c) => c.esCliente).length;
  const repiten = datos.clientes.filter((c) => c.pagadas >= 2).length;

  return (
    <div>
      <div style={{ ...tarjeta, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        {[
          [total, "clientes"],
          [repiten, "han repetido"],
          [datos.clientes.filter((c) => c.proxima).length, "con cita próxima"],
        ].map(([n, t]) => (
          <div key={t}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 22, color: C.ink }}>{n}</p>
            <p style={{ ...textoSuave, fontSize: 12 }}>{t}</p>
          </div>
        ))}
      </div>
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, teléfono, colonia o nota"
        aria-label="Buscar cliente"
        style={{ ...campoAdmin, background: C.card, marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          ["clientes", "Pagaron"],
          ["proxima", "Con cita"],
          ["todos", "Todos"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} aria-pressed={filtro === k} style={{ ...botonChico, background: filtro === k ? C.ink : C.card, color: filtro === k ? C.card : C.ink, borderRadius: 999, padding: "8px 14px" }}>
            {l}
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <p style={{ textAlign: "center", color: C.inkSoft, fontSize: 14, padding: "30px 0" }}>
          {datos.clientes.length === 0 ? "Aún no hay reservaciones. Aquí aparecerá cada persona que reserve." : "Nadie coincide con esa búsqueda."}
        </p>
      ) : (
        lista.map((c) => (
          <Cliente
            key={c.userId}
            c={c}
            password={password}
            notasDisponibles={datos.notasDisponibles}
            onNota={(id, nota) => setDatos((d) => ({ ...d, clientes: d.clientes.map((x) => (x.userId === id ? { ...x, nota } : x)) }))}
          />
        ))
      )}
    </div>
  );
}
