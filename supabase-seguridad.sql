-- =========================================================
-- Ámbitat — script de seguridad consolidado
-- Corre esto completo en Supabase → SQL Editor.
-- Es seguro volver a correrlo (usa "if exists" / "or replace").
-- =========================================================

-- ---------- plantas ----------
alter table public.plantas enable row level security;

drop policy if exists "plantas_select_propias" on public.plantas;
create policy "plantas_select_propias" on public.plantas
  for select using (auth.uid() = user_id);

drop policy if exists "plantas_insert_propias" on public.plantas;
create policy "plantas_insert_propias" on public.plantas
  for insert with check (auth.uid() = user_id);

drop policy if exists "plantas_update_propias" on public.plantas;
create policy "plantas_update_propias" on public.plantas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plantas_delete_propias" on public.plantas;
create policy "plantas_delete_propias" on public.plantas
  for delete using (auth.uid() = user_id);

-- ---------- push_subscriptions ----------
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_select_propias" on public.push_subscriptions;
create policy "push_select_propias" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_insert_propias" on public.push_subscriptions;
create policy "push_insert_propias" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_update_propias" on public.push_subscriptions;
create policy "push_update_propias" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_delete_propias" on public.push_subscriptions;
create policy "push_delete_propias" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- (el cron de recordatorios usa la service_role key, que se salta RLS
--  a propósito — por eso nunca debe usarse en el navegador)

-- ---------- sugerencias (buzón: cualquiera puede escribir, nadie puede leer desde el cliente) ----------
alter table public.sugerencias enable row level security;

drop policy if exists "sugerencias_insert" on public.sugerencias;
create policy "sugerencias_insert" on public.sugerencias
  for insert with check (auth.uid() = user_id);

-- sin policy de select/update/delete = nadie desde el cliente puede leerlas
-- ni modificarlas; solo tú desde el dashboard de Supabase (que usa tu propio login, no RLS).

-- ---------- correcciones (registro de nombres corregidos, insert-only) ----------
alter table public.correcciones enable row level security;

drop policy if exists "correcciones_insert" on public.correcciones;
create policy "correcciones_insert" on public.correcciones
  for insert with check (true);

-- sin policy de select = nadie desde el cliente puede leer las correcciones de otros usuarios.

-- ---------- Storage: bucket "plant-photos" ----------
-- Los archivos se guardan como "<user_id>/archivo.jpg" — estas políticas
-- obligan a que cada quien solo pueda subir/editar/borrar dentro de su propia carpeta.

drop policy if exists "plant_photos_select_publico" on storage.objects;
create policy "plant_photos_select_publico" on storage.objects
  for select using (bucket_id = 'plant-photos');

drop policy if exists "plant_photos_insert_propia_carpeta" on storage.objects;
create policy "plant_photos_insert_propia_carpeta" on storage.objects
  for insert with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "plant_photos_update_propia_carpeta" on storage.objects;
create policy "plant_photos_update_propia_carpeta" on storage.objects
  for update using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "plant_photos_delete_propia_carpeta" on storage.objects;
create policy "plant_photos_delete_propia_carpeta" on storage.objects
  for delete using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =========================================================
-- Verificación rápida: esta consulta debe regresar "true" en
-- rowsecurity para las 4 tablas.
-- =========================================================
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('plantas', 'push_subscriptions', 'sugerencias', 'correcciones');
