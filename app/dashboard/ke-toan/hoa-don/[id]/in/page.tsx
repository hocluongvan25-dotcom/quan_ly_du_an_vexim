import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatMoney } from "@/lib/accounting";
import PrintButton from "@/components/accounting/PrintButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function numToWords(n: number): string {
  if (n === 0) return "Không đồng";
  const ones = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const units = ["", "nghìn", "triệu", "tỷ"];
  const three = (x: number): string => {
    const t = Math.floor(x / 100);
    const c = Math.floor((x % 100) / 10);
    const d = x % 10;
    let s = "";
    if (t > 0) s += `${ones[t]} trăm `;
    if (c > 1) {
      s += `${ones[c]} mươi `;
      if (d === 1) s += "mốt ";
      else if (d === 5) s += "lăm ";
      else if (d > 0) s += `${ones[d]} `;
    } else if (c === 1) {
      s += "mười ";
      if (d === 5) s += "lăm ";
      else if (d > 0) s += `${ones[d]} `;
    } else if (d > 0) {
      if (t > 0) s += "lẻ ";
      s += `${ones[d]} `;
    }
    return s;
  };
  let out = "";
  let u = 0;
  let x = Math.round(n);
  while (x > 0) {
    const part = x % 1000;
    if (part > 0) out = `${three(part)}${units[u]} ${out}`;
    x = Math.floor(x / 1000);
    u++;
  }
  out = out.trim().replace(/\s+/g, " ");
  return out.charAt(0).toUpperCase() + out.slice(1) + " đồng";
}

export default async function PrintInvoicePage({ params }: { params: { id: string } }) {
  const user = getSession();
  if (!user || user.role !== "admin") notFound();
  const inv: any = await getInvoice(Number(params.id));
  if (!inv) notFound();

  return (
    <div className="mx-auto max-w-[800px]">
      <div className="mb-4 flex gap-2 print:hidden">
        <Link href={`/dashboard/ke-toan/hoa-don/${inv.id}`} className="rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-sm">
          ← Quay lại
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-card print:rounded-none print:shadow-none">
        <div className="text-center">
          <div className="font-display text-xl font-extrabold">CÔNG TY VEXIM</div>
          <div className="mt-3 font-display text-2xl font-extrabold tracking-wide">HÓA ĐƠN THANH TOÁN</div>
          <div className="mt-1 font-mono text-sm font-bold text-slate-500">Số: {inv.invoice_no}</div>
        </div>

        <div className="mt-6 grid gap-1 text-sm">
          <div><b>Nội dung:</b> {inv.title || `Thanh toán đợt ${inv.installment_no}`}</div>
          <div><b>Ngày xuất:</b> {inv.issue_date} &nbsp;&nbsp; <b>Hạn thanh toán:</b> {inv.due_date || "—"}</div>
        </div>

        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y-2 border-navy-900">
              <th className="py-2 text-left">STT</th>
              <th className="py-2 text-left">Nội dung</th>
              <th className="py-2 text-right">Số tiền (₫)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-3">1</td>
              <td className="py-3">{inv.title || `Thanh toán đợt ${inv.installment_no}`}</td>
              <td className="py-3 text-right">{inv.subtotal.toLocaleString("vi-VN")}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-2" colSpan={2}>VAT ({inv.vat_rate}%)</td>
              <td className="py-2 text-right">{inv.vat_amount.toLocaleString("vi-VN")}</td>
            </tr>
            <tr>
              <td className="py-3 font-extrabold" colSpan={2}>TỔNG CỘNG</td>
              <td className="py-3 text-right font-extrabold">{inv.total.toLocaleString("vi-VN")}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-2 text-sm">
          <b>Số tiền bằng chữ:</b> <i>{numToWords(inv.total)}</i>
        </div>
        <div className="mt-1 text-sm">
          <b>Đã thu:</b> {formatMoney(inv.paid_amount)} &nbsp;·&nbsp; <b>Còn lại:</b> {formatMoney(inv.remaining)}
        </div>
        {inv.notes && <div className="mt-1 text-sm"><b>Ghi chú:</b> {inv.notes}</div>}

        <div className="mt-10 grid grid-cols-2 text-center text-sm">
          <div>
            <div className="font-bold">Người lập</div>
            <div className="mt-16 font-bold">{user.name}</div>
          </div>
          <div>
            <div className="font-bold">Khách hàng</div>
            <div className="mt-16 text-slate-400">(Ký & ghi rõ họ tên)</div>
          </div>
        </div>
      </div>

      <style>{`@media print { @page { size: A4; margin: 12mm; } }`}</style>
    </div>
  );
}
