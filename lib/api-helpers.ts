import { NextResponse } from "next/server";

export function handleApiError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[API Error]", msg, e);

  if (msg.includes("SUPABASE_SCHEMA_MISSING")) {
    return NextResponse.json(
      {
        error: "Lỗi cấu hình Supabase",
        details: msg,
        hint: "Vui lòng vào Supabase Dashboard > SQL Editor, chạy toàn bộ file supabase/schema.sql, sau đó chạy: NOTIFY pgrst, 'reload schema';",
        code: "PGRST205",
      },
      { status: 500 }
    );
  }

  if (msg.includes("PGRST205") || msg.includes("schema cache") || msg.includes("Could not find the table")) {
    return NextResponse.json(
      {
        error: "Không tìm thấy bảng trong Supabase (PGRST205)",
        details: msg,
        hint: "Bảng public.staff_users hoặc public.certificates chưa tồn tại. Hãy chạy supabase/schema.sql trong Supabase SQL Editor và reload schema cache.",
        code: "PGRST205",
      },
      { status: 500 }
    );
  }

  const map: Record<string, string> = {
    NOT_FOUND: "Không tìm thấy hồ sơ.",
    NOT_CONFIRMED: "Cần xác nhận hiệu lực (VALID) trước khi xuất bản.",
    INCOMPLETE: "Thiếu tên công ty hoặc mã số đăng ký.",
    MISSING_DATES: "Thiếu ngày đăng ký / ngày hết hạn.",
    PUBLISHED: "Không thể xoá hồ sơ đã xuất bản.",
    UNAUTHORIZED: "Chưa đăng nhập.",
    FORBIDDEN: "Không có quyền.",
  };

  return NextResponse.json({ error: map[msg] || msg }, { status: 400 });
}
