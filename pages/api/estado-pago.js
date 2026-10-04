// Datos para el ticket que se muestra al volver de pagar. Se le pregunta
// directo a Stripe (no se confía en lo que diga la dirección del navegador)
// y solo se responde si el pago es de una reservación de quien pregunta.
import Stripe from "stripe";
import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  const sessionId = req.query.session_id;
  if (typeof sessionId !== "string" || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ error: "Pago no válido" });
  }
  const usuario = await obtenerUsuario(req);
  if (!usuario) return res.status(401).json({ error: "Inicia sesión para continuar." });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Pagos no configurados" });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.payment_method"],
    });

    const reservacionId = session.metadata?.reservacion_id;
    if (!reservacionId) return res.status(404).json({ error: "No encontramos la reservación" });

    const { data: r, error } = await clienteAdmin()
      .from("reservaciones")
      .select("*")
      .eq("id", reservacionId)
      .maybeSingle();
    if (error || !r || r.user_id !== usuario.id) {
      return res.status(404).json({ error: "No encontramos la reservación" });
    }

    const pi = session.payment_intent && typeof session.payment_intent === "object" ? session.payment_intent : null;
    const pm = pi?.payment_method && typeof pi.payment_method === "object" ? pi.payment_method : null;
    const metodo = pm?.type || (session.payment_method_types || [])[0] || null;

    return res.status(200).json({
      pagado: session.payment_status === "paid",
      metodo, // "card" | "oxxo"
      tarjeta: pm?.card ? { marca: pm.card.brand, ultimos4: pm.card.last4 } : null,
      // Para OXXO: enlace a la ficha de pago (por si cierra la página de Stripe)
      fichaOxxo: pi?.next_action?.oxxo_display_details?.hosted_voucher_url || null,
      total: session.amount_total,
      fechaPago: (pi?.created || session.created) * 1000,
      reservacion: {
        id: r.id,
        fecha: r.fecha,
        hora: r.hora,
        tamano: r.tamano || null,
        direccion: r.direccion,
        nombre: r.nombre_contacto,
      },
    });
  } catch (err) {
    console.error("Error leyendo el pago:", err);
    return res.status(500).json({ error: "No pudimos leer el pago" });
  }
}
