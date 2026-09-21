import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFFont, PDFPage, PageSizes, rgb, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { COMPANY } from "./types";
import { formatMoney } from "./accounting";
import {
  QUOTE_DEFAULTS,
  quoteRefDate,
  type QuoteView,
} from "./quotes";
import { QUOTE_STRENGTHS } from "./quote-templates";
import type { QuoteLine } from "./quote-templates";

/* ============================================================================
 * XUẤT PDF BÁO GIÁ DỊCH VỤ — Vexim Global
 * Cùng bộ font Tinos đã bundle (đủ dấu tiếng Việt), không phụ thuộc font hệ thống.
 * ========================================================================== */

const BRAND_DARK = rgb(0.141, 0.094, 0.047); // #24180C
const BRAND_GOLD = rgb(0.788, 0.58, 0.094); // #C99418
const BRAND_LIGHT = rgb(0.984, 0.937, 0.827); // #FBEFD3
const GREY = rgb(0.42, 0.42, 0.42);
const LINE_GREY = rgb(0.82, 0.82, 0.82);
const WHITE = rgb(1, 1, 1);

/**
 * Font đi kèm repo (đủ dấu tiếng Việt). Thử theo thư mục làm việc rồi tới thư mục
 * của module để chạy được cả khi chạy test từ thư mục tạm.
 */
async function readFont(file: string): Promise<Buffer> {
  const candidates = [path.join(process.cwd(), "assets/fonts", file)];
  if (typeof __dirname === "string") candidates.push(path.join(__dirname, "..", "assets", "fonts", file));
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

let fontBytes: Promise<Buffer[]> | undefined;
const loadFonts = () => fontBytes ??= Promise.all([
  readFont("Tinos-Regular.ttf"),
  readFont("Tinos-Bold.ttf"),
  readFont("Tinos-Italic.ttf"),
]);

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

type TextOptions = {
  x?: number;
  width?: number;
  font?: PDFFont;
  size?: number;
  align?: "left" | "center" | "right";
  color?: RGB;
  gap?: number;
  indent?: number;
};

class QuotePdf {
  pdf!: PDFDocument;
  page!: PDFPage;
  y = 0;
  fonts!: Fonts;
  readonly mm = 72 / 25.4;
  readonly W = PageSizes.A4[0];
  readonly H = PageSizes.A4[1];
  readonly left = 18 * (72 / 25.4);
  readonly right = PageSizes.A4[0] - 15 * (72 / 25.4);
  readonly bottom = 22 * (72 / 25.4);
  readonly width = PageSizes.A4[0] - 33 * (72 / 25.4);

  async init() {
    this.pdf = await PDFDocument.create();
    this.pdf.registerFontkit(fontkit);
    const bytes = await loadFonts();
    // Full embedding avoids composite-glyph loss in Vietnamese when subsetting Tinos.
    const [regular, bold, italic] = await Promise.all(bytes.map((b) => this.pdf.embedFont(b, { subset: false })));
    this.fonts = { regular, bold, italic };
    return this;
  }

  newPage(repeatHeader = true) {
    this.page = this.pdf.addPage(PageSizes.A4);
    this.y = this.H - 15 * this.mm;
    if (repeatHeader) {
      this.band(11 * this.mm);
      this.y -= 16;
    }
  }

  /** Dải nhận diện thương hiệu ở đầu trang */
  band(height: number, full = false) {
    this.page.drawRectangle({ x: 0, y: this.H - height, width: this.W, height, color: BRAND_DARK });
    this.page.drawRectangle({ x: 0, y: this.H - height, width: this.W, height: 1.6, color: BRAND_GOLD });
    const baseline = this.H - height / 2 - (full ? 4 : 3);
    this.page.drawText("VEXIM GLOBAL", {
      x: this.left, y: baseline + (full ? 5 : 2), font: this.fonts.bold, size: full ? 17 : 11, color: WHITE,
    });
    this.page.drawText("Tận tâm · Nhanh chóng · Chính xác", {
      x: this.left, y: baseline - (full ? 7 : 6), font: this.fonts.italic, size: full ? 9.5 : 7.5, color: BRAND_GOLD,
    });
    if (!full) {
      const label = "BÁO GIÁ DỊCH VỤ";
      this.page.drawText(label, {
        x: this.right - this.fonts.bold.widthOfTextAtSize(label, 10),
        y: baseline, font: this.fonts.bold, size: 10, color: WHITE,
      });
      return;
    }
  }

  /** Ngắt trang khi không đủ chỗ cho `height` */
  ensure(height: number) {
    if (this.y - height >= this.bottom) return;
    this.newPage();
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const out: string[] = [];
    for (const paragraph of String(text).normalize("NFC").split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) {
          line = next;
          continue;
        }
        if (line) out.push(line);
        line = "";
        // Từ quá dài (mã số, email) → cắt theo ký tự
        for (const char of word) {
          if (line && font.widthOfTextAtSize(line + char, size) > maxWidth) {
            out.push(line);
            line = "";
          }
          line += char;
        }
      }
      out.push(line);
    }
    return out.length ? out : [""];
  }

  write(text: string, options: TextOptions = {}) {
    const font = options.font ?? this.fonts.regular;
    const size = options.size ?? 10;
    const width = options.width ?? this.width;
    const x = options.x ?? this.left;
    const align = options.align ?? "left";
    const offset = options.indent ?? 0;
    const drawWidth = Math.max(10, width - offset);
    const lines = this.wrap(text, font, size, drawWidth);
    const leading = size * 1.35;
    for (const line of lines) {
      this.ensure(leading);
      const lineWidth = font.widthOfTextAtSize(line, size);
      const drawX = align === "center" ? x + offset + (drawWidth - lineWidth) / 2
        : align === "right" ? x + offset + drawWidth - lineWidth
        : x + offset;
      this.page.drawText(line, { x: drawX, y: this.y - size, font, size, color: options.color ?? BRAND_DARK });
      this.y -= leading;
    }
    if (options.gap) this.y -= options.gap;
  }

  sectionTitle(text: string, gapBefore = 8) {
    this.y -= gapBefore;
    this.ensure(24);
    this.page.drawRectangle({ x: this.left, y: this.y - 15, width: 3, height: 13, color: BRAND_GOLD });
    this.page.drawText(text.toUpperCase(), {
      x: this.left + 8, y: this.y - 13, font: this.fonts.bold, size: 10, color: BRAND_DARK,
    });
    this.y -= 20;
  }

  /** Danh sách có số thứ tự; số và dòng đầu của nội dung luôn nằm cùng trang. */
  numbered(items: string[], gap = 4) {
    if (!items.length) return;
    const numberWidth = 16;
    items.forEach((item, index) => {
      this.ensure(2 * 13.5 + 4);
      this.write(`${index + 1}.`, { x: this.left, width: numberWidth, size: 10 });
      this.y += 13.5; // về lại dòng đầu để nội dung nằm ngang hàng số thứ tự
      this.write(item, { x: this.left, width: this.width, indent: numberWidth, size: 10 });
      this.y -= gap;
    });
  }

  bullets(items: string[], gap = 4) {
    if (!items.length) return;
    const bulletWidth = 14;
    for (const item of items) {
      this.ensure(2 * 13.5 + 4);
      this.write("•", { x: this.left, width: bulletWidth, size: 10, color: BRAND_GOLD });
      this.y += 13.5;
      this.write(item, { x: this.left, width: this.width, indent: bulletWidth, size: 10 });
      this.y -= gap;
    }
  }

  /** Bảng hạng mục báo giá */
  itemsTable(items: QuoteLine[]) {
    const cols = [
      { key: "stt", label: "STT", width: 10, align: "center" as const },
      { key: "name", label: "Nội dung", width: 71, align: "left" as const },
      { key: "unit", label: "ĐVT", width: 16, align: "center" as const },
      { key: "qty", label: "SL", width: 11, align: "center" as const },
      { key: "price", label: "Đơn giá (₫)", width: 32, align: "right" as const },
      { key: "amount", label: "Thành tiền (₫)", width: 35, align: "right" as const },
    ];
    const scale = this.width / 175;

    const header = () => {
      const height = 18;
      this.ensure(height + 6);
      this.page.drawRectangle({ x: this.left, y: this.y - height, width: this.width, height, color: BRAND_DARK });
      let x = this.left;
      for (const col of cols) {
        const w = col.width * scale;
        this.page.drawText(col.label, {
          x: x + (col.align === "right" ? w - 5 - this.fonts.bold.widthOfTextAtSize(col.label, 9) : col.align === "center" ? (w - this.fonts.bold.widthOfTextAtSize(col.label, 9)) / 2 : 5),
          y: this.y - 13, font: this.fonts.bold, size: 9, color: WHITE,
        });
        x += w;
      }
      this.y -= height;
    };

    const row = (item: QuoteLine | null, index: number, kind: "main" | "optional" | "caption") => {
      const size = 10;
      const nameWidth = (cols[1].width - 10) * scale;
      const nameLines = item ? this.wrap(item.name, this.fonts.regular, size, nameWidth) : [""];
      const noteLines = item?.note ? this.wrap(item.note, this.fonts.italic, 8, nameWidth) : [];
      const height = Math.max(20, nameLines.length * size * 1.3 + noteLines.length * 10 + 10);
      const pageBefore = this.pdf.getPageCount();
      this.ensure(height + 2);
      if (this.pdf.getPageCount() !== pageBefore) header();
      const top = this.y;
      if (kind === "caption") {
        this.page.drawRectangle({ x: this.left, y: top - height, width: this.width, height, color: BRAND_LIGHT });
        this.page.drawText("HẠNG MỤC TÙY CHỌN — chưa tính vào tổng, áp dụng khi Quý khách chọn thêm", {
          x: this.left + 5, y: top - height / 2 - 3, font: this.fonts.bold, size: 8.5, color: rgb(0.45, 0.31, 0.05),
        });
        this.y = top - height;
        return;
      }
      if (!item) return;
      if (index % 2 === 1) this.page.drawRectangle({ x: this.left, y: top - height, width: this.width, height, color: rgb(0.988, 0.98, 0.965) });
      const cells = [
        String(index + 1),
        "",
        item.unit,
        String(item.qty),
        formatMoney(item.unit_price),
        formatMoney(item.qty * item.unit_price),
      ];
      let x = this.left;
      cells.forEach((text, i) => {
        const col = cols[i];
        const w = col.width * scale;
        if (i === 1) {
          let lineY = top - 13;
          for (const line of nameLines) {
            this.page.drawText(line, { x: x + 5, y: lineY, font: this.fonts.regular, size, color: BRAND_DARK });
            lineY -= size * 1.3;
          }
          for (const line of noteLines) {
            this.page.drawText(line, { x: x + 5, y: lineY, font: this.fonts.italic, size: 8, color: GREY });
            lineY -= 10;
          }
        } else {
          const font = i >= 4 ? this.fonts.bold : this.fonts.regular;
          const textWidth = font.widthOfTextAtSize(text, size);
          const drawX = col.align === "right" ? x + w - 5 - textWidth
            : col.align === "center" ? x + (w - textWidth) / 2
            : x + 5;
          this.page.drawText(text, { x: drawX, y: top - 13, font, size, color: BRAND_DARK });
        }
        x += w;
      });
      this.page.drawLine({ start: { x: this.left, y: top - height }, end: { x: this.right, y: top - height }, thickness: 0.5, color: LINE_GREY });
      this.y = top - height;
    };

    header();
    const main = items.filter((i) => !i.optional);
    const optional = items.filter((i) => i.optional);
    main.forEach((item, index) => {
      if (this.y - 30 < this.bottom) header();
      row(item, index, "main");
    });
    if (optional.length) {
      if (this.y - 60 < this.bottom) header();
      row(null, 0, "caption");
      optional.forEach((item, index) => {
        if (this.y - 30 < this.bottom) header();
        row(item, index, "optional");
      });
    }
  }

  /** Khối tổng cộng (căn phải) */
  totalsBlock(quote: QuoteView) {
    const blockWidth = 96 * this.mm;
    const x = this.right - blockWidth;
    const rows: Array<[string, string]> = [
      ["Tạm tính (chưa VAT)", formatMoney(quote.subtotal)],
      ...(quote.discount_amount > 0
        ? [[`Chiết khấu ${quote.discount_percent}%`, `-${formatMoney(quote.discount_amount)}`] as [string, string]]
        : []),
      [`Thuế VAT ${quote.vat_rate}%`, formatMoney(quote.vat_amount)],
    ];
    this.y -= 6;
    for (const [label, value] of rows) {
      this.ensure(18);
      const top = this.y;
      this.page.drawText(label, { x: x + 8, y: top - 12, font: this.fonts.regular, size: 10, color: BRAND_DARK });
      const width = this.fonts.bold.widthOfTextAtSize(value, 10);
      this.page.drawText(value, { x: x + blockWidth - 8 - width, y: top - 12, font: this.fonts.bold, size: 10, color: BRAND_DARK });
      this.y = top - 16;
    }
    this.ensure(28);
    const height = 24;
    this.page.drawRectangle({ x, y: this.y - height, width: blockWidth, height, color: BRAND_DARK });
    this.page.drawText("TỔNG CỘNG (đã gồm VAT)", { x: x + 8, y: this.y - 16, font: this.fonts.bold, size: 10.5, color: WHITE });
    const totalText = formatMoney(quote.total);
    this.page.drawText(totalText, {
      x: x + blockWidth - 8 - this.fonts.bold.widthOfTextAtSize(totalText, 12),
      y: this.y - 17, font: this.fonts.bold, size: 12, color: BRAND_GOLD,
    });
    this.y -= height + 6;
    this.write(`Bằng chữ: ${quote.total_in_words}.`, { x, width: blockWidth, font: this.fonts.italic, size: 9, color: GREY });
    if (quote.optional_total > 0) {
      this.write(
        `Hạng mục tùy chọn (nếu chọn thêm): ${formatMoney(quote.optional_total)} ₫ (chưa gồm VAT).`,
        { x, width: blockWidth, font: this.fonts.italic, size: 9, color: GREY, gap: 2 }
      );
    }
  }

  footer() {
    const pages = this.pdf.getPages();
    pages.forEach((page, index) => {
      const text = `${COMPANY.legal} · ${COMPANY.address}`;
      page.drawText(text, { x: this.left, y: 14 * this.mm, font: this.fonts.regular, size: 7.5, color: GREY });
      page.drawText(
        `${COMPANY.phone} · ${COMPANY.email} · ${COMPANY.websiteLabel}`,
        { x: this.left, y: 14 * this.mm - 9, font: this.fonts.regular, size: 7.5, color: GREY }
      );
      const label = `Trang ${index + 1}/${pages.length}`;
      page.drawText(label, {
        x: this.right - this.fonts.regular.widthOfTextAtSize(label, 7.5),
        y: 14 * this.mm, font: this.fonts.regular, size: 7.5, color: GREY,
      });
    });
  }
}

export async function generateQuotePdf(quote: QuoteView): Promise<Uint8Array> {
  const doc = await new QuotePdf().init();
  doc.pdf.setTitle(`Báo giá ${quote.quote_no} — ${quote.company_name}`);
  doc.pdf.setAuthor(COMPANY.legal);
  doc.pdf.setSubject(`${quote.service_name} · ${quote.title}`);
  doc.pdf.setLanguage("vi-VN");

  /* ------------------------------- Trang 1 ------------------------------- */
  doc.newPage(false);
  doc.band(30 * doc.mm, true);
  // Tiêu đề trên dải nhận diện
  const heading = "BÁO GIÁ DỊCH VỤ";
  doc.page.drawText(heading, {
    x: doc.right - doc.fonts.bold.widthOfTextAtSize(heading, 16),
    y: doc.H - 38,
    font: doc.fonts.bold, size: 16, color: WHITE,
  });
  const noText = `Số: ${quote.quote_no}`;
  doc.page.drawText(noText, {
    x: doc.right - doc.fonts.regular.widthOfTextAtSize(noText, 9.5),
    y: doc.H - 56,
    font: doc.fonts.regular, size: 9.5, color: BRAND_GOLD,
  });
  doc.y = doc.H - 30 * doc.mm - 22;

  const columnWidth = (doc.width - 16) / 2;
  const rightX = doc.left + columnWidth + 16;
  const startY = doc.y;

  doc.write("ĐƠN VỊ BÁO GIÁ", { width: columnWidth, font: doc.fonts.bold, size: 9, color: BRAND_GOLD, gap: 2 });
  doc.write(COMPANY.legal, { width: columnWidth, font: doc.fonts.bold, size: 11 });
  doc.write(`Địa chỉ: ${COMPANY.address}`, { width: columnWidth, size: 9.5, gap: 1 });
  doc.write(`Điện thoại: ${COMPANY.phone}   ·   Email: ${COMPANY.email}`, { width: columnWidth, size: 9.5, gap: 1 });
  doc.write(`Website: ${COMPANY.websiteLabel}`, { width: columnWidth, size: 9.5 });
  const leftBottom = doc.y;

  doc.y = startY;
  doc.write("KÍNH GỬI QUÝ KHÁCH HÀNG", { x: rightX, width: columnWidth, font: doc.fonts.bold, size: 9, color: BRAND_GOLD, gap: 2 });
  doc.write(quote.company_name, { x: rightX, width: columnWidth, font: doc.fonts.bold, size: 11, gap: 1 });
  if (quote.company_address) doc.write(`Địa chỉ: ${quote.company_address}`, { x: rightX, width: columnWidth, size: 9.5, gap: 1 });
  if (quote.company_tax_code) doc.write(`Mã số thuế: ${quote.company_tax_code}`, { x: rightX, width: columnWidth, size: 9.5, gap: 1 });
  if (quote.contact_name) {
    doc.write(
      `Người liên hệ: ${quote.contact_name}${quote.contact_title ? ` — ${quote.contact_title}` : ""}`,
      { x: rightX, width: columnWidth, size: 9.5, gap: 1 }
    );
  }
  if (quote.contact_phone) doc.write(`Điện thoại: ${quote.contact_phone}`, { x: rightX, width: columnWidth, size: 9.5, gap: 1 });
  if (quote.contact_email) doc.write(`Email: ${quote.contact_email}`, { x: rightX, width: columnWidth, size: 9.5 });
  doc.y = Math.min(leftBottom, doc.y) - 10;

  // Dòng thông tin báo giá
  const infoRows: Array<[string, string]> = [
    ["Ngày báo giá", quoteRefDate(quote.issue_date)],
    ["Hiệu lực đến", quote.valid_until ? quoteRefDate(quote.valid_until) : "Theo bảng giá hiện hành"],
    ["Người lập báo giá", quote.created_by_name || "Vexim Global"],
  ];
  doc.y -= 4;
  doc.ensure(34);
  const infoTop = doc.y;
  const infoCol = doc.width / infoRows.length;
  // Nền trước, chữ sau — nhãn và giá trị nằm gọn trong dải nhấn.
  doc.page.drawRectangle({ x: doc.left, y: infoTop - 32, width: doc.width, height: 32, color: BRAND_LIGHT });
  doc.page.drawRectangle({ x: doc.left, y: infoTop - 32, width: 3, height: 32, color: BRAND_GOLD });
  infoRows.forEach(([label, value], index) => {
    const x = doc.left + infoCol * index;
    doc.page.drawText(label.toUpperCase(), { x: x + 8, y: infoTop - 12, font: doc.fonts.bold, size: 7.5, color: rgb(0.45, 0.35, 0.15) });
    doc.page.drawText(value, { x: x + 8, y: infoTop - 25, font: doc.fonts.bold, size: 10, color: BRAND_DARK });
  });
  doc.y = infoTop - 42;

  doc.write(quote.title, { width: doc.width, font: doc.fonts.bold, size: 13, align: "center", gap: 4 });
  doc.write(`Dịch vụ: ${quote.service_name}`, { width: doc.width, font: doc.fonts.italic, size: 9.5, align: "center", color: GREY, gap: 2 });

  doc.sectionTitle("Chi tiết báo giá");
  doc.itemsTable(quote.items);
  doc.totalsBlock(quote);

  if (quote.scope.length) {
    doc.sectionTitle("Phạm vi công việc");
    doc.numbered(quote.scope);
  }
  if (quote.timeline) {
    doc.sectionTitle("Tiến độ thực hiện");
    doc.write(quote.timeline);
  }
  if (quote.payment_terms) {
    doc.sectionTitle("Điều khoản thanh toán");
    doc.write(quote.payment_terms);
  }

  const terms = [...quote.terms];
  if (quote.valid_until) {
    terms.push(
      `Báo giá có hiệu lực đến hết ngày ${quoteRefDate(quote.valid_until)}. Sau thời hạn trên, Vexim Global xin phép gửi báo giá mới theo bảng giá hiện hành.`
    );
  }
  if (terms.length) {
    doc.sectionTitle("Điều khoản & lưu ý chung");
    doc.numbered(terms);
  }
  if (quote.documents.length) {
    doc.sectionTitle("Hồ sơ Quý khách cần cung cấp");
    doc.bullets(quote.documents);
  }
  if (quote.note) {
    doc.sectionTitle("Ghi chú");
    doc.write(quote.note);
  }
  // Giới thiệu năng lực ngắn — giúp trang cuối liền mạch, không còn khoảng trắng lớn.
  doc.sectionTitle("Vì sao chọn Vexim Global");
  doc.bullets(QUOTE_STRENGTHS);
  doc.y -= 2;
  doc.write(
    `Mọi thắc mắc về báo giá, Quý khách vui lòng liên hệ ${COMPANY.phone} hoặc ${COMPANY.email} để được giải đáp trong 24 giờ làm việc.`,
    { font: doc.fonts.italic, size: 9.5, color: GREY }
  );

  /* ------------------------------ Chữ ký -------------------------------- */
  doc.y -= 8;
  doc.ensure(120);
  const [issueYear, issueMonth, issueDay] = quote.issue_date.split("-");
  doc.write(
    `${QUOTE_DEFAULTS.city}, ngày ${issueDay} tháng ${issueMonth} năm ${issueYear}`,
    { width: doc.width, align: "right", font: doc.fonts.italic, size: 9.5, color: GREY }
  );
  doc.y -= 4;
  const signTop = doc.y;
  const signWidth = (doc.width - 20) / 2;
  const signRightX = doc.left + signWidth + 20;

  doc.page.drawText("ĐẠI DIỆN KHÁCH HÀNG", { x: doc.left, y: signTop - 12, font: doc.fonts.bold, size: 10, color: BRAND_DARK });
  doc.page.drawText("(Ký, ghi rõ họ tên, đóng dấu nếu có)", { x: doc.left, y: signTop - 24, font: doc.fonts.italic, size: 8.5, color: GREY });
  doc.page.drawText(
    "ĐẠI DIỆN VEXIM GLOBAL",
    { x: signRightX, y: signTop - 12, font: doc.fonts.bold, size: 10, color: BRAND_DARK }
  );
  doc.page.drawText(
    QUOTE_DEFAULTS.signer_title,
    { x: signRightX, y: signTop - 24, font: doc.fonts.bold, size: 8.5, color: GREY }
  );
  const lineY = signTop - 24 - 40;
  doc.page.drawLine({ start: { x: doc.left, y: lineY }, end: { x: doc.left + signWidth - 10, y: lineY }, thickness: 0.5, color: LINE_GREY });
  doc.page.drawLine({ start: { x: signRightX, y: lineY }, end: { x: signRightX + signWidth - 10, y: lineY }, thickness: 0.5, color: LINE_GREY });
  doc.page.drawText(
    QUOTE_DEFAULTS.signer_name,
    { x: signRightX, y: lineY - 14, font: doc.fonts.bold, size: 11, color: BRAND_DARK }
  );
  doc.y = lineY - 24;

  doc.footer();
  return doc.pdf.save();
}
