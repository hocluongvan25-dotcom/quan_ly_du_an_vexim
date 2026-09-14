import { NextResponse } from "next/server";
import { getCertificateByPublicCode } from "@/lib/db";
import { daysBetween, isValidNow, remainingDays, remainingMs, getValidityYears } from "@/lib/utils";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: { code: string } }) {
  try {
    const item = await getCertificateByPublicCode(ctx.params.code);
    if (!item || item.status === "draft") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const valid = item.validity_confirmed === 1 && isValidNow(item.expires_at, item.registered_at);
    return NextResponse.json({
      item: {
        public_code: item.public_code,
        certificate_no: item.certificate_no,
        standard: item.standard,
        registration_code: item.registration_code,
        duns_code: item.duns_code || "",
        fda_registration_status: item.fda_registration_status || "pending",
        company_name: item.company_name,
        scope: item.scope,
        registered_at: item.registered_at,
        expires_at: item.expires_at,
        validity_years: getValidityYears(item),
        validity_confirmed: Boolean(item.validity_confirmed),
        status: valid ? "published" : "expired",
        remaining_ms: remainingMs(item.expires_at),
        remaining_days: remainingDays(item.expires_at),
        total_days: daysBetween(item.registered_at, item.expires_at),
        elapsed_days: daysBetween(item.registered_at, new Date().toISOString().slice(0, 10)),
        is_valid: valid,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
