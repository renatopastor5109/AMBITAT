// Reglas para cancelar o cambiar una cita. Las usan la app (para explicarle
// a la persona qué le toca) y el servidor (que es quien decide de verdad).
// Coinciden con /terminos sección 8.5.
import { diaCDMX, diasEntre, diaSemana, sumarDias } from "./fechas";

export const HORAS_REEMBOLSO_TOTAL = 48; // cancelar con 48 h o más → 100%
export const PORCENTAJE_TARDIO = 50; // con menos de 48 h → 50%
export const DIAS_HABILES_RETRACTO = 5; // 5 días hábiles después de pagar → 100%
export const HORAS_MINIMAS_CAMBIO = 24; // cambiar fecha: hasta 24 h antes

// "1:00 pm" → minutos desde medianoche
export function minutosDeHora(h) {
  const m = /(\d+):(\d+)\s*(am|pm)/i.exec(h || "");
  if (!m) return 0;
  let hh = parseInt(m[1], 10) % 12;
  if (m[3].toLowerCase() === "pm") hh += 12;
  return hh * 60 + parseInt(m[2], 10);
}

// Momento exacto de la cita. CDMX es UTC-6 todo el año (sin horario de verano).
export function inicioCita(fecha, hora) {
  const [y, mo, d] = fecha.split("-").map(Number);
  return Date.UTC(y, mo - 1, d, 6, 0) + minutosDeHora(hora) * 60 * 1000;
}

// Días hábiles (lunes a viernes) que han pasado desde el pago hasta hoy.
function diasHabilesDesde(isoPago, ahora) {
  const desde = diaCDMX(new Date(isoPago));
  const hoy = diaCDMX(new Date(ahora));
  const total = diasEntre(desde, hoy);
  let habiles = 0;
  for (let i = 1; i <= total; i++) {
    const dia = diaSemana(sumarDias(desde, i));
    if (dia !== 0 && dia !== 6) habiles++;
  }
  return habiles;
}

export function horasParaLaCita(r, ahora = Date.now()) {
  return (inicioCita(r.fecha, r.hora) - ahora) / (60 * 60 * 1000);
}

// ¿Se puede cancelar y cuánto se devuelve?
export function politicaCancelacion(r, ahora = Date.now()) {
  if (r.estado === "pendiente_pago") return { puede: true, sinCobro: true, porcentaje: 0, monto: 0 };
  if (r.estado !== "pagado") return { puede: false, motivo: "Esta cita ya no se puede cancelar desde la app." };
  const horas = horasParaLaCita(r, ahora);
  if (horas <= 0) return { puede: false, motivo: "La hora de la cita ya pasó. Si hubo un problema, escríbenos." };
  const enRetracto = r.created_at && diasHabilesDesde(r.created_at, ahora) <= DIAS_HABILES_RETRACTO;
  const porcentaje = horas >= HORAS_REEMBOLSO_TOTAL || enRetracto ? 100 : PORCENTAJE_TARDIO;
  return {
    puede: true,
    porcentaje,
    monto: Math.round(((r.precio_centavos || 0) * porcentaje) / 100),
    razon: horas >= HORAS_REEMBOLSO_TOTAL ? "anticipacion" : enRetracto ? "retracto" : "tardia",
  };
}

export function puedeCambiarFecha(r, ahora = Date.now()) {
  return r.estado === "pagado" && horasParaLaCita(r, ahora) >= HORAS_MINIMAS_CAMBIO;
}
