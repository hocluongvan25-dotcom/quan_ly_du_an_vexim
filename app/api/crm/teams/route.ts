import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/permissions";
import { crmCreateTeam, crmListTeams } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasCrmAccess(user)) {
    return NextResponse.json(
      { error: "Bộ phận chuyên môn không có vai trò trong CRM." },
      { status: 403 }
    );
  }
  return NextResponse.json({ items: await crmListTeams() });
}

export async function POST(req: Request) {
  const user = getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Thiếu tên team." }, { status: 400 });
  const id = await crmCreateTeam({ name, ae_id: body.ae_id ? Number(body.ae_id) : null });
  return NextResponse.json({ id });
}
