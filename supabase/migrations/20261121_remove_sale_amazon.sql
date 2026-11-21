-- Remove the discontinued Sale Export and Amazon Operations services.
-- This intentionally deletes their records and related leads, contracts, quotes, and invoices.

begin;

-- Payments must be removed before invoices tied to service contracts.
delete from public.invoice_payments
where invoice_id in (
  select id from public.invoices where ref_type = 'service_contract'
);
delete from public.invoices where ref_type = 'service_contract';

-- Remove saved price offers and CRM records for the discontinued pipelines.
delete from public.quotes where template_key in ('SALE_EXPORT', 'AMAZON_OPS');
delete from public.quote_templates where template_key in ('SALE_EXPORT', 'AMAZON_OPS');
delete from public.crm_opportunities
where pipeline_id in (
  select id from public.crm_pipelines where key in ('SALE_EXPORT', 'AMAZON_OPS')
);
delete from public.crm_pipelines where key in ('SALE_EXPORT', 'AMAZON_OPS');

-- These tables only stored the discontinued services.
drop table if exists public.service_contracts cascade;
drop table if exists public.consultation_leads cascade;

-- Keep the database from accepting the removed service types again.
alter table if exists public.invoices
  drop constraint if exists invoices_ref_type_check;
alter table if exists public.invoices
  add constraint invoices_ref_type_check check (ref_type = 'certificate');

alter table if exists public.quotes
  drop constraint if exists quotes_template_key_check;
alter table if exists public.quotes
  add constraint quotes_template_key_check check (template_key in ('FDA', 'GACC'));

alter table if exists public.quote_templates
  drop constraint if exists quote_templates_template_key_check;
alter table if exists public.quote_templates
  add constraint quote_templates_template_key_check check (template_key in ('FDA', 'GACC'));

commit;

notify pgrst, 'reload schema';
