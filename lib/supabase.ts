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
    // Next.js 14 cache fetch() mặc định khi render phía server (Data Cache). Truy vấn Supabase
    // phải luôn đọc database thật, nếu không dashboard và trang quét QR sẽ mãi hiển thị bản cũ
    // sau khi hồ sơ được sửa/duyệt (ví dụ địa chỉ vừa lưu vẫn hiện "chưa có thông tin").
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return cached;
}
