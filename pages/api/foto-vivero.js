// Regresa la foto principal de un vivero desde Google Maps (Places API).
// Corre en el SERVIDOR para que tu llave de Google nunca llegue al navegador.
//
// Necesita la variable GOOGLE_MAPS_API_KEY en Vercel. Si no está, responde
// sin foto y la app muestra una ilustración en su lugar (no se rompe nada).
import { VIVEROS } from "../../lib/viveros";

const PERMITIDOS = new Set(VIVEROS.map((v) => v.placeId));

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const placeId = req.query.placeId;
  // Solo se aceptan los viveros de la lista, para que nadie más use tu llave.
  if (typeof placeId !== "string" || !PERMITIDOS.has(placeId)) {
    return res.status(400).json({ error: "Vivero no válido" });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return res.status(200).json({ foto: null, motivo: "Falta GOOGLE_MAPS_API_KEY" });
  }

  try {
    // 1) Pide la lista de fotos del lugar
    const detalle = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "photos" },
    });
    if (!detalle.ok) {
      console.error("Places details error:", await detalle.text());
      return res.status(200).json({ foto: null });
    }
    const { photos } = await detalle.json();
    const primera = photos && photos[0];
    if (!primera) return res.status(200).json({ foto: null });

    // 2) Pide la URL de esa foto en tamaño chico (cargan rápido en el celular)
    const media = await fetch(
      `https://places.googleapis.com/v1/${primera.name}/media?maxWidthPx=640&skipHttpRedirect=true`,
      { headers: { "X-Goog-Api-Key": key } }
    );
    if (!media.ok) {
      console.error("Places photo error:", await media.text());
      return res.status(200).json({ foto: null });
    }
    const { photoUri } = await media.json();

    const autor = primera.authorAttributions && primera.authorAttributions[0];

    // Vercel guarda esta respuesta 1 hora: así no se llama a Google cada vez
    // que alguien abre Comunidad (ahorra costo y carga más rápido).
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=600");
    return res.status(200).json({
      foto: photoUri || null,
      autor: autor ? autor.displayName : null,
      autorUrl: autor ? autor.uri : null,
    });
  } catch (err) {
    console.error("Error obteniendo foto de vivero:", err);
    return res.status(200).json({ foto: null });
  }
}
