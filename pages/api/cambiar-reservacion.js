// La persona cambia la fecha u hora de su cita desde la app (sin costo,
// hasta 24 h antes y si el nuevo horario está libre).
import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";
import { obtenerHorasOcupadas } from "../../lib/horariosOcupados";
import { puedeCambiarFecha } from "../../lib/politicaCancelacion";
import { HORARIOS_DISPONIBLES, DIAS_MAXIMOS_ANTICIPACION } from "../../lib/servicio";
import { diaCDMX, diasEntre, esFechaValida, esFinDeSemana } from "../../lib/fechas";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const usuario = await obtenerUsuario(req);
  if (!usuario) return res.status(401).json({ error: "Inicia sesión para continuar." });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Falta configurar el servidor." });

  const { id, fecha, hora } = req.body || {};
  if (typeof id !== "string" || !id) return res.status(400).json({ error: "Falta la reservación." });
  if (!esFechaValida(fecha) || !esFinDeSemana(fecha)) return res.status(400).json({ error: "Elige un sábado o domingo." });
  const dias = diasEntre(diaCDMX(), fecha);
  if (dias < 1 || dias > DIAS_MAXIMOS_ANTICIPACION) return res.status(400).json({ error: "Elige una fecha a partir de mañana." });
  if (!HORARIOS_DISPONIBLES.includes(hora)) return res.status(400).json({ error: "Horario no disponible." });

  const admin = clienteAdmin();
  try {
    const { data: r, error } = await admin.from("reservaciones").select("*").eq("id", id).eq("user_id", usuario.id).maybeSingle();
    if (error) throw error;
    if (!r) return res.status(404).json({ error: "No encontramos esa reservación." });
    if (!puedeCambiarFecha(r)) {
      return res.status(400).json({ error: "Solo se puede cambiar hasta 24 horas antes de la cita. Escríbenos por WhatsApp." });
    }
    if (r.fecha === fecha && r.hora === hora) return res.status(400).json({ error: "Esa ya es la fecha de tu cita." });

    const ocupadas = await obtenerHorasOcupadas(admin, fecha);
    if (ocupadas.includes(hora)) return res.status(409).json({ error: "Ese horario ya está ocupado. Elige otro." });

    const { data, error: updError } = await admin
      .from("reservaciones")
      .update({ fecha, hora })
      .eq("id", id)
      .eq("estado", "pagado")
      .select()
      .maybeSingle();
    if (updError) {
      if (updError.code === "23505") return res.status(409).json({ error: "Ese horario se acaba de ocupar. Elige otro." });
      throw updError;
    }
    if (!data) return res.status(409).json({ error: "Esta reservación cambió. Recarga e intenta de nuevo." });
    return res.status(200).json({ reservacion: data, mensaje: "Listo, cambiamos tu cita." });
  } catch (err) {
    console.error("Error cambiando cita:", err);
    return res.status(500).json({ error: "No pudimos cambiar tu cita. Intenta de nuevo." });
  }
}
