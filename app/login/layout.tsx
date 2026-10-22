import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập nội bộ | Vexim Global",
  description: "Khu vực đăng nhập dành cho nhân viên Vexim Global.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
