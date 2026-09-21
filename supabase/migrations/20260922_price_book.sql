-- Run BEFORE deploying the editable service price book. Additive, safe to re-run.
-- Rows are optional: a missing row means "use the built-in default template".
create table if not exists public.quote_templates (
  template_key text primary key check (template_key in ('FDA','GACC','SALE_EXPORT','AMAZON_OPS')),
  payload jsonb not null,
  updated_by bigint references public.staff_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.quote_templates enable row level security;
grant all on table public.quote_templates to service_role;
grant all on table public.quote_templates to postgres;

notify pgrst, 'reload schema';
