-- OPCIONAL: ejecutar en Supabase > SQL Editor para registrar un perfil por usuario.
-- Supabase Auth YA almacena las cuentas en auth.users sin ejecutar este archivo.
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  creado_en timestamptz not null default now()
);

alter table public.perfiles enable row level security;

create policy "Cada usuario consulta su perfil"
on public.perfiles for select to authenticated using ((select auth.uid()) = id);

create policy "Cada usuario actualiza su perfil"
on public.perfiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.crear_perfil_al_registrarse()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfiles(id, nombre)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists crear_perfil_auth on auth.users;
create trigger crear_perfil_auth after insert on auth.users
for each row execute function public.crear_perfil_al_registrarse();
