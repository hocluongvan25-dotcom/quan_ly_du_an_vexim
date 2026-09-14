import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  confirmValidity,
  deleteCertificate,
  getCertificate,
  publishCertificate,
  renewCertificate,
  updateCertificate,
} from "@/lib/db";
import type { Standard } from "@/lib/types";
import { handleApiError } from "@/lib/api-helpers";
import { isValidValidityYears } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: { id: string } };

export async function GET(_: Request, ctx: Ctx) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const item = await getCertificate(Number(ctx.params.id));
    if (!item) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const id = Number(ctx.params.id);
  try {
    if (action === "confirm") {
      await confirmValidity(id);
      return NextResponse.json({ item: await getCertificate(id) });
    }
    if (action === "publish") {
      const item = await publishCertificate(id);
      return NextResponse.json({ item });
    }
    if (action === "renew") {
      const item = await renewCertificate(id, Number(body.extra_fee || 0));
      return NextResponse.json({ item });
    }
    const standard = body.standard === "GACC" ? "GACC" : "FDA";
    const validity_years = body.validity_years ? Number(body.validity_years) : undefined;
    if (validity_years && !isValidValidityYears(validity_years)) {
      return NextResponse.json({ error: "Thời hạn hợp đồng phải từ 1 đến 10 năm." }, { status: 400 });
    }
    await updateCertificate(id, {
      standard: standard as Standard,
      registration_code: String(body.registration_code || ""),
      service_price: Number(body.service_price || 0),
      company_name: String(body.company_name || ""),
      scope: String(body.scope || ""),
      registered_at: String(body.registered_at || "").slice(0, 10),
      validity_years,
    });
    return NextResponse.json({ item: await getCertificate(id) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg.includes("SUPABASE_SCHEMA_MISSING") || msg.includes("PGRST205")) {
      return handleApiError(e);
    }
    const map: Record<string, string> = {
      NOT_FOUND: "Không tìm thấy hồ sơ.",
      NOT_CONFIRMED: "Cần xác nhận hiệu lực (VALID) trước khi xuất bản.",
      INCOMPLETE: "Thiếu tên công ty hoặc mã số đăng ký.",
      MISSING_DATES: "Thiếu ngày đăng ký / ngày hết hạn.",
      PUBLISHED: "Không thể xoá hồ sơ đã xuất bản.",
    };
    return NextResponse.json({ error: map[msg] || msg }, { status: 400 });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    await deleteCertificate(Number(ctx.params.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg.includes("SUPABASE_SCHEMA_MISSING") || msg.includes("PGRST205")) {
      return handleApiError(e);
    }
    return NextResponse.json(
      { error: msg === "PUBLISHED" ? "Không thể xoá hồ sơ đã xuất bản." : msg },
      { status: 400 }
    );
  }
}
