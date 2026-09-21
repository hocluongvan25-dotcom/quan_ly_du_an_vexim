import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteQuote, duplicateQuote, getQuote, isCrmSchemaError, setQuoteStatus, updateQuote } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { isQuoteStatus, normalizeQuoteItems, prepareQuoteInput } from "@/lib/quotes";
import type { SessionUser } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Bảng quotes chưa tồn tại trên Supabase. Chạy supabase/schema.sql rồi: NOTIFY pgrst, 'reload schema';";

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Người lập sửa được bản nháp của mình; bản đã gửi khách chỉ Admin sửa. */
function canManage(user: SessionUser, quote: { created_by: number | null }): boolean {
  return user.role === "admin" || quote.created_by === user.id;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ error: "Mã báo giá không hợp lệ." }, { status: 400 });
    const item = await getQuote(id);
    if (!item) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    if (isCrmSchemaError(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    return handleApiError(e);
  }
}

/**
 * PATCH /api/quotes/[id]
 * - `{ action: "duplicate" }` → nhân bản thành báo giá nháp mới (dùng khi bản cũ đã gửi khách).
 * - `{ status }` → cập nhật trạng thái gửi khách / khách đồng ý / từ chối.
 * - còn lại → cập nhật nội dung (chỉ khi còn nháp).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ error: "Mã báo giá không hợp lệ." }, { status: 400 });
    const current = await getQuote(id);
    if (!current) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
    if (!canManage(user, current)) {
      return NextResponse.json({ error: "Chỉ người lập báo giá hoặc Admin được sửa." }, { status: 403 });
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.action === "duplicate") {
      const newId = await duplicateQuote(id, user.id);
      return NextResponse.json({ id: newId, success: true });
    }

    if (body.action === "status" || (body.status !== undefined && Object.keys(body).length === 1)) {
      if (!isQuoteStatus(body.status)) {
        return NextResponse.json({ error: "Trạng thái báo giá không hợp lệ." }, { status: 400 });
      }
      if (current.status !== "draft" && body.status === "draft") {
        return NextResponse.json(
          { error: "Báo giá đã gửi khách không thể quay lại trạng thái Nháp." },
          { status: 409 }
        );
      }
      await setQuoteStatus(id, body.status);
      return NextResponse.json({ success: true, status: body.status });
    }

    if (current.status !== "draft") {
      return NextResponse.json(
        { error: "Báo giá đã gửi khách nên không sửa trực tiếp. Hãy dùng “Nhân bản” để lập bản mới." },
        { status: 409 }
      );
    }

    const merged = {
      template_key: body.template_key === undefined ? current.template_key : body.template_key,
      title: body.title === undefined ? current.title : body.title,
      company_name: body.company_name === undefined ? current.company_name : body.company_name,
      company_address: body.company_address === undefined ? current.company_address : body.company_address,
      company_tax_code: body.company_tax_code === undefined ? current.company_tax_code : body.company_tax_code,
      contact_name: body.contact_name === undefined ? current.contact_name : body.contact_name,
      contact_title: body.contact_title === undefined ? current.contact_title : body.contact_title,
      contact_phone: body.contact_phone === undefined ? current.contact_phone : body.contact_phone,
      contact_email: body.contact_email === undefined ? current.contact_email : body.contact_email,
      items: body.items === undefined ? current.items : normalizeQuoteItems(body.items),
      scope: body.scope === undefined ? current.scope : body.scope,
      documents: body.documents === undefined ? current.documents : body.documents,
      terms: body.terms === undefined ? current.terms : body.terms,
      timeline: body.timeline === undefined ? current.timeline : body.timeline,
      payment_terms: body.payment_terms === undefined ? current.payment_terms : body.payment_terms,
      note: body.note === undefined ? current.note : body.note,
      discount_percent: body.discount_percent === undefined ? current.discount_percent : body.discount_percent,
      vat_rate: body.vat_rate === undefined ? current.vat_rate : body.vat_rate,
      issue_date: body.issue_date === undefined ? current.issue_date : body.issue_date,
      valid_until: body.valid_until === undefined ? current.valid_until : body.valid_until,
      status: current.status,
      opportunity_id: body.opportunity_id === undefined ? current.opportunity_id : body.opportunity_id,
    };

    await updateQuote(id, prepareQuoteInput(merged));
    const item = await getQuote(id);
    return NextResponse.json({ success: true, item });
  } catch (e: any) {
    if (isCrmSchemaError(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    if (String(e?.message || "") === "LOCKED_QUOTE") {
      return NextResponse.json(
        { error: "Báo giá đã gửi khách nên không sửa trực tiếp. Hãy dùng “Nhân bản” để lập bản mới." },
        { status: 409 }
      );
    }
    if (String(e?.message || "") === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
    }
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ error: "Mã báo giá không hợp lệ." }, { status: 400 });
    const current = await getQuote(id);
    if (!current) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
    // Bản nháp: người lập xóa được. Bản đã gửi khách là dấu vết đã gửi → chỉ Admin.
    const allowed = current.status === "draft" ? canManage(user, current) : user.role === "admin";
    if (!allowed) {
      return NextResponse.json({ error: "Chỉ Admin được xóa báo giá đã gửi khách." }, { status: 403 });
    }
    await deleteQuote(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (isCrmSchemaError(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    return handleApiError(e);
  }
}
