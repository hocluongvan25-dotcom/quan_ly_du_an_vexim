import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listExpiryNotifications } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || "100");
    const withExpiring = searchParams.get("withExpiring") === "1";
    const threshold = Number(searchParams.get("threshold") || "90");

    const notifications = await listExpiryNotifications(limit);

    let expiring: any[] = [];
    if (withExpiring) {
      const { getExpiringCertificates } = await import("@/lib/expiry-checker");
      expiring = await getExpiringCertificates(threshold);
    }

    return NextResponse.json({ notifications, expiring });
  } catch (e) {
    return handleApiError(e);
  }
}
