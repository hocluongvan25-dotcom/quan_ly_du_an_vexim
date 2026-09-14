-- Run this file once in Supabase SQL Editor.
-- Service role from Next.js will bypass RLS.

-- Create staff_users table
create table if not exists public.staff_users (
  id bigint generated always as identity primary key,
  email text unique not null,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'specialist')),
  created_at timestamptz not null default now()
);

-- Create certificates table with flexible validity_years 1-10 years per contract
create table if not exists public.certificates (
  id bigint generated always as identity primary key,
  public_code text unique not null,
  certificate_no text unique not null,
  standard text not null check (standard in ('FDA', 'GACC')),
  registration_code text not null default '',
  service_price bigint not null default 0,
  company_name text not null default '',
  scope text not null default '',
  registered_at date not null,
  expires_at date not null,
  validity_years int not null default 2 check (validity_years between 1 and 10),
  validity_confirmed boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'expired')),
  published_at timestamptz,
  revenue_recorded boolean not null default false,
  renewal_count int not null default 0,
  last_renewed_at timestamptz,
  created_by bigint references public.staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration for old DB without validity_years column
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='certificates' and column_name='validity_years'
  ) then
    alter table public.certificates add column validity_years int not null default 2 check (validity_years between 1 and 10);
  end if;
end $$;

-- Update old data: set validity_years per standard if missing
-- FDA default 2 years, GACC default 5 years
update public.certificates set validity_years = 2 where standard='FDA' and (validity_years is null or validity_years not between 1 and 10);
update public.certificates set validity_years = 5 where standard='GACC' and (validity_years is null or validity_years not between 1 and 10);

-- Indexes
create index if not exists certificates_public_code_idx on public.certificates (public_code);
create index if not exists certificates_status_idx on public.certificates (status);
create index if not exists certificates_standard_idx on public.certificates (standard);
create index if not exists certificates_created_by_idx on public.certificates (created_by);
create index if not exists certificates_validity_years_idx on public.certificates (validity_years);

-- RLS
alter table public.staff_users enable row level security;
alter table public.certificates enable row level security;

-- Do not expose SELECT to anon: service fees should not be public.
-- Next.js uses SUPABASE_SERVICE_ROLE_KEY so no policy needed (service_role bypasses RLS).

-- Grants - ensure service_role and postgres have permissions
grant all on table public.staff_users to service_role;
grant all on table public.certificates to service_role;
grant all on table public.staff_users to postgres;
grant all on table public.certificates to postgres;
grant usage, select on all sequences in schema public to service_role;
grant usage, select on all sequences in schema public to postgres;

-- Important: Reload PostgREST schema cache to avoid PGRST205 error
notify pgrst, 'reload schema';
