import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createQuote, isCrmSchemaError, listQuotes, loadQuoteTemplate } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { normalizeQuoteItems, prepareQuoteInput } from "@/lib/quotes";
import {
  QUOTE_TEMPLATE_KEYS,
  isQuoteTemplateKey,
  itemsFromTemplate,
  optionLine,
  type QuoteLine,
} from "@/lib/quote-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Bảng quotes chưa tồn tại trên Supabase. Chạy supabase/schema.sql rồi: NOTIFY pgrst, 'reload schema';";

// GET /api/quotes?template=FDA&status=draft&q=
export async function GET(req: NextRequest) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Dùng URL chuẩn thay vì nextUrl để route chạy được cả trong môi trường test.
    const sp = new URL(req.url).searchParams;
    const template = sp.get("template") || "";
    if (template && !isQuoteTemplateKey(template)) {
      return NextResponse.json({ error: "Dịch vụ không hợp lệ." }, { status: 400 });
    }
    const items = await listQuotes({
      template_key: template || undefined,
      status: sp.get("status") || undefined,
      q: sp.get("q") || undefined,
    });
    return NextResponse.json({ items, count: items.length });
  } catch (e) {
    if (isCrmSchemaError(e)) return NextResponse.json({ items: [], count: 0, warning: MIGRATION_HINT });
    return handleApiError(e);
  }
}

/**
 * POST /api/quotes — tạo báo giá.
 * Nhân viên chỉ cần gửi template_key + thông tin khách hàng; nếu không gửi
 * hạng mục, hệ thống lấy nguyên bộ hạng mục/đơn giá/điều khoản của mẫu dịch vụ.
 */
export async function POST(req: NextRequest) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const templateKey = body.template_key;
    if (!isQuoteTemplateKey(templateKey)) {
      return NextResponse.json(
        { error: `Dịch vụ phải là một trong: ${QUOTE_TEMPLATE_KEYS.join(", ")}.` },
        { status: 400 }
      );
    }
    // Giá lấy từ Bảng giá dịch vụ (DB) nếu Admin đã chỉnh, nếu không dùng giá mặc định.
    const template = (await loadQuoteTemplate(templateKey))!;

    // Client không gửi items → dùng nguyên mẫu (kèm hạng mục tùy chọn đã chọn).
    // Có gửi → kiểm tra từng dòng, server vẫn tự tính lại tiền.
    const optionKeys = Array.isArray(body.selected_options) ? body.selected_options.map(String) : [];
    const optionalLines = template.options.filter((o) => optionKeys.includes(o.key)).map(optionLine);
    const items: QuoteLine[] = body.items === undefined
      ? [...itemsFromTemplate(template), ...optionalLines]
      : normalizeQuoteItems(body.items);

    const prepared = {
      template_key: templateKey,
      service_name: template.name,
      title: body.title === undefined || body.title === "" ? template.title : body.title,
      company_name: body.company_name,
      company_address: body.company_address,
      company_tax_code: body.company_tax_code,
      contact_name: body.contact_name,
      contact_title: body.contact_title,
      contact_phone: body.contact_phone,
      contact_email: body.contact_email,
      items,
      scope: body.scope === undefined ? template.scope : body.scope,
      documents: body.documents === undefined ? template.documents : body.documents,
      terms: body.terms === undefined ? template.terms : body.terms,
      timeline: body.timeline === undefined ? template.timeline : body.timeline,
      payment_terms: body.payment_terms === undefined ? template.payment_terms : body.payment_terms,
      note: body.note,
      discount_percent: body.discount_percent,
      vat_rate: body.vat_rate === undefined ? template.vat_rate : body.vat_rate,
      issue_date: body.issue_date,
      valid_until: body.valid_until,
      // Báo giá luôn sinh ra ở dạng nháp — gửi khách là bước xác nhận riêng.
      status: "draft",
      opportunity_id: body.opportunity_id,
    };

    // Truyền bảng giá đã resolve để các trường client bỏ trống (VAT, hiệu lực, tên dịch vụ) lấy đúng giá trị.
    const id = await createQuote(prepareQuoteInput(prepared, template), user.id);
    return NextResponse.json({ id, success: true });
  } catch (e: any) {
    if (isCrmSchemaError(e)) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    return handleApiError(e);
  }
}
