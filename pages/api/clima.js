// Aviso del clima de CDMX para las plantas (lo muestra la tarjeta "Hoy").
// Se guarda en caché 3 horas para no consultar el pronóstico en cada visita.
import { pronosticoCDMX, avisoClima } from "../../lib/clima";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  const pronostico = await pronosticoCDMX();
  res.setHeader("Cache-Control", "public, s-maxage=10800, stale-while-revalidate=3600");
  return res.status(200).json({ aviso: avisoClima(pronostico) });
}
