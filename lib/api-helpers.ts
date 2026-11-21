import { NextResponse } from "next/server";

export function handleApiError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[API Error]", msg, e);

  if (msg.includes("SUPABASE_SCHEMA_MISSING")) {
    return NextResponse.json(
      {
        error: "Supabase Configuration Error",
        details: msg,
        hint: "Please go to Supabase Dashboard > SQL Editor, run the entire supabase/schema.sql file, then run: NOTIFY pgrst, 'reload schema';",
        code: "PGRST205",
      },
      { status: 500 }
    );
  }

  if (msg.includes("PGRST205") || msg.includes("schema cache") || msg.includes("Could not find the table")) {
    return NextResponse.json(
      {
        error: "Table not found in Supabase (PGRST205)",
        details: msg,
        hint: "Table public.staff_users or public.certificates does not exist. Please run supabase/schema.sql in Supabase SQL Editor and reload schema cache.",
        code: "PGRST205",
      },
      { status: 500 }
    );
  }

  const map: Record<string, string> = {
    NOT_FOUND: "Certificate not found.",
    NOT_CONFIRMED: "Validity must be confirmed (VALID) before publishing.",
    INCOMPLETE: "Missing company name or registration code.",
    MISSING_DATES: "Missing registration date / expiry date.",
    PUBLISHED: "Cannot delete a published certificate.",
    UNAUTHORIZED: "Not authenticated.",
    FORBIDDEN: "Access denied.",
  };

  return NextResponse.json({ error: map[msg] || msg }, { status: 400 });
}
