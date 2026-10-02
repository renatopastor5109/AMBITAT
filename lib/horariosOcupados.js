// Solo se usa en el SERVIDOR. Devuelve las horas que ya están tomadas en una
// fecha, para que dos clientes no reserven el mismo horario.
//
// Cuenta como ocupado:
//  - citas pagadas o completadas
//  - citas "pendiente_pago" que sí iniciaron un pago en los últimos 3 días
//    (así el horario queda apartado mientras la persona paga en OXXO, pero
//    los intentos abandonados no bloquean el horario para siempre).
export async function obtenerHorasOcupadas(admin, fecha, excluirId = null) {
  const hace3Dias = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const { data, error } = await admin
    .from("reservaciones")
    .select("id, hora, estado, stripe_session_id, created_at")
    .eq("fecha", fecha)
    .in("estado", ["pagado", "completado", "pendiente_pago"]);

  if (error) throw error;

  const horas = new Set();
  (data || []).forEach((r) => {
    if (r.id === excluirId) return;
    if (r.estado === "pendiente_pago" && (!r.stripe_session_id || new Date(r.created_at).getTime() < hace3Dias)) return;
    horas.add(r.hora);
  });
  return [...horas];
}
