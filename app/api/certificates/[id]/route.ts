import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  confirmValidity,
  deleteCertificate,
  getCertificate,
  publishCertificate,
  renewCertificate,
  updateCertificate,
} from "@/lib/db";
import type { Standard } from "@/lib/types";
import { handleApiError } from "@/lib/api-helpers";
import { isValidValidityYearsForStandard, isValidDunsCode, GACC_FIXED_YEARS } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function GET(_: Request, ctx: Ctx) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const item = await getCertificate(Number(ctx.params.id));
    if (!item) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ item });
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
    if (action === "confirm") {
      await confirmValidity(id);
      return NextResponse.json({ item: await getCertificate(id) });
    }
    if (action === "publish") {
      const item = await publishCertificate(id);
      return NextResponse.json({ item });
    }
    if (action === "renew") {
      const extraFee = Number(body.extra_fee || body.renew_fee || 0);
      const renewalYearsRaw = body.validity_years ?? body.renew_years ?? body.years;
      const renewalYears = renewalYearsRaw ? Number(renewalYearsRaw) : undefined;
      // GACC fixed 5 years, FDA 1-10
      const current = await getCertificate(id);
      if (!current) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      if (current.standard === "GACC" && renewalYears !== undefined && renewalYears !== GACC_FIXED_YEARS) {
        return NextResponse.json({ error: "GACC renewal is fixed 5 years." }, { status: 400 });
      }
      if (current.standard === "FDA" && renewalYears !== undefined && !isValidValidityYearsForStandard(renewalYears, "FDA")) {
        return NextResponse.json({ error: "FDA renewal duration must be between 1 and 10 years." }, { status: 400 });
      }
      const item = await renewCertificate(id, extraFee, renewalYears);
      return NextResponse.json({ item });
    }
    const standard = body.standard === "GACC" ? "GACC" : "FDA";
    let validity_years = body.validity_years ? Number(body.validity_years) : undefined;
    if (standard === "GACC") {
      validity_years = GACC_FIXED_YEARS;
    } else if (validity_years && !isValidValidityYearsForStandard(validity_years, standard as Standard)) {
      return NextResponse.json({ error: "FDA contract duration must be between 1 and 10 years." }, { status: 400 });
    }
    const isGacc = standard === "GACC";
    if (!isGacc && body.duns_code) {
      const raw = String(body.duns_code).replace(/\\D/g, "");
      if (raw && !isValidDunsCode(raw)) {
        return NextResponse.json({ error: "DUNS must be 9 digits (e.g. 12-345-6789)." }, { status: 400 });
      }
    }
    const dunsCode = isGacc ? "" : String(body.duns_code || "");
    const usAgent = isGacc ? "" : String(body.us_agent || "").slice(0, 200);
    await updateCertificate(id, {
      standard: standard as Standard,
      registration_code: String(body.registration_code || ""),
      duns_code: dunsCode,
      us_agent: usAgent,
      service_price: Number(body.service_price || 0),
      company_name: String(body.company_name || ""),
      scope: String(body.scope || ""),
      registered_at: String(body.registered_at || "").slice(0, 10),
      validity_years,
    });
    return NextResponse.json({ item: await getCertificate(id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg.includes("SUPABASE_SCHEMA_MISSING") || msg.includes("PGRST205")) {
      return handleApiError(e);
    }
    const map: Record<string, string> = {
      NOT_FOUND: "Certificate not found.",
      NOT_CONFIRMED: "Validity must be confirmed (VALID) before publishing.",
      INCOMPLETE: "Missing company name or registration code.",
      MISSING_DATES: "Missing registration date / expiry date.",
      PUBLISHED: "Cannot delete a published certificate.",
    };
    return NextResponse.json({ error: map[msg] || msg }, { status: 400 });
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
