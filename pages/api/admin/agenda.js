// Panel de administrador: leer (GET) y guardar (POST) tu agenda.
import { clienteAdmin } from "../../../lib/usuarioServidor";
import { esAdmin } from "../../../lib/adminAuth";
import { obtenerAgenda, guardarAgenda } from "../../../lib/agendaServidor";

export default async function handler(req, res) {
  if (!esAdmin(req)) return res.status(401).json({ error: "Contraseña incorrecta" });
  const admin = clienteAdmin();
  try {
    if (req.method === "GET") return res.status(200).json({ agenda: await obtenerAgenda(admin, { estricto: true }) });
    if (req.method === "POST") {
      const agenda = await guardarAgenda(admin, req.body?.agenda);
      return res.status(200).json({ agenda });
    }
    return res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error("Error con la agenda:", err);
    const falta = /configuracion/.test(err?.message || "") || err?.code === "42P01";
    return res.status(500).json({
      error: falta ? "Falta correr supabase-revision-3.sql en Supabase para poder guardar tu agenda." : "No se pudo guardar. Intenta de nuevo.",
    });
  }
}
