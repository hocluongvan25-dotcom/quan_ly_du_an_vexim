import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCrmOpportunity, listCrmActivities, createCrmActivity } from "@/lib/db";
import { canMutateOpportunity } from "@/lib/crm-types";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — danh sách hoạt động
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const opp = await getCrmOpportunity(Number(params.id));
    if (!opp) return NextResponse.json({ error: "Không tìm thấy cơ hội." }, { status: 404 });
    const items = await listCrmActivities(opp.id);
    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}

// POST — ghi nhận hoạt động (đồng thời có thể cập nhật next action)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const opp = await getCrmOpportunity(Number(params.id));
    if (!opp) return NextResponse.json({ error: "Không tìm thấy cơ hội." }, { status: 404 });
    if (!canMutateOpportunity(user, opp)) {
      return NextResponse.json({ error: "Chỉ Owner hoặc Admin mới được ghi hoạt động." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const id = await createCrmActivity(
      opp.id,
      {
        type: String(body.type || "note"),
        title: String(body.title || ""),
        content: String(body.content || ""),
        outcome: String(body.outcome || ""),
        next_action: body.next_action !== undefined ? String(body.next_action) : undefined,
        next_action_date:
          body.next_action_date !== undefined
            ? body.next_action_date
              ? String(body.next_action_date).slice(0, 10)
              : null
            : undefined,
      },
      user.id
    );
    const updated = await getCrmOpportunity(opp.id);
    return NextResponse.json({ id, success: true, opp: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
