import { NextResponse } from "next/server";
import { verifyEmailConnection, sendEmail } from "@/lib/email";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden - admin only" }, { status: 403 });

    const verify = await verifyEmailConnection();

    return NextResponse.json({
      config: {
        host: process.env.ZOHO_SMTP_HOST || "smtp.zoho.com",
        port: process.env.ZOHO_SMTP_PORT || "465",
        user: process.env.ZOHO_SMTP_USER || process.env.ZOHO_FROM_EMAIL || "contact@veximglobal.com",
        from: process.env.ZOHO_FROM_EMAIL || "contact@veximglobal.com",
        to: process.env.ZOHO_TO_EMAIL || "contact@veximglobal.com",
        hasPassword: !!process.env.ZOHO_SMTP_PASS,
      },
      verify,
      instructions: {
        setup: [
          "1. Đăng nhập https://mail.zoho.com với contact@veximglobal.com",
          "2. My Account > Security > App Passwords > Generate new password cho SMTP",
          "3. Copy app password vào env ZOHO_SMTP_PASS",
          "4. Set env: ZOHO_SMTP_HOST=smtp.zoho.com, ZOHO_SMTP_PORT=465, ZOHO_SMTP_USER=contact@veximglobal.com, ZOHO_FROM_EMAIL=contact@veximglobal.com, ZOHO_TO_EMAIL=contact@veximglobal.com",
          "5. DNS: Thêm SPF TXT v=spf1 include:zoho.com ~all",
          "6. DNS: Thêm DKIM từ Zoho Admin Panel > Email Authentication",
          "7. Test lại endpoint này, nếu ok thì gửi test email",
        ],
        dns: {
          spf: "v=spf1 include:zoho.com ~all",
          dkim: "Tạo trong Zoho Mail Admin > Email Authentication > DKIM > Generate và thêm TXT record vào DNS",
          mx: "mx.zoho.com (10), mx2.zoho.com (20), mx3.zoho.com (50) - nếu chưa có",
        }
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const result = await sendEmail({
      to: process.env.ZOHO_TO_EMAIL || "contact@veximglobal.com",
      subject: "[Vexim Test] Zoho SMTP hoạt động - " + new Date().toLocaleString("vi-VN"),
      html: `
        <div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #e2e8f0; border-radius:16px">
          <h2 style="color:#0f172a">✅ Zoho Email Test Thành Công</h2>
          <p>Email <b>contact@veximglobal.com</b> đã được cấu hình đúng để gửi/nhận tự động.</p>
          <p>Thời gian test: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
          <p>SMTP: ${process.env.ZOHO_SMTP_HOST || "smtp.zoho.com"}:${process.env.ZOHO_SMTP_PORT || "465"}</p>
          <hr style="margin:16px 0; border:none; border-top:1px solid #e2e8f0"/>
          <p style="font-size:12px; color:#64748b">Hệ thống sẽ tự động gửi email khi có khách đăng ký tư vấn 2 dịch vụ:<br/>- Phòng Sale Xuất Khẩu Mỹ (veximtrade.com)<br/>- Vận Hành Amazon US (veximops.com)<br/>Dữ liệu đổ về: DB consultation_leads + Email contact@veximglobal.com + Dashboard /dashboard/leads</p>
        </div>
      `,
      text: "Zoho Email Test - contact@veximglobal.com hoạt động",
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
