import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getInvoice } from "@/lib/db";
import { assertPaymentRequestExportable, paymentRequestParagraphs, requestDate, requestDocumentNo } from "@/lib/payment-request";
import PaymentRequestDownload from "@/components/accounting/PaymentRequestDownload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PaymentRequestPage({ params }: { params: { id: string } }) {
  const user = getSession();
  if (!user || user.role !== "admin") notFound();
  const inv = await getInvoice(Number(params.id));
  if (!inv) notFound();
  let error = "";
  try { assertPaymentRequestExportable(inv); } catch (e) { error = (e as Error).message; }
  const p = inv.payment_request;
  const [year, month, day] = inv.issue_date.split("-");
  return <div className="mx-auto max-w-4xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link className="text-sm font-bold text-teal-700" href={`/dashboard/ke-toan/hoa-don/${inv.id}`}>← Về hóa đơn</Link>
      {!error && <PaymentRequestDownload id={inv.id} />}
    </div>
    {error ? <div role="alert" className="rounded-2xl bg-amber-50 p-5 text-sm">{error}</div> : p && <>
      <p className="text-xs text-slate-500">Bản xem nội dung. Tải PDF để nhận văn bản A4 đã dàn trang, nhúng phông tiếng Việt. Nếu đã thu một phần, đề nghị chỉ ghi số còn phải thu tại thời điểm xuất. Kiểm tra thông tin trước khi gửi khách.</p>
      <article className="break-words rounded-sm bg-white px-5 py-8 text-[16px] leading-relaxed text-black shadow-card sm:px-12 sm:py-12" style={{ fontFamily: '"Times New Roman", Times, serif', overflowWrap: "anywhere" }}>
        <header className="grid gap-6 text-center sm:grid-cols-[2fr_3fr]">
          <div><p className="font-bold uppercase">{p.issuer_name}</p><p className="mt-3">Số: {requestDocumentNo(inv)}</p></div>
          <div><p className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p><p className="font-bold underline underline-offset-8">Độc lập – Tự do – Hạnh phúc</p><p className="mt-5 italic">{p.city}, ngày {day} tháng {month} năm {year}</p></div>
        </header>
        <h1 className="mt-8 text-center text-xl font-bold">GIẤY ĐỀ NGHỊ THANH TOÁN</h1>
        <p className="mb-6 mt-2 text-center italic">V/v: Thanh toán lần {inv.installment_no} theo hợp đồng số {inv.contract_no} ngày {requestDate(p.contract_date)}</p>
        {paymentRequestParagraphs(inv).map((block, i) => <p key={i} className="mb-3" style={{ fontWeight: block.bold ? "bold" : undefined, fontStyle: block.italic ? "italic" : undefined, textAlign: block.center ? "center" : undefined }}>{block.text}</p>)}
        <div className="ml-auto mt-6 w-full text-center sm:w-3/5">
          <p className="font-bold uppercase">{p.issuer_name}</p><p className="font-bold uppercase">{p.signer_title}</p><p className="text-sm italic">(Ký, ghi rõ họ tên, đóng dấu)</p><p className="mt-16 font-bold uppercase">{p.signer_name}</p>
        </div>
      </article>
    </>}
  </div>;
}
