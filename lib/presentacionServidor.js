// Solo SERVIDOR: datos de la página de presentación (precios y zonas que
// editas en /admin → Servicio).
import { tamanosConPrecios } from "./servicio";
import { ZONAS_INICIALES } from "./negocio";
import { clienteAdmin } from "./usuarioServidor";
import { obtenerPrecios, obtenerZonas } from "./agendaServidor";

export async function datosPresentacion(req) {
  let precios = null;
  let zonas = ZONAS_INICIALES;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = clienteAdmin();
      [precios, zonas] = await Promise.all([obtenerPrecios(admin), obtenerZonas(admin)]);
    }
  } catch (err) {
    console.error("No se pudieron leer precios o zonas:", err.message);
  }
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host || "ambitat.vercel.app"}`;
  return { tamanos: tamanosConPrecios(precios), zonas, sitio };
}
