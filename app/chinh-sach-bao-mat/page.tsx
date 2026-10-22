import type { Metadata } from "next";
import { LegalPageView } from "@/components/site/LegalPageView";
import { COMPANY } from "@/lib/site/company";

export const metadata: Metadata = {
  title: "Chính sách bảo mật | Vexim Global",
  description:
    "Chính sách bảo mật của Vexim Global: dữ liệu hiển thị khi tra cứu mã FDA, GACC, dữ liệu tiếp nhận khi liên hệ, thời gian lưu trữ và quyền của khách hàng.",
  alternates: { canonical: "/chinh-sach-bao-mat" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPageView
      title="Chính sách bảo mật"
      lead="Chính sách này giải thích dữ liệu Vexim Global hiển thị công khai khi Quý khách tra cứu mã đăng ký, dữ liệu tiếp nhận khi liên hệ và cách chúng tôi lưu trữ, bảo vệ dữ liệu đó."
      updated="22/10/2026"
      crumb="Chính sách bảo mật"
      sections={[
        {
          heading: "1. Phạm vi áp dụng",
          paragraphs: [
            "Chính sách áp dụng cho website vanhanh.veximglobal.com, gồm chức năng tra cứu công khai và hệ thống quản lý hồ sơ nội bộ dành cho nhân viên Vexim Global.",
            `Đơn vị quản lý dữ liệu là ${COMPANY.name}, địa chỉ ${COMPANY.address}.`,
          ],
        },
        {
          heading: "2. Dữ liệu hiển thị công khai khi tra cứu",
          paragraphs: [
            "Kết quả tra cứu chỉ hiển thị thông tin cần thiết để đối tác xác minh tình trạng hiệu lực của một hồ sơ.",
          ],
          bullets: [
            "Tên doanh nghiệp đăng ký hồ sơ.",
            "Loại đăng ký và số đăng ký đã ẩn các chữ số ở giữa.",
            "Tình trạng hiệu lực, ngày hết hạn hoặc kỳ gia hạn.",
            "Đơn vị quản lý hồ sơ và ngày cập nhật gần nhất.",
          ],
        },
        {
          heading: "3. Dữ liệu không hiển thị công khai",
          paragraphs: [
            "Hệ thống không hiển thị phí dịch vụ, số hợp đồng, tài liệu đính kèm và thông tin người liên hệ của doanh nghiệp trên trang tra cứu hoặc trang xác minh bằng mã QR.",
            "Thông tin đăng nhập của khách hàng trên cổng nội bộ chỉ dùng cho nhân viên Vexim Global và không xuất hiện trong dữ liệu công khai.",
          ],
        },
        {
          heading: "4. Dữ liệu tiếp nhận khi Quý khách liên hệ",
          paragraphs: [
            "Khi Quý khách gọi điện hoặc gửi email, Vexim Global ghi nhận tên, số điện thoại, email, tên doanh nghiệp và nội dung yêu cầu để phản hồi và thực hiện dịch vụ.",
            "Dữ liệu này không dùng cho mục đích khác và không bán cho bên thứ ba.",
          ],
        },
        {
          heading: "5. Lưu trữ và bảo mật",
          paragraphs: [
            "Hồ sơ được lưu trên hệ thống quản lý nội bộ có phân quyền theo vai trò. Chỉ nhân viên phụ trách mới truy cập được tài liệu của từng hồ sơ.",
            "Vexim Global chỉ chia sẻ dữ liệu cho cơ quan có thẩm quyền khi có yêu cầu theo quy định pháp luật, hoặc cho đơn vị cung cấp dịch vụ kỹ thuật vận hành hệ thống trong phạm vi cần thiết.",
          ],
        },
        {
          heading: "6. Thời gian lưu trữ",
          paragraphs: [
            "Hồ sơ được lưu trong thời hạn hợp đồng dịch vụ và thời hạn tiếp theo mà pháp luật về kế toán, thuế yêu cầu. Sau thời hạn đó, dữ liệu được xóa hoặc ẩn danh.",
          ],
        },
        {
          heading: "7. Quyền của Quý khách",
          paragraphs: [
            `Quý khách có thể yêu cầu xem, chỉnh sửa hoặc xóa dữ liệu liên hệ bằng cách gửi email tới ${COMPANY.email} hoặc gọi ${COMPANY.phone}.`,
            "Vexim Global phản hồi trong giờ làm việc và có thể đề nghị xác minh danh tính trước khi thực hiện yêu cầu.",
          ],
        },
        {
          heading: "8. Cookie",
          paragraphs: [
            "Website dùng cookie kỹ thuật cho phiên đăng nhập nội bộ và ghi nhớ ngôn ngữ hiển thị. Website không dùng cookie quảng cáo.",
          ],
        },
        {
          heading: "9. Thay đổi chính sách",
          paragraphs: [
            "Khi chính sách thay đổi, Vexim Global cập nhật nội dung trên trang này và ghi ngày cập nhật ở đầu trang.",
          ],
        },
      ]}
    />
  );
}
