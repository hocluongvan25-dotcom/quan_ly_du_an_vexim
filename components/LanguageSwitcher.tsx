"use client";

import { useI18n } from "@/lib/i18n/context";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "default" | "light" | "dark" | "ghost";
  size?: "sm" | "md";
};

export function LanguageSwitcher({ className, variant = "default", size = "md" }: Props) {
  const { locale, setLocale, t } = useI18n();

  const toggle = () => {
    setLocale(locale === "en" ? "vi" : "en");
  };

  const baseClasses = "inline-flex items-center gap-1.5 rounded-full font-semibold transition-all";

  const sizeClasses = {
    sm: "px-2.5 py-1 text-[11px]",
    md: "px-3 py-1.5 text-xs",
  };

  const variantClasses = {
    default: "bg-white border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] shadow-sm",
    light: "bg-white/10 text-white hover:bg-white/20 border border-white/20",
    dark: "bg-[#1d1d1f] text-white hover:bg-[#3a3a3c]",
    ghost: "bg-transparent text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#e8e8ed]",
  };

  return (
    <button
      onClick={toggle}
      className={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}
      title={locale === "en" ? "Switch to Vietnamese" : "Chuyển sang tiếng Anh"}
      aria-label="Switch language"
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{locale === "en" ? "EN" : "VI"}</span>
      <span className="inline-flex items-center">
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors",
            locale === "en" ? "bg-[#1d1d1f] text-white" : "bg-[#e8e8ed] text-[#6e6e73]"
          )}
        >
          EN
        </span>
        <span className="mx-0.5 text-[10px] text-[#8e8e93]">/</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors",
            locale === "vi" ? "bg-[#1d1d1f] text-white" : "bg-[#e8e8ed] text-[#6e6e73]"
          )}
        >
          VI
        </span>
      </span>
    </button>
  );
}

export function LanguageSwitcherCompact({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div className={cn("inline-flex rounded-full bg-slate-100 p-1", className)}>
      <button
        onClick={() => setLocale("en")}
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-bold transition-all",
          locale === "en" ? "bg-[#0071e3] text-white shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("vi")}
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-bold transition-all",
          locale === "vi" ? "bg-[#0071e3] text-white shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"
        )}
      >
        VI
      </button>
    </div>
  );
}
