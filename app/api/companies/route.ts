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
    try {
      const certs = await listCertificates();
      // Build map: company lower -> Set of standards + count
      const certMap = new Map<string, { standards: Set<string>; count: number; email?: string }>();
      for (const cert of certs) {
        const name = cert.company_name?.trim();
        if (!name) continue;
        const low = name.toLowerCase();
        if (!certMap.has(low)) certMap.set(low, { standards: new Set(), count: 0, email: (cert as any).company_email || "" });
        const entry = certMap.get(low)!;
        entry.standards.add(cert.standard);
        entry.count++;
        if (!entry.email && (cert as any).company_email) entry.email = (cert as any).company_email;
      }

      const enriched = companies.map((c) => {
        const low = c.company_name.toLowerCase();
        const info = certMap.get(low);
        return {
          ...c,
          standards: info ? Array.from(info.standards) : [],
          certificate_count: info?.count || 0,
          services_label: info ? Array.from(info.standards).join(", ") : "",
        };
      });

      const existingNames = new Set(companies.map((c) => c.company_name.toLowerCase()));
      const extra: any[] = [];
      for (const cert of certs) {
        const name = cert.company_name?.trim();
        if (!name) continue;
        const low = name.toLowerCase();
        if (existingNames.has(low)) continue;
        existingNames.add(low);
        const info = certMap.get(low);
        extra.push({
          id: -cert.id,
          company_name: name,
          email: info?.email || (cert as any).company_email || "",
          phone: "",
          tax_code: "",
          address: "",
          contact_person: "",
          notes: "",
          created_at: cert.created_at,
          updated_at: cert.updated_at,
          standards: info ? Array.from(info.standards) : [cert.standard],
          certificate_count: info?.count || 1,
          services_label: info ? Array.from(info.standards).join(", ") : cert.standard,
        });
      }

      const all = [...enriched, ...extra];
      return NextResponse.json({ companies: all, items: all });
    } catch (err) {
      console.error("companies enrich error", err);
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
