-- =========================================================
-- Ámbitat — Tienda (reservación de mantenimiento)
-- Corre esto completo en Supabase → SQL Editor.
-- (La sección de comunidad con publicaciones ya no existe en la app.)
-- =========================================================

-- ---------- reservaciones (mantenimiento con pago) ----------
create table if not exists public.reservaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre_contacto text not null,
  telefono text not null,
  correo text,
  fecha date not null,
  hora text not null,
  direccion text,
  notas text,
  precio_centavos integer not null,
  estado text not null default 'pendiente_pago', -- pendiente_pago | pagado | completado | cancelado | conflicto
  metodo_pago text,                                -- card | oxxo
  stripe_session_id text,
  created_at timestamptz default now()
);

-- Si ya habías corrido este archivo antes de que existiera la columna
-- "direccion", esta línea la agrega sin tronar nada.
alter table public.reservaciones add column if not exists direccion text;
-- Tamaño del jardín elegido al reservar (pequeno | mediano | grande)
alter table public.reservaciones add column if not exists tamano text;

alter table public.reservaciones enable row level security;

drop policy if exists "reservaciones_select_propias" on public.reservaciones;
create policy "reservaciones_select_propias" on public.reservaciones
  for select using (auth.uid() = user_id);

-- Sin política de insert: las reservaciones las crea solo el servidor
-- (/api/reservar), que es quien pone el precio.
drop policy if exists "reservaciones_insert_propias" on public.reservaciones;

-- el estado (pagado/cancelado) solo lo actualiza el webhook de Stripe,
-- que usa la service_role key y por eso se salta RLS — el cliente nunca
-- puede marcar su propia reservación como pagada.

-- =========================================================
-- Verificación rápida
-- =========================================================
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('reservaciones');
