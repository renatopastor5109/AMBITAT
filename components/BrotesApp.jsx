import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { VIVEROS, mapsUrl } from "../lib/viveros";
import { TAMANOS, tamanoPorClave, PRECIO_DESDE_CENTAVOS, formatoPrecio, HORARIOS_DISPONIBLES } from "../lib/servicio";
import { diaCDMX, diasEntre, esFinDeSemana, diasParaRiego, diasDesdeUltimaFoto } from "../lib/fechas";
import { tipsDelDia } from "../lib/tips";

// ---- Design tokens (misma estructura tipo Salud/Clima, con tu paleta cálida original) ----
const C = {
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
  tileBg: "#EFE6CC",        // fondo de las tarjetitas de estadística dentro de la tarjeta crema

  // alias usados en partes que no se tocaron a fondo, para no romper nada
  pine: "#3F5D3E",
  cream: "#F5EFDD",
  creamLine: "#e2d7b8",
  rust: "#9C3B2E",
  gold: "#EAC468",
};

const ESTADO_COLOR = {
  saludable: C.green,
  regular: C.amber,
  critico: C.red,
};
// Para TEXTO: el ámbar claro casi no se lee sobre crema, así que se oscurece.
const AMBAR_TEXTO = "#8a6110";
const ESTADO_TEXTO = {
  saludable: C.green,
  regular: AMBAR_TEXTO,
  critico: C.red,
};

const FONTS_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Pacifico&family=IBM+Plex+Mono:wght@400;600&display=swap');

html, body {
  margin: 0;
  padding: 0;
}
.brotes-root {
  background: #EAC468;
  /* 100vh en iPhone es más alto que lo que se ve (por las barras de Safari);
     dvh es la altura visible real. */
  min-height: 100vh;
  min-height: 100dvh;
}
/* En iPhone, un campo con letra menor a 16px hace que la pantalla se
   acerque sola al escribir y se quede así. */
.brotes-shell input,
.brotes-shell textarea,
.brotes-shell select {
  font-size: 16px !important;
}
/* Safari en iPhone le da al campo de fecha un ancho y alto propios que no
   respetan el diseño; así se comporta como los demás campos. */
.brotes-shell input[type="date"] {
  -webkit-appearance: none;
  appearance: none;
  display: block;
  width: 100%;
  min-width: 0;
  height: 46px;
  line-height: 24px;
  text-align: left;
}
.brotes-shell input[type="date"]::-webkit-date-and-time-value {
  text-align: left;
}
.brotes-shell select {
  height: 46px;
}
.brotes-shell {
  width: 100%;
  max-width: 420px;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  background: #EAC468;
  position: relative;
  overflow: hidden;
}
/* Solo esta zona se desplaza; la barra de pestañas se queda fija abajo */
.brotes-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.brotes-scroll-shade {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 22px;
  pointer-events: none;
  z-index: 5;
  background: linear-gradient(to bottom, rgba(110, 69, 34, 0.18), rgba(110, 69, 34, 0));
  transition: opacity 0.25s ease;
}
/* Las tarjetas aparecen suavemente conforme entran a la pantalla al hacer
   scroll. En navegadores que no lo soportan, simplemente se ven normales. */
@keyframes brotesReveal {
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: none; }
}

/* ---------- Ticket de pago ---------- */
@keyframes ticketMaquina {
  from { opacity: 0; transform: translateY(-24px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
@keyframes ticketImprime {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}
@keyframes ticketVibra {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-0.6px); }
  75% { transform: translateX(0.6px); }
}
@keyframes ticketAparece {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
.ticket-maquina { animation: ticketMaquina .5s cubic-bezier(.2,.8,.2,1) both; }
.ticket-maquina.imprimiendo { animation: ticketMaquina .5s cubic-bezier(.2,.8,.2,1) both, ticketVibra .09s linear .7s 22; }
.ticket-papel { animation: ticketImprime 2.1s cubic-bezier(.45,.05,.25,1) .7s both; }
.ticket-despues { animation: ticketAparece .4s ease 2.8s both; }
@media (prefers-reduced-motion: reduce) {
  .ticket-maquina, .ticket-maquina.imprimiendo, .ticket-papel, .ticket-despues { animation: none; }
}
/* ---------- Animación de entrada ---------- */
.brotes-intro {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #EAC468;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.brotes-intro.saliendo {
  opacity: 0;
  transform: scale(1.06);
  pointer-events: none;
}
.brotes-intro-planta {
  position: relative;
  width: 150px;
  height: 154px;
}
.brotes-intro-planta img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transform-origin: 50% 85%;
  animation: brotesCrece 0.55s cubic-bezier(.34,1.56,.64,1) forwards,
             brotesDesvanece 0.25s ease forwards;
}
.brotes-intro-planta img:nth-child(1) { animation-delay: 0s, 0.5s; }
.brotes-intro-planta img:nth-child(2) { animation-delay: 0.45s, 0.95s; }
.brotes-intro-planta img:nth-child(3) { animation-delay: 0.9s, 99s; }
.brotes-intro-logo {
  height: 46px;
  width: auto;
  margin-top: 22px;
  opacity: 0;
  animation: brotesSube 0.6s ease 1s forwards;
}
.brotes-intro-texto {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: #6b6047;
  margin: 10px 0 0;
  opacity: 0;
  animation: brotesSube 0.6s ease 1.2s forwards;
}
@keyframes brotesCrece {
  from { opacity: 0; transform: scale(0.3) translateY(20px); }
  to { opacity: 1; transform: none; }
}
@keyframes brotesDesvanece {
  to { opacity: 0; }
}
@keyframes brotesSube {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .brotes-intro-planta img, .brotes-intro-logo, .brotes-intro-texto { animation: none; opacity: 1; }
  .brotes-intro-planta img:not(:last-child) { opacity: 0; }
  .brotes-intro { transition: opacity 0.2s ease; }
  .brotes-intro.saliendo { transform: none; }
}

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .brotes-reveal {
      animation: brotesReveal linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 40%;
    }
  }
}
.brotes-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}
.brotes-grid > * {
  min-width: 0;
}
.brotes-tamanos {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
@media (min-width: 560px) {
  .brotes-tamanos {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
/* Celulares muy angostos (iPhone SE original): una sola columna */
@media (max-width: 359px) {
  .brotes-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
.brotes-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Tablet y computadora: la app "flota" como una tarjeta centrada en vez de ocupar toda la pantalla */
@media (min-width: 700px) {
  /* Fondo verde pino alrededor de la app (solo aquí; en celular no se ve) */
  html, body, .brotes-root {
    margin: 0;
    min-height: 100%;
    background: #405D3E;
  }
  .brotes-shell {
    max-width: 480px;
    height: calc(100vh - 48px);
    height: calc(100dvh - 48px);
    margin-top: 24px;
    margin-bottom: 24px;
    border-radius: 32px;
    overflow: hidden;
    box-shadow: 0 30px 70px -25px rgba(0, 0, 0, 0.45);
  }
}

/* Pantallas grandes: aprovecha el ancho extra con más columnas en el jardín */
@media (min-width: 1080px) {
  .brotes-shell {
    max-width: 900px;
  }
  .brotes-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .brotes-tip-img {
    max-width: 200px !important;
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

// Achica la foto antes de mandarla: las fotos del celular pesan 3-5 MB y
// Vercel no acepta más de 4.5 MB por petición. De paso se quitan los datos
// ocultos de la foto (como la ubicación GPS de tu casa).
// Si algo falla, se usa la foto original.
async function comprimirFoto(file, maxLado = 1600, calidad = 0.82) {
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * escala);
      canvas.height = Math.round(img.naturalHeight * escala);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
      return blob || file;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return file;
  }
}

// Token de la sesión actual, para que el servidor sepa quién hace la petición.
async function tokenSesion() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

// Calcula cuánto falta (o si ya se pasó) para el próximo riego, contando
// días de calendario en hora de CDMX desde la última foto guardada.
function getWateringStatus(plant) {
  const remaining = diasParaRiego(plant?.dias_entre_riegos, plant?.history);
  if (remaining === null) return null;
  if (remaining < 0) return { label: "Necesita agua", urgent: true, late: true, remaining };
  if (remaining === 0) return { label: "Riega hoy", urgent: true, late: false, remaining };
  if (remaining === 1) return { label: "Riega mañana", urgent: false, late: false, remaining };
  return { label: `Riega en ${remaining} días`, urgent: false, late: false, remaining };
}

// Orden de prioridad para ordenar por estado de salud: lo que necesita atención primero
const ESTADO_ORDEN = { critico: 0, regular: 1, saludable: 2 };

// El precio y los horarios del mantenimiento viven en lib/servicio.js
// (los usa también el servidor, que es quien cobra).

// Fases de crecimiento que la persona puede indicar antes de escanear, para
// darle más contexto a la IA (por ejemplo una plántula recién germinada se
// puede confundir fácilmente con otra si no se avisa que apenas está naciendo).
const FASES_PLANTA = [
  { key: "germinando", label: "Germinando" },
  { key: "brote", label: "Brote pequeño" },
  { key: "creciendo", label: "Creciendo" },
  { key: "grande", label: "Ya grande / madura" },
];




// Etapas de crecimiento de la "plantita" del buzón de tips: evoluciona según
// qué tan sano está el jardín en general y la mejor racha de riego que tengas,
// como una recompensa visual por cuidar bien tus plantas.
const GARDEN_STAGES = [
  { min: 0, img: "/stages/s12.png", label: "Necesita ayuda urgente" },
  { min: 1 / 12, img: "/stages/s10.png", label: "Se está marchitando" },
  { min: 2 / 12, img: "/stages/s11.png", label: "Recuperándose" },
  { min: 3 / 12, img: "/stages/s1.png", label: "Apenas germinando" },
  { min: 4 / 12, img: "/stages/s2.png", label: "Brotando" },
  { min: 5 / 12, img: "/stages/s3.png", label: "Echando raíces" },
  { min: 6 / 12, img: "/stages/s4.png", label: "Creciendo bien" },
  { min: 7 / 12, img: "/stages/s5.png", label: "Ganando fuerza" },
  { min: 8 / 12, img: "/stages/s6.png", label: "Hecho un árbol" },
  { min: 9 / 12, img: "/stages/s7.png", label: "Jardín floreciente" },
  { min: 10 / 12, img: "/stages/s8.png", label: "Raíces profundas" },
  { min: 11 / 12, img: "/stages/s9.png", label: "Jardín próspero" },
];

function getGardenStage(garden) {
  if (!garden.length) return { img: "/stages/s1.png", label: "Tips de cuidado" };
  const total = garden.length;
  const saludables = garden.filter((p) => p.estado_general === "saludable").length;
  const regulares = garden.filter((p) => p.estado_general === "regular").length;
  const criticos = garden.filter((p) => p.estado_general === "critico").length;

  // Las 3 etapas tristes (calavera, marchita, recuperándose) solo aparecen
  // cuando hay plantas en estado crítico.
  if (criticos / total >= 0.5) return GARDEN_STAGES[0];
  if (criticos / total >= 0.25) return GARDEN_STAGES[1];
  if (criticos > 0) return GARDEN_STAGES[2];

  // Sin plantas críticas: de germinando a jardín próspero, según la salud
  // ("necesita atención" cuenta como media planta sana) y la mejor racha.
  const salud = (saludables + regulares * 0.5) / total;
  const maxRacha = Math.max(0, ...garden.map((p) => p.racha_riego || 0));
  const streakScore = Math.min(maxRacha / 10, 1);
  const score = salud * 0.6 + streakScore * 0.4;
  const positivas = GARDEN_STAGES.slice(3);
  return positivas[Math.min(positivas.length - 1, Math.floor(score * positivas.length))];
}

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
        fontSize: 12,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: color || C.inkSoft,
      }}
    >
      {children}
    </span>
  );
}

// ---------- Tarjeta de planta: estilo "widget" (tarjeta blanca, íconos, jerarquía tipo Salud/Clima) ----------
function PlantCard({ data, imageUrl, footer, compact, nameEdit }) {
  const estadoColor = ESTADO_COLOR[data.estado_general] || C.amber;
  const estadoTexto = ESTADO_TEXTO[data.estado_general] || AMBAR_TEXTO;
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
          <div style={{ minWidth: 0, flex: 1, paddingRight: compact ? 8 : 0 }}>
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
                  style={{ background: C.green, border: "none", borderRadius: 10, width: 36, height: 36, color: "#fff", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Icon.Check style={{ width: 16, height: 16 }} />
                </button>
                <button
                  onClick={nameEdit.onCancel}
                  aria-label="Cancelar"
                  style={{ background: "transparent", border: "1px solid " + C.cardLine, borderRadius: 10, width: 36, height: 36, color: C.inkSoft, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
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
                    minWidth: 0,
                    overflowWrap: "break-word",
                    hyphens: "auto",
                    WebkitHyphens: "auto",
                  }}
                >
                  {data.nombre_comun}
                </h2>
                {nameEdit && (
                  <button
                    onClick={nameEdit.onStart}
                    aria-label="Editar nombre"
                    style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 9, margin: -7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Icon.Pencil style={{ width: 14, height: 14 }} />
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
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: compact ? 11.5 : 12.5, fontWeight: 700, color: estadoTexto }}>
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
            <div className="brotes-stats" style={{ marginTop: 20 }}>
              <div style={{ background: C.tileBg, borderRadius: 16, padding: "12px 14px" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(10,132,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                  <Icon.Droplet style={{ color: C.blue }} />
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 17, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
                  {watering ? watering.label.replace(/^Riega\s*/i, "").replace(/^Necesita agua$/i, "Hoy") : "—"}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.inkSoft, margin: "1px 0 0" }}>Próximo riego</p>
              </div>

              <div
                style={{
                  background: hasRacha ? "linear-gradient(160deg, #FBEBD8, " + C.tileBg + ")" : C.tileBg,
                  borderRadius: 16,
                  padding: "12px 14px",
                  boxShadow: hasRacha ? "0 0 0 1px rgba(194,112,60,0.18), 0 0 18px rgba(194,112,60,0.28)" : "none",
                  transition: "box-shadow 0.3s ease",
                }}
              >
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
                    boxShadow: hasRacha ? "0 0 10px rgba(194,112,60,0.45)" : "none",
                  }}
                >
                  {hasRacha ? <Icon.Flame style={{ color: C.orange }} /> : <Icon.Leaf style={{ color: estadoColor, width: 14, height: 14 }} />}
                </div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 17, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
                  {hasRacha ? data.racha_riego : estadoLabel}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.inkSoft, margin: "1px 0 0" }}>
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
              <div style={{ marginTop: 18 }}>
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
              <div style={{ marginTop: 18 }}>
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

            {footer}
          </>
        )}

        {compact && watering && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
            <Icon.Droplet style={{ color: watering.urgent ? C.red : C.blue, width: 12, height: 12 }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: watering.urgent ? C.red : C.inkSoft }}>
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
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.inkSoft, margin: 0, fontWeight: 600 }}>{label}</p>
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
  User: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
  MapPin: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 21s-7-6.3-7-11.5A7 7 0 0119 9.5C19 14.7 12 21 12 21z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  ExternalLink: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 4h6v6M20 4l-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ChevronRight: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Cart: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3 4h2l2.2 11.2a2 2 0 002 1.8h7.6a2 2 0 002-1.6L20 8H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  ),
  Card: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
};

// ---------- Ticket de pago: la "máquina" imprime el recibo al volver de Stripe ----------
function TicketPago({ datos, onCerrar }) {
  const M = "'IBM Plex Mono', ui-monospace, Menlo, monospace";
  const F = "'Inter', sans-serif";
  const pagado = datos.pagado;
  const esOxxo = datos.metodo === "oxxo";
  const tamano = tamanoPorClave(datos.reservacion?.tamano);
  const dinero = (c) => "$" + (c / 100).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pedido = "AMB-" + String(datos.reservacion?.id || "").replace(/-/g, "").slice(0, 6).toUpperCase();
  const fechaPago = new Date(datos.fechaPago || Date.now())
    .toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    .replace(",", " ·")
    .toUpperCase();
  const visita = datos.reservacion?.fecha
    ? new Date(datos.reservacion.fecha + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }) + " · " + datos.reservacion.hora
    : "";
  const pagadoCon = esOxxo
    ? "OXXO (efectivo)"
    : datos.tarjeta
    ? `${datos.tarjeta.marca.charAt(0).toUpperCase() + datos.tarjeta.marca.slice(1)} •••• ${datos.tarjeta.ultimos4}`
    : "Tarjeta";

  // Código de barras decorativo, siempre igual para el mismo pedido.
  const barras = [];
  let semilla = 0;
  for (const ch of pedido) semilla = (semilla * 31 + ch.charCodeAt(0)) >>> 0;
  for (let k = 0; k < 46; k++) {
    semilla = (semilla * 1103515245 + 12345) >>> 0;
    barras.push(1 + (semilla % 3));
  }

  const linea = { display: "flex", justifyContent: "space-between", gap: 12, fontFamily: M, fontSize: 12.5, color: "#3a3a3a", margin: "5px 0" };
  const punteada = { borderTop: "1.5px dashed #cfcfcf", margin: "14px 0" };

  return (
    <div
      role="dialog"
      aria-label={pagado ? "Pago completo" : "Reservación creada"}
      style={{ position: "absolute", inset: 0, zIndex: 70, background: "#efeadb", overflowY: "auto", padding: "28px 16px 32px", display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        {/* ---- La máquina ---- */}
        <div className={"ticket-maquina imprimiendo"} style={{ position: "relative", zIndex: 2, background: C.dark, borderRadius: 26, padding: 12, boxShadow: "0 18px 40px -20px rgba(0,0,0,0.55)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 2px 12px" }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/stages/s2.png" alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
            </span>
            <button
              onClick={onCerrar}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(245,239,221,0.14)", color: C.cream, border: "1px solid rgba(245,239,221,0.18)", borderRadius: 999, padding: "9px 16px", fontFamily: F, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              <Icon.Leaf style={{ width: 14, height: 14 }} /> Inicio
            </button>
          </div>
          <div style={{ background: "#1f3321", borderRadius: 18, padding: "16px 16px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: F, fontWeight: 800, fontSize: 17, color: C.cream, margin: 0 }}>Mantenimiento</p>
                <p style={{ fontFamily: F, fontSize: 13.5, color: "rgba(245,239,221,0.7)", margin: "2px 0 0" }}>
                  {tamano ? `Jardín ${tamano.nombre.toLowerCase()}` : "Visita a domicilio"}
                </p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontFamily: F, fontSize: 12.5, color: "rgba(245,239,221,0.7)", margin: 0 }}>Total</p>
                <p style={{ fontFamily: F, fontWeight: 800, fontSize: 21, color: C.cream, margin: "1px 0 0" }}>{dinero(datos.total)}</p>
              </div>
            </div>
            <p style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: F, fontWeight: 600, fontSize: 14, color: C.cream, margin: "14px 0 0" }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: pagado ? "#4caf68" : C.amber, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {pagado ? <Icon.Check style={{ width: 12, height: 12, color: "#fff" }} /> : <span style={{ color: "#fff", fontWeight: 800, fontSize: 12 }}>!</span>}
              </span>
              {pagado ? "Pago completo" : esOxxo ? "Falta pagar en OXXO" : "Procesando tu pago"}
            </p>
          </div>
          {/* ranura por donde sale el ticket */}
          <div style={{ height: 9, margin: "12px 6px 0", borderRadius: 6, background: "#152316", boxShadow: "inset 0 2px 3px rgba(0,0,0,0.6)" }} />
        </div>

        {/* ---- El ticket ---- */}
        <div style={{ position: "relative", zIndex: 1, margin: "-8px auto 0", width: "88%", overflow: "hidden", paddingBottom: 14 }}>
          <div
            className="ticket-papel"
            style={{
              background: "#fff",
              padding: "26px 20px 22px",
              boxShadow: "0 10px 24px -14px rgba(0,0,0,0.35)",
              // borde de abajo en zigzag, como papel cortado
              WebkitMaskImage: "linear-gradient(#000, #000), conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg)",
              WebkitMaskSize: "100% calc(100% - 8px), 14px 8px",
              WebkitMaskPosition: "top, bottom",
              WebkitMaskRepeat: "no-repeat, repeat-x",
              maskImage: "linear-gradient(#000, #000), conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg)",
              maskSize: "100% calc(100% - 8px), 14px 8px",
              maskPosition: "top, bottom",
              maskRepeat: "no-repeat, repeat-x",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <img src="/logo.png" alt="Ámbitat" style={{ height: 30, width: "auto" }} />
            </div>
            <div style={punteada} />
            <div style={{ ...linea, color: "#1d1d1d", fontWeight: 600 }}>
              <span>MANTENIMIENTO</span>
              <span>{dinero(datos.total)}</span>
            </div>
            <div style={{ ...linea, margin: 0 }}>
              <span>{tamano ? `Jardín ${tamano.nombre.toLowerCase()}` : "Visita a domicilio"}</span>
            </div>
            {visita && (
              <div style={linea}>
                <span>Visita</span>
                <span style={{ textAlign: "right" }}>{visita}</span>
              </div>
            )}
            <div style={punteada} />
            <div style={{ ...linea, alignItems: "baseline", color: "#1d1d1d" }}>
              <span style={{ fontWeight: 600, letterSpacing: "0.04em" }}>{pagado ? "TOTAL PAGADO" : "TOTAL A PAGAR"}</span>
              <span style={{ fontSize: 21, fontWeight: 600 }}>{dinero(datos.total)}</span>
            </div>
            <div style={punteada} />
            <div style={linea}><span>Pedido</span><span>{pedido}</span></div>
            <div style={linea}><span>{pagado ? "Pagado con" : "Pago"}</span><span>{pagadoCon}</span></div>
            <div style={linea}><span>Fecha</span><span>{fechaPago}</span></div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "stretch", gap: 1.5, height: 46, marginTop: 20 }} aria-hidden="true">
              {barras.map((w, k) => (
                <span key={k} style={{ width: w * 1.6, background: k % 2 === 0 ? "#1d1d1d" : "transparent" }} />
              ))}
            </div>
            <p style={{ fontFamily: M, fontSize: 10.5, color: "#8a8a8a", textAlign: "center", letterSpacing: "0.2em", margin: "6px 0 0" }}>{pedido.replace("-", " ")}</p>
          </div>
        </div>

        {/* ---- Después de imprimir ---- */}
        <div className="ticket-despues" style={{ textAlign: "center", marginTop: 6 }}>
          <p style={{ fontFamily: F, fontSize: 13.5, color: C.inkSoft, margin: "0 0 14px", lineHeight: 1.45 }}>
            {pagado
              ? "Tu visita quedó confirmada. Te escribiremos por WhatsApp un día antes."
              : esOxxo
              ? "Tu horario queda apartado 2 días. Paga en cualquier OXXO con tu ficha y se confirma solo."
              : "Estamos confirmando tu pago; en unos minutos lo verás en Tus reservaciones."}
          </p>
          {!pagado && datos.fichaOxxo && (
            <a
              href={datos.fichaOxxo}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", marginBottom: 10, padding: "13px 0", borderRadius: 999, background: C.green, color: "#fff", fontFamily: F, fontWeight: 700, fontSize: 14.5, textDecoration: "none" }}
            >
              Ver mi ficha de pago OXXO
            </a>
          )}
          <button
            onClick={onCerrar}
            style={{ width: "100%", padding: "13px 0", borderRadius: 999, border: "1px solid " + C.cardLine, background: C.card, color: C.ink, fontFamily: F, fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
          >
            Ver mis reservaciones
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Animación de entrada: una planta que crece y aparece el logo ----------
function IntroAnimada() {
  // Al regresar de pagar no se muestra: ahí la animación importante es el ticket.
  const [fase, setFase] = useState(() =>
    typeof window !== "undefined" && window.location.search.includes("pago=") ? "fuera" : "visible"
  ); // visible -> saliendo -> fuera
  useEffect(() => {
    if (fase === "fuera") return;
    const t1 = setTimeout(() => setFase("saliendo"), 2000);
    const t2 = setTimeout(() => setFase("fuera"), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  if (fase === "fuera") return null;
  return (
    <div
      className={"brotes-intro" + (fase === "saliendo" ? " saliendo" : "")}
      onClick={() => setFase("saliendo")}
      aria-hidden="true"
    >
      <div className="brotes-intro-planta">
        <img src="/stages/s1.png" alt="" />
        <img src="/stages/s5.png" alt="" />
        <img src="/stages/s8.png" alt="" />
      </div>
      <img className="brotes-intro-logo" src="/logo.png" alt="" />
      <p className="brotes-intro-texto">Cuida tus plantas, una foto a la vez.</p>
    </div>
  );
}

// ---------- Pantalla de cuenta: crear cuenta, iniciar sesión, contraseña ----------
// Traduce los errores de Supabase (vienen en inglés) a algo entendible.
function errorDeCuenta(err) {
  const m = (err?.message || "").toLowerCase();
  if (m.includes("token") && (m.includes("expired") || m.includes("invalid"))) return "Ese código no es correcto o ya venció. Revísalo o pide uno nuevo.";
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("already exists"))
    return "Ya existe una cuenta con ese correo. Inicia sesión.";
  if (m.includes("email not confirmed")) return "Primero confirma tu correo: revisa tu bandeja de entrada (y spam).";
  if (m.includes("password") && (m.includes("least") || m.includes("short") || m.includes("weak")))
    return "La contraseña es muy corta o muy fácil. Usa al menos 8 caracteres.";
  if (m.includes("same") && m.includes("password")) return "La nueva contraseña debe ser distinta a la anterior.";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "Demasiados intentos seguidos. Espera unos minutos e intenta de nuevo.";
  if (m.includes("not authorized") || m.includes("sending") || m.includes("smtp"))
    return "No pudimos enviarte el correo. Intenta más tarde o escríbenos.";
  if (m.includes("anonymous") && m.includes("disabled")) return "La prueba gratis no está disponible ahorita. Crea tu cuenta para continuar.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "Esa opción todavía no está disponible. Usa otra.";
  if (m.includes("invalid") && m.includes("email")) return "Revisa que el correo esté bien escrito.";
  if (m.includes("fetch") || m.includes("network")) return "Sin conexión. Revisa tu internet.";
  return "Algo salió mal. Intenta de nuevo.";
}

// Cuando un enlace de correo no sirve, o alguien cancela el inicio con
// Google/Apple/Facebook, Supabase regresa a la app con el error en la
// dirección (…/#error=access_denied&error_code=otp_expired…). Se lee una
// sola vez, se traduce y se limpia la dirección.
function leerErrorDeEnlace() {
  if (typeof window === "undefined") return null;
  const texto = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const params = new URLSearchParams(texto || window.location.search.slice(1));
  const codigo = params.get("error_code") || params.get("error");
  if (!codigo) return null;
  const descripcion = (params.get("error_description") || "").toLowerCase();
  window.history.replaceState({}, "", window.location.pathname);
  if (codigo === "otp_expired") {
    return { tipo: "correo", mensaje: "Ese enlace ya no sirve: ya se usó o expiró (solo funciona el último correo que te mandamos). Pide uno nuevo abajo." };
  }
  if (descripcion.includes("already") && (descripcion.includes("linked") || descripcion.includes("exists"))) {
    return { tipo: "social", mensaje: "Esa cuenta ya está registrada en Ámbitat. Toca \"Ya tengo cuenta\" y entra con ella." };
  }
  return { tipo: "social", mensaje: "No se completó el inicio de sesión. Intenta de nuevo." };
}

// Logotipos de los botones de inicio de sesión (como piden Google, Apple y Facebook).
const LogoProveedor = {
  apple: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#111" d="M16.37 1.43c0 1.14-.5 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.21-2.98.8-.94 2.14-1.64 3.25-1.68.03.13.05.28.05.43zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8-1.29-1.82-2.32-4.63-2.32-7.28 0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.68.95 3.6.95.87 0 2.22-1.01 3.9-1.01.61 0 2.89.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.96 4.45z" />
    </svg>
  ),
  google: () => (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  ),
  facebook: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#fff" d="M15.12 15.47l.53-3.47h-3.33V9.75c0-.95.47-1.87 1.96-1.87h1.51V4.93s-1.37-.23-2.69-.23c-2.74 0-4.53 1.66-4.53 4.67V12H5.52v3.47h3.05V24a12.1 12.1 0 003.75 0v-8.53h2.8z" />
    </svg>
  ),
  correo: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2" stroke="#221C13" strokeWidth="1.6" />
      <path d="M3.5 7l8.5 6 8.5-6" stroke="#221C13" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
};
const NOMBRE_PROVEEDOR = { apple: "Apple", google: "Google", facebook: "Facebook" };

// Pregunta a Supabase qué inicios de sesión están activados.
// null = todavía no se sabe (o no se pudo preguntar).
function useProveedoresActivos() {
  const [activos, setActivos] = useState(null);
  useEffect(() => {
    let vigente = true;
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vigente && d) setActivos(d.external || {});
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);
  return activos;
}

// Pantalla de cuenta, lo más simple posible:
//  - "Continuar con Google" (y Apple/Facebook si están activados)
//  - "Continuar con correo": se escribe el correo, llega un código de 6 dígitos
//    y listo. Sin contraseñas: el mismo camino sirve para crear cuenta y entrar.
function PantallaCuenta({ estado, plantasGuardadas, nombrePlanta, onProbar }) {
  const [errorEnlace] = useState(leerErrorDeEnlace);
  const activos = useProveedoresActivos();
  const [paso, setPaso] = useState(errorEnlace?.tipo === "correo" ? "correo" : "opciones"); // opciones | correo | codigo
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tipoCodigo, setTipoCodigo] = useState("email"); // email | email_change (cuenta de prueba que guarda su planta)
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(errorEnlace?.mensaje || null);
  const [aviso, setAviso] = useState(null);
  const [esperaReenvio, setEsperaReenvio] = useState(0);

  const origen = typeof window !== "undefined" ? window.location.origin : undefined;
  const esAnonimo = estado === "anonimo";
  const F = "'Inter', sans-serif";

  // Cuenta regresiva para "Reenviar código" (Supabase permite 1 cada 60 s).
  useEffect(() => {
    if (esperaReenvio <= 0) return;
    const t = setTimeout(() => setEsperaReenvio((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [esperaReenvio]);

  // Si regresa de Google/Apple/Facebook con "Atrás", que los botones no se queden bloqueados.
  useEffect(() => {
    function alVolver(e) {
      if (e.persisted) setEnviando(false);
    }
    window.addEventListener("pageshow", alVolver);
    return () => window.removeEventListener("pageshow", alVolver);
  }, []);

  function irA(nuevoPaso) {
    setPaso(nuevoPaso);
    setError(null);
    setAviso(null);
  }

  // ---------- Google / Apple / Facebook ----------
  async function continuarCon(proveedor) {
    setError(null);
    if (activos && !activos[proveedor]) {
      setError(`El inicio con ${NOMBRE_PROVEEDOR[proveedor]} se activa muy pronto. Mientras, entra con tu correo.`);
      return;
    }
    setEnviando(proveedor);
    const options = { redirectTo: origen };
    // Si viene de la prueba gratis, se "vincula" para que su planta no se pierda.
    let { error } = esAnonimo
      ? await supabase.auth.linkIdentity({ provider: proveedor, options })
      : await supabase.auth.signInWithOAuth({ provider: proveedor, options });
    if (error && esAnonimo) ({ error } = await supabase.auth.signInWithOAuth({ provider: proveedor, options }));
    if (error) {
      setEnviando(false);
      setError(errorDeCuenta(error));
      return;
    }
    setTimeout(() => setEnviando(false), 6000); // por si el navegador no se fue
  }

  // ---------- Correo: mandar código ----------
  async function mandarCodigo(e) {
    e?.preventDefault();
    setError(null);
    setAviso(null);
    const mail = correo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return setError("Revisa que el correo esté bien escrito.");
    setEnviando("correo");
    let tipo = "email";
    let error = null;
    if (esAnonimo) {
      // Se le pone el correo a la sesión de prueba, así su planta se queda.
      ({ error } = await supabase.auth.updateUser({ email: mail }, { emailRedirectTo: origen }));
      tipo = "email_change";
      if (error && /already|registered|exists/i.test(error.message || "")) {
        // Ese correo ya tiene cuenta: entra a esa cuenta (la planta de prueba no se pasa).
        ({ error } = await supabase.auth.signInWithOtp({ email: mail, options: { emailRedirectTo: origen } }));
        tipo = "email";
      }
    } else {
      ({ error } = await supabase.auth.signInWithOtp({ email: mail, options: { shouldCreateUser: true, emailRedirectTo: origen } }));
    }
    setEnviando(false);
    if (error) return setError(errorDeCuenta(error));
    setTipoCodigo(tipo);
    setCodigo("");
    setEsperaReenvio(60);
    setPaso("codigo");
  }

  // ---------- Correo: escribir código ----------
  async function verificarCodigo(e) {
    e?.preventDefault();
    setError(null);
    const token = codigo.replace(/\D/g, "");
    if (token.length < 6) return setError("Escribe el código completo que te llegó por correo.");
    setEnviando("codigo");
    const { error } = await supabase.auth.verifyOtp({ email: correo.trim().toLowerCase(), token, type: tipoCodigo });
    setEnviando(false);
    if (error) return setError(errorDeCuenta(error));
    // Listo: Supabase avisa que ya hay sesión y la app se abre sola.
  }

  async function probar() {
    setError(null);
    setEnviando("probar");
    const err = await onProbar();
    setEnviando(false);
    if (err) setError(errorDeCuenta(err));
  }

  if (estado === "cargando") {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: F, fontSize: 14, color: C.inkSoft }}>Cargando...</p>
      </div>
    );
  }

  // ---------- Estilos ----------
  const pildora = {
    position: "relative",
    width: "100%",
    minHeight: 54,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 52px",
    borderRadius: 999,
    border: "1px solid #ddd3b6",
    background: "#fff",
    fontFamily: F,
    fontWeight: 700,
    fontSize: 16,
    color: C.ink,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  };
  const icono = { position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", display: "flex" };
  const principal = { ...pildora, border: "none", background: C.green, color: "#fff", boxShadow: "0 10px 22px -14px rgba(40,64,42,0.8)" };
  const enlace = { background: "none", border: "none", padding: 6, color: C.green, fontFamily: F, fontWeight: 700, fontSize: 14.5, cursor: "pointer" };
  const campo = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid " + C.cardLine,
    borderRadius: 14,
    padding: "14px 16px",
    fontFamily: F,
    fontSize: 16,
    color: C.ink,
    background: "#fff",
  };
  const mensajes = (
    <>
      {error && <p role="alert" style={{ fontFamily: F, fontSize: 14, color: C.red, margin: "14px 0 0", lineHeight: 1.4, textAlign: "center" }}>{error}</p>}
      {aviso && <p style={{ fontFamily: F, fontSize: 14, color: C.green, margin: "14px 0 0", lineHeight: 1.4, textAlign: "center" }}>{aviso}</p>}
    </>
  );
  const encabezado = (titulo, subtitulo) => (
    <div style={{ textAlign: "center", marginBottom: 26 }}>
      <img src="/logo.png" alt="Ámbitat" style={{ height: 40, width: "auto", marginBottom: 24 }} />
      <h1 style={{ fontFamily: F, fontWeight: 800, fontSize: 27, color: C.ink, margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.15 }}>{titulo}</h1>
      <p style={{ fontFamily: F, fontSize: 15, color: C.inkSoft, margin: "0 auto", lineHeight: 1.45, maxWidth: 300 }}>{subtitulo}</p>
    </div>
  );
  const contenedor = { flex: "1 0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 22px 28px", maxWidth: 420, width: "100%", boxSizing: "border-box", margin: "0 auto" };
  const atras = (destino) => (
    <button type="button" onClick={() => irA(destino)} style={{ ...enlace, color: C.inkSoft, fontWeight: 600, alignSelf: "flex-start", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
      <Icon.Back /> Atrás
    </button>
  );

  // ---------- Paso: escribir el código ----------
  if (paso === "codigo") {
    return (
      <form onSubmit={verificarCodigo} style={contenedor} noValidate>
        {atras("correo")}
        {encabezado("Revisa tu correo", `Te mandamos un código a ${correo.trim().toLowerCase()}. Escríbelo aquí.`)}
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 8))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          aria-label="Código de verificación"
          style={{ ...campo, textAlign: "center", fontSize: 28, fontWeight: 700, letterSpacing: "0.35em", padding: "16px 12px" }}
        />
        <button type="submit" disabled={!!enviando} style={{ ...principal, marginTop: 16, opacity: enviando ? 0.7 : 1 }}>
          {enviando === "codigo" ? "Entrando..." : "Entrar"}
        </button>
        {mensajes}
        <p style={{ fontFamily: F, fontSize: 13.5, color: C.inkSoft, textAlign: "center", margin: "20px 0 0", lineHeight: 1.5 }}>
          ¿No te llegó? Revisa tu carpeta de spam.
          <br />
          {esperaReenvio > 0 ? (
            <span>Puedes pedir otro en {esperaReenvio} s</span>
          ) : (
            <button type="button" onClick={mandarCodigo} disabled={!!enviando} style={enlace}>
              Mandar otro código
            </button>
          )}
        </p>
      </form>
    );
  }

  // ---------- Paso: escribir el correo ----------
  if (paso === "correo") {
    return (
      <form onSubmit={mandarCodigo} style={contenedor} noValidate>
        {atras("opciones")}
        {encabezado("Continuar con correo", "Te mandamos un código de 6 dígitos. Sin contraseñas.")}
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          autoComplete="email"
          inputMode="email"
          autoFocus
          placeholder="tu@correo.com"
          aria-label="Correo"
          style={campo}
        />
        <button type="submit" disabled={!!enviando} style={{ ...principal, marginTop: 16, opacity: enviando ? 0.7 : 1 }}>
          {enviando === "correo" ? "Enviando..." : "Mandarme el código"}
        </button>
        {mensajes}
      </form>
    );
  }

  // ---------- Paso: opciones ----------
  const titulo = esAnonimo ? (nombrePlanta ? `Guarda tu ${nombrePlanta}` : "Guarda tu planta") : "Cuida tus plantas con Ámbitat";
  const subtitulo = esAnonimo
    ? plantasGuardadas > 1
      ? `Entra para conservar tus ${plantasGuardadas} plantas y escanear todas las que quieras.`
      : "Entra para que no se pierda y escanea todas las plantas que quieras."
    : "Entra en segundos. Si es tu primera vez, tu cuenta se crea sola.";
  // Google siempre; Apple y Facebook solo si ya están activados.
  const extras = ["apple", "facebook"].filter((p) => activos?.[p]);

  return (
    <div style={contenedor}>
      {encabezado(titulo, subtitulo)}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button type="button" onClick={() => continuarCon("google")} disabled={!!enviando} style={pildora}>
          <span style={icono}><LogoProveedor.google /></span>
          {enviando === "google" ? "Abriendo Google..." : "Continuar con Google"}
        </button>
        {extras.map((p) => {
          const Logo = LogoProveedor[p];
          const esApple = p === "apple";
          return (
            <button
              key={p}
              type="button"
              onClick={() => continuarCon(p)}
              disabled={!!enviando}
              style={esApple ? { ...pildora, background: "#000", color: "#fff", border: "none" } : pildora}
            >
              <span style={{ ...icono, filter: esApple ? "invert(1)" : "none" }}><Logo /></span>
              {enviando === p ? "Abriendo..." : `Continuar con ${NOMBRE_PROVEEDOR[p]}`}
            </button>
          );
        })}
        <button type="button" onClick={() => irA("correo")} disabled={!!enviando} style={pildora}>
          <span style={icono}><LogoProveedor.correo /></span>
          Continuar con correo
        </button>
      </div>
      {mensajes}

      {estado === "sin-cuenta" && (
        <button
          type="button"
          onClick={probar}
          disabled={!!enviando}
          style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 12, background: "rgba(245,239,221,0.7)", border: "1px dashed #c9b98d", borderRadius: 18, padding: "14px 16px", cursor: "pointer", textAlign: "left" }}
        >
          <img src="/stages/s2.png" alt="" style={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontFamily: F, fontWeight: 800, fontSize: 15, color: C.ink }}>
              {enviando === "probar" ? "Abriendo la cámara..." : "Probar sin cuenta"}
            </span>
            <span style={{ display: "block", fontFamily: F, fontSize: 13, color: C.inkSoft, marginTop: 2 }}>Escanea 1 planta gratis y descubre cómo cuidarla.</span>
          </span>
          <span aria-hidden="true" style={{ fontSize: 18, color: C.green }}>→</span>
        </button>
      )}
    </div>
  );
}

// ---------- Nav inferior flotante ----------
function BottomNav({ screen, setScreen, gardenCount }) {
  const items = [
    {
      key: "jardin",
      active: screen === "jardin",
      onClick: () => setScreen("jardin"),
      icon: Icon.Leaf,
      label: `Jardín${gardenCount ? ` (${gardenCount})` : ""}`,
    },
    {
      key: "camera",
      active: screen === "camera" || screen === "fotos" || screen === "analyzing" || screen === "result",
      onClick: () => setScreen("camera"),
      icon: Icon.Camera,
      label: "Cámara",
    },
    {
      key: "comunidad",
      active: screen === "comunidad",
      onClick: () => setScreen("comunidad"),
      icon: Icon.MapPin,
      label: "Comunidad",
    },
    {
      key: "tienda",
      active: screen === "tienda",
      onClick: () => setScreen("tienda"),
      icon: Icon.Cart,
      label: "Tienda",
    },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        alignItems: "stretch",
        margin: "0 16px 16px",
        padding: "8px 4px 6px",
        borderRadius: 22,
        background: "rgba(245,239,221,0.92)",
        borderTop: "1px solid " + C.cardLine,
        boxShadow: "0 -1px 0 rgba(0,0,0,0.02), 0 12px 30px -10px rgba(40,64,42,0.18)",
        backdropFilter: "blur(20px)",
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={item.onClick}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            margin: "0 2px",
            borderRadius: 16,
            background: item.active ? C.green : "transparent",
            border: "none",
            padding: "7px 0",
            cursor: "pointer",
            color: item.active ? "#fff" : "#7d7258",
            transition: "background 0.2s ease, color 0.2s ease",
          }}
        >
          <item.icon style={{ width: 19, height: 19 }} />
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: 11,
              color: item.active ? "#fff" : "#7d7258",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function BrotesApp() {
  const [screen, setScreen] = useState("jardin");
  const scrollRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrolled(false);
  }, [screen]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [selectedPlant]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [ordenJardin, setOrdenJardin] = useState("recientes");
  const [activeTip, setActiveTip] = useState(null); // índice del tip abierto, o null
  // Los 6 tips/datos curiosos de hoy (cambian cada día, hora de CDMX).
  const [hoyTips] = useState(() => diaCDMX());
  const [TIPS] = useState(() => tipsDelDia(hoyTips));
  // Cuáles ya vio hoy (el globito rojo se reinicia cada día).
  const [viewedTips, setViewedTips] = useState(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem("ambitat-tips-vistos") || "{}");
      return guardado && guardado.dia === hoyTips && Array.isArray(guardado.ids) ? guardado.ids : [];
    } catch {
      return [];
    }
  });

  function openTip(i) {
    setActiveTip(i);
    const id = TIPS[i].id;
    setViewedTips((prev) => {
      if (prev.includes(id)) return prev;
      const nuevos = [...prev, id];
      try {
        localStorage.setItem("ambitat-tips-vistos", JSON.stringify({ dia: hoyTips, ids: nuevos }));
      } catch {}
      return nuevos;
    });
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
  // Cada análisis lleva un número. Si mientras se analiza la persona se va
  // a otra pantalla o empieza otro, el resultado viejo se ignora.
  const analisisIdRef = useRef(0);

  const [captureMode, setCaptureMode] = useState("new"); // 'new' | 'followup'
  const [plantHint, setPlantHint] = useState(""); // nombre que el usuario cree que es, opcional
  const [plantFase, setPlantFase] = useState(""); // fase de crecimiento que el usuario cree que tiene, opcional
  const [followupPlantId, setFollowupPlantId] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPlantId, setSavedPlantId] = useState(null); // planta guardada del último análisis
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [garden, setGarden] = useState([]);
  const [userId, setUserId] = useState(null);
  const userIdRef = useRef(null); // siempre el valor actual (las funciones async no se quedan con uno viejo)
  const [gardenError, setGardenError] = useState(null);
  const [notifError, setNotifError] = useState(null);
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

  // ---------- Comunidad (viveros cercanos) ----------
  // Foto de cada vivero: { [placeId]: { foto, autor, autorUrl } }. Se piden
  // una sola vez, la primera vez que se abre Comunidad.
  const [fotosViveros, setFotosViveros] = useState({});
  const fotosPedidas = useRef(false);
  useEffect(() => {
    if (screen !== "comunidad" || fotosPedidas.current) return;
    fotosPedidas.current = true;
    VIVEROS.forEach((v) => {
      fetch(`/api/foto-vivero?placeId=${encodeURIComponent(v.placeId)}`)
        .then((r) => (r.ok ? r.json() : { foto: null }))
        .catch(() => ({ foto: null }))
        .then((data) => setFotosViveros((prev) => ({ ...prev, [v.placeId]: data })));
    });
  }, [screen]);
  // Por ahora es un directorio estático de viveros/tiendas de plantas en
  // CDMX (datos reales de Google) en vez de un feed de publicaciones.

  // ---------- Tienda: reservar mantenimiento ----------
  const [reservaNombre, setReservaNombre] = useState("");
  const [reservaTelefono, setReservaTelefono] = useState("");
  const [reservaCorreo, setReservaCorreo] = useState("");
  const [reservaFecha, setReservaFecha] = useState("");
  const [reservaHora, setReservaHora] = useState(HORARIOS_DISPONIBLES[0]);
  const [reservaDireccion, setReservaDireccion] = useState("");
  const [reservaNotas, setReservaNotas] = useState("");
  const [reservaFechaError, setReservaFechaError] = useState(null);
  // Pasos de la Tienda: inicio (tarjeta) → tamano (elegir jardín) → datos (formulario)
  const [tiendaPaso, setTiendaPaso] = useState("inicio");
  const [reservaTamano, setReservaTamano] = useState(null);
  const [horasOcupadas, setHorasOcupadas] = useState([]);

  // Cada que se elige una fecha, pregunta qué horas ya están tomadas para no
  // ofrecerlas (y si la hora elegida ya no está libre, cambia a la primera libre).
  useEffect(() => {
    if (!reservaFecha) {
      setHorasOcupadas([]);
      return;
    }
    let cancelado = false;
    fetch(`/api/horarios-ocupados?fecha=${reservaFecha}`)
      .then((r) => (r.ok ? r.json() : { ocupadas: [] }))
      .then((data) => {
        if (cancelado) return;
        const ocupadas = data.ocupadas || [];
        setHorasOcupadas(ocupadas);
        setReservaHora((actual) => {
          if (!ocupadas.includes(actual)) return actual;
          return HORARIOS_DISPONIBLES.find((h) => !ocupadas.includes(h)) || actual;
        });
      })
      .catch(() => {
        if (!cancelado) setHorasOcupadas([]);
      });
    return () => {
      cancelado = true;
    };
  }, [reservaFecha]);

  const diaLleno = !!reservaFecha && HORARIOS_DISPONIBLES.every((h) => horasOcupadas.includes(h));

  // El servicio de mantenimiento solo se ofrece sábados y domingos.
  function handleReservaFechaChange(valor) {
    if (!valor) {
      setReservaFecha("");
      setReservaFechaError(null);
      return;
    }
    if (diasEntre(diaCDMX(), valor) < 0) {
      setReservaFechaError("Esa fecha ya pasó. Elige otro sábado o domingo.");
    } else if (esFinDeSemana(valor)) {
      setReservaFecha(valor);
      setReservaFechaError(null);
    } else {
      setReservaFechaError("Solo se puede agendar en sábado o domingo. Elige otra fecha.");
    }
  }
  const [reservando, setReservando] = useState(false);
  const [reservaError, setReservaError] = useState(null);
  const [misReservaciones, setMisReservaciones] = useState([]);
  const [reservaDetalle, setReservaDetalle] = useState(null); // reservación seleccionada para ver su detalle
  const [cargandoReservaciones, setCargandoReservaciones] = useState(true);
  const [pagoStatus, setPagoStatus] = useState(null); // 'exito' | 'cancelado' | null
  // Ticket animado al volver de pagar: se piden los datos reales a Stripe.
  const [sesionPagoId, setSesionPagoId] = useState(null);
  const [ticket, setTicket] = useState(null);

  async function cargarReservaciones(uid) {
    setCargandoReservaciones(true);
    const { data, error } = await supabase
      .from("reservaciones")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (!error && data) setMisReservaciones(data);
    setCargandoReservaciones(false);
  }

  async function reservarYPagar() {
    if (!userIdRef.current) {
      setReservaError("No hay conexión con tu cuenta. Recarga la app e intenta de nuevo.");
      return;
    }
    if (!tamanoPorClave(reservaTamano)) {
      setTiendaPaso("tamano");
      setReservaError("Elige el tamaño de tu jardín.");
      return;
    }
    if (!reservaNombre.trim() || !reservaTelefono.trim() || !reservaCorreo.trim() || !reservaFecha || !reservaDireccion.trim()) {
      setReservaError("Completa tu nombre, teléfono, correo, la dirección y la fecha para continuar.");
      return;
    }
    if (!esFinDeSemana(reservaFecha)) {
      setReservaError("La fecha debe ser sábado o domingo.");
      return;
    }
    if (horasOcupadas.includes(reservaHora)) {
      setReservaError("Ese horario ya está ocupado. Elige otra hora u otro día.");
      return;
    }
    setReservando(true);
    setReservaError(null);

    try {
      // El servidor guarda la reservación, pone el precio y crea el cobro.
      const token = await tokenSesion();
      const response = await fetch("/api/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tamano: reservaTamano,
          nombre: reservaNombre,
          telefono: reservaTelefono,
          correo: reservaCorreo,
          fecha: reservaFecha,
          hora: reservaHora,
          direccion: reservaDireccion,
          notas: reservaNotas,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || "No pudimos iniciar el pago.");
      window.location.href = data.url; // redirige a Stripe Checkout (tarjeta u OXXO)
    } catch (err) {
      console.error("Error al reservar:", err);
      setReservando(false);
      setReservaError(err?.message || "No pudimos iniciar el pago. Intenta de nuevo.");
    }
  }

  // Si la persona regresa de Stripe con el botón "atrás", el navegador puede
  // mostrar la página como estaba (con el botón en "cargando"). Se reinicia.
  useEffect(() => {
    function alVolver(e) {
      if (e.persisted) setReservando(false);
    }
    window.addEventListener("pageshow", alVolver);
    return () => window.removeEventListener("pageshow", alVolver);
  }, []);

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
    if (error) {
      console.error("Error cargando jardín:", error);
      setGardenError("No pudimos cargar tu jardín. Revisa tu conexión.");
      return null;
    }
    setGardenError(null);
    setGarden((data || []).map(rowToPlant));
    return (data || []).length;
  }

  // ---------- Cuenta ----------
  // cargando | sin-cuenta | prueba | anonimo | lista
  const [authEstado, setAuthEstado] = useState("cargando");
  const [usuarioCorreo, setUsuarioCorreo] = useState("");

  async function reintentarCarga() {
    setGardenError(null);
    setLoadingGarden(true);
    const { data } = await supabase.auth.getSession();
    await aplicarSesion(data.session);
  }

  // Decide qué mostrar según la sesión: pantalla de cuenta o la app.
  async function aplicarSesion(session) {
    if (!session) {
      userIdRef.current = null;
      setUserId(null);
      setUsuarioCorreo("");
      setGarden([]);
      setMisReservaciones([]);
      setSelectedPlant(null);
      setScreen("jardin");
      setAuthEstado("sin-cuenta");
      setLoadingGarden(false);
      setCargandoReservaciones(false);
      return;
    }
    const u = session.user;
    userIdRef.current = u.id;
    setUserId(u.id);
    setUsuarioCorreo(u.email || "");

    // Sesión sin cuenta (anónima). Si todavía no escanea nada, está en su
    // escaneo de prueba gratis; si ya escaneó, se le pide crear su cuenta y
    // su planta se queda guardada.
    if (u.is_anonymous) {
      const plantas = await loadGarden(u.id);
      setLoadingGarden(false);
      if (plantas === 0) {
        setAuthEstado("prueba");
        openCamera("new");
      } else {
        setAuthEstado("anonimo");
      }
      return;
    }
    setAuthEstado("lista");
    if (u.email) setReservaCorreo((actual) => actual || u.email);
    await loadGarden(u.id);
    cargarReservaciones(u.id);
    setLoadingGarden(false);
  }

  // Botón "Escanea una planta gratis": crea una sesión sin cuenta y abre la cámara.
  async function empezarPrueba() {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.is_anonymous) {
      await aplicarSesion(data.session);
      return null;
    }
    const { error } = await supabase.auth.signInAnonymously();
    return error || null; // si funcionó, SIGNED_IN abre la cámara
  }

  // En la prueba, cualquier paso después del primer escaneo pide crear cuenta.
  function pedirCuenta() {
    setAuthEstado("anonimo");
  }

  useEffect(() => {
    if (!sesionPagoId || authEstado !== "lista") return;
    let vigente = true;
    (async () => {
      try {
        const token = await tokenSesion();
        const r = await fetch(`/api/estado-pago?session_id=${encodeURIComponent(sesionPagoId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await r.json();
        if (vigente && r.ok) {
          setTicket(data);
          setPagoStatus(null); // el ticket reemplaza el aviso verde
          setTiendaPaso("inicio");
          setReservaTamano(null);
        }
      } catch (err) {
        console.error("No se pudo cargar el ticket:", err); // se queda el aviso verde de respaldo
      } finally {
        if (vigente) setSesionPagoId(null);
      }
      // El aviso de Stripe (webhook) puede tardar unos segundos en marcarla pagada.
      setTimeout(() => userIdRef.current && cargarReservaciones(userIdRef.current), 4000);
    })();
    return () => {
      vigente = false;
    };
  }, [sesionPagoId, authEstado]);

  async function cerrarSesion() {
    if (!window.confirm("¿Cerrar sesión en este celular?")) return;
    await supabase.auth.signOut();
  }

  useEffect(() => {
    // Supabase avisa cada que cambia la sesión (al abrir la app, al iniciar o
    // cerrar sesión, al confirmar el correo o al abrir el enlace de
    // "olvidé mi contraseña").
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) {
        // setTimeout: Supabase recomienda no llamar a la base de datos dentro
        // de este aviso directamente.
        setTimeout(() => aplicarSesion(session), 0);
      }
    });

    // Si venimos de regreso de Stripe (?pago=exito / ?pago=cancelado), lo mostramos
    // y limpiamos la URL para que no se repita si la persona recarga la página.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pago = params.get("pago");
      if (pago === "exito" || pago === "cancelado") {
        setPagoStatus(pago);
        setScreen("tienda");
        const sid = params.get("session_id");
        if (pago === "exito" && sid) setSesionPagoId(sid);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
    return () => subscription.unsubscribe();
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
    if (!userIdRef.current) return;
    setNotifError(null);
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setNotifStatus("unsupported");
      return;
    }
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid) {
      console.error("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      setNotifError("Los recordatorios todavía no están disponibles.");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setNotifStatus("denied");
        return;
      }
      if (permission !== "granted") return; // cerró el aviso sin decidir: puede intentarlo otra vez
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({ user_id: userIdRef.current, endpoint: sub.endpoint, subscription: sub.toJSON() }, { onConflict: "endpoint" });
      if (error) throw error;
      setNotifStatus("subscribed");
    } catch (err) {
      console.error("Error activando notificaciones:", err);
      setNotifError("No pudimos activar los recordatorios. Intenta de nuevo.");
    }
  }

  function openCamera(mode = "new", plantId = null) {
    setCaptureMode(mode);
    setFollowupPlantId(plantId);
    setError(null);
    setResult(null);
    setImageUrl(null);
    setIsSaved(false);
    setSavedPlantId(null);
    setIsSaving(false);
    setSaveError(null);
    photoUrls.forEach((u) => URL.revokeObjectURL(u)); // libera memoria de las vistas previas
    setPhotoFiles([]);
    setPhotoUrls([]);
    setPlantHint("");
    setPlantFase("");
    analisisIdRef.current++; // si había un análisis en curso, se ignora su resultado
    setScreen("camera");
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // para poder volver a elegir el mismo archivo si hace falta
    if (!file || photoFiles.length >= 3) return;
    setError(null);
    setPhotoFiles((prev) => [...prev, file]);
    setPhotoUrls((prev) => [...prev, URL.createObjectURL(file)]);
    setScreen("fotos");
  }

  function removePhoto(i) {
    const quedan = photoFiles.length - 1;
    if (photoUrls[i]) URL.revokeObjectURL(photoUrls[i]);
    setPhotoFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i));
    if (quedan <= 0) setScreen("camera"); // sin fotos, regresa a la cámara en vez de quedar en blanco
  }

  function confirmPhotos() {
    if (photoFiles.length === 0) return;
    const mainUrl = photoUrls[0];
    setImageUrl(mainUrl);
    setScreen("analyzing");
    analyzePhoto(photoFiles, mainUrl);
  }

  async function analyzePhoto(files, url) {
    const miId = ++analisisIdRef.current;
    const sigueVigente = () => analisisIdRef.current === miId;
    // Se guardan ahora: si cambian mientras se analiza, el guardado usa estos.
    const destino = { modo: captureMode, plantaId: followupPlantId };
    setError(null);
    try {
      const comprimidas = await Promise.all(files.map((f) => comprimirFoto(f)));
      const images = await Promise.all(
        comprimidas.map(async (f) => ({ base64: await fileToBase64(f), mediaType: f.type || "image/jpeg" }))
      );
      const token = await tokenSesion();
      const response = await fetch("/api/analizar-planta", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ images, nombreSugerido: plantHint, faseSugerida: plantFase }),
      });
      const parsed = await response.json().catch(() => ({}));
      if (!sigueVigente()) return;
      if (!response.ok) {
        const err = new Error(parsed.error || "Error del servidor");
        err.status = response.status;
        err.requiereCuenta = !!parsed.requiereCuenta;
        throw err;
      }
      setCapturedFile(comprimidas[0]); // para "Reintentar guardado"
      setResult(parsed);
      setScreen("result");
      // Se guarda solo, sin que la persona tenga que tocar nada.
      saveAnalysis(parsed, url, comprimidas[0], destino, sigueVigente);
    } catch (err) {
      console.error(err);
      if (!sigueVigente()) return;
      if (err.requiereCuenta) {
        setScreen("jardin");
        setAuthEstado(garden.length > 0 ? "anonimo" : "sin-cuenta");
        return;
      }
      setError(
        err.status === 429 || err.status === 401
          ? err.message
          : "No pudimos analizar la foto. Revisa tu conexión o intenta con otra imagen más clara."
      );
      setScreen("camera");
    }
  }

  async function saveAnalysis(resultData, imgUrl, file, destino, sigueVigente = () => true) {
    const uid = userIdRef.current;
    if (!resultData) return;
    if (!uid) {
      setSaveError("No pudimos guardar tu planta porque no hay conexión con tu cuenta. Recarga la app.");
      return;
    }
    const { modo, plantaId } = destino || { modo: captureMode, plantaId: followupPlantId };
    setSaveError(null);
    setIsSaving(true);

    let publicUrl = imgUrl;
    if (file) {
      // Nombre simple: los acentos o símbolos del nombre original pueden
      // hacer que Supabase rechace el archivo.
      const path = `${uid}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("plant-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (!uploadError) {
        const { data } = supabase.storage.from("plant-photos").getPublicUrl(path);
        publicUrl = data.publicUrl;
      } else {
        console.error("Error subiendo foto:", uploadError);
        if (!sigueVigente()) return;
        setIsSaving(false);
        setSaveError("No pudimos guardar la foto. Revisa tu conexión e intenta de nuevo.");
        return;
      }
    }

    let nuevoIdGuardado = null;
    const historyEntry = {
      date: new Date().toLocaleDateString("es-MX"),
      dateISO: new Date().toISOString(),
      imageUrl: publicUrl,
      estado_general: resultData.estado_general,
    };

    if (modo === "followup" && plantaId) {
      const followupPlantId = plantaId;
      const plant = garden.find((p) => p.id === followupPlantId);
      const newHistory = [...(plant?.history || []), historyEntry];
      // Racha de riegos a tiempo:
      //  - si ya se había pasado el día de riego, se reinicia
      //  - regar el mismo día que toca sí cuenta como a tiempo
      //  - varias fotos el mismo día solo cuentan una vez
      const estado = getWateringStatus(plant);
      const mismoDia = diasDesdeUltimaFoto(plant?.history) === 0;
      const rachaActual = plant?.racha_riego || 0;
      const nuevaRacha = estado?.late ? 0 : mismoDia ? rachaActual : rachaActual + 1;
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
        if (!sigueVigente()) return;
        setIsSaving(false);
        setSaveError("No pudimos actualizar tu planta. Intenta de nuevo.");
        return;
      }
    } else {
      const newId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      nuevoIdGuardado = newId;
      const { error } = await supabase.from("plantas").insert({
        id: newId,
        user_id: uid,
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
        if (!sigueVigente()) return;
        setIsSaving(false);
        setSaveError("No pudimos guardar tu planta. Intenta de nuevo.");
        return;
      }
    }
    if (!sigueVigente()) return; // ya está en otra pantalla: se guardó, pero no se toca lo que ve ahora
    setImageUrl(publicUrl);
    setSavedPlantId(modo === "followup" && plantaId ? plantaId : nuevoIdGuardado);
    setIsSaving(false);
    setIsSaved(true);
  }

  // ---------- Botón "Atrás" del celular ----------
  // Sin esto, "Atrás" cerraba la app. Ahora cierra lo que esté abierto encima
  // (tip, detalle de reserva, planta) o regresa al jardín.
  const nivelAbierto = authEstado !== "lista" ? null :
    activeTip !== null ? "tip" : reservaDetalle ? "reserva" : selectedPlant ? "planta" : screen !== "jardin" ? "pantalla" : null;
  const historialRef = useRef({ agregado: false, ignorarSiguiente: false });
  const cerrarRef = useRef(() => {});
  cerrarRef.current = () => {
    if (activeTip !== null) setActiveTip(null);
    else if (reservaDetalle) setReservaDetalle(null);
    else if (selectedPlant) {
      setSelectedPlant(null);
      setEditingName(false);
      setCompareMode(false);
      setCompareIndices([]);
    } else if (screen !== "jardin") {
      analisisIdRef.current++;
      setScreen("jardin");
    }
  };
  useEffect(() => {
    const h = historialRef.current;
    if (nivelAbierto && !h.agregado) {
      window.history.pushState({ ambitat: true }, "");
      h.agregado = true;
    } else if (!nivelAbierto && h.agregado) {
      // Se cerró desde la app: quita la entrada que habíamos agregado.
      h.agregado = false;
      h.ignorarSiguiente = true;
      window.history.back();
    }
  }, [nivelAbierto]);
  useEffect(() => {
    function alRegresar() {
      const h = historialRef.current;
      if (h.ignorarSiguiente) {
        h.ignorarSiguiente = false;
        return;
      }
      h.agregado = false;
      cerrarRef.current();
    }
    window.addEventListener("popstate", alRegresar);
    return () => window.removeEventListener("popstate", alRegresar);
  }, []);

  const activePlant = garden.find((p) => p.id === selectedPlant);

  return (
    <div className="brotes-root" lang="es" style={{ display: "flex", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS_IMPORT}</style>
      <IntroAnimada />
      <div className="brotes-shell">
        {authEstado !== "lista" && authEstado !== "prueba" ? (
          <div className="brotes-scroll">
            <PantallaCuenta
              estado={authEstado}
              plantasGuardadas={garden.length}
              nombrePlanta={garden[garden.length - 1]?.nombre_comun}
              onProbar={empezarPrueba}
            />
          </div>
        ) : (
        <>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
        <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <div className="brotes-scroll-shade" style={{ opacity: scrolled ? 1 : 0 }} />
        <div
          className="brotes-scroll"
          ref={scrollRef}
          onScroll={(e) => {
            const arriba = e.currentTarget.scrollTop > 6;
            if (arriba !== scrolled) setScrolled(arriba);
          }}
        >
        {authEstado === "prueba" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "14px 16px 0", padding: "10px 12px 10px 14px", background: C.card, borderRadius: 16 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.ink, margin: 0, lineHeight: 1.35 }}>
              <strong>Prueba gratis:</strong> escanea 1 planta sin cuenta
            </p>
            <button
              onClick={() => setAuthEstado("sin-cuenta")}
              style={{ flexShrink: 0, background: "none", border: "1px solid " + C.cardLine, borderRadius: 999, padding: "8px 12px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12.5, color: C.green, cursor: "pointer" }}
            >
              Iniciar sesión
            </button>
          </div>
        )}
        {/* ---------------- CAMERA ---------------- */}
        {screen === "camera" && (
          <div style={{ flex: "1 0 auto", display: "flex", flexDirection: "column", background: C.dark, margin: 16, borderRadius: 26, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 4px" }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,239,221,0.5)", margin: 0 }}>
                {captureMode === "followup" ? "Seguimiento de planta" : "Nueva planta"}
              </p>
              <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 22, color: C.cream, margin: "3px 0 0", letterSpacing: "-0.01em" }}>
                {captureMode === "followup" ? "¿Cómo va hoy?" : "Enfoca tu planta"}
              </h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "rgba(245,239,221,0.65)", margin: "8px 0 0", lineHeight: 1.4 }}>
                💡 Con luz de día y una sola planta en el encuadre, el análisis sale más preciso.
              </p>
              {captureMode !== "followup" && (
                <div style={{ marginTop: 12 }}>
                  <input
                    value={plantHint}
                    onChange={(e) => setPlantHint(e.target.value)}
                    placeholder="¿Ya sabes qué planta es? (opcional)"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "rgba(245,239,221,0.1)",
                      border: "1px solid rgba(245,239,221,0.25)",
                      borderRadius: 12,
                      padding: "11px 14px",
                      color: C.cream,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 14,
                    }}
                  />
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(245,239,221,0.5)", margin: "6px 0 0", lineHeight: 1.35 }}>
                    Si tienes una idea, escríbela — le sirve de referencia a la IA. Si no estás seguro, déjalo en blanco.
                  </p>

                  <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11.5, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(245,239,221,0.5)", margin: "14px 0 8px" }}>
                    ¿En qué fase está? (opcional)
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {FASES_PLANTA.map((f) => {
                      const activa = plantFase === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setPlantFase(activa ? "" : f.key)}
                          style={{
                            border: "1px solid " + (activa ? C.gold : "rgba(245,239,221,0.25)"),
                            background: activa ? C.gold : "rgba(245,239,221,0.08)",
                            color: activa ? C.dark : C.cream,
                            borderRadius: 999,
                            padding: "7px 14px",
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            fontSize: 12.5,
                            cursor: "pointer",
                          }}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
              <button
                onClick={() => galleryRef.current?.click()}
                aria-label="Elegir foto de la galería"
                style={{ background: "none", border: "none", color: C.cream, cursor: "pointer", minWidth: 48, minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Icon.Gallery />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ width: 66, height: 66, borderRadius: "50%", border: "4px solid " + C.cream, background: "transparent", cursor: "pointer" }}
                aria-label="Tomar foto"
              />
              <div style={{ width: 48 }} />
            </div>
          </div>
        )}

        {/* ---------------- FOTOS (revisión antes de analizar) ---------------- */}
        {screen === "fotos" && photoUrls.length > 0 && (
          <div style={{ flex: "1 0 auto", display: "flex", flexDirection: "column", alignItems: "center", background: C.dark, margin: 16, borderRadius: 26, padding: "22px 20px", overflow: "hidden" }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 19, color: C.cream, margin: "0 0 4px", textAlign: "center", letterSpacing: "-0.01em" }}>
              Tus fotos ({photoUrls.length}/3)
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "rgba(245,239,221,0.65)", margin: "0 0 18px", textAlign: "center" }}>
              Agregar más ángulos (hoja de cerca, planta completa, tallo) ayuda a identificarla mejor
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", width: "100%", maxWidth: 280 }}>
              {photoUrls.map((u, i) => (
                <div key={i} style={{ position: "relative", width: 84, height: 84 }}>
                  <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
                  <button
                    onClick={() => removePhoto(i)}
                    aria-label="Quitar foto"
                    style={{ position: "absolute", top: -8, right: -8, background: C.cream, border: "none", borderRadius: "50%", width: 28, height: 28, color: C.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Icon.X />
                  </button>
                  {i === 0 && (
                    <span style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(34,28,19,0.6)", color: C.cream, fontSize: 12, padding: "2px 6px", borderRadius: 6, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
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

            <div style={{ width: "100%", maxWidth: 280, marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
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
          <div style={{ padding: "20px 16px 6px", flex: 1 }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", color: C.inkSoft, margin: "0 4px 12px" }}>
              Diario de tus plantas
            </p>
            <PlantCard
              // Ya guardada, se usa la planta del jardín (con su historial), así
              // se puede mostrar el próximo riego y la racha.
              data={garden.find((p) => p.id === savedPlantId) || result}
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
                        onClick={() => saveAnalysis(result, imageUrl, capturedFile, { modo: captureMode, plantaId: followupPlantId })}
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
                  {isSaved && !isSaving && authEstado === "prueba" && (
                    <div style={{ marginTop: 14, background: C.green, borderRadius: 18, padding: "16px 16px", color: "#fff" }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 16, margin: 0 }}>¿Te gustó? Guarda tu planta</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, margin: "4px 0 12px", opacity: 0.9, lineHeight: 1.4 }}>
                        Crea tu cuenta gratis para recibir recordatorios de riego, seguir su evolución y escanear todas las plantas que quieras.
                      </p>
                      <button
                        onClick={pedirCuenta}
                        style={{ width: "100%", padding: "13px 0", borderRadius: 999, border: "none", background: C.cream, color: C.green, fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer" }}
                      >
                        Crear mi cuenta gratis
                      </button>
                    </div>
                  )}
                  {isSaved && !isSaving && authEstado !== "prueba" && (
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
            <button
              onClick={() => (authEstado === "prueba" && isSaved ? pedirCuenta() : openCamera(captureMode, followupPlantId))}
              style={{ background: "transparent", border: "none", color: C.inkSoft, fontSize: 13, cursor: "pointer", padding: "14px 4px", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}
            >
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
                    fontFamily: "'Pacifico', cursive",
                    fontWeight: 400,
                    fontSize: 32,
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
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: C.tileBg,
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: C.ink,
                        fontSize: 15,
                      }}
                    >
                      🔔
                    </button>
                  )}
                  {notifStatus === "subscribed" && (
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: C.green }}>🔔</span>
                  )}
                  <button
                    onClick={() => setScreen("cuenta")}
                    style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 9, margin: -5, opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "center" }}
                    aria-label="Mi cuenta"
                  >
                    <Icon.User style={{ width: 19, height: 19 }} />
                  </button>
                  <button
                    onClick={() => setScreen("sugerencias")}
                    style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 9, margin: -5, opacity: 0.7, display: "flex", alignItems: "center", justifyContent: "center" }}
                    aria-label="Enviar sugerencia"
                  >
                    <Icon.Info style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              </div>
              {notifError && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.red, margin: "8px 0 0" }}>{notifError}</p>
              )}

              <div style={{ display: "flex", gap: 12, overflowX: "auto", marginTop: 20, padding: "4px 2px 8px", alignItems: "stretch" }}>
                {garden.length > 0 && (() => {
                  const total = garden.length;
                  const saludables = garden.filter((p) => p.estado_general === "saludable").length;
                  const pctSaludable = Math.round((saludables / total) * 100);
                  const necesitanAgua = garden.filter((p) => getWateringStatus(p)?.urgent).length;
                  const pctRegada = Math.round(((total - necesitanAgua) / total) * 100);
                  const ringColor = pctSaludable >= 80 ? C.green : pctSaludable >= 50 ? C.amber : C.red;
                  const subtitulo =
                    necesitanAgua === 0
                      ? "todo está en orden 🌿"
                      : necesitanAgua === 1
                      ? "una planta necesita agua"
                      : `${necesitanAgua} plantas necesitan agua`;
                  const R = 30;
                  const CIRC = 2 * Math.PI * R;

                  return (
                    <div
                      onClick={() => setOrdenJardin("salud")}
                      style={{
                        flex: "1 1 0",
                        minWidth: 168,
                        background: C.card,
                        borderRadius: 22,
                        padding: "18px 18px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 10px 28px -14px rgba(0,0,0,0.18)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 19, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
                        Tu jardín
                      </p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.inkSoft, margin: "2px 0 14px", lineHeight: 1.3 }}>
                        {subtitulo}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 30, color: C.ink, margin: 0, letterSpacing: "-0.02em", lineHeight: 1 }}>
                            {total}
                          </p>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.inkSoft, margin: "1px 0 10px" }}>
                            {total === 1 ? "planta" : "plantas"}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                            <Icon.Leaf style={{ color: C.green, width: 13, height: 13, flexShrink: 0 }} />
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.amber, overflow: "hidden" }}>
                              <div style={{ width: `${pctSaludable}%`, height: "100%", background: C.green, borderRadius: 3 }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Icon.Droplet style={{ color: C.blue, width: 12, height: 12, flexShrink: 0 }} />
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.red, overflow: "hidden" }}>
                              <div style={{ width: `${pctRegada}%`, height: "100%", background: C.blue, borderRadius: 3 }} />
                            </div>
                          </div>
                        </div>
                        <svg width="76" height="76" viewBox="0 0 76 76" style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
                          <circle cx="38" cy="38" r={R} fill="none" stroke={C.cardLine} strokeWidth="7" />
                          <circle
                            cx="38"
                            cy="38"
                            r={R}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray={CIRC}
                            strokeDashoffset={CIRC * (1 - pctSaludable / 100)}
                          />
                          <text
                            x="38"
                            y="38"
                            textAnchor="middle"
                            dominantBaseline="central"
                            transform="rotate(90 38 38)"
                            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 17 }}
                            fill={C.ink}
                          >
                            {pctSaludable}%
                          </text>
                        </svg>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const pendientes = TIPS.filter((t) => !viewedTips.includes(t.id)).length;
                  const primerPendiente = TIPS.findIndex((t) => !viewedTips.includes(t.id));
                  const stage = getGardenStage(garden);
                  return (
                    <button
                      onClick={() => openTip(primerPendiente >= 0 ? primerPendiente : 0)}
                      style={{
                        flex: "1 1 0",
                        minWidth: 92,
                        position: "relative",
                        background: C.card,
                        border: "3px solid " + (pendientes > 0 ? C.wood : C.cardLine),
                        borderRadius: 20,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "10px 8px",
                      }}
                    >
                      {pendientes > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            background: C.red,
                            color: "#fff",
                            borderRadius: "50%",
                            minWidth: 20,
                            height: 20,
                            padding: "0 4px",
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {pendientes}
                        </span>
                      )}
                      <img
                        src={stage.img}
                        alt={stage.label}
                        className="brotes-tip-img"
                        style={{ width: "100%", maxWidth: 130, height: "auto", aspectRatio: "1 / 1", objectFit: "contain" }}
                      />
                    </button>
                  );
                })()}
              </div>
            </div>
            <div style={{ flex: 1, padding: "6px 16px 20px" }}>
              {loadingGarden ? (
                <p style={{ textAlign: "center", padding: "60px 0", fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.inkSoft }}>
                  Cargando tu jardín...
                </p>
              ) : gardenError ? (
                <div style={{ textAlign: "center", padding: "50px 20px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, color: C.red, margin: 0, lineHeight: 1.4 }}>{gardenError}</p>
                  <button
                    onClick={reintentarCarga}
                    style={{ marginTop: 16, background: C.green, color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                  >
                    Reintentar
                  </button>
                </div>
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
                    <div key={p.id} className="brotes-reveal" onClick={() => setSelectedPlant(p.id)} style={{ cursor: "pointer", position: "relative" }}>
                      <button
                        aria-label={`Borrar ${p.nombre_comun || "planta"}`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`¿Borrar "${p.nombre_comun || "esta planta"}" y todo su historial? No se puede deshacer.`)) return;
                          const antes = garden;
                          setGarden((prev) => prev.filter((x) => x.id !== p.id));
                          const { error } = await supabase.from("plantas").delete().eq("id", p.id);
                          if (error) {
                            console.error("Error borrando planta:", error);
                            setGarden(antes); // la regresa si no se pudo borrar
                            window.alert("No pudimos borrar la planta. Revisa tu conexión e intenta de nuevo.");
                          }
                        }}
                        // Botón de 40px (fácil de tocar) con un círculo chico en la esquina
                        style={{ position: "absolute", top: -12, right: -12, zIndex: 2, background: "transparent", border: "none", width: 40, height: 40, padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#6b6047", border: "2px solid " + C.card, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                          <Icon.X style={{ width: 13, height: 13 }} />
                        </span>
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
          <div style={{ padding: "18px 16px 10px", flex: 1 }}>
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

            <div style={{ marginTop: 28 }}>
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
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.inkSoft, margin: "2px 0 8px" }}>
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
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.inkSoft, margin: "4px 0 0" }}>{h.date}</p>
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
                      <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.ink, margin: "6px 0 0" }}>Antes</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.inkSoft, margin: "2px 0 0" }}>{antes.date}</p>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <img src={despues.imageUrl} alt="Después" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 10 }} />
                      <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, color: C.ink, margin: "6px 0 0" }}>Después</p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.inkSoft, margin: "2px 0 0" }}>{despues.date}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button
              onClick={() => openCamera("followup", activePlant.id)}
              style={{ marginTop: 22, width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: C.pine, color: C.cream, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
            >
              Tomar foto de seguimiento
            </button>
          </div>
        )}

        {/* ---------------- BUZÓN DE SUGERENCIAS ---------------- */}
        {screen === "cuenta" && (
          <div style={{ padding: "18px 16px 20px", flex: 1 }}>
            <button
              onClick={() => setScreen("jardin")}
              style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: "8px 4px", margin: "0 0 6px -4px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 4 }}
            >
              <Icon.Back /> Mi jardín
            </button>
            <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.01em", color: C.ink, margin: "0 0 16px" }}>Mi cuenta</h1>
            <div style={{ background: C.card, borderRadius: 20, padding: "18px 18px" }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: C.inkSoft, margin: "0 0 4px" }}>Correo</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15.5, color: C.ink, margin: 0, wordBreak: "break-all" }}>{usuarioCorreo}</p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.inkSoft, margin: "14px 0 0", lineHeight: 1.45 }}>
                {garden.length === 1 ? "1 planta" : `${garden.length} plantas`} en tu jardín
                {misReservaciones.length > 0 ? ` · ${misReservaciones.length} ${misReservaciones.length === 1 ? "reservación" : "reservaciones"}` : ""}
              </p>
              <button
                onClick={cerrarSesion}
                style={{ marginTop: 18, width: "100%", padding: "13px 0", borderRadius: 14, border: "1px solid " + C.cardLine, background: "transparent", color: C.red, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {screen === "sugerencias" && (
          <div style={{ padding: "18px 16px 20px", flex: 1 }}>
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

        {/* ---------------- COMUNIDAD ---------------- */}
        {screen === "comunidad" && (
          <div style={{ padding: "18px 16px 10px", flex: 1 }}>
            <h1
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: "-0.01em",
                color: C.ink,
                margin: "0 0 4px",
              }}
            >
              Comunidad
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.inkSoft, margin: "0 0 16px" }}>
              Viveros y tiendas de plantas cerca de ti.
            </p>

            {VIVEROS.map((viv) => {
              const datosFoto = fotosViveros[viv.placeId];
              return (
                <a
                  key={viv.placeId}
                  className="brotes-reveal"
                  href={mapsUrl(viv)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    background: C.card,
                    borderRadius: 20,
                    overflow: "hidden",
                    marginBottom: 14,
                    textDecoration: "none",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 10px 24px -16px rgba(0,0,0,0.25)",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      height: 150,
                      background: "radial-gradient(circle at 50% 35%, #4f7a4c 0%, " + C.greenDark + " 80%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {datosFoto?.foto ? (
                      <img
                        src={datosFoto.foto}
                        alt={viv.nombre}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <img
                        src="/stages/s6.png"
                        alt=""
                        style={{ width: 84, height: 84, objectFit: "contain", opacity: datosFoto === undefined ? 0.35 : 0.85 }}
                      />
                    )}
                    <span
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        background: "rgba(245,239,221,0.92)",
                        color: C.ink,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: 11.5,
                        padding: "4px 9px",
                        borderRadius: 999,
                      }}
                    >
                      {viv.zona}
                    </span>
                    {datosFoto?.foto && (
                      <span
                        style={{
                          position: "absolute",
                          right: 8,
                          bottom: 6,
                          color: "rgba(255,255,255,0.9)",
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 10,
                          textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                        }}
                      >
                        {datosFoto.autor ? `Foto: ${datosFoto.autor} · ` : ""}Google Maps
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px 14px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink, margin: 0 }}>
                        {viv.nombre}
                      </p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.inkSoft, margin: "2px 0 0" }}>
                        {viv.direccion}
                      </p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.wood, fontWeight: 700, margin: "4px 0 0" }}>
                        ★ {viv.rating}
                      </p>
                    </div>
                    <Icon.ExternalLink style={{ color: C.inkSoft, flexShrink: 0 }} />
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* ---------------- TIENDA (reservar mantenimiento) ---------------- */}
        {screen === "tienda" && (
          <div style={{ padding: "18px 16px 10px", flex: 1 }}>
            <h1
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: "-0.01em",
                color: C.ink,
                margin: "0 0 4px",
              }}
            >
              Tienda
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.inkSoft, margin: "0 0 16px" }}>
              Reserva una visita de mantenimiento para tus plantas.
            </p>

            {pagoStatus === "exito" && (
              <div style={{ background: "rgba(63,93,62,0.12)", borderRadius: 14, padding: "12px 14px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Icon.Check style={{ color: C.green, flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.green, margin: 0, lineHeight: 1.4 }}>
                  Listo. Si pagaste con tarjeta, tu visita ya quedó confirmada. Si elegiste OXXO, se confirma en cuanto pagues el voucher.
                </p>
              </div>
            )}
            {pagoStatus === "cancelado" && (
              <div style={{ background: "rgba(156,59,46,0.1)", borderRadius: 14, padding: "12px 14px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Icon.Warning style={{ color: C.red, flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.red, margin: 0, lineHeight: 1.4 }}>
                  Se canceló el pago. Tu reservación quedó guardada — puedes intentar pagar de nuevo cuando quieras.
                </p>
              </div>
            )}

            {(() => {
              const tamanoElegido = tamanoPorClave(reservaTamano);
              const atras = (paso) => (
                <button
                  onClick={() => {
                    setTiendaPaso(paso);
                    setReservaError(null);
                  }}
                  style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: "6px 0", margin: "0 0 6px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Icon.Back /> Atrás
                </button>
              );
              const botonPrincipal = (texto, onClick, disabled) => (
                <button
                  onClick={onClick}
                  disabled={disabled}
                  style={{
                    marginTop: 16,
                    width: "100%",
                    padding: "14px 0",
                    borderRadius: 14,
                    border: "none",
                    background: disabled ? C.cardLine : C.green,
                    color: disabled ? C.inkSoft : "#fff",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: 14.5,
                    cursor: disabled ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Icon.Card style={{ width: 15, height: 15 }} />
                  {texto}
                </button>
              );
              return (
                <div style={{ background: C.card, borderRadius: 20, padding: "18px 16px", marginBottom: 20 }}>
                  {tiendaPaso !== "inicio" && atras(tiendaPaso === "datos" ? "tamano" : "inicio")}
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 16, color: C.ink, margin: 0 }}>
                      Mantenimiento de plantas
                    </p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 15, color: C.green, margin: 0, whiteSpace: "nowrap" }}>
                      {tiendaPaso === "datos" && tamanoElegido
                        ? `${formatoPrecio(tamanoElegido.precio)} MXN`
                        : `Desde ${formatoPrecio(PRECIO_DESDE_CENTAVOS)}`}
                    </p>
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.inkSoft, margin: "0 0 4px", lineHeight: 1.4 }}>
                    {tiendaPaso === "datos" && tamanoElegido
                      ? `Jardín ${tamanoElegido.nombre.toLowerCase()} · ${tamanoElegido.incluye[0]}`
                      : "Revisión, riego, poda ligera y consejos personalizados para tus plantas, en tu casa."}
                  </p>

                  {/* ---- Paso 1 ---- */}
                  {tiendaPaso === "inicio" && (
                    <>
                      {botonPrincipal("Reservar", () => setTiendaPaso("tamano"), false)}
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.inkSoft, textAlign: "center", margin: "8px 0 0" }}>
                        Puedes pagar con tarjeta o en efectivo en OXXO.
                      </p>
                    </>
                  )}

                  {/* ---- Paso 2: tamaño del jardín ---- */}
                  {tiendaPaso === "tamano" && (
                    <>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14.5, color: C.ink, margin: "14px 0 10px" }}>
                        ¿Cuál es el tamaño de tu jardín?
                      </p>
                      <div className="brotes-tamanos" role="radiogroup" aria-label="Tamaño del jardín">
                        {TAMANOS.map((t) => {
                          const activo = reservaTamano === t.key;
                          return (
                            <button
                              key={t.key}
                              role="radio"
                              aria-checked={activo}
                              aria-label={`Jardín ${t.nombre.toLowerCase()}, ${formatoPrecio(t.precio)}: ${t.incluye.join(", ")}`}
                              onClick={() => {
                                setReservaTamano(t.key);
                                setReservaError(null);
                              }}
                              style={{
                                textAlign: "left",
                                background: activo ? "#fff" : C.tileBg,
                                border: "2px solid " + (activo ? C.green : "transparent"),
                                borderRadius: 16,
                                padding: "12px 12px 14px",
                                cursor: "pointer",
                                boxShadow: activo ? "0 8px 20px -14px rgba(40,64,42,0.6)" : "none",
                                transition: "border-color .15s, background .15s",
                              }}
                            >
                              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 15, color: C.ink }}>{t.nombre}</span>
                                <span
                                  aria-hidden="true"
                                  style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid " + (activo ? C.green : C.cardLine), background: activo ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                >
                                  {activo && <Icon.Check style={{ width: 10, height: 10, color: "#fff" }} />}
                                </span>
                              </span>
                              <span style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 18, color: C.green, margin: "2px 0 8px" }}>
                                {formatoPrecio(t.precio)}
                              </span>
                              {t.incluye.map((linea) => (
                                <span key={linea} style={{ display: "flex", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.inkSoft, lineHeight: 1.35, marginTop: 4 }}>
                                  <span aria-hidden="true" style={{ color: C.green }}>•</span>
                                  {linea}
                                </span>
                              ))}
                            </button>
                          );
                        })}
                      </div>
                      {reservaError && (
                        <p style={{ color: C.red, fontFamily: "'Inter', sans-serif", fontSize: 12.5, margin: "10px 0 0" }}>{reservaError}</p>
                      )}
                      {botonPrincipal(
                        tamanoElegido ? `Continuar · ${formatoPrecio(tamanoElegido.precio)}` : "Elige un tamaño",
                        () => setTiendaPaso("datos"),
                        !tamanoElegido
                      )}
                    </>
                  )}

                  {/* ---- Paso 3: datos de la visita ---- */}
                  {tiendaPaso === "datos" && (
                    <>
                      <div style={{ height: 12 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <input
                          value={reservaNombre}
                          onChange={(e) => setReservaNombre(e.target.value)}
                          placeholder="Tu nombre"
                          style={{ border: "1px solid " + C.cardLine, borderRadius: 10, padding: "10px 12px", fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink, background: C.tileBg }}
                        />
                        <input
                          value={reservaTelefono}
                          onChange={(e) => setReservaTelefono(e.target.value)}
                          placeholder="Teléfono (WhatsApp)"
                          type="tel"
                          style={{ border: "1px solid " + C.cardLine, borderRadius: 10, padding: "10px 12px", fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink, background: C.tileBg }}
                        />
                        <input
                          value={reservaCorreo}
                          onChange={(e) => setReservaCorreo(e.target.value)}
                          placeholder="Correo (para tu recibo de pago)"
                          type="email"
                          style={{ border: "1px solid " + C.cardLine, borderRadius: 10, padding: "10px 12px", fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink, background: C.tileBg }}
                        />
                        <input
                          value={reservaDireccion}
                          onChange={(e) => setReservaDireccion(e.target.value)}
                          placeholder="Dirección de la visita (calle, número, colonia)"
                          style={{ border: "1px solid " + C.cardLine, borderRadius: 10, padding: "10px 12px", fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink, background: C.tileBg }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 700, color: C.inkSoft, paddingLeft: 2 }}>Fecha</span>
                            <input
                              value={reservaFecha}
                              onChange={(e) => handleReservaFechaChange(e.target.value)}
                              type="date"
                              min={diaCDMX()}
                              style={{ width: "100%", minWidth: 0, boxSizing: "border-box", minHeight: 44, border: "1px solid " + C.cardLine, borderRadius: 10, padding: "10px 12px", fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.ink, background: C.tileBg }}
                            />
                          </label>
                          <label style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 700, color: C.inkSoft, paddingLeft: 2 }}>Hora</span>
                          <select
                            value={reservaHora}
                            onChange={(e) => setReservaHora(e.target.value)}
                            style={{ width: "100%", minWidth: 0, boxSizing: "border-box", minHeight: 44, border: "1px solid " + C.cardLine, borderRadius: 10, padding: "10px 12px", fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.ink, background: C.tileBg }}
                          >
                            {HORARIOS_DISPONIBLES.map((h) => {
                              const ocupada = horasOcupadas.includes(h);
                              return (
                                <option key={h} value={h} disabled={ocupada}>
                                  {h}{ocupada ? " (ocupado)" : ""}
                                </option>
                              );
                            })}
                          </select>
                          </label>
                        </div>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: reservaFechaError || diaLleno ? C.red : C.inkSoft, margin: "-4px 0 0" }}>
                          {reservaFechaError ||
                            (diaLleno
                              ? "Ese día ya está lleno. Elige otro sábado o domingo."
                              : "El mantenimiento solo se agenda en sábado o domingo.")}
                        </p>
                        <textarea
                          value={reservaNotas}
                          onChange={(e) => setReservaNotas(e.target.value)}
                          placeholder="Notas para la visita (opcional)"
                          rows={2}
                          style={{ border: "1px solid " + C.cardLine, borderRadius: 10, padding: 10, fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.ink, resize: "none", boxSizing: "border-box", background: C.tileBg }}
                        />
                      </div>


                      {reservaError && (
                        <p style={{ color: C.red, fontFamily: "'Inter', sans-serif", fontSize: 12.5, margin: "10px 0 0" }}>{reservaError}</p>
                      )}
                      {botonPrincipal(
                        reservando ? "Preparando pago..." : `Reservar y pagar ${tamanoElegido ? formatoPrecio(tamanoElegido.precio) : ""}`,
                        reservarYPagar,
                        reservando
                      )}
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.inkSoft, textAlign: "center", margin: "8px 0 0" }}>
                        Puedes pagar con tarjeta o en efectivo en OXXO.
                      </p>
                    </>
                  )}
                </div>
              );
            })()}

            <Tag>Tus reservaciones</Tag>
            <div style={{ marginTop: 10 }}>
              {cargandoReservaciones ? (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "16px 0" }}>
                  Cargando...
                </p>
              ) : misReservaciones.length === 0 ? (
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.inkSoft, textAlign: "center", padding: "16px 0" }}>
                  Aún no tienes reservaciones.
                </p>
              ) : (
                misReservaciones.map((r) => {
                  const estadoInfo = {
                    pagado: { label: "Pagado", color: C.green },
                    pendiente_pago: { label: "Pendiente de pago", color: AMBAR_TEXTO },
                    conflicto: { label: "Te contactaremos", color: C.red },
                    cancelado: { label: "Cancelado", color: C.red },
                    completado: { label: "Completada", color: C.blue },
                  }[r.estado] || { label: r.estado, color: C.inkSoft };
                  return (
                    <div
                      key={r.id}
                      className="brotes-reveal"
                      onClick={() => setReservaDetalle(r)}
                      role="button"
                      tabIndex={0}
                      style={{ background: C.card, borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer" }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13.5, color: C.ink, margin: 0 }}>
                          {new Date(r.fecha + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })} · {r.hora}
                        </p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.inkSoft, margin: "2px 0 0" }}>
                          {tamanoPorClave(r.tamano) ? `Jardín ${tamanoPorClave(r.tamano).nombre.toLowerCase()} · ` : ""}
                          {formatoPrecio(r.precio_centavos)} MXN
                        </p>
                        {r.direccion && (
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C.inkSoft, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.direccion}
                          </p>
                        )}
                      </div>
                      <span
                        style={{
                          flexShrink: 0,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 700,
                          fontSize: 11,
                          color: estadoInfo.color,
                          background: `${estadoInfo.color}1F`,
                          padding: "5px 10px",
                          borderRadius: 10,
                        }}
                      >
                        {estadoInfo.label}
                      </span>
                      <Icon.ChevronRight style={{ color: C.inkSoft, flexShrink: 0 }} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        </div>

        {ticket && authEstado === "lista" && <TicketPago datos={ticket} onCerrar={() => setTicket(null)} />}

        {reservaDetalle && (
          <div
            onClick={() => setReservaDetalle(null)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(20,16,8,0.55)",
              zIndex: 60,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            {(() => {
              const r = reservaDetalle;
              const estadoInfo = {
                pagado: { label: "Pagado", color: C.green, detalle: "Tu visita quedó confirmada." },
                pendiente_pago: { label: "Pendiente de pago", color: AMBAR_TEXTO, detalle: "Todavía no se ha completado el pago de esta reservación." },
                conflicto: { label: "Te contactaremos", color: C.red, detalle: "Recibimos tu pago, pero ese horario se ocupó justo antes. Te escribiremos por WhatsApp para cambiar la hora o devolverte tu dinero." },
                cancelado: { label: "Cancelado", color: C.red, detalle: "Esta reservación fue cancelada." },
                completado: { label: "Completada", color: C.blue, detalle: "La visita ya se realizó. ¡Gracias por confiar en Ámbitat!" },
              }[r.estado] || { label: r.estado, color: C.inkSoft, detalle: "" };
              return (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ background: C.cream, borderRadius: "24px 24px 0 0", padding: "10px 20px 28px", width: "100%", maxWidth: 480, maxHeight: "85%", overflowY: "auto", boxSizing: "border-box" }}
                >
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: C.cardLine, margin: "0 auto 16px" }} />
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                    <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 19, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
                      Mantenimiento de plantas
                    </h2>
                    <button onClick={() => setReservaDetalle(null)} aria-label="Cerrar" style={{ background: "none", border: "none", color: C.inkSoft, cursor: "pointer", padding: 6, margin: -6 }}>
                      <Icon.X style={{ width: 20, height: 20 }} />
                    </button>
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 700,
                      fontSize: 11.5,
                      color: estadoInfo.color,
                      background: `${estadoInfo.color}1F`,
                      padding: "5px 10px",
                      borderRadius: 10,
                      marginBottom: 14,
                    }}
                  >
                    {estadoInfo.label}
                  </span>
                  {estadoInfo.detalle && (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.inkSoft, margin: "0 0 16px", lineHeight: 1.4 }}>
                      {estadoInfo.detalle}
                    </p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: C.inkSoft, margin: "0 0 2px" }}>
                        Fecha y hora
                      </p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink, margin: 0 }}>
                        {new Date(r.fecha + "T00:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })} · {r.hora}
                      </p>
                    </div>
                    {r.direccion && (
                      <div>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: C.inkSoft, margin: "0 0 2px" }}>
                          Dirección
                        </p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink, margin: 0 }}>{r.direccion}</p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: C.inkSoft, margin: "0 0 2px" }}>
                        Contacto
                      </p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink, margin: 0 }}>{r.nombre_contacto} · {r.telefono}</p>
                    </div>
                    {r.notas && (
                      <div>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: C.inkSoft, margin: "0 0 2px" }}>
                          Notas
                        </p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink, margin: 0, lineHeight: 1.4 }}>{r.notas}</p>
                      </div>
                    )}
                    <div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: C.inkSoft, margin: "0 0 2px" }}>
                        Precio
                      </p>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.ink, margin: 0 }}>
                        {formatoPrecio(r.precio_centavos)} MXN
                        {tamanoPorClave(r.tamano) ? ` · Jardín ${tamanoPorClave(r.tamano).nombre.toLowerCase()}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
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
                {TIPS[activeTip].tipo === "dato" ? "¿Sabías que...?" : "Tip de cuidado"}
              </span>
              <button onClick={() => setActiveTip(null)} aria-label="Cerrar" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 10, margin: -10 }}>
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

        {authEstado === "lista" && (
        <BottomNav
          screen={screen}
          setScreen={(s) => {
            if (s !== screen) analisisIdRef.current++; // salir de la pantalla cancela el análisis en curso
            setSelectedPlant(null);
            setEditingName(false);
            setCompareMode(false);
            setCompareIndices([]);
            if (s === "camera") openCamera("new");
            else setScreen(s);
          }}
          gardenCount={garden.length}
        />
        )}
        </>
        )}
      </div>
    </div>
  );
}
