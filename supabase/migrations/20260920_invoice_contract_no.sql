-- Run before deploying invoice contract-number support. Safe to re-run.
-- Does not overwrite existing invoices, totals or payments.
alter table public.invoices
  add column if not exists contract_no text not null default '';
notify pgrst, 'reload schema';
