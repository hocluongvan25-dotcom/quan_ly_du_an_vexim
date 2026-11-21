import { NextRequest, NextResponse } from "next/server";
import { getLead, updateLeadStatus, deleteLead } from "@/lib/db";
import { getSession, requireAdmin as requireAdminAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = getSession();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const id = Number(params.id);
    const lead = await getLead(id);
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(lead);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const id = Number(params.id);
    const body = await req.json();
    const status = String(body.status || "").trim() as "new" | "contacted" | "converted" | "closed";
    if (!["new", "contacted", "converted", "closed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await updateLeadStatus(id, status);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin();
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const id = Number(params.id);
    await deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === "Unauthorized" ? 401 : 500 });
  }
}
