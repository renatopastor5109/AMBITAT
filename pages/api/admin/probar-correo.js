// Panel de administrador: manda un código de prueba a un correo para revisar
// que el envío de correos (SMTP) y la plantilla funcionen como los ven los
// clientes. Traduce los errores comunes a algo que se entienda.
import { createClient } from "@supabase/supabase-js";
import { esAdmin } from "../../../lib/adminAuth";

function explicar(mensaje) {
  const m = (mensaje || "").toLowerCase();
  if (m.includes("not authorized"))
    return "Supabase todavía usa su correo de prueba: solo puede mandar a miembros de tu equipo. Falta conectar tu propio correo (Gmail o Resend, paso 3 de la guía).";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Se alcanzó el límite de correos. Con el correo de prueba de Supabase son muy pocos por hora; con tu propio correo se quita. Espera un rato e intenta otra vez.";
  if (m.includes("signups not allowed") || m.includes("signup"))
    return "El registro de cuentas nuevas está apagado en Supabase (Authentication → Sign In / Providers → Allow new users to sign up).";
  if (m.includes("smtp") || m.includes("sending") || m.includes("error sending"))
    return "Supabase no pudo mandar el correo. Revisa los datos de SMTP en Supabase. Con Gmail: host smtp.gmail.com, puerto 465, usuario = tu Gmail, contraseña = la contraseña de aplicación de 16 letras.";
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
  const origen = process.env.NEXT_PUBLIC_SITE_URL || "https://ambitat.vercel.app";
  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: { shouldCreateUser: true, emailRedirectTo: origen },
  });
  if (error) return res.status(400).json({ error: explicar(error.message) });
  return res.status(200).json({ ok: true });
}
