-- Chạy file này trong Supabase SQL Editor (một lần).
-- Service role từ Next.js sẽ bỏ qua RLS.

-- Tạo bảng staff_users
create table if not exists public.staff_users (
  id bigint generated always as identity primary key,
  email text unique not null,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'specialist')),
  created_at timestamptz not null default now()
);

-- Tạo bảng certificates
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

-- Index
create index if not exists certificates_public_code_idx on public.certificates (public_code);
create index if not exists certificates_status_idx on public.certificates (status);
create index if not exists certificates_standard_idx on public.certificates (standard);
create index if not exists certificates_created_by_idx on public.certificates (created_by);

-- RLS
alter table public.staff_users enable row level security;
alter table public.certificates enable row level security;

-- Không mở SELECT cho anon: giá dịch vụ không được lộ.
-- Next.js dùng SUPABASE_SERVICE_ROLE_KEY nên không cần policy (service_role bypass RLS).
-- Tuy nhiên để tránh lỗi khi dùng anon key test, tạo policy cho phép service_role (bypass rồi) và authenticated nếu cần:
-- Nếu bạn muốn test bằng anon key, hãy bỏ comment 2 policy dưới:
-- create policy "Allow all for anon and authenticated" on public.staff_users for all using (true) with check (true);
-- create policy "Allow all for anon and authenticated" on public.certificates for all using (true) with check (true);

-- Grants - đảm bảo service_role và postgres có quyền
grant all on table public.staff_users to service_role;
grant all on table public.certificates to service_role;
grant all on table public.staff_users to postgres;
grant all on table public.certificates to postgres;
grant usage, select on all sequences in schema public to service_role;
grant usage, select on all sequences in schema public to postgres;

-- Quan trọng: Reload PostgREST schema cache để tránh lỗi PGRST205
-- Sau khi chạy file này, nếu vẫn gặp PGRST205, hãy chạy riêng lệnh dưới trong SQL Editor:
notify pgrst, 'reload schema';
-- Hoặc: select pg_notify('pgrst', 'reload schema');

-- Kiểm tra bảng đã tạo
-- select table_name from information_schema.tables where table_schema='public' and table_name in ('staff_users','certificates');
