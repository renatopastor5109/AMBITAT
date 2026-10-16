// La persona cambia la fecha u hora de su cita desde la app (sin costo,
// hasta 24 h antes y si el nuevo horario está libre).
import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";
import { obtenerHorasOcupadas } from "../../lib/horariosOcupados";
import { obtenerAgenda } from "../../lib/agendaServidor";
import { actualizarConExtras } from "../../lib/columnasOpcionales";
import { diaPermitido } from "../../lib/agenda";
import { puedeCambiarFecha } from "../../lib/politicaCancelacion";
import { DIAS_MAXIMOS_ANTICIPACION } from "../../lib/servicio";
import { diaCDMX, diasEntre, esFechaValida } from "../../lib/fechas";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const usuario = await obtenerUsuario(req);
  if (!usuario) return res.status(401).json({ error: "Inicia sesión para continuar." });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Falta configurar el servidor." });

  const { id, fecha, hora } = req.body || {};
  if (typeof id !== "string" || !id) return res.status(400).json({ error: "Falta la reservación." });
  if (!esFechaValida(fecha)) return res.status(400).json({ error: "Fecha inválida." });

  const admin = clienteAdmin();
  try {
    const agenda = await obtenerAgenda(admin);
    const dias = diasEntre(diaCDMX(), fecha);
    if (!diaPermitido(agenda, fecha) || dias < agenda.anticipacionDias || dias > DIAS_MAXIMOS_ANTICIPACION) {
      return res.status(400).json({ error: "Esa fecha no está disponible. Elige otra." });
    }
    if (!agenda.horarios.includes(hora)) return res.status(400).json({ error: "Horario no disponible." });

    const { data: r, error } = await admin.from("reservaciones").select("*").eq("id", id).eq("user_id", usuario.id).maybeSingle();
    if (error) throw error;
    if (!r) return res.status(404).json({ error: "No encontramos esa reservación." });
    if (!puedeCambiarFecha(r)) {
      return res.status(400).json({ error: "Solo se puede cambiar hasta 24 horas antes de la cita. Escríbenos por WhatsApp." });
    }
    if (r.fecha === fecha && r.hora === hora) return res.status(400).json({ error: "Esa ya es la fecha de tu cita." });

    // Su propia cita no cuenta (la está moviendo).
    const ocupadas = await obtenerHorasOcupadas(admin, fecha, agenda, { excluirId: id });
    if (ocupadas.includes(hora)) return res.status(409).json({ error: "Ese horario ya está ocupado. Elige otro." });

    // Se guarda la primera fecha agendada (para la política de reembolso).
    const extras = r.fecha_original ? {} : { fecha_original: r.fecha, hora_original: r.hora };
    const { data, error: updError } = await actualizarConExtras(
      (campos) => admin.from("reservaciones").update(campos).eq("id", id).eq("estado", "pagado").select().maybeSingle(),
      { fecha, hora },
      extras
    );
    if (updError) throw updError;
    if (!data) return res.status(409).json({ error: "Esta reservación cambió. Recarga e intenta de nuevo." });

    // Si otra persona tomó el último lugar al mismo instante, se regresa como estaba.
    const despues = await obtenerHorasOcupadas(admin, fecha, agenda, { excluirId: id });
    if (despues.includes(hora)) {
      await admin.from("reservaciones").update({ fecha: r.fecha, hora: r.hora }).eq("id", id);
      return res.status(409).json({ error: "Ese horario se acaba de ocupar. Elige otro." });
    }
    return res.status(200).json({ reservacion: data, mensaje: "Listo, cambiamos tu cita." });
  } catch (err) {
    console.error("Error cambiando cita:", err);
    return res.status(500).json({ error: "No pudimos cambiar tu cita. Intenta de nuevo." });
  }
}
