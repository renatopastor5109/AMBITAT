// Este código corre en el SERVIDOR de Vercel. Crea una "sesión de pago" en
// Stripe (tarjeta u OXXO) para una reservación de mantenimiento que ya se
// guardó en Supabase con estado "pendiente_pago", y regresa la URL a la que
// hay que mandar a la persona para que pague.

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: "Falta configurar STRIPE_SECRET_KEY en el servidor" });
  }

  const { reservacionId } = req.body || {};
  if (!reservacionId) {
    return res.status(400).json({ error: "Falta reservacionId" });
  }

  try {
    // Usa la service_role key porque este endpoint necesita leer la
    // reservación sin importar de quién sea la sesión que la llama —
    // ya validamos el dueño al insertarla desde el cliente (RLS).
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: reservacion, error } = await admin
      .from("reservaciones")
      .select("*")
      .eq("id", reservacionId)
      .single();

    if (error || !reservacion) {
      return res.status(404).json({ error: "No se encontró la reservación" });
    }
    if (reservacion.estado === "pagado") {
      return res.status(400).json({ error: "Esta reservación ya está pagada" });
    }

    const stripe = new Stripe(stripeKey);
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "oxxo"],
      // OXXO necesita un correo para poder mandar el comprobante/voucher
      customer_email: reservacion.correo || undefined,
      line_items: [
        {
          price_data: {
            currency: "mxn",
            unit_amount: reservacion.precio_centavos,
            product_data: {
              name: "Mantenimiento de plantas — Ámbitat",
              description: `Visita el ${reservacion.fecha} a las ${reservacion.hora}`,
            },
          },
          quantity: 1,
        },
      ],
      // Stripe le da automáticamente unos días para pagar el voucher de OXXO
      // antes de que expire (checkout.session.expired dispara si no paga).
      metadata: { reservacion_id: reservacion.id },
      success_url: `${origin}/?pago=exito`,
      cancel_url: `${origin}/?pago=cancelado`,
    });

    await admin.from("reservaciones").update({ stripe_session_id: session.id }).eq("id", reservacion.id);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Error creando sesión de pago:", err);
    return res.status(500).json({ error: "No se pudo iniciar el pago" });
  }
}
