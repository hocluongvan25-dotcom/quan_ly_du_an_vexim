# Vexim Global — FDA & GACC Certificate Management

Internal system of **Vexim Global Co., Ltd**: FDA / GACC record management, QR verification, revenue analytics.

- FDA flexible **1-10 years** per client contract (default 2 years), GACC **1-10 years** (default 5 years)
- Renewal follows contract duration
- Roles: Admin and Specialist
- QR landing page **does not display service fees**
- Data managed on **Supabase** (PostgreSQL)
- Deploy on **Vercel**

Font: **Be Vietnam Pro** (full Vietnamese diacritics support, but UI is English).

## 1. Flexible Validity + DUNS (New)

**Flexible Validity:** Previously FDA fixed 2 years, GACC fixed 5 years. Now supports **1-10 years** per contract:

- When creating a new record, select **Contract Duration**: 1 year, 2 years, 3 years, ..., 10 years
- FDA: typically 2 years but can be 1, 3, 5, 10 years per client
- GACC: default 5 years, but customizable 1-10 years
- Expiry auto-calculated: `registered_at + validity_years`
- **Renewal follows contract duration** — e.g., 3-year contract renews +3 years, 5-year contract renews +5 years. No fixed 2-year renewal.
- Dashboard shows stats per validity duration

**DUNS Number:**

- **DUNS Number** (Data Universal Numbering System): 9-digit unique identifier issued by Dun & Bradstreet, required for FDA facility registration. Format `12-345-6789`, stored as 9 digits, displayed formatted. Validated on create/update.
- UI: Form has DUNS input (with XX-XXX-XXXX formatting + 9-digit validation). Dashboard table shows DUNS column. Verification page shows DUNS card.
- Public API `/api/public/certificates/[code]` now returns `duns_code`.

**Migration:**
- Re-run `supabase/schema.sql` in Supabase SQL Editor to add `validity_years`, `duns_code` columns (also drops `fda_registration_status` if it exists)
- Local SQLite will auto-migrate on `npm run dev`

## 2. Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. SQL Editor → paste and run `supabase/schema.sql`
3. Settings → API, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never expose to client)

On first login, system auto-creates demo accounts if `staff_users` table is empty.

## 3. Run Locally

```bash
cp .env.example .env.local
# fill 3 Supabase vars
npm install
npm run dev
```

If **no** Supabase vars, app falls back to SQLite `data/vexim.db` for UI preview.

## 3b. Service Quotes (New) — `/dashboard/bao-gia`

Pre-built quote templates per service so staff only enter customer details and export a PDF:

- 4 templates: **FDA**, **GACC**, **Sale xuất khẩu Mỹ**, **Vận hành Amazon US** — line items, unit prices,
  scope of work, documents to be provided, timeline, payment terms and general terms are pre-filled.
- Optional line items (US Agent, PPC, catalogue…) are quoted separately and **not added to the total**.
- Numbers are recomputed server-side; the amount in Vietnamese words is printed on every quote.
- Quote lifecycle: **Nháp → Đã gửi khách → Khách đồng ý / Từ chối** (+ auto *Hết hiệu lực* after the validity date).
  A quote sent to the customer is locked; use **Nhân bản để sửa** to revise it.
- PDF export (`/api/quotes/[id]/pdf`) uses the bundled Tinos fonts, repeats table headers across pages.
- Created from a CRM opportunity with one click (service, company, contact, email, phone pre-filled).
- See `docs/bao-gia.md`. Prices in `lib/quote-templates.ts` are **sample prices** — update them before sending real quotes.

Migration: run `supabase/schema.sql` or `supabase/migrations/20260921_quotes.sql`, then `NOTIFY pgrst, 'reload schema';`

## 4. Deploy to Vercel

```bash
npx vercel
```

On Vercel → Project → Settings → Environment Variables, add 4 vars from `.env.example`.

Or connect GitHub repo `hocluongvan25-dotcom/quan_ly_du_an_vexim` and Import on vercel.com.

## 5. Troubleshooting

### Error PGRST205: Could not find the table 'public.staff_users' in the schema cache

**Cause:** Table `staff_users` / `certificates` not created in Supabase, or PostgREST schema cache not reloaded.

**Fix:**

1. Go to **Supabase Dashboard** → select project → **SQL Editor** → **New query**
2. Copy entire `supabase/schema.sql` and run
3. Then run:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   Or:
   ```sql
   SELECT pg_notify('pgrst', 'reload schema');
   ```
4. Wait 5-10 seconds for cache reload
5. Check **Table Editor** for tables `staff_users` and `certificates`
6. Test health: visit `/api/health`, should return `status: ok`

**Check Vercel env vars:**

- `NEXT_PUBLIC_SUPABASE_URL` must be like `https://xxxx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is anon key
- `SUPABASE_SERVICE_ROLE_KEY` is service_role key (required to bypass RLS)
- After changing env vars, **Redeploy**

**Still failing:**

- Supabase → Settings → API → check **Exposed schemas** contains `public`
- Database → Roles → ensure `service_role` has permissions
- Temporarily disable RLS for testing: `ALTER TABLE public.staff_users DISABLE ROW LEVEL SECURITY;`

### Quick Debug

Visit `/api/health` endpoint to see:
- Whether Supabase is configured
- Whether tables exist
- Current record counts

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@veximglobal.com` | `Vexim@Admin2026` |
| Specialist | `chuyenmon@veximglobal.com` | `Vexim@CM2026` |

## Contact Vexim Global

No. 25/6/51 Ngoa Long, Tay Tuu, Bac Tu Liem, Hanoi · 0373 685 634 · contact@veximglobal.com
