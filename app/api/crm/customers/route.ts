import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { crmListCustomers } from "@/lib/db";
import { scopeFilter, hasCrmAccess } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Khách hàng = cơ hội đã Won. Nối thẳng sang hồ sơ FDA/GACC đã xuất bản. */
export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasCrmAccess(user)) {
    return NextResponse.json(
      { error: "Bộ phận chuyên môn không có vai trò trong CRM." },
      { status: 403 }
    );
  }
  return NextResponse.json({ items: await crmListCustomers(scopeFilter(user)) });
}
