import type { Metadata } from "next";
import { LegalPageView } from "@/components/site/LegalPageView";
import { COMPANY } from "@/lib/site/company";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng | Vexim Global",
  description:
    "Điều khoản sử dụng website Vexim Global: phạm vi thông tin, giới hạn trách nhiệm, quyền sở hữu trí tuệ và liên hệ.",
  alternates: { canonical: "/dieu-khoan-su-dung" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPageView
      title="Điều khoản sử dụng"
      lead="Điều khoản này quy định phạm vi sử dụng thông tin trên website vanhanh.veximglobal.com và trách nhiệm của các bên khi sử dụng chức năng tra cứu."
      updated="22/10/2026"
      crumb="Điều khoản sử dụng"
      sections={[
        {
          heading: "1. Phạm vi thông tin",
          paragraphs: [
            "Website giới thiệu dịch vụ tư vấn đăng ký xuất khẩu thực phẩm và cung cấp chức năng tra cứu hồ sơ do Vexim Global đăng ký hoặc quản lý.",
            "Thông tin trên website không phải là văn bản pháp luật và không thay thế hướng dẫn của cơ quan có thẩm quyền.",
          ],
        },
        {
          heading: "2. Vị trí pháp lý của Vexim Global",
          paragraphs: [
            `${COMPANY.name} là đơn vị tư vấn độc lập, không phải cơ quan nhà nước và không thuộc FDA hay GACC.`,
            "Kết quả tra cứu trên website không thay thế việc kiểm tra với FDA hoặc hệ thống CIFER của Hải quan Trung Quốc.",
            "Đăng ký cơ sở thực phẩm với FDA không đồng nghĩa với việc FDA chứng nhận hay phê duyệt sản phẩm.",
          ],
        },
        {
          heading: "3. Sử dụng thông tin tra cứu",
          paragraphs: [
            "Quý khách được sử dụng kết quả tra cứu để xác minh tình trạng hồ sơ của nhà cung cấp.",
            "Không được sử dụng thông tin trên website để mạo danh doanh nghiệp, gây nhầm lẫn về chứng nhận hoặc công bố không đúng về tình trạng đăng ký.",
          ],
        },
        {
          heading: "4. Quyền sở hữu trí tuệ",
          paragraphs: [
            "Nội dung, bố cục và mã nguồn của website thuộc quyền sử dụng của Vexim Global. Việc sao chép toàn bộ hoặc một phần cần có văn bản đồng ý.",
          ],
        },
        {
          heading: "5. Giới hạn trách nhiệm",
          paragraphs: [
            "Vexim Global duy trì dữ liệu hồ sơ và cập nhật khi có thay đổi. Trong trường hợp dữ liệu hiển thị chưa cập nhật, Quý khách liên hệ đường dây nóng để được xác nhận.",
            "Vexim Global không chịu trách nhiệm với quyết định giao dịch của Quý khách chỉ dựa trên kết quả tra cứu.",
          ],
        },
        {
          heading: "6. Liên kết ngoài",
          paragraphs: [
            "Website có thể đẫn tới trang của đơn vị khác. Vexim Global không kiểm soát nội dung và chính sách của các trang đó.",
          ],
        },
        {
          heading: "7. Luật áp dụng",
          paragraphs: ["Điều khoản này áp dụng theo pháp luật Việt Nam."],
        },
        {
          heading: "8. Liên hệ",
          paragraphs: [
            `Mọi câu hỏi về điều khoản, Quý khách liên hệ ${COMPANY.email} hoặc đường dây nóng ${COMPANY.phone}.`,
          ],
        },
      ]}
    />
  );
}
