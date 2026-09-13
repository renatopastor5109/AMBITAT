// Este código corre en el SERVIDOR de Vercel, nunca en el navegador del usuario.
// Por eso aquí sí es seguro usar la API key: nadie desde afuera puede verla.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb", // las fotos en base64 pesan más que texto normal
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Acepta el formato nuevo (varias fotos) y sigue aceptando el viejo
  // (una sola foto) por si algo todavía manda el formato anterior.
  const { images, imageBase64, mediaType } = req.body || {};
  const photos = images && images.length ? images : imageBase64 ? [{ base64: imageBase64, mediaType }] : [];

  if (photos.length === 0) {
    return res.status(400).json({ error: "Falta la imagen" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en el servidor" });
  }

  try {
    const imageBlocks = photos.map((p) => ({
      type: "image",
      source: { type: "base64", media_type: p.mediaType || "image/jpeg", data: p.base64 },
    }));

    const instrucciones =
      photos.length > 1
        ? `Identifica esta planta y evalúa su estado de salud. Te mando ${photos.length} fotos de la MISMA planta desde distintos ángulos (por ejemplo hoja de cerca, planta completa, tallo) —úsalas en conjunto para dar una identificación más precisa, no las trates como plantas distintas.`
        : "Identifica esta planta y evalúa su estado de salud.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
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

    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "No se pudo analizar la foto" });
  }
}
