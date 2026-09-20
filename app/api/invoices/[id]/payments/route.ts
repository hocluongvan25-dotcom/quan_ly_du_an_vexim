import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createPayment, deletePayment, getInvoice } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAdmin() {
  const user = getSession();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "admin") {
    return { error: NextResponse.json({ error: "Chỉ Admin (kế toán) mới được ghi nhận thu tiền." }, { status: 403 }) };
  }
  return { user };
}

// POST /api/invoices/[id]/payments — ghi nhận 1 lần thu tiền
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = requireAdmin();
  if (gate.error || !gate.user) return gate.error;
  try {
    const body = await req.json().catch(() => ({}));
    const pid = await createPayment(
      Number(params.id),
      {
        amount: Number(body.amount || 0),
        paid_at: body.paid_at ? String(body.paid_at).slice(0, 10) : undefined,
        method: String(body.method || ""),
        reference: String(body.reference || ""),
        note: String(body.note || ""),
      },
      gate.user.id
    );
    const item = await getInvoice(Number(params.id));
    return NextResponse.json({ id: pid, success: true, item });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "AMOUNT_REQUIRED") return NextResponse.json({ error: "Số tiền phải lớn hơn 0." }, { status: 400 });
    if (msg === "CANCELLED") return NextResponse.json({ error: "Hóa đơn đã hủy." }, { status: 400 });
    return handleApiError(e);
  }
}

// DELETE /api/invoices/[id]/payments?payment_id= — xóa 1 lần thu (sửa sai)
export async function DELETE(req: NextRequest) {
  const gate = requireAdmin();
  if (gate.error) return gate.error;
  try {
    const pid = Number(req.nextUrl.searchParams.get("payment_id") || 0);
    if (!pid) return NextResponse.json({ error: "Thiếu payment_id." }, { status: 400 });
    await deletePayment(pid);
    return NextResponse.json({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
