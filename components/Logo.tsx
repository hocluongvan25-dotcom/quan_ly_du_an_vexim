import { cn } from "@/lib/utils";

/**
 * Logo chữ "VeximGlobal" — dùng chữ của hệ thống thay cho ảnh logo.
 * `size` điều chỉnh cỡ chữ, `tone` chọn màu cho nền sáng (mực navy) hoặc nền navy (trắng + vàng).
 */
export function LogoWordmark({
  className,
  size = "md",
  tone = "ink",
  withMark = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "ink" | "light";
  withMark?: boolean;
}) {
  const sizeClass = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  }[size];

  const brandClass = tone === "light" ? "text-white" : "text-navy-900";
  const globalClass = tone === "light" ? "text-gold-400" : "text-teal-700";

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      {withMark && (
        <span
          aria-hidden="true"
          className="mr-1 inline-block h-[0.42em] w-[0.42em] rounded-full bg-gradient-to-br from-teal-500 via-navy-900 to-gold-400 align-middle"
        />
      )}
      <span className={cn("font-display font-extrabold tracking-tight", sizeClass, brandClass)}>
        Vexim
      </span>
      <span className={cn("font-display font-extrabold tracking-tight", sizeClass, globalClass)}>
        Global
      </span>
    </span>
  );
}

export function Logo({
  className,
  markClassName,
  wordmark = true,
  invert = false,
}: {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
  invert?: boolean;
}) {
  // New Vexim Global logo - uses full logo with text for wordmark, mark only for icon
  if (wordmark) {
    return (
      <div className={cn("flex items-center", className)}>
        <img
          src={invert ? "/logo-white.png" : "/logo.png"}
          alt="Vexim Global - Tận tâm, nhanh chóng, chính xác"
          className={cn(
            "object-contain",
            // Responsive sizing: sidebar needs larger, header needs medium
            invert 
              ? "h-12 w-auto max-w-[180px]" 
              : "h-10 w-auto max-w-[200px] md:h-11",
            markClassName
          )}
        />
      </div>
    );
  }

  // Mark only (for QR code center, favicon etc)
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src="/logo-mark-new.png"
        alt="Vexim Global"
        className={cn("h-10 w-10 object-contain", markClassName)}
      />
    </div>
  );
}
