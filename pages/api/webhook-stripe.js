// Webhook de Stripe: Stripe llama aquí cuando un pago se completa (tarjeta
// al instante, OXXO unos días después cuando la persona paga en la tienda).
// Nunca lo llama el navegador — por eso valida la firma de Stripe antes de
// confiar en el contenido.
import Stripe from "stripe";
import { clienteAdmin } from "../../lib/usuarioServidor";
import { obtenerAgenda } from "../../lib/agendaServidor";
import { cabeCitaPagada } from "../../lib/horariosOcupados";
import { inicioCita } from "../../lib/politicaCancelacion";
import { actualizarConExtras } from "../../lib/columnasOpcionales";

export const config = {
  api: {
    bodyParser: false, // Stripe necesita el body "crudo" para verificar la firma
  },
};

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (chunk) => chunks.push(chunk));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

// "card" u "oxxo": el método con el que de verdad se pagó (no la lista de
// métodos permitidos).
async function metodoUsado(stripe, session) {
  try {
    if (!session.payment_intent) return null;
    const pi = await stripe.paymentIntents.retrieve(session.payment_intent, { expand: ["payment_method"] });
    return pi.payment_method?.type || null;
  } catch (err) {
    console.error("No se pudo leer el método de pago:", err.message);
    return null;
  }
}

async function marcarPagada(admin, stripe, session) {
  const reservacionId = session.metadata?.reservacion_id;
  if (!reservacionId) return;

  const { data: reservacion, error: leerError } = await admin
    .from("reservaciones")
    .select("*")
    .eq("id", reservacionId)
    .maybeSingle();
  if (leerError) throw leerError;
  if (!reservacion) return;

  // Solo cuenta si es la sesión de pago vigente de esa reservación y el
  // monto cobrado es el correcto.
  if (reservacion.stripe_session_id && reservacion.stripe_session_id !== session.id) return;
  if (session.amount_total !== reservacion.precio_centavos) {
    console.error(`Monto inesperado en reservación ${reservacionId}: ${session.amount_total}`);
    return;
  }
  if (reservacion.estado === "pagado" || reservacion.estado === "completado" || reservacion.estado === "conflicto") return; // ya procesado
  // Si ya tiene reembolso_estado, se canceló DESPUÉS de pagar: es un aviso repetido de Stripe.
  if (reservacion.estado === "cancelado" && reservacion.reembolso_estado) return;

  const metodo = await metodoUsado(stripe, session);
  const ahora = new Date().toISOString();

  // Cita "por resolver": el dinero llegó pero hay que moverla o reembolsar.
  // Lo verás en rojo en el panel con el motivo.
  async function marcarConflicto(motivo, estadoActual) {
    const { error } = await actualizarConExtras(
      (campos) => admin.from("reservaciones").update(campos).eq("id", reservacionId).eq("estado", estadoActual),
      { estado: "conflicto", metodo_pago: metodo },
      { conflicto_motivo: motivo, pagado_en: ahora }
    );
    if (error) throw error;
  }

  // Pagó (p. ej. en OXXO) una reservación que ya había cancelado.
  if (reservacion.estado === "cancelado") return marcarConflicto("pago_tras_cancelar", "cancelado");
  // El pago llegó cuando la fecha de la visita ya pasó (p. ej. OXXO muy tarde).
  if (inicioCita(reservacion.fecha, reservacion.hora) <= Date.now()) return marcarConflicto("fecha_pasada", reservacion.estado);
  // Mientras pagaba se llenó ese horario o ese día.
  if (!(await cabeCitaPagada(admin, reservacion, await obtenerAgenda(admin)))) return marcarConflicto("sin_lugar", reservacion.estado);

  const { data, error } = await actualizarConExtras(
    (campos) => admin.from("reservaciones").update(campos).eq("id", reservacionId).eq("estado", reservacion.estado).select("id"),
    { estado: "pagado", metodo_pago: metodo },
    { pagado_en: ahora }
  );
  if (error) throw error;
  if (!data || data.length === 0) {
    // Cambió mientras tanto (p. ej. la canceló en ese momento): se revisa de nuevo.
    const { data: actual } = await admin.from("reservaciones").select("estado, reembolso_estado").eq("id", reservacionId).maybeSingle();
    if (actual?.estado === "cancelado" && !actual.reembolso_estado) await marcarConflicto("pago_tras_cancelar", "cancelado");
  }
}

// La persona sacó su ficha de OXXO (todavía sin pagar): se anota para que
// su horario quede apartado mientras va a pagar.
async function marcarFichaOxxo(admin, session) {
  const reservacionId = session.metadata?.reservacion_id;
  if (!reservacionId) return;
  const { error } = await admin
    .from("reservaciones")
    .update({ metodo_pago: "oxxo" })
    .eq("id", reservacionId)
    .eq("estado", "pendiente_pago")
    .eq("stripe_session_id", session.id);
  if (error) throw error;
}

async function marcarCancelada(admin, session) {
  const reservacionId = session.metadata?.reservacion_id;
  if (!reservacionId) return;
  // Solo se cancela si sigue pendiente y es su sesión vigente: nunca se
  // cancela una reservación que ya se pagó.
  const { error } = await admin
    .from("reservaciones")
    .update({ estado: "cancelado" })
    .eq("id", reservacionId)
    .eq("estado", "pendiente_pago")
    .eq("stripe_session_id", session.id);
  if (error) throw error;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    console.error("Faltan STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET");
    return res.status(500).end();
  }

  const stripe = new Stripe(stripeKey);
  const rawBody = await buffer(req);
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Firma de webhook inválida:", err.message);
    return res.status(400).json({ error: "Firma inválida" });
  }

  const admin = clienteAdmin();
  const session = event.data.object;

  try {
    switch (event.type) {
      // Con tarjeta, "completed" ya viene pagado. Con OXXO, "completed" llega
      // cuando se genera el voucher (aún sin pagar) y el pago real llega
      // después en "async_payment_succeeded".
      case "checkout.session.completed":
        if (session.payment_status === "paid") await marcarPagada(admin, stripe, session);
        else await marcarFichaOxxo(admin, session);
        break;
      case "checkout.session.async_payment_succeeded":
        await marcarPagada(admin, stripe, session);
        break;
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        await marcarCancelada(admin, session);
        break;
      default:
        break;
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    // Responder 500 hace que Stripe vuelva a intentar más tarde, así no se
    // pierde un pago si la base de datos falló un momento.
    console.error("Error procesando webhook:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
