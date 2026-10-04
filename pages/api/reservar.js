// Crea una reservación de mantenimiento Y su sesión de pago en Stripe.
//
// Todo pasa en el SERVIDOR a propósito: aquí se decide el precio, se revisa
// que la fecha sea fin de semana, que la hora exista y que esté libre. Antes
// la app creaba la reservación directo en la base de datos, y alguien que
// supiera usar la consola del navegador podía ponerle otro precio o marcarla
// como pagada.
import Stripe from "stripe";
import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";
import { obtenerHorasOcupadas } from "../../lib/horariosOcupados";
import { tamanoPorClave, HORARIOS_DISPONIBLES, DIAS_MAXIMOS_ANTICIPACION } from "../../lib/servicio";
import { diaCDMX, diasEntre, esFechaValida, esFinDeSemana } from "../../lib/fechas";

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
  if (!esFinDeSemana(fecha)) return res.status(400).json({ error: "El mantenimiento solo se agenda en sábado o domingo." });
  const diasFaltan = diasEntre(diaCDMX(), fecha);
  if (diasFaltan < 0) return res.status(400).json({ error: "Esa fecha ya pasó." });
  if (diasFaltan > DIAS_MAXIMOS_ANTICIPACION) {
    return res.status(400).json({ error: `Solo se puede reservar con hasta ${DIAS_MAXIMOS_ANTICIPACION} días de anticipación.` });
  }
  if (!HORARIOS_DISPONIBLES.includes(hora)) return res.status(400).json({ error: "Horario no disponible." });

  const admin = clienteAdmin();

  try {
    const ocupadas = await obtenerHorasOcupadas(admin, fecha);
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
    let { data: reservacion, error: insertError } = await admin.from("reservaciones").insert(fila).select().single();
    // Si todavía no se corre el SQL que agrega la columna "tamano", se guarda
    // el tamaño dentro de las notas para no perder la reservación.
    if (insertError && insertError.code === "42703") {
      const { tamano: _sinColumna, ...resto } = fila;
      resto.notas = `[Jardín ${tamano.nombre.toLowerCase()}]${notas ? " " + notas : ""}`;
      ({ data: reservacion, error: insertError } = await admin.from("reservaciones").insert(resto).select().single());
    }

    if (insertError || !reservacion) {
      console.error("Error creando reservación:", insertError);
      return res.status(500).json({ error: "No pudimos guardar tu reservación. Intenta de nuevo." });
    }

    // ---------- Sesión de pago en Stripe ----------
    try {
      const stripe = new Stripe(stripeKey);
      const origin = `https://${req.headers.host}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card", "oxxo"],
        // El voucher de OXXO vence en 2 días; el horario se aparta 3 días
        // (lib/horariosOcupados.js), así nunca se libera antes de que venza.
        payment_method_options: { oxxo: { expires_after_days: 2 } },
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

      await admin.from("reservaciones").update({ stripe_session_id: session.id }).eq("id", reservacion.id);
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
