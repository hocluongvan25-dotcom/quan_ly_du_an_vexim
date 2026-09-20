import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFFont, PageSizes, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { InvoiceView } from "./accounting";
import { PAYMENT_REQUEST_SIGNATURE_GAP_MM, paymentRequestParagraphs, requestDate, requestDocumentNo } from "./payment-request";

// Bundled licensed fonts: no browser, remote font fetch, or OS fonts needed at runtime.
let fontBytes: Promise<Buffer[]> | undefined;
const loadFonts = () => fontBytes ??= Promise.all([
  readFile(path.join(process.cwd(), "assets/fonts/Tinos-Regular.ttf")),
  readFile(path.join(process.cwd(), "assets/fonts/Tinos-Bold.ttf")),
  readFile(path.join(process.cwd(), "assets/fonts/Tinos-Italic.ttf")),
]);

export async function generatePaymentRequestPdf(inv: InvoiceView): Promise<Uint8Array> {
  if (!inv.payment_request) throw new Error("Chưa có thông tin đề nghị thanh toán.");
  const p = inv.payment_request;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const bytes = await loadFonts();
  // Full embedding avoids composite-glyph loss in Vietnamese when subsetting Tinos.
  const [regular, bold, italic] = await Promise.all(bytes.map(b => pdf.embedFont(b, { subset: false })));
  pdf.setTitle(`Giấy đề nghị thanh toán ${requestDocumentNo(inv)}`);
  pdf.setAuthor(p.issuer_name);
  pdf.setSubject(`Thanh toán đợt ${inv.installment_no} theo hợp đồng ${inv.contract_no}`);
  pdf.setLanguage("vi-VN");
  const [W, H] = PageSizes.A4;
  const mm = 72 / 25.4;
  const left = 30 * mm, right = W - 20 * mm, bottom = 20 * mm;
  const width = right - left;
  let page = pdf.addPage(PageSizes.A4);
  let y = H - 20 * mm;

  function lines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const out: string[] = []; let line = "";
    // Split overlong words too (contract references, bank names, etc.).
    for (const word of text.normalize("NFC").split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) { line = next; continue; }
      if (line) out.push(line);
      line = "";
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, size) > maxWidth) { out.push(line); line = ""; }
        line += char;
      }
    }
    if (line) out.push(line);
    return out;
  }
  function draw(text: string, x: number, at: number, font: PDFFont, size: number, centerWidth?: number) {
    page.drawText(text, { x: centerWidth ? x + (centerWidth - font.widthOfTextAtSize(text, size)) / 2 : x,
      y: at, font, size, color: rgb(0, 0, 0) });
  }
  function ensure(height: number) {
    if (y - height >= bottom) return;
    page = pdf.addPage(PageSizes.A4); y = H - 20 * mm;
    const header = lines(`Giấy đề nghị thanh toán • ${requestDocumentNo(inv)} (tiếp theo)`, italic, 10, width);
    for (const line of header) { draw(line, left, y, italic, 10); y -= 13; }
    y -= 12;
  }
  function paragraph(text: string, font = regular, size = 13, center = false, gap = 5) {
    const wrapped = lines(text, font, size, width);
    const leading = size * 1.3;
    // Keep ordinary paragraphs intact; exceptionally long ones may flow across pages.
    if (wrapped.length * leading + gap < H - 50 * mm) ensure(wrapped.length * leading + gap);
    for (const line of wrapped) { ensure(leading); draw(line, left, y, font, size, center ? width : undefined); y -= leading; }
    y -= gap;
  }

  const lw = width * .40, gap = 12, rw = width - lw - gap, rx = left + lw + gap;
  const issuer = lines(p.issuer_name.toUpperCase(), bold, 12, lw);
  const national = lines("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold, 12, rw);
  const top = y;
  issuer.forEach((line, i) => draw(line, left, top - i * 14, bold, 12, lw));
  national.forEach((line, i) => draw(line, rx, top - i * 14, bold, 12, rw));
  const sloganY = top - national.length * 15 - 3;
  draw("Độc lập – Tự do – Hạnh phúc", rx, sloganY, bold, 12, rw);
  page.drawLine({ start: { x: rx + rw * .18, y: sloganY - 6 }, end: { x: rx + rw * .82, y: sloganY - 6 }, thickness: .6 });
  let noY = top - issuer.length * 15 - 12;
  for (const line of lines(`Số: ${requestDocumentNo(inv)}`, regular, 12, lw)) { draw(line, left, noY, regular, 12, lw); noY -= 15; }
  const [year, month, day] = inv.issue_date.split("-");
  const dateLines = lines(`${p.city}, ngày ${day} tháng ${month} năm ${year}`, italic, 12, rw);
  let dateY = sloganY - 26;
  for (const line of dateLines) { draw(line, rx, dateY, italic, 12, rw); dateY -= 15; }
  y = Math.min(noY, dateY) - 19;
  paragraph("GIẤY ĐỀ NGHỊ THANH TOÁN", bold, 16, true, 6);
  paragraph(`V/v: Thanh toán lần ${inv.installment_no} theo hợp đồng số ${inv.contract_no} ngày ${requestDate(p.contract_date)}`, italic, 12, true, 12);
  for (const block of paymentRequestParagraphs(inv)) {
    paragraph(block.text, block.bold ? bold : block.italic ? italic : regular, 13, !!block.center);
  }

  const signWidth = width * .56, signX = right - signWidth;
  const companyLines = lines(p.issuer_name.toUpperCase(), bold, 11, signWidth);
  const titleLines = lines(p.signer_title.toUpperCase(), bold, 12, signWidth);
  const nameLines = lines(p.signer_name.toUpperCase(), bold, 12, signWidth);
  const signatureGap = PAYMENT_REQUEST_SIGNATURE_GAP_MM * mm;
  // Reserve the enlarged signing area before drawing, keeping the entire block together.
  const signHeight = (companyLines.length + titleLines.length + nameLines.length) * 15 + signatureGap + 8;
  ensure(signHeight); y -= 8;
  for (const line of [...companyLines, ...titleLines]) { draw(line, signX, y, bold, 11, signWidth); y -= 15; }
  draw("(Ký, ghi rõ họ tên, đóng dấu)", signX, y, italic, 10, signWidth); y -= signatureGap;
  for (const line of nameLines) { draw(line, signX, y, bold, 12, signWidth); y -= 15; }
  // No signature or seal is fabricated. A typed name is only a signing placeholder.
  const pages = pdf.getPages();
  pages.forEach((pg, i) => pg.drawText(`${i + 1}/${pages.length}`, { x: W / 2 - 8, y: 11 * mm, size: 10, font: regular }));
  return pdf.save();
}
