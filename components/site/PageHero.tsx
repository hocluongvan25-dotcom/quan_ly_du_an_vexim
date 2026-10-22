import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[11px] text-ink-400">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href ? (
              <Link href={item.href} className="focus-ring hover:text-brand-900 hover:underline underline-offset-4">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-500">
                {item.label}
              </span>
            )}
            {index < items.length - 1 ? <span className="text-line-strong">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
  crumbs,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  crumbs?: Crumb[];
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-line bg-paper">
      <div className="mx-auto max-w-site px-5 pb-12 pt-8 md:px-8 md:pb-16 md:pt-10">
        {crumbs ? <Breadcrumbs items={crumbs} /> : null}
        {eyebrow ? (
          <p className="mt-8 text-[10.5px] font-semibold uppercase tracking-label text-brass-600">{eyebrow}</p>
        ) : null}
        <h1 className="mt-4 max-w-4xl font-serif text-[31px] leading-[1.14] tracking-[-0.01em] text-brand-950 md:text-[44px]">
          {title}
        </h1>
        {lead ? <p className="mt-6 max-w-3xl text-[14px] leading-7 text-ink-500">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function ProseSection({
  title,
  eyebrow,
  children,
  id,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line py-12 first:border-t-0 md:py-14">
      {eyebrow ? (
        <p className="text-[10.5px] font-semibold uppercase tracking-label text-brass-600">{eyebrow}</p>
      ) : null}
      <h2 className="mt-3 font-serif text-[24px] leading-snug text-brand-950 md:text-[28px]">{title}</h2>
      <div className="mt-5 space-y-4 text-[14px] leading-7 text-ink-700">{children}</div>
    </section>
  );
}
