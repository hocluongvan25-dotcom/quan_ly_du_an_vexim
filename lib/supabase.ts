import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

let cached: SupabaseClient | null = null;

export function supabaseAdmin() {
  if (!isSupabaseEnabled()) {
    throw new Error("Supabase is not configured.");
  }
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
