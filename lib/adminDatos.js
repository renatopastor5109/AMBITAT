// Solo SERVIDOR: utilidades para las secciones del panel /admin.

// Trae todas las filas de una consulta (de 1000 en 1000).
export async function todasLasFilas(consulta, maxFilas = 20000) {
  const filas = [];
  for (let desde = 0; desde < maxFilas; desde += 1000) {
    const { data, error } = await consulta().range(desde, desde + 999);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return filas;
}

// Todas las cuentas de Supabase Auth (máx. 20 páginas de 1000).
export async function todosLosUsuarios(admin) {
  const usuarios = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const lista = data?.users || [];
    usuarios.push(...lista);
    if (lista.length < 1000) break;
  }
  return usuarios;
}

export const faltaTabla = (error) => ["42P01", "PGRST205", "42703", "PGRST204"].includes(error?.code);

// Lo que de verdad te quedó de una reservación (con reembolsos).
export function cobradoDe(r) {
  if (r.estado === "pagado" || r.estado === "completado" || r.estado === "conflicto") return r.precio_centavos || 0;
  if (r.estado === "cancelado" && r.pagado_en) return Math.max(0, (r.precio_centavos || 0) - (r.reembolso_centavos || 0));
  return 0;
}
