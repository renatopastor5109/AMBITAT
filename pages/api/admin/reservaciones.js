// Panel de administrador: regresa TODAS las reservaciones (de todos los
// usuarios). Solo responde si la contraseña de administrador es correcta.
import { createClient } from "@supabase/supabase-js";
import { esAdmin } from "../../../lib/adminAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: "Falta configurar ADMIN_PASSWORD en Vercel" });
  }
  if (!esAdmin(req)) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin
    .from("reservaciones")
    .select("*") // "*" para que funcione aunque todavía no exista alguna columna nueva
    .order("fecha", { ascending: true });

  if (error) {
    console.error("Error leyendo reservaciones:", error);
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ reservaciones: data || [] });
}
