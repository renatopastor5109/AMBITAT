import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// ---- Design tokens ----
const C = {
  deep: "#14261D",
  deep2: "#1c3527",
  parchment: "#F1ECDD",
  parchmentLine: "#d9d0b8",
  moss: "#6E8F65",
  mossSoft: "#8fa588",
  clay: "#B5652E",
  ink: "#22201A",
  amber: "#D6A23D",
  rust: "#9C3B2E",
};

const FONTS_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
`;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const ESTADO_STYLES = {
  saludable: { bg: C.moss, label: "Saludable" },
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
        color: color || C.moss,
      }}
    >
      {children}
    </span>
  );
}

// ---------- Plant specimen card ----------
function PlantCard({ data, imageUrl, onSave, saved, footer, compact }) {
  const estado = ESTADO_STYLES[data.estado_general] || ESTADO_STYLES.regular;
  return (
    <div
      style={{
        background: C.parchment,
        borderRadius: 4,
        padding: compact ? "20px 16px 16px" : "28px 24px 24px",
        position: "relative",
        border: "1px solid " + C.parchmentLine,
        boxShadow: "0 12px 30px -12px rgba(20,38,29,0.45)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: C.deep,
          boxShadow: "inset 0 2px 3px rgba(0,0,0,0.5)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 6,
          border: "1px dashed #b9ae8e",
          borderRadius: 2,
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", gap: compact ? 10 : 16, marginTop: 8 }}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={data.nombre_comun}
            style={{
              width: compact ? 60 : 84,
              height: compact ? 60 : 84,
              objectFit: "cover",
              borderRadius: 3,
              border: "1px solid " + C.parchmentLine,
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
              fontWeight: 600,
              fontSize: compact ? 16 : 24,
              color: C.ink,
              margin: "2px 0 0",
              lineHeight: 1.1,
            }}
          >
            {data.nombre_comun}
          </h2>
          {!compact && (
            <p
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: "italic",
                fontSize: 14,
                color: "#5c5646",
                margin: "2px 0 0",
              }}
            >
              {data.nombre_cientifico}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 12,
          padding: "4px 10px",
          borderRadius: 20,
          background: estado.bg,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: "#fff" }}>
          {estado.label}
        </span>
      </div>

      {!compact && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
            <div style={{ borderTop: "1px solid " + C.parchmentLine, paddingTop: 8 }}>
              <Tag>Riego</Tag>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.ink, margin: "2px 0 0" }}>
                {data.riego}
              </p>
            </div>
            <div style={{ borderTop: "1px solid " + C.parchmentLine, paddingTop: 8 }}>
              <Tag>Luz</Tag>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: C.ink, margin: "2px 0 0" }}>
                {data.luz}
              </p>
            </div>
          </div>

          {data.problemas_detectados && data.problemas_detectados.length > 0 && (
            <div style={{ marginTop: 16, borderTop: "1px solid " + C.parchmentLine, paddingTop: 10 }}>
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
            <div style={{ marginTop: 14, borderTop: "1px solid " + C.parchmentLine, paddingTop: 10 }}>
              <Tag>Consejos de cuidado</Tag>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {data.consejos.map((c, i) => (
                  <li key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: "#3a3527", marginBottom: 3 }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {onSave && (
        <button
          onClick={onSave}
          disabled={saved}
          style={{
            marginTop: 18,
            width: "100%",
            padding: "10px 0",
            borderRadius: 3,
            border: "none",
            background: saved ? "#c9c2a8" : C.deep,
            color: C.parchment,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 13.5,
            cursor: saved ? "default" : "pointer",
          }}
        >
          {saved ? "Guardado" : "Guardar"}
        </button>
      )}
      {footer}
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 20c8-1 13-6 13-15 0 0-11 0-13 8-1 4 0 7 0 7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// ---------- Bottom nav (solo cámara + jardín por ahora) ----------
function BottomNav({ screen, setScreen, gardenCount }) {
  const isDark = screen === "camera" || screen === "analyzing" || screen === "result";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "14px 10px",
        borderTop: "1px solid " + (isDark ? "#2a3f32" : C.parchmentLine),
        background: isDark ? C.deep : "#fff",
      }}
    >
      <button
        onClick={() => setScreen("jardin")}
        style={{ ...navBtnStyle(screen === "jardin", isDark), display: "flex", alignItems: "center", gap: 6 }}
      >
        <Icon.Leaf />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13 }}>
          Mi jardín{gardenCount ? ` (${gardenCount})` : ""}
        </span>
      </button>
      <button
        onClick={() => setScreen("camera")}
        style={{
          ...navBtnStyle(true, isDark),
          background: C.deep,
          color: C.parchment,
          width: 46,
          height: 46,
          borderRadius: "50%",
        }}
      >
        <Icon.Camera />
      </button>
    </div>
  );
}
function navBtnStyle(active, isDark) {
  return {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: active ? (isDark ? C.parchment : C.deep) : isDark ? "#5c7263" : "#a39c86",
    padding: 6,
  };
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
      // Llamamos a NUESTRO backend (/api/analizar-planta), nunca a Anthropic
      // directamente desde el navegador. Así la API key nunca se expone.
      const response = await fetch("/api/analizar-planta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: b64,
          mediaType: file.type || "image/jpeg",
        }),
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

    // Sube la foto real a Supabase Storage para que no se pierda al recargar
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

    const historyEntry = { date: new Date().toLocaleDateString("es-MX"), imageUrl: publicUrl, estado_general: result.estado_general };

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

  return (
    <div style={{ minHeight: "100vh", background: C.deep, display: "flex", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS_IMPORT}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          minHeight: "100vh",
          background: screen === "camera" || screen === "analyzing" || screen === "result" ? C.deep : "#fff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ---------------- CAMERA ---------------- */}
        {screen === "camera" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 20px 4px" }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.moss, margin: 0 }}>
                {captureMode === "followup" ? "Seguimiento de planta" : "Nueva planta"}
              </p>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 21, color: C.parchment, margin: "2px 0 0" }}>
                {captureMode === "followup" ? "¿Cómo va hoy?" : "Enfoca tu planta"}
              </h1>
              {error && <p style={{ color: "#e3a08c", fontSize: 12.5, marginTop: 8 }}>{error}</p>}
            </div>
            <div
              style={{
                flex: 1,
                margin: "14px 20px",
                borderRadius: 10,
                border: "1px dashed #3d5646",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                minHeight: 260,
                background: "radial-gradient(circle at 50% 30%, #1c3527 0%, #14261D 75%)",
              }}
            >
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                <path d="M4 8a2 2 0 012-2h2l1.5-2h5L16 6h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke={C.moss} strokeWidth="1.4" />
                <circle cx="12" cy="13" r="3.4" stroke={C.moss} strokeWidth="1.4" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 30px 26px" }}>
              <button onClick={() => galleryRef.current?.click()} style={{ background: "none", border: "none", color: C.parchment, cursor: "pointer" }}>
                <Icon.Gallery />
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  border: "4px solid " + C.parchment,
                  background: "transparent",
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
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
            {imageUrl && <img src={imageUrl} alt="planta" style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 6, opacity: 0.85 }} />}
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.moss, animation: `pulse 1.1s ${i * 0.15}s infinite ease-in-out` }} />
              ))}
            </div>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: C.mossSoft, letterSpacing: "0.05em" }}>Observando tu planta...</p>
            <style>{`@keyframes pulse { 0%,80%,100%{transform:scale(0.6); opacity:.4} 40%{transform:scale(1); opacity:1} }`}</style>
          </div>
        )}

        {/* ---------------- RESULT ---------------- */}
        {screen === "result" && result && (
          <div style={{ padding: "18px 20px 30px", flex: 1, overflowY: "auto" }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.moss, margin: "0 0 12px" }}>
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
                      borderRadius: 3,
                      border: "1px solid " + C.deep,
                      background: "transparent",
                      color: C.deep,
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
            <button onClick={() => openCamera(captureMode, followupPlantId)} style={{ background: "transparent", border: "none", color: C.mossSoft, fontSize: 13, cursor: "pointer", padding: "14px 0" }}>
              ← Analizar otra foto
            </button>
          </div>
        )}

        {/* ---------------- JARDIN (grid) ---------------- */}
        {screen === "jardin" && !activePlant && (
          <>
            <div style={{ padding: "20px 20px 6px", borderBottom: "1px solid " + C.parchmentLine }}>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 28, color: C.ink, margin: 0 }}>Brotes</h1>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: C.moss, margin: "4px 0 14px" }}>
                Mi jardín
              </p>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 20px" }}>
              {loadingGarden ? (
                <p style={{ textAlign: "center", padding: "60px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: C.mossSoft }}>
                  Cargando tu jardín...
                </p>
              ) : garden.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <p style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 16, color: "#6b6552" }}>
                    Aún no tienes plantas guardadas.
                  </p>
                  <button
                    onClick={() => openCamera("new")}
                    style={{ marginTop: 14, background: C.deep, color: C.parchment, border: "none", borderRadius: 3, padding: "10px 18px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
                  >
                    Analizar mi primera planta
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {garden.map((p) => (
                    <div key={p.id} onClick={() => setSelectedPlant(p.id)} style={{ cursor: "pointer", position: "relative" }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setGarden((prev) => prev.filter((x) => x.id !== p.id));
                          const { error } = await supabase.from("plantas").delete().eq("id", p.id);
                          if (error) console.error("Error borrando planta:", error);
                        }}
                        style={{ position: "absolute", top: 6, right: 6, zIndex: 2, background: "rgba(20,38,29,0.6)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer" }}
                      >
                        <Icon.X style={{ margin: "0 auto" }} />
                      </button>
                      <PlantCard data={p} imageUrl={p.imageUrl} compact />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ---------------- PLANT DETAIL ---------------- */}
        {screen === "jardin" && activePlant && (
          <div style={{ padding: "18px 16px 30px", flex: 1, overflowY: "auto", background: "#fff" }}>
            <button onClick={() => setSelectedPlant(null)} style={{ background: "none", border: "none", color: C.ink, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 14px" }}>
              <Icon.Back /> <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 600 }}>Mi jardín</span>
            </button>
            <PlantCard data={activePlant} imageUrl={activePlant.imageUrl} />

            <div style={{ marginTop: 22 }}>
              <Tag>Bitácora de crecimiento</Tag>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "10px 0" }}>
                {activePlant.history.map((h, i) => (
                  <div key={i} style={{ flexShrink: 0, textAlign: "center" }}>
                    <img src={h.imageUrl} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4, border: "1px solid " + C.parchmentLine }} />
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: "#8a8368", margin: "4px 0 0" }}>{h.date}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => openCamera("followup", activePlant.id)}
              style={{ marginTop: 16, width: "100%", padding: "12px 0", borderRadius: 3, border: "none", background: C.deep, color: C.parchment, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
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
