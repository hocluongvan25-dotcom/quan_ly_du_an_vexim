import { NextResponse } from "next/server";
import { dbFailure } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/db";
import { CRM_ROLES, ROLE_LABEL, type Role } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  try {
    const items = await listUsers();
    return NextResponse.json({
      items,
      roles: CRM_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
    });
  } catch (e) {
    return dbFailure(e);
  }
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
  } catch (e) {
    // Trước đây mọi lỗi đều bị báo thành "Email đã tồn tại", kể cả khi database chưa
    // được nâng cấp cho vai trò CRM (23514 · staff_users_role_check) → rất khó đoán bệnh.
    const code = (e as { code?: string } | null)?.code;
    if (code === "23505") {
      return NextResponse.json({ error: "Email đã tồn tại." }, { status: 400 });
    }
    return dbFailure(e);
  }
}
