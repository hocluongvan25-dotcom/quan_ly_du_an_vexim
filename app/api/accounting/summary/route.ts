import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { accountingSummary, isCrmSchemaError } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/accounting/summary — KPI công nợ + hóa đơn đến hạn/quá hạn + dòng tiền 12 tháng
export async function GET() {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Chỉ Admin (kế toán) mới được xem." }, { status: 403 });
    }
    const data = await accountingSummary();
    return NextResponse.json(data);
  } catch (e) {
    if (isCrmSchemaError(e)) {
      return NextResponse.json({ error: "Bảng kế toán chưa tồn tại — hãy chạy supabase/schema.sql" }, { status: 500 });
    }
    return handleApiError(e);
  }
}
