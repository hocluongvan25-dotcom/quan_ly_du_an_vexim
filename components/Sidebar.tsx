"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  FileBadge2,
  LayoutDashboard,
  LogOut,
  Plus,
  Users,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, adminOnly: false },
  { href: "/dashboard/ho-so", label: "Hồ sơ FDA / GACC", icon: FileBadge2, adminOnly: false },
  { href: "/dashboard/ho-so/moi", label: "Tạo hồ sơ mới", icon: Plus, adminOnly: false },
  { href: "/dashboard/doanh-thu", label: "Doanh thu", icon: BarChart3, adminOnly: true },
  { href: "/dashboard/nguoi-dung", label: "Người dùng & vai trò", icon: Users, adminOnly: true },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <aside className="flex h-full w-[268px] flex-col bg-navy-900 text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Logo invert />
        <p className="mt-3 text-[11px] leading-relaxed text-white/55">
          Quản lý hồ sơ FDA · GACC
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.filter((i) => !i.adminOnly || user.role === "admin").map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href ||
                (item.href === "/dashboard/ho-so" &&
                  pathname.startsWith("/dashboard/ho-so") &&
                  pathname !== "/dashboard/ho-so/moi");
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
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-2xl bg-white/5 px-3 py-2.5">
          <div className="text-sm font-semibold">{user.name}</div>
          <div className="text-[11px] text-teal-300">
            {user.role === "admin" ? "Quản trị viên" : "Bộ phận chuyên môn"}
          </div>
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
