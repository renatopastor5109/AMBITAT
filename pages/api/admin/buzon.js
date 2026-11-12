// Panel de administrador → Buzón: lo que te escriben desde la app y los
// nombres de plantas que la gente corrige (para saber en qué falla la IA).
//   GET                         → sugerencias y correcciones recientes
//   POST { id, leida }          → marca una sugerencia como leída / no leída
//   POST { todas: true }        → marca todas como leídas
import { clienteAdmin } from "../../../lib/usuarioServidor";
import { esAdmin } from "../../../lib/adminAuth";
import { faltaTabla } from "../../../lib/adminDatos";

export default async function handler(req, res) {
  if (!esAdmin(req)) return res.status(401).json({ error: "Contraseña incorrecta" });
  const admin = clienteAdmin();

  if (req.method === "POST") {
    const { id, leida, todas } = req.body || {};
    let consulta = admin.from("sugerencias").update({ leida: todas ? true : !!leida });
    consulta = todas ? consulta.eq("leida", false) : consulta.eq("id", id);
    if (!todas && (id === undefined || id === null)) return res.status(400).json({ error: "Falta cuál" });
    const { error } = await consulta;
    if (error) {
      console.error("Error en buzón:", error);
      return res.status(500).json({ error: faltaTabla(error) ? "Falta correr supabase-revision-6.sql en Supabase." : "No se pudo actualizar." });
    }
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  try {
    // "*": funciona aunque todavía no exista la columna "leida".
    const [sug, corr] = await Promise.all([
      admin.from("sugerencias").select("*").order("created_at", { ascending: false }).limit(200),
      admin.from("correcciones").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (sug.error) throw sug.error;
    const sugerencias = (sug.data || []).map((s) => ({ id: s.id, mensaje: s.mensaje, fecha: s.created_at, leida: !!s.leida, userId: s.user_id }));
    // Las correcciones más repetidas (ej. "Pothos" → "Filodendro" 4 veces).
    const veces = {};
    (corr.data || []).forEach((c) => {
      const k = `${c.nombre_anterior} → ${c.nombre_nuevo}`;
      veces[k] = (veces[k] || 0) + 1;
    });
    const correcciones = Object.entries(veces)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([cambio, n]) => ({ cambio, n }));
    return res.status(200).json({
      sugerencias,
      sinLeer: sugerencias.filter((s) => !s.leida).length,
      puedeMarcar: (sug.data || []).length === 0 || "leida" in (sug.data[0] || {}),
      correcciones,
      totalCorrecciones: (corr.data || []).length,
    });
  } catch (err) {
    console.error("Error leyendo buzón:", err);
    return res.status(500).json({ error: "No se pudo leer el buzón." });
  }
}
