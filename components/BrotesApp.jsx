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

// ---------- Botanical illustration for post thumbnails (no real photos) ----------
function LeafArt({ variant = 0, size = 200 }) {
  const palettes = [
    [C.moss, C.deep2, C.amber],
    [C.clay, C.deep, C.moss],
    [C.deep2, C.mossSoft, C.rust],
    [C.moss, C.clay, C.deep],
  ];
  const p = palettes[variant % palettes.length];
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="200" height="200" fill={p[1]} />
      <ellipse cx={60 + (variant % 3) * 20} cy="120" rx="70" ry="90" fill={p[0]} opacity="0.9" />
      <ellipse cx={150} cy={70} rx="55" ry="75" fill={p[2]} opacity="0.55" />
      <path
        d={`M100 200 C100 140 ${70 + variant * 6} 100 90 40`}
        stroke={C.parchment}
        strokeWidth="3"
        fill="none"
        opacity="0.35"
      />
    </svg>
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
  Home: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 11.5L12 5l8 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
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
  Menu: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  User: (p) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
  Share: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 12v6a1 1 0 001 1h12a1 1 0 001-1v-6M12 15V3M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Plus: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  ),
  Cart: (p) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M3 4h2l2.2 11.2a1.5 1.5 0 001.5 1.3h8.1a1.5 1.5 0 001.5-1.2L20 8H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="20" r="1.3" fill="currentColor" />
      <circle cx="17" cy="20" r="1.3" fill="currentColor" />
    </svg>
  ),
  Calendar: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  Check: (p) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Minus: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  ),
};

// ---------- Mock community data ----------
const MOCK_POSTS = [
  { id: 1, autor: "Vivero Raíces", tipo: "Tienda", variant: 0, likes: 128,
    caption: "Llegó nueva remesa de suculentas de temporada. Ideales para quienes están empezando su colección: resisten el olvido ocasional de riego." },
  { id: 2, autor: "Mariana G.", tipo: "Usuario", variant: 1, likes: 54,
    caption: "Mi monstera por fin sacó su primera hoja fenestrada después de 3 meses. La paciencia con las plantas de interior rinde frutos." },
  { id: 3, autor: "Jardín Urbano MX", tipo: "Tienda", variant: 2, likes: 212,
    caption: "Tip del mes: si las puntas de las hojas se ponen cafés, casi siempre es por el cloro del agua de la llave. Déjala reposar 24h antes de regar." },
  { id: 4, autor: "Diego R.", tipo: "Usuario", variant: 3, likes: 39,
    caption: "Rescaté este potos de la sección de descuentos, todo marchito. Tres semanas después y ya tiene hojas nuevas por todos lados." },
  { id: 5, autor: "Terrario Co.", tipo: "Tienda", variant: 1, likes: 97,
    caption: "Los terrarios cerrados casi se riegan solos: el agua se recicla dentro del vidrio. Perfectos para quien viaja seguido." },
  { id: 6, autor: "Ana P.", tipo: "Usuario", variant: 0, likes: 61,
    caption: "Después de meses luchando contra la cochinilla, mi ficus por fin está limpio. Alcohol isopropílico y mucha paciencia." },
];

// ---------- Mock store catalog ----------
const PRODUCTS = [
  { id: "p1", nombre: "Muro Verde Modular 60x60", precio: 1450, variant: 2,
    descripcion: "Panel modular prearmado con follaje mixto natural, ideal para fachadas exteriores. Incluye sistema de riego por goteo." },
  { id: "p2", nombre: "Jardinera Vertical de Bambú", precio: 890, variant: 1,
    descripcion: "Estructura de bambú con 12 bolsillos de fieltro para plantas de interior. Fácil de montar en cualquier pared." },
  { id: "p3", nombre: "Kit Hidropónico Vertical", precio: 2100, variant: 0,
    descripcion: "Sistema autónomo con bomba de recirculación, pensado para hierbas de cocina y suculentas." },
  { id: "p4", nombre: "Panel de Suculentas Prearmado", precio: 650, variant: 3,
    descripcion: "Panel ligero de 40x40cm listo para colgar. Ideal para balcones y espacios pequeños." },
  { id: "p5", nombre: "Muro Verde Artificial Premium", precio: 1200, variant: 2,
    descripcion: "Follaje sintético de alta densidad y aspecto realista. Cero mantenimiento de riego." },
  { id: "p6", nombre: "Torre de Cultivo Vertical", precio: 1780, variant: 1,
    descripcion: "Torre giratoria de 5 niveles para hierbas y vegetales, aprovecha espacios reducidos." },
];

const SERVICIOS_MANTENIMIENTO = [
  "Poda y limpieza general",
  "Revisión de sistema de riego",
  "Fertilización",
  "Diagnóstico de plagas u hongos",
];

// ---------- Bottom nav ----------
const TIENDA_SCREENS = ["tienda", "producto", "carrito", "agenda", "agendaConfirm"];
function BottomNav({ screen, setScreen, gardenCount, cartCount }) {
  const isDark = screen === "camera" || screen === "analyzing" || screen === "result";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "14px 6px",
        borderTop: "1px solid " + (isDark ? "#2a3f32" : C.parchmentLine),
        background: isDark ? C.deep : "#fff",
      }}
    >
      <button onClick={() => setScreen("feed")} style={navBtnStyle(screen === "feed", isDark)}>
        <Icon.Home />
      </button>
      <button onClick={() => setScreen("crear")} style={navBtnStyle(screen === "crear", isDark)}>
        <Icon.Plus />
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
      <button
        onClick={() => setScreen("tienda")}
        style={{ ...navBtnStyle(TIENDA_SCREENS.includes(screen), isDark), position: "relative" }}
      >
        <Icon.Cart />
        {cartCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -4,
              background: C.clay,
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
              fontSize: 9.5,
              fontWeight: 700,
              width: 15,
              height: 15,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {cartCount}
          </span>
        )}
      </button>
      <button
        onClick={() => setScreen("jardin")}
        style={{ ...navBtnStyle(screen === "jardin", isDark), display: "flex", alignItems: "center", gap: 5 }}
      >
        <Icon.Leaf />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12 }}>
          {gardenCount ? `(${gardenCount})` : ""}
        </span>
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
  const [screen, setScreen] = useState("feed");
  const [selectedPost, setSelectedPost] = useState(null);
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

  // community posting
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [newImageUrl, setNewImageUrl] = useState(null);
  const [newCaption, setNewCaption] = useState("");
  const newPostFileRef = useRef(null);

  // store / cart
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState({}); // { productId: qty }
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const prod = PRODUCTS.find((p) => p.id === id);
    return sum + (prod ? prod.precio * qty : 0);
  }, 0);
  function addToCart(id) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }
  function changeQty(id, delta) {
    setCart((prev) => {
      const next = { ...prev };
      const qty = (next[id] || 0) + delta;
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  // maintenance scheduling
  const [agendaForm, setAgendaForm] = useState({ servicio: SERVICIOS_MANTENIMIENTO[0], fecha: "", hora: "", direccion: "", notas: "" });

  function handleNewPostImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewImageUrl(URL.createObjectURL(file));
  }
  function publishPost() {
    if (!newCaption.trim() && !newImageUrl) return;
    const post = {
      id: Date.now(),
      autor: "Tú",
      tipo: "Usuario",
      variant: Math.floor(Math.random() * 4),
      likes: 0,
      caption: newCaption.trim() || "Nueva publicación",
    };
    setPosts((prev) => [post, ...prev]);
    setNewCaption("");
    setNewImageUrl(null);
    setScreen("feed");
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
      // Nota: llamamos a NUESTRO backend (/api/analizar-planta), nunca a Anthropic
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
    // (antes de esto, la imagen solo vivía como blob: temporal del navegador)
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
        {/* ---------------- FEED ---------------- */}
        {screen === "feed" && !selectedPost && (
          <>
            <TopBar />
            <div style={{ padding: "18px 20px 6px" }}>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 30, color: C.ink, margin: 0 }}>
                Comunidad
              </h1>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: C.moss, margin: "4px 0 0" }}>
                Viveros y personas cerca de ti
              </p>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  style={{
                    border: "none",
                    padding: 0,
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ aspectRatio: "1/1", borderRadius: 6, overflow: "hidden" }}>
                    <LeafArt variant={post.variant} />
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12.5, color: C.ink, margin: "6px 0 0" }}>
                    {post.autor}
                  </p>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: C.moss, margin: "1px 0 0" }}>
                    {post.tipo} · {post.likes} ♥
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ---------------- POST DETAIL ---------------- */}
        {screen === "feed" && selectedPost && (
          <>
            <TopBar />
            <div style={{ padding: "10px 16px", flex: 1, overflowY: "auto" }}>
              <button onClick={() => setSelectedPost(null)} style={{ background: "none", border: "none", color: C.ink, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 12px" }}>
                <Icon.Back /> <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 600 }}>Comunidad</span>
              </button>
              <div style={{ background: C.deep, borderRadius: 10, padding: 16, color: C.parchment }}>
                <div style={{ borderRadius: 6, overflow: "hidden", aspectRatio: "16/11", marginBottom: 16 }}>
                  <LeafArt variant={selectedPost.variant} />
                </div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.moss, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {selectedPost.tipo}
                </p>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, margin: "4px 0 12px" }}>{selectedPost.autor}</h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, lineHeight: 1.6, color: "#d9d4c4", margin: 0 }}>
                  {selectedPost.caption}
                </p>
                <button
                  style={{
                    marginTop: 20,
                    width: "100%",
                    padding: "11px 0",
                    borderRadius: 3,
                    border: "1px solid " + C.moss,
                    background: "transparent",
                    color: C.parchment,
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  Seguir a {selectedPost.autor}
                </button>
              </div>
            </div>
          </>
        )}

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
            <TopBar />
            <div style={{ padding: "18px 20px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 28, color: C.ink, margin: 0 }}>Mi jardín</h1>
              {garden.length > 0 && (
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: C.deep,
                    color: C.parchment,
                    border: "none",
                    borderRadius: 20,
                    padding: "8px 14px",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                >
                  <Icon.Share /> Compartir
                </button>
              )}
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

        {/* ---------------- CREAR PUBLICACIÓN ---------------- */}
        {screen === "crear" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "18px 16px 6px" }}>
              <button onClick={() => setScreen("feed")} style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", padding: 4 }}>
                <Icon.Back />
              </button>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, color: C.ink, margin: 0 }}>
                Nueva publicación
              </h1>
            </div>
            <div style={{ padding: "12px 20px", flex: 1 }}>
              <label
                htmlFor="new-post-photo"
                style={{
                  display: "block",
                  border: "1px dashed " + C.parchmentLine,
                  borderRadius: 8,
                  overflow: "hidden",
                  cursor: "pointer",
                  aspectRatio: "4/3",
                  marginBottom: 16,
                }}
              >
                {newImageUrl ? (
                  <img src={newImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: C.moss }}>
                    <Icon.Gallery />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#8a8368" }}>Agregar una foto</span>
                  </div>
                )}
              </label>
              <input id="new-post-photo" ref={newPostFileRef} type="file" accept="image/*" onChange={handleNewPostImage} style={{ display: "none" }} />

              <textarea
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                placeholder="Comparte algo con la comunidad..."
                rows={5}
                style={{
                  width: "100%",
                  border: "1px solid " + C.parchmentLine,
                  borderRadius: 6,
                  padding: 12,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: C.ink,
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={publishPost}
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 3,
                  border: "none",
                  background: C.deep,
                  color: C.parchment,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Publicar
              </button>
            </div>
          </div>
        )}

        {/* ---------------- TIENDA (catálogo) ---------------- */}
        {screen === "tienda" && (
          <>
            <TopBar />
            <div style={{ padding: "18px 20px 6px" }}>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 28, color: C.ink, margin: 0 }}>Tienda</h1>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: C.moss, margin: "4px 0 0" }}>
                Jardines verticales y accesorios
              </p>
            </div>
            <div style={{ padding: "12px 16px 0" }}>
              <button
                onClick={() => setScreen("agenda")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: C.deep,
                  color: C.parchment,
                  border: "none",
                  borderRadius: 8,
                  padding: "13px 0",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                }}
              >
                <Icon.Calendar /> Agendar mantenimiento de tu jardín
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {PRODUCTS.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => {
                    setSelectedProduct(prod);
                    setScreen("producto");
                  }}
                  style={{ border: "none", padding: 0, background: "transparent", textAlign: "left", cursor: "pointer", borderRadius: 6, overflow: "hidden" }}
                >
                  <div style={{ aspectRatio: "1/1", borderRadius: 6, overflow: "hidden" }}>
                    <LeafArt variant={prod.variant} />
                  </div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 12.5, color: C.ink, margin: "6px 0 0", lineHeight: 1.3 }}>
                    {prod.nombre}
                  </p>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: C.clay, margin: "2px 0 0" }}>
                    ${prod.precio.toLocaleString("es-MX")} MXN
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ---------------- PRODUCTO DETALLE ---------------- */}
        {screen === "producto" && selectedProduct && (
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 30px" }}>
            <button onClick={() => setScreen("tienda")} style={{ background: "none", border: "none", color: C.ink, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 12px" }}>
              <Icon.Back /> <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 600 }}>Tienda</span>
            </button>
            <div style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "1/1", marginBottom: 16 }}>
              <LeafArt variant={selectedProduct.variant} />
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 22, color: C.ink, margin: 0 }}>{selectedProduct.nombre}</h2>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, color: C.clay, margin: "6px 0 14px" }}>
              ${selectedProduct.precio.toLocaleString("es-MX")} MXN
            </p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.6, color: "#3a3527", margin: 0 }}>
              {selectedProduct.descripcion}
            </p>
            <button
              onClick={() => addToCart(selectedProduct.id)}
              style={{ marginTop: 22, width: "100%", padding: "13px 0", borderRadius: 3, border: "none", background: C.deep, color: C.parchment, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Agregar al carrito
            </button>
            <button
              onClick={() => setScreen("carrito")}
              style={{ marginTop: 10, width: "100%", padding: "11px 0", borderRadius: 3, border: "1px solid " + C.parchmentLine, background: "transparent", color: C.ink, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
            >
              Ver carrito {cartCount > 0 ? `(${cartCount})` : ""}
            </button>
          </div>
        )}

        {/* ---------------- CARRITO ---------------- */}
        {screen === "carrito" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 30px" }}>
            <button onClick={() => setScreen("tienda")} style={{ background: "none", border: "none", color: C.ink, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 12px" }}>
              <Icon.Back /> <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 600 }}>Tienda</span>
            </button>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 24, color: C.ink, margin: "0 0 16px" }}>Tu carrito</h1>

            {cartCount === 0 ? (
              <p style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 15, color: "#6b6552", textAlign: "center", padding: "40px 0" }}>
                Tu carrito está vacío.
              </p>
            ) : (
              <>
                {Object.entries(cart).map(([id, qty]) => {
                  const prod = PRODUCTS.find((p) => p.id === id);
                  if (!prod) return null;
                  return (
                    <div key={id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid " + C.parchmentLine }}>
                      <div style={{ width: 56, height: 56, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                        <LeafArt variant={prod.variant} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: C.ink, margin: 0 }}>{prod.nombre}</p>
                        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: C.clay, margin: "2px 0 0" }}>
                          ${prod.precio.toLocaleString("es-MX")} MXN
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => changeQty(id, -1)} style={qtyBtnStyle}>
                          <Icon.Minus />
                        </button>
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, minWidth: 14, textAlign: "center" }}>{qty}</span>
                        <button onClick={() => changeQty(id, 1)} style={qtyBtnStyle}>
                          <Icon.Plus style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0" }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.ink }}>Total</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 15, color: C.ink }}>
                    ${cartTotal.toLocaleString("es-MX")} MXN
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCart({});
                    setScreen("agendaConfirm");
                    setAgendaForm((f) => ({ ...f, _orderConfirm: true }));
                  }}
                  style={{ width: "100%", padding: "13px 0", borderRadius: 3, border: "none", background: C.deep, color: C.parchment, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                >
                  Confirmar pedido
                </button>
              </>
            )}
          </div>
        )}

        {/* ---------------- AGENDAR MANTENIMIENTO ---------------- */}
        {screen === "agenda" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 30px" }}>
            <button onClick={() => setScreen("tienda")} style={{ background: "none", border: "none", color: C.ink, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 0 12px" }}>
              <Icon.Back /> <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 600 }}>Tienda</span>
            </button>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 24, color: C.ink, margin: "0 0 4px" }}>
              Agendar mantenimiento
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#6b6552", margin: "0 0 20px" }}>
              Un especialista revisará tu jardín en la fecha que elijas.
            </p>

            <FormLabel>Tipo de servicio</FormLabel>
            <select
              value={agendaForm.servicio}
              onChange={(e) => setAgendaForm((f) => ({ ...f, servicio: e.target.value }))}
              style={inputStyle}
            >
              {SERVICIOS_MANTENIMIENTO.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <FormLabel>Fecha</FormLabel>
                <input type="date" value={agendaForm.fecha} onChange={(e) => setAgendaForm((f) => ({ ...f, fecha: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <FormLabel>Hora</FormLabel>
                <input type="time" value={agendaForm.hora} onChange={(e) => setAgendaForm((f) => ({ ...f, hora: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <FormLabel>Dirección</FormLabel>
            <input
              type="text"
              placeholder="Calle, número, colonia"
              value={agendaForm.direccion}
              onChange={(e) => setAgendaForm((f) => ({ ...f, direccion: e.target.value }))}
              style={inputStyle}
            />

            <FormLabel>Notas (opcional)</FormLabel>
            <textarea
              rows={3}
              placeholder="Ej. mi jardín vertical tiene manchas amarillas en varias plantas"
              value={agendaForm.notas}
              onChange={(e) => setAgendaForm((f) => ({ ...f, notas: e.target.value }))}
              style={{ ...inputStyle, resize: "none" }}
            />

            <button
              onClick={() => setScreen("agendaConfirm")}
              disabled={!agendaForm.fecha || !agendaForm.hora || !agendaForm.direccion}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "13px 0",
                borderRadius: 3,
                border: "none",
                background: !agendaForm.fecha || !agendaForm.hora || !agendaForm.direccion ? "#c9c2a8" : C.deep,
                color: C.parchment,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                cursor: !agendaForm.fecha || !agendaForm.hora || !agendaForm.direccion ? "default" : "pointer",
              }}
            >
              Confirmar cita
            </button>
          </div>
        )}

        {/* ---------------- CONFIRMACIÓN (cita o pedido) ---------------- */}
        {screen === "agendaConfirm" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px 30px" }}>
            <div style={{ color: C.moss, marginBottom: 14 }}>
              <Icon.Check />
            </div>
            {agendaForm._orderConfirm ? (
              <>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 21, color: C.ink, margin: "0 0 8px" }}>
                  ¡Pedido confirmado!
                </h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: "#6b6552", lineHeight: 1.5 }}>
                  Te avisaremos cuando tu pedido esté en camino.
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 21, color: C.ink, margin: "0 0 8px" }}>
                  ¡Cita agendada!
                </h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: "#6b6552", lineHeight: 1.5, margin: 0 }}>
                  {agendaForm.servicio} el {agendaForm.fecha} a las {agendaForm.hora}.
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#8a8368", marginTop: 4 }}>
                  {agendaForm.direccion}
                </p>
              </>
            )}
            <button
              onClick={() => {
                setAgendaForm({ servicio: SERVICIOS_MANTENIMIENTO[0], fecha: "", hora: "", direccion: "", notas: "" });
                setScreen("tienda");
              }}
              style={{ marginTop: 24, padding: "11px 24px", borderRadius: 3, border: "none", background: C.deep, color: C.parchment, fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
            >
              Volver a la tienda
            </button>
          </div>
        )}

        <BottomNav
          screen={screen}
          setScreen={(s) => {
            setSelectedPost(null);
            setSelectedPlant(null);
            if (s === "camera") openCamera("new");
            else setScreen(s);
          }}
          gardenCount={garden.length}
          cartCount={cartCount}
        />
      </div>
    </div>
  );
}

function FormLabel({ children }) {
  return (
    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase", color: C.moss, margin: "14px 0 6px" }}>
      {children}
    </p>
  );
}

const inputStyle = {
  width: "100%",
  border: "1px solid " + C.parchmentLine,
  borderRadius: 6,
  padding: "10px 12px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 13.5,
  color: C.ink,
  boxSizing: "border-box",
  background: "#fff",
};

const qtyBtnStyle = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: "1px solid " + C.parchmentLine,
  background: "#fff",
  color: C.ink,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

function TopBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid " + C.parchmentLine }}>
      <Icon.Menu style={{ color: C.ink }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15, color: C.ink }}>usuario</span>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.deep, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon.User style={{ color: C.parchment, width: 17, height: 17 }} />
        </div>
      </div>
    </div>
  );
}
