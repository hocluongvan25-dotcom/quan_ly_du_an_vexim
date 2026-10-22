import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, SITE_URL } from "@/lib/site/company";
import { FAQ_VI } from "@/lib/site/faq";
import { HOME_VI } from "@/lib/site/content";
import { buildPageSchema } from "@/lib/site/schema";
import { PageShell } from "@/components/site/PageShell";
import { PageHero } from "@/components/site/PageHero";
import { JsonLd } from "@/components/site/JsonLd";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { ContactBanner } from "@/components/site/ContactBanner";

export const metadata: Metadata = {
  title: "Câu hỏi thường gặp về mã FDA, mã GACC và gia hạn | Vexim Global",
  description:
    "Mười hai câu hỏi thường gặp về tra cứu mã FDA, mã GACC, kỳ gia hạn hai năm của FDA, U.S. Agent, Lệnh 280, hệ thống CIFER và thời hạn 5 năm của mã GACC.",
  alternates: { canonical: "/cau-hoi-thuong-gap" },
  openGraph: {
    type: "article",
    locale: "vi_VN",
    url: "/cau-hoi-thuong-gap",
    siteName: "Vexim Global",
    title: "Câu hỏi thường gặp về mã FDA, mã GACC | Vexim Global",
    description:
      "Tra cứu mã FDA, mã GACC, kỳ gia hạn, U.S. Agent, Lệnh 280 và hệ thống CIFER.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Câu hỏi thường gặp | Vexim Global" }],
  },
  robots: { index: true, follow: true },
};

const title = "Câu hỏi thường gặp về mã FDA, mã GACC và gia hạn | Vexim Global";
const description =
  "Mười hai câu hỏi thường gặp về tra cứu mã FDA, mã GACC, kỳ gia hạn hai năm của FDA, U.S. Agent, Lệnh 280, hệ thống CIFER và thời hạn 5 năm của mã GACC.";

export default function FaqPage() {
  const schema = buildPageSchema({
    lang: "vi",
    path: "/cau-hoi-thuong-gap",
    title,
    description,
    crumbs: [
      { name: "Vexim Global", url: `${COMPANY.website}/` },
      { name: "Tra cứu mã FDA, GACC", url: `${SITE_URL}/` },
      { name: "Câu hỏi thường gặp", url: `${SITE_URL}/cau-hoi-thuong-gap` },
    ],
    faqIds: FAQ_VI.map((item) => item.id),
  });

  return (
    <PageShell lang="vi" schema={<JsonLd data={schema} />}>
      <PageHero
        eyebrow="Hỏi đáp"
        title="Câu hỏi thường gặp về tra cứu mã FDA, mã GACC và gia hạn"
        lead="Nội dung câu trả lời dưới đây áp dụng cho hồ sơ do Vexim Global đăng ký hoặc quản lý. Trường hợp cụ thể, Quý khách liên hệ đường dây nóng để được kiểm tra."
        crumbs={[
          { label: "Vexim Global", href: "/" },
          { label: "Câu hỏi thường gặp" },
        ]}
      />

      <div className="mx-auto max-w-site px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-8">
            <h2 className="font-serif text-[24px] leading-snug text-brand-950 md:text-[28px]">
              Câu hỏi thường gặp
            </h2>
            <div className="mt-6">
              <FaqAccordion lang="vi" groupLabels />
            </div>
          </div>

          <aside className="md:col-span-4">
            <div className="space-y-6 md:sticky md:top-28">
              <div className="border border-line bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-label text-brass-600">Tra cứu nhanh</p>
                <ul className="mt-3 space-y-2 text-[12.5px]">
                  <li>
                    <Link href="/tra-cuu-ma-fda" className="focus-ring text-brand-800 hover:underline underline-offset-4">
                      Tra cứu mã FDA
                    </Link>
                  </li>
                  <li>
                    <Link href="/tra-cuu-ma-gacc" className="focus-ring text-brand-800 hover:underline underline-offset-4">
                      Tra cứu mã GACC
                    </Link>
                  </li>
                  <li>
                    <Link href="/dich-vu/dang-ky-fda" className="focus-ring text-brand-800 hover:underline underline-offset-4">
                      Đăng ký cơ sở thực phẩm với FDA
                    </Link>
                  </li>
                  <li>
                    <Link href="/dich-vu/dang-ky-gacc" className="focus-ring text-brand-800 hover:underline underline-offset-4">
                      Đăng ký mã GACC
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="border border-line bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-label text-brass-600">Liên hệ</p>
                <p className="mt-2 text-[12.5px] leading-6 text-ink-500">{COMPANY.address}</p>
                <p className="mt-2 text-[12.5px]">
                  <a href={COMPANY.phoneHref} className="focus-ring text-brand-800 hover:underline">
                    {COMPANY.phone}
                  </a>
                </p>
                <p className="text-[12.5px]">
                  <a href={`mailto:${COMPANY.email}`} className="focus-ring text-brand-800 hover:underline">
                    {COMPANY.email}
                  </a>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ContactBanner lang="vi" copy={HOME_VI} />
    </PageShell>
  );
}
