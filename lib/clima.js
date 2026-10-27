// Solo SERVIDOR: pronóstico de la Ciudad de México (Open-Meteo, gratis y sin
// llave) convertido en avisos para las plantas: noche fría, calor fuerte o
// lluvia fuerte.

const URL_PRONOSTICO =
  "https://api.open-meteo.com/v1/forecast?latitude=19.4326&longitude=-99.1332" +
  "&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max" +
  "&timezone=America%2FMexico_City&forecast_days=3";

export async function pronosticoCDMX() {
  const controlador = new AbortController();
  const t = setTimeout(() => controlador.abort(), 5000);
  try {
    const r = await fetch(URL_PRONOSTICO, { signal: controlador.signal });
    if (!r.ok) return null;
    const d = await r.json();
    const dias = d?.daily?.time || [];
    return dias.map((fecha, i) => ({
      fecha,
      min: d.daily.temperature_2m_min?.[i],
      max: d.daily.temperature_2m_max?.[i],
      lluvia: d.daily.precipitation_sum?.[i],
      probLluvia: d.daily.precipitation_probability_max?.[i],
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Aviso para un día del pronóstico (o null si el clima no pide nada especial).
export function avisoDelDia(dia, cuando = "Hoy") {
  if (!dia) return null;
  const min = Math.round(dia.min);
  const max = Math.round(dia.max);
  if (Number.isFinite(min) && min <= 5) {
    return {
      tipo: "frio",
      emoji: "🥶",
      titulo: `${cuando}: noche muy fría (${min} °C)`,
      texto: "Mete o cubre las plantas que tengas afuera, sobre todo hierbas y tropicales, y no las riegues en la noche.",
    };
  }
  if (Number.isFinite(dia.lluvia) && dia.lluvia >= 15) {
    return {
      tipo: "lluvia",
      emoji: "⛈️",
      titulo: `${cuando}: lluvia fuerte`,
      texto: "No riegues las plantas de afuera y revisa que sus macetas drenen bien. Protege suculentas y cactus.",
    };
  }
  if (Number.isFinite(max) && max >= 29) {
    return {
      tipo: "calor",
      emoji: "🔥",
      titulo: `${cuando}: mucho calor (${max} °C)`,
      texto: "Revisa la tierra de tus macetas: con este calor se secan rápido. Riega temprano y aleja las plantas del sol directo de mediodía.",
    };
  }
  return null;
}

// El aviso más útil: el de mañana (para prepararse) o, si no hay, el de hoy.
export function avisoClima(pronostico) {
  if (!pronostico?.length) return null;
  return avisoDelDia(pronostico[1], "Mañana") || avisoDelDia(pronostico[0], "Hoy");
}
