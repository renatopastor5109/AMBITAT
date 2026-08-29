import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// ---- Design tokens (paleta cálida: madera + oro + pino) ----
const C = {
  gold: "#EAC468",       // lienzo de fondo de toda la app
  goldEdge: "#DDB556",   // sombra sutil del lienzo
  wood: "#8B5A2E",       // marco / insignia del logo
  woodDark: "#6E4522",   // sombra de madera
  pine: "#3F5D3E",       // verde pino medio: botones, cámara, estado saludable
  pineDark: "#28402A",   // pantallas de cámara/análisis/resultado
  cream: "#F5EFDD",      // parte superior de la tarjeta
  creamLine: "#e2d7b8",  // líneas divisoras sobre crema
  ink: "#221C13",        // texto principal
  amber: "#D6A23D",      // estado "necesita atención"
  rust: "#9C3B2E",       // estado crítico
  coral: "#D98B72",      // texto de "problemas" legible sobre verde pino
  mossText: "#6b8257",   // etiquetas mono sobre crema
};

const FONTS_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
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
    <div
      style={{
        alignSelf: "center",
        background: C.wood,
        border: "3px solid " + C.woodDark,
        borderRadius: 40,
        padding: "14px 26px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        boxShadow: "0 6px 0 " + C.woodDark,
      }}
    >
      <span
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 900,
          fontSize: 26,
          letterSpacing: "0.02em",
          color: C.cream,
          textShadow: "1px 1px 0 " + C.woodDark,
        }}
      >
        ÁMB
      </span>
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
        <path d="M11 1L20 14H14L20 22H2L8 14H2L11 1Z" fill={C.pine} stroke={C.woodDark} strokeWidth="1" strokeLinejoin="round" />
        <rect x="9.5" y="21" width="3" height="4" fill={C.woodDark} />
      </svg>
      <span
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 900,
          fontSize: 26,
          letterSpacing: "0.02em",
          color: C.cream,
          textShadow: "1px 1px 0 " + C.woodDark,
        }}
      >
        TAT
      </span>
    </div>
  );
}

// ---------- Tarjeta de planta: dos tonos (crema arriba / pino abajo) ----------
function PlantCard({ data, imageUrl, onSave, saved, footer, compact }) {
  const estado = ESTADO_STYLES[data.estado_general] || ESTADO_STYLES.regular;
  return (
    <div
      style={{
        borderRadius: 26,
        overflow: "hidden",
        boxShadow: "0 10px 0 " + C.woodDark + "33, 0 14px 24px -10px rgba(40,64,42,0.5)",
      }}
    >
      {/* bloque superior: crema */}
      <div style={{ background: C.cream, padding: compact ? "16px 14px 14px" : "22px 22px 18px" }}>
        <div style={{ display: "flex", gap: compact ? 10 : 16 }}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={data.nombre_comun}
              style={{
                width: compact ? 56 : 78,
                height: compact ? 56 : 78,
                objectFit: "cover",
                borderRadius: 12,
                border: "1px solid " + C.creamLine,
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            {!compact && (
              <Tag>{data.confianza === "alta" ? "Identificación confiable" : "Identificación aproximada"}</Tag>
            )}
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
              background: estado.bg,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: "#fff" }}>{estado.label}</span>
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
                  background: watering.urgent ? "#F3DCC9" : C.creamLine,
                }}
              >
                <span style={{ fontSize: 11 }}>💧</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 600, color: watering.urgent ? C.rust : "#6b6047" }}>
                  {watering.label}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* bloque inferior: verde pino */}
      {!compact && (
        <div style={{ background: C.pine, padding: "18px 22px 22px", color: C.cream }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <Tag color="#bcd0af">RIEGO</Tag>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.cream, margin: "3px 0 0", opacity: 0.95 }}>
                {data.riego}
              </p>
            </div>
            <div>
              <Tag color="#c7d6b8">LUZ</Tag>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.cream, margin: "3px 0 0", opacity: 0.95 }}>
                {data.luz}
              </p>
            </div>
          </div>

          {data.problemas_detectados && data.problemas_detectados.length > 0 && (
            <div style={{ marginTop: 16, borderTop: "1px solid rgba(245,239,221,0.2)", paddingTop: 12 }}>
              <Tag color={C.coral}>Se detectó</Tag>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {data.problemas_detectados.map((p, i) => (
                  <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.coral, marginBottom: 3 }}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.consejos && data.consejos.length > 0 && (
            <div style={{ marginTop: 14, borderTop: "1px solid rgba(245,239,221,0.2)", paddingTop: 12 }}>
              <Tag color="#c7d6b8">Consejos de cuidado</Tag>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {data.consejos.map((c, i) => (
                  <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.cream, marginBottom: 3, opacity: 0.95 }}>
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
                padding: "11px 0",
                borderRadius: 10,
                border: "none",
                background: saved ? "rgba(245,239,221,0.35)" : C.cream,
                color: saved ? C.cream : C.pine,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: saved ? "default" : "pointer",
              }}
            >
              {saved ? "Guardado" : "Guardar"}
            </button>
          )}
          {footer}
        </div>
      )}
      {compact && (
        <div style={{ background: C.pine, padding: "8px 14px 10px" }} />
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
        gap: 8,
        margin: "0 16px 16px",
        padding: 8,
        borderRadius: 26,
        background: C.wood,
        boxShadow: "0 6px 0 " + C.woodDark,
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
          background: jardinActive ? C.cream : "transparent",
          border: "none",
          borderRadius: 18,
          padding: "10px 0",
          cursor: "pointer",
          color: jardinActive ? C.pine : "rgba(245,239,221,0.75)",
        }}
      >
        <Icon.Leaf />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12.5, color: jardinActive ? C.ink : "rgba(245,239,221,0.85)" }}>
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
          background: cameraActive ? C.cream : "transparent",
          border: "none",
          borderRadius: 18,
          padding: "10px 0",
          cursor: "pointer",
          color: cameraActive ? C.pine : "rgba(245,239,221,0.75)",
        }}
      >
        <Icon.Camera />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12.5, color: cameraActive ? C.ink : "rgba(245,239,221,0.85)" }}>
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

  const [garden, setGarden] = useState([]);
  const [userId, setUserId] = useState(null);
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

    let publicUrl = imageUrl;
    if (capturedFile) {
      const path = `${userId}/${Date.now()}-${capturedFile.name}`;
      const { error: uploadError } = await supabase.storage.from("plant-photos").upload(path, capturedFile);
      if (!uploadError) {
        const { data } = supabase.storage.from("plant-photos").getPublicUrl(path);
        publicUrl = data.publicUrl;
      } else {
        console.error("Error subiendo foto:", uploadError);
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
    <div style={{ minHeight: "100vh", background: C.gold, display: "flex", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS_IMPORT}</style>
      <div style={{ width: "100%", maxWidth: 420, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* ---------------- CAMERA ---------------- */}
        {screen === "camera" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.pineDark, margin: 16, borderRadius: 26, overflow: "hidden" }}>
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
                border: "1px dashed rgba(245,239,221,0.3)",
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
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
            <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          </div>
        )}

        {/* ---------------- ANALYZING ---------------- */}
        {screen === "analyzing" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, background: C.pineDark, margin: 16, borderRadius: 26 }}>
            {imageUrl && <img src={imageUrl} alt="planta" style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 14, opacity: 0.9 }} />}
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
                isSaved && (
                  <button
                    onClick={() => {
                      if (captureMode === "followup") setSelectedPlant(followupPlantId);
                      setScreen("jardin");
                    }}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: "10px 0",
                      borderRadius: 10,
                      border: "1px solid rgba(245,239,221,0.5)",
                      background: "transparent",
                      color: C.cream,
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: 13.5,
                      cursor: "pointer",
                    }}
                  >
                    Ir a mi jardín →
                  </button>
                )
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
                    style={{ marginTop: 14, background: C.pine, color: C.cream, border: "none", borderRadius: 12, padding: "11px 20px", fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
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
                          background: "#F3DCC9",
                          borderRadius: 14,
                          padding: "12px 16px",
                          marginBottom: 14,
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {garden.map((p) => (
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
            <button onClick={() => setSelectedPlant(null)} style={{ background: "none", border: "none", color: C.woodDark, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px" }}>
              <Icon.Back /> <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 700 }}>Mi jardín</span>
            </button>
            <PlantCard data={activePlant} imageUrl={activePlant.imageUrl} />

            <div style={{ marginTop: 22 }}>
              <Tag>Bitácora de crecimiento</Tag>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "10px 0" }}>
                {activePlant.history.map((h, i) => (
                  <div key={i} style={{ flexShrink: 0, textAlign: "center" }}>
                    <img src={h.imageUrl} alt="" style={{ width: 62, height: 62, objectFit: "cover", borderRadius: 10, border: "1px solid " + C.creamLine }} />
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: C.woodDark, margin: "4px 0 0" }}>{h.date}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => openCamera("followup", activePlant.id)}
              style={{ marginTop: 16, width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: C.pine, color: C.cream, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
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
