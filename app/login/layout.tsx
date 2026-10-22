import type { Metadata } from "next";
import "../site.css";

/** Trang đăng nhập nội bộ: không cho công cụ tìm kiếm lập chỉ mục. */
export const metadata: Metadata = {
  title: "Đăng nhập nội bộ | Vexim Global",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
