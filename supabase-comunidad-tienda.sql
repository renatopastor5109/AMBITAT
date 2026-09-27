-- =========================================================
-- Ámbitat — Comunidad + Tienda (reservación de mantenimiento)
-- Corre esto completo en Supabase → SQL Editor.
-- =========================================================

-- ---------- perfiles (nombre público para la comunidad) ----------
create table if not exists public.perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  created_at timestamptz default now()
);

alter table public.perfiles enable row level security;

drop policy if exists "perfiles_select_publico" on public.perfiles;
create policy "perfiles_select_publico" on public.perfiles
  for select using (true);

drop policy if exists "perfiles_insert_propio" on public.perfiles;
create policy "perfiles_insert_propio" on public.perfiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "perfiles_update_propio" on public.perfiles;
create policy "perfiles_update_propio" on public.perfiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- publicaciones (feed de comunidad) ----------
create table if not exists public.publicaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  texto text,
  imagen_url text,
  created_at timestamptz default now()
);

alter table public.publicaciones enable row level security;

drop policy if exists "publicaciones_select_publico" on public.publicaciones;
create policy "publicaciones_select_publico" on public.publicaciones
  for select using (true);

drop policy if exists "publicaciones_insert_propia" on public.publicaciones;
create policy "publicaciones_insert_propia" on public.publicaciones
  for insert with check (auth.uid() = user_id);

drop policy if exists "publicaciones_delete_propia" on public.publicaciones;
create policy "publicaciones_delete_propia" on public.publicaciones
  for delete using (auth.uid() = user_id);

-- ---------- publicaciones_likes ----------
create table if not exists public.publicaciones_likes (
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (publicacion_id, user_id)
);

alter table public.publicaciones_likes enable row level security;

drop policy if exists "likes_select_publico" on public.publicaciones_likes;
create policy "likes_select_publico" on public.publicaciones_likes
  for select using (true);

drop policy if exists "likes_insert_propio" on public.publicaciones_likes;
create policy "likes_insert_propio" on public.publicaciones_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "likes_delete_propio" on public.publicaciones_likes;
create policy "likes_delete_propio" on public.publicaciones_likes
  for delete using (auth.uid() = user_id);

-- ---------- reservaciones (mantenimiento con pago) ----------
create table if not exists public.reservaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre_contacto text not null,
  telefono text not null,
  correo text,
  fecha date not null,
  hora text not null,
  notas text,
  precio_centavos integer not null,
  estado text not null default 'pendiente_pago', -- pendiente_pago | pagado | cancelado
  metodo_pago text,                                -- card | oxxo
  stripe_session_id text,
  created_at timestamptz default now()
);

alter table public.reservaciones enable row level security;

drop policy if exists "reservaciones_select_propias" on public.reservaciones;
create policy "reservaciones_select_propias" on public.reservaciones
  for select using (auth.uid() = user_id);

drop policy if exists "reservaciones_insert_propias" on public.reservaciones;
create policy "reservaciones_insert_propias" on public.reservaciones
  for insert with check (auth.uid() = user_id);

-- el estado (pagado/cancelado) solo lo actualiza el webhook de Stripe,
-- que usa la service_role key y por eso se salta RLS — el cliente nunca
-- puede marcar su propia reservación como pagada.

-- ---------- Storage: bucket "community-photos" ----------
-- Crea el bucket "community-photos" en Supabase → Storage (marcado como público)
-- antes de correr esto.

drop policy if exists "community_photos_select_publico" on storage.objects;
create policy "community_photos_select_publico" on storage.objects
  for select using (bucket_id = 'community-photos');

drop policy if exists "community_photos_insert_propia_carpeta" on storage.objects;
create policy "community_photos_insert_propia_carpeta" on storage.objects
  for insert with check (
    bucket_id = 'community-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "community_photos_delete_propia_carpeta" on storage.objects;
create policy "community_photos_delete_propia_carpeta" on storage.objects
  for delete using (
    bucket_id = 'community-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =========================================================
-- Verificación rápida
-- =========================================================
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('perfiles', 'publicaciones', 'publicaciones_likes', 'reservaciones');
