import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCertificate, listCertificates } from "@/lib/db";
import type { Standard } from "@/lib/types";
import { handleApiError } from "@/lib/api-helpers";
import { isInvalidValidityInput, isValidDunsCode, resolveValidityYears } from "@/lib/types";

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
      return NextResponse.json({ error: "Please fill all required fields." }, { status: 400 });
    }
    // Thời hạn hợp đồng chọn 1-10 năm (mặc định FDA 2, GACC 5), ngày hết hạn tự tính
    if (isInvalidValidityInput(body.validity_years)) {
      return NextResponse.json({ error: "Thời hạn hợp đồng phải từ 1 đến 10 năm." }, { status: 400 });
    }
    const validity_years = resolveValidityYears(body.validity_years, standard);
    const isGacc = standard === "GACC";
    if (!isGacc && body.duns_code) {
      const raw = String(body.duns_code).replace(/\D/g, "");
      if (raw && !isValidDunsCode(raw)) {
        return NextResponse.json({ error: "DUNS must be 9 digits (e.g. 12-345-6789)." }, { status: 400 });
      }
    }
    // GACC does not have DUNS or US Agent
    const dunsCode = isGacc ? "" : String(body.duns_code || "");
    const usAgent = isGacc ? "" : String(body.us_agent || "").slice(0, 200);
    const companyEmail = String(body.company_email || "").trim();
    if (companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) {
      return NextResponse.json({ error: "Email doanh nghiệp không hợp lệ." }, { status: 400 });
    }
    const id = await createCertificate({
      standard: standard as Standard,
      registration_code: String(body.registration_code),
      duns_code: dunsCode,
      us_agent: usAgent,
      service_price: Number(body.service_price || 0),
      company_name: String(body.company_name),
      company_email: companyEmail,
      portal_user: String(body.portal_user || "").slice(0, 200),
      portal_pass: String(body.portal_pass || "").slice(0, 200),
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
