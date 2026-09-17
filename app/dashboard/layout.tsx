import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { dbStatus } from "@/lib/db-health";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { DbSetupNotice } from "@/components/DbSetupNotice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = getSession();
  if (!user) redirect("/login");
  // Kiểm tra schema một lần cho cả khu vực nội bộ: thiếu migration thì báo ngay
  // thay vì để từng trang đổ lỗi 500 khó hiểu.
  const db = await dbStatus();

  return (
    <div className="flex min-h-screen bg-[#fff8ec]">
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
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {!db.ready && db.problem && (
            <div className="mb-5">
              <DbSetupNotice problem={db.problem} compact />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
