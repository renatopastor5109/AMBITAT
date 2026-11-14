// Panel de administrador → Descuentos: códigos que la gente escribe al reservar.
//   GET                                   → códigos con cuántas veces se usaron
//   POST { accion: "crear", ... }          → crea un código
//   POST { accion: "activar", codigo, activo } → pausa o reactiva
//   POST { accion: "borrar", codigo }      → borra (solo si nadie lo ha usado)
import { clienteAdmin } from "../../../lib/usuarioServidor";
import { esAdmin } from "../../../lib/adminAuth";
import { faltaTabla, todasLasFilas } from "../../../lib/adminDatos";
import { limpiarCodigo, codigoValido, MAX_PORCENTAJE } from "../../../lib/cupones";

const FALTA_SQL = "Falta correr supabase-revision-7.sql en Supabase.";
const entero = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : NaN);

export default async function handler(req, res) {
  if (!esAdmin(req)) return res.status(401).json({ error: "Contraseña incorrecta" });
  const admin = clienteAdmin();
  try {
    if (req.method === "GET") {
      const { data: cupones, error } = await admin.from("cupones").select("*").order("created_at", { ascending: false });
      if (error) return res.status(faltaTabla(error) ? 200 : 500).json(faltaTabla(error) ? { cupones: [], falta: FALTA_SQL } : { error: "No se pudieron leer los códigos." });
      const usos = await todasLasFilas(() => admin.from("cupones_usos").select("codigo, descuento_centavos"));
      const por = {};
      usos.forEach((u) => {
        const x = (por[u.codigo] = por[u.codigo] || { usos: 0, descontado: 0 });
        x.usos += 1;
        x.descontado += u.descuento_centavos || 0;
      });
      return res.status(200).json({ cupones: cupones.map((c) => ({ ...c, usos: por[c.codigo]?.usos || 0, descontado: por[c.codigo]?.descontado || 0 })) });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

    const b = req.body || {};
    const codigo = limpiarCodigo(b.codigo);
    if (!codigoValido(codigo)) return res.status(400).json({ error: "El código debe tener de 3 a 20 letras o números, sin espacios." });

    if (b.accion === "activar") {
      const { error } = await admin.from("cupones").update({ activo: !!b.activo }).eq("codigo", codigo);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (b.accion === "borrar") {
      const { count } = await admin.from("cupones_usos").select("id", { count: "exact", head: true }).eq("codigo", codigo);
      if ((count || 0) > 0) return res.status(409).json({ error: "Este código ya se usó; mejor páusalo para conservar el historial." });
      const { error } = await admin.from("cupones").delete().eq("codigo", codigo);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (b.accion !== "crear") return res.status(400).json({ error: "Acción desconocida" });

    const tipo = b.tipo === "monto" ? "monto" : "porcentaje";
    const numero = entero(b.valor);
    if (tipo === "porcentaje" && !(numero >= 1 && numero <= MAX_PORCENTAJE)) return res.status(400).json({ error: `El porcentaje va de 1 a ${MAX_PORCENTAJE}.` });
    if (tipo === "monto" && !(numero >= 10 && numero <= 5000)) return res.status(400).json({ error: "El descuento en pesos va de $10 a $5,000." });
    const vence = typeof b.vence === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.vence) ? b.vence : null;
    const usosMax = b.usosMax ? entero(b.usosMax) : null;
    if (usosMax !== null && !(usosMax >= 1 && usosMax <= 100000)) return res.status(400).json({ error: "El número de usos debe ser 1 o más." });

    const { error } = await admin.from("cupones").insert({
      codigo,
      tipo,
      valor: tipo === "monto" ? numero * 100 : numero,
      vence,
      usos_max: usosMax,
      una_por_persona: b.unaPorPersona !== false,
      solo_nuevos: !!b.soloNuevos,
      nota: typeof b.nota === "string" && b.nota.trim() ? b.nota.trim().slice(0, 200) : null,
    });
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: `Ya existe el código ${codigo}.` });
      throw error;
    }
    return res.status(200).json({ ok: true, codigo });
  } catch (err) {
    console.error("Error en descuentos:", err);
    return res.status(500).json({ error: faltaTabla(err) ? FALTA_SQL : "No se pudo completar. Intenta de nuevo." });
  }
}
