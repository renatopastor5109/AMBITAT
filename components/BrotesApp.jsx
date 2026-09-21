import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// ---- Design tokens (misma estructura tipo Salud/Clima, con tu paleta cálida original) ----
const C = {
  bg: "#EAC468",           // lienzo de fondo dorado (el original)
  card: "#F5EFDD",          // superficie de tarjetas — crema
  cardLine: "#e2d7b8",      // separador sutil entre filas
  ink: "#221C13",           // texto principal
  inkSoft: "#6b6047",       // texto secundario
  green: "#3F5D3E",         // verde pino — saludable / acento de marca
  greenDark: "#28402A",
  blue: "#3E7CA6",          // riego / agua (azul templado, no el azul frío de iOS)
  amber: "#D6A23D",         // luz / atención
  red: "#9C3B2E",           // crítico / problemas (el rust original)
  orange: "#C2703C",        // racha
  dark: "#28402A",          // pantalla de cámara — verde pino oscuro (el original)
  wood: "#8B5A2E",
  woodDark: "#6E4522",
  tileBg: "#EFE6CC",        // fondo de las tarjetitas de estadística dentro de la tarjeta crema

  // alias usados en partes que no se tocaron a fondo, para no romper nada
  pine: "#3F5D3E",
  pineDark: "#28402A",
  cream: "#F5EFDD",
  creamLine: "#e2d7b8",
  amberOld: "#D6A23D",
  rust: "#9C3B2E",
  coral: "#9C3B2E",
  mossText: "#6b6047",
  gold: "#EAC468",
};

const ESTADO_COLOR = {
  saludable: C.green,
  regular: C.amber,
  critico: C.red,
};

const FONTS_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.brotes-shell {
  width: 100%;
  max-width: 420px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  background: #EAC468;
  position: relative;
}
.brotes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.brotes-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Tablet y computadora: la app "flota" como una tarjeta centrada en vez de ocupar toda la pantalla */
@media (min-width: 700px) {
  .brotes-shell {
    max-width: 480px;
    min-height: calc(100vh - 48px);
    margin-top: 24px;
    margin-bottom: 24px;
    border-radius: 32px;
    overflow: hidden;
    box-shadow: 0 30px 70px -25px rgba(20, 20, 20, 0.25);
  }
}

/* Pantallas grandes: aprovecha el ancho extra con más columnas en el jardín */
@media (min-width: 1080px) {
  .brotes-shell {
    max-width: 900px;
  }
  .brotes-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
`;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Calcula cuánto falta (o si ya se pasó) para el próximo riego,
// usando la fecha de la última foto guardada como referencia.
function getWateringStatus(plant) {
  if (!plant?.dias_entre_riegos || !plant?.history?.length) return null;
  const last = plant.history[plant.history.length - 1];
  let lastDate = null;
  if (last.dateISO) {
    lastDate = new Date(last.dateISO);
  } else if (last.date) {
    const parts = last.date.split("/"); // formato es-MX: DD/MM/YYYY
    if (parts.length === 3) lastDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  }
  if (!lastDate || isNaN(lastDate)) return null;

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSince = Math.floor((Date.now() - lastDate.getTime()) / msPerDay);
  const remaining = plant.dias_entre_riegos - daysSince;

  if (remaining <= 0) return { label: daysSince === plant.dias_entre_riegos ? "Riega hoy" : "Necesita agua", urgent: true, remaining };
  if (remaining === 1) return { label: "Riega mañana", urgent: false, remaining };
  return { label: `Riega en ${remaining} días`, urgent: false, remaining };
}

// Orden de prioridad para ordenar por estado de salud: lo que necesita atención primero
const ESTADO_ORDEN = { critico: 0, regular: 1, saludable: 2 };

// Tips generales de cuidado, para los circulitos tipo "Stories" del jardín
const TIPS = [
  { id: "riego", emoji: "💧", corto: "Riego", titulo: "El error más común: regar de más", texto: "Más plantas mueren por exceso de riego que por falta de agua. Antes de regar, mete un dedo 2-3 cm en la tierra — si se siente húmeda, espera un día más." },
  { id: "luz", emoji: "☀️", corto: "Luz", titulo: "No toda la 'luz' es igual", texto: "Luz indirecta brillante significa cerca de una ventana pero sin que el sol pegue directo en las hojas. El sol directo de mediodía puede quemarlas." },
  { id: "hojas", emoji: "🍂", corto: "Hojas", titulo: "Hojas amarillas no siempre es lo mismo", texto: "Una hoja amarilla vieja que se cae sola es normal. Varias hojas amarillas a la vez casi siempre es señal de exceso de riego." },
  { id: "plagas", emoji: "🔍", corto: "Plagas", titulo: "Revisa el envés de las hojas", texto: "Los ácaros y cochinillas casi siempre aparecen primero por debajo de las hojas. Revisa ahí cada par de semanas, antes de que se noten por arriba." },
  { id: "trasplante", emoji: "🪴", corto: "Maceta", titulo: "¿Cuándo cambiar de maceta?", texto: "Si ves raíces saliendo por el hoyo de abajo, o el agua ya no se absorbe y se queda encharcada arriba, es momento de una maceta más grande." },
  { id: "humedad", emoji: "🌫️", corto: "Humedad", titulo: "Ambientes secos afectan más de lo que crees", texto: "El aire acondicionado y la calefacción bajan mucho la humedad. Agrupar varias plantas juntas ayuda a que se den un poco de humedad entre ellas." },
];

function ordenarJardin(plantas, criterio) {
  const copia = [...plantas];
  if (criterio === "nombre") {
    return copia.sort((a, b) => (a.nombre_comun || "").localeCompare(b.nombre_comun || "", "es"));
  }
  if (criterio === "riego") {
    return copia.sort((a, b) => {
      const ra = getWateringStatus(a)?.remaining ?? 999;
      const rb = getWateringStatus(b)?.remaining ?? 999;
      return ra - rb;
    });
  }
  if (criterio === "salud") {
    return copia.sort((a, b) => (ESTADO_ORDEN[a.estado_general] ?? 3) - (ESTADO_ORDEN[b.estado_general] ?? 3));
  }
  // "recientes": más nuevas primero (el orden guardado ya viene de más vieja a más nueva)
  return copia.reverse();
}

const ESTADO_STYLES = {
  saludable: { bg: C.pine, label: "Saludable" },
  regular: { bg: C.amber, label: "Necesita atención" },
  critico: { bg: C.rust, label: "En riesgo" },
};

function Tag({ children, color }) {
  return (
    <span
      style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: color || C.inkSoft,
      }}
    >
      {children}
    </span>
  );
}

// ---------- Insignia de madera con el nombre de la app ----------
function WordmarkBadge() {
  return (
    <img
      src="/logo.png"
      alt="Ámbitat"
      style={{
        alignSelf: "center",
        width: "78%",
        maxWidth: 260,
        height: "auto",
        display: "block",
      }}
    />
  );
}

// ---------- Tarjeta de planta: estilo "widget" (tarjeta blanca, íconos, jerarquía tipo Salud/Clima) ----------
function PlantCard({ data, imageUrl, onSave, saved, footer, compact, nameEdit }) {
  const estadoColor = ESTADO_COLOR[data.estado_general] || C.amber;
  const estadoLabel = (ESTADO_STYLES[data.estado_general] || ESTADO_STYLES.regular).label;
  const watering = getWateringStatus(data);
  const hasRacha = !compact && data.racha_riego >= 2;

  return (
    <div
      style={{
        background: C.card,
        borderRadius: 22,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 10px 28px -14px rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ padding: compact ? "14px 14px 14px" : "20px 20px 20px" }}>
        {/* encabezado: foto + nombre */}
        <div style={{ display: "flex", gap: compact ? 10 : 14 }}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={data.nombre_comun}
              style={{
                width: compact ? 52 : 64,
                height: compact ? 52 : 64,
                objectFit: "cover",
                borderRadius: 14,
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            {nameEdit && nameEdit.isEditing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  value={nameEdit.draft}
                  onChange={(e) => nameEdit.onDraftChange(e.target.value)}
                  autoFocus
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: 17,
                    color: C.ink,
                    border: "1px solid " + C.cardLine,
                    borderRadius: 8,
                    padding: "4px 8px",
                    width: "100%",
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={nameEdit.onSave}
                  aria-label="Guardar nombre"
                  style={{ background: C.green, border: "none", borderRadius: 8, width: 28, height: 28, color: "#fff", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Icon.Check style={{ width: 15, height: 15 }} />
                </button>
                <button
                  onClick={nameEdit.onCancel}
                  aria-label="Cancelar"
                  style={{ background: "transparent", border: "1px solid " + C.cardLine, borderRadius: 8, width: 28, height: 28, color: C.inkSoft, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Icon.X />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <h2
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 800,
                    fontSize: compact ? 15.5 : 20,
                    color: C.ink,
                    margin: 0,
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {data.nombre_comun}
                </h2>
                {nameEdit && (
                  <button
                    onClick={nameEdit.onStart}
                    aria-label="Editar nombre"
                    style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 2, flexShrink: 0 }}
                  >
                    <Icon.Pencil style={{ width: 13, height: 13 }} />
                  </button>
                )}
              </div>
            )}
            {!compact && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontStyle: "italic", fontSize: 12.5, color: C.inkSoft, margin: "1px 0 0" }}>
                {data.nombre_cientifico}
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: estadoColor, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: compact ? 11.5 : 12.5, fontWeight: 700, color: estadoColor }}>
                {estadoLabel}
              </span>
            </div>
          </div>
        </div>

        {!compact && data.advertencia && (
          <div style={{ marginTop: 12, background: "#FFF4E5", borderRadius: 12, padding: "9px 11px", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Icon.Warning style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#8a5a00", margin: 0, lineHeight: 1.4 }}>{data.advertencia}</p>
          </div>
        )}

        {!compact && (
          <>
            {/* tarjetas de estadística: próximo riego + racha o estado */}
            <div className="brotes-stats" style={{ marginTop: 16 }}>
              <div style={{ background: C.tileBg, borderRadius: 16, padding: "12px 14px" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(10,132,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <Icon.Droplet style={{ color: C.blue }} />
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 17, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
                  {watering ? watering.label.replace(/^Riega\s*/i, "").replace(/^Necesita agua$/i, "Hoy") : "—"}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.inkSoft, margin: "1px 0 0" }}>Próximo riego</p>
              </div>

              <div style={{ background: C.tileBg, borderRadius: 16, padding: "12px 14px" }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: hasRacha ? "rgba(255,149,0,0.14)" : `${estadoColor}1F`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  {hasRacha ? <Icon.Flame style={{ color: C.orange }} /> : <Icon.Leaf style={{ color: estadoColor, width: 14, height: 14 }} />}
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 17, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
                  {hasRacha ? data.racha_riego : estadoLabel}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.inkSoft, margin: "1px 0 0" }}>
                  {hasRacha ? "riegos a tiempo seguidos" : "Estado general"}
                </p>
              </div>
            </div>

            {/* lista de detalles con íconos, en vez de bloques de texto */}
            <div style={{ marginTop: 4 }}>
              <DetailRow icon={<Icon.Droplet style={{ color: C.blue }} />} label="Riego" text={data.riego} />
              <DetailRow icon={<Icon.Sun style={{ color: C.amber }} />} label="Luz" text={data.luz} />
              {data.causa_probable && <DetailRow icon={<Icon.Info style={{ color: C.inkSoft }} />} label="Por qué se ve así" text={data.causa_probable} />}
            </div>

            {data.problemas_detectados && data.problemas_detectados.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.red, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Se detectó
                </p>
                {data.problemas_detectados.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderTop: i === 0 ? "none" : "1px solid " + C.cardLine }}>
                    <Icon.Warning style={{ color: C.red, flexShrink: 0, marginTop: 2, width: 14, height: 14 }} />
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.ink, margin: 0, lineHeight: 1.4 }}>{p}</p>
                  </div>
                ))}
              </div>
            )}

            {data.consejos && data.consejos.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: C.inkSoft, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Consejos de cuidado
                </p>
                {data.consejos.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderTop: i === 0 ? "none" : "1px solid " + C.cardLine }}>
                    <Icon.Sparkle style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.ink, margin: 0, lineHeight: 1.4 }}>{c}</p>
                  </div>
                ))}
              </div>
            )}

            {onSave && (
              <button
                onClick={onSave}
                disabled={saved}
                style={{
                  marginTop: 18,
                  width: "100%",
                  padding: "13px 0",
                  borderRadius: 14,
                  border: "none",
                  background: saved ? C.tileBg : C.green,
                  color: saved ? C.inkSoft : "#fff",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: saved ? "default" : "pointer",
                }}
              >
                {saved ? "Guardado ✓" : "Guardar"}
              </button>
            )}
            {footer}
          </>
        )}

        {compact && watering && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
            <Icon.Droplet style={{ color: watering.urgent ? C.red : C.blue, width: 12, height: 12 }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 600, color: watering.urgent ? C.red : C.inkSoft }}>
              {watering.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, text }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderTop: "1px solid " + C.cardLine }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: C.tileBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.inkSoft, margin: 0, fontWeight: 600 }}>{label}</p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.ink, margin: "1px 0 0", lineHeight: 1.4 }}>{text}</p>
      </div>
    </div>
  );
}

// ---------- Icons ----------
const Icon = {
  Camera: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 8a2 2 0 012-2h2l1.5-2h5L16 6h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  ),
  Leaf: (p) => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 20c8-1 13-6 13-15 0 0-11 0-13 8-1 4 0 7 0 7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 20c2-6 5-9 9-11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Back: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Gallery: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3" y="5" width="15" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="10" r="1.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 17l4.5-4.5 3 3L16 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  X: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  Pencil: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 7l3 3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Check: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Droplet: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3C12 3 5 12 5 16.5A7 7 0 0019 16.5C19 12 12 3 12 3z" fill="currentColor" />
    </svg>
  ),
  Sun: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M19 5l-1.8 1.8M6.8 17.2L5 19M19 19l-1.8-1.8M6.8 6.8L5 5" />
      </g>
    </svg>
  ),
  Flame: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 30" fill="none" {...p}>
      <path d="M12 2C12 2 3 14 3 20a9 9 0 0018 0c0-6-9-18-9-18z" fill="currentColor" />
    </svg>
  ),
  Warning: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3.5L22 20H2L12 3.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 10v4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="17.3" r="1" fill="currentColor" />
    </svg>
  ),
  Info: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="7.8" r="1.1" fill="currentColor" />
      <path d="M12 11v6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  ),
  Sparkle: (p) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" fill="currentColor" />
    </svg>
  ),
};

// ---------- Nav inferior flotante ----------
function BottomNav({ screen, setScreen, gardenCount }) {
  const jardinActive = screen === "jardin";
  const cameraActive = screen === "camera" || screen === "fotos" || screen === "analyzing" || screen === "result";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        margin: "0 16px 16px",
        padding: "10px 6px 8px",
        borderRadius: 22,
        background: "rgba(245,239,221,0.92)",
        borderTop: "1px solid " + C.cardLine,
        boxShadow: "0 -1px 0 rgba(0,0,0,0.02), 0 12px 30px -10px rgba(40,64,42,0.18)",
        backdropFilter: "blur(20px)",
      }}
    >
      <button
        onClick={() => setScreen("jardin")}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          background: "transparent",
          border: "none",
          padding: "4px 0",
          cursor: "pointer",
          color: jardinActive ? C.green : "#B5A683",
        }}
      >
        <Icon.Leaf style={{ width: 22, height: 22 }} />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 10.5, color: jardinActive ? C.green : "#B5A683" }}>
          Mi jardín{gardenCount ? ` (${gardenCount})` : ""}
        </span>
      </button>
      <button
        onClick={() => setScreen("camera")}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          background: "transparent",
          border: "none",
          padding: "4px 0",
          cursor: "pointer",
          color: cameraActive ? C.green : "#B5A683",
        }}
      >
        <Icon.Camera style={{ width: 22, height: 22 }} />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 10.5, color: cameraActive ? C.green : "#B5A683" }}>
          Cámara
        </span>
      </button>
    </div>
  );
}

export default function BrotesApp() {
  const [screen, setScreen] = useState("jardin");
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [ordenJardin, setOrdenJardin] = useState("recientes");
  const [activeTip, setActiveTip] = useState(null); // índice del tip abierto, o null
  const [viewedTips, setViewedTips] = useState([]);

  function openTip(i) {
    setActiveTip(i);
    const id = TIPS[i].id;
    setViewedTips((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }
  function nextTip() {
    if (activeTip === null) return;
    if (activeTip < TIPS.length - 1) openTip(activeTip + 1);
    else setActiveTip(null);
  }
  function prevTip() {
    if (activeTip === null) return;
    if (activeTip > 0) openTip(activeTip - 1);
  }
  const [compareIndices, setCompareIndices] = useState([]);

  async function saveNameEdit(plantId) {
    const nuevoNombre = nameDraft.trim();
    if (!nuevoNombre) {
      setEditingName(false);
      return;
    }
    const nombreAnterior = garden.find((p) => p.id === plantId)?.nombre_comun || null;
    const { error } = await supabase.from("plantas").update({ nombre_comun: nuevoNombre }).eq("id", plantId);
    if (!error) {
      setGarden((prev) => prev.map((p) => (p.id === plantId ? { ...p, nombre_comun: nuevoNombre } : p)));
      setEditingName(false);
      // Registro aparte de la corrección — para que más adelante se pueda ver
      // qué nombres suele fallar la IA y mejorar el prompt con esos casos reales.
      if (nombreAnterior && nombreAnterior !== nuevoNombre) {
        const { error: logError } = await supabase.from("correcciones").insert({
          planta_id: plantId,
          nombre_anterior: nombreAnterior,
          nombre_nuevo: nuevoNombre,
        });
        if (logError) console.error("Error registrando corrección:", logError);
      }
    } else {
      console.error("Error actualizando nombre:", error);
    }
  }

  function toggleCompareIndex(i) {
    setCompareIndices((prev) => {
      if (prev.includes(i)) return prev.filter((x) => x !== i);
      if (prev.length < 2) return [...prev, i];
      return [prev[1], i]; // reemplaza el más antiguo seleccionado
    });
  }

  // capture flow state
  const [captureMode, setCaptureMode] = useState("new"); // 'new' | 'followup'
  const [followupPlantId, setFollowupPlantId] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [garden, setGarden] = useState([]);
  const [userId, setUserId] = useState(null);
  const [notifStatus, setNotifStatus] = useState("checking"); // checking | unsupported | default | denied | subscribed
  const [sugerenciaTexto, setSugerenciaTexto] = useState("");
  const [sugerenciaEnviando, setSugerenciaEnviando] = useState(false);
  const [sugerenciaEnviada, setSugerenciaEnviada] = useState(false);
  const [sugerenciaError, setSugerenciaError] = useState(null);

  async function enviarSugerencia() {
    if (!sugerenciaTexto.trim()) return;
    setSugerenciaEnviando(true);
    setSugerenciaError(null);
    const { error } = await supabase.from("sugerencias").insert({
      user_id: userId,
      mensaje: sugerenciaTexto.trim(),
    });
    setSugerenciaEnviando(false);
    if (error) {
      console.error("Error enviando sugerencia:", error);
      setSugerenciaError("No pudimos enviar tu mensaje. Intenta de nuevo en un momento.");
      return;
    }
    setSugerenciaEnviada(true);
    setSugerenciaTexto("");
  }
  const [loadingGarden, setLoadingGarden] = useState(true);
  const [capturedFile, setCapturedFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoUrls, setPhotoUrls] = useState([]);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);

  function rowToPlant(row) {
    return {
      id: row.id,
      nombre_comun: row.nombre_comun,
      nombre_cientifico: row.nombre_cientifico,
      confianza: row.confianza,
      estado_general: row.estado_general,
      riego: row.riego,
      dias_entre_riegos: row.dias_entre_riegos,
      luz: row.luz,
      problemas_detectados: row.problemas_detectados || [],
      consejos: row.consejos || [],
      causa_probable: row.causa_probable || null,
      racha_riego: row.racha_riego || 0,
      imageUrl: row.image_url,
      history: row.historial || [],
    };
  }

  async function loadGarden(uid) {
    const { data, error } = await supabase
      .from("plantas")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (!error && data) setGarden(data.map(rowToPlant));
  }

  useEffect(() => {
    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      let activeSession = session;
      if (!activeSession) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("Error de sesión anónima:", error);
          setLoadingGarden(false);
          return;
        }
        activeSession = data.session;
      }
      if (activeSession) {
        setUserId(activeSession.user.id);
        await loadGarden(activeSession.user.id);
      }
      setLoadingGarden(false);
    }
    initAuth();
  }, []);

  useEffect(() => {
    async function checkNotifStatus() {
      if (!userId) return;
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setNotifStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setNotifStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const existing = reg ? await reg.pushManager.getSubscription() : null;
        setNotifStatus(existing ? "subscribed" : "default");
      } catch {
        setNotifStatus("default");
      }
    }
    checkNotifStatus();
  }, [userId]);

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  async function enableNotifications() {
    if (!userId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setNotifStatus("unsupported");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotifStatus("denied");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({ user_id: userId, endpoint: sub.endpoint, subscription: sub.toJSON() }, { onConflict: "endpoint" });
      if (error) {
        console.error("Error guardando suscripción:", error);
        return;
      }
      setNotifStatus("subscribed");
    } catch (err) {
      console.error("Error activando notificaciones:", err);
    }
  }

  function openCamera(mode = "new", plantId = null) {
    setCaptureMode(mode);
    setFollowupPlantId(plantId);
    setError(null);
    setResult(null);
    setImageUrl(null);
    setIsSaved(false);
    setIsSaving(false);
    setSaveError(null);
    setPhotoFiles([]);
    setPhotoUrls([]);
    setScreen("camera");
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // para poder volver a elegir el mismo archivo si hace falta
    if (!file) return;
    setError(null);
    setPhotoFiles((prev) => [...prev, file].slice(0, 3));
    setPhotoUrls((prev) => [...prev, URL.createObjectURL(file)].slice(0, 3));
    setScreen("fotos");
  }

  function removePhoto(i) {
    setPhotoFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  function confirmPhotos() {
    if (photoFiles.length === 0) return;
    const mainUrl = photoUrls[0];
    setCapturedFile(photoFiles[0]);
    setImageUrl(mainUrl);
    setScreen("analyzing");
    analyzePhoto(photoFiles, mainUrl);
  }

  async function analyzePhoto(files, url) {
    setError(null);
    try {
      const images = await Promise.all(
        files.map(async (f) => ({ base64: await fileToBase64(f), mediaType: f.type || "image/jpeg" }))
      );
      const response = await fetch("/api/analizar-planta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      if (!response.ok) throw new Error("Error del servidor");
      const parsed = await response.json();
      setResult(parsed);
      setScreen("result");
      // Se guarda solo, sin que la persona tenga que tocar nada — antes era
      // un paso manual y mucha gente se quedaba sin guardar su planta.
      saveAnalysis(parsed, url, files[0]);
    } catch (err) {
      console.error(err);
      setError("No pudimos analizar la foto. Intenta con otra imagen más clara.");
      setScreen("camera");
    }
  }

  async function saveAnalysis(resultData, imgUrl, file) {
    if (!resultData || !userId) return;
    setSaveError(null);
    setIsSaving(true);

    let publicUrl = imgUrl;
    if (file) {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("plant-photos").upload(path, file);
      if (!uploadError) {
        const { data } = supabase.storage.from("plant-photos").getPublicUrl(path);
        publicUrl = data.publicUrl;
      } else {
        console.error("Error subiendo foto:", uploadError);
        setIsSaving(false);
        setSaveError("No pudimos guardar la foto (revisa que exista el bucket 'plant-photos' en Supabase, marcado como público).");
        return;
      }
    }

    const historyEntry = {
      date: new Date().toLocaleDateString("es-MX"),
      dateISO: new Date().toISOString(),
      imageUrl: publicUrl,
      estado_general: resultData.estado_general,
    };

    if (captureMode === "followup" && followupPlantId) {
      const plant = garden.find((p) => p.id === followupPlantId);
      const newHistory = [...(plant?.history || []), historyEntry];
      // Racha: si esta foto de seguimiento llega ANTES de que la planta se
      // pusiera en riesgo por falta de agua, suma un riego a tiempo seguido.
      const estabaAtrasada = getWateringStatus(plant)?.urgent;
      const nuevaRacha = estabaAtrasada ? 0 : (plant?.racha_riego || 0) + 1;
      const { error } = await supabase
        .from("plantas")
        .update({
          nombre_comun: resultData.nombre_comun,
          nombre_cientifico: resultData.nombre_cientifico,
          confianza: resultData.confianza,
          estado_general: resultData.estado_general,
          riego: resultData.riego,
          dias_entre_riegos: resultData.dias_entre_riegos,
          luz: resultData.luz,
          problemas_detectados: resultData.problemas_detectados,
          consejos: resultData.consejos,
          causa_probable: resultData.causa_probable || null,
          racha_riego: nuevaRacha,
          image_url: publicUrl,
          historial: newHistory,
        })
        .eq("id", followupPlantId);
      if (!error) {
        setGarden((prev) => prev.map((p) => (p.id === followupPlantId ? { ...p, ...resultData, racha_riego: nuevaRacha, imageUrl: publicUrl, history: newHistory } : p)));
      } else {
        console.error("Error actualizando planta:", error);
        setIsSaving(false);
        setSaveError("No pudimos actualizar tu planta. Intenta de nuevo.");
        return;
      }
    } else {
      const newId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const { error } = await supabase.from("plantas").insert({
        id: newId,
        user_id: userId,
        nombre_comun: resultData.nombre_comun,
        nombre_cientifico: resultData.nombre_cientifico,
        confianza: resultData.confianza,
        estado_general: resultData.estado_general,
        riego: resultData.riego,
        dias_entre_riegos: resultData.dias_entre_riegos,
        luz: resultData.luz,
        problemas_detectados: resultData.problemas_detectados,
        consejos: resultData.consejos,
        causa_probable: resultData.causa_probable || null,
        racha_riego: 0,
        image_url: publicUrl,
        historial: [historyEntry],
      });
      if (!error) {
        setGarden((prev) => [...prev, { ...resultData, id: newId, racha_riego: 0, imageUrl: publicUrl, history: [historyEntry] }]);
      } else {
        console.error("Error guardando planta:", error);
        setIsSaving(false);
        setSaveError("No pudimos guardar tu planta. Intenta de nuevo.");
        return;
      }
    }
    setImageUrl(publicUrl);
    setIsSaving(false);
    setIsSaved(true);
  }

  const activePlant = garden.find((p) => p.id === selectedPlant);
  const isDarkScreen = screen === "camera" || screen === "analyzing" || screen === "result";

  return (
    <div style={{ minHeight: "100vh", background: C.gold, display: "flex", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS_IMPORT}</style>
      <div className="brotes-shell">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
        <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {/* ---------------- CAMERA ---------------- */}
        {screen === "camera" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.dark, margin: 16, borderRadius: 26, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 4px" }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,239,221,0.5)", margin: 0 }}>
                {captureMode === "followup" ? "Seguimiento de planta" : "Nueva planta"}
              </p>
              <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 22, color: C.cream, margin: "3px 0 0", letterSpacing: "-0.01em" }}>
                {captureMode === "followup" ? "¿Cómo va hoy?" : "Enfoca tu planta"}
              </h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "rgba(245,239,221,0.65)", margin: "8px 0 0", lineHeight: 1.4 }}>
                💡 Con luz de día y una sola planta en el encuadre, el análisis sale más preciso.
              </p>
              {error && <p style={{ color: "#e3a08c", fontSize: 12.5, marginTop: 8, fontFamily: "'Inter', sans-serif" }}>{error}</p>}
            </div>
            <div
              style={{
                flex: 1,
                margin: "14px 20px",
                borderRadius: 18,
                border: "1px dashed rgba(245,239,221,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 260,
                background: "radial-gradient(circle at 50% 30%, #345a37 0%, #1f3521 75%)",
              }}
            >
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                <path d="M4 8a2 2 0 012-2h2l1.5-2h5L16 6h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke={C.cream} strokeWidth="1.4" opacity="0.7" />
                <circle cx="12" cy="13" r="3.4" stroke={C.cream} strokeWidth="1.4" opacity="0.7" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 30px 26px" }}>
              <button onClick={() => galleryRef.current?.click()} style={{ background: "none", border: "none", color: C.cream, cursor: "pointer" }}>
                <Icon.Gallery />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ width: 66, height: 66, borderRadius: "50%", border: "4px solid " + C.cream, background: "transparent", cursor: "pointer" }}
                aria-label="Tomar foto"
              />
              <div style={{ width: 22 }} />
            </div>
          </div>
        )}

        {/* ---------------- FOTOS (revisión antes de analizar) ---------------- */}
        {screen === "fotos" && photoUrls.length > 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", background: C.dark, margin: 16, borderRadius: 26, padding: "22px 20px", overflow: "hidden" }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 19, color: C.cream, margin: "0 0 4px", textAlign: "center", letterSpacing: "-0.01em" }}>
              Tus fotos ({photoUrls.length}/3)
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "rgba(245,239,221,0.65)", margin: "0 0 18px", textAlign: "center" }}>
              Agregar más ángulos (hoja de cerca, planta completa, tallo) ayuda a identificarla mejor
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", width: 280 }}>
              {photoUrls.map((u, i) => (
                <div key={i} style={{ position: "relative", width: 84, height: 84 }}>
                  <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
                  <button
                    onClick={() => removePhoto(i)}
                    aria-label="Quitar foto"
                    style={{ position: "absolute", top: -6, right: -6, background: C.cream, border: "none", borderRadius: "50%", width: 22, height: 22, color: C.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Icon.X />
                  </button>
                  {i === 0 && (
                    <span style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(34,28,19,0.6)", color: C.cream, fontSize: 9, padding: "2px 6px", borderRadius: 6, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                      principal
                    </span>
                  )}
                </div>
              ))}
              {photoUrls.length < 3 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 14,
                    border: "1px dashed rgba(245,239,221,0.4)",
                    background: "transparent",
                    color: C.cream,
                    fontSize: 26,
                    cursor: "pointer",
                  }}
                  aria-label="Agregar otra foto"
                >
                  +
                </button>
              )}
            </div>

            <div style={{ width: 280, marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={confirmPhotos}
                style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: "none", background: C.cream, color: C.pine, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                Analizar planta
              </button>
              <button
                onClick={() => openCamera(captureMode, followupPlantId)}
                style={{ background: "transparent", border: "none", color: "rgba(245,239,221,0.6)", fontSize: 12.5, cursor: "pointer", padding: "4px 0", fontFamily: "'Inter', sans-serif" }}
              >
                ← Empezar de nuevo
              </button>
            </div>
          </div>
        )}

        {/* ---------------- ANALYZING ---------------- */}
        {screen === "analyzing" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, background: C.dark, margin: 16, borderRadius: 26 }}>
            {imageUrl && <img src={imageUrl} alt="planta" style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 14, opacity: 0.9 }} />}
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.cream, animation: `pulse 1.1s ${i * 0.15}s infinite ease-in-out` }} />
              ))}
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: "rgba(245,239,221,0.7)", letterSpacing: "0.02em" }}>Observando tu planta...</p>
            <style>{`@keyframes pulse { 0%,80%,100%{transform:scale(0.6); opacity:.4} 40%{transform:scale(1); opacity:1} }`}</style>
          </div>
        )}

        {/* ---------------- RESULT ---------------- */}
        {screen === "result" && result && (
          <div style={{ padding: "20px 16px 6px", flex: 1, overflowY: "auto" }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", color: C.inkSoft, margin: "0 4px 12px" }}>
              Diario de tus plantas
            </p>
            <PlantCard
              data={result}
              imageUrl={imageUrl}
              footer={
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    {isSaving && (
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.inkSoft, margin: 0 }}>
                        Guardando en tu jardín...
                      </p>
                    )}
                    {isSaved && !isSaving && (
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 700, color: C.green, margin: 0 }}>
                        ✓ Guardado en tu jardín
                      </p>
                    )}
                  </div>
                  {saveError && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.red, lineHeight: 1.4, margin: "0 0 8px" }}>
                        {saveError}
                      </p>
                      <button
                        onClick={() => saveAnalysis(result, imageUrl, capturedFile)}
                        style={{
                          background: C.tileBg,
                          border: "none",
                          borderRadius: 10,
                          padding: "8px 16px",
                          color: C.ink,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        Reintentar guardado
                      </button>
                    </div>
                  )}
                  {isSaved && !isSaving && (
                    <button
                      onClick={() => {
                        if (captureMode === "followup") setSelectedPlant(followupPlantId);
                        setScreen("jardin");
                      }}
                      style={{
                        marginTop: 10,
                        width: "100%",
                        padding: "12px 0",
                        borderRadius: 12,
                        border: "none",
                        background: "rgba(46,158,91,0.1)",
                        color: C.green,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: 13.5,
                        cursor: "pointer",
                      }}
                    >
                      Ir a mi jardín →
                    </button>
                  )}
                </>
              }
            />
            <button onClick={() => openCamera(captureMode, followupPlantId)} style={{ background: "transparent", border: "none", color: C.inkSoft, fontSize: 13, cursor: "pointer", padding: "14px 4px", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
              ← Analizar otra foto
            </button>
          </div>
        )}

        {/* ---------------- JARDIN (grid) ---------------- */}
        {screen === "jardin" && !activePlant && (
          <>
            <div style={{ padding: "20px 20px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <h1
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 800,
                    fontSize: 30,
                    letterSpacing: "-0.02em",
                    color: C.ink,
                    margin: 0,
                  }}
                >
                  Mi jardín
                </h1>
                <img src="/logo.png" alt="Ámbitat" style={{ height: 30, width: "auto", flexShrink: 0 }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 10 }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.inkSoft, margin: 0 }}>
                  Cuida tus plantas, una foto a la vez.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {notifStatus === "default" && (
                    <button
                      onClick={enableNotifications}
                      aria-label="Activar recordatorios"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: C.tileBg,
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: C.ink,
                        fontSize: 13,
                      }}
                    >
                      🔔
                    </button>
                  )}
                  {notifStatus === "subscribed" && (
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: C.green }}>🔔</span>
                  )}
                  <button
                    onClick={() => setScreen("sugerencias")}
                    style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 4, opacity: 0.7 }}
                    aria-label="Enviar sugerencia"
                  >
                    <Icon.Info style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, overflowX: "auto", marginTop: 16, padding: "4px 2px 8px" }}>
                {garden.length > 0 && (() => {
                  const total = garden.length;
                  const saludables = garden.filter((p) => p.estado_general === "saludable").length;
                  const pctSaludable = Math.round((saludables / total) * 100);
                  const necesitanAgua = garden.filter((p) => getWateringStatus(p)?.urgent).length;
                  const stats = [
                    {
                      key: "salud",
                      valor: `${pctSaludable}%`,
                      label: "Saludables",
                      color: pctSaludable >= 80 ? C.green : pctSaludable >= 50 ? C.amber : C.red,
                      onClick: () => setOrdenJardin("salud"),
                    },
                    {
                      key: "total",
                      valor: String(total),
                      label: total === 1 ? "Planta" : "Plantas",
                      color: C.green,
                      onClick: () => setOrdenJardin("recientes"),
                    },
                    {
                      key: "riego",
                      valor: String(necesitanAgua),
                      label: necesitanAgua === 1 ? "Necesita agua" : "Necesitan agua",
                      color: necesitanAgua > 0 ? C.red : C.green,
                      onClick: () => setOrdenJardin("riego"),
                    },
                  ];
                  return stats.map((s) => (
                    <button
                      key={s.key}
                      onClick={s.onClick}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, width: 64 }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: "50%",
                          padding: 3,
                          background: `linear-gradient(135deg, ${s.color}, ${s.color}66)`,
                          boxShadow: "0 6px 14px -5px rgba(40,64,42,0.35)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            background: C.card,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 16, color: s.color }}>{s.valor}</span>
                        </div>
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, color: C.inkSoft, textAlign: "center", lineHeight: 1.15 }}>
                        {s.label}
                      </span>
                    </button>
                  ));
                })()}

                {TIPS.map((tip, i) => {
                  const visto = viewedTips.includes(tip.id);
                  return (
                    <button
                      key={tip.id}
                      onClick={() => openTip(i)}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, width: 64 }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: "50%",
                          padding: 3,
                          background: visto ? C.cardLine : `linear-gradient(135deg, ${C.green}, ${C.amber})`,
                          boxShadow: visto ? "none" : "0 6px 14px -5px rgba(40,64,42,0.35)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            background: C.card,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 26,
                          }}
                        >
                          {tip.emoji}
                        </div>
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, fontWeight: 600, color: C.inkSoft, textAlign: "center", lineHeight: 1.15 }}>
                        {tip.corto}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 16px 20px" }}>
              {loadingGarden ? (
                <p style={{ textAlign: "center", padding: "60px 0", fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.inkSoft }}>
                  Cargando tu jardín...
                </p>
              ) : garden.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 20px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: C.inkSoft, margin: 0 }}>
                    Aún no tienes plantas guardadas.
                  </p>
                  <button
                    onClick={() => openCamera("new")}
                    style={{ marginTop: 14, background: C.green, color: "#fff", border: "none", borderRadius: 14, padding: "12px 22px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
                  >
                    Analizar mi primera planta
                  </button>
                </div>
              ) : (
                <>
                  {(() => {
                    const urgentes = garden.filter((p) => getWateringStatus(p)?.urgent).length;
                    if (urgentes === 0) return null;
                    return (
                      <div
                        style={{
                          background: "rgba(255,59,48,0.08)",
                          borderRadius: 14,
                          padding: "12px 16px",
                          marginBottom: 14,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Icon.Droplet style={{ color: C.red, width: 18, height: 18, flexShrink: 0 }} />
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: C.red, margin: 0 }}>
                          {urgentes === 1 ? "1 planta necesita agua hoy" : `${urgentes} plantas necesitan agua hoy`}
                        </p>
                      </div>
                    );
                  })()}

                  <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
                    {[
                      { key: "recientes", label: "Recientes" },
                      { key: "nombre", label: "Nombre" },
                      { key: "riego", label: "Riego" },
                      { key: "salud", label: "Estado" },
                    ].map((op) => (
                      <button
                        key={op.key}
                        onClick={() => setOrdenJardin(op.key)}
                        style={{
                          flexShrink: 0,
                          padding: "6px 14px",
                          borderRadius: 20,
                          border: "none",
                          background: ordenJardin === op.key ? C.green : C.tileBg,
                          color: ordenJardin === op.key ? "#fff" : C.inkSoft,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 600,
                          fontSize: 12.5,
                          cursor: "pointer",
                        }}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>

                  <div className="brotes-grid">
                  {ordenarJardin(garden, ordenJardin).map((p) => (
                    <div key={p.id} onClick={() => setSelectedPlant(p.id)} style={{ cursor: "pointer", position: "relative" }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setGarden((prev) => prev.filter((x) => x.id !== p.id));
                          const { error } = await supabase.from("plantas").delete().eq("id", p.id);
                          if (error) console.error("Error borrando planta:", error);
                        }}
                        style={{ position: "absolute", top: 8, right: 8, zIndex: 2, background: "rgba(34,28,19,0.55)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Icon.X />
                      </button>
                      <PlantCard data={p} imageUrl={p.imageUrl} compact />
                    </div>
                  ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ---------------- PLANT DETAIL ---------------- */}
        {screen === "jardin" && activePlant && (
          <div style={{ padding: "18px 16px 10px", flex: 1, overflowY: "auto" }}>
            <button
              onClick={() => {
                setSelectedPlant(null);
                setEditingName(false);
                setCompareMode(false);
                setCompareIndices([]);
              }}
              style={{ background: "none", border: "none", color: C.ink, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px" }}
            >
              <Icon.Back /> <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 700 }}>Mi jardín</span>
            </button>
            <PlantCard
              data={activePlant}
              imageUrl={activePlant.imageUrl}
              nameEdit={{
                isEditing: editingName,
                draft: nameDraft,
                onDraftChange: setNameDraft,
                onStart: () => {
                  setNameDraft(activePlant.nombre_comun);
                  setEditingName(true);
                },
                onSave: () => saveNameEdit(activePlant.id),
                onCancel: () => setEditingName(false),
              }}
            />

            <div style={{ marginTop: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Tag>Bitácora de crecimiento</Tag>
                {activePlant.history.length >= 2 && (
                  <button
                    onClick={() => {
                      setCompareMode((v) => !v);
                      setCompareIndices([]);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.pine,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {compareMode ? "Cancelar comparación" : "Comparar fotos"}
                  </button>
                )}
              </div>
              {compareMode && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.inkSoft, margin: "2px 0 8px" }}>
                  Toca dos fotos para compararlas ({compareIndices.length}/2)
                </p>
              )}
              <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "10px 2px" }}>
                {activePlant.history.map((h, i) => {
                  const selected = compareIndices.includes(i);
                  return (
                    <div
                      key={i}
                      onClick={() => compareMode && toggleCompareIndex(i)}
                      style={{ flexShrink: 0, textAlign: "center", cursor: compareMode ? "pointer" : "default" }}
                    >
                      <img
                        src={h.imageUrl}
                        alt=""
                        style={{
                          width: 62,
                          height: 62,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: selected ? "3px solid " + C.pine : "1px solid " + C.creamLine,
                        }}
                      />
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.inkSoft, margin: "4px 0 0" }}>{h.date}</p>
                    </div>
                  );
                })}
              </div>

              {compareMode && compareIndices.length === 2 && (() => {
                const [a, b] = [...compareIndices].sort((x, y) => x - y);
                const antes = activePlant.history[a];
                const despues = activePlant.history[b];
                return (
                  <div style={{ display: "flex", gap: 12, marginTop: 12, background: C.tileBg, borderRadius: 16, padding: 14 }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <img src={antes.imageUrl} alt="Antes" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 10 }} />
                      <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11.5, color: C.ink, margin: "6px 0 0" }}>Antes</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.inkSoft, margin: "2px 0 0" }}>{antes.date}</p>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <img src={despues.imageUrl} alt="Después" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 10 }} />
                      <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11.5, color: C.ink, margin: "6px 0 0" }}>Después</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: C.inkSoft, margin: "2px 0 0" }}>{despues.date}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button
              onClick={() => openCamera("followup", activePlant.id)}
              style={{ marginTop: 16, width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: C.pine, color: C.cream, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
            >
              Tomar foto de seguimiento
            </button>
          </div>
        )}

        {/* ---------------- BUZÓN DE SUGERENCIAS ---------------- */}
        {screen === "sugerencias" && (
          <div style={{ padding: "18px 16px 20px", flex: 1, overflowY: "auto" }}>
            <button
              onClick={() => {
                setScreen("jardin");
                setSugerenciaEnviada(false);
                setSugerenciaError(null);
              }}
              style={{ background: "none", border: "none", color: C.ink, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 16px" }}
            >
              <Icon.Back /> <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 700 }}>Mi jardín</span>
            </button>

            <div style={{ background: C.card, borderRadius: 20, padding: "22px 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 10px 28px -14px rgba(0,0,0,0.18)" }}>
              <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 20, color: C.ink, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                Buzón de sugerencias 💬
              </h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.inkSoft, lineHeight: 1.55, margin: "0 0 18px" }}>
                Ámbitat todavía se está construyendo, y queremos darte la mejor experiencia posible. Si algo no funcionó
                como esperabas, si te faltó información, o si tienes una idea que nos ayude a mejorar, cuéntanos aquí —
                lo leemos todo.
              </p>

              {sugerenciaEnviada ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ fontSize: 28, margin: "0 0 8px" }}>🌱</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 16, color: C.ink, margin: 0 }}>
                    ¡Gracias por tu mensaje!
                  </p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.inkSoft, marginTop: 6 }}>
                    Lo vamos a tomar en cuenta para seguir mejorando la app.
                  </p>
                  <button
                    onClick={() => setSugerenciaEnviada(false)}
                    style={{ marginTop: 16, background: C.tileBg, border: "none", borderRadius: 12, padding: "9px 18px", color: C.ink, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <>
                  <textarea
                    value={sugerenciaTexto}
                    onChange={(e) => setSugerenciaTexto(e.target.value)}
                    placeholder="Ej. me gustaría poder editar el nombre de mi planta, o la cámara se traba en mi celular..."
                    rows={5}
                    style={{
                      width: "100%",
                      border: "1px solid " + C.cardLine,
                      borderRadius: 10,
                      padding: 12,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                      color: C.ink,
                      resize: "none",
                      boxSizing: "border-box",
                      background: C.tileBg,
                    }}
                  />
                  {sugerenciaError && (
                    <p style={{ color: C.red, fontFamily: "'Inter', sans-serif", fontSize: 12.5, marginTop: 8 }}>{sugerenciaError}</p>
                  )}
                  <button
                    onClick={enviarSugerencia}
                    disabled={!sugerenciaTexto.trim() || sugerenciaEnviando}
                    style={{
                      marginTop: 14,
                      width: "100%",
                      padding: "12px 0",
                      borderRadius: 12,
                      border: "none",
                      background: !sugerenciaTexto.trim() || sugerenciaEnviando ? C.cardLine : C.green,
                      color: !sugerenciaTexto.trim() || sugerenciaEnviando ? C.inkSoft : "#fff",
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: !sugerenciaTexto.trim() || sugerenciaEnviando ? "default" : "pointer",
                    }}
                  >
                    {sugerenciaEnviando ? "Enviando..." : "Enviar sugerencia"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {activeTip !== null && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(20,16,8,0.92)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
              {TIPS.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= activeTip ? "#fff" : "rgba(255,255,255,0.3)" }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "auto" }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Tip de cuidado
              </span>
              <button onClick={() => setActiveTip(null)} aria-label="Cerrar" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 4 }}>
                <Icon.X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 10px" }}>
              <p style={{ fontSize: 52, margin: "0 0 18px" }}>{TIPS[activeTip].emoji}</p>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 21, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.01em" }}>
                {TIPS[activeTip].titulo}
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.55, margin: 0 }}>
                {TIPS[activeTip].texto}
              </p>
            </div>

            <div style={{ display: "flex", position: "absolute", inset: 0, top: 74 }}>
              <div onClick={prevTip} style={{ flex: 1, cursor: "pointer" }} />
              <div onClick={nextTip} style={{ flex: 1, cursor: "pointer" }} />
            </div>
          </div>
        )}

        <BottomNav
          screen={screen}
          setScreen={(s) => {
            setSelectedPlant(null);
            setEditingName(false);
            setCompareMode(false);
            setCompareIndices([]);
            if (s === "camera") openCamera("new");
            else setScreen(s);
          }}
          gardenCount={garden.length}
        />
      </div>
    </div>
  );
}
