-- =========================
-- EXTENSÃO UUID
-- =========================
create extension if not exists "pgcrypto";

-- =========================
-- COMPANIES (OBRIGATÓRIO)
-- =========================
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- 🔥 SEED OBRIGATÓRIO (evita FK error)
insert into public.companies (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Default Company')
on conflict (id) do nothing;

-- =========================
-- CLIENTES (ERP FINAL)
-- =========================
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  contribuinte text not null unique,

  morada text,
  localidade text,
  codigo_postal text,
  provincia text,
  municipio text,
  pais text default 'Angola',

  telefone text,
  email text,

  estado_nif text,
  webpage text,
  tipo_cliente text,

  saldo_inicial numeric(12,2) default 0,

  company_id uuid not null,

  created_at timestamp with time zone default now()
);

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_clientes_name on public.clientes(name);
create index if not exists idx_clientes_company on public.clientes(company_id);

-- =========================
-- FK CLIENTES → COMPANIES
-- =========================
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_clientes_company'
  ) then
    alter table public.clientes
    add constraint fk_clientes_company
    foreign key (company_id)
    references public.companies(id)
    on delete cascade;
  end if;
end $$;

-- =========================
-- FATURAS → CLIENTES
-- =========================
alter table public.faturas
add column if not exists cliente_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_faturas_clientes'
  ) then
    alter table public.faturas
    add constraint fk_faturas_clientes
    foreign key (cliente_id)
    references public.clientes(id)
    on delete set null;
  end if;
end $$;

-- =========================
-- LOCAIS TRABALHO → CLIENTES
-- =========================
alter table public.locais_trabalho
add column if not exists cliente_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_locais_clientes'
  ) then
    alter table public.locais_trabalho
    add constraint fk_locais_clientes
    foreign key (cliente_id)
    references public.clientes(id)
    on delete set null;
  end if;
end $$;

-- =========================
-- REFRESH CACHE SUPABASE
-- =========================
NOTIFY pgrst, 'reload schema';
