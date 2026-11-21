import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isCrmSchemaError, listQuoteTemplateRows, listQuoteTemplates } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { QUOTE_PRICE_NOTE, QUOTE_TEMPLATES } from "@/lib/quote-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "Bảng quote_templates chưa tồn tại trên Supabase. Chạy supabase/schema.sql (hoặc migration 20260922_quote_templates.sql) rồi: NOTIFY pgrst, 'reload schema';";

// GET /api/quote-templates — bảng giá dịch vụ hiện hành (giá trong DB đè giá mặc định)
export async function GET() {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const items = await listQuoteTemplates();
    let customized: string[] = [];
    try {
      customized = (await listQuoteTemplateRows()).map((row) => String(row.template_key));
    } catch {
      customized = [];
    }
    return NextResponse.json({ items, customized, price_note: QUOTE_PRICE_NOTE });
  } catch (e) {
    if (isCrmSchemaError(e)) {
      return NextResponse.json({
        items: QUOTE_TEMPLATES,
        customized: [],
        price_note: QUOTE_PRICE_NOTE,
        warning: MIGRATION_HINT,
      });
    }
    return handleApiError(e);
  }
}
