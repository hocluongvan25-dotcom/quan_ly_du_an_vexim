import { NextResponse } from "next/server";
import { dbFailure } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import { crmListTeams, crmSetTeamLeader, listUsers } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/**
 * Founder gán AE (Pipeline Owner) cho team.
 * `setTeamLeader` đã có sẵn ở cả hai tầng dữ liệu nhưng chưa được nối ra API/UI,
 * nên team tạo mới luôn ở trạng thái "chưa gán AE" và không ai xem được scope team.
 */
export async function PUT(req: Request, ctx: Ctx) {
  const user = getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const id = Number(ctx.params.id);
  if (!id) return NextResponse.json({ error: "Thiếu id team." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const aeId =
    body.ae_id === undefined || body.ae_id === null || body.ae_id === ""
      ? null
      : Number(body.ae_id);

  try {
    await crmSetTeamLeader(id, aeId);
    const items = await crmListTeams();
    const item = items.find((t) => t.id === id);
    if (!item) return NextResponse.json({ error: "Không tìm thấy team." }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    return dbFailure(e);
  }
}
