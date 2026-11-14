// Códigos de descuento: reglas que comparten el panel, la app y el servidor.
export const MAX_PORCENTAJE = 90;

// " buen fin 20 " → "BUENFIN20"
export function limpiarCodigo(texto) {
  return String(texto || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
}
export const codigoValido = (c) => /^[A-Z0-9]{3,20}$/.test(c || "");

// Cuánto descuenta un código sobre un precio (en centavos).
export function montoCupon(cupon, precio) {
  if (!cupon || !precio) return 0;
  const bruto = cupon.tipo === "porcentaje" ? Math.round((precio * cupon.valor) / 100) : cupon.valor;
  return Math.max(0, Math.min(bruto, precio));
}

export function describirCupon(c) {
  return c.tipo === "porcentaje" ? `${c.valor}% de descuento` : `$${Math.round(c.valor / 100).toLocaleString("es-MX")} de descuento`;
}
