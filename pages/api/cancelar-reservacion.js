// La persona cancela su cita desde la app. El servidor revisa que la cita
// sea suya, calcula el reembolso según los términos (lib/politicaCancelacion)
// y, si pagó con tarjeta, lo hace en Stripe en ese momento.
import Stripe from "stripe";
import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";
import { politicaCancelacion } from "../../lib/politicaCancelacion";
import { actualizarConExtras } from "../../lib/columnasOpcionales";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const usuario = await obtenerUsuario(req);
  if (!usuario) return res.status(401).json({ error: "Inicia sesión para continuar." });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Los pagos todavía no están configurados." });
  }

  const id = req.body?.id;
  if (typeof id !== "string" || !id) return res.status(400).json({ error: "Falta la reservación." });

  const admin = clienteAdmin();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { data: r, error } = await admin.from("reservaciones").select("*").eq("id", id).eq("user_id", usuario.id).maybeSingle();
    if (error) throw error;
    if (!r) return res.status(404).json({ error: "No encontramos esa reservación." });

    const politica = politicaCancelacion(r);
    if (!politica.puede) return res.status(400).json({ error: politica.motivo });

    // ---------- Aún sin pagar: solo se cierra el pago pendiente ----------
    if (politica.sinCobro) {
      if (r.stripe_session_id) {
        try {
          const session = await stripe.checkout.sessions.retrieve(r.stripe_session_id);
          if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
          else if (session.payment_intent) {
            // Ficha de OXXO ya generada: se anula para que no se pueda pagar.
            await stripe.paymentIntents.cancel(session.payment_intent).catch((err) => {
              console.error("No se pudo anular la ficha de OXXO:", err.message);
            });
          }
        } catch (err) {
          console.error("No se pudo cerrar el pago pendiente:", err.message);
        }
      }
      const { data, error: updError } = await admin
        .from("reservaciones")
        .update({ estado: "cancelado" })
        .eq("id", id)
        .eq("estado", "pendiente_pago")
        .select()
        .maybeSingle();
      if (updError) throw updError;
      if (!data) return res.status(409).json({ error: "Esta reservación cambió. Recarga e intenta de nuevo." });
      return res.status(200).json({
        reservacion: data,
        mensaje: "Listo, cancelamos tu reservación. No se te cobró nada. Si ya tenías una ficha de OXXO, ya no la pagues.",
      });
    }

    // ---------- Pagada: primero se "aparta" la cancelación (evita dobles reembolsos) ----------
    const ahora = new Date().toISOString();
    const { data: tomada, error: claimError } = await actualizarConExtras(
      (campos) => admin.from("reservaciones").update(campos).eq("id", id).eq("estado", "pagado").select("id").maybeSingle(),
      { estado: "cancelado" },
      { reembolso_estado: "procesando", reembolso_centavos: politica.monto, cancelada_en: ahora }
    );
    if (claimError) throw claimError;
    if (!tomada) return res.status(409).json({ error: "Esta reservación cambió. Recarga e intenta de nuevo." });

    let reembolsoEstado = "sin_reembolso";
    if (politica.monto > 0) {
      try {
        const session = await stripe.checkout.sessions.retrieve(r.stripe_session_id, { expand: ["payment_intent.payment_method"] });
        const pi = session.payment_intent;
        const tipo = pi?.payment_method?.type || r.metodo_pago;
        if (tipo === "card" && pi?.id) {
          // Por si un intento anterior sí llegó a Stripe pero no recibimos la respuesta.
          const previos = await stripe.refunds.list({ payment_intent: pi.id, limit: 10 });
          const yaHecho = previos.data.some((x) => x.metadata?.reservacion_id === id && x.status !== "failed" && x.status !== "canceled");
          if (!yaHecho) {
            await stripe.refunds.create(
              { payment_intent: pi.id, amount: politica.monto, metadata: { reservacion_id: id } },
              { idempotencyKey: `cancelacion-${id}-${politica.monto}` }
            );
          }
          reembolsoEstado = "hecho";
        } else {
          // OXXO no permite reembolsos automáticos: se deposita a mano.
          reembolsoEstado = "pendiente_manual";
        }
      } catch (err) {
        console.error("Error haciendo el reembolso:", err);
        if (err?.type === "StripeInvalidRequestError" || err?.type === "StripeCardError") {
          // Stripe dijo que NO: la cita vuelve a quedar como estaba.
          await admin.from("reservaciones").update({ estado: "pagado" }).eq("id", id);
          await admin.from("reservaciones").update({ reembolso_estado: null }).eq("id", id);
          return res.status(502).json({ error: "No pudimos procesar el reembolso. Intenta de nuevo o escríbenos por WhatsApp." });
        }
        // No sabemos si se hizo (p. ej. se cortó la conexión): queda para revisar en el panel.
        reembolsoEstado = "revisar";
      }
    }

    const extra = { reembolso_centavos: politica.monto, reembolso_estado: reembolsoEstado, cancelada_en: ahora };
    let { data, error: extraError } = await admin.from("reservaciones").update(extra).eq("id", id).select().maybeSingle();
    if (extraError || !data) {
      // Si todavía no se corre el SQL con estas columnas, la cancelación igual vale.
      if (extraError) console.error("No se guardó el detalle del reembolso:", extraError.message);
      data = { ...r, estado: "cancelado", ...extra };
    }

    const pesos = `$${(politica.monto / 100).toLocaleString("es-MX")}`;
    const mensaje =
      reembolsoEstado === "hecho"
        ? `Listo, cancelamos tu cita. Te devolvimos ${pesos} a tu tarjeta; puede tardar de 5 a 10 días hábiles en verse.`
        : reembolsoEstado === "revisar"
        ? `Listo, cancelamos tu cita. Estamos confirmando tu reembolso de ${pesos}; si en 2 días no lo ves, escríbenos.`
        : reembolsoEstado === "pendiente_manual"
        ? `Listo, cancelamos tu cita. Como pagaste en OXXO, te escribiremos para depositarte ${pesos}.`
        : "Listo, cancelamos tu cita.";
    return res.status(200).json({ reservacion: data, mensaje });
  } catch (err) {
    console.error("Error cancelando:", err);
    return res.status(500).json({ error: "No pudimos cancelar. Intenta de nuevo." });
  }
}
