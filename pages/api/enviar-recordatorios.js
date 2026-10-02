import webpush from "web-push";
import { clienteAdmin } from "../../lib/usuarioServidor";
import { diasParaRiego } from "../../lib/fechas";

// Este endpoint NO lo llama la app — lo llama Vercel Cron una vez al día
// (ver vercel.json: 14:00 UTC = 8:00 am en CDMX).
// Usa la llave "service role" (acceso total), nunca expuesta al navegador.

const POR_PAGINA = 1000; // Supabase regresa máximo 1000 filas por consulta

async function todasLasFilas(consulta) {
  const filas = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    const { data, error } = await consulta().range(desde, desde + POR_PAGINA - 1);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < POR_PAGINA) return filas;
  }
}

export default async function handler(req, res) {
  // Vercel manda "Authorization: Bearer <CRON_SECRET>" en cada llamada de cron.
  // Si la variable no existe, se rechaza todo: así nadie más puede disparar
  // notificaciones a tus usuarios.
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: "No autorizado" });
  }

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Faltan llaves VAPID o SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "Faltan variables de entorno" });
  }

  try {
    const admin = clienteAdmin();
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:contacto@ambitat.app",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const plantas = await todasLasFilas(() =>
      admin.from("plantas").select("id, user_id, nombre_comun, dias_entre_riegos, historial").order("id")
    );

    // Agrupa por usuario los nombres de las plantas que necesitan agua hoy
    const porUsuario = {};
    for (const planta of plantas) {
      const faltan = diasParaRiego(planta.dias_entre_riegos, planta.historial);
      if (faltan !== null && faltan <= 0) {
        (porUsuario[planta.user_id] = porUsuario[planta.user_id] || []).push(planta.nombre_comun || "Una planta");
      }
    }

    const userIds = Object.keys(porUsuario);
    if (userIds.length === 0) {
      return res.status(200).json({ ok: true, notificados: 0, mensaje: "Ninguna planta necesita agua hoy" });
    }

    // Se consulta en grupos para no armar una URL gigante.
    const subs = [];
    for (let i = 0; i < userIds.length; i += 200) {
      const grupo = userIds.slice(i, i + 200);
      const { data, error } = await admin.from("push_subscriptions").select("*").in("user_id", grupo);
      if (error) throw error;
      subs.push(...(data || []));
    }

    let enviados = 0;
    let expirados = 0;

    for (const sub of subs) {
      const nombres = porUsuario[sub.user_id];
      if (!nombres || nombres.length === 0) continue;

      const body =
        nombres.length === 1
          ? `${nombres[0]} necesita agua hoy 💧`
          : `${nombres.length} plantas necesitan agua hoy: ${nombres.slice(0, 3).join(", ")}${nombres.length > 3 ? "..." : ""}`;

      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({ title: "Ámbitat 🌿", body, url: "/" }));
        enviados++;
      } catch (err) {
        // 404/410 = la suscripción ya no es válida (desinstaló, quitó el permiso, etc.)
        if (err.statusCode === 404 || err.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
          expirados++;
        } else {
          console.error("Error enviando push:", err.message);
        }
      }
    }

    return res.status(200).json({ ok: true, notificados: enviados, suscripciones_expiradas: expirados });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error revisando recordatorios" });
  }
}
