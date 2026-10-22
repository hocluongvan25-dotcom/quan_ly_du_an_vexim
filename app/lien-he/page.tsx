import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/site/company";
import { serviceSummaries } from "@/lib/site/content";
import { PageShell } from "@/components/site/PageShell";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Liên hệ Vexim Global, tư vấn đăng ký FDA và GACC",
  description:
    "Liên hệ Vexim Global theo đường dây nóng 0373 685 634 hoặc email contact@veximglobal.com để được tư vấn đăng ký FDA, đăng ký GACC và gia hạn hồ sơ.",
  alternates: { canonical: "/lien-he" },
  robots: { index: true, follow: true },
};

type Props = { searchParams?: { "dich-vu"?: string | string[] } };

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default function ContactPage({ searchParams }: Props) {
  const requestedSlug = firstValue(searchParams?.["dich-vu"]);
  const requested = serviceSummaries("vi").find((service) => service.slug === requestedSlug);

  const mailSubject = requested
    ? `Yêu cầu tư vấn: ${requested.title}`
    : "Yêu cầu tư vấn đăng ký FDA, GACC";
  const mailBody = [
    "Kính gửi Vexim Global,",
    "",
    requested ? `Chúng tôi cần tư vấn dịch vụ: ${requested.title}.` : "Chúng tôi cần tư vấn dịch vụ đăng ký xuất khẩu thực phẩm.",
    "",
    "Tên doanh nghiệp:",
    "Mã số thuế:",
    "Sản phẩm xuất khẩu:",
    "Thị trường xuất khẩu:",
    "Điện thoại liên hệ:",
  ].join("\n");
  const mailto = `mailto:${COMPANY.email}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

  return (
    <PageShell lang="vi">
      <PageHero
        eyebrow="Liên hệ"
        title="Liên hệ Vexim Global"
        lead="Vexim Global tiếp nhận yêu cầu qua điện thoại và email trong giờ làm việc. Quý khách nêu rõ sản phẩm, thị trường xuất khẩu và tình trạng hồ sơ hiện tại để được hướng dẫn bước tiếp theo."
        crumbs={[{ label: "Vexim Global", href: "/" }, { label: "Liên hệ" }]}
      />

      <div className="mx-auto max-w-site px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-7">
            {requested ? (
              <div className="mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-brass-400 bg-brass-100/50 px-4 py-3">
                <span className="text-[10px] font-semibold uppercase tracking-label text-brass-700">
                  Dịch vụ Quý khách quan tâm
                </span>
                <span className="text-[13px] font-medium text-brand-950">{requested.title}</span>
              </div>
            ) : null}

            <h2 className="font-serif text-[24px] leading-snug text-brand-950 md:text-[28px]">
              Thông tin doanh nghiệp
            </h2>
            <dl className="mt-5 border-t border-line">
              <Row label="Tên doanh nghiệp" value={`${COMPANY.name} (${COMPANY.legalName})`} />
              {COMPANY.taxCode ? <Row label="Mã số thuế" value={COMPANY.taxCode} /> : null}
              <Row label="Địa chỉ" value={COMPANY.address} />
              <Row label="Đường dây nóng" value={COMPANY.phone} href={COMPANY.phoneHref} />
              <Row label="Email" value={COMPANY.email} href={`mailto:${COMPANY.email}`} />
              <Row label="Website chính" value={COMPANY.websiteLabel} href={COMPANY.website} external />
              <Row label="Giờ làm việc" value={COMPANY.hoursVi} />
            </dl>

            <h2 className="mt-12 font-serif text-[24px] leading-snug text-brand-950 md:text-[28px]">
              Quy trình tiếp nhận
            </h2>
            <ol className="mt-5 border-t border-line">
              <Step
                no="01"
                title="Tiếp nhận thông tin"
                body="Quý khách gửi sản phẩm, thị trường xuất khẩu và tình trạng hồ sơ hiện tại qua điện thoại hoặc email."
              />
              <Step
                no="02"
                title="Kiểm tra hồ sơ"
                body="Vexim Global kiểm tra loại đăng ký, thời hạn hiệu lực và các tài liệu còn thiếu."
              />
              <Step
                no="03"
                title="Báo giá và thực hiện"
                body="Vexim Global gửi báo giá, phạm vi công việc và thời gian xử lý dự kiến bằng văn bản trước khi thực hiện."
              />
            </ol>
          </div>

          <aside className="md:col-span-5">
            <div className="space-y-4 md:sticky md:top-28">
              <div className="border border-line bg-white p-6">
                <p className="text-[10px] font-semibold uppercase tracking-label text-brass-600">Gửi yêu cầu</p>
                <p className="mt-3 font-serif text-[20px] leading-snug text-brand-950">
                  Soạn email theo mẫu có sẵn
                </p>
                <p className="mt-2 text-[12.5px] leading-6 text-ink-500">
                  Bấm nút bên dưới để mở ứng dụng email với nội dung soạn trước. Quý khách điền thêm thông tin doanh
                  nghiệp.
                </p>
                <a
                  href={mailto}
                  className="focus-ring mt-4 inline-block border border-brand-900 bg-brand-900 px-5 py-3 text-[12.5px] font-medium text-white hover:border-brand-800 hover:bg-brand-800"
                >
                  Gửi email cho Vexim Global
                </a>
              </div>

              <div className="bg-brand-950 p-6 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-label text-brass-300">Đường dây nóng</p>
                <a href={COMPANY.phoneHref} className="focus-ring mt-2 block font-serif text-[26px] text-white hover:underline">
                  {COMPANY.phone}
                </a>
                <p className="mt-3 text-[11.5px] leading-6 text-brand-200/70">{COMPANY.hoursVi}</p>
              </div>

              <div className="border border-line bg-white p-6">
                <p className="text-[10px] font-semibold uppercase tracking-label text-brass-600">Hồ sơ cần chuẩn bị</p>
                <ul className="mt-3 space-y-2 text-[12.5px] leading-6 text-ink-600">
                  <li>Danh mục sản phẩm và mã HS đề xuất.</li>
                  <li>Giấy chứng nhận đăng ký doanh nghiệp.</li>
                  <li>Giấy chứng nhận cơ sở đủ điều kiện an toàn thực phẩm.</li>
                  <li>Thông tin U.S. Agent nếu đã chỉ định.</li>
                </ul>
                <Link
                  href="/cau-hoi-thuong-gap"
                  className="focus-ring mt-4 inline-block text-[12px] text-brand-800 underline-offset-4 hover:underline"
                >
                  Xem câu hỏi thường gặp
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

function Row({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-400 sm:pt-0.5">{label}</dt>
      <dd className="text-[13px] leading-6 text-ink-800 sm:col-span-2">
        {href ? (
          <a
            href={href}
            className="focus-ring text-brand-800 underline-offset-4 hover:underline"
            {...(external ? { rel: "noopener" } : {})}
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function Step({ no, title, body }: { no: string; title: string; body: string }) {
  return (
    <li className="grid grid-cols-[40px_1fr] gap-4 border-b border-line py-4">
      <span className="font-serif text-[13px] text-brass-600">{no}</span>
      <div>
        <p className="text-[13.5px] font-semibold text-brand-950">{title}</p>
        <p className="mt-1 text-[12.5px] leading-6 text-ink-500">{body}</p>
      </div>
    </li>
  );
}
