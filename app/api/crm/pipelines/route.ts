import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCrmPipelines, isCrmSchemaError } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Bảng CRM chưa tồn tại trên Supabase. Vào Supabase Dashboard > SQL Editor, chạy toàn bộ file supabase/schema.sql, sau đó chạy: NOTIFY pgrst, 'reload schema';";

// GET /api/crm/pipelines — danh sách pipeline + stages (kèm SLA + exit criteria)
export async function GET() {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const items = await listCrmPipelines();
    return NextResponse.json({ items });
  } catch (e) {
    if (isCrmSchemaError(e)) {
      return NextResponse.json({ items: [], warning: MIGRATION_HINT });
    }
    return handleApiError(e);
  }
}
