// Panel → Descuentos: códigos que tus clientes escriben al reservar.
import { useState } from "react";
import { C, F, tarjeta, tituloTarjeta, textoSuave, campoAdmin, botonChico, botonPrincipal, EsqueletoTarjetas, MensajeError, pesos, useDatosAdmin, llamarAdmin } from "./comun";
import { limpiarCodigo, codigoValido, MAX_PORCENTAJE } from "../../lib/cupones";

const etiqueta = { display: "block", fontSize: 13, fontWeight: 700, color: C.ink, margin: "12px 0 6px" };
const hoyCDMX = () => new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
const fechaBonita = (f) => new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

function NuevoCodigo({ password, onCreado }) {
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState("porcentaje");
  const [valor, setValor] = useState("");
  const [vence, setVence] = useState("");
  const [usosMax, setUsosMax] = useState("");
  const [unaPorPersona, setUnaPorPersona] = useState(true);
  const [soloNuevos, setSoloNuevos] = useState(false);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);
  const limpio = limpiarCodigo(codigo);
  const n = Number(valor);
  const valorOk = tipo === "porcentaje" ? n >= 1 && n <= MAX_PORCENTAJE : n >= 10 && n <= 5000;
  const listo = codigoValido(limpio) && valorOk;

  async function crear() {
    setGuardando(true);
    setMsg(null);
    try {
      await llamarAdmin(password, "/api/admin/cupones", { accion: "crear", codigo: limpio, tipo, valor: n, vence, usosMax: usosMax || null, unaPorPersona, soloNuevos, nota });
      setMsg({ ok: true, texto: `Listo: ${limpio} ya funciona en la Tienda.` });
      setCodigo("");
      setValor("");
      setVence("");
      setUsosMax("");
      setNota("");
      onCreado();
    } catch (e) {
      setMsg({ ok: false, texto: e.message });
    }
    setGuardando(false);
  }

  return (
    <div style={tarjeta}>
      <p style={tituloTarjeta}>Nuevo código</p>
      <label style={{ ...etiqueta, marginTop: 0 }} htmlFor="cupon-codigo">Código</label>
      <input id="cupon-codigo" value={codigo} onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setMsg(null); }} placeholder="Ej. BUENFIN20" autoCapitalize="characters" maxLength={24} style={{ ...campoAdmin, letterSpacing: 1, fontWeight: 700 }} />
      {codigo && limpio !== codigo.trim() && <p style={{ ...textoSuave, marginTop: 4 }}>Se guardará como <strong>{limpio}</strong> (sin espacios ni acentos).</p>}

      <span style={etiqueta}>Descuento</span>
      <div style={{ display: "flex", gap: 8 }}>
        <div role="radiogroup" aria-label="Tipo de descuento" style={{ display: "flex", background: C.tileBg, borderRadius: 12, padding: 3 }}>
          {[["porcentaje", "%"], ["monto", "$"]].map(([k, t]) => (
            <button key={k} role="radio" aria-checked={tipo === k} onClick={() => setTipo(k)} style={{ border: "none", borderRadius: 10, padding: "0 16px", fontFamily: F, fontWeight: 800, fontSize: 16, cursor: "pointer", background: tipo === k ? C.ink : "transparent", color: tipo === k ? C.card : C.ink }}>
              {t}
            </button>
          ))}
        </div>
        <input type="number" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipo === "porcentaje" ? "Ej. 15 (%)" : "Ej. 150 (pesos)"} aria-label={tipo === "porcentaje" ? "Porcentaje de descuento" : "Pesos de descuento"} style={{ ...campoAdmin, flex: 1 }} />
      </div>
      {valor && !valorOk && <p style={{ ...textoSuave, color: C.red, marginTop: 4 }}>{tipo === "porcentaje" ? `Del 1 al ${MAX_PORCENTAJE}%.` : "De $10 a $5,000."}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 140px" }}>
          <label style={etiqueta} htmlFor="cupon-vence">Último día (opcional)</label>
          <input id="cupon-vence" type="date" min={hoyCDMX()} value={vence} onChange={(e) => setVence(e.target.value)} style={campoAdmin} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={etiqueta} htmlFor="cupon-usos">Usos en total (opcional)</label>
          <input id="cupon-usos" type="number" inputMode="numeric" min={1} value={usosMax} onChange={(e) => setUsosMax(e.target.value)} placeholder="Sin límite" style={campoAdmin} />
        </div>
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, fontSize: 14, color: C.ink, cursor: "pointer" }}>
        <input type="checkbox" checked={unaPorPersona} onChange={(e) => setUnaPorPersona(e.target.checked)} /> Una vez por persona
      </label>
      <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, fontSize: 14, color: C.ink, cursor: "pointer" }}>
        <input type="checkbox" checked={soloNuevos} onChange={(e) => setSoloNuevos(e.target.checked)} /> Solo para su primer mantenimiento
      </label>

      <label style={etiqueta} htmlFor="cupon-nota">Nota para ti (opcional)</label>
      <input id="cupon-nota" value={nota} maxLength={200} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Para el flyer del vivero de Coyoacán" style={campoAdmin} />

      <button onClick={crear} disabled={!listo || guardando} style={{ ...botonPrincipal(listo && !guardando), marginTop: 16 }}>
        {guardando ? "Creando..." : listo ? `Crear ${limpio} · ${tipo === "porcentaje" ? `${n}%` : pesos(n * 100)} de descuento` : "Crear código"}
      </button>
      {msg && <p style={{ fontSize: 13, color: msg.ok ? C.green : C.red, margin: "10px 0 0" }}>{msg.texto}</p>}
      <p style={{ ...textoSuave, marginTop: 10 }}>
        Se suma a los descuentos de "Invita a un amigo", pero siempre se cobra al menos $100 por visita.
      </p>
    </div>
  );
}

function Codigo({ c, password, onCambio }) {
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const vencido = c.vence && c.vence < hoyCDMX();
  const agotado = c.usos_max && c.usos >= c.usos_max;
  const estado = !c.activo ? ["Pausado", C.inkSoft] : vencido ? ["Vencido", C.red] : agotado ? ["Agotado", C.red] : ["Activo", C.green];

  async function accion(cuerpo) {
    setOcupado(true);
    setMsg(null);
    try {
      await llamarAdmin(password, "/api/admin/cupones", { ...cuerpo, codigo: c.codigo });
      onCambio();
    } catch (e) {
      setMsg(e.message);
    }
    setOcupado(false);
  }

  return (
    <div style={{ padding: "14px 0", borderTop: "1px solid " + C.cardLine }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 17, letterSpacing: 1, color: C.ink }}>{c.codigo}</p>
          <p style={{ ...textoSuave, fontSize: 13, marginTop: 2 }}>
            {c.tipo === "porcentaje" ? `${c.valor}%` : pesos(c.valor)} de descuento
            {c.una_por_persona ? " · una vez por persona" : ""}
            {c.solo_nuevos ? " · solo primer mantenimiento" : ""}
          </p>
          <p style={{ ...textoSuave, fontSize: 12.5, marginTop: 2 }}>
            Usado {c.usos}
            {c.usos_max ? ` de ${c.usos_max}` : ""} {c.usos === 1 ? "vez" : "veces"}
            {c.descontado ? ` · ${pesos(c.descontado)} descontados` : ""}
            {c.vence ? ` · ${vencido ? "venció" : "hasta"} el ${fechaBonita(c.vence)}` : ""}
          </p>
          {c.nota && <p style={{ ...textoSuave, fontSize: 12.5, marginTop: 2, fontStyle: "italic" }}>{c.nota}</p>}
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: estado[1], whiteSpace: "nowrap" }}>{estado[0]}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(c.codigo).then(() => {
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            });
          }}
          style={{ ...botonChico, background: C.tileBg }}
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
        <button onClick={() => accion({ accion: "activar", activo: !c.activo })} disabled={ocupado} style={{ ...botonChico, background: C.tileBg }}>
          {c.activo ? "Pausar" : "Reactivar"}
        </button>
        {c.usos === 0 && (
          <button
            onClick={() => window.confirm(`¿Borrar el código ${c.codigo}?`) && accion({ accion: "borrar" })}
            disabled={ocupado}
            style={{ ...botonChico, background: "transparent", color: C.red }}
          >
            Borrar
          </button>
        )}
      </div>
      {msg && <p style={{ fontSize: 12.5, color: C.red, margin: "6px 0 0" }}>{msg}</p>}
    </div>
  );
}

export default function Descuentos({ password }) {
  const { datos, error, cargar } = useDatosAdmin(password, "/api/admin/cupones");
  if (error) return <MensajeError onReintentar={cargar}>{error}</MensajeError>;
  if (!datos) return <EsqueletoTarjetas n={2} />;
  return (
    <div>
      {datos.falta ? (
        <div style={{ ...tarjeta, color: C.red, fontSize: 14 }}>{datos.falta}</div>
      ) : (
        <NuevoCodigo password={password} onCreado={cargar} />
      )}
      <div style={tarjeta}>
        <p style={tituloTarjeta}>Tus códigos</p>
        <p style={{ ...textoSuave, marginBottom: 6 }}>
          Tus clientes lo escriben en la Tienda, en "¿Tienes un código de descuento?". Puedes anunciarlo en Comunicar.
        </p>
        {datos.cupones.length === 0 ? (
          <p style={{ ...textoSuave, textAlign: "center", padding: "16px 0" }}>Todavía no has creado códigos.</p>
        ) : (
          datos.cupones.map((c) => <Codigo key={c.codigo} c={c} password={password} onCambio={cargar} />)
        )}
      </div>
    </div>
  );
}
