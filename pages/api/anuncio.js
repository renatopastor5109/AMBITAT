// Anuncio vigente para la app (público, sin datos personales).
import { clienteAdmin } from "../../lib/usuarioServidor";
import { normalizarAnuncio, anuncioVigente } from "../../lib/anuncio";
import { diaCDMX } from "../../lib/fechas";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  try {
    const { data } = await clienteAdmin().from("configuracion").select("valor").eq("clave", "anuncio").maybeSingle();
    const a = normalizarAnuncio(data?.valor);
    return res.status(200).json({ anuncio: anuncioVigente(a, diaCDMX()) ? { id: a.id, texto: a.texto, enlace: a.enlace, boton: a.boton, tono: a.tono } : null });
  } catch {
    return res.status(200).json({ anuncio: null });
  }
}
