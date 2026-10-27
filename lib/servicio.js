// Datos del servicio de mantenimiento, compartidos por la app y el servidor.
// El servidor es quien decide el precio: aunque alguien modifique la app en
// su navegador, siempre se cobra lo que diga aquí.

// Tamaños de jardín y su precio (en centavos, como los pide Stripe).
// Para cambiar un precio o lo que incluye, edita solo esta lista.
export const TAMANOS = [
  {
    key: "pequeno",
    nombre: "Pequeño",
    precio: 75000, // $750.00 MXN
    incluye: ["Hasta 10 plantas", "Visita de ~1 hora", "Riego, poda ligera y limpieza de hojas", "Revisión de plagas"],
  },
  {
    key: "mediano",
    nombre: "Mediano",
    precio: 95000, // $950.00 MXN
    incluye: ["De 11 a 25 plantas", "Visita de ~2 horas", "Todo lo del pequeño", "Abono y cambio de tierra ligero"],
  },
  {
    key: "grande",
    nombre: "Grande",
    precio: 115000, // $1,150.00 MXN
    incluye: ["Más de 25 plantas o jardín vertical", "Visita de ~3 horas", "Todo lo del mediano", "Plan de cuidado por escrito"],
  },
];

export function tamanoPorClave(key) {
  return TAMANOS.find((t) => t.key === key) || null;
}


export const HORARIOS_DISPONIBLES = ["9:00 am", "11:00 am", "1:00 pm", "3:00 pm", "5:00 pm"];

// Hasta cuántos días adelante se puede reservar.
export const DIAS_MAXIMOS_ANTICIPACION = 90;

// "$1,150" a partir de centavos.
export function formatoPrecio(centavos) {
  return "$" + (centavos / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

// ---------- Precios editables desde /admin → Servicio ----------
// Se guardan como { pequeno: 75000, mediano: 95000, grande: 115000 } (centavos).
// Si un precio no está guardado, se usa el de la lista de arriba.
export const PRECIO_MINIMO = 10000; // $100
export const PRECIO_MAXIMO = 5000000; // $50,000

export function normalizarPrecios(p) {
  const salida = {};
  TAMANOS.forEach((t) => {
    const v = Math.round(Number(p?.[t.key]));
    salida[t.key] = Number.isFinite(v) && v >= PRECIO_MINIMO && v <= PRECIO_MAXIMO ? Math.round(v / 100) * 100 : t.precio;
  });
  return salida;
}

// La lista de tamaños con los precios vigentes.
export function tamanosConPrecios(precios) {
  const p = normalizarPrecios(precios);
  return TAMANOS.map((t) => ({ ...t, precio: p[t.key] }));
}
