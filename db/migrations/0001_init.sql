-- =====================================================================
--  Chama Aí — schema inicial
--  Equivalente ao antigo supabase-setup.sql, sem Supabase Auth/RLS/Storage:
--  autorização agora é feita na camada Node (src/server) e as fotos ficam
--  em disco (UPLOAD_DIR).
-- =====================================================================

-- Busca sem acento (ex: "eletrica" encontra "Elétrica").
create extension if not exists unaccent;

-- ---------------------------------------------------------------------
-- Administradores e sessões
-- ---------------------------------------------------------------------
create table admins (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email)),
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- O cookie guarda o token; aqui fica só o hash SHA-256 dele.
create table admin_sessions (
  token_hash text primary key,
  admin_id   uuid not null references admins(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index admin_sessions_expires_idx on admin_sessions(expires_at);
create index admin_sessions_admin_idx   on admin_sessions(admin_id);

-- ---------------------------------------------------------------------
-- Prestadores
-- ---------------------------------------------------------------------
create table providers (
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
  -- chaves relativas a UPLOAD_DIR, ex: prestadores/<id>/1-1700000000000.jpg
  photos       text[] not null default '{}' check (coalesce(array_length(photos, 1), 0) <= 4),
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected','paused'))
);
create index providers_status_created_idx on providers(status, created_at desc);
create index providers_status_city_idx    on providers(status, city);

-- ---------------------------------------------------------------------
-- Avaliações (uma por aparelho/prestador)
-- ---------------------------------------------------------------------
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  provider_id uuid not null references providers(id) on delete cascade,
  author      text not null check (char_length(author) between 2 and 60),
  stars       int  not null check (stars between 1 and 5),
  comment     text check (char_length(comment) <= 500),
  device_id   text not null check (char_length(device_id) between 8 and 64),
  unique (provider_id, device_id)
);
create index reviews_provider_idx on reviews(provider_id);
create index reviews_created_idx  on reviews(created_at desc);

-- ---------------------------------------------------------------------
-- Pedidos de orçamento (cópia para o admin acompanhar)
-- ---------------------------------------------------------------------
create table quotes (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  provider_id    uuid not null references providers(id) on delete cascade,
  client_name    text not null check (char_length(client_name) between 2 and 80),
  client_phone   text check (char_length(client_phone) <= 20),
  neighborhood   text not null check (char_length(neighborhood) between 2 and 60),
  preferred_when text check (char_length(preferred_when) <= 60),
  details        text not null check (char_length(details) between 10 and 1000)
);
create index quotes_provider_idx on quotes(provider_id);
create index quotes_created_idx  on quotes(created_at desc);
