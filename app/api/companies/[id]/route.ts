import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCompany, updateCompany, deleteCompany, getCompanyStats, getCompanyByName } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    const company = await getCompany(id);
    if (!company) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const stats = await getCompanyStats(company.company_name);
    return NextResponse.json({ company, stats });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

    const body = await req.json();
    const company_name = String(body.company_name || "").trim();
    if (!company_name) return NextResponse.json({ error: "COMPANY_NAME_REQUIRED" }, { status: 400 });

    const existing = await getCompanyByName(company_name);
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "COMPANY_EXISTS" }, { status: 409 });
    }

    const email = String(body.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }

    await updateCompany(id, {
      company_name,
      email,
      phone: String(body.phone || "").trim(),
      tax_code: String(body.tax_code || "").trim(),
      address: String(body.address || "").trim(),
      contact_person: String(body.contact_person || "").trim(),
      notes: String(body.notes || "").trim(),
    });

    const updated = await getCompany(id);
    return NextResponse.json({ company: updated });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    await deleteCompany(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
