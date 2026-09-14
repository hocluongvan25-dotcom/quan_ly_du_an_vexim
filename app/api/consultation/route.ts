import { NextRequest, NextResponse } from "next/server";
import { createLead, listLeads } from "@/lib/db";
import { sendLeadNotification } from "@/lib/email";
import type { LeadData } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || req.ip || "";
}

// POST /api/consultation - public, no auth required (from verify page)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const service_type = String(body.service_type || "").toLowerCase().trim() as "sales" | "amazon";
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const company_name = String(body.company_name || "").trim();
    const certificate_no = String(body.certificate_no || "").trim();
    const public_code = String(body.public_code || "").trim();
    const message = String(body.message || "").trim();
    const source_url = String(body.source_url || body.sourceUrl || "").trim() || req.headers.get("referer") || "";

    if (!["sales", "amazon"].includes(service_type)) {
      return NextResponse.json({ error: "Invalid service_type, must be sales or amazon" }, { status: 400 });
    }
    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Name is required (min 2 chars)" }, { status: 400 });
    }
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      return NextResponse.json({ error: "Valid phone is required (min 9 digits)" }, { status: 400 });
    }
    // Simple rate limit by IP: max 5 leads per hour (check in memory? For now rely on DB)
    // Could add more sophisticated rate limiting with upstash/redis later

    const ip = getClientIp(req);

    const leadId = await createLead({
      service_type,
      name,
      phone,
      email,
      company_name,
      certificate_no,
      public_code,
      message,
      source_url,
      ip,
    });

    // Send email notification via Zoho SMTP (non-blocking but await for result)
    const leadData: LeadData = {
      service_type,
      name,
      phone,
      email,
      company_name,
      certificate_no,
      public_code,
      message,
      source_url,
      ip,
    };

    // Fire and forget email but log result
    // We await to ensure email sent, but don't fail if email fails
    let emailResult = null;
    try {
      emailResult = await sendLeadNotification(leadData);
    } catch (e) {
      console.error("[Consultation] Email send error:", e);
    }

    return NextResponse.json({
      success: true,
      id: leadId,
      message: "Lead created",
      emailSent: emailResult?.adminResult?.success || false,
      mocked: emailResult?.adminResult?.mocked || false,
    });
  } catch (err: any) {
    console.error("[Consultation] POST error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// GET /api/consultation - admin only, list leads
export async function GET() {
  try {
    const { getSession } = await import("@/lib/auth");
    const user = getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await listLeads();
    return NextResponse.json({ items: leads, count: leads.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
