-- Run BEFORE deploying the service quote module. Additive, safe to re-run.
-- Existing data is untouched: quotes are a brand-new table.
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

create index if not exists quotes_no_idx on public.quotes (quote_no);
create index if not exists quotes_company_idx on public.quotes (company_name);
create index if not exists quotes_pipeline_idx on public.quotes (template_key, status);
create index if not exists quotes_created_idx on public.quotes (created_at desc);

alter table public.quotes enable row level security;
grant all on table public.quotes to service_role;
grant all on table public.quotes to postgres;

notify pgrst, 'reload schema';
