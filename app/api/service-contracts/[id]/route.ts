import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteServiceContract,
  getServiceContract,
  renewServiceContract,
  setServiceContractStatus,
  updateServiceContract,
} from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const item = await getServiceContract(Number(params.id));
    if (!item) return NextResponse.json({ error: "Không tìm thấy hợp đồng." }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    return handleApiError(e);
  }
}

// PATCH — sửa trường, hoặc action: activate | terminate | renew (+ cycle_months)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = Number(params.id);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    if (action === "activate") {
      await setServiceContractStatus(id, "active");
    } else if (action === "terminate") {
      await setServiceContractStatus(id, "terminated");
    } else if (action === "renew") {
      await renewServiceContract(id, body.cycle_months ? Number(body.cycle_months) : undefined);
    } else {
      await updateServiceContract(id, {
        company_name: body.company_name !== undefined ? String(body.company_name) : undefined,
        company_email: body.company_email !== undefined ? String(body.company_email) : undefined,
        contact_name: body.contact_name !== undefined ? String(body.contact_name) : undefined,
        contact_phone: body.contact_phone !== undefined ? String(body.contact_phone) : undefined,
        scope: body.scope !== undefined ? String(body.scope) : undefined,
        cycle_months: body.cycle_months !== undefined ? Number(body.cycle_months) : undefined,
        started_at: body.started_at !== undefined ? String(body.started_at) : undefined,
        contract_value: body.contract_value !== undefined ? Number(body.contract_value) : undefined,
      });
    }
    const item = await getServiceContract(id);
    return NextResponse.json({ success: true, item });
  } catch (e) {
    return handleApiError(e);
  }
}

// DELETE — chỉ khi chưa có hóa đơn nào
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Chỉ Admin mới được xóa." }, { status: 403 });
    await deleteServiceContract(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (String(e?.message || "") === "HAS_INVOICES") {
      return NextResponse.json({ error: "Hợp đồng đã có hóa đơn, không thể xóa." }, { status: 400 });
    }
    return handleApiError(e);
  }
}
