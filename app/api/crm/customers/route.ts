import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { crmListCustomers } from "@/lib/db";
import { scopeFilter } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Khách hàng = cơ hội đã Won. Nối thẳng sang hồ sơ FDA/GACC đã xuất bản. */
export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json({ items: await crmListCustomers(scopeFilter(user)) });
}
