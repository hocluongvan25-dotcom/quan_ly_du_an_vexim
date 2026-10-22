import Link from "next/link";
import { COMPANY, SITE_URL } from "@/lib/site/company";
import { HOME_VI } from "@/lib/site/content";
import { faqById } from "@/lib/site/faq";
import type { ServiceDetail } from "@/lib/site/pages";
import { buildPageSchema } from "@/lib/site/schema";
import { JsonLd } from "./JsonLd";
import { PageShell } from "./PageShell";
import { PageHero } from "./PageHero";
import { FaqAccordion } from "./FaqAccordion";
import { ContactBanner } from "./ContactBanner";
import { ContentSections, DetailLayout, FactPanel } from "./DetailLayout";

export function ServicePageView({ service }: { service: ServiceDetail }) {
  const copy = HOME_VI;

  const schema = buildPageSchema({
    lang: "vi",
    path: service.path,
    title: service.meta.title,
    description: service.meta.description,
    crumbs: [
      { name: "Vexim Global", url: `${COMPANY.website}/` },
      { name: "Tra cứu mã FDA, GACC", url: `${SITE_URL}/` },
      { name: service.h1, url: `${SITE_URL}${service.path}` },
    ],
    faqIds: service.faqIds,
  });

  return (
    <PageShell lang="vi" schema={<JsonLd data={schema} />}>
      <PageHero
        eyebrow={service.eyebrow}
        title={service.h1}
        lead={service.lead}
        crumbs={[
          { label: "Vexim Global", href: "/" },
          { label: "Dịch vụ", href: "/#dich-vu" },
          { label: service.h1 },
        ]}
      />

      <DetailLayout
        aside={
          <>
            <FactPanel title="Thông tin dịch vụ" items={service.facts} />

            <div className="border border-line bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-label text-brass-600">
                {service.ctaTitle}
              </p>
              <p className="mt-2 text-[12.5px] leading-6 text-ink-500">{service.ctaBody}</p>
              <a
                href={`/lien-he?dich-vu=${service.slug}`}
                className="focus-ring mt-4 inline-block border border-brand-900 bg-brand-900 px-4 py-2.5 text-[12px] font-medium text-white hover:border-brand-800 hover:bg-brand-800"
              >
                Gửi yêu cầu tư vấn
              </a>
              <p className="mt-3 text-[11px] leading-5 text-ink-400">
                Hoặc gọi{" "}
                <a href={COMPANY.phoneHref} className="focus-ring text-brand-800 hover:underline">
                  {COMPANY.phone}
                </a>
              </p>
            </div>

            <div className="border border-line bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-label text-brass-600">Dịch vụ khác</p>
              <ul className="mt-3 space-y-2 text-[12.5px]">
                <li>
                  <Link href="/dich-vu/dang-ky-gacc" className="focus-ring text-brand-800 hover:underline underline-offset-4">
                    Đăng ký mã GACC
                  </Link>
                </li>
                <li>
                  <Link href="/dich-vu/dang-ky-fda" className="focus-ring text-brand-800 hover:underline underline-offset-4">
                    Đăng ký cơ sở thực phẩm với FDA
                  </Link>
                </li>
                <li>
                  <Link href="/dich-vu/niem-yet-vexim-trade" className="focus-ring text-brand-800 hover:underline underline-offset-4">
                    Niêm yết trên Vexim Trade
                  </Link>
                </li>
                <li>
                  <Link href="/dich-vu/thiet-ke-website" className="focus-ring text-brand-800 hover:underline underline-offset-4">
                    Thiết kế website xuất khẩu
                  </Link>
                </li>
              </ul>
            </div>
          </>
        }
      >
        <ContentSections sections={service.sections} />

        {service.faqIds.length ? (
          <section className="border-t border-line pt-8">
            <h2 className="font-serif text-[21px] leading-snug text-brand-950 md:text-[24px]">Câu hỏi liên quan</h2>
            <div className="mt-4">
              <FaqAccordion lang="vi" items={faqById(service.faqIds, "vi")} />
            </div>
          </section>
        ) : null}
      </DetailLayout>

      <ContactBanner lang="vi" copy={copy} />
    </PageShell>
  );
}
