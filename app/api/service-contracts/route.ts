import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServiceContract, listServiceContracts, isCrmSchemaError } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Bảng service_contracts chưa tồn tại trên Supabase. Chạy supabase/schema.sql rồi: NOTIFY pgrst, 'reload schema';";

// GET /api/service-contracts?service=SALE_EXPORT&status=active&q=
export async function GET(req: NextRequest) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sp = req.nextUrl.searchParams;
    const items = await listServiceContracts({
      service_type: sp.get("service") || undefined,
      status: sp.get("status") || undefined,
      q: sp.get("q") || undefined,
    });
    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    if (isCrmSchemaError(e)) return NextResponse.json({ items: [], count: 0, warning: MIGRATION_HINT });
    return handleApiError(e);
  }
}

// POST /api/service-contracts — tạo hợp đồng dịch vụ (chu kỳ 3/6/12 tháng)
export async function POST(req: NextRequest) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const service_type = String(body.service_type || "");
    if (!["SALE_EXPORT", "AMAZON_OPS"].includes(service_type)) {
      return NextResponse.json({ error: "Dịch vụ phải là SALE_EXPORT hoặc AMAZON_OPS." }, { status: 400 });
    }
    const id = await createServiceContract(
      {
        service_type: service_type as "SALE_EXPORT" | "AMAZON_OPS",
        company_name: String(body.company_name || ""),
        company_email: String(body.company_email || ""),
        contact_name: String(body.contact_name || ""),
        contact_phone: String(body.contact_phone || ""),
        scope: String(body.scope || ""),
        cycle_months: Number(body.cycle_months || 6),
        started_at: String(body.started_at || ""),
        contract_value: Number(body.contract_value || 0),
        opportunity_id: body.opportunity_id ? Number(body.opportunity_id) : null,
      },
      user.id
    );
    return NextResponse.json({ id, success: true });
  } catch (e: any) {
    if (isCrmSchemaError(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    const msg = String(e?.message || "");
    if (msg === "COMPANY_NAME_REQUIRED") return NextResponse.json({ error: "Thiếu tên công ty." }, { status: 400 });
    if (msg === "START_DATE_REQUIRED") return NextResponse.json({ error: "Thiếu ngày bắt đầu." }, { status: 400 });
    return handleApiError(e);
  }
}
