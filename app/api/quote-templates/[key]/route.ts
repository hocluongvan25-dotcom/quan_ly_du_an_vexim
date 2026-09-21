import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isCrmSchemaError, loadQuoteTemplate, resetQuoteTemplate, saveQuoteTemplate } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { isQuoteTemplateKey, normalizeQuoteTemplate, type QuoteTemplateKey } from "@/lib/quote-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Bảng quote_templates chưa tồn tại trên Supabase. Chạy supabase/schema.sql (hoặc migration 20260922_quote_templates.sql) rồi: NOTIFY pgrst, 'reload schema';";

function gate() {
  const user = getSession();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { user };
}

/** Chỉ Admin được sửa bảng giá — giá dịch vụ là thông tin nhạy cảm. */
function gateAdmin() {
  const gateResult = gate();
  if (gateResult.error) return gateResult;
  if (gateResult.user!.role !== "admin") {
    return { error: NextResponse.json({ error: "Chỉ Admin được chỉnh bảng giá dịch vụ." }, { status: 403 }) };
  }
  return gateResult;
}

function parseKey(params: { key: string }): QuoteTemplateKey | null {
  const key = decodeURIComponent(params.key);
  return isQuoteTemplateKey(key) ? key : null;
}

// GET /api/quote-templates/[key] — một mẫu bảng giá đã ghép
export async function GET(_req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const gateResult = gate();
    if (gateResult.error) return gateResult.error;
    const key = parseKey(params);
    if (!key) return NextResponse.json({ error: "Dịch vụ không hợp lệ." }, { status: 400 });
    const item = await loadQuoteTemplate(key);
    if (!item) return NextResponse.json({ error: "Không tìm thấy dịch vụ." }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    if (isCrmSchemaError(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    return handleApiError(e);
  }
}

// PUT /api/quote-templates/[key] — lưu bảng giá (Admin)
export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const gateResult = gateAdmin();
    if (gateResult.error || !gateResult.user) return gateResult.error;
    const key = parseKey(params);
    if (!key) return NextResponse.json({ error: "Dịch vụ không hợp lệ." }, { status: 400 });
    const body = await req.json().catch(() => null);
    let normalized;
    try {
      normalized = normalizeQuoteTemplate(body, key);
    } catch (e: any) {
      // Lỗi kiểm tra dữ liệu → trả về đúng câu thông báo cho người nhập.
      return NextResponse.json({ error: e?.message || "Dữ liệu bảng giá không hợp lệ." }, { status: 400 });
    }
    await saveQuoteTemplate(key, normalized, gateResult.user.id);
    return NextResponse.json({ success: true, item: normalized });
  } catch (e: any) {
    if (isCrmSchemaError(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    return handleApiError(e);
  }
}

// DELETE /api/quote-templates/[key] — trả mẫu về giá mặc định của hệ thống (Admin)
export async function DELETE(_req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const gateResult = gateAdmin();
    if (gateResult.error) return gateResult.error;
    const key = parseKey(params);
    if (!key) return NextResponse.json({ error: "Dịch vụ không hợp lệ." }, { status: 400 });
    await resetQuoteTemplate(key);
    const item = await loadQuoteTemplate(key);
    return NextResponse.json({ success: true, item });
  } catch (e) {
    if (isCrmSchemaError(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    return handleApiError(e);
  }
}
