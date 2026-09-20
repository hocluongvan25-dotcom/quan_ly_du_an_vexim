import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { overviewStats, isCrmSchemaError } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/overview — Toàn cảnh vận hành (CHỈ ADMIN)
// Tổng hợp: CRM + doanh thu chứng nhận + leads → tăng trưởng + KPI nhân viên theo kỳ
export async function GET() {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Chỉ Admin mới được xem Toàn cảnh." }, { status: 403 });
    }
    const data = await overviewStats();
    return NextResponse.json(data);
  } catch (e) {
    if (isCrmSchemaError(e)) {
      return NextResponse.json(
        { error: "Bảng CRM chưa tồn tại trên Supabase — hãy chạy supabase/schema.sql" },
        { status: 500 }
      );
    }
    return handleApiError(e);
  }
}
