// Revisa un código de descuento antes de pagar (para enseñar el precio final).
//   GET ?codigo=BUENFIN20&tamano=mediano → { codigo, monto, descripcion } o { error }
import { obtenerUsuario, clienteAdmin } from "../../lib/usuarioServidor";
import { calcularDescuento } from "../../lib/referidosServidor";
import { obtenerPrecios } from "../../lib/agendaServidor";
import { tamanoPorClave } from "../../lib/servicio";
import { validarCupon } from "../../lib/cuponesServidor";
import { COBRO_MINIMO_CENTAVOS } from "../../lib/crecimiento";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  const usuario = await obtenerUsuario(req);
  if (!usuario) return res.status(401).json({ error: "Entra a tu cuenta para usar un código." });
  const tamano = tamanoPorClave(req.query.tamano);
  if (!tamano) return res.status(400).json({ error: "Elige el tamaño de tu jardín." });
  const admin = clienteAdmin();
  try {
    const precio = (await obtenerPrecios(admin))[tamano.key];
    const otros = await calcularDescuento(admin, usuario.id, precio);
    const r = await validarCupon(admin, req.query.codigo, usuario.id, precio, precio - otros.total - COBRO_MINIMO_CENTAVOS);
    if (!r.ok) return res.status(400).json({ error: r.error });
    return res.status(200).json({ codigo: r.codigo, monto: r.monto, descripcion: r.descripcion });
  } catch (err) {
    console.error("Error revisando código:", err);
    return res.status(500).json({ error: "No se pudo revisar el código. Intenta de nuevo." });
  }
}
