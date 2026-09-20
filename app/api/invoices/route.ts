import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createInvoice, listInvoices, isCrmSchemaError } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Bảng invoices chưa tồn tại trên Supabase. Chạy supabase/schema.sql rồi: NOTIFY pgrst, 'reload schema';";

function requireAdmin() {
  const user = getSession();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "admin") {
    return { error: NextResponse.json({ error: "Chỉ Admin (kế toán) mới được xem hóa đơn." }, { status: 403 }) };
  }
  return { user };
}

// GET /api/invoices?ref_type=certificate&ref_id=1&state=overdue&q=
export async function GET(req: NextRequest) {
  const gate = requireAdmin();
  if (gate.error) return gate.error;
  try {
    const sp = req.nextUrl.searchParams;
    const items = await listInvoices({
      ref_type: sp.get("ref_type") || undefined,
      ref_id: sp.get("ref_id") ? Number(sp.get("ref_id")) : undefined,
      state: sp.get("state") || undefined,
      q: sp.get("q") || undefined,
    });
    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    if (isCrmSchemaError(e)) return NextResponse.json({ items: [], count: 0, warning: MIGRATION_HINT });
    return handleApiError(e);
  }
}

// POST /api/invoices — tạo hóa đơn đợt thu (VAT mặc định 8%, server tự tính tổng)
export async function POST(req: NextRequest) {
  const gate = requireAdmin();
  if (gate.error || !gate.user) return gate.error;
  try {
    const body = await req.json().catch(() => ({}));
    const ref_type = String(body.ref_type || "");
    const ref_id = Number(body.ref_id || 0);
    if (!["certificate", "service_contract"].includes(ref_type) || !ref_id) {
      return NextResponse.json({ error: "Thiếu chứng từ gốc (hồ sơ / hợp đồng)." }, { status: 400 });
    }
    const id = await createInvoice(
      {
        ref_type: ref_type as "certificate" | "service_contract",
        ref_id,
        installment_no: body.installment_no ? Number(body.installment_no) : undefined,
        title: String(body.title || ""),
        subtotal: Number(body.subtotal || 0),
        vat_rate: body.vat_rate !== undefined ? Number(body.vat_rate) : undefined,
        issue_date: body.issue_date ? String(body.issue_date).slice(0, 10) : undefined,
        due_date: body.due_date ? String(body.due_date).slice(0, 10) : null,
        notes: String(body.notes || ""),
      },
      gate.user.id
    );
    return NextResponse.json({ id, success: true });
  } catch (e: any) {
    if (isCrmSchemaError(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    if (String(e?.message || "") === "REF_NOT_FOUND") {
      return NextResponse.json({ error: "Hồ sơ / hợp đồng gốc không tồn tại." }, { status: 400 });
    }
    return handleApiError(e);
  }
}
