// Fechas siempre en hora de la Ciudad de México, para que "hoy" signifique lo
// mismo en el celular, en el servidor de Vercel (que corre en UTC) y en el cron.
const ZONA = "America/Mexico_City";

// "YYYY-MM-DD" del día en CDMX para una fecha dada (por defecto, ahora).
export function diaCDMX(fecha = new Date()) {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(fecha);
}

// Días de calendario entre dos "YYYY-MM-DD" (b - a).
export function diasEntre(a, b) {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

// Suma días a un "YYYY-MM-DD".
export function sumarDias(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}

// 0 = domingo ... 6 = sábado, para un "YYYY-MM-DD".
export function diaSemana(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function esFinDeSemana(iso) {
  const d = diaSemana(iso);
  return d === 0 || d === 6;
}

export function esFechaValida(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

// Fecha del último riego/foto de una planta, a partir de su historial.
function fechaUltimaFoto(historial) {
  if (!historial || historial.length === 0) return null;
  const last = historial[historial.length - 1];
  if (last.dateISO) {
    const f = new Date(last.dateISO);
    return isNaN(f) ? null : f;
  }
  if (last.date) {
    const parts = last.date.split("/"); // formato es-MX: DD/MM/YYYY
    if (parts.length === 3) {
      const f = new Date(Date.UTC(+parts[2], +parts[1] - 1, +parts[0], 18)); // mediodía CDMX
      return isNaN(f) ? null : f;
    }
  }
  return null;
}

// Última vez que se regó: la foto más reciente o el botón "Ya la regué",
// lo que haya sido después.
function fechaUltimoRiego(historial, ultimoRiego) {
  const foto = fechaUltimaFoto(historial);
  const boton = ultimoRiego ? new Date(ultimoRiego) : null;
  if (boton && !isNaN(boton) && (!foto || boton > foto)) return boton;
  return foto;
}

// Días de calendario desde el último riego (null si no se sabe).
export function diasDesdeRiego(historial, ultimoRiego) {
  const ultima = fechaUltimoRiego(historial, ultimoRiego);
  if (!ultima) return null;
  return diasEntre(diaCDMX(ultima), diaCDMX());
}

// Cuántos días de calendario (en CDMX) faltan para el próximo riego.
// 0 = toca hoy, negativo = ya se pasó, null = no se sabe.
export function diasParaRiego(diasEntreRiegos, historial, ultimoRiego = null) {
  if (!diasEntreRiegos) return null;
  const ultima = fechaUltimoRiego(historial, ultimoRiego);
  if (!ultima) return null;
  const transcurridos = diasEntre(diaCDMX(ultima), diaCDMX());
  return diasEntreRiegos - transcurridos;
}

// Días de calendario desde la última foto (null si no hay).
export function diasDesdeUltimaFoto(historial) {
  const ultima = fechaUltimaFoto(historial);
  if (!ultima) return null;
  return diasEntre(diaCDMX(ultima), diaCDMX());
}
