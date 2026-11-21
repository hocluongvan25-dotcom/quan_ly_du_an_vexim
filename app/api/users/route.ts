import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/db";
import type { Role } from "@/lib/types";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ items: await listUsers() });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = getSession();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").toLowerCase().trim();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    const role: Role = body.role === "admin" ? "admin" : "specialist";
    if (!email || !name || password.length < 6) {
      return NextResponse.json({ error: "Missing info or password too short." }, { status: 400 });
    }
    const id = await createUser({ email, name, password, role });
    return NextResponse.json({ id });
  } catch (e: any) {
    const msg = e?.message || "";
    if (msg.includes("SUPABASE_SCHEMA_MISSING") || msg.includes("PGRST205")) {
      return handleApiError(e);
    }
    return NextResponse.json({ error: "Email already exists." }, { status: 400 });
  }
}
