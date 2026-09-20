"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  FileBadge2,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcherCompact } from "./LanguageSwitcher";

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const NAV = [
    { href: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard, adminOnly: false },
    { href: "/dashboard/tong-quan", labelKey: "Toàn cảnh", icon: Globe, adminOnly: true },
    { href: "/dashboard/crm", labelKey: "CRM Vận hành", icon: Briefcase, adminOnly: false },
    { href: "/dashboard/crm/pipeline", labelKey: "CRM Pipeline", icon: KanbanSquare, adminOnly: false },
    { href: "/dashboard/ho-so", labelKey: "nav.records", icon: FileBadge2, adminOnly: false },
    { href: "/dashboard/dich-vu", labelKey: "Hợp Đồng Dịch Vụ", icon: Handshake, adminOnly: false },
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
    <aside className="flex h-full w-[268px] flex-col bg-navy-900 text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link
          href="/dashboard"
          aria-label="Vexim Global — Tổng quan"
          className="inline-block whitespace-nowrap rounded font-display text-2xl font-extrabold tracking-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400"
        >
          Vexim <span className="font-medium text-gold-400">Global</span>
        </Link>
        <p className="mt-3 text-[11px] leading-relaxed text-white/55">
          {t("nav.fdaGaccManagement")}
        </p>
        <div className="mt-3">
          <LanguageSwitcherCompact className="bg-white/10" />
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.filter((i) => !i.adminOnly || user.role === "admin").map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : item.href === "/dashboard/crm"
                ? pathname === "/dashboard/crm"
                : item.href === "/dashboard/crm/pipeline"
                  ? pathname.startsWith("/dashboard/crm/")
                  : pathname === item.href ||
                    (item.href === "/dashboard/ho-so" && pathname.startsWith("/dashboard/ho-so"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white/10 text-white shadow-inner"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 text-teal-400" />
              {item.labelKey.includes(" ") ? item.labelKey : t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="mb-3 rounded-2xl bg-white/5 px-3 py-2.5">
          <div className="text-sm font-semibold">{user.name}</div>
          <div className="text-[11px] text-teal-300">
            {user.role === "admin" ? t("nav.admin") : t("nav.specialist")}
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/15"
        >
          <LogOut className="h-4 w-4" /> {t("nav.logout")}
        </button>
      </div>
    </aside>
  );
}
