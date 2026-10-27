// Anota de dónde llegó la persona (vivero por QR y/o amigo que la invitó).
// Solo se anota una vez por persona. También regresa el nombre del vivero
// para darle la bienvenida.
import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";
import { esSlugValido, esCodigoValido } from "../../lib/crecimiento";
import { usuarioDeCodigo } from "../../lib/referidosServidor";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Nombre del vivero (público) para la bienvenida.
    const slug = String(req.query.v || "");
    if (!esSlugValido(slug)) return res.status(400).json({ error: "Vivero inválido" });
    try {
      const { data } = await clienteAdmin().from("aliados").select("nombre").eq("slug", slug).eq("activo", true).maybeSingle();
      res.setHeader("Cache-Control", "public, s-maxage=600");
      return res.status(200).json({ nombre: data?.nombre || null });
    } catch {
      return res.status(200).json({ nombre: null });
    }
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const usuario = await obtenerUsuario(req, { permitirAnonimo: true });
  if (!usuario) return res.status(401).json({ error: "Sin sesión" });
  const { v, ref } = req.body || {};
  const admin = clienteAdmin();
  try {
    const { data: ya } = await admin.from("atribucion").select("user_id").eq("user_id", usuario.id).maybeSingle();
    if (ya) return res.status(200).json({ ok: true, nuevo: false });

    let origen = null;
    if (esSlugValido(v)) {
      const { data } = await admin.from("aliados").select("slug").eq("slug", v).maybeSingle();
      origen = data?.slug || null;
    }
    let referidoPor = null;
    if (esCodigoValido(ref)) {
      const quien = await usuarioDeCodigo(admin, ref);
      if (quien && quien !== usuario.id) referidoPor = quien;
    }
    if (!origen && !referidoPor) return res.status(200).json({ ok: true, nuevo: false });

    const { error } = await admin.from("atribucion").insert({ user_id: usuario.id, origen, referido_por: referidoPor });
    if (error && error.code !== "23505") throw error;
    return res.status(200).json({ ok: true, nuevo: !error, referido: !!referidoPor });
  } catch (err) {
    console.error("Error anotando origen:", err.message);
    return res.status(200).json({ ok: false });
  }
}
