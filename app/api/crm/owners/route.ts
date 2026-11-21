import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/crm/owners — danh sách nhân sự để gán Owner (mọi user đã login đều xem được)
export async function GET() {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const users = await listUsers();
    return NextResponse.json({
      items: users.map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
