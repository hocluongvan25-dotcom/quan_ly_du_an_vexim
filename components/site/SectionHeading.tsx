import { cn } from "@/lib/utils";

export function SectionHeading({
  index,
  eyebrow,
  title,
  description,
  tone = "dark",
  className,
  titleId,
}: {
  index?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: "dark" | "light";
  className?: string;
  titleId?: string;
}) {
  return (
    <div className={cn("grid gap-5 md:grid-cols-12 md:items-end md:gap-8", className)}>
      <div className="md:col-span-7">
        {(index || eyebrow) && (
          <p
            className={cn(
              "flex items-baseline gap-3 text-[10.5px] font-semibold uppercase tracking-label",
              tone === "light" ? "text-brass-300" : "text-brass-600"
            )}
          >
            {index ? (
              <span className={cn("font-serif text-[13px] font-medium", tone === "light" ? "text-white" : "text-brand-900")}>
                {index}
              </span>
            ) : null}
            {index && eyebrow ? (
              <span className="h-px w-5 self-center bg-current opacity-40" aria-hidden="true" />
            ) : null}
            {eyebrow ? <span>{eyebrow}</span> : null}
          </p>
        )}
        <h2
          id={titleId}
          className={cn(
            "mt-4 font-serif text-[27px] leading-[1.18] tracking-[-0.01em] md:text-[36px]",
            tone === "light" ? "text-white" : "text-brand-950"
          )}
        >
          {title}
        </h2>
      </div>
      {description ? (
        <p
          className={cn(
            "text-[13.5px] leading-7 md:col-span-5 md:pb-1",
            tone === "light" ? "text-brand-200/85" : "text-ink-500"
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
