-- Run in the Supabase SQL Editor before deploying the form that adds the address field.
-- Additive only: existing certificates keep an empty address, nothing else changes.
-- This column IS public: it is printed in section 01 (Thông tin doanh nghiệp) of the QR verify page.
alter table public.certificates add column if not exists company_address text not null default '';
notify pgrst, 'reload schema';
