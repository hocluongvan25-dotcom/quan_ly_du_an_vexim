"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  FileBadge2,
  Gauge,
  Handshake,
  LayoutDashboard,
  LogOut,
  Plus,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { ROLE_SHORT, type Role, type SessionUser } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
  group: "CRM" | "Hồ sơ";
};

/**
 * Menu theo vai trò:
 *  - Founder/Admin: dashboard + pipeline + hiệu suất (không quản lý task hằng ngày)
 *  - AE: toàn bộ CRM của team
 *  - SR/LR: lead + hoạt động của mình
 *  - Chuyên môn: hồ sơ FDA/GACC
 */
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, group: "CRM" },
  {
    href: "/dashboard/crm",
    label: "CRM Dashboard",
    icon: Gauge,
    group: "CRM",
    roles: ["admin", "ae", "sr", "lr"],
  },
  {
    href: "/dashboard/crm/leads",
    label: "Lead",
    icon: Target,
    group: "CRM",
    roles: ["admin", "ae", "sr", "lr"],
  },
  {
    href: "/dashboard/crm/co-hoi",
    label: "Pipeline cơ hội",
    icon: TrendingUp,
    group: "CRM",
    roles: ["admin", "ae", "sr", "lr"],
  },
  {
    href: "/dashboard/crm/khach-hang",
    label: "Khách hàng",
    icon: Handshake,
    group: "CRM",
    roles: ["admin", "ae", "sr", "lr"],
  },
  {
    href: "/dashboard/crm/hieu-suat",
    label: "Hiệu suất đội sales",
    icon: BarChart3,
    group: "CRM",
    roles: ["admin", "ae"],
  },
  { href: "/dashboard/ho-so", label: "Hồ sơ FDA / GACC", icon: FileBadge2, group: "Hồ sơ" },
  { href: "/dashboard/ho-so/moi", label: "Tạo hồ sơ mới", icon: Plus, group: "Hồ sơ" },
  { href: "/dashboard/doanh-thu", label: "Doanh thu", icon: BarChart3, group: "Hồ sơ", roles: ["admin"] },
  { href: "/dashboard/nguoi-dung", label: "Người dùng & vai trò", icon: Users, group: "Hồ sơ", roles: ["admin"] },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const visible = NAV.filter((i) => !i.roles || i.roles.includes(user.role));
  const groups = ["CRM", "Hồ sơ"] as const;

  return (
    <aside className="flex h-full w-[268px] flex-col bg-navy-900 text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Logo invert />
        <p className="mt-3 text-[11px] leading-relaxed text-white/55">
          CRM Sales Operation · Hồ sơ FDA / GACC
        </p>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {groups.map((g) => {
          const items = visible.filter((i) => i.group === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                {g === "CRM" ? "VEXIM CRM" : "Vận hành hồ sơ"}
              </div>
              <div className="space-y-1">
                {items.map((item) => {
                  const active =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === item.href ||
                        (item.href !== "/dashboard/crm" && pathname.startsWith(item.href)) ||
                        (item.href === "/dashboard/crm" && pathname === "/dashboard/crm");
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
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-2xl bg-white/5 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">{user.name}</div>
            <span className="rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-extrabold text-navy-950">
              {ROLE_SHORT[user.role] || user.role}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-teal-300">{user.email}</div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/15"
        >
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>
      </div>
    </aside>
  );
}
