// Constantes del programa de crecimiento (compartidas por app y servidor).
// Descuento para el amigo invitado en su primer mantenimiento, y crédito para
// quien lo invitó cuando ese amigo paga. Cámbialos aquí si quieres.
export const DESCUENTO_BIENVENIDA_CENTAVOS = 10000; // $100
export const CREDITO_POR_AMIGO_CENTAVOS = 10000; // $100
// Stripe no cobra menos de esto: el descuento nunca deja el pago por debajo.
export const COBRO_MINIMO_CENTAVOS = 10000; // $100

// "Vivero Coyoacán" → "vivero-coyoacan"
export function slugDe(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const esSlugValido = (s) => typeof s === "string" && /^[a-z0-9-]{2,40}$/.test(s);
export const esCodigoValido = (c) => typeof c === "string" && /^[A-Z2-9]{6}$/.test(c);
