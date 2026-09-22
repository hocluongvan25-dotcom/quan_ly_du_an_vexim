import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFFont, PDFPage, PageSizes, rgb, type PDFImage, type RGB } from "pdf-lib";
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

/* Bảng màu thương hiệu: xanh navy chủ đạo, điểm xuyết vàng đồng sang trọng. */
const NAVY = rgb(0.043, 0.094, 0.216);          // #0B1837 — dải nhận diện, chữ tiêu đề, khối tổng
const NAVY_DEEP = rgb(0.024, 0.055, 0.137);     // #060E23 — nền khối tổng cộng
const INK = rgb(0.075, 0.118, 0.235);           // #131E3C — chữ nội dung
const GOLD = rgb(0.788, 0.612, 0.145);          // #C99C25 — điểm nhấn vàng đồng
const GOLD_DEEP = rgb(0.514, 0.396, 0.075);     // #836514 — chữ vàng đậm trên nền sáng
const GOLD_LIGHT = rgb(0.949, 0.855, 0.588);    // #F2DA96 — chữ vàng trên nền navy
const IVORY = rgb(0.973, 0.957, 0.925);         // #F8F4EC — dải phụ
const NAVY_TINT = rgb(0.949, 0.961, 0.980);     // #F2F5FA — dòng kẻ chẵn
const GREY = rgb(0.42, 0.45, 0.52);
const LINE_GREY = rgb(0.85, 0.87, 0.91);
const WHITE = rgb(1, 1, 1);

// Giữ tên cũ để phần thân file không phải đổi hết, nhưng trỏ về bảng màu mới.
const BRAND_DARK = NAVY;
const BRAND_GOLD = GOLD;
const BRAND_LIGHT = NAVY_TINT;

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

/** Đọc file trong assets/quote (thử thư mục làm việc rồi tới thư mục module). */
async function readAsset(file: string): Promise<Buffer> {
  const candidates = [path.join(process.cwd(), "assets/quote", file)];
  if (typeof __dirname === "string") candidates.push(path.join(__dirname, "..", "assets", "quote", file));
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

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

/**
 * Tỉ lệ 3 cột của dải "Thông tin thanh toán": đơn vị thụ hưởng | số tài khoản | ngân hàng.
 * Chữ ký bên Vexim Global được canh theo cột NGÂN HÀNG (cột cuối) để nằm thẳng dưới cột đó và
 * trải ra tận lề ngoài của trang.
 */
const PAYMENT_COL_RATIOS = [0.52, 0.2, 0.28];
const sumRatios = (ratios: number[]) => ratios.reduce((total, value) => total + value, 0);

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
  logos!: { white: PDFImage; ink: PDFImage };
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
    // Logo wordmark "VeximGlobal" (bản trắng cho dải navy; bản mực cho nền sáng).
    const [wordmarkWhite, wordmarkInk] = await Promise.all([readAsset("logo-wordmark-white.png"), readAsset("logo-wordmark.png")]);
    this.logos = {
      white: await this.pdf.embedPng(wordmarkWhite),
      ink: await this.pdf.embedPng(wordmarkInk),
    };
    return this;
  }

  /** Vẽ logo wordmark với chiều cao cho trước, giữ đúng tỉ lệ gốc. */
  drawLogo(x: number, centerY: number, height: number, onNavy = true) {
    const logo = onNavy ? this.logos.white : this.logos.ink;
    const width = (logo.width / logo.height) * height;
    this.page.drawImage(logo, { x, y: centerY - height / 2, width, height });
    return width;
  }

  newPage(repeatHeader = true) {
    this.page = this.pdf.addPage(PageSizes.A4);
    this.y = this.H - 15 * this.mm;
    if (repeatHeader) {
      this.band(11 * this.mm);
      this.y -= 16;
    }
  }

  /**
   * Dải nhận diện thương hiệu ở đầu trang: nền navy, chỉ logo (không slogan),
   * một dòng kẻ vàng đồng mảnh phía dưới và bên phải là tiêu đề báo giá.
   */
  band(height: number, full = false) {
    this.page.drawRectangle({ x: 0, y: this.H - height, width: this.W, height, color: NAVY });
    this.page.drawRectangle({ x: 0, y: this.H - height, width: this.W, height: 1.6, color: GOLD });
    const centerY = this.H - height / 2;
    if (full) {
      // Logo lớn, đặt giữa dải; tiêu đề báo giá nằm bên phải (vẽ ở generateQuotePdf).
      this.drawLogo(this.left, centerY, 26);
      return;
    }
    const logoWidth = this.drawLogo(this.left, centerY, 12);
    const label = "BÁO GIÁ DỊCH VỤ";
    this.page.drawText(label, {
      x: this.right - this.fonts.bold.widthOfTextAtSize(label, 10),
      y: centerY - 3.5, font: this.fonts.bold, size: 10, color: GOLD_LIGHT,
    });
    void logoWidth;
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
      this.page.drawText(line, { x: drawX, y: this.y - size, font, size, color: options.color ?? INK });
      this.y -= leading;
    }
    if (options.gap) this.y -= options.gap;
  }

  sectionTitle(text: string, gapBefore = 8) {
    this.y -= gapBefore;
    // Chừa đủ chỗ cho tiêu đề + 2 dòng nội dung để tiêu đề không bị lạc ở cuối trang.
    this.ensure(46);
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
        this.page.drawRectangle({ x: this.left, y: top - height, width: this.width, height, color: IVORY });
        this.page.drawRectangle({ x: this.left, y: top - height, width: 2.5, height, color: GOLD });
        this.page.drawText("HẠNG MỤC TÙY CHỌN — chưa tính vào tổng, áp dụng khi Quý khách chọn thêm", {
          x: this.left + 8, y: top - height / 2 - 3, font: this.fonts.bold, size: 8.5, color: GOLD_DEEP,
        });
        this.y = top - height;
        return;
      }
      if (!item) return;
      if (index % 2 === 1) this.page.drawRectangle({ x: this.left, y: top - height, width: this.width, height, color: NAVY_TINT });
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
            this.page.drawText(line, { x: x + 5, y: lineY, font: this.fonts.regular, size, color: INK });
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
          this.page.drawText(text, { x: drawX, y: top - 13, font, size, color: i >= 4 ? INK : GREY });
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
    // Panel tạm tính: nền xanh navy rất nhạt, viền trái vàng đồng, đường kẻ mảnh phân dòng.
    const panelTop = this.y;
    const panelHeight = rows.length * 17 + 8;
    this.ensure(panelHeight + 4);
    this.page.drawRectangle({ x, y: panelTop - panelHeight, width: blockWidth, height: panelHeight, color: NAVY_TINT });
    this.page.drawRectangle({ x, y: panelTop - panelHeight, width: 2.5, height: panelHeight, color: GOLD });
    this.y = panelTop - 4;
    rows.forEach(([label, value], index) => {
      const top = this.y;
      this.page.drawText(label, { x: x + 10, y: top - 12, font: this.fonts.regular, size: 10, color: GREY });
      const valueWidth = this.fonts.bold.widthOfTextAtSize(value, 10);
      this.page.drawText(value, { x: x + blockWidth - 10 - valueWidth, y: top - 12, font: this.fonts.bold, size: 10, color: INK });
      if (index < rows.length - 1) {
        this.page.drawLine({
          start: { x: x + 10, y: top - 15.5 }, end: { x: x + blockWidth - 10, y: top - 15.5 },
          thickness: 0.4, color: rgb(0.83, 0.86, 0.91),
        });
      }
      this.y = top - 17;
    });
    this.ensure(28);
    const height = 24;
    this.page.drawRectangle({ x, y: this.y - height, width: blockWidth, height, color: NAVY_DEEP });
    this.page.drawRectangle({ x, y: this.y - height, width: 3, height, color: GOLD });
    this.page.drawText("TỔNG CỘNG (đã gồm VAT)", { x: x + 10, y: this.y - 16, font: this.fonts.bold, size: 10.5, color: WHITE });
    const totalText = formatMoney(quote.total);
    this.page.drawText(totalText, {
      x: x + blockWidth - 10 - this.fonts.bold.widthOfTextAtSize(totalText, 12),
      y: this.y - 17, font: this.fonts.bold, size: 12, color: GOLD_LIGHT,
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
      page.drawLine({
        start: { x: this.left, y: 14 * this.mm + 14 },
        end: { x: this.right, y: 14 * this.mm + 14 },
        thickness: 0.6,
        color: GOLD,
      });
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
    y: doc.H - 36,
    font: doc.fonts.bold, size: 16, color: WHITE,
  });
  const noText = `Số: ${quote.quote_no}`;
  doc.page.drawText(noText, {
    x: doc.right - doc.fonts.regular.widthOfTextAtSize(noText, 9.5),
    y: doc.H - 55,
    font: doc.fonts.regular, size: 9.5, color: GOLD_LIGHT,
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
  doc.page.drawRectangle({ x: doc.left, y: infoTop - 32, width: doc.width, height: 32, color: NAVY_TINT });
  doc.page.drawRectangle({ x: doc.left, y: infoTop - 32, width: 3, height: 32, color: GOLD });
  infoRows.forEach(([label, value], index) => {
    const x = doc.left + infoCol * index;
    doc.page.drawText(label.toUpperCase(), { x: x + 8, y: infoTop - 12, font: doc.fonts.bold, size: 7.5, color: GOLD_DEEP });
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

  /* ------------- Thông tin thanh toán (chỉ in khi còn đủ chỗ) ------------ */
  const bankRows: Array<[string, string, number]> = [
    ["Đơn vị thụ hưởng", QUOTE_DEFAULTS.issuer_name, PAYMENT_COL_RATIOS[0]],
    ["Số tài khoản", QUOTE_DEFAULTS.bank_account, PAYMENT_COL_RATIOS[1]],
    ["Ngân hàng", QUOTE_DEFAULTS.bank_name, PAYMENT_COL_RATIOS[2]],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string, number]>;
  const bankHeight = 32;
  // Còn đủ chỗ cho khối thanh toán + khối chữ ký thì mới in, tránh đẩy chữ ký sang trang mới.
  if (bankRows.length && doc.y - bankHeight - 150 >= doc.bottom) {
    doc.y -= 6;
    const bankTop = doc.y;
    doc.page.drawRectangle({ x: doc.left, y: bankTop - bankHeight, width: doc.width, height: bankHeight, color: NAVY_TINT });
    doc.page.drawRectangle({ x: doc.left, y: bankTop - bankHeight, width: 3, height: bankHeight, color: GOLD });
    let bankX = doc.left;
    for (const [label, value, ratio] of bankRows) {
      const colWidth = doc.width * ratio;
      const size = 9.5;
      // Thu nhỏ chữ nếu tên dài để không tràn sang cột bên cạnh.
      let text = value;
      while (doc.fonts.bold.widthOfTextAtSize(text, size) > colWidth - 18 && text.length > 8) {
        text = text.slice(0, -2);
      }
      if (text !== value) text = `${text.trimEnd()}…`;
      doc.page.drawText(label.toUpperCase(), { x: bankX + 8, y: bankTop - 12, font: doc.fonts.bold, size: 7.5, color: GOLD_DEEP });
      doc.page.drawText(text, { x: bankX + 8, y: bankTop - 25, font: doc.fonts.bold, size, color: INK });
      bankX += colWidth;
    }
    doc.y = bankTop - bankHeight;
  }

  /* ------------------------------ Chữ ký -------------------------------- */
  doc.y -= 14;
  doc.ensure(120);
  const [issueYear, issueMonth, issueDay] = quote.issue_date.split("-");
  doc.write(
    `${QUOTE_DEFAULTS.city}, ngày ${issueDay} tháng ${issueMonth} năm ${issueYear}`,
    { width: doc.width, align: "right", font: doc.fonts.italic, size: 9.5, color: INK }
  );
  doc.y -= 4;
  const signTop = doc.y;
  // Cột khách hàng: hết ở mốc cột "số tài khoản" để phần chữ ký Vexim nằm trọn dưới cột ngân hàng.
  const signWidth = doc.width * sumRatios([PAYMENT_COL_RATIOS[0]]) - 14;
  // Cột Vexim Global: bắt đầu đúng mốc cột "NGÂN HÀNG" của dải thanh toán, kéo dài ra lề ngoài.
  const signRightX = doc.left + doc.width * sumRatios([PAYMENT_COL_RATIOS[0], PAYMENT_COL_RATIOS[1]]);
  const signRightWidth = doc.right - signRightX;

  doc.page.drawText("ĐẠI DIỆN KHÁCH HÀNG", { x: doc.left, y: signTop - 12, font: doc.fonts.bold, size: 10, color: NAVY });
  doc.page.drawLine({ start: { x: doc.left, y: signTop - 15.5 }, end: { x: doc.left + 52, y: signTop - 15.5 }, thickness: 1.4, color: GOLD });
  doc.page.drawText("(Ký, ghi rõ họ tên, đóng dấu nếu có)", { x: doc.left, y: signTop - 24, font: doc.fonts.italic, size: 8.5, color: GREY });
  doc.page.drawText(
    "ĐẠI DIỆN VEXIM GLOBAL",
    { x: signRightX, y: signTop - 12, font: doc.fonts.bold, size: 10, color: NAVY }
  );
  doc.page.drawLine({ start: { x: signRightX, y: signTop - 15.5 }, end: { x: signRightX + 52, y: signTop - 15.5 }, thickness: 1.4, color: GOLD });
  doc.page.drawText(
    QUOTE_DEFAULTS.signer_title,
    { x: signRightX, y: signTop - 24, font: doc.fonts.bold, size: 8.5, color: GREY }
  );
  const lineY = signTop - 24 - 40;
  doc.page.drawLine({ start: { x: doc.left, y: lineY }, end: { x: doc.left + signWidth, y: lineY }, thickness: 0.5, color: LINE_GREY });
  // Gạch ký của Vexim kéo tới sát lề ngoài của trang.
  doc.page.drawLine({ start: { x: signRightX, y: lineY }, end: { x: signRightX + signRightWidth, y: lineY }, thickness: 0.5, color: LINE_GREY });
  doc.page.drawText(
    QUOTE_DEFAULTS.signer_name,
    { x: signRightX, y: lineY - 14, font: doc.fonts.bold, size: 11, color: BRAND_DARK }
  );
  doc.y = lineY - 24;

  doc.footer();
  return doc.pdf.save();
}
