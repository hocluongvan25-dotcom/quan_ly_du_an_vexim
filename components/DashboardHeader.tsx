"use client";

import { MobileNav } from "./MobileNav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { useI18n } from "@/lib/i18n/context";
import type { SessionUser } from "@/lib/types";

export function DashboardHeader({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#e5e5ea] bg-white/85 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <MobileNav user={user} />
        <div className="hidden text-sm text-[#6e6e73] md:block">
          {t("nav.internalSystem")}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <NotificationBell />
        <LanguageSwitcher size="sm" />
        <div className="text-right text-xs text-[#86868b] hidden sm:block">{user.email}</div>
      </div>
    </header>
  );
}
