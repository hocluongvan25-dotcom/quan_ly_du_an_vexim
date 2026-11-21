import { cn } from "@/lib/utils";

/**
 * Ký hiệu V của Vexim Global kèm tên thương hiệu bằng chữ, để header và footer
 * dùng cùng một khoá thương hiệu trên mọi kích thước màn hình.
 */
export function Brand({
  href = "/",
  light = false,
  className,
}: {
  href?: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn("site-brand", light && "site-brand--light", className)}
      aria-label="Vexim Global"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark-new.png"
        alt=""
        width={54}
        height={36}
        className="site-brand__mark"
      />
      <span className="site-brand__type">
        <span className="site-brand__name">VEXIM</span>
        <span className="site-brand__sub">GLOBAL</span>
      </span>
    </a>
  );
}
