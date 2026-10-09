// Panel de administrador: revisa qué está bien configurado para crear
// cuentas (Google, Apple, correo...) y qué variables de Vercel faltan.
// Solo dice "sí / no": nunca regresa el valor de ninguna clave.
import { esAdmin } from "../../../lib/adminAuth";

const VARIABLES = [
  ["ANTHROPIC_API_KEY", "Análisis de plantas con IA"],
  ["NEXT_PUBLIC_SUPABASE_URL", "Base de datos"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Base de datos"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Servidor (reservas, límites, recordatorios)"],
  ["STRIPE_SECRET_KEY", "Pagos"],
  ["STRIPE_WEBHOOK_SECRET", "Confirmar pagos"],
  ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "Notificaciones"],
  ["VAPID_PRIVATE_KEY", "Notificaciones"],
  ["CRON_SECRET", "Recordatorios diarios"],
  ["GOOGLE_MAPS_API_KEY", "Fotos de viveros (opcional)"],
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  if (!esAdmin(req)) return res.status(401).json({ error: "Contraseña incorrecta" });

  const variables = VARIABLES.map(([nombre, para]) => ({ nombre, para, lista: !!process.env[nombre] }));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let auth = null;
  let authError = null;
  if (url && anon) {
    try {
      const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } });
      if (!r.ok) throw new Error(`Supabase respondió ${r.status}`);
      const s = await r.json();
      const ext = s.external || {};
      auth = {
        google: !!ext.google,
        apple: !!ext.apple,
        facebook: !!ext.facebook,
        correo: !!ext.email,
        sinCuenta: !!ext.anonymous_users,
        registroAbierto: !s.disable_signup,
        confirmacionAutomatica: !!s.mailer_autoconfirm,
      };
    } catch (err) {
      authError = err.message;
    }
  } else {
    authError = "Faltan las variables de Supabase";
  }

  return res.status(200).json({ variables, auth, authError, callback: url ? `${url}/auth/v1/callback` : null });
}
