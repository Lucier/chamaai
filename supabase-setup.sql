-- =====================================================================
--  CHAMA AÍ — Script de configuração do banco de dados (Supabase)
--  Como usar: Supabase > SQL Editor > New query > cole TUDO > Run
--  Pode rodar mais de uma vez sem problema.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1) ADMINISTRADORES (quem pode aprovar cadastros)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
-- Sem políticas: ninguém lê esta tabela pela internet, só a função abaixo.

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) PRESTADORES
-- ---------------------------------------------------------------------
create table if not exists public.providers (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 3 and 80),
  whatsapp     text not null check (whatsapp ~ '^55[0-9]{10,11}$'),
  category     text not null check (char_length(category) between 2 and 60),
  city         text not null check (char_length(city) between 2 and 60),
  neighborhood text not null check (char_length(neighborhood) between 2 and 60),
  price        numeric(10,2) not null default 0 check (price >= 0 and price < 1000000),
  price_unit   text not null default 'por serviço'
               check (price_unit in ('por serviço','por hora','por diária','por m²','a combinar')),
  description  text not null check (char_length(description) between 20 and 1000),
  photos       text[] not null default '{}' check (coalesce(array_length(photos,1),0) <= 4),
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected','paused'))
);
create index if not exists providers_status_idx on public.providers(status);
alter table public.providers enable row level security;

drop policy if exists "prestadores_ver" on public.providers;
create policy "prestadores_ver" on public.providers
  for select to anon, authenticated
  using (status = 'approved' or public.is_admin());

drop policy if exists "prestadores_cadastrar" on public.providers;
create policy "prestadores_cadastrar" on public.providers
  for insert to anon, authenticated
  with check (status = 'pending');

drop policy if exists "prestadores_admin_altera" on public.providers;
create policy "prestadores_admin_altera" on public.providers
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "prestadores_admin_exclui" on public.providers;
create policy "prestadores_admin_exclui" on public.providers
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 3) AVALIAÇÕES
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  author      text not null check (char_length(author) between 2 and 60),
  stars       int  not null check (stars between 1 and 5),
  comment     text check (char_length(comment) <= 500),
  device_id   text not null check (char_length(device_id) between 8 and 64),
  unique (provider_id, device_id)
);
alter table public.reviews enable row level security;

drop policy if exists "avaliacoes_ver" on public.reviews;
create policy "avaliacoes_ver" on public.reviews
  for select to anon, authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.providers p
      where p.id = provider_id and p.status = 'approved')
  );

drop policy if exists "avaliacoes_criar" on public.reviews;
create policy "avaliacoes_criar" on public.reviews
  for insert to anon, authenticated
  with check (exists (
    select 1 from public.providers p
    where p.id = provider_id and p.status = 'approved'));

drop policy if exists "avaliacoes_admin_exclui" on public.reviews;
create policy "avaliacoes_admin_exclui" on public.reviews
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 4) PEDIDOS DE ORÇAMENTO (cópia para o admin acompanhar)
-- ---------------------------------------------------------------------
create table if not exists public.quotes (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  provider_id    uuid not null references public.providers(id) on delete cascade,
  client_name    text not null check (char_length(client_name) between 2 and 80),
  client_phone   text check (char_length(client_phone) <= 20),
  neighborhood   text not null check (char_length(neighborhood) between 2 and 60),
  preferred_when text check (char_length(preferred_when) <= 60),
  details        text not null check (char_length(details) between 10 and 1000)
);
alter table public.quotes enable row level security;

drop policy if exists "orcamentos_criar" on public.quotes;
create policy "orcamentos_criar" on public.quotes
  for insert to anon, authenticated
  with check (exists (
    select 1 from public.providers p
    where p.id = provider_id and p.status = 'approved'));

drop policy if exists "orcamentos_admin_ve" on public.quotes;
create policy "orcamentos_admin_ve" on public.quotes
  for select to authenticated
  using (public.is_admin());

drop policy if exists "orcamentos_admin_exclui" on public.quotes;
create policy "orcamentos_admin_exclui" on public.quotes
  for delete to authenticated
  using (public.is_admin());

-- Permissões básicas (as regras acima continuam valendo por cima delas)
grant usage on schema public to anon, authenticated;
grant select, insert                 on public.providers to anon;
grant select, insert, update, delete on public.providers to authenticated;
grant select, insert                 on public.reviews   to anon;
grant select, insert, delete         on public.reviews   to authenticated;
grant insert                         on public.quotes    to anon;
grant select, insert, delete         on public.quotes    to authenticated;

-- ---------------------------------------------------------------------
-- 5) FOTOS (pasta pública "fotos", até 2 MB por foto)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "chamaai_fotos_enviar" on storage.objects;
create policy "chamaai_fotos_enviar" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'prestadores');

drop policy if exists "chamaai_fotos_admin_ver" on storage.objects;
create policy "chamaai_fotos_admin_ver" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and public.is_admin());

drop policy if exists "chamaai_fotos_admin_apagar" on storage.objects;
create policy "chamaai_fotos_admin_apagar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and public.is_admin());

-- =====================================================================
--  DEPOIS de criar seu usuário em Authentication > Users > Add user,
--  rode SÓ a linha abaixo (troque pelo seu e-mail) para virar admin:
--
--  insert into public.admins (user_id)
--  select id from auth.users where email = 'seu-email@exemplo.com'
--  on conflict do nothing;
-- =====================================================================
