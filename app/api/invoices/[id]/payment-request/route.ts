import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getInvoice } from "@/lib/db";
import { generatePaymentRequestPdf } from "@/lib/payment-request-pdf";
import { assertPaymentRequestExportable } from "@/lib/payment-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Chỉ Admin (kế toán) được xuất chứng từ thanh toán." }, { status: 403 });
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: "Mã hóa đơn không hợp lệ." }, { status: 400 });
  try {
    const inv = await getInvoice(id);
    if (!inv) return NextResponse.json({ error: "Không tìm thấy hóa đơn." }, { status: 404 });
    try { assertPaymentRequestExportable(inv); }
    catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 409 }); }
    const pdf = await generatePaymentRequestPdf(inv);
    return new NextResponse(Buffer.from(pdf), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="De-nghi-thanh-toan-${id}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (e) {
    console.error("[Payment request PDF]", e);
    return NextResponse.json({ error: "Không thể tạo PDF. Vui lòng thử lại hoặc liên hệ quản trị viên." }, { status: 500 });
  }
}
