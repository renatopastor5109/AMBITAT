// Panel de administrador → Clientes: quién te ha reservado, cuánto te ha
// pagado, sus datos de contacto y tus notas privadas sobre cada uno.
//   GET                    → lista de clientes
//   POST { userId, nota }  → guarda tu nota privada de ese cliente
import { clienteAdmin } from "../../../lib/usuarioServidor";
import { esAdmin } from "../../../lib/adminAuth";
import { todasLasFilas, cobradoDe, faltaTabla } from "../../../lib/adminDatos";
import { diaCDMX } from "../../../lib/fechas";

const MAX_NOTA = 2000;
const esUuid = (v) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export default async function handler(req, res) {
  if (!esAdmin(req)) return res.status(401).json({ error: "Contraseña incorrecta" });
  const admin = clienteAdmin();

  if (req.method === "POST") {
    const { userId, nota } = req.body || {};
    if (!esUuid(userId) || typeof nota !== "string") return res.status(400).json({ error: "Datos inválidos" });
    const limpia = nota.trim().slice(0, MAX_NOTA);
    const { error } = await admin.from("notas_clientes").upsert({ user_id: userId, nota: limpia, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      console.error("Error guardando nota:", error);
      return res.status(500).json({ error: faltaTabla(error) ? "Falta correr supabase-revision-6.sql en Supabase." : "No se pudo guardar la nota." });
    }
    return res.status(200).json({ ok: true, nota: limpia });
  }
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });

  try {
    const hoy = diaCDMX();
    const reservaciones = await todasLasFilas(() => admin.from("reservaciones").select("*").order("created_at"));
    const porUsuario = new Map();
    for (const r of reservaciones) {
      const c =
        porUsuario.get(r.user_id) ||
        { userId: r.user_id, citas: [], cobrado: 0, completadas: 0, pagadas: 0, nombre: "", telefono: "", correo: "", direccion: "", ultimaActividad: r.created_at };
      c.citas.push({ id: r.id, fecha: r.fecha, hora: r.hora, estado: r.estado, tamano: r.tamano, precio: r.precio_centavos, notas: r.notas || "" });
      c.cobrado += cobradoDe(r);
      if (r.estado === "completado") c.completadas += 1;
      if (cobradoDe(r) > 0) c.pagadas += 1;
      // Los datos de contacto más recientes.
      c.nombre = r.nombre_contacto || c.nombre;
      c.telefono = r.telefono || c.telefono;
      c.correo = r.correo || c.correo;
      c.direccion = r.direccion || c.direccion;
      if (r.created_at > c.ultimaActividad) c.ultimaActividad = r.created_at;
      porUsuario.set(r.user_id, c);
    }
    const ids = [...porUsuario.keys()];

    // Plantas y notas de esos clientes.
    const plantasPor = {};
    const notasPor = {};
    let notasDisponibles = true;
    for (let i = 0; i < ids.length; i += 200) {
      const grupo = ids.slice(i, i + 200);
      const [{ data: plantas }, notas] = await Promise.all([
        admin.from("plantas").select("user_id").in("user_id", grupo),
        admin.from("notas_clientes").select("user_id, nota, updated_at").in("user_id", grupo),
      ]);
      (plantas || []).forEach((p) => (plantasPor[p.user_id] = (plantasPor[p.user_id] || 0) + 1));
      if (notas.error) notasDisponibles = !faltaTabla(notas.error) && notasDisponibles;
      (notas.data || []).forEach((n) => (notasPor[n.user_id] = n.nota));
    }

    const clientes = [...porUsuario.values()].map((c) => {
      const futuras = c.citas.filter((x) => x.fecha >= hoy && x.estado === "pagado").sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      const pasadas = c.citas.filter((x) => x.estado === "completado").sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
      return {
        ...c,
        citas: c.citas.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 20),
        proxima: futuras[0] || null,
        ultimaVisita: pasadas[0]?.fecha || null,
        plantas: plantasPor[c.userId] || 0,
        nota: notasPor[c.userId] || "",
        esCliente: c.pagadas > 0,
      };
    });
    clientes.sort((a, b) => (a.ultimaActividad < b.ultimaActividad ? 1 : -1));
    return res.status(200).json({ clientes, notasDisponibles });
  } catch (err) {
    console.error("Error leyendo clientes:", err);
    return res.status(500).json({ error: "No se pudieron leer los clientes." });
  }
}
