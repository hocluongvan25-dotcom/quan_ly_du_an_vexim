import { NextResponse } from "next/server";
import { scanAndNotifyExpiry } from "@/lib/expiry-checker";
import { handleApiError } from "@/lib/api-helpers";

export const runtime = "nodejs";
// This route can be called by Vercel Cron or manually
// Add CRON_SECRET env var to protect it, or allow authenticated users

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret") || req.headers.get("x-cron-secret");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, require it
    if (cronSecret && secret !== cronSecret) {
      // Also allow if user is authenticated via session cookie (for dashboard manual trigger)
      const { getSession } = await import("@/lib/auth");
      const session = getSession();
      if (!session) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
      }
    }

    const result = await scanAndNotifyExpiry();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  return GET(req);
}
