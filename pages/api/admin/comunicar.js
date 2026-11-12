// Panel de administrador → Comunicar.
//   GET                                   → anuncio actual, personas con avisos activados y envíos recientes
//   POST { tipo: "anuncio", anuncio }      → guarda el anuncio que sale en la app
//   POST { tipo: "push", titulo, texto, url } → manda una notificación a todos
import webpush from "web-push";
import { clienteAdmin } from "../../../lib/usuarioServidor";
import { esAdmin } from "../../../lib/adminAuth";
import { faltaTabla, todasLasFilas } from "../../../lib/adminDatos";
import { RESPONSABLE } from "../../../lib/legal";
import { normalizarAnuncio, enlaceValido, MAX_TITULO_PUSH, MAX_TEXTO_PUSH, HORAS_ENTRE_AVISOS } from "../../../lib/anuncio";

export const config = { maxDuration: 60 };

const limpiar = (t, max) => (typeof t === "string" ? t.replace(/\s+/g, " ").trim().slice(0, max) : "");

async function ultimoEnvio(admin) {
  const { data, error } = await admin.from("avisos_enviados").select("*").order("created_at", { ascending: false }).limit(10);
  if (error) return { envios: null, error };
  return { envios: data || [] };
}

export default async function handler(req, res) {
  if (!esAdmin(req)) return res.status(401).json({ error: "Contraseña incorrecta" });
  const admin = clienteAdmin();

  try {
    if (req.method === "GET") {
      const [{ data: conf }, { count }, { envios, error: errEnvios }] = await Promise.all([
        admin.from("configuracion").select("valor").eq("clave", "anuncio").maybeSingle(),
        admin.from("push_subscriptions").select("id", { count: "exact", head: true }),
        ultimoEnvio(admin),
      ]);
      const ultimo = envios?.[0];
      const listoEn = ultimo ? new Date(ultimo.created_at).getTime() + HORAS_ENTRE_AVISOS * 3600e3 : 0;
      return res.status(200).json({
        anuncio: normalizarAnuncio(conf?.valor),
        suscripciones: count || 0,
        envios: envios || [],
        historialDisponible: !errEnvios,
        siguienteEnvio: listoEn > Date.now() ? new Date(listoEn).toISOString() : null,
      });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

    const { tipo } = req.body || {};
    if (tipo === "anuncio") {
      const anterior = normalizarAnuncio((await admin.from("configuracion").select("valor").eq("clave", "anuncio").maybeSingle()).data?.valor);
      const nuevo = normalizarAnuncio(req.body.anuncio);
      if (req.body.anuncio?.activo && !nuevo.texto) return res.status(400).json({ error: "Escribe el texto del anuncio." });
      // Si cambia el texto, es un anuncio nuevo: se le vuelve a mostrar a quien cerró el anterior.
      nuevo.id = nuevo.texto === anterior.texto && anterior.id ? anterior.id : String(Date.now());
      const { error } = await admin.from("configuracion").upsert({ clave: "anuncio", valor: nuevo, updated_at: new Date().toISOString() }, { onConflict: "clave" });
      if (error) throw error;
      return res.status(200).json({ anuncio: nuevo });
    }

    if (tipo === "push") {
      const titulo = limpiar(req.body.titulo, MAX_TITULO_PUSH);
      const texto = limpiar(req.body.texto, MAX_TEXTO_PUSH);
      const url = enlaceValido(req.body.url) || "/";
      if (!titulo || !texto) return res.status(400).json({ error: "Escribe el título y el mensaje." });
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        return res.status(500).json({ error: "Faltan las llaves VAPID en Vercel (Ajustes)." });
      }
      // Máximo uno cada 12 horas: si no, la gente desactiva los avisos de riego.
      const { envios, error: errEnvios } = await ultimoEnvio(admin);
      if (errEnvios) return res.status(500).json({ error: faltaTabla(errEnvios) ? "Falta correr supabase-revision-6.sql en Supabase." : "No se pudo revisar el historial." });
      if (envios[0] && Date.now() - new Date(envios[0].created_at).getTime() < HORAS_ENTRE_AVISOS * 3600e3) {
        return res.status(429).json({ error: `Ya mandaste una notificación hace poco. Espera ${HORAS_ENTRE_AVISOS} horas entre una y otra para que la gente no apague los avisos.` });
      }
      // Se anota ANTES de mandar: si tocas dos veces, la segunda se detiene arriba.
      const { data: registro, error: errReg } = await admin.from("avisos_enviados").insert({ titulo, texto, url }).select("id").single();
      if (errReg) throw errReg;

      webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${RESPONSABLE.correo}`, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
      const subs = await todasLasFilas(() => admin.from("push_subscriptions").select("id, subscription").order("id"));
      const carga = JSON.stringify({ title: titulo, body: texto, url });
      let enviados = 0;
      let fallidos = 0;
      const vencidas = [];
      for (let i = 0; i < subs.length; i += 20) {
        await Promise.all(
          subs.slice(i, i + 20).map(async (s) => {
            try {
              await webpush.sendNotification(s.subscription, carga);
              enviados++;
            } catch (err) {
              fallidos++;
              if (err.statusCode === 404 || err.statusCode === 410) vencidas.push(s.id);
            }
          })
        );
      }
      if (vencidas.length) await admin.from("push_subscriptions").delete().in("id", vencidas);
      await admin.from("avisos_enviados").update({ enviados, fallidos }).eq("id", registro.id);
      return res.status(200).json({ ok: true, enviados, fallidos, vencidas: vencidas.length });
    }
    return res.status(400).json({ error: "Acción desconocida" });
  } catch (err) {
    console.error("Error en comunicar:", err);
    return res.status(500).json({ error: faltaTabla(err) || /configuracion/.test(err?.message || "") ? "Falta correr supabase-revision-6.sql en Supabase." : "No se pudo completar. Intenta de nuevo." });
  }
}
