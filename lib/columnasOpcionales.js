// Solo SERVIDOR. Algunas columnas se agregan con los archivos supabase-revision-*.sql.
// Si todavía no se corrió el SQL, se guarda lo esencial en vez de fallar.
export function faltaColumna(error) {
  return !!error && (error.code === "42703" || error.code === "PGRST204" || /column/i.test(error.message || ""));
}

// Actualiza con todos los campos; si falta alguna columna nueva, reintenta solo con los esenciales.
export async function actualizarConExtras(consulta, esenciales, extras) {
  let r = await consulta({ ...esenciales, ...extras });
  if (r.error && faltaColumna(r.error)) {
    console.error("Falta una columna nueva (¿corriste el SQL más reciente?):", r.error.message);
    r = await consulta(esenciales);
  }
  return r;
}
