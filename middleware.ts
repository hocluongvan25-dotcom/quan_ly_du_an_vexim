import { NextResponse, type NextRequest } from "next/server";

/**
 * Ghi lại đường dẫn hiện tại vào header để layout gốc đặt đúng thuộc tính lang
 * cho bản tiếng Việt (lang="vi") và bản tiếng Anh (lang="en") ngay từ HTML máy chủ.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
