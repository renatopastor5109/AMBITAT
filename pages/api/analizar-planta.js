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

  const { imageBase64, mediaType } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: "Falta la imagen" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en el servidor" });
  }

  try {
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
          "Eres un botánico experto. Analiza la foto de una planta y responde SOLO con un objeto JSON válido, sin texto adicional ni backticks de markdown. Claves exactas: nombre_comun (string), nombre_cientifico (string), confianza ('alta'|'media'|'baja'), estado_general ('saludable'|'regular'|'critico'), riego (string breve), luz (string breve), problemas_detectados (array de strings, vacío si no hay), consejos (array de 2 a 4 strings). Responde en español.",
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
              { type: "text", text: "Identifica esta planta y evalúa su estado de salud." },
            ],
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
