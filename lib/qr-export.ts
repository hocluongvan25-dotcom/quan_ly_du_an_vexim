export const QR_EXPORT_SIZE = 900;
export const QR_MARGIN_MODULES = 4;
export const QR_LABEL_FONT_SIZE = 32;
export const QR_LABEL_FONT = `600 ${QR_LABEL_FONT_SIZE}px Arial, sans-serif`;

function escapeXml(text: string) {
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[char]!);
}

/** Keep the entire certificate number within the QR matrix, excluding its quiet zone. */
export function qrLabelLayout(moduleCount: number, measuredWidth: number) {
  if (!Number.isFinite(moduleCount) || moduleCount <= QR_MARGIN_MODULES * 2 ||
      !Number.isFinite(measuredWidth) || measuredWidth < 0) {
    throw new Error("Invalid QR export dimensions");
  }
  const maxWidth = QR_EXPORT_SIZE * (moduleCount - QR_MARGIN_MODULES * 2) / moduleCount;
  const scale = measuredWidth > maxWidth ? maxWidth / measuredWidth : 1;
  return { maxWidth, width: measuredWidth * scale, fontSize: QR_LABEL_FONT_SIZE * scale };
}

/** qrSvg is the internally generated QRCodeSVG markup, never user-supplied HTML. */
export function buildQrExport(qrSvg: string, label: string, moduleCount: number, measuredWidth: number) {
  const text = label.trim();
  const layout = qrLabelLayout(moduleCount, measuredWidth);
  const height = QR_EXPORT_SIZE + (text ? 64 : 0);
  const caption = text
    ? `<text x="${QR_EXPORT_SIZE / 2}" y="${QR_EXPORT_SIZE + 12 + layout.fontSize}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="600" font-size="${layout.fontSize}" fill="#000000"${layout.width > 0 ? ` textLength="${layout.width}" lengthAdjust="spacingAndGlyphs"` : ""}>${escapeXml(text)}</text>`
    : "";
  return {
    width: QR_EXPORT_SIZE,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_EXPORT_SIZE}" height="${height}" viewBox="0 0 ${QR_EXPORT_SIZE} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${qrSvg}${caption}</svg>`,
  };
}
