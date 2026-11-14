// Solo SERVIDOR: revisa si un código de descuento sirve para esta persona y
// lleva la cuenta de cuántas veces se ha usado.
import { limpiarCodigo, codigoValido, montoCupon, describirCupon } from "./cupones";
import { apartaHorario } from "./horariosOcupados";
import { diaCDMX } from "./fechas";

const NO_SIRVE = "Ese código no existe o ya no está vigente.";

// Reservaciones esperando pago (todavía apartadas) que ya llevan este código.
async function apartadasCon(admin, codigo, userId) {
  let q = admin.from("reservaciones").select("id, user_id, estado, metodo_pago, created_at, cupon").eq("estado", "pendiente_pago").eq("cupon", codigo);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) return [];
  return (data || []).filter((r) => apartaHorario(r));
}

/**
 * maximo: cuánto se puede descontar como mucho (precio − otros descuentos − cobro mínimo).
 * Regresa { ok: true, codigo, monto, descripcion } o { ok: false, error }.
 */
export async function validarCupon(admin, texto, userId, precio, maximo) {
  const codigo = limpiarCodigo(texto);
  if (!codigoValido(codigo)) return { ok: false, error: NO_SIRVE };
  const { data: cupon, error } = await admin.from("cupones").select("*").eq("codigo", codigo).maybeSingle();
  if (error || !cupon || !cupon.activo) return { ok: false, error: NO_SIRVE };
  if (cupon.vence && cupon.vence < diaCDMX()) return { ok: false, error: "Ese código ya venció." };

  if (cupon.usos_max) {
    const [{ count }, apartadas] = await Promise.all([
      admin.from("cupones_usos").select("id", { count: "exact", head: true }).eq("codigo", codigo),
      apartadasCon(admin, codigo, null),
    ]);
    if ((count || 0) + apartadas.filter((r) => r.user_id !== userId).length >= cupon.usos_max) {
      return { ok: false, error: "Ese código ya se terminó." };
    }
  }
  if (cupon.una_por_persona) {
    const [{ count }, mias] = await Promise.all([
      admin.from("cupones_usos").select("id", { count: "exact", head: true }).eq("codigo", codigo).eq("user_id", userId),
      apartadasCon(admin, codigo, userId),
    ]);
    if ((count || 0) > 0) return { ok: false, error: "Ya usaste este código." };
    if (mias.length > 0) return { ok: false, error: "Ya tienes una reservación esperando pago con este código. Págala o cancélala desde “Tus reservaciones” para usarlo otra vez." };
  }
  if (cupon.solo_nuevos) {
    const { count } = await admin
      .from("reservaciones")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("estado", ["pagado", "completado", "conflicto"]);
    if ((count || 0) > 0) return { ok: false, error: "Este código es solo para tu primer mantenimiento." };
  }

  const monto = Math.min(montoCupon(cupon, precio), Math.max(0, maximo));
  if (monto <= 0) return { ok: false, error: "Tu reservación ya tiene el descuento máximo." };
  return { ok: true, codigo, monto, descripcion: describirCupon(cupon) };
}

// Al pagar: se anota el uso (una vez por reservación).
export async function registrarUsoCupon(admin, reservacion) {
  if (!reservacion?.cupon) return;
  try {
    const { error } = await admin.from("cupones_usos").insert({
      codigo: reservacion.cupon,
      user_id: reservacion.user_id,
      reservacion_id: reservacion.id,
      descuento_centavos: reservacion.descuento_cupon_centavos || 0,
    });
    if (error && error.code !== "23505") console.error("No se pudo anotar el uso del código:", error.message);
  } catch (err) {
    console.error("No se pudo anotar el uso del código:", err.message);
  }
}

// Si cancela y se le reembolsa: el código se le libera.
export async function liberarCupon(admin, reservacion) {
  if (!reservacion?.cupon) return;
  try {
    await admin.from("cupones_usos").delete().eq("reservacion_id", reservacion.id);
  } catch (err) {
    console.error("No se pudo liberar el código:", err.message);
  }
}
