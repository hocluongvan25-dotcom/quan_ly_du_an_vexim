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
    default: "bg-white border border-navy-900/10 text-navy-900 hover:bg-slate-50 shadow-sm",
    light: "bg-white/10 text-white hover:bg-white/20 border border-white/20",
    dark: "bg-navy-900 text-white hover:bg-navy-800",
    ghost: "bg-transparent text-navy-900/60 hover:text-navy-900 hover:bg-navy-900/5",
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
            locale === "en" ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-600"
          )}
        >
          EN
        </span>
        <span className="mx-0.5 text-[10px] text-navy-900/30">/</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors",
            locale === "vi" ? "bg-navy-900 text-white" : "bg-slate-200 text-slate-600"
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
          locale === "en" ? "bg-navy-900 text-white shadow-sm" : "text-navy-900/60 hover:text-navy-900"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("vi")}
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-bold transition-all",
          locale === "vi" ? "bg-navy-900 text-white shadow-sm" : "text-navy-900/60 hover:text-navy-900"
        )}
      >
        VI
      </button>
    </div>
  );
}
