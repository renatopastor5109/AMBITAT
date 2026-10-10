// Este código corre en el SERVIDOR de Vercel, nunca en el navegador del usuario.
// Por eso aquí sí es seguro usar la API key: nadie desde afuera puede verla.

import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";

export const config = {
  // La IA puede tardar 15-40 s con varias fotos (el límite normal es 10 s).
  maxDuration: 60,
  api: {
    bodyParser: {
      // La app comprime las fotos antes de mandarlas (~300 KB cada una).
      // Vercel no acepta más de 4.5 MB por petición de todos modos.
      sizeLimit: "4mb",
    },
  },
};

const MAX_FOTOS = 3;
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// Cuántos análisis puede hacer cada persona en 24 horas. Protege tu saldo de
// Anthropic si alguien intenta usar la app de forma automatizada.
const LIMITE_DIARIO = 25;

// Revisa el límite diario. El análisis se anota hasta que sale bien
// (registrarUso), así un error no le gasta intentos a la persona.
async function dentroDelLimite(admin, userId) {
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from("analisis_uso")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", hace24h);
  if (error) {
    console.error("No se pudo revisar el límite de análisis:", error.message);
    return null;
  }
  return count < LIMITE_DIARIO;
}

async function registrarUso(userId) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const { error } = await clienteAdmin().from("analisis_uso").insert({ user_id: userId });
  if (error) console.error("No se pudo registrar el análisis:", error.message);
}

// Sin cuenta se pueden cuidar hasta 3 plantas (y sus seguimientos), con un
// tope total de análisis para que nadie abuse creando sesiones sin cuenta.
const PLANTAS_SIN_CUENTA = 3;
const ANALISIS_SIN_CUENTA = 15;

async function sinCuentaPermitido(userId, seguimientoDe) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const admin = clienteAdmin();
  const [uso, plantas] = await Promise.all([
    admin.from("analisis_uso").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("plantas").select("id").eq("user_id", userId),
  ]);
  if (plantas.error) return false;
  if (!uso.error && uso.count >= ANALISIS_SIN_CUENTA) return false;
  const ids = (plantas.data || []).map((p) => String(p.id));
  // Seguimiento de una planta que sí es suya: siempre se permite.
  if (seguimientoDe != null && ids.includes(String(seguimientoDe))) return true;
  return ids.length < PLANTAS_SIN_CUENTA;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const usuario = await obtenerUsuario(req, { permitirAnonimo: true });
  if (!usuario) {
    return res.status(401).json({ error: "Inicia sesión para continuar.", requiereCuenta: true });
  }
  const { images, nombreSugerido, faseSugerida, seguimientoDe } = req.body || {};

  // Sin cuenta: hasta 3 plantas. La 4ª pide cuenta.
  if (usuario.is_anonymous && !(await sinCuentaPermitido(usuario.id, seguimientoDe))) {
    return res.status(403).json({ error: "Entra gratis para seguir agregando plantas.", requiereCuenta: true });
  }
  const photos = Array.isArray(images)
    ? images.filter((p) => p && typeof p.base64 === "string" && TIPOS_PERMITIDOS.includes(p.mediaType || "image/jpeg"))
    : [];

  if (photos.length === 0) {
    return res.status(400).json({ error: "Falta la imagen" });
  }
  if (photos.length > MAX_FOTOS) {
    return res.status(400).json({ error: `Máximo ${MAX_FOTOS} fotos por análisis` });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en el servidor" });
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const permitido = await dentroDelLimite(clienteAdmin(), usuario.id);
    if (permitido === null) {
      return res.status(503).json({ error: "No pudimos analizar la foto ahorita. Intenta en un momento." });
    }
    if (!permitido) {
      return res.status(429).json({ error: "Llegaste al límite de análisis por hoy. Intenta mañana." });
    }
  }

  try {
    const imageBlocks = photos.map((p) => ({
      type: "image",
      source: { type: "base64", media_type: p.mediaType || "image/jpeg", data: p.base64 },
    }));

    let instrucciones =
      photos.length > 1
        ? `Identifica esta planta y evalúa su estado de salud. Te mando ${photos.length} fotos de la MISMA planta desde distintos ángulos (por ejemplo hoja de cerca, planta completa, tallo) —úsalas en conjunto para dar una identificación más precisa, no las trates como plantas distintas.`
        : "Identifica esta planta y evalúa su estado de salud.";

    // Se recorta y se limpia para que nadie lo use para darle otras
    // instrucciones a la IA.
    const pistaNombre = (typeof nombreSugerido === "string" ? nombreSugerido : "")
      .replace(/["\n\r]/g, " ")
      .trim()
      .slice(0, 60);
    if (pistaNombre) {
      instrucciones += ` La persona cree que esta planta podría llamarse o parecerse a "${pistaNombre}" — usa esto solo como punto de partida para orientar tu búsqueda, pero confía en lo que ves en la foto: si la imagen claramente muestra otra especie, identifica la que realmente aparece en la foto y no fuerces la coincidencia con ese nombre.`;
    }

    const fasesTexto = {
      germinando: "apenas está germinando (semilla recién abierta o plántula muy pequeña)",
      brote: "es un brote pequeño / plántula joven",
      creciendo: "está en pleno crecimiento, ya con varias hojas pero no adulta",
      grande: "ya es una planta grande / madura",
    };
    const pistaFase = fasesTexto[faseSugerida];
    if (pistaFase) {
      instrucciones += ` La persona indica que la planta ${pistaFase} — tenlo en cuenta para no confundirla con otra especie que se vea parecida en esa etapa, y ajusta tus consejos de riego y cuidado a esa etapa de desarrollo.`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 1500,
        system:
          "Eres un botánico experto. Analiza la(s) foto(s) de una planta y responde SOLO con un objeto JSON válido, sin texto adicional ni backticks de markdown. Claves exactas: nombre_comun (string), nombre_cientifico (string), confianza ('alta'|'media'|'baja'), estado_general ('saludable'|'regular'|'critico'), riego (string breve describiendo el riego), dias_entre_riegos (número entero: tu mejor estimación de cada cuántos días se debe regar esta planta según su especie y el clima promedio), luz (string breve), problemas_detectados (array de strings, vacío si no hay), causa_probable (string o null: si detectaste algún problema, explica en una frase breve la causa más probable de por qué se ve así, por ejemplo 'las hojas amarillas suelen deberse a exceso de riego' — null si la planta está saludable), consejos (array de 2 a 4 strings), advertencia (string o null). " +
          "Reglas importantes: si recibes varias fotos, son distintos ángulos de LA MISMA planta — combina la información de todas para una identificación más segura (por ejemplo, sube la confianza si varias fotos confirman lo mismo). Si aun con varias fotos la luz es mala, están borrosas, o no es clara cuál es la planta principal, NO inventes una identificación segura — baja el campo confianza a 'baja' y usa el campo advertencia para explicarlo brevemente en una frase. Si las fotos son claras, advertencia debe ser null. Responde en español.",
        messages: [
          {
            role: "user",
            content: [...imageBlocks, { type: "text", text: instrucciones }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return res.status(502).json({ error: "Error al analizar la foto" });
    }

    const data = await response.json();
    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("Respuesta de la IA que no es JSON:", text.slice(0, 300));
      return res.status(502).json({ error: "No se pudo leer el análisis" });
    }
    await registrarUso(usuario.id);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "No se pudo analizar la foto" });
  }
}
