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

// El precio más bajo, para mostrar "Desde $750".
export const PRECIO_DESDE_CENTAVOS = Math.min(...TAMANOS.map((t) => t.precio));

export const HORARIOS_DISPONIBLES = ["9:00 am", "11:00 am", "1:00 pm", "3:00 pm", "5:00 pm"];

// Hasta cuántos días adelante se puede reservar.
export const DIAS_MAXIMOS_ANTICIPACION = 90;

// "$1,150" a partir de centavos.
export function formatoPrecio(centavos) {
  return "$" + (centavos / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 });
}
