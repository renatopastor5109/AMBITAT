// Panel de administrador: marca una cita como "completado" (ya se hizo la
// visita), la regresa a "pagado", o resuelve una cita "por resolver".
import { clienteAdmin } from "../../../lib/usuarioServidor";
import { esAdmin } from "../../../lib/adminAuth";

const ESTADOS_PERMITIDOS = ["completado", "pagado", "cancelado"];
// De qué estado a qué estado se puede pasar desde el panel.
const ORIGENES = {
  completado: ["pagado"],
  pagado: ["completado", "conflicto"], // regresar una completada, o mantener una "por resolver"
  cancelado: ["conflicto"], // ya le reembolsaste a una "por resolver"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }
  if (!esAdmin(req)) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  const { id, estado } = req.body || {};

  // Ya le regresaste su dinero a mano (OXXO) o confirmaste en Stripe un reembolso dudoso.
  if (id && estado === "reembolso_depositado") {
    const { data, error } = await clienteAdmin()
      .from("reservaciones")
      .update({ reembolso_estado: "depositado" })
      .eq("id", id)
      .in("reembolso_estado", ["pendiente_manual", "revisar"])
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
  // Nunca se marca como pagada una cita que no se ha pagado: solo se permiten
  // los cambios de ORIGENES.
  const { data, error } = await admin
    .from("reservaciones")
    .update({ estado })
    .eq("id", id)
    .in("estado", ORIGENES[estado])
    .select("id, estado");

  if (error) {
    console.error("Error actualizando estado:", error);
    return res.status(500).json({ error: "No se pudo actualizar. Intenta de nuevo." });
  }
  if (!data || data.length === 0) {
    return res.status(409).json({ error: "Esa cita cambió de estado. Toca Actualizar e intenta de nuevo." });
  }
  return res.status(200).json({ ok: true, estado });
}
