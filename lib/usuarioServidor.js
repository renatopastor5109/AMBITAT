// Solo se usa en el SERVIDOR. Revisa quién está llamando a un endpoint a
// partir del token de sesión que la app manda en el header Authorization.
import { createClient } from "@supabase/supabase-js";

// permitirAnonimo: para lo que se puede usar sin cuenta (analizar plantas).
export async function obtenerUsuario(req, { permitirAnonimo = false } = {}) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  // Las sesiones sin cuenta (anónimas) solo entran donde se permite.
  if (data.user.is_anonymous && !permitirAnonimo) return null;
  return data.user;
}

export function clienteAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
