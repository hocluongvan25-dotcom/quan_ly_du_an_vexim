import { cn } from "@/lib/utils";

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
