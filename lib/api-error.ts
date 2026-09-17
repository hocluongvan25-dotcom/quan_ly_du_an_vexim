import { NextResponse } from "next/server";
import { dbErrorMessage, describeDbError } from "./db-health";

/**
 * Chuẩn hoá lỗi trả về từ API route.
 * - Lỗi schema (thiếu bảng/cột, vi phạm check constraint) → 503 + hướng dẫn chạy migration.
 * - Lỗi khác → 500 kèm message, không nuốt lỗi.
 */
export function dbFailure(e: unknown) {
  const problem = describeDbError(e);
  if (problem) {
    return NextResponse.json(
      { error: problem.title, detail: problem.detail, fix: problem.fix, code: problem.code ?? null },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: dbErrorMessage(e) }, { status: 500 });
}
