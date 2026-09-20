import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { cookies } from "next/headers";
import { isSidebarCollapsed, SIDEBAR_COOKIE } from "@/lib/sidebar-preference";
import { DashboardHeader } from "@/components/DashboardHeader";

export const runtime = "nodejs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = getSession();
  if (!user) redirect("/login");

  const collapsed = isSidebarCollapsed(cookies().get(SIDEBAR_COOKIE)?.value);

  return (
    <div className="flex min-h-screen bg-[#fff8ec]">
      <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
        <Sidebar user={user} initialCollapsed={collapsed} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader user={user} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
