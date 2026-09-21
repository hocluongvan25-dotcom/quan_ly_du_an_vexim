export const SIDEBAR_COOKIE = "vexim-sidebar";

export function isSidebarCollapsed(value: string | undefined): boolean {
  return value === "collapsed";
}

/** Presentation preference only; it never grants access or changes user permissions. */
export function sidebarPreferenceCookie(collapsed: boolean, secure = false): string {
  return `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; Path=/dashboard; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function isSidebarItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard" || href === "/dashboard/crm") return pathname === href;
  if (href === "/dashboard/crm/pipeline") return pathname.startsWith("/dashboard/crm/");
  // Trang quản trị con (bảng giá) không làm sáng mục cha; mục cha cũng không sáng ở trang con đó.
  if (href === "/dashboard/bao-gia") {
    return pathname === href || (pathname.startsWith("/dashboard/bao-gia/") && !pathname.startsWith("/dashboard/bao-gia/bang-gia"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
