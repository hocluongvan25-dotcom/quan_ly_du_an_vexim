"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FocusEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  FileBadge2,
  FileText,
  Tags,
  Globe,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Users,
  MessageSquare,
  Building2,
  Bell,
  Handshake,
  ReceiptText,
  ChevronsLeft,
  ChevronsRight,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcherCompact } from "./LanguageSwitcher";
import { isSidebarItemActive, sidebarPreferenceCookie } from "@/lib/sidebar-preference";

export function Sidebar({ user, initialCollapsed = false, mobile = false, onNavigate }: {
  user: SessionUser;
  initialCollapsed?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [desktopCollapsed, setDesktopCollapsed] = useState(initialCollapsed);
  // The mobile drawer always shows full labels, regardless of the desktop preference.
  const collapsed = !mobile && desktopCollapsed;
  const [hint, setHint] = useState<{ key: string; text: string; left: number; top: number } | null>(null);
  const tooltipId = useId();
  const navId = useId();
  useEffect(() => { setHint(null); }, [pathname, collapsed, locale]);
  useEffect(() => {
    const clear = () => setHint(null);
    window.addEventListener("resize", clear);
    return () => window.removeEventListener("resize", clear);
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setDesktopCollapsed(next);
    setHint(null);
    try { document.cookie = sidebarPreferenceCookie(next, window.location.protocol === "https:"); }
    catch { /* Blocked cookies must not stop the toggle from working this session. */ }
  }
  function hintEvents(key: string, text: string) {
    const show = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
      if (!collapsed) return;
      const rect = event.currentTarget.getBoundingClientRect();
      setHint({ key, text, left: rect.right + 12, top: Math.max(24, Math.min(window.innerHeight - 24, rect.top + rect.height / 2)) });
    };
    return {
      onMouseEnter: show, onFocus: show,
      onMouseLeave: () => setHint(null), onBlur: () => setHint(null),
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => { if (event.key === "Escape") setHint(null); },
      "aria-describedby": hint?.key === key ? tooltipId : undefined,
    };
  }
  const profile = `${user.name} — ${user.role === "admin" ? t("nav.admin") : t("nav.specialist")}`;

  const NAV = [
    { href: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard, adminOnly: false },
    { href: "/dashboard/tong-quan", labelKey: "Toàn cảnh", icon: Globe, adminOnly: true },
    { href: "/dashboard/crm", labelKey: "CRM Vận hành", icon: Briefcase, adminOnly: false },
    { href: "/dashboard/crm/pipeline", labelKey: "CRM Pipeline", icon: KanbanSquare, adminOnly: false },
    { href: "/dashboard/ho-so", labelKey: "nav.records", icon: FileBadge2, adminOnly: false },
    { href: "/dashboard/dich-vu", labelKey: "Hợp Đồng Dịch Vụ", icon: Handshake, adminOnly: false },
    { href: "/dashboard/bao-gia", labelKey: "Báo Giá Dịch Vụ", icon: FileText, adminOnly: false },
    { href: "/dashboard/bao-gia/bang-gia", labelKey: "Bảng Giá Dịch Vụ", icon: Tags, adminOnly: true },
    { href: "/dashboard/ke-toan", labelKey: "Kế Toán Thu Chi", icon: ReceiptText, adminOnly: true },
    { href: "/dashboard/doanh-nghiep", labelKey: "Doanh Nghiệp", icon: Building2, adminOnly: false },
    { href: "/dashboard/canh-bao", labelKey: "Cảnh Báo Hết Hạn", icon: Bell, adminOnly: false },
    { href: "/dashboard/leads", labelKey: "Leads Tư Vấn", icon: MessageSquare, adminOnly: false },
    { href: "/dashboard/doanh-thu", labelKey: "nav.revenue", icon: BarChart3, adminOnly: true },
    { href: "/dashboard/nguoi-dung", labelKey: "nav.users", icon: Users, adminOnly: true },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <aside
      data-sidebar={mobile ? "mobile" : "desktop"}
      data-collapsed={collapsed}
      className={cn("flex h-full shrink-0 flex-col bg-navy-900 text-white transition-[width] duration-200 motion-reduce:transition-none",
        mobile ? "w-[268px] max-w-[calc(100vw-48px)]" : collapsed ? "w-[64px]" : "w-[228px]")}
    >
      <div className={cn("shrink-0 border-b border-white/10 py-4", collapsed ? "px-2" : "px-3")}>
        <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
          <Link href="/dashboard" onClick={() => { setHint(null); onNavigate?.(); }}
            aria-label={`Vexim Global — ${t("nav.overview")}`}
            className={cn("rounded font-display font-extrabold tracking-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400",
              collapsed ? "text-center text-[11px] leading-4" : "whitespace-nowrap text-xl")}
          >
            Vexim <span className={cn("font-medium text-gold-400", collapsed && "block")}>Global</span>
          </Link>
          {!mobile && <button type="button" onClick={toggleSidebar}
            aria-label={t(collapsed ? "nav.expandSidebar" : "nav.collapseSidebar")}
            title={t(collapsed ? "nav.expandSidebar" : "nav.collapseSidebar")}
            aria-expanded={!collapsed} aria-controls={navId}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400"
          >
            {collapsed ? <ChevronsRight aria-hidden="true" className="h-5 w-5" /> : <ChevronsLeft aria-hidden="true" className="h-5 w-5" />}
          </button>}
        </div>
        {!collapsed && <>
          <p className="mt-3 text-[11px] leading-relaxed text-white/55">{t("nav.fdaGaccManagement")}</p>
          <div className="mt-3"><LanguageSwitcherCompact className="bg-white/10" /></div>
        </>}
      </div>
      <nav id={navId} aria-label={t("nav.mainNavigation")} onScroll={() => setHint(null)}
        className={cn("min-h-0 flex-1 space-y-1 overflow-y-auto py-3", collapsed ? "px-2" : "px-3")}
      >
        {NAV.filter((i) => !i.adminOnly || user.role === "admin").map((item) => {
          const active = isSidebarItemActive(pathname, item.href);
          const Icon = item.icon;
          const label = item.labelKey.includes(" ") ? item.labelKey : t(item.labelKey);
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
              {...hintEvents(item.href, label)}
              onClick={() => { setHint(null); onNavigate?.(); }}
              className={cn("flex min-h-10 items-center rounded-xl text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-gold-400",
                collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-2.5 py-2.5",
                active ? "bg-white/10 text-white shadow-inner" : "text-white/70 hover:bg-white/5 hover:text-white")}
            >
              <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-teal-400" />
              <span className={collapsed ? "sr-only" : "min-w-0"}>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className={cn("shrink-0 border-t border-white/10 py-3", collapsed ? "px-2" : "px-3")}>
        {collapsed ? <div role="group" tabIndex={0} aria-label={profile} {...hintEvents("profile", profile)}
          className="mb-2 flex h-10 items-center justify-center rounded-xl bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400">
          <UserRound aria-hidden="true" className="h-5 w-5 text-teal-300" />
        </div> : <div className="mb-3 rounded-2xl bg-white/5 px-3 py-2.5">
          <div className="break-words text-sm font-semibold">{user.name}</div>
          <div className="text-[11px] text-teal-300">{user.role === "admin" ? t("nav.admin") : t("nav.specialist")}</div>
        </div>}
        <button type="button" onClick={logout} {...hintEvents("logout", t("nav.logout"))}
          className={cn("flex min-h-10 w-full items-center justify-center rounded-xl bg-white/10 py-2 text-sm font-medium text-white/80 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-400", collapsed ? "px-2" : "gap-2 px-3")}
        >
          <LogOut aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          <span className={collapsed ? "sr-only" : ""}>{t("nav.logout")}</span>
        </button>
      </div>
      {collapsed && hint && createPortal(
        <div id={tooltipId} role="tooltip" className="pointer-events-none fixed z-[80] max-w-[calc(100vw-88px)] -translate-y-1/2 break-words rounded-lg bg-navy-950 px-3 py-2 text-sm text-white shadow-lg"
          style={{ left: hint.left, top: hint.top }}>{hint.text}</div>, document.body)}
    </aside>
  );
}
