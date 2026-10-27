import webpush from "web-push";
import { clienteAdmin } from "../../lib/usuarioServidor";
import { diasParaRiego, diaCDMX, diaSemana } from "../../lib/fechas";
import { pronosticoCDMX, avisoClima } from "../../lib/clima";
import { consejoDeTemporada } from "../../lib/temporadas";

// Este endpoint NO lo llama la app — lo llama Vercel Cron una vez al día
// (ver vercel.json: 14:00 UTC = 8:00 am en CDMX).
// Usa la llave "service role" (acceso total), nunca expuesta al navegador.

export const config = { maxDuration: 60 };

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
      admin.from("plantas").select("*").order("id") // "*": funciona aunque falte alguna columna nueva
    );

    // Por usuario: todas sus plantas y las que necesitan agua hoy.
    const porUsuario = {};
    for (const planta of plantas) {
      const u = (porUsuario[planta.user_id] = porUsuario[planta.user_id] || { todas: [], sedientas: [] });
      u.todas.push(planta.nombre_comun || "");
      const faltan = diasParaRiego(planta.dias_entre_riegos, planta.historial, planta.ultimo_riego);
      if (faltan !== null && faltan <= 0) u.sedientas.push(planta.nombre_comun || "Una planta");
    }

    // Aviso del clima (frío, calor o lluvia fuerte) y, los lunes, el consejo de la temporada.
    const aviso = avisoClima(await pronosticoCDMX());
    const hoy = diaCDMX();
    const esLunes = diaSemana(hoy) === 1;
    const mes = Number(hoy.slice(5, 7));
    const semana = Math.floor((Date.parse(hoy) / 86400000 + 3) / 7);

    // Un solo aviso al día por persona: riego primero, y se le suma el clima.
    function mensajePara(userId) {
      const u = porUsuario[userId];
      if (!u) return null;
      const nombres = u.sedientas;
      if (nombres.length) {
        let body =
          nombres.length === 1
            ? `${nombres[0]} necesita agua hoy 💧`
            : `${nombres.length} plantas necesitan agua hoy: ${nombres.slice(0, 3).join(", ")}${nombres.length > 3 ? "..." : ""}`;
        if (aviso) body += ` · ${aviso.emoji} ${aviso.titulo}`;
        return { title: "Ámbitat 🌿", body };
      }
      if (aviso) return { title: `${aviso.emoji} ${aviso.titulo}`, body: aviso.texto };
      if (esLunes) {
        const c = consejoDeTemporada(mes, u.todas, semana);
        if (c) return { title: `${c.emoji} ${c.titulo}`, body: c.texto };
      }
      return null;
    }

    const userIds = Object.keys(porUsuario).filter((id) => mensajePara(id));
    if (userIds.length === 0) {
      return res.status(200).json({ ok: true, notificados: 0, mensaje: "Hoy no hay nada que avisar" });
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

    async function enviar(sub) {
      const mensaje = mensajePara(sub.user_id);
      if (!mensaje) return;
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({ ...mensaje, url: "/" }));
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

    // De 20 en 20 en paralelo, para no pasarnos del tiempo máximo de Vercel.
    for (let i = 0; i < subs.length; i += 20) {
      await Promise.all(subs.slice(i, i + 20).map(enviar));
    }

    return res.status(200).json({ ok: true, notificados: enviados, suscripciones_expiradas: expirados });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error revisando recordatorios" });
  }
}
