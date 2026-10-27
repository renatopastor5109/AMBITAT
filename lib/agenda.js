// Tu agenda: cuántas visitas aceptas, qué días y a qué horas. Se configura
// en /admin → Servicio y la usan la app (para mostrar solo lo disponible) y el
// servidor (que es quien decide de verdad).
import { HORARIOS_DISPONIBLES, DIAS_MAXIMOS_ANTICIPACION } from "./servicio";
import { diaCDMX, diaSemana, sumarDias, esFechaValida } from "./fechas";

// Todas las horas que se pueden activar, en orden.
export const HORARIOS_POSIBLES = [
  "8:00 am", "9:00 am", "10:00 am", "11:00 am", "12:00 pm", "1:00 pm",
  "2:00 pm", "3:00 pm", "4:00 pm", "5:00 pm", "6:00 pm",
];

// 0 = domingo ... 6 = sábado
export const NOMBRES_DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export const AGENDA_INICIAL = {
  capacidadPorHorario: 1, // visitas a la misma hora (eres una persona: 1)
  maximoPorDia: 3, // visitas en total por día
  diasSemana: [6, 0], // sábado y domingo
  horarios: [...HORARIOS_DISPONIBLES],
  fechasBloqueadas: [], // vacaciones, días que no puedes
  anticipacionDias: 1, // reservar desde mañana
};

const entero = (v, min, max, def) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

// Revisa y completa una agenda (lo que venga de la base de datos o del panel).
export function normalizarAgenda(a) {
  const x = a && typeof a === "object" ? a : {};
  const dias = Array.isArray(x.diasSemana)
    ? [...new Set(x.diasSemana.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
    : [...AGENDA_INICIAL.diasSemana].sort((a, b) => a - b);
  const horas = Array.isArray(x.horarios) ? HORARIOS_POSIBLES.filter((h) => x.horarios.includes(h)) : AGENDA_INICIAL.horarios;
  const hoy = diaCDMX();
  const bloqueadas = Array.isArray(x.fechasBloqueadas)
    ? [...new Set(x.fechasBloqueadas.filter((f) => esFechaValida(f) && f >= hoy))].sort().slice(0, 200)
    : [];
  return {
    capacidadPorHorario: entero(x.capacidadPorHorario, 1, 10, AGENDA_INICIAL.capacidadPorHorario),
    maximoPorDia: entero(x.maximoPorDia, 1, 30, AGENDA_INICIAL.maximoPorDia),
    diasSemana: dias,
    horarios: horas,
    fechasBloqueadas: bloqueadas,
    anticipacionDias: entero(x.anticipacionDias, 1, 14, AGENDA_INICIAL.anticipacionDias),
  };
}

// ¿Ese día se trabaja? (día de la semana activo y no bloqueado)
export function diaPermitido(agenda, fecha) {
  return esFechaValida(fecha) && agenda.diasSemana.includes(diaSemana(fecha)) && !agenda.fechasBloqueadas.includes(fecha);
}

// Fechas que se pueden reservar desde hoy (sin contar si ya están llenas).
export function fechasPosibles(agenda, hoy = diaCDMX()) {
  const lista = [];
  for (let i = agenda.anticipacionDias; i <= DIAS_MAXIMOS_ANTICIPACION; i++) {
    const d = sumarDias(hoy, i);
    if (diaPermitido(agenda, d)) lista.push(d);
  }
  return lista;
}
