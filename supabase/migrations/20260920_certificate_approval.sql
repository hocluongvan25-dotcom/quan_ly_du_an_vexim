-- Run BEFORE deploying the certificate approval workflow. Safe to re-run.
-- No changes to existing published data, QR codes, dates or revenue.
alter table public.certificates
  add column if not exists pending_changes jsonb;
notify pgrst, 'reload schema';
