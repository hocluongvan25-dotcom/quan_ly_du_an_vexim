import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCompanies, createCompany, getCompanyByName, listCertificates } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const companies = await listCompanies();
    // Merge distinct company names from certificates for autocomplete fallback (official DB + certs)
    try {
      const certs = await listCertificates();
      const existingNames = new Set(companies.map((c) => c.company_name.toLowerCase()));
      const extra: typeof companies = [];
      for (const cert of certs) {
        const name = cert.company_name?.trim();
        if (!name) continue;
        const low = name.toLowerCase();
        if (existingNames.has(low)) continue;
        existingNames.add(low);
        extra.push({
          id: -cert.id,
          company_name: name,
          email: (cert as any).company_email || "",
          phone: "",
          tax_code: "",
          address: "",
          contact_person: "",
          notes: "",
          created_at: cert.created_at,
          updated_at: cert.updated_at,
        } as any);
      }
      return NextResponse.json({ companies: [...companies, ...extra], items: [...companies, ...extra] });
    } catch {
      return NextResponse.json({ companies, items: companies });
    }
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const body = await req.json();

    const company_name = String(body.company_name || "").trim();
    if (!company_name) {
      return NextResponse.json({ error: "COMPANY_NAME_REQUIRED" }, { status: 400 });
    }

    // Check duplicate
    const existing = await getCompanyByName(company_name);
    if (existing) {
      return NextResponse.json({ error: "COMPANY_EXISTS", existing }, { status: 409 });
    }

    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const tax_code = String(body.tax_code || "").trim();
    const address = String(body.address || "").trim();
    const contact_person = String(body.contact_person || "").trim();
    const notes = String(body.notes || "").trim();

    // Basic validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }

    const id = await createCompany({
      company_name,
      email,
      phone,
      tax_code,
      address,
      contact_person,
      notes,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
