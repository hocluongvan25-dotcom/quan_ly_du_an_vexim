import { NextResponse } from "next/server";
import { getCertificateByPublicCode } from "@/lib/db";
import { daysBetween, remainingDays, remainingMs, getValidityYears, todayUtcIso } from "@/lib/utils";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(_: Request, ctx: { params: { code: string } }) {
  try {
    const item = await getCertificateByPublicCode(ctx.params.code);
    if (!item || item.status === "draft") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const isFda = item.standard === "FDA";
    const valid = Boolean(item.validity_confirmed) && remainingDays(item.expires_at) >= 0;
    return NextResponse.json({
      item: {
        public_code: item.public_code,
        certificate_no: item.certificate_no,
        standard: item.standard,
        registration_code: item.registration_code,
        duns_code: isFda ? item.duns_code || "" : "",
        us_agent: isFda ? (item as any).us_agent || "" : "",
        company_name: item.company_name,
        company_address: item.company_address || "",
        scope: item.scope,
        registered_at: item.registered_at,
        expires_at: item.expires_at,
        validity_years: getValidityYears(item),
        validity_confirmed: Boolean(item.validity_confirmed),
        status: valid ? "published" : "expired",
        remaining_ms: remainingMs(item.expires_at),
        remaining_days: remainingDays(item.expires_at),
        total_days: daysBetween(item.registered_at, item.expires_at),
        elapsed_days: daysBetween(item.registered_at, todayUtcIso()),
        is_valid: valid,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
