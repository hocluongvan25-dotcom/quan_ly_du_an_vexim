import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { SITE_URL } from "@/lib/site/company";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tra cứu mã FDA, đăng ký GACC xuất khẩu thực phẩm | Vexim Global",
    template: "%s",
  },
  description:
    "Tra cứu mã FDA, đăng ký GACC xuất khẩu thực phẩm. Xác minh mã đăng ký do Vexim Global quản lý, tư vấn đăng ký cơ sở thực phẩm FDA, đăng ký GACC theo Lệnh 280.",
  applicationName: "Vexim Global",
  icons: { icon: "/logo.svg", apple: "/logo.png" },
  openGraph: {
    type: "website",
    siteName: "Vexim Global",
    locale: "vi_VN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Tra cứu mã FDA, GACC | Vexim Global" }],
  },
  other: {
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get("x-pathname") || "";
  const lang = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "vi";

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
