// Disponibilidad para la Tienda (sin nombres ni direcciones de otros clientes).
//  - Sin ?fecha: qué fechas se pueden reservar, cuántos lugares quedan en cada
//    una, cuáles ya están llenas y los precios vigentes.
//  - Con ?fecha=YYYY-MM-DD: además, qué horas de ese día ya no están libres
//    (&excluir=<id> con sesión: sin contar esa cita propia, para cambiarla).
import { clienteAdmin, obtenerUsuario } from "../../lib/usuarioServidor";
import { obtenerAgenda, obtenerPrecios } from "../../lib/agendaServidor";
import { tamanosConPrecios } from "../../lib/servicio";
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
    const [agenda, precios] = await Promise.all([obtenerAgenda(admin), obtenerPrecios(admin)]);
    const { fechas, diasLlenos, libres } = await disponibilidadGeneral(admin, agenda);
    const respuesta = { horarios: agenda.horarios, fechas, diasLlenos, libres, tamanos: tamanosConPrecios(precios) };
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
