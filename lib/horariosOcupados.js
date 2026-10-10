// Solo se usa en el SERVIDOR. Decide qué horarios están tomados, para que
// dos clientes no reserven la misma hora.
//
// Un horario está tomado por:
//  - citas pagadas o completadas
//  - citas "pendiente_pago" que siguen "vivas":
//      · alguien está en la página de pago (los primeros minutos; la sesión
//        de Stripe vence sola a los 30 min), o
//      · ya sacó su ficha de OXXO (metodo_pago = "oxxo"): se aparta varios
//        días porque la ficha dura 2 días y Stripe puede tardar 1 día hábil
//        en confirmar el pago.
// Así los pagos abandonados ya no bloquean horarios.

export const MINUTOS_PAGO_EN_CURSO = 40;
export const DIAS_APARTADO_OXXO = 5;

export function apartaHorario(r, ahora = Date.now()) {
  if (r.estado === "pagado" || r.estado === "completado") return true;
  if (r.estado !== "pendiente_pago") return false;
  const edad = ahora - new Date(r.created_at).getTime();
  if (r.metodo_pago === "oxxo") return edad < DIAS_APARTADO_OXXO * 24 * 60 * 60 * 1000;
  return edad < MINUTOS_PAGO_EN_CURSO * 60 * 1000;
}

async function citasDelDia(admin, fecha) {
  const { data, error } = await admin
    .from("reservaciones")
    .select("id, hora, estado, metodo_pago, created_at")
    .eq("fecha", fecha)
    .in("estado", ["pagado", "completado", "pendiente_pago"]);
  if (error) throw error;
  return data || [];
}

export async function obtenerHorasOcupadas(admin, fecha) {
  const ahora = Date.now();
  const horas = new Set();
  (await citasDelDia(admin, fecha)).forEach((r) => {
    if (apartaHorario(r, ahora)) horas.add(r.hora);
  });
  return [...horas];
}

// Después de guardar una reservación: ¿alguien más apartó esa misma hora
// antes que ella? (por si dos personas reservan al mismo segundo).
export async function horaGanadaPorOtra(admin, reservacion) {
  const ahora = Date.now();
  const propia = new Date(reservacion.created_at).getTime();
  return (await citasDelDia(admin, reservacion.fecha)).some((r) => {
    if (r.id === reservacion.id || r.hora !== reservacion.hora || !apartaHorario(r, ahora)) return false;
    const otra = new Date(r.created_at).getTime();
    return otra < propia || (otra === propia && r.id < reservacion.id);
  });
}
