import { NextResponse } from "next/server";
import { clearCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const c = clearCookie();
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
