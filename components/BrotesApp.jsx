import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// ---- Design tokens (paleta cálida: madera + oro + pino) ----
const C = {
  gold: "#EAC468",       // (heredado, ya no se usa como lienzo principal)
  goldEdge: "#DDB556",
  wood: "#8B5A2E",        // texto/acentos "madera"
  woodDark: "#6E4522",
  pine: "#3F5D3E",        // acento verde pino (texto, íconos activos)
  pineDark: "#28402A",
  cream: "#F5EFDD",
  creamLine: "#e2d7b8",
  ink: "#3a3527",         // texto principal sobre el lienzo neumórfico
  amber: "#C98A2E",       // estado "necesita atención"
  rust: "#B0452F",        // estado crítico
  coral: "#c9714f",
  mossText: "#6b8257",

  // ---- Neumorfismo: un solo tono de "lienzo" por modo, todo se talla con sombras ----
  base: "#E7E0C8",            // lienzo claro (pantallas normales)
  baseDark: "#2B382E",        // lienzo oscuro (cámara / análisis / resultado)
  shadowDark: "#c3b78d",      // sombra oscura sobre lienzo claro
  shadowLight: "#ffffff",     // sombra clara sobre lienzo claro
  shadowDarkOnDark: "#1c261f",// sombra oscura sobre lienzo oscuro
  shadowLightOnDark: "#3a4c3e", // sombra clara sobre lienzo oscuro
};

// Sombra doble "elevada" (el elemento parece sobresalir del lienzo)
function raised(dark, size = 8) {
  const d = dark ? C.shadowDarkOnDark : C.shadowDark;
  const l = dark ? C.shadowLightOnDark : C.shadowLight;
  return `${size}px ${size}px ${size * 2}px ${d}, -${size}px -${size}px ${size * 2}px ${l}`;
}
// Sombra doble "hundida" (el elemento parece presionado hacia adentro del lienzo)
function pressed(dark, size = 6) {
  const d = dark ? C.shadowDarkOnDark : C.shadowDark;
  const l = dark ? C.shadowLightOnDark : C.shadowLight;
  return `inset ${size}px ${size}px ${size * 1.6}px ${d}, inset -${size}px -${size}px ${size * 1.6}px ${l}`;
}

const FONTS_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.brotes-shell {
  width: 100%;
  max-width: 420px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  background: #E7E0C8;
}
.brotes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
    box-shadow: 0 30px 70px -25px rgba(40, 30, 10, 0.45);
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

  if (remaining <= 0) return { label: daysSince === plant.dias_entre_riegos ? "Riega hoy" : "Necesita agua", urgent: true };
  if (remaining === 1) return { label: "Riega mañana", urgent: false };
  return { label: `Riega en ${remaining} días`, urgent: false };
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
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: color || C.mossText,
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

// ---------- Tarjeta de planta: dos tonos (crema arriba / pino abajo) ----------
function PlantCard({ data, imageUrl, onSave, saved, footer, compact }) {
  const estado = ESTADO_STYLES[data.estado_general] || ESTADO_STYLES.regular;
  return (
    <div
      style={{
        borderRadius: 26,
        background: C.base,
        boxShadow: raised(false, compact ? 6 : 9),
        padding: compact ? "16px 14px 14px" : "22px 22px 20px",
      }}
    >
      <div style={{ display: "flex", gap: compact ? 10 : 16 }}>
        {imageUrl && (
          <div
            style={{
              width: compact ? 56 : 78,
              height: compact ? 56 : 78,
              borderRadius: 14,
              padding: 4,
              flexShrink: 0,
              background: C.base,
              boxShadow: pressed(false, 4),
            }}
          >
            <img
              src={imageUrl}
              alt={data.nombre_comun}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, display: "block" }}
            />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          {!compact && <Tag>{data.confianza === "alta" ? "Identificación confiable" : "Identificación aproximada"}</Tag>}
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: compact ? 16 : 24,
              color: C.ink,
              margin: "2px 0 0",
              lineHeight: 1.1,
            }}
          >
            {data.nombre_comun}
          </h2>
          {!compact && (
            <p style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 14, color: "#6b6047", margin: "2px 0 0" }}>
              {data.nombre_cientifico}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            borderRadius: 20,
            background: C.base,
            boxShadow: pressed(false, 3),
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: estado.bg }} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: estado.bg }}>{estado.label}</span>
        </div>
        {(() => {
          const watering = getWateringStatus(data);
          if (!watering) return null;
          return (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 20,
                background: C.base,
                boxShadow: pressed(false, 3),
              }}
            >
              <span style={{ fontSize: 11 }}>💧</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 700, color: watering.urgent ? C.rust : "#6b6047" }}>
                {watering.label}
              </span>
            </div>
          );
        })()}
      </div>

      {!compact && (
        <>
          <div
            style={{
              marginTop: 18,
              borderRadius: 16,
              background: C.base,
              boxShadow: pressed(false, 5),
              padding: "14px 16px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <Tag>RIEGO</Tag>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.ink, margin: "3px 0 0" }}>{data.riego}</p>
            </div>
            <div>
              <Tag>LUZ</Tag>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.ink, margin: "3px 0 0" }}>{data.luz}</p>
            </div>
          </div>

          {data.problemas_detectados && data.problemas_detectados.length > 0 && (
            <div style={{ marginTop: 14, borderRadius: 16, background: C.base, boxShadow: pressed(false, 5), padding: "14px 16px" }}>
              <Tag color={C.rust}>Se detectó</Tag>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {data.problemas_detectados.map((p, i) => (
                  <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.rust, marginBottom: 3 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.consejos && data.consejos.length > 0 && (
            <div style={{ marginTop: 14, borderRadius: 16, background: C.base, boxShadow: pressed(false, 5), padding: "14px 16px" }}>
              <Tag>Consejos de cuidado</Tag>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {data.consejos.map((c, i) => (
                  <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.ink, marginBottom: 3 }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onSave && (
            <button
              onClick={onSave}
              disabled={saved}
              style={{
                marginTop: 18,
                width: "100%",
                padding: "12px 0",
                borderRadius: 14,
                border: "none",
                background: C.base,
                boxShadow: saved ? pressed(false, 5) : raised(false, 5),
                color: saved ? "#8a8368" : C.pine,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: saved ? "default" : "pointer",
              }}
            >
              {saved ? "Guardado ✓" : "Guardar"}
            </button>
          )}
          {footer}
        </>
      )}
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
};

// ---------- Nav inferior flotante ----------
function BottomNav({ screen, setScreen, gardenCount }) {
  const jardinActive = screen === "jardin";
  const cameraActive = screen === "camera" || screen === "analyzing" || screen === "result";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 10,
        margin: "0 16px 16px",
        padding: 10,
        borderRadius: 28,
        background: C.base,
        boxShadow: raised(false, 7),
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
          gap: 4,
          background: C.base,
          boxShadow: jardinActive ? pressed(false, 4) : "none",
          border: "none",
          borderRadius: 18,
          padding: "10px 0",
          cursor: "pointer",
          color: jardinActive ? C.pine : "#9a9074",
        }}
      >
        <Icon.Leaf />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12.5, color: jardinActive ? C.ink : "#9a9074" }}>
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
          gap: 4,
          background: C.base,
          boxShadow: cameraActive ? pressed(false, 4) : "none",
          border: "none",
          borderRadius: 18,
          padding: "10px 0",
          cursor: "pointer",
          color: cameraActive ? C.pine : "#9a9074",
        }}
      >
        <Icon.Camera />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12.5, color: cameraActive ? C.ink : "#9a9074" }}>
          Cámara
        </span>
      </button>
    </div>
  );
}

export default function BrotesApp() {
  const [screen, setScreen] = useState("jardin");
  const [selectedPlant, setSelectedPlant] = useState(null);

  // capture flow state
  const [captureMode, setCaptureMode] = useState("new"); // 'new' | 'followup'
  const [followupPlantId, setFollowupPlantId] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [garden, setGarden] = useState([]);
  const [userId, setUserId] = useState(null);
  const [notifStatus, setNotifStatus] = useState("checking"); // checking | unsupported | default | denied | subscribed
  const [loadingGarden, setLoadingGarden] = useState(true);
  const [capturedFile, setCapturedFile] = useState(null);
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
    setScreen("camera");
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setCapturedFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setScreen("analyzing");

    try {
      const b64 = await fileToBase64(file);
      const response = await fetch("/api/analizar-planta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, mediaType: file.type || "image/jpeg" }),
      });
      if (!response.ok) throw new Error("Error del servidor");
      const parsed = await response.json();
      setResult(parsed);
      setScreen("result");
    } catch (err) {
      console.error(err);
      setError("No pudimos analizar la foto. Intenta con otra imagen más clara.");
      setScreen("camera");
    }
  }

  async function handleSaveResult() {
    if (!result || !userId) return;
    setSaveError(null);

    let publicUrl = imageUrl;
    if (capturedFile) {
      const path = `${userId}/${Date.now()}-${capturedFile.name}`;
      const { error: uploadError } = await supabase.storage.from("plant-photos").upload(path, capturedFile);
      if (!uploadError) {
        const { data } = supabase.storage.from("plant-photos").getPublicUrl(path);
        publicUrl = data.publicUrl;
      } else {
        console.error("Error subiendo foto:", uploadError);
        setSaveError("No pudimos guardar la foto (revisa que exista el bucket 'plant-photos' en Supabase, marcado como público). Nada se guardó todavía — puedes intentar de nuevo.");
        return;
      }
    }

    const historyEntry = {
      date: new Date().toLocaleDateString("es-MX"),
      dateISO: new Date().toISOString(),
      imageUrl: publicUrl,
      estado_general: result.estado_general,
    };

    if (captureMode === "followup" && followupPlantId) {
      const plant = garden.find((p) => p.id === followupPlantId);
      const newHistory = [...(plant?.history || []), historyEntry];
      const { error } = await supabase
        .from("plantas")
        .update({
          nombre_comun: result.nombre_comun,
          nombre_cientifico: result.nombre_cientifico,
          confianza: result.confianza,
          estado_general: result.estado_general,
          riego: result.riego,
          dias_entre_riegos: result.dias_entre_riegos,
          luz: result.luz,
          problemas_detectados: result.problemas_detectados,
          consejos: result.consejos,
          image_url: publicUrl,
          historial: newHistory,
        })
        .eq("id", followupPlantId);
      if (!error) {
        setGarden((prev) => prev.map((p) => (p.id === followupPlantId ? { ...p, ...result, imageUrl: publicUrl, history: newHistory } : p)));
      } else {
        console.error("Error actualizando planta:", error);
      }
    } else {
      const newId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const { error } = await supabase.from("plantas").insert({
        id: newId,
        user_id: userId,
        nombre_comun: result.nombre_comun,
        nombre_cientifico: result.nombre_cientifico,
        confianza: result.confianza,
        estado_general: result.estado_general,
        riego: result.riego,
        dias_entre_riegos: result.dias_entre_riegos,
        luz: result.luz,
        problemas_detectados: result.problemas_detectados,
        consejos: result.consejos,
        image_url: publicUrl,
        historial: [historyEntry],
      });
      if (!error) {
        setGarden((prev) => [...prev, { ...result, id: newId, imageUrl: publicUrl, history: [historyEntry] }]);
      } else {
        console.error("Error guardando planta:", error);
      }
    }
    setImageUrl(publicUrl);
    setIsSaved(true);
  }

  const activePlant = garden.find((p) => p.id === selectedPlant);
  const isDarkScreen = screen === "camera" || screen === "analyzing" || screen === "result";

  return (
    <div style={{ minHeight: "100vh", background: C.base, display: "flex", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS_IMPORT}</style>
      <div className="brotes-shell">
        {/* ---------------- CAMERA ---------------- */}
        {screen === "camera" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.baseDark, margin: 16, borderRadius: 26, boxShadow: raised(true, 8) }}>
            <div style={{ padding: "18px 20px 4px" }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a9c19c", margin: 0 }}>
                {captureMode === "followup" ? "Seguimiento de planta" : "Nueva planta"}
              </p>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 21, color: C.cream, margin: "2px 0 0" }}>
                {captureMode === "followup" ? "¿Cómo va hoy?" : "Enfoca tu planta"}
              </h1>
              {error && <p style={{ color: "#e3a08c", fontSize: 12.5, marginTop: 8 }}>{error}</p>}
            </div>
            <div
              style={{
                flex: 1,
                margin: "14px 20px",
                borderRadius: 18,
                background: C.baseDark,
                boxShadow: pressed(true, 7),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 260,
              }}
            >
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                <path d="M4 8a2 2 0 012-2h2l1.5-2h5L16 6h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke={C.cream} strokeWidth="1.4" opacity="0.5" />
                <circle cx="12" cy="13" r="3.4" stroke={C.cream} strokeWidth="1.4" opacity="0.5" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 30px 26px" }}>
              <button onClick={() => galleryRef.current?.click()} style={{ background: "none", border: "none", color: C.cream, cursor: "pointer" }}>
                <Icon.Gallery />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  border: "none",
                  background: C.baseDark,
                  boxShadow: raised(true, 6),
                  cursor: "pointer",
                }}
                aria-label="Tomar foto"
              />
              <div style={{ width: 22 }} />
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
            <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          </div>
        )}

        {/* ---------------- ANALYZING ---------------- */}
        {screen === "analyzing" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, background: C.baseDark, margin: 16, borderRadius: 26, boxShadow: raised(true, 8) }}>
            {imageUrl && (
              <div style={{ padding: 5, borderRadius: 18, background: C.baseDark, boxShadow: pressed(true, 5) }}>
                <img src={imageUrl} alt="planta" style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 14, display: "block" }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.cream, animation: `pulse 1.1s ${i * 0.15}s infinite ease-in-out` }} />
              ))}
            </div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#a9c19c", letterSpacing: "0.05em" }}>Observando tu planta...</p>
            <style>{`@keyframes pulse { 0%,80%,100%{transform:scale(0.6); opacity:.4} 40%{transform:scale(1); opacity:1} }`}</style>
          </div>
        )}

        {/* ---------------- RESULT ---------------- */}
        {screen === "result" && result && (
          <div style={{ padding: "20px 16px 6px", flex: 1, overflowY: "auto" }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.woodDark, margin: "0 4px 12px" }}>
              Diario de tus plantas
            </p>
            <PlantCard
              data={result}
              imageUrl={imageUrl}
              saved={isSaved}
              onSave={handleSaveResult}
              footer={
                <>
                  {saveError && (
                    <p style={{ marginTop: 10, fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: C.rust, lineHeight: 1.4 }}>
                      {saveError}
                    </p>
                  )}
                  {isSaved && (
                    <button
                      onClick={() => {
                        if (captureMode === "followup") setSelectedPlant(followupPlantId);
                        setScreen("jardin");
                      }}
                      style={{
                        marginTop: 10,
                        width: "100%",
                        padding: "11px 0",
                        borderRadius: 14,
                        border: "none",
                        background: C.base,
                        boxShadow: raised(false, 4),
                        color: C.ink,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 600,
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
            <button onClick={() => openCamera(captureMode, followupPlantId)} style={{ background: "transparent", border: "none", color: C.woodDark, fontSize: 13, cursor: "pointer", padding: "14px 4px" }}>
              ← Analizar otra foto
            </button>
          </div>
        )}

        {/* ---------------- JARDIN (grid) ---------------- */}
        {screen === "jardin" && !activePlant && (
          <>
            <div style={{ padding: "22px 20px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
              <WordmarkBadge />
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: 26, color: C.ink, margin: 0, textAlign: "center" }}>
                Mi jardín
              </h1>
              <p style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 13.5, color: C.woodDark, margin: 0, textAlign: "center" }}>
                Cuida tus plantas, una foto a la vez.
              </p>
              {notifStatus === "default" && (
                <button
                  onClick={enableNotifications}
                  style={{
                    alignSelf: "center",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: C.base,
                    boxShadow: raised(false, 4),
                    border: "none",
                    borderRadius: 20,
                    padding: "8px 16px",
                    cursor: "pointer",
                    color: C.woodDark,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  🔔 Activar recordatorios de riego
                </button>
              )}
              {notifStatus === "subscribed" && (
                <p style={{ alignSelf: "center", fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.pine, margin: 0 }}>
                  🔔 Recordatorios activados
                </p>
              )}
              {notifStatus === "denied" && (
                <p style={{ alignSelf: "center", fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: C.woodDark, margin: 0, textAlign: "center", opacity: 0.8 }}>
                  Los permisos de notificación están bloqueados en tu navegador.
                </p>
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 16px 20px" }}>
              {loadingGarden ? (
                <p style={{ textAlign: "center", padding: "60px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: C.woodDark }}>
                  Cargando tu jardín...
                </p>
              ) : garden.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 20px" }}>
                  <p style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 16, color: C.woodDark }}>
                    Aún no tienes plantas guardadas.
                  </p>
                  <button
                    onClick={() => openCamera("new")}
                    style={{ marginTop: 14, background: C.base, boxShadow: raised(false, 5), color: C.pine, border: "none", borderRadius: 14, padding: "12px 22px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
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
                          background: C.base,
                          boxShadow: pressed(false, 5),
                          borderRadius: 16,
                          padding: "12px 16px",
                          marginBottom: 16,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>💧</span>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: C.rust, margin: 0 }}>
                          {urgentes === 1 ? "1 planta necesita agua hoy" : `${urgentes} plantas necesitan agua hoy`}
                        </p>
                      </div>
                    );
                  })()}
                  <div className="brotes-grid">
                  {garden.map((p) => (
                    <div key={p.id} onClick={() => setSelectedPlant(p.id)} style={{ cursor: "pointer", position: "relative" }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setGarden((prev) => prev.filter((x) => x.id !== p.id));
                          const { error } = await supabase.from("plantas").delete().eq("id", p.id);
                          if (error) console.error("Error borrando planta:", error);
                        }}
                        style={{ position: "absolute", top: 8, right: 8, zIndex: 2, background: C.base, boxShadow: raised(false, 3), border: "none", borderRadius: "50%", width: 24, height: 24, color: C.woodDark, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
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
            <button onClick={() => setSelectedPlant(null)} style={{ background: "none", border: "none", color: C.woodDark, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px" }}>
              <Icon.Back /> <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 700 }}>Mi jardín</span>
            </button>
            <PlantCard data={activePlant} imageUrl={activePlant.imageUrl} />

            <div style={{ marginTop: 22 }}>
              <Tag>Bitácora de crecimiento</Tag>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "10px 2px" }}>
                {activePlant.history.map((h, i) => (
                  <div key={i} style={{ flexShrink: 0, textAlign: "center" }}>
                    <div style={{ padding: 4, borderRadius: 14, background: C.base, boxShadow: pressed(false, 3) }}>
                      <img src={h.imageUrl} alt="" style={{ width: 58, height: 58, objectFit: "cover", borderRadius: 10, display: "block" }} />
                    </div>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: C.woodDark, margin: "4px 0 0" }}>{h.date}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => openCamera("followup", activePlant.id)}
              style={{ marginTop: 16, width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: C.base, boxShadow: raised(false, 5), color: C.pine, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
            >
              Tomar foto de seguimiento
            </button>
          </div>
        )}

        <BottomNav
          screen={screen}
          setScreen={(s) => {
            setSelectedPlant(null);
            if (s === "camera") openCamera("new");
            else setScreen(s);
          }}
          gardenCount={garden.length}
        />
      </div>
    </div>
  );
}
