import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasCrmAccess } from "@/lib/permissions";
import { crmCompleteActivity } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** Đánh dấu hoàn thành một follow-up → đồng hồ "stale" của cơ hội được reset. */
export async function PUT(_: Request, ctx: Ctx) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasCrmAccess(user)) {
    return NextResponse.json(
      { error: "Bộ phận chuyên môn không có vai trò trong CRM." },
      { status: 403 }
    );
  }
  try {
    const item = await crmCompleteActivity(Number(ctx.params.id), user.id);
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    return NextResponse.json(
      { error: msg === "NOT_FOUND" ? "Không tìm thấy hoạt động." : msg },
      { status: 400 }
    );
  }
}
