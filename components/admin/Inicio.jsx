// Panel → Inicio: cómo va Ámbitat de un vistazo y qué toca hoy.
import { C, F, tarjeta, tituloTarjeta, textoSuave, Stat, EsqueletoTarjetas, MensajeError, pesos, useDatosAdmin, enlaceWhatsAppA, botonChico } from "./comun";

function Barras({ datos, campo, color, etiqueta }) {
  const max = Math.max(1, ...datos.map((d) => d[campo]));
  const total = datos.reduce((s, d) => s + d[campo], 0);
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.ink, margin: 0 }}>{etiqueta}</p>
        <p style={{ fontSize: 12.5, color: C.inkSoft, margin: 0 }}>{total} en 14 días</p>
      </div>
      <div role="img" aria-label={`${etiqueta}: ${datos.map((d) => `${d.dia.slice(8)}: ${d[campo]}`).join(", ")}`} style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64, marginTop: 8 }}>
        {datos.map((d) => (
          <div key={d.dia} title={`${d.dia}: ${d[campo]}`} style={{ flex: 1, height: `${Math.max(4, (d[campo] / max) * 100)}%`, background: d[campo] ? color : C.cardLine, borderRadius: "4px 4px 2px 2px" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.inkSoft, marginTop: 4 }}>
        <span>{new Date(datos[0].dia + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
        <span>Hoy</span>
      </div>
    </div>
  );
}

export default function Inicio({ password, citasHoy, alIr }) {
  const { datos, error, cargar } = useDatosAdmin(password, "/api/admin/resumen");
  if (error) return <MensajeError onReintentar={cargar}>{error}</MensajeError>;
  if (!datos) return <EsqueletoTarjetas n={3} />;
  const { dinero, citas, personas, plantas } = datos;
  const cambio = dinero.mesAnterior ? Math.round(((dinero.mes - dinero.mesAnterior) / dinero.mesAnterior) * 100) : null;
  const nombreMes = new Date(datos.hoy + "T12:00:00").toLocaleDateString("es-MX", { month: "long" });

  return (
    <div>
      {/* ---------- Hoy ---------- */}
      <div style={tarjeta}>
        <p style={tituloTarjeta}>{citasHoy.length ? `Hoy tienes ${citasHoy.length} ${citasHoy.length === 1 ? "visita" : "visitas"}` : "Hoy no tienes visitas"}</p>
        {citasHoy.length === 0 ? (
          <p style={textoSuave}>{citas.semana ? `Esta semana tienes ${citas.semana} ${citas.semana === 1 ? "cita confirmada" : "citas confirmadas"}.` : "No hay citas confirmadas esta semana."}</p>
        ) : (
          citasHoy.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid " + C.cardLine }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: C.green, width: 64, flexShrink: 0 }}>{r.hora}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: C.ink }}>{r.nombre_contacto}</p>
                <p style={{ ...textoSuave, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.direccion}</p>
              </div>
              <a href={enlaceWhatsAppA(r.telefono, `Hola ${r.nombre_contacto}, soy de Ámbitat. Voy en camino a tu cita de las ${r.hora}.`)} target="_blank" rel="noopener" style={{ ...botonChico, background: "#25D366", color: "#fff", textDecoration: "none" }}>
                WhatsApp
              </a>
            </div>
          ))
        )}
      </div>

      {/* ---------- Pendientes ---------- */}
      {datos.sugerenciasSinLeer > 0 && (
        <button onClick={() => alIr("buzon")} style={{ ...tarjeta, width: "100%", border: "none", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: F }}>
          <span aria-hidden="true" style={{ fontSize: 20 }}>💬</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.ink }}>
            {datos.sugerenciasSinLeer === 1 ? "1 mensaje nuevo" : `${datos.sugerenciasSinLeer} mensajes nuevos`} en el buzón
          </span>
          <span style={{ color: C.green, fontWeight: 800 }}>Ver</span>
        </button>
      )}

      {/* ---------- Números ---------- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Stat
          destacado
          valor={pesos(dinero.mes)}
          label={`Cobrado en ${nombreMes}`}
          detalle={cambio === null ? (dinero.mesAnterior === 0 && dinero.mes > 0 ? "Primer mes con ventas" : null) : `${cambio >= 0 ? "▲" : "▼"} ${Math.abs(cambio)}% contra el mes pasado`}
        />
        <Stat valor={citas.semana} label="Citas en los próximos 7 días" detalle={`${citas.completadasMes} completadas este mes`} />
        <Stat valor={personas ? personas.nuevasSemana : "—"} label="Personas nuevas esta semana" detalle={personas ? `${personas.total} en total` : null} />
        <Stat valor={plantas.total} label="Plantas en la app" detalle={`${plantas.nuevasSemana} nuevas esta semana`} />
      </div>

      <div style={tarjeta}>
        <p style={tituloTarjeta}>Cómo se usa la app</p>
        {personas && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, textAlign: "center" }}>
            {[
              [personas.conCuenta, "con cuenta"],
              [personas.conPlantas, "con plantas"],
              [datos.suscripciones, "con avisos"],
            ].map(([n, t]) => (
              <div key={t} style={{ background: C.tileBg, borderRadius: 12, padding: "10px 4px" }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 19, color: C.ink }}>{n}</p>
                <p style={{ ...textoSuave, fontSize: 11.5 }}>{t}</p>
              </div>
            ))}
          </div>
        )}
        <Barras datos={datos.actividad} campo="analisis" color={C.green} etiqueta="Fotos analizadas" />
        <Barras datos={datos.actividad} campo="personas" color={C.blue} etiqueta="Personas nuevas" />
        <Barras datos={datos.actividad} campo="pagos" color={C.amber} etiqueta="Mantenimientos pagados" />
      </div>

      <div style={tarjeta}>
        <p style={tituloTarjeta}>Dinero</p>
        {[
          ["Cobrado en total", pesos(dinero.total)],
          ["Mes pasado", pesos(dinero.mesAnterior)],
          ["Clientes que han pagado", dinero.clientes],
          ["Ticket promedio", pesos(dinero.ticketPromedio)],
          ["Cancelaciones pagadas este mes", citas.canceladasMes],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid " + C.cardLine, fontSize: 14 }}>
            <span style={{ color: C.inkSoft }}>{k}</span>
            <strong style={{ color: C.ink }}>{v}</strong>
          </div>
        ))}
        <p style={{ ...textoSuave, marginTop: 8 }}>Ya descuenta los reembolsos. Stripe cobra su comisión aparte.</p>
      </div>

      {plantas.top.length > 0 && (
        <div style={tarjeta}>
          <p style={tituloTarjeta}>Las plantas que más tiene la gente</p>
          {plantas.top.map((p, i) => (
            <div key={p.nombre} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <span style={{ width: 18, fontSize: 12.5, color: C.inkSoft, fontWeight: 700 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 14, color: C.ink }}>{p.nombre}</span>
              <div style={{ width: 90, height: 8, background: C.tileBg, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${(p.n / plantas.top[0].n) * 100}%`, height: "100%", background: C.green }} />
              </div>
              <span style={{ width: 28, textAlign: "right", fontSize: 13, fontWeight: 700, color: C.ink }}>{p.n}</span>
            </div>
          ))}
          <p style={{ ...textoSuave, marginTop: 8 }}>
            {plantas.enRiesgo} {plantas.enRiesgo === 1 ? "planta está" : "plantas están"} en riesgo ahora mismo: buena gente para ofrecerle un mantenimiento.
          </p>
        </div>
      )}
      <button onClick={cargar} style={{ ...botonChico, width: "100%", padding: "12px 0" }}>Actualizar números</button>
    </div>
  );
}
