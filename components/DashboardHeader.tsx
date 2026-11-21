"use client";

import { MobileNav } from "./MobileNav";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LeadsNotifier } from "./LeadsNotifier";
import { useI18n } from "@/lib/i18n/context";
import type { SessionUser } from "@/lib/types";

export function DashboardHeader({ user }: { user: SessionUser }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-navy-900/5 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <MobileNav user={user} />
        <div className="hidden text-sm text-navy-900/60 md:block">
          {t("nav.internalSystem")}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <LeadsNotifier />
        <LanguageSwitcher size="sm" />
        <div className="text-right text-xs text-navy-900/50 hidden sm:block">{user.email}</div>
      </div>
    </header>
  );
}
