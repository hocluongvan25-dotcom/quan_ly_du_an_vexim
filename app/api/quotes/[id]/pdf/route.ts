import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getQuote } from "@/lib/db";
import { generateQuotePdf } from "@/lib/quote-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/quotes/[id]/pdf — tải báo giá PDF (mọi nhân viên đã đăng nhập)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Mã báo giá không hợp lệ." }, { status: 400 });
  }
  try {
    const quote = await getQuote(id);
    if (!quote) return NextResponse.json({ error: "Không tìm thấy báo giá." }, { status: 404 });
    const pdf = await generateQuotePdf(quote);
    const safeNo = quote.quote_no.replace(/[^A-Za-z0-9._-]/g, "");
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Bao-gia-${safeNo}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[Quote PDF]", e);
    return NextResponse.json({ error: "Không thể tạo PDF báo giá. Vui lòng thử lại." }, { status: 500 });
  }
}
