-- Run in the Supabase SQL Editor before deploying the form that adds User/Pass.
-- Additive only: existing certificates keep empty credentials, nothing public changes.
-- These two columns are internal (staff only) and are never returned by the QR / verify page.
alter table public.certificates add column if not exists portal_user text not null default '';
alter table public.certificates add column if not exists portal_pass text not null default '';
notify pgrst, 'reload schema';
