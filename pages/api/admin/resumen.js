// Panel de administrador → Inicio: cómo va el negocio y la app.
//   GET → dinero del mes, citas, personas, plantas, uso de la IA y actividad de 14 días.
import { clienteAdmin } from "../../../lib/usuarioServidor";
import { esAdmin } from "../../../lib/adminAuth";
import { todasLasFilas, todosLosUsuarios, cobradoDe } from "../../../lib/adminDatos";
import { diaCDMX, sumarDias } from "../../../lib/fechas";

export const config = { maxDuration: 30 };

// Día en CDMX de una fecha ISO (UTC-6, sin horario de verano).
const diaDe = (iso) => new Date(new Date(iso).getTime() - 6 * 3600 * 1000).toISOString().slice(0, 10);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  if (!esAdmin(req)) return res.status(401).json({ error: "Contraseña incorrecta" });
  const admin = clienteAdmin();
  const hoy = diaCDMX();
  const hace14 = sumarDias(hoy, -13);
  const hace7 = sumarDias(hoy, -6);
  const mes = hoy.slice(0, 7);
  const mesAnterior = diaCDMX(new Date(Date.parse(mes + "-01T12:00:00Z") - 5 * 864e5)).slice(0, 7);
  const desdeISO = new Date(Date.parse(hace14 + "T06:00:00Z")).toISOString();

  try {
    const [reservaciones, usuarios, plantas, analisis, { count: suscripciones }, sinLeer] = await Promise.all([
      todasLasFilas(() => admin.from("reservaciones").select("*").order("created_at")),
      todosLosUsuarios(admin).catch(() => null),
      todasLasFilas(() => admin.from("plantas").select("user_id, nombre_comun, estado_general, created_at").order("created_at")),
      todasLasFilas(() => admin.from("analisis_uso").select("created_at").gte("created_at", desdeISO).order("created_at")).catch(() => []),
      admin.from("push_subscriptions").select("id", { count: "exact", head: true }),
      admin.from("sugerencias").select("id", { count: "exact", head: true }).eq("leida", false),
    ]);

    // ---------- Dinero ----------
    const mesDe = (r) => diaDe(r.pagado_en || r.created_at).slice(0, 7);
    const pagadas = reservaciones.filter((r) => cobradoDe(r) > 0);
    const dineroMes = pagadas.filter((r) => mesDe(r) === mes).reduce((s, r) => s + cobradoDe(r), 0);
    const dineroMesAnterior = pagadas.filter((r) => mesDe(r) === mesAnterior).reduce((s, r) => s + cobradoDe(r), 0);
    const dineroTotal = pagadas.reduce((s, r) => s + cobradoDe(r), 0);
    const clientesPagando = new Set(pagadas.map((r) => r.user_id)).size;

    // ---------- Citas ----------
    const en7 = sumarDias(hoy, 6);
    const citas = {
      hoy: reservaciones.filter((r) => r.fecha === hoy && r.estado === "pagado").length,
      semana: reservaciones.filter((r) => r.fecha >= hoy && r.fecha <= en7 && r.estado === "pagado").length,
      completadasMes: reservaciones.filter((r) => r.estado === "completado" && r.fecha.slice(0, 7) === mes).length,
      canceladasMes: reservaciones.filter((r) => r.estado === "cancelado" && r.pagado_en && mesDe(r) === mes).length,
    };

    // ---------- Personas ----------
    const reales = usuarios ? usuarios.filter((u) => !u.is_anonymous) : null;
    const personas = usuarios
      ? {
          total: usuarios.length,
          conCuenta: reales.length,
          sinCuenta: usuarios.length - reales.length,
          nuevasSemana: usuarios.filter((u) => diaDe(u.created_at) >= hace7).length,
          conPlantas: new Set(plantas.map((p) => p.user_id)).size,
          activasSemana: usuarios.filter((u) => u.last_sign_in_at && diaDe(u.last_sign_in_at) >= hace7).length,
        }
      : null;

    // ---------- Plantas ----------
    const conteo = {};
    plantas.forEach((p) => {
      const n = (p.nombre_comun || "Sin nombre").trim();
      conteo[n] = (conteo[n] || 0) + 1;
    });
    const plantasRes = {
      total: plantas.length,
      nuevasSemana: plantas.filter((p) => diaDe(p.created_at) >= hace7).length,
      enRiesgo: plantas.filter((p) => p.estado_general === "critico").length,
      saludables: plantas.filter((p) => p.estado_general === "saludable").length,
      top: Object.entries(conteo)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([nombre, n]) => ({ nombre, n })),
    };

    // ---------- Actividad de 14 días ----------
    const dias = Array.from({ length: 14 }, (_, i) => sumarDias(hace14, i));
    const contar = (lista, campo) => {
      const m = {};
      lista.forEach((x) => {
        const d = diaDe(x[campo]);
        m[d] = (m[d] || 0) + 1;
      });
      return m;
    };
    const nuevas = usuarios ? contar(usuarios, "created_at") : {};
    const fotos = contar(analisis, "created_at");
    const reservas = contar(pagadas.filter((r) => r.pagado_en), "pagado_en");
    const actividad = dias.map((d) => ({ dia: d, personas: nuevas[d] || 0, analisis: fotos[d] || 0, pagos: reservas[d] || 0 }));

    return res.status(200).json({
      hoy,
      dinero: { mes: dineroMes, mesAnterior: dineroMesAnterior, total: dineroTotal, clientes: clientesPagando, ticketPromedio: pagadas.length ? Math.round(dineroTotal / pagadas.length) : 0 },
      citas,
      personas,
      plantas: plantasRes,
      analisisSemana: analisis.filter((a) => diaDe(a.created_at) >= hace7).length,
      suscripciones: suscripciones || 0,
      sugerenciasSinLeer: sinLeer?.error ? null : sinLeer?.count || 0,
      actividad,
    });
  } catch (err) {
    console.error("Error en resumen:", err);
    return res.status(500).json({ error: "No se pudo armar el resumen. Intenta de nuevo." });
  }
}
