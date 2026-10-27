// Solo SERVIDOR: lee y guarda la agenda en la tabla "configuracion".
import { normalizarAgenda, AGENDA_INICIAL } from "./agenda";
import { normalizarPrecios } from "./servicio";
import { normalizarZonas } from "./negocio";

// estricto: en el panel, si falla la lectura se avisa (para no guardar encima
// los valores de fábrica por accidente). Solo se usan los de fábrica si la
// tabla todavía no existe.
export async function obtenerAgenda(admin, { estricto = false } = {}) {
  const { data, error } = await admin.from("configuracion").select("valor").eq("clave", "agenda").maybeSingle();
  if (error) {
    const sinTabla = error.code === "42P01" || error.code === "PGRST205" || /configuracion/.test(error.message || "");
    if (estricto && !sinTabla) throw error;
    // Si todavía no se corre el SQL, se usa la agenda de siempre.
    console.error("No se pudo leer la agenda (¿falta supabase-revision-3.sql?):", error.message);
    return normalizarAgenda(AGENDA_INICIAL);
  }
  return normalizarAgenda(data?.valor || AGENDA_INICIAL);
}

export async function guardarAgenda(admin, agenda) {
  const valor = normalizarAgenda(agenda);
  const { error } = await admin
    .from("configuracion")
    .upsert({ clave: "agenda", valor, updated_at: new Date().toISOString() }, { onConflict: "clave" });
  if (error) throw error;
  return valor;
}

// ---------- Precios del mantenimiento ----------
export async function obtenerPrecios(admin, { estricto = false } = {}) {
  const { data, error } = await admin.from("configuracion").select("valor").eq("clave", "precios").maybeSingle();
  if (error) {
    const sinTabla = error.code === "42P01" || error.code === "PGRST205" || /configuracion/.test(error.message || "");
    if (estricto && !sinTabla) throw error;
    console.error("No se pudieron leer los precios (se usan los de siempre):", error.message);
  }
  return normalizarPrecios(data?.valor);
}

export async function guardarPrecios(admin, precios) {
  const valor = normalizarPrecios(precios);
  const { error } = await admin
    .from("configuracion")
    .upsert({ clave: "precios", valor, updated_at: new Date().toISOString() }, { onConflict: "clave" });
  if (error) throw error;
  return valor;
}

// ---------- Zonas donde das servicio (página /conoce) ----------
export async function obtenerZonas(admin, { estricto = false } = {}) {
  const { data, error } = await admin.from("configuracion").select("valor").eq("clave", "zonas").maybeSingle();
  if (error) {
    const sinTabla = error.code === "42P01" || error.code === "PGRST205" || /configuracion/.test(error.message || "");
    if (estricto && !sinTabla) throw error;
    console.error("No se pudieron leer las zonas:", error.message);
  }
  return normalizarZonas(data?.valor);
}

export async function guardarZonas(admin, zonas) {
  const valor = normalizarZonas(zonas);
  const { error } = await admin
    .from("configuracion")
    .upsert({ clave: "zonas", valor, updated_at: new Date().toISOString() }, { onConflict: "clave" });
  if (error) throw error;
  return valor;
}
