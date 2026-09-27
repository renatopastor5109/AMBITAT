// Webhook de Stripe: Stripe llama aquí cuando un pago se completa (tarjeta
// al instante, OXXO unos días después cuando la persona paga en la tienda).
// Nunca lo llama el navegador — por eso valida la firma de Stripe antes de
// confiar en el contenido.

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

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

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // "completed" dispara con pago con tarjeta (ya está pagado de inmediato) y
    // también con OXXO en cuanto se genera el voucher (todavía NO ha pagado) —
    // por eso solo marcamos "pagado" aquí si payment_status ya es "paid".
    // Para OXXO, el pago real llega después en "async_payment_succeeded".
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const reservacionId = session.metadata?.reservacion_id;
      if (reservacionId && session.payment_status === "paid") {
        await admin
          .from("reservaciones")
          .update({
            estado: "pagado",
            metodo_pago: session.payment_method_types?.[0] || null,
          })
          .eq("id", reservacionId);
      }
    }

    if (event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const reservacionId = session.metadata?.reservacion_id;
      if (reservacionId) {
        await admin
          .from("reservaciones")
          .update({
            estado: "pagado",
            metodo_pago: session.payment_method_types?.[0] || null,
          })
          .eq("id", reservacionId);
      }
    }

    if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      const session = event.data.object;
      const reservacionId = session.metadata?.reservacion_id;
      if (reservacionId) {
        await admin.from("reservaciones").update({ estado: "cancelado" }).eq("id", reservacionId);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Error procesando webhook:", err);
    return res.status(500).json({ error: "Error interno" });
  }
}
