// Panel de administrador: viveros donde repartes tarjetas (con su QR) y
// cuánta gente llega de cada uno, más los números de "Invita a un amigo".
//   GET                      → viveros con estadísticas + resumen de invitaciones
//   POST { nombre, zona }    → da de alta un vivero
//   POST { slug, activo }    → pausa o reactiva un vivero
import { clienteAdmin } from "../../../lib/usuarioServidor";
import { esAdmin } from "../../../lib/adminAuth";
import { slugDe, esSlugValido } from "../../../lib/crecimiento";

const texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Trae todas las filas (de 1000 en 1000).
async function todas(consulta) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta().range(desde, desde + 999);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

export default async function handler(req, res) {
  if (!esAdmin(req)) return res.status(401).json({ error: "Contraseña incorrecta" });
  const admin = clienteAdmin();
  try {
    if (req.method === "POST") {
      const { nombre, zona, slug, activo } = req.body || {};
      if (slug && typeof activo === "boolean") {
        const { error } = await admin.from("aliados").update({ activo }).eq("slug", slug);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      const n = texto(nombre, 60);
      if (!n) return res.status(400).json({ error: "Escribe el nombre del vivero." });
      let base = slugDe(n);
      if (!esSlugValido(base)) base = "vivero";
      // Si ya existe uno con ese nombre, se le agrega un número.
      for (let i = 1; i <= 20; i++) {
        const candidato = i === 1 ? base : `${base}-${i}`.slice(0, 40);
        const { error } = await admin.from("aliados").insert({ slug: candidato, nombre: n, zona: texto(zona, 60) || null });
        if (!error) return res.status(200).json({ ok: true, slug: candidato });
        if (error.code !== "23505") throw error;
      }
      return res.status(409).json({ error: "Ya hay muchos viveros con ese nombre." });
    }

    if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

    const [aliados, atribuciones] = await Promise.all([
      todas(() => admin.from("aliados").select("slug, nombre, zona, activo, created_at").order("created_at")),
      todas(() => admin.from("atribucion").select("user_id, origen, referido_por")),
    ]);
    const usuarios = [...new Set(atribuciones.map((a) => a.user_id))];
    // Plantas y reservaciones pagadas de las personas que llegaron por QR o invitación.
    const plantasPor = {};
    const pagosPor = {};
    for (let i = 0; i < usuarios.length; i += 200) {
      const grupo = usuarios.slice(i, i + 200);
      const [plantas, reservas] = await Promise.all([
        todas(() => admin.from("plantas").select("user_id").in("user_id", grupo)),
        todas(() => admin.from("reservaciones").select("user_id, precio_centavos").in("user_id", grupo).in("estado", ["pagado", "completado"])),
      ]);
      plantas.forEach((p) => (plantasPor[p.user_id] = (plantasPor[p.user_id] || 0) + 1));
      reservas.forEach((r) => {
        const x = (pagosPor[r.user_id] = pagosPor[r.user_id] || { n: 0, total: 0 });
        x.n += 1;
        x.total += r.precio_centavos || 0;
      });
    }
    const resumir = (lista) => ({
      personas: lista.length,
      conPlantas: lista.filter((a) => plantasPor[a.user_id]).length,
      plantas: lista.reduce((s, a) => s + (plantasPor[a.user_id] || 0), 0),
      clientes: lista.filter((a) => pagosPor[a.user_id]).length,
      ingresos: lista.reduce((s, a) => s + (pagosPor[a.user_id]?.total || 0), 0),
    });

    const viveros = aliados.map((v) => ({ ...v, ...resumir(atribuciones.filter((a) => a.origen === v.slug)) }));
    const invitados = atribuciones.filter((a) => a.referido_por);
    const { count: creditosDados } = await admin.from("creditos").select("id", { count: "exact", head: true }).not("referido_id", "is", null);
    return res.status(200).json({
      viveros,
      invitaciones: { ...resumir(invitados), creditosDados: creditosDados || 0 },
    });
  } catch (err) {
    console.error("Error en crecimiento:", err);
    const falta = /aliados|atribucion|creditos/.test(err?.message || "") || err?.code === "42P01" || err?.code === "PGRST205";
    return res.status(500).json({ error: falta ? "Falta correr supabase-revision-4.sql en Supabase." : "No se pudo cargar. Intenta de nuevo." });
  }
}
