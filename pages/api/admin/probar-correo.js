// Panel de administrador: manda un código de prueba a un correo para revisar
// que el envío de correos (SMTP) y la plantilla funcionen como los ven los
// clientes. Traduce los errores comunes a algo que se entienda.
import { createClient } from "@supabase/supabase-js";
import { esAdmin } from "../../../lib/adminAuth";

function explicar(mensaje) {
  const m = (mensaje || "").toLowerCase();
  if (m.includes("not authorized"))
    return "Supabase todavía usa su correo de prueba: solo puede mandar a miembros de tu equipo. Falta conectar Resend (SMTP propio).";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Se alcanzó el límite de correos. Con el correo de prueba de Supabase son muy pocos por hora; con Resend se quita. Espera un rato e intenta otra vez.";
  if (m.includes("signups not allowed") || m.includes("signup"))
    return "El registro de cuentas nuevas está apagado en Supabase (Authentication → Sign In / Providers → Allow new users to sign up).";
  if (m.includes("smtp") || m.includes("sending") || m.includes("error sending"))
    return "Supabase no pudo mandar el correo. Revisa los datos de SMTP (host smtp.resend.com, puerto 465, usuario resend, contraseña = API key) y que tu dominio esté verificado en Resend.";
  return mensaje || "Error desconocido";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  if (!esAdmin(req)) return res.status(401).json({ error: "Contraseña incorrecta" });

  const correo = String(req.body?.correo || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return res.status(400).json({ error: "Escribe un correo válido." });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const origen = `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: { shouldCreateUser: true, emailRedirectTo: origen },
  });
  if (error) return res.status(400).json({ error: explicar(error.message) });
  return res.status(200).json({ ok: true });
}
