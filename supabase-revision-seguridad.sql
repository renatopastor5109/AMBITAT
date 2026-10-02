-- =========================================================
-- Ámbitat — revisión de seguridad (octubre 2026)
-- Córrelo completo en Supabase → SQL Editor, DESPUÉS de subir la nueva
-- versión de la app a Vercel. Es seguro correrlo más de una vez.
-- =========================================================

-- ---------- 1. Reservaciones: solo el servidor puede crearlas ----------
-- Antes la app insertaba la reservación directo, y alguien con conocimientos
-- podía ponerle otro precio o marcarla como "pagado". Ahora la crea
-- /api/reservar (con la service_role key), así que se quita el permiso de
-- insertar desde el navegador. Cada quien sigue pudiendo VER las suyas.
drop policy if exists "reservaciones_insert_propias" on public.reservaciones;

-- Estados válidos ("conflicto" = pagó un horario que ya estaba ocupado)
alter table public.reservaciones drop constraint if exists reservaciones_estado_valido;
alter table public.reservaciones add constraint reservaciones_estado_valido
  check (estado in ('pendiente_pago', 'pagado', 'completado', 'cancelado', 'conflicto')) not valid;

-- Nunca dos citas pagadas en la misma fecha y hora.
do $$
begin
  create unique index if not exists reservaciones_un_pago_por_horario
    on public.reservaciones (fecha, hora)
    where estado in ('pagado', 'completado');
exception when unique_violation then
  raise notice 'Ya hay dos citas pagadas en el mismo horario. Revisa el panel /admin y vuelve a correr este archivo.';
end $$;

-- ---------- 2. Límite diario de análisis con IA ----------
-- Lleva la cuenta de cuántos análisis hace cada persona, para que nadie
-- pueda gastar tu saldo de Anthropic de forma automatizada.
create table if not exists public.analisis_uso (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists analisis_uso_usuario_fecha on public.analisis_uso (user_id, created_at);
-- RLS activo y sin políticas = solo el servidor la puede leer o escribir.
alter table public.analisis_uso enable row level security;

-- ---------- 3. Fotos de plantas: que nadie pueda listar las carpetas ----------
-- El bucket es público, así que las fotos se siguen viendo con su enlace.
-- Esta regla de más permitía LISTAR las fotos de todos los usuarios.
drop policy if exists "plant_photos_select_publico" on storage.objects;

-- ---------- 4. Correcciones y sugerencias: sin spam ----------
drop policy if exists "correcciones_insert" on public.correcciones;
create policy "correcciones_insert" on public.correcciones
  for insert with check (
    exists (select 1 from public.plantas p where p.id = planta_id and p.user_id = auth.uid())
  );

alter table public.sugerencias drop constraint if exists sugerencias_largo;
alter table public.sugerencias add constraint sugerencias_largo
  check (char_length(mensaje) <= 2000) not valid;

alter table public.correcciones drop constraint if exists correcciones_largo;
alter table public.correcciones add constraint correcciones_largo
  check (char_length(coalesce(nombre_anterior, '')) <= 200 and char_length(coalesce(nombre_nuevo, '')) <= 200) not valid;

-- ---------- 5. Comunidad vieja (ya no se usa) ----------
-- La app ya no tiene publicaciones de usuarios. Se quitan los permisos de
-- esas tablas para que nadie las use como almacenamiento gratis. No se borra
-- ningún dato: si algún día quieres eliminarlas por completo, se hace aparte.
do $$
begin
  if to_regclass('public.perfiles') is not null then
    drop policy if exists "perfiles_select_publico" on public.perfiles;
    drop policy if exists "perfiles_insert_propio" on public.perfiles;
    drop policy if exists "perfiles_update_propio" on public.perfiles;
  end if;
  if to_regclass('public.publicaciones') is not null then
    drop policy if exists "publicaciones_select_publico" on public.publicaciones;
    drop policy if exists "publicaciones_insert_propia" on public.publicaciones;
    drop policy if exists "publicaciones_delete_propia" on public.publicaciones;
  end if;
  if to_regclass('public.publicaciones_likes') is not null then
    drop policy if exists "likes_select_publico" on public.publicaciones_likes;
    drop policy if exists "likes_insert_propio" on public.publicaciones_likes;
    drop policy if exists "likes_delete_propio" on public.publicaciones_likes;
  end if;
end $$;

drop policy if exists "community_photos_select_publico" on storage.objects;
drop policy if exists "community_photos_insert_propia_carpeta" on storage.objects;
drop policy if exists "community_photos_delete_propia_carpeta" on storage.objects;

-- =========================================================
-- Verificación: debe regresar "true" en todas las tablas.
-- =========================================================
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('plantas', 'push_subscriptions', 'sugerencias', 'correcciones', 'reservaciones', 'analisis_uso');
