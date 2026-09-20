import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listCompanies, createCompany, getCompanyByName, listCertificates } from "@/lib/db";
import { handleApiError } from "@/lib/api-helpers";
import { remainingDays } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = getSession();
    if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const companies = await listCompanies();
    try {
      const certs = await listCertificates();
      const certMap = new Map<
        string,
        {
          standards: Set<string>;
          count: number;
          email?: string;
          nearestExpiry?: string;
          nearestRemaining?: number;
          nearestCertNo?: string;
          nearestStandard?: string;
          allExpiries: Array<{ expires_at: string; remaining: number; certificate_no: string; standard: string; status: string }>;
        }
      >();
      for (const cert of certs) {
        const name = cert.company_name?.trim();
        if (!name) continue;
        const low = name.toLowerCase();
        if (!certMap.has(low)) {
          certMap.set(low, { standards: new Set(), count: 0, email: (cert as any).company_email || "", allExpiries: [] });
        }
        const entry = certMap.get(low)!;
        entry.standards.add(cert.standard);
        entry.count++;
        if (!entry.email && (cert as any).company_email) entry.email = (cert as any).company_email;
        const rem = remainingDays(cert.expires_at);
        entry.allExpiries.push({
          expires_at: cert.expires_at,
          remaining: rem,
          certificate_no: cert.certificate_no,
          standard: cert.standard,
          status: cert.status,
        });
      }
      Array.from(certMap.values()).forEach((entry) => {
        if (entry.allExpiries.length === 0) return;
        const sorted = [...entry.allExpiries].sort((a, b) => a.remaining - b.remaining);
        const upcoming = sorted.filter((e) => e.remaining >= 0).sort((a, b) => a.remaining - b.remaining)[0];
        const nearest = upcoming || sorted.sort((a, b) => b.remaining - a.remaining)[0];
        if (nearest) {
          entry.nearestExpiry = nearest.expires_at;
          entry.nearestRemaining = nearest.remaining;
          entry.nearestCertNo = nearest.certificate_no;
          entry.nearestStandard = nearest.standard;
        }
      });

      const enriched = companies.map((c) => {
        const low = c.company_name.toLowerCase();
        const info = certMap.get(low);
        return {
          ...c,
          standards: info ? Array.from(info.standards) : [],
          certificate_count: info?.count || 0,
          services_label: info ? Array.from(info.standards).join(", ") : "",
          nearest_expiry: info?.nearestExpiry || null,
          nearest_remaining: info?.nearestRemaining ?? null,
          nearest_cert_no: info?.nearestCertNo || null,
          nearest_standard: info?.nearestStandard || null,
          expiries: info?.allExpiries || [],
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
          nearest_expiry: info?.nearestExpiry || cert.expires_at,
          nearest_remaining: info?.nearestRemaining ?? remainingDays(cert.expires_at),
          nearest_cert_no: info?.nearestCertNo || cert.certificate_no,
          nearest_standard: info?.nearestStandard || cert.standard,
          expiries: info?.allExpiries || [],
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
