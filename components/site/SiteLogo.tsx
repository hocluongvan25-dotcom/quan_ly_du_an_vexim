import Link from "next/link";
import { cn } from "@/lib/utils";

export function SiteLogo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span
        className={cn(
          "font-sans text-[17px] font-semibold leading-none tracking-wordmark",
          tone === "light" ? "text-white" : "text-brand-900"
        )}
      >
        VEXIM
      </span>
      <span
        className={cn(
          "mt-[6px] text-[8px] font-semibold leading-none tracking-[0.5em]",
          tone === "light" ? "text-brand-200" : "text-brass-600"
        )}
      >
        GLOBAL
      </span>
    </span>
  );
}

export function SiteLogoLink({ tone = "dark", href = "/" }: { tone?: "dark" | "light"; href?: string }) {
  return (
    <Link href={href} aria-label="Vexim Global" className="focus-ring inline-flex shrink-0 items-center">
      <SiteLogo tone={tone} />
    </Link>
  );
}
