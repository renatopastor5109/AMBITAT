// "Invita a un amigo": tu código, tu crédito y el descuento de tu próximo mantenimiento.
import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";
import { obtenerCodigo, calcularDescuento } from "../../lib/referidosServidor";
import { obtenerPrecios } from "../../lib/agendaServidor";
import { tamanoPorClave } from "../../lib/servicio";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  const usuario = await obtenerUsuario(req);
  if (!usuario) return res.status(401).json({ error: "Entra a tu cuenta para invitar amigos." });
  const admin = clienteAdmin();
  try {
    const codigo = await obtenerCodigo(admin, usuario.id);
    const origen = process.env.NEXT_PUBLIC_SITE_URL || "https://ambitat.vercel.app";
    const [{ count: invitados }, { data: ganados }] = await Promise.all([
      admin.from("atribucion").select("user_id", { count: "exact", head: true }).eq("referido_por", usuario.id),
      admin.from("creditos").select("monto_centavos").eq("user_id", usuario.id).not("referido_id", "is", null),
    ]);
    // Descuento estimado para un tamaño (para mostrarlo antes de pagar).
    let descuento = null;
    const tamano = tamanoPorClave(req.query.tamano);
    if (tamano) {
      const precios = await obtenerPrecios(admin);
      const d = await calcularDescuento(admin, usuario.id, precios[tamano.key]);
      descuento = { total: d.total, bienvenida: d.bienvenida };
    }
    const d0 = await calcularDescuento(admin, usuario.id, 10 ** 9);
    return res.status(200).json({
      codigo,
      link: `${origen}/r/${codigo}`,
      creditoDisponible: d0.creditoDisponible,
      tieneBienvenida: d0.bienvenida > 0,
      amigosInvitados: invitados || 0,
      amigosQuePagaron: (ganados || []).length,
      descuento,
    });
  } catch (err) {
    console.error("Error en referidos:", err.message);
    const falta = /codigos_referido|atribucion|creditos/.test(err.message || "");
    return res.status(500).json({ error: falta ? "Esta función se activa pronto." : "No se pudo cargar. Intenta de nuevo." });
  }
}
