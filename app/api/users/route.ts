import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/db";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  return NextResponse.json({ items: listUsers() });
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
  const role: Role = body.role === "admin" ? "admin" : "specialist";
  if (!email || !name || password.length < 6) {
    return NextResponse.json({ error: "Thiếu thông tin hoặc mật khẩu quá ngắn." }, { status: 400 });
  }
  try {
    const id = createUser({ email, name, password, role });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Email đã tồn tại." }, { status: 400 });
  }
}
