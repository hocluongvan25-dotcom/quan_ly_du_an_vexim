-- Chạy file này trong Supabase SQL Editor (một lần).
-- Service role từ Next.js sẽ bỏ qua RLS.

create table if not exists public.staff_users (
  id bigint generated always as identity primary key,
  email text unique not null,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'specialist')),
  created_at timestamptz not null default now()
);

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

create index if not exists certificates_public_code_idx on public.certificates (public_code);
create index if not exists certificates_status_idx on public.certificates (status);

alter table public.staff_users enable row level security;
alter table public.certificates enable row level security;

-- Không mở SELECT cho anon: giá dịch vụ không được lộ.
-- Next.js dùng SUPABASE_SERVICE_ROLE_KEY nên không cần policy.
