// Ficha de cuidado de una planta (luz, riego, temperatura, si es tóxica para
// mascotas, plagas...). Se genera con IA una sola vez por planta y se guarda;
// las siguientes veces se regresa la guardada.
import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";

export const config = { maxDuration: 30 };

const TOXICIDAD = ["toxica", "levemente_toxica", "no_toxica", "desconocida"];
const DIFICULTAD = ["facil", "media", "dificil"];

const texto = (v, max = 220) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Deja solo lo esperado, por si la IA agrega algo de más.
function limpiarFicha(f) {
  if (!f || typeof f !== "object") return null;
  const tox = f.toxicidad || {};
  return {
    dificultad: DIFICULTAD.includes(f.dificultad) ? f.dificultad : "media",
    luz: texto(f.luz),
    riego: texto(f.riego),
    humedad: texto(f.humedad),
    temperatura: texto(f.temperatura),
    sustrato: texto(f.sustrato),
    abono: texto(f.abono),
    poda: texto(f.poda),
    toxicidad: {
      mascotas: TOXICIDAD.includes(tox.mascotas) ? tox.mascotas : "desconocida",
      personas: TOXICIDAD.includes(tox.personas) ? tox.personas : "desconocida",
      detalle: texto(tox.detalle, 260),
    },
    plagas: Array.isArray(f.plagas) ? f.plagas.map((p) => texto(p, 120)).filter(Boolean).slice(0, 4) : [],
    dato_extra: texto(f.dato_extra, 260),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const usuario = await obtenerUsuario(req, { permitirAnonimo: true });
  if (!usuario) return res.status(401).json({ error: "Vuelve a abrir la app." });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Falta configurar el servidor." });
  }

  const plantaId = req.body?.plantaId;
  if (!plantaId) return res.status(400).json({ error: "Falta la planta." });

  const admin = clienteAdmin();
  try {
    const { data: planta, error } = await admin
      .from("plantas")
      .select("*")
      .eq("id", plantaId)
      .eq("user_id", usuario.id)
      .maybeSingle();
    if (error) throw error;
    if (!planta) return res.status(404).json({ error: "No encontramos esa planta." });
    if (planta.ficha) return res.status(200).json({ ficha: planta.ficha });

    const nombre = [planta.nombre_comun, planta.nombre_cientifico && `(${planta.nombre_cientifico})`].filter(Boolean).join(" ");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        system:
          "Eres un botánico experto que escribe fichas de cuidado para personas en la Ciudad de México (clima templado, 2,240 m de altitud, temporada de lluvias de junio a octubre, departamentos con poca luz). Responde SOLO con un objeto JSON válido, sin texto extra ni backticks. Claves exactas: dificultad ('facil'|'media'|'dificil'), luz, riego, humedad, temperatura, sustrato, abono, poda (cada una un string breve y práctico de máximo 2 frases), toxicidad ({ mascotas: 'toxica'|'levemente_toxica'|'no_toxica'|'desconocida', personas: igual, detalle: string breve que diga qué parte es tóxica y qué síntomas da, o que es segura }), plagas (array de 2 a 4 strings: plaga común y cómo reconocerla), dato_extra (un consejo útil específico de esta planta). Sé prudente con la toxicidad: si no estás seguro, usa 'desconocida'. Responde en español de México.",
        messages: [{ role: "user", content: `Ficha de cuidado para: ${nombre}` }],
      }),
    });
    if (!r.ok) {
      console.error("Error de la IA en ficha:", await r.text());
      return res.status(502).json({ error: "No pudimos preparar la ficha. Intenta de nuevo." });
    }
    const data = await r.json();
    const crudo = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
    let ficha;
    try {
      ficha = limpiarFicha(JSON.parse(crudo));
    } catch {
      console.error("Ficha que no es JSON:", crudo.slice(0, 200));
      return res.status(502).json({ error: "No pudimos preparar la ficha. Intenta de nuevo." });
    }

    const { error: saveError } = await admin.from("plantas").update({ ficha }).eq("id", plantaId);
    if (saveError) console.error("No se guardó la ficha (¿falta correr el SQL?):", saveError.message);
    return res.status(200).json({ ficha });
  } catch (err) {
    console.error("Error en ficha:", err);
    return res.status(500).json({ error: "No pudimos preparar la ficha. Intenta de nuevo." });
  }
}
