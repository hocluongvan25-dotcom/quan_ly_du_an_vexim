import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { crmDashboard, isCrmSchemaError } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Bảng CRM chưa tồn tại trên Supabase. Vào Supabase Dashboard > SQL Editor, chạy toàn bộ file supabase/schema.sql, sau đó chạy: NOTIFY pgrst, 'reload schema';";

// GET /api/crm/dashboard?pipeline=FDA — số liệu trả lời 5 câu hỏi quản trị
export async function GET(req: NextRequest) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const pipeline_key = req.nextUrl.searchParams.get("pipeline") || undefined;
    const data = await crmDashboard({ pipeline_key, scope_user_id: user.id });
    return NextResponse.json({ ...data, me: { id: user.id, role: user.role } });
  } catch (e) {
    if (isCrmSchemaError(e)) {
      return NextResponse.json({ warning: MIGRATION_HINT, empty: true });
    }
    return handleApiError(e);
  }
}
