// Disponibilidad para la Tienda (sin nombres ni direcciones de otros clientes).
//  - Sin ?fecha: qué fechas se pueden reservar y cuáles ya están llenas.
//  - Con ?fecha=YYYY-MM-DD: además, qué horas de ese día ya no están libres
//    (&excluir=<id> con sesión: sin contar esa cita propia, para cambiarla).
import { clienteAdmin, obtenerUsuario } from "../../lib/usuarioServidor";
import { obtenerAgenda } from "../../lib/agendaServidor";
import { disponibilidadGeneral, obtenerHorasOcupadas } from "../../lib/horariosOcupados";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }
  const fecha = req.query.fecha;
  if (fecha !== undefined && (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha))) {
    return res.status(400).json({ error: "Fecha inválida" });
  }

  try {
    const admin = clienteAdmin();
    const agenda = await obtenerAgenda(admin);
    const { fechas, diasLlenos } = await disponibilidadGeneral(admin, agenda);
    const respuesta = { horarios: agenda.horarios, fechas, diasLlenos };
    if (fecha) {
      // Al cambiar su cita, la de la propia persona no cuenta como ocupada.
      let excluirId = null;
      if (typeof req.query.excluir === "string" && req.query.excluir) {
        const usuario = await obtenerUsuario(req);
        if (usuario) {
          const { data } = await admin.from("reservaciones").select("id").eq("id", req.query.excluir).eq("user_id", usuario.id).maybeSingle();
          excluirId = data?.id || null;
        }
      }
      respuesta.ocupadas = await obtenerHorasOcupadas(admin, fecha, agenda, { excluirId });
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(respuesta);
  } catch (err) {
    console.error("Error leyendo horarios:", err);
    return res.status(500).json({ error: "No se pudieron revisar los horarios" });
  }
}
