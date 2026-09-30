// Solo se usa en el SERVIDOR (dentro de pages/api). Revisa que la contraseña
// que manda el panel de administrador coincida con ADMIN_PASSWORD de Vercel.
import crypto from "crypto";

export function esAdmin(req) {
  const esperada = process.env.ADMIN_PASSWORD;
  const recibida = req.headers["x-admin-password"];
  if (!esperada || typeof recibida !== "string" || !recibida) return false;

  // Comparación de tiempo constante: evita adivinar la contraseña midiendo
  // cuánto tarda el servidor en responder.
  const a = crypto.createHash("sha256").update(recibida).digest();
  const b = crypto.createHash("sha256").update(esperada).digest();
  return crypto.timingSafeEqual(a, b);
}
