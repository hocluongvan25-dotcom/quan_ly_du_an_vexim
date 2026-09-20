import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCrmOpportunity, listCrmOpportunities, isCrmSchemaError } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Bảng CRM chưa tồn tại trên Supabase. Vào Supabase Dashboard > SQL Editor, chạy toàn bộ file supabase/schema.sql, sau đó chạy: NOTIFY pgrst, 'reload schema';";

// GET /api/crm/opportunities?pipeline=FDA&scope=mine|all&owner=1&q=...&stage=open|won|lost|all
export async function GET(req: NextRequest) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sp = req.nextUrl.searchParams;
    const pipeline_key = sp.get("pipeline") || undefined;
    const scope = sp.get("scope") || (user.role === "admin" ? "all" : "mine");
    const ownerParam = sp.get("owner");
    const q = sp.get("q") || undefined;
    const stage_filter = (sp.get("stage") as "open" | "won" | "lost" | "all") || "all";

    let owner_id: number | null | undefined;
    if (ownerParam) owner_id = Number(ownerParam);
    else if (scope === "mine") owner_id = user.id;

    const items = await listCrmOpportunities({ pipeline_key, owner_id, q, stage_filter });
    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    if (isCrmSchemaError(e)) {
      return NextResponse.json({ items: [], count: 0, warning: MIGRATION_HINT });
    }
    return handleApiError(e);
  }
}

// POST /api/crm/opportunities — tạo cơ hội mới (luôn bắt đầu ở stage đầu tiên)
export async function POST(req: NextRequest) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    const pipeline_key = String(body.pipeline_key || body.pipeline || "").trim();
    const company_name = String(body.company_name || "").trim();
    if (!pipeline_key) return NextResponse.json({ error: "Thiếu pipeline (dịch vụ)." }, { status: 400 });
    if (!company_name) return NextResponse.json({ error: "Thiếu tên công ty / khách hàng." }, { status: 400 });

    // Chỉ admin được gán owner khác mình
    let owner_id: number | null = user.id;
    if (body.owner_id !== undefined && body.owner_id !== null && body.owner_id !== "") {
      if (user.role !== "admin" && Number(body.owner_id) !== user.id) {
        return NextResponse.json({ error: "Bạn không có quyền gán Owner khác." }, { status: 403 });
      }
      owner_id = Number(body.owner_id);
    }

    const id = await createCrmOpportunity(
      {
        pipeline_key,
        title: String(body.title || ""),
        company_name,
        contact_name: String(body.contact_name || ""),
        contact_phone: String(body.contact_phone || ""),
        contact_email: String(body.contact_email || ""),
        industry: String(body.industry || ""),
        source: String(body.source || ""),
        estimated_value: Number(body.estimated_value || 0),
        owner_id,
        next_action: String(body.next_action || ""),
        next_action_date: body.next_action_date ? String(body.next_action_date).slice(0, 10) : null,
        expected_close_date: body.expected_close_date ? String(body.expected_close_date).slice(0, 10) : null,
        notes: String(body.notes || ""),
      },
      user.id
    );
    return NextResponse.json({ id, success: true });
  } catch (e: any) {
    if (isCrmSchemaError(e)) {
      return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    }
    const msg = String(e?.message || "");
    if (msg === "COMPANY_NAME_REQUIRED") return NextResponse.json({ error: "Thiếu tên công ty." }, { status: 400 });
    if (msg === "PIPELINE_NOT_FOUND") return NextResponse.json({ error: "Pipeline không tồn tại." }, { status: 400 });
    return handleApiError(e);
  }
}
