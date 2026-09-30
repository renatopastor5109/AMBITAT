// Regresa solo las HORAS ocupadas de una fecha (sin nombres ni direcciones de
// otros clientes), para que el formulario de reserva no las ofrezca.
import { createClient } from "@supabase/supabase-js";
import { obtenerHorasOcupadas } from "../../lib/horariosOcupados";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }
  const fecha = req.query.fecha;
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: "Fecha inválida" });
  }

  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const ocupadas = await obtenerHorasOcupadas(admin, fecha);
    return res.status(200).json({ ocupadas });
  } catch (err) {
    console.error("Error leyendo horarios:", err);
    return res.status(500).json({ error: "No se pudieron revisar los horarios" });
  }
}
