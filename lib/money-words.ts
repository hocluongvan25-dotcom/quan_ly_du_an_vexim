/* ============================================================================
 * ĐỌC SỐ TIỀN THÀNH CHỮ (tiếng Việt) — dùng chung cho hóa đơn & báo giá
 * Quy tắc: "mười/mươi/mốt/lăm/lẻ", đọc đủ "không trăm linh" cho nhóm không
 * phải nhóm cao nhất. Hỗ trợ tới hàng triệu tỷ.
 * ========================================================================== */

const ONES = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const GROUP_UNITS = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

/** Đọc một nhóm 3 chữ số (0–999). `full` = nhóm không phải cao nhất → đọc cả hàng trăm. */
function readTriple(value: number, full: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  const parts: string[] = [];
  if (hundreds > 0 || full) parts.push(`${ONES[hundreds]} trăm`);
  if (tens > 1) {
    parts.push(`${ONES[tens]} mươi`);
    if (ones === 1) parts.push("mốt");
    else if (ones === 5) parts.push("lăm");
    else if (ones > 0) parts.push(ONES[ones]);
  } else if (tens === 1) {
    parts.push("mười");
    if (ones === 5) parts.push("lăm");
    else if (ones > 0) parts.push(ONES[ones]);
  } else if (ones > 0) {
    // 1.005 → "một nghìn không trăm lẻ năm"
    if (hundreds > 0 || full) parts.push("lẻ");
    parts.push(ONES[ones]);
  }
  return parts.join(" ");
}

/** 1250000 → "Một triệu hai trăm năm mươi nghìn" */
export function numberToVietnameseWords(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(Math.abs(value));
  if (rounded === 0) return "Không";
  const groups: number[] = [];
  let rest = rounded;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  if (groups.length > GROUP_UNITS.length) return "";
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group === 0) continue;
    const unit = GROUP_UNITS[i] ? ` ${GROUP_UNITS[i]}` : "";
    parts.push(`${readTriple(group, i < groups.length - 1)}${unit}`);
  }
  const words = parts.join(" ");
  return value < 0 ? `Âm ${words}` : words.charAt(0).toUpperCase() + words.slice(1);
}

/** 1250000 → "Một triệu hai trăm năm mươi nghìn đồng" */
export function moneyInWords(value: number): string {
  const words = numberToVietnameseWords(value);
  return words ? `${words} đồng` : "";
}
