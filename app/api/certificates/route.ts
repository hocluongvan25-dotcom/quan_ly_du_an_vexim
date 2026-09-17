import { NextResponse } from "next/server";
import { dbFailure } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import { createCertificate, listCertificates } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Standard } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    return NextResponse.json({ items: await listCertificates() });
  } catch (e) {
    return dbFailure(e);
  }
}

export async function POST(req: Request) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  // Ma trận quyền đã có `certificate.manage` nhưng trước đây chưa ai kiểm tra.
  if (!can(user.role, "certificate.manage")) {
    return NextResponse.json(
      { error: "Vai trò của bạn không được tạo/sửa hồ sơ FDA / GACC." },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const standard = body.standard === "GACC" ? "GACC" : "FDA";
  if (!body.company_name || !body.registered_at || !body.registration_code) {
    return NextResponse.json({ error: "Vui lòng điền đủ thông tin bắt buộc." }, { status: 400 });
  }
  try {
    const id = await createCertificate({
    standard: standard as Standard,
    registration_code: String(body.registration_code),
    service_price: Number(body.service_price || 0),
    company_name: String(body.company_name),
    scope: String(body.scope || ""),
      registered_at: String(body.registered_at).slice(0, 10),
      created_by: user.id,
    });
    return NextResponse.json({ id });
  } catch (e) {
    return dbFailure(e);
  }
}
