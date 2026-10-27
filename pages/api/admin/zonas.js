// Panel de administrador: zonas donde das servicio (salen en /conoce).
import { clienteAdmin } from "../../../lib/usuarioServidor";
import { esAdmin } from "../../../lib/adminAuth";
import { obtenerZonas, guardarZonas } from "../../../lib/agendaServidor";

export default async function handler(req, res) {
  if (!esAdmin(req)) return res.status(401).json({ error: "Contraseña incorrecta" });
  const admin = clienteAdmin();
  try {
    if (req.method === "GET") return res.status(200).json({ zonas: await obtenerZonas(admin, { estricto: true }) });
    if (req.method === "POST") return res.status(200).json({ zonas: await guardarZonas(admin, req.body?.zonas) });
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("Error con las zonas:", err);
    const falta = /configuracion/.test(err?.message || "") || err?.code === "42P01";
    return res.status(500).json({ error: falta ? "Falta correr supabase-revision-3.sql en Supabase." : "No se pudo guardar. Intenta de nuevo." });
  }
}
