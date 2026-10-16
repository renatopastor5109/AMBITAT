// Crea una reservación de mantenimiento Y su sesión de pago en Stripe.
//
// Todo pasa en el SERVIDOR a propósito: aquí se decide el precio, se revisa
// que la fecha y hora estén en tu agenda (/admin → Agenda) y que haya lugar. Antes
// la app creaba la reservación directo en la base de datos, y alguien que
// supiera usar la consola del navegador podía ponerle otro precio o marcarla
// como pagada.
import Stripe from "stripe";
import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";
import { obtenerHorasOcupadas, horaGanadaPorOtra, apartaHorario } from "../../lib/horariosOcupados";
import { obtenerAgenda } from "../../lib/agendaServidor";
import { diaPermitido } from "../../lib/agenda";
import { tamanoPorClave, DIAS_MAXIMOS_ANTICIPACION } from "../../lib/servicio";
import { diaCDMX, diasEntre, esFechaValida } from "../../lib/fechas";

const DIAS_MINIMOS_OXXO = 3;

function texto(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Falta STRIPE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "Los pagos todavía no están configurados." });
  }

  const usuario = await obtenerUsuario(req);
  if (!usuario) {
    return res.status(401).json({ error: "Inicia sesión para continuar." });
  }

  // ---------- Validación de datos ----------
  const body = req.body || {};
  const nombre = texto(body.nombre, 80);
  const telefono = texto(body.telefono, 20);
  const correo = texto(body.correo, 120);
  const direccion = texto(body.direccion, 200);
  const notas = texto(body.notas, 500) || null;
  const fecha = body.fecha;
  const hora = body.hora;
  const tamano = tamanoPorClave(body.tamano);

  if (!tamano) return res.status(400).json({ error: "Elige el tamaño de tu jardín." });
  if (!nombre || !direccion) return res.status(400).json({ error: "Falta tu nombre o la dirección." });
  if (telefono.replace(/\D/g, "").length < 8) return res.status(400).json({ error: "Revisa tu número de teléfono." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return res.status(400).json({ error: "Revisa tu correo." });
  if (!esFechaValida(fecha)) return res.status(400).json({ error: "Fecha inválida." });

  const admin = clienteAdmin();

  try {
    const agenda = await obtenerAgenda(admin);
    if (!diaPermitido(agenda, fecha)) return res.status(400).json({ error: "Ese día no hay visitas. Elige otra fecha." });
    const diasFaltan = diasEntre(diaCDMX(), fecha);
    // Siempre con anticipación (nunca se cobra una hora de hoy que ya pasó).
    if (diasFaltan < agenda.anticipacionDias) {
      return res.status(400).json({ error: agenda.anticipacionDias === 1 ? "Reserva a partir de mañana." : `Reserva con al menos ${agenda.anticipacionDias} días de anticipación.` });
    }
    if (diasFaltan > DIAS_MAXIMOS_ANTICIPACION) {
      return res.status(400).json({ error: `Solo se puede reservar con hasta ${DIAS_MAXIMOS_ANTICIPACION} días de anticipación.` });
    }
    if (!agenda.horarios.includes(hora)) return res.status(400).json({ error: "Horario no disponible." });

    // Máximo 3 reservaciones pendientes de pago a la vez por persona, para que
    // nadie pueda apartar todos los horarios sin pagar.
    const { data: pendientes, error: pendError } = await admin
      .from("reservaciones")
      .select("id, estado, metodo_pago, created_at")
      .eq("user_id", usuario.id)
      .eq("estado", "pendiente_pago");
    if (pendError) throw pendError;
    if ((pendientes || []).filter((r) => apartaHorario(r)).length >= 3) {
      return res.status(429).json({ error: "Tienes reservaciones esperando pago. Págalas o espera a que venzan para reservar otra." });
    }

    const ocupadas = await obtenerHorasOcupadas(admin, fecha, agenda);
    if (ocupadas.includes(hora)) {
      return res.status(409).json({ error: "Ese horario se acaba de ocupar. Elige otra hora." });
    }

    // ---------- Guarda la reservación (el precio lo pone el servidor) ----------
    const fila = {
      user_id: usuario.id,
      nombre_contacto: nombre,
      telefono,
      correo,
      fecha,
      hora,
      direccion,
      notas,
      tamano: tamano.key,
      precio_centavos: tamano.precio,
      estado: "pendiente_pago",
    };
    const { data: reservacion, error: insertError } = await admin.from("reservaciones").insert(fila).select().single();

    if (insertError || !reservacion) {
      console.error("Error creando reservación:", insertError);
      return res.status(500).json({ error: "No pudimos guardar tu reservación. Intenta de nuevo." });
    }

    // Si otra persona apartó la misma hora en el mismo instante, gana la primera.
    let perdio = true;
    try {
      perdio = await horaGanadaPorOtra(admin, reservacion, agenda);
    } catch (err) {
      console.error("No se pudo revisar el horario:", err);
    }
    if (perdio) {
      await admin.from("reservaciones").update({ estado: "cancelado" }).eq("id", reservacion.id);
      return res.status(409).json({ error: "Ese horario se acaba de ocupar. Elige otra hora." });
    }

    // ---------- Sesión de pago en Stripe ----------
    try {
      const stripe = new Stripe(stripeKey);
      const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        // OXXO solo si la visita es en 3 días o más: la ficha dura 2 días y
        // Stripe tarda hasta 1 día en confirmar (así nunca se paga una cita pasada).
        payment_method_types: diasFaltan >= DIAS_MINIMOS_OXXO ? ["card", "oxxo"] : ["card"],
        // La página de pago vence en 30 min (lo mínimo que permite Stripe) para
        // que los pagos abandonados liberen el horario rápido. La ficha de
        // OXXO dura 2 días y el horario se le aparta 5 (lib/horariosOcupados.js).
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        ...(diasFaltan >= DIAS_MINIMOS_OXXO ? { payment_method_options: { oxxo: { expires_after_days: 2 } } } : {}),
        customer_email: correo,
        line_items: [
          {
            price_data: {
              currency: "mxn",
              unit_amount: tamano.precio,
              product_data: {
                name: `Mantenimiento de plantas · Jardín ${tamano.nombre.toLowerCase()} — Ámbitat`,
                description: `Visita el ${fecha} a las ${hora}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: { reservacion_id: reservacion.id },
        // Stripe cambia {CHECKOUT_SESSION_ID} por el número real del pago,
        // para que la app pueda mostrar el ticket.
        success_url: `${origin}/?pago=exito&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?pago=cancelado`,
      });

      const { error: guardarSesionError } = await admin
        .from("reservaciones")
        .update({ stripe_session_id: session.id })
        .eq("id", reservacion.id);
      if (guardarSesionError) {
        // Sin el número de sesión no podríamos confirmar el pago: mejor no cobrar.
        await stripe.checkout.sessions.expire(session.id).catch(() => {});
        throw guardarSesionError;
      }
      return res.status(200).json({ url: session.url });
    } catch (stripeErr) {
      console.error("Error de Stripe:", stripeErr);
      // Libera el horario: esta reservación nunca va a poder pagarse.
      await admin.from("reservaciones").update({ estado: "cancelado" }).eq("id", reservacion.id);
      const mensaje =
        stripeErr?.type === "StripeAuthenticationError"
          ? "Los pagos no están bien configurados (llave de Stripe inválida)."
          : "No pudimos iniciar el pago. Intenta de nuevo.";
      return res.status(502).json({ error: mensaje });
    }
  } catch (err) {
    console.error("Error en reservar:", err);
    return res.status(500).json({ error: "Algo falló al reservar. Intenta de nuevo." });
  }
}
