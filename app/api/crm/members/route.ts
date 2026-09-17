import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import { hasCrmAccess } from "@/lib/permissions";
import { dbFailure } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Danh sách người có thể nhận lead / cơ hội.
 *
 * Trước đây các trang CRM gọi `/api/users` — endpoint chỉ dành cho Founder — nên AE
 * (người chịu trách nhiệm phân công lead) luôn nhận 403 và dropdown phân công trống.
 * Endpoint này trả đúng phạm vi:
 *  - Founder/Admin: toàn bộ AE, SR, LR.
 *  - AE: thành viên trong team của mình (và chính mình).
 *  - SR/LR: chỉ chính mình.
 */
export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasCrmAccess(user)) {
    return NextResponse.json(
      { error: "Bộ phận chuyên môn không có vai trò trong CRM." },
      { status: 403 }
    );
  }

  try {
    const all = await listUsers();
    const crmRoles = ["ae", "sr", "lr"];
    let items = all.filter((u) => crmRoles.includes(u.role));

    if (user.role === "ae") {
      items = items.filter((u) => u.id === user.id || (user.team_id != null && u.team_id === user.team_id));
    } else if (user.role === "sr" || user.role === "lr") {
      items = items.filter((u) => u.id === user.id);
    }

    return NextResponse.json({
      items: items.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        team_id: u.team_id,
      })),
    });
  } catch (e) {
    return dbFailure(e);
  }
}
