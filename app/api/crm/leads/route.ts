import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { crmCreateLead, crmListLeads } from "@/lib/db";
import { can, scopeFilter } from "@/lib/permissions";
import type { LeadSource, LeadStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCES: LeadSource[] = [
  "referral",
  "website",
  "trade_show",
  "outbound",
  "social",
  "list_import",
  "other",
];
const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "unqualified", "converted"];

export async function GET() {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json({ items: await crmListLeads(scopeFilter(user)) });
}

export async function POST(req: Request) {
  const user = getSession();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!can(user.role, "crm.create_lead")) {
    return NextResponse.json(
      { error: "Vai trò của bạn không được phép tạo lead." },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const company = String(body.company_name || "").trim();
  if (!company) {
    return NextResponse.json({ error: "Thiếu tên doanh nghiệp." }, { status: 400 });
  }
  const canAssign = can(user.role, "crm.assign_lead");
  const requestedOwner = body.owner_id ? Number(body.owner_id) : null;
  const id = await crmCreateLead({
    company_name: company,
    contact_name: String(body.contact_name || ""),
    contact_title: String(body.contact_title || ""),
    email: String(body.email || ""),
    phone: String(body.phone || ""),
    website: String(body.website || ""),
    address: String(body.address || ""),
    country: String(body.country || "Việt Nam"),
    industry: String(body.industry || ""),
    employee_size: String(body.employee_size || ""),
    annual_revenue: String(body.annual_revenue || ""),
    main_products: String(body.main_products || ""),
    target_market: String(body.target_market || ""),
    current_standards: String(body.current_standards || ""),
    pain_points: String(body.pain_points || ""),
    notes: String(body.notes || ""),
    source: (SOURCES.includes(body.source) ? body.source : "other") as LeadSource,
    source_detail: String(body.source_detail || ""),
    status: (STATUSES.includes(body.status) ? body.status : "new") as LeadStatus,
    quality_score: Number(body.quality_score || 0),
    // SR/LR tạo lead thì tự mình là owner tạm thời; AE/Admin có thể phân công ngay.
    owner_id: canAssign && requestedOwner ? requestedOwner : user.id,
    team_id: user.team_id,
    created_by: user.id,
  });
  return NextResponse.json({ id });
}
