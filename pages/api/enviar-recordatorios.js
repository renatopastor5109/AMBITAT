import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Este endpoint NO lo llama la app — lo llama Vercel Cron una vez al día.
// Por eso usa la llave "service role" (acceso total), nunca expuesta al navegador.

function getWateringStatusServerSide(plant) {
  if (!plant.dias_entre_riegos || !plant.historial || plant.historial.length === 0) return null;
  const last = plant.historial[plant.historial.length - 1];
  let lastDate = null;
  if (last.dateISO) lastDate = new Date(last.dateISO);
  else if (last.date) {
    const parts = last.date.split("/");
    if (parts.length === 3) lastDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  }
  if (!lastDate || isNaN(lastDate)) return null;

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSince = Math.floor((Date.now() - lastDate.getTime()) / msPerDay);
  const remaining = plant.dias_entre_riegos - daysSince;
  return { due: remaining <= 0 };
}

export default async function handler(req, res) {
  // Vercel agrega este header automáticamente en las llamadas de cron,
  // usando el valor que pongas en la variable de entorno CRON_SECRET.
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contacto@ambitat.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  try {
    const { data: plantas, error: plantasError } = await admin.from("plantas").select("*");
    if (plantasError) throw plantasError;

    // Agrupa por usuario los nombres de las plantas que necesitan agua hoy
    const porUsuario = {};
    for (const planta of plantas || []) {
      const status = getWateringStatusServerSide(planta);
      if (status?.due) {
        if (!porUsuario[planta.user_id]) porUsuario[planta.user_id] = [];
        porUsuario[planta.user_id].push(planta.nombre_comun);
      }
    }

    const userIds = Object.keys(porUsuario);
    if (userIds.length === 0) {
      return res.status(200).json({ ok: true, notificados: 0, mensaje: "Ninguna planta necesita agua hoy" });
    }

    const { data: subs, error: subsError } = await admin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);
    if (subsError) throw subsError;

    let enviados = 0;
    let expirados = 0;

    for (const sub of subs || []) {
      const nombres = porUsuario[sub.user_id];
      if (!nombres || nombres.length === 0) continue;

      const body =
        nombres.length === 1
          ? `${nombres[0]} necesita agua hoy 💧`
          : `${nombres.length} plantas necesitan agua hoy: ${nombres.slice(0, 3).join(", ")}${nombres.length > 3 ? "..." : ""}`;

      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({ title: "Ámbitat 🌿", body, url: "/" })
        );
        enviados++;
      } catch (err) {
        // 404/410 = la suscripción ya no es válida (usuario desinstaló, permiso revocado, etc.)
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
