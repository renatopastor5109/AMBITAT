// Panel de administrador: marca una cita como "completado" (ya se hizo la
// visita) o la regresa a "pagado" si te equivocaste.
import { createClient } from "@supabase/supabase-js";
import { esAdmin } from "../../../lib/adminAuth";

const ESTADOS_PERMITIDOS = ["completado", "pagado"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }
  if (!esAdmin(req)) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  const { id, estado } = req.body || {};
  if (!id || !ESTADOS_PERMITIDOS.includes(estado)) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  // Solo se puede cambiar entre pagado <-> completado; nunca marcar como
  // pagada una cita que no se ha pagado.
  const origen = estado === "completado" ? "pagado" : "completado";
  const { data, error } = await admin
    .from("reservaciones")
    .update({ estado })
    .eq("id", id)
    .eq("estado", origen)
    .select("id, estado");

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) {
    return res.status(409).json({ error: "Solo puedes completar citas que ya están pagadas" });
  }
  return res.status(200).json({ ok: true, estado });
}
