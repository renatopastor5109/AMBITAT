// Solo SERVIDOR: códigos para invitar, créditos y descuentos.
import crypto from "crypto";
import { DESCUENTO_BIENVENIDA_CENTAVOS, CREDITO_POR_AMIGO_CENTAVOS, COBRO_MINIMO_CENTAVOS } from "./crecimiento";

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I para que no se confundan

function codigoNuevo() {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => LETRAS[b % LETRAS.length]).join("");
}

// Regresa el código de la persona (lo crea la primera vez).
export async function obtenerCodigo(admin, userId) {
  const { data, error } = await admin.from("codigos_referido").select("codigo").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data?.codigo) return data.codigo;
  for (let intento = 0; intento < 5; intento++) {
    const codigo = codigoNuevo();
    const { error: insError } = await admin.from("codigos_referido").insert({ user_id: userId, codigo });
    if (!insError) return codigo;
    if (insError.code !== "23505") throw insError;
    // 23505: o ese código ya existe (se intenta otro) o la persona ya tiene uno (otra pestaña).
    const { data: ya } = await admin.from("codigos_referido").select("codigo").eq("user_id", userId).maybeSingle();
    if (ya?.codigo) return ya.codigo;
  }
  throw new Error("No se pudo crear el código");
}

export async function usuarioDeCodigo(admin, codigo) {
  const { data } = await admin.from("codigos_referido").select("user_id").eq("codigo", codigo).maybeSingle();
  return data?.user_id || null;
}

async function yaPagoAlgunaVez(admin, userId) {
  const { count } = await admin
    .from("reservaciones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("estado", ["pagado", "completado", "conflicto"]);
  return (count || 0) > 0;
}

// ¿Cuánto descuento le toca en su próximo mantenimiento? (sin aplicarlo todavía)
// Si las tablas aún no existen, simplemente no hay descuento.
export async function calcularDescuento(admin, userId, precio) {
  const vacio = { total: 0, bienvenida: 0, creditos: [], creditoDisponible: 0 };
  try {
    const [{ data: atrib }, { data: creditos }, pagoAntes] = await Promise.all([
      admin.from("atribucion").select("referido_por").eq("user_id", userId).maybeSingle(),
      admin.from("creditos").select("id, monto_centavos").eq("user_id", userId).is("usado_en", null).order("created_at"),
      yaPagoAlgunaVez(admin, userId),
    ]);
    const tope = Math.max(0, (precio || 0) - COBRO_MINIMO_CENTAVOS);
    let total = 0;
    const bienvenida = atrib?.referido_por && !pagoAntes ? Math.min(DESCUENTO_BIENVENIDA_CENTAVOS, tope) : 0;
    total += bienvenida;
    const usados = [];
    let creditoDisponible = 0;
    (creditos || []).forEach((c) => {
      creditoDisponible += c.monto_centavos;
      if (total + c.monto_centavos <= tope) {
        total += c.monto_centavos;
        usados.push(c.id);
      }
    });
    return { total, bienvenida, creditos: usados, creditoDisponible };
  } catch (err) {
    console.error("No se pudo calcular el descuento:", err.message);
    return vacio;
  }
}

// Al confirmarse un pago: marca usados los créditos y premia a quien invitó
// (solo en el primer pago del amigo). Nunca rompe el pago si algo falla.
export async function alPagar(admin, reservacion) {
  try {
    if (Array.isArray(reservacion.creditos_usados) && reservacion.creditos_usados.length) {
      await admin.from("creditos").update({ usado_en: reservacion.id }).in("id", reservacion.creditos_usados).is("usado_en", null);
    }
    const { data: atrib } = await admin.from("atribucion").select("referido_por").eq("user_id", reservacion.user_id).maybeSingle();
    if (!atrib?.referido_por || atrib.referido_por === reservacion.user_id) return;
    const { count } = await admin
      .from("reservaciones")
      .select("id", { count: "exact", head: true })
      .eq("user_id", reservacion.user_id)
      .in("estado", ["pagado", "completado"])
      .neq("id", reservacion.id);
    if ((count || 0) > 0) return; // no es su primer pago
    // referido_id es único: si Stripe repite el aviso, no se premia dos veces.
    const { error } = await admin.from("creditos").insert({
      user_id: atrib.referido_por,
      monto_centavos: CREDITO_POR_AMIGO_CENTAVOS,
      motivo: "Invitaste a un amigo",
      referido_id: reservacion.user_id,
    });
    if (error && error.code !== "23505") console.error("No se pudo dar el crédito:", error.message);
  } catch (err) {
    console.error("Error en premios por invitar:", err.message);
  }
}

// Si se cancela una cita pagada, los créditos que usó vuelven a estar disponibles.
export async function devolverCreditos(admin, reservacion) {
  try {
    if (Array.isArray(reservacion.creditos_usados) && reservacion.creditos_usados.length) {
      await admin.from("creditos").update({ usado_en: null }).in("id", reservacion.creditos_usados).eq("usado_en", reservacion.id);
    }
  } catch (err) {
    console.error("No se pudieron devolver los créditos:", err.message);
  }
}
