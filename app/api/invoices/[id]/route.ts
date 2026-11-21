import { normalizeInvoiceContractNo } from "@/lib/accounting";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cancelInvoice, deleteInvoice, getInvoice, updateInvoice } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAdmin() {
  const user = getSession();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "admin") {
    return { error: NextResponse.json({ error: "Chỉ Admin (kế toán) mới được xem hóa đơn." }, { status: 403 }) };
  }
  return { user };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = requireAdmin();
  if (gate.error) return gate.error;
  try {
    const item = await getInvoice(Number(params.id));
    if (!item) return NextResponse.json({ error: "Không tìm thấy hóa đơn." }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    return handleApiError(e);
  }
}

// PATCH — sửa tiêu đề/hạn/ghi chú/số tiền (chưa thu), hoặc action=cancel
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = requireAdmin();
  if (gate.error) return gate.error;
  try {
    const id = Number(params.id);
    const body = await req.json().catch(() => ({}));
    if (String(body.action || "") === "cancel") {
      await cancelInvoice(id);
    } else {
      await updateInvoice(id, {
        payment_request: body.payment_request,
        contract_no: body.contract_no !== undefined ? normalizeInvoiceContractNo(body.contract_no) : undefined,
        title: body.title !== undefined ? String(body.title) : undefined,
        due_date: body.due_date !== undefined ? (body.due_date ? String(body.due_date).slice(0, 10) : null) : undefined,
        notes: body.notes !== undefined ? String(body.notes) : undefined,
        subtotal: body.subtotal !== undefined ? Number(body.subtotal) : undefined,
        vat_rate: body.vat_rate !== undefined ? Number(body.vat_rate) : undefined,
      });
    }
    const item = await getInvoice(id);
    return NextResponse.json({ success: true, item });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "HAS_PAYMENTS") {
      return NextResponse.json({ error: "Hóa đơn đã có thanh toán, không thể sửa tiền/hủy." }, { status: 400 });
    }
    if (msg === "CANCELLED") return NextResponse.json({ error: "Hóa đơn đã hủy." }, { status: 400 });
    return handleApiError(e);
  }
}

// DELETE — chỉ khi chưa có thanh toán nào
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = requireAdmin();
  if (gate.error) return gate.error;
  try {
    await deleteInvoice(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (String(e?.message || "") === "HAS_PAYMENTS") {
      return NextResponse.json({ error: "Hóa đơn đã có thanh toán, không thể xóa." }, { status: 400 });
    }
    return handleApiError(e);
  }
}
