-- Run before deploying payment-request generation. Additive, safe to re-run.
-- Old invoices stay null: no invented contract dates/bank details or financial rewrites.
alter table public.invoices add column if not exists contract_no text not null default '';
alter table public.invoices add column if not exists payment_request jsonb;
notify pgrst, 'reload schema';
