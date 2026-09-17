-- ============================================================================
-- VEXIM CRM — Sales Operation Management
-- Chạy file này trong Supabase SQL Editor SAU khi đã chạy schema.sql.
-- Next.js dùng SUPABASE_SERVICE_ROLE_KEY nên bỏ qua RLS.
-- File này chạy lại được nhiều lần (idempotent).
--
-- Nếu CHƯA chạy file này mà đã mở CRM, app sẽ báo:
--   23514 · new row for relation "staff_users" violates check constraint
--           "staff_users_role_check"
-- vì bảng staff_users khi đó chỉ cho phép 'admin' và 'specialist'.
-- ============================================================================

-- 0. Chặn chạy sai thứ tự: phải có bảng staff_users trước.
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'staff_users'
  ) then
    raise exception 'Chưa có bảng public.staff_users — hãy chạy supabase/schema.sql TRƯỚC file này.';
  end if;
end $$;

-- 1. Mở rộng bảng người dùng: 4 role CRM (admin/founder, ae, sr, lr) + specialist
alter table public.staff_users drop constraint if exists staff_users_role_check;
alter table public.staff_users
  add constraint staff_users_role_check
  check (role in ('admin', 'specialist', 'ae', 'sr', 'lr'));

alter table public.staff_users add column if not exists team_id bigint;

-- 2. Team sales — AE là Pipeline Owner của team
create table if not exists public.crm_teams (
  id bigint generated always as identity primary key,
  name text unique not null,
  ae_id bigint references public.staff_users(id),
  created_at timestamptz not null default now()
);

-- 3. Lead — LR tạo nguồn, SR research & qualification, AE phân công
create table if not exists public.crm_leads (
  id bigint generated always as identity primary key,
  code text unique not null,
  company_name text not null,
  contact_name text not null default '',
  contact_title text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  address text not null default '',
  country text not null default '',
  industry text not null default '',
  employee_size text not null default '',
  annual_revenue text not null default '',
  main_products text not null default '',
  target_market text not null default '',
  current_standards text not null default '',
  pain_points text not null default '',
  notes text not null default '',
  source text not null default 'other',
  source_detail text not null default '',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'unqualified', 'converted')),
  quality_score int not null default 0,
  owner_id bigint references public.staff_users(id),
  team_id bigint,
  assigned_at timestamptz,
  last_activity_at timestamptz,
  converted_opportunity_id bigint,
  certificate_id bigint references public.certificates(id),
  created_by bigint not null references public.staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Opportunity — bắt buộc có owner, next action, và không được "ngủ quên"
create table if not exists public.crm_opportunities (
  id bigint generated always as identity primary key,
  code text unique not null,
  title text not null default '',
  lead_id bigint references public.crm_leads(id) on delete set null,
  company_name text not null,
  standard text check (standard in ('FDA', 'GACC')),
  stage text not null default 'contacted'
    check (stage in ('contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  stage_entered_at timestamptz not null default now(),
  stage_changed_by bigint references public.staff_users(id),
  value bigint not null default 0,
  probability int not null default 20,
  currency text not null default 'VND',
  owner_id bigint references public.staff_users(id),
  team_id bigint,
  expected_close_date date,
  closed_at timestamptz,
  lost_reason text not null default '',
  next_action text not null default '',
  next_action_due date,
  next_action_owner_id bigint references public.staff_users(id),
  last_activity_at timestamptz,
  certificate_id bigint references public.certificates(id),
  created_by bigint not null references public.staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Activity log — research note, qualification, cuộc gọi, follow-up...
create table if not exists public.crm_activities (
  id bigint generated always as identity primary key,
  lead_id bigint references public.crm_leads(id) on delete cascade,
  opportunity_id bigint references public.crm_opportunities(id) on delete cascade,
  type text not null default 'note',
  subject text not null,
  content text not null default '',
  performed_at timestamptz not null default now(),
  created_by bigint not null references public.staff_users(id),
  is_follow_up boolean not null default false,
  due_at date,
  completed_at timestamptz
);

-- 6. Lịch sử đổi stage
create table if not exists public.crm_stage_events (
  id bigint generated always as identity primary key,
  opportunity_id bigint not null references public.crm_opportunities(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by bigint references public.staff_users(id),
  note text not null default '',
  changed_at timestamptz not null default now()
);

create index if not exists crm_leads_owner_idx on public.crm_leads(owner_id);
create index if not exists crm_leads_team_idx on public.crm_leads(team_id);
create index if not exists crm_leads_status_idx on public.crm_leads(status);
create index if not exists crm_opps_owner_idx on public.crm_opportunities(owner_id);
create index if not exists crm_opps_team_idx on public.crm_opportunities(team_id);
create index if not exists crm_opps_stage_idx on public.crm_opportunities(stage);
create index if not exists crm_activities_opp_idx on public.crm_activities(opportunity_id);
create index if not exists crm_activities_lead_idx on public.crm_activities(lead_id);
create index if not exists crm_stage_events_opp_idx on public.crm_stage_events(opportunity_id);

alter table public.crm_teams enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_opportunities enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_stage_events enable row level security;

-- Không mở policy cho anon: dữ liệu pipeline và khách hàng là tài sản nội bộ.
