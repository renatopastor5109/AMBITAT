// Solo se usa en el SERVIDOR. Decide qué horarios están disponibles según tu
// agenda (lib/agenda.js): visitas por horario, máximo por día, días y horas
// que trabajas y días bloqueados.
//
// Una cita "aparta" lugar si:
//  - está pagada o completada, o
//  - está "pendiente_pago" y sigue viva:
//      · alguien está en la página de pago (los primeros minutos; la sesión
//        de Stripe vence sola a los ~31 min; se aparta 40 por margen), o
//      · ya sacó su ficha de OXXO (metodo_pago = "oxxo"): se aparta varios
//        días porque la ficha dura 2 días y Stripe puede tardar 1 día hábil.
import { HORARIOS_POSIBLES, diaPermitido, fechasPosibles } from "./agenda";
import { diaCDMX, sumarDias } from "./fechas";
import { DIAS_MAXIMOS_ANTICIPACION } from "./servicio";

export const MINUTOS_PAGO_EN_CURSO = 40;
export const DIAS_APARTADO_OXXO = 5;

export function apartaHorario(r, ahora = Date.now()) {
  if (r.estado === "pagado" || r.estado === "completado") return true;
  if (r.estado !== "pendiente_pago") return false;
  const edad = ahora - new Date(r.created_at).getTime();
  if (r.metodo_pago === "oxxo") return edad < DIAS_APARTADO_OXXO * 24 * 60 * 60 * 1000;
  return edad < MINUTOS_PAGO_EN_CURSO * 60 * 1000;
}

export async function citasEnRango(admin, desde, hasta) {
  const { data, error } = await admin
    .from("reservaciones")
    .select("id, fecha, hora, estado, metodo_pago, created_at")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .in("estado", ["pagado", "completado", "pendiente_pago"]);
  if (error) throw error;
  return data || [];
}

// Horas NO disponibles de una fecha (todas, si el día no se trabaja o ya está lleno).
export function horasNoDisponibles(citas, fecha, agenda, { excluirId = null, ahora = Date.now() } = {}) {
  if (!diaPermitido(agenda, fecha)) return [...HORARIOS_POSIBLES];
  const vivas = citas.filter((r) => r.fecha === fecha && r.id !== excluirId && apartaHorario(r, ahora));
  if (vivas.length >= agenda.maximoPorDia) return [...HORARIOS_POSIBLES];
  const porHora = {};
  vivas.forEach((r) => (porHora[r.hora] = (porHora[r.hora] || 0) + 1));
  return HORARIOS_POSIBLES.filter((h) => !agenda.horarios.includes(h) || (porHora[h] || 0) >= agenda.capacidadPorHorario);
}

export async function obtenerHorasOcupadas(admin, fecha, agenda, opciones) {
  return horasNoDisponibles(await citasEnRango(admin, fecha, fecha), fecha, agenda, opciones);
}

// Fechas reservables y cuáles ya no tienen ninguna hora libre.
export async function disponibilidadGeneral(admin, agenda) {
  const hoy = diaCDMX();
  const fechas = fechasPosibles(agenda, hoy);
  if (fechas.length === 0) return { fechas, diasLlenos: [], libres: {} };
  const citas = await citasEnRango(admin, fechas[0], sumarDias(hoy, DIAS_MAXIMOS_ANTICIPACION));
  const ahora = Date.now();
  // Lugares que quedan por día: horas libres, sin pasar del máximo por día.
  const libres = {};
  fechas.forEach((f) => {
    const no = horasNoDisponibles(citas, f, agenda, { ahora });
    const horasLibres = agenda.horarios.filter((h) => !no.includes(h)).length;
    const vivas = citas.filter((r) => r.fecha === f && apartaHorario(r, ahora)).length;
    libres[f] = Math.max(0, Math.min(horasLibres * agenda.capacidadPorHorario, agenda.maximoPorDia - vivas));
  });
  const diasLlenos = fechas.filter((f) => libres[f] === 0);
  return { fechas, diasLlenos, libres };
}

// Después de guardar una reservación: ¿ya no cabía porque otras personas
// apartaron antes (al mismo segundo)? Gana quien llegó primero.
export async function horaGanadaPorOtra(admin, reservacion, agenda) {
  const ahora = Date.now();
  const propia = new Date(reservacion.created_at).getTime();
  const antes = (await citasEnRango(admin, reservacion.fecha, reservacion.fecha)).filter((r) => {
    if (r.id === reservacion.id || !apartaHorario(r, ahora)) return false;
    const otra = new Date(r.created_at).getTime();
    return otra < propia || (otra === propia && r.id < reservacion.id);
  });
  const mismaHora = antes.filter((r) => r.hora === reservacion.hora).length;
  return mismaHora >= agenda.capacidadPorHorario || antes.length >= agenda.maximoPorDia;
}

// Para el aviso de Stripe: ¿todavía cabe esta cita pagada? (sin contarse a sí misma)
export async function cabeCitaPagada(admin, reservacion, agenda) {
  const citas = (await citasEnRango(admin, reservacion.fecha, reservacion.fecha)).filter(
    (r) => r.id !== reservacion.id && (r.estado === "pagado" || r.estado === "completado")
  );
  const mismaHora = citas.filter((r) => r.hora === reservacion.hora).length;
  return mismaHora < agenda.capacidadPorHorario && citas.length < agenda.maximoPorDia;
}
