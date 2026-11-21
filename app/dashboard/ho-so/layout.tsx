import type { ReactNode } from "react";
import "./records.css";

/**
 * Nạp hệ thống giao diện riêng của trang hồ sơ (phong cách Apple) một lần cho
 * mọi đường dẫn con: danh sách, tạo mới và chi tiết.
 */
export default function RecordsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
