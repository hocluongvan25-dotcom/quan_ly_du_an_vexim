import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "light" | "outlineLight" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "focus-ring inline-flex items-center justify-center gap-2 border font-sans font-medium transition-colors duration-150";

const variants: Record<Variant, string> = {
  primary: "border-brand-900 bg-brand-900 text-white hover:border-brand-800 hover:bg-brand-800",
  secondary: "border-line-strong bg-transparent text-brand-900 hover:border-brand-900 hover:bg-brand-900 hover:text-white",
  light: "border-white bg-white text-brand-950 hover:bg-paper-deep hover:border-paper-deep",
  outlineLight: "border-white/35 bg-transparent text-white hover:border-white hover:bg-white/10",
  ghost: "border-transparent bg-transparent text-brand-800 hover:text-brand-950 hover:underline underline-offset-4",
};

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-2 text-[12px]",
  md: "px-5 py-3 text-[13px]",
  lg: "px-6 py-3.5 text-[14px]",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  rel,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  rel?: string;
  target?: string;
  "aria-label"?: string;
}) {
  return (
    <Link href={href} rel={rel} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}

export function ButtonAction({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
