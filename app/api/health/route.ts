import { NextResponse } from "next/server";
import { isSupabaseEnabled, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const checks: any = {
    timestamp: new Date().toISOString(),
    supabase_enabled: isSupabaseEnabled(),
    env: {
      has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.slice(0, 30) + "..." : null,
    },
  };

  if (!isSupabaseEnabled()) {
    return NextResponse.json({
      ...checks,
      status: "ok",
      mode: "sqlite",
      message: "Đang dùng SQLite local (data/vexim.db). Để dùng Supabase, cấu hình 3 biến môi trường.",
    });
  }

  try {
    const sb = supabaseAdmin();

    // Test staff_users table
    const { count: userCount, error: userError } = await sb
      .from("staff_users")
      .select("id", { count: "exact", head: true });

    if (userError) {
      checks.staff_users = { error: userError, exists: false };
      if (userError.code === "PGRST205") {
        return NextResponse.json(
          {
            ...checks,
            status: "error",
            code: "PGRST205",
            message: "Bảng staff_users chưa tồn tại trong Supabase",
            solution: "Vào Supabase Dashboard > SQL Editor > chạy toàn bộ file supabase/schema.sql, sau đó chạy: NOTIFY pgrst, 'reload schema';",
            error: userError,
          },
          { status: 500 }
        );
      }
      throw userError;
    }

    checks.staff_users = { exists: true, count: userCount };

    // Test certificates table
    const { count: certCount, error: certError } = await sb
      .from("certificates")
      .select("id", { count: "exact", head: true });

    if (certError) {
      checks.certificates = { error: certError, exists: false };
      if (certError.code === "PGRST205") {
        return NextResponse.json(
          {
            ...checks,
            status: "error",
            code: "PGRST205",
            message: "Bảng certificates chưa tồn tại trong Supabase",
            solution: "Vào Supabase Dashboard > SQL Editor > chạy toàn bộ file supabase/schema.sql, sau đó chạy: NOTIFY pgrst, 'reload schema';",
            error: certError,
          },
          { status: 500 }
        );
      }
      throw certError;
    }

    checks.certificates = { exists: true, count: certCount };

    return NextResponse.json({
      ...checks,
      status: "ok",
      mode: "supabase",
      message: "Supabase kết nối thành công, bảng đã tồn tại.",
    });
  } catch (e: any) {
    console.error("[Health Check Error]", e);
    return NextResponse.json(
      {
        ...checks,
        status: "error",
        message: e?.message || "Lỗi kiểm tra Supabase",
        error: e,
        solution:
          "Kiểm tra: 1) Đã chạy supabase/schema.sql chưa? 2) Biến môi trường Supabase đúng chưa? 3) Chạy NOTIFY pgrst, 'reload schema'; trong SQL Editor",
      },
      { status: 500 }
    );
  }
}
