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
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/logo-mark.png"
        alt="Vexim Global"
        className={cn("h-10 w-10 object-contain", markClassName)}
      />
      {wordmark && (
        <div className="leading-tight">
          <div
            className={cn(
              "font-display text-[15px] font-extrabold tracking-[0.14em]",
              invert ? "text-white" : "text-navy-900"
            )}
          >
            VEXIM
          </div>
          <div
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.28em]",
              invert ? "text-teal-400" : "text-teal-600"
            )}
          >
            Global
          </div>
        </div>
      )}
    </div>
  );
}
