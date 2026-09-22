import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteCertificate,
  getCertificate,
  publishCertificate,
  renewCertificate,
  updateCertificate,
} from "@/lib/db";
import type { Standard } from "@/lib/types";
import { handleApiError } from "@/lib/api-helpers";
import { isInvalidValidityInput, isValidDunsCode, resolveValidityYears } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_: Request, ctx: Ctx) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const item = await getCertificate(Number(ctx.params.id));
    if (!item) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const id = Number(ctx.params.id);
  try {
    if (action && !["confirm", "publish", "renew"].includes(action)) {
      return NextResponse.json({ error: "Thao tác không hợp lệ." }, { status: 400 });
    }
    if (action && user.role !== "admin") {
      return NextResponse.json({ error: "Chỉ admin mới được duyệt, xuất bản hoặc gia hạn hồ sơ." }, { status: 403 });
    }
    if (action === "confirm" || action === "publish") {
      if (typeof body.expected_updated_at !== "string" || !body.expected_updated_at) {
        return NextResponse.json({ error: "Vui lòng tải lại hồ sơ trước khi duyệt." }, { status: 400 });
      }
      const item = await publishCertificate(id, body.expected_updated_at);
      return NextResponse.json({ item });
    }
    if (action === "renew") {
      const extraFee = Number(body.extra_fee || body.renew_fee || 0);
      const renewalYearsRaw = body.validity_years ?? body.renew_years ?? body.years;
      const renewalYears = renewalYearsRaw ? Number(renewalYearsRaw) : undefined;
      if (renewalYearsRaw !== undefined && renewalYearsRaw !== null && isInvalidValidityInput(renewalYearsRaw)) {
        return NextResponse.json({ error: "Thời hạn gia hạn phải từ 1 đến 10 năm." }, { status: 400 });
      }
      const current = await getCertificate(id);
      if (!current) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      const item = await renewCertificate(id, extraFee, renewalYears);
      return NextResponse.json({ item });
    }
    const standard = body.standard === "GACC" ? "GACC" : "FDA";
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
    const dunsCode = isGacc ? "" : String(body.duns_code || "");
    const usAgent = isGacc ? "" : String(body.us_agent || "").slice(0, 200);
    const companyEmail = String(body.company_email || "").trim();
    if (companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) {
      return NextResponse.json({ error: "Email doanh nghiệp không hợp lệ." }, { status: 400 });
    }
    await updateCertificate(id, {
      standard: standard as Standard,
      registration_code: String(body.registration_code || ""),
      duns_code: dunsCode,
      us_agent: usAgent,
      service_price: Number(body.service_price || 0),
      company_name: String(body.company_name || ""),
      company_email: companyEmail,
      portal_user: String(body.portal_user || "").slice(0, 200),
      portal_pass: String(body.portal_pass || "").slice(0, 200),
      scope: String(body.scope || ""),
      registered_at: String(body.registered_at || "").slice(0, 10),
      validity_years,
    }, typeof body.expected_updated_at === "string" ? body.expected_updated_at : undefined);
    return NextResponse.json({ item: await getCertificate(id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg.includes("SUPABASE_SCHEMA_MISSING") || msg.includes("PGRST205")) {
      return handleApiError(e);
    }
    const map: Record<string, string> = {
      CONFLICT: "Hồ sơ đã thay đổi ở phiên khác. Vui lòng tải lại và kiểm tra trước khi lưu/duyệt.",
      APPROVAL_REQUIRED: "Vui lòng duyệt hồ sơ và các thay đổi trước khi gia hạn.",
      NOT_FOUND: "Certificate not found.",
      INCOMPLETE: "Missing company name or registration code.",
      MISSING_DATES: "Missing registration date / expiry date.",
      PUBLISHED: "Cannot delete a published certificate.",
    };
    return NextResponse.json({ error: map[msg] || msg }, { status: msg === "CONFLICT" ? 409 : msg === "NOT_FOUND" ? 404 : 400 });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    await deleteCertificate(Number(ctx.params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg.includes("SUPABASE_SCHEMA_MISSING") || msg.includes("PGRST205")) {
      return handleApiError(e);
    }
    return NextResponse.json(
      { error: msg === "PUBLISHED" ? "Cannot delete a published certificate." : msg },
      { status: 400 }
    );
  }
}
