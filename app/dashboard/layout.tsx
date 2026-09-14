import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export const runtime = "nodejs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = getSession();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#eef3f6]">
      <div className="sticky top-0 hidden h-screen md:block">
        <Sidebar user={user} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-navy-900/5 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
          <MobileNav user={user} />
          <div className="hidden text-sm text-navy-900/60 md:block">
            Hệ thống nội bộ · Vexim Global
          </div>
          <div className="ml-auto text-right text-xs text-navy-900/50">{user.email}</div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
