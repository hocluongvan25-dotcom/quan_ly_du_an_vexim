import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/db";
import { CRM_ROLES, ROLE_LABEL, type Role } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const items = await listUsers();
  return NextResponse.json({
    items,
    roles: CRM_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r], duty: undefined })),
  });
}

export async function POST(req: Request) {
  const user = getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  const role = (CRM_ROLES.includes(body.role) ? body.role : "specialist") as Role;
  if (!email || !name || password.length < 6) {
    return NextResponse.json({ error: "Thiếu thông tin hoặc mật khẩu quá ngắn." }, { status: 400 });
  }
  try {
    const id = await createUser({
      email,
      name,
      password,
      role,
      team_id: body.team_id ? Number(body.team_id) : null,
    });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Email đã tồn tại." }, { status: 400 });
  }
}
