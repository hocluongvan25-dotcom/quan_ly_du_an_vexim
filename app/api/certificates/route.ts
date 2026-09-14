import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCertificate, listCertificates } from "@/lib/db";
import type { Standard } from "@/lib/types";
import { handleApiError } from "@/lib/api-helpers";
import { isValidValidityYears } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ items: await listCertificates() });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const standard = body.standard === "GACC" ? "GACC" : "FDA";
    if (!body.company_name || !body.registered_at || !body.registration_code) {
      return NextResponse.json({ error: "Vui lòng điền đủ thông tin bắt buộc." }, { status: 400 });
    }
    const validity_years = Number(body.validity_years || 0);
    if (validity_years && !isValidValidityYears(validity_years)) {
      return NextResponse.json({ error: "Thời hạn hợp đồng phải từ 1 đến 10 năm." }, { status: 400 });
    }
    const id = await createCertificate({
      standard: standard as Standard,
      registration_code: String(body.registration_code),
      service_price: Number(body.service_price || 0),
      company_name: String(body.company_name),
      scope: String(body.scope || ""),
      registered_at: String(body.registered_at).slice(0, 10),
      validity_years: validity_years || undefined,
      created_by: user.id,
    });
    return NextResponse.json({ id });
  } catch (e) {
    return handleApiError(e);
  }
}
