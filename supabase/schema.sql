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

-- Create certificates table with flexible validity, DUNS and US Agent (FDA only, GACC has none)
create table if not exists public.certificates (
  id bigint generated always as identity primary key,
  public_code text unique not null,
  certificate_no text unique not null,
  standard text not null check (standard in ('FDA', 'GACC')),
  registration_code text not null default '',
  duns_code text not null default '',
  us_agent text not null default '',
  service_price bigint not null default 0,
  company_name text not null default '',
  company_email text not null default '',
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

-- Migration for old DB without validity_years
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='certificates' and column_name='validity_years'
  ) then
    alter table public.certificates add column validity_years int not null default 2 check (validity_years between 1 and 10);
  end if;
end $$;

-- Migration for old DB without duns_code
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='certificates' and column_name='duns_code'
  ) then
    alter table public.certificates add column duns_code text not null default '';
  end if;
end $$;

-- Migration for old DB without us_agent (FDA only)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='certificates' and column_name='us_agent'
  ) then
    alter table public.certificates add column us_agent text not null default '';
  end if;
end $$;

-- Migration for company_email (for expiry warnings, hidden from QR)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='certificates' and column_name='company_email'
  ) then
    alter table public.certificates add column company_email text not null default '';
  end if;
end $$;

-- Cleanup: GACC does not have DUNS or US Agent - clear old data
update public.certificates set duns_code = '' where standard='GACC';
update public.certificates set us_agent = '' where standard='GACC';

-- Cleanup: drop fda_registration_status if it exists (feature removed per user request)
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='certificates' and column_name='fda_registration_status'
  ) then
    alter table public.certificates drop column fda_registration_status;
  end if;
end $$;

-- Update old data: set validity_years per standard if missing
update public.certificates set validity_years = 2 where standard='FDA' and (validity_years is null or validity_years not between 1 and 10);
update public.certificates set validity_years = 5 where standard='GACC' and (validity_years is null or validity_years not between 1 and 10);

-- Consultation Leads (B2B marketing from verify page)
create table if not exists public.consultation_leads (
  id bigint generated always as identity primary key,
  service_type text not null check (service_type in ('sales','amazon')),
  name text not null,
  phone text not null,
  email text not null default '',
  company_name text not null default '',
  certificate_no text not null default '',
  public_code text not null default '',
  message text not null default '',
  source_url text not null default '',
  ip text not null default '',
  status text not null default 'new' check (status in ('new','contacted','converted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Companies / Business Profiles (official DB)
create table if not exists public.companies (
  id bigint generated always as identity primary key,
  company_name text unique not null,
  email text not null default '',
  phone text not null default '',
  tax_code text not null default '',
  address text not null default '',
  contact_person text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Expiry Notifications (auto scan)
create table if not exists public.expiry_notifications (
  id bigint generated always as identity primary key,
  certificate_id bigint not null references public.certificates(id) on delete cascade,
  company_name text not null default '',
  notification_type text not null check (notification_type in ('90_days','60_days','30_days','14_days','7_days','3_days','1_day','expired','renewal_reminder')),
  recipient_email text not null default '',
  status text not null default 'sent' check (status in ('sent','failed')),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ================= CRM VẬN HÀNH (Operational CRM) =================
-- Pipeline đa dịch vụ → Stage (SLA + exit criteria) → Opportunity (Owner + Next action)

create table if not exists public.crm_pipelines (
  id bigint generated always as identity primary key,
  key text unique not null,
  name text not null,
  service text not null default '',
  description text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_stages (
  id bigint generated always as identity primary key,
  pipeline_id bigint not null references public.crm_pipelines(id) on delete cascade,
  key text not null,
  name text not null,
  sort_order int not null default 0,
  color text not null default '#64748b',
  sla_days int not null default 0,
  exit_criteria jsonb not null default '[]',
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now(),
  unique(pipeline_id, key)
);

create table if not exists public.crm_opportunities (
  id bigint generated always as identity primary key,
  pipeline_id bigint not null references public.crm_pipelines(id) on delete restrict,
  stage_id bigint not null references public.crm_stages(id) on delete restrict,
  title text not null default '',
  company_name text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  industry text not null default '',
  source text not null default '',
  estimated_value bigint not null default 0,
  owner_id bigint references public.staff_users(id) on delete set null,
  next_action text not null default '',
  next_action_date date,
  stage_entered_at timestamptz not null default now(),
  last_activity_at timestamptz,
  expected_close_date date,
  lost_reason text not null default '',
  notes text not null default '',
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_stage_history (
  id bigint generated always as identity primary key,
  opportunity_id bigint not null references public.crm_opportunities(id) on delete cascade,
  from_stage_id bigint references public.crm_stages(id) on delete set null,
  to_stage_id bigint not null references public.crm_stages(id) on delete restrict,
  duration_days numeric not null default 0,
  note text not null default '',
  changed_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_activities (
  id bigint generated always as identity primary key,
  opportunity_id bigint not null references public.crm_opportunities(id) on delete cascade,
  type text not null default 'note',
  title text not null default '',
  content text not null default '',
  outcome text not null default '',
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_checklists (
  id bigint generated always as identity primary key,
  opportunity_id bigint not null references public.crm_opportunities(id) on delete cascade,
  stage_key text not null default '',
  criterion_key text not null default '',
  is_checked boolean not null default false,
  checked_by bigint references public.staff_users(id) on delete set null,
  checked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(opportunity_id, stage_key, criterion_key)
);

-- ================= HỢP ĐỒNG DỊCH VỤ + KẾ TOÁN =================
-- Hợp đồng Sale XK / Amazon theo chu kỳ 3-6-12 tháng + hóa đơn từng đợt + VAT

create table if not exists public.service_contracts (
  id bigint generated always as identity primary key,
  contract_no text unique not null,
  service_type text not null check (service_type in ('SALE_EXPORT', 'AMAZON_OPS')),
  company_name text not null default '',
  company_email text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  scope text not null default '',
  cycle_months int not null default 6 check (cycle_months between 1 and 60),
  started_at date not null,
  ends_at date not null,
  contract_value bigint not null default 0,
  status text not null default 'draft' check (status in ('draft', 'active', 'expired', 'terminated')),
  renewal_count int not null default 0,
  last_renewed_at timestamptz,
  opportunity_id bigint references public.crm_opportunities(id) on delete set null,
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id bigint generated always as identity primary key,
  invoice_no text unique not null,
  contract_no text not null default '',
  payment_request jsonb,
  ref_type text not null check (ref_type in ('certificate', 'service_contract')),
  ref_id bigint not null,
  installment_no int not null default 1,
  title text not null default '',
  subtotal bigint not null default 0,
  vat_rate numeric not null default 8,
  vat_amount bigint not null default 0,
  total bigint not null default 0,
  issue_date date not null,
  due_date date,
  status text not null default 'issued' check (status in ('issued', 'cancelled')),
  notes text not null default '',
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing installations: preserve prior invoices and their monetary values.
alter table public.invoices add column if not exists contract_no text not null default '';
alter table public.invoices add column if not exists payment_request jsonb;

create table if not exists public.invoice_payments (
  id bigint generated always as identity primary key,
  invoice_id bigint not null references public.invoices(id) on delete cascade,
  amount bigint not null default 0,
  paid_at date not null,
  method text not null default '',
  reference text not null default '',
  note text not null default '',
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Báo giá dịch vụ: mẫu dựng sẵn theo dịch vụ, nhân viên chỉ nhập thông tin khách hàng.
create table if not exists public.quotes (
  id bigint generated always as identity primary key,
  quote_no text unique not null,
  template_key text not null check (template_key in ('FDA','GACC','SALE_EXPORT','AMAZON_OPS')),
  service_name text not null default '',
  title text not null default '',
  company_name text not null default '',
  company_address text not null default '',
  company_tax_code text not null default '',
  contact_name text not null default '',
  contact_title text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  items jsonb not null default '[]'::jsonb,
  scope jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  terms jsonb not null default '[]'::jsonb,
  timeline text not null default '',
  payment_terms text not null default '',
  note text not null default '',
  subtotal bigint not null default 0,
  discount_percent numeric not null default 0,
  discount_amount bigint not null default 0,
  vat_rate numeric not null default 8,
  vat_amount bigint not null default 0,
  total bigint not null default 0,
  optional_total bigint not null default 0,
  issue_date date not null,
  valid_until date,
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected')),
  opportunity_id bigint references public.crm_opportunities(id) on delete set null,
  created_by bigint references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bảng giá dịch vụ: Admin chỉnh đơn giá ngay trong hệ thống; DB đè giá mặc định trong code.
create table if not exists public.quote_templates (
  template_key text primary key check (template_key in ('FDA','GACC','SALE_EXPORT','AMAZON_OPS')),
  payload jsonb not null,
  updated_by bigint references public.staff_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.quote_templates enable row level security;
grant all on table public.quote_templates to service_role;
grant all on table public.quote_templates to postgres;

-- Indexes
create index if not exists certificates_public_code_idx on public.certificates (public_code);
create index if not exists certificates_status_idx on public.certificates (status);
create index if not exists certificates_standard_idx on public.certificates (standard);
create index if not exists certificates_created_by_idx on public.certificates (created_by);
create index if not exists certificates_validity_years_idx on public.certificates (validity_years);
create index if not exists certificates_duns_code_idx on public.certificates (duns_code);
create index if not exists certificates_us_agent_idx on public.certificates (us_agent);
create index if not exists consultation_leads_service_type_idx on public.consultation_leads (service_type);
create index if not exists consultation_leads_status_idx on public.consultation_leads (status);
create index if not exists consultation_leads_created_at_idx on public.consultation_leads (created_at desc);
create index if not exists companies_company_name_idx on public.companies (company_name);
create index if not exists companies_tax_code_idx on public.companies (tax_code);
create index if not exists companies_created_at_idx on public.companies (created_at desc);
create index if not exists expiry_notifications_certificate_id_idx on public.expiry_notifications (certificate_id);
create index if not exists expiry_notifications_type_idx on public.expiry_notifications (notification_type);
create index if not exists expiry_notifications_sent_at_idx on public.expiry_notifications (sent_at desc);
create index if not exists crm_stages_pipeline_idx on public.crm_stages (pipeline_id, sort_order);
create index if not exists crm_opportunities_pipeline_stage_idx on public.crm_opportunities (pipeline_id, stage_id);
create index if not exists crm_opportunities_owner_idx on public.crm_opportunities (owner_id);
create index if not exists crm_opportunities_company_idx on public.crm_opportunities (company_name);
create index if not exists crm_opportunities_next_action_idx on public.crm_opportunities (next_action_date);
create index if not exists crm_opportunities_updated_idx on public.crm_opportunities (updated_at desc);
create index if not exists crm_history_opp_idx on public.crm_stage_history (opportunity_id, created_at desc);
create index if not exists crm_activities_opp_idx on public.crm_activities (opportunity_id, created_at desc);
create index if not exists service_contracts_no_idx on public.service_contracts (contract_no);
create index if not exists service_contracts_company_idx on public.service_contracts (company_name);
create index if not exists service_contracts_status_idx on public.service_contracts (status);
create index if not exists invoices_ref_idx on public.invoices (ref_type, ref_id);
create index if not exists invoices_no_idx on public.invoices (invoice_no);
create index if not exists invoices_due_idx on public.invoices (due_date);
create index if not exists invoice_payments_invoice_idx on public.invoice_payments (invoice_id);
create index if not exists quotes_no_idx on public.quotes (quote_no);
create index if not exists quotes_company_idx on public.quotes (company_name);
create index if not exists quotes_pipeline_idx on public.quotes (template_key, status);
create index if not exists quotes_created_idx on public.quotes (created_at desc);

-- RLS
alter table public.staff_users enable row level security;
alter table public.certificates enable row level security;
alter table public.consultation_leads enable row level security;
alter table public.companies enable row level security;
alter table public.expiry_notifications enable row level security;
alter table public.crm_pipelines enable row level security;
alter table public.crm_stages enable row level security;
alter table public.crm_opportunities enable row level security;
alter table public.crm_stage_history enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_checklists enable row level security;
alter table public.service_contracts enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.quotes enable row level security;

-- Grants
grant all on table public.staff_users to service_role;
grant all on table public.certificates to service_role;
grant all on table public.consultation_leads to service_role;
grant all on table public.companies to service_role;
grant all on table public.expiry_notifications to service_role;
grant all on table public.crm_pipelines to service_role;
grant all on table public.crm_stages to service_role;
grant all on table public.crm_opportunities to service_role;
grant all on table public.crm_stage_history to service_role;
grant all on table public.crm_activities to service_role;
grant all on table public.crm_checklists to service_role;
grant all on table public.service_contracts to service_role;
grant all on table public.invoices to service_role;
grant all on table public.invoice_payments to service_role;
grant all on table public.quotes to service_role;
grant all on table public.staff_users to postgres;
grant all on table public.certificates to postgres;
grant all on table public.consultation_leads to postgres;
grant all on table public.companies to postgres;
grant all on table public.expiry_notifications to postgres;
grant all on table public.crm_pipelines to postgres;
grant all on table public.crm_stages to postgres;
grant all on table public.crm_opportunities to postgres;
grant all on table public.crm_stage_history to postgres;
grant all on table public.crm_activities to postgres;
grant all on table public.crm_checklists to postgres;
grant all on table public.service_contracts to postgres;
grant all on table public.invoices to postgres;
grant all on table public.invoice_payments to postgres;
grant all on table public.quotes to postgres;
grant usage, select on all sequences in schema public to service_role;
grant usage, select on all sequences in schema public to postgres;

-- Published data stays live while edits wait for administrator approval.
alter table public.certificates add column if not exists pending_changes jsonb;

-- Important: Reload PostgREST schema cache to avoid PGRST205 error
notify pgrst, 'reload schema';
