// Panel de administrador: marca una cita como "completado" (ya se hizo la
// visita) o la regresa a "pagado" si te equivocaste.
import { clienteAdmin } from "../../../lib/usuarioServidor";
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

  // Ya le depositaste a mano a alguien que canceló y había pagado en OXXO.
  if (id && estado === "reembolso_depositado") {
    const { data, error } = await clienteAdmin()
      .from("reservaciones")
      .update({ reembolso_estado: "depositado" })
      .eq("id", id)
      .eq("reembolso_estado", "pendiente_manual")
      .select("id");
    if (error) {
      console.error("Error marcando depósito:", error);
      return res.status(500).json({ error: "No se pudo actualizar. Intenta de nuevo." });
    }
    if (!data || data.length === 0) return res.status(409).json({ error: "Ese reembolso ya estaba marcado." });
    return res.status(200).json({ ok: true });
  }

  if (!id || !ESTADOS_PERMITIDOS.includes(estado)) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  const admin = clienteAdmin();
  // Solo se puede cambiar entre pagado <-> completado; nunca marcar como
  // pagada una cita que no se ha pagado.
  const origen = estado === "completado" ? "pagado" : "completado";
  const { data, error } = await admin
    .from("reservaciones")
    .update({ estado })
    .eq("id", id)
    .eq("estado", origen)
    .select("id, estado");

  if (error) {
    console.error("Error actualizando estado:", error);
    return res.status(500).json({ error: "No se pudo actualizar. Intenta de nuevo." });
  }
  if (!data || data.length === 0) {
    return res.status(409).json({ error: "Solo puedes completar citas que ya están pagadas" });
  }
  return res.status(200).json({ ok: true, estado });
}
