import { NextResponse } from "next/server";
import { dbFailure } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import { listUsers, setUserRole, setUserTeam } from "@/lib/db";
import { CRM_ROLES, type Role } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/**
 * Founder đổi vai trò / team của một tài khoản.
 * Trước đây trang "Người dùng & vai trò" chỉ tạo được tài khoản mới, không sửa được
 * người cũ — muốn đổi vai trò phải vào thẳng database.
 */
export async function PUT(req: Request, ctx: Ctx) {
  const user = getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const id = Number(ctx.params.id);
  if (!id) return NextResponse.json({ error: "Thiếu id người dùng." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const role =
    body.role === undefined ? undefined : (CRM_ROLES.includes(body.role) ? (body.role as Role) : null);
  if (role === null) {
    return NextResponse.json({ error: "Vai trò không hợp lệ." }, { status: 400 });
  }
  const teamId =
    body.team_id === undefined
      ? undefined
      : body.team_id === null || body.team_id === ""
        ? null
        : Number(body.team_id);

  // Không cho tự hạ quyền chính mình để tránh khoá hệ thống ngoài ý muốn.
  if (id === user.id && role && role !== "admin") {
    return NextResponse.json(
      { error: "Không thể tự hạ vai trò của chính mình." },
      { status: 400 }
    );
  }

  try {
    if (role) await setUserRole(id, role);
    if (teamId !== undefined) await setUserTeam(id, teamId);
    const items = await listUsers();
    const item = items.find((u) => u.id === id);
    if (!item) return NextResponse.json({ error: "Không tìm thấy người dùng." }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    return dbFailure(e);
  }
}
