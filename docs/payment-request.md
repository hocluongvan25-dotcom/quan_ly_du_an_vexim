# Giấy đề nghị thanh toán / PDF A4

## Luồng sử dụng

1. Admin/kế toán mở hồ sơ hoặc hợp đồng dịch vụ → Tạo hóa đơn.
2. Nhập số hợp đồng, ngày xuất và đợt thu. Phần **Giấy đề nghị thanh toán** bật mặc định cho hóa đơn mới; có thể bỏ chọn để tạo hóa đơn thông thường.
3. Kiểm tra công ty khách hàng/dịch vụ tự điền; bổ sung ngày ký hợp đồng thực tế và tổng giá trị **chưa VAT**. Ngày bắt đầu dịch vụ không được coi mặc nhiên là ngày ký. Giá trị hợp đồng dịch vụ được gợi ý từ hồ sơ và cần xác nhận là chưa VAT.
4. Nhập tỷ lệ đợt (vd. 50%) để tự tính tiền chưa VAT, hoặc để trống tỷ lệ và nhập số tiền trực tiếp. Server tính lại tiền theo tỷ lệ, VAT và tổng, không tin số tiền tổng do trình duyệt gửi.
5. Kiểm tra điều khoản, tên đơn vị, ngân hàng, số/tên tài khoản, nội dung chuyển khoản, chức danh và người ký. Các giá trị Vexim/MB là mặc định theo mẫu người dùng, không phải thông tin tài khoản được ngân hàng xác minh.
6. Tạo hóa đơn → nút **Tải đề nghị thanh toán PDF A4** trên thẻ hóa đơn hoặc trang chi tiết. Có trang xem nội dung trước khi tải. Form sửa hỗ trợ bổ sung giấy đề nghị cho hóa đơn cũ.

## Mapping / snapshot

- `invoices.contract_no`: số hợp đồng.
- `installment_no`, `issue_date`, `due_date`: đợt, ngày văn bản, hạn thanh toán.
- `subtotal`, `vat_rate`, `vat_amount`, `total`: số tiền hóa đơn; không lấy số tiền từ nội dung tự do.
- `payment_request`: snapshot JSON/JSONB cho số văn bản tùy chọn, tên khách hàng, dịch vụ, ngày ký, giá trị hợp đồng, tỷ lệ, điều khoản, tên đơn vị/địa danh, thông tin chuyển khoản và người ký.
- Số văn bản trống → `ĐNTT-[invoice_no]` (mỗi hóa đơn có số mặc định riêng, không tái sử dụng `01/CV-ĐNTT`). Có thể nhập số công văn theo sổ đơn vị.
- Nội dung chuyển khoản trống → ghép dịch vụ + đợt + số hợp đồng.
- Mọi dòng PDF dùng dữ liệu đã lưu. Sửa công ty/hợp đồng nguồn không thay đổi snapshot của hóa đơn; chỉ sửa trực tiếp hóa đơn mới đổi văn bản.
- **Ngoại lệ có chủ đích:** số đã thu/còn phải thu được lấy tại thời điểm xuất PDF. Đã thu một phần thì ghi tổng đợt, số đã thu, số còn phải trả; không đề nghị thu lại toàn bộ. Hóa đơn hủy/thu đủ không xuất được. File đã tải trước đó không tự cập nhật; tải lại sau khi ghi nhận thanh toán.
- Không lưu sẵn file PDF hoặc ảnh chữ ký trong DB. File được sinh từ snapshot khi tải, có `private, no-store`. Chưa có ký số; họ tên và khoảng trống là chỗ ký, không giả chữ ký/con dấu. Giấy đề nghị không thay thế hóa đơn điện tử thuế.

## Dàn trang và quyền

A4 đứng, lề trái 30 mm, phải/trên/dưới 20 mm, nội dung 13 pt, phông Tinos tương thích kích thước Times New Roman được nhúng đủ tiếng Việt. Quốc hiệu/tiêu ngữ, đơn vị/số, địa danh/ngày, tiêu đề, căn cứ/nội dung, chuyển khoản và khối ký. Mẫu thông thường một trang; nội dung dài tự ngắt dòng/chuyển trang và đánh số trang, khối ký không bị tách đôi. Không cam kết đây là mẫu bắt buộc pháp lý cho mọi doanh nghiệp.

Quyền hóa đơn hiện tại được giữ nguyên: admin mới tạo/sửa/xem/xuất; nhân viên không được mở API xuất qua ID. Admin có thể tải file rồi chuyển cho nhân viên gửi khách. Nếu cần nhân viên tự tải trực tiếp, cần thiết kế phân quyền riêng, không mở toàn bộ dữ liệu kế toán.

## Triển khai

- SQLite tự thêm `contract_no` và `payment_request`; giữ nguyên tiền và chứng từ cũ. Hóa đơn cũ có `payment_request = null`, cần bổ sung trước khi xuất.
- **Supabase:** chạy `supabase/migrations/20260920_invoice_payment_request.sql` trước khi triển khai. Migration đã bao gồm cột `contract_no`; chạy lặp lại an toàn, không cập nhật tiền/công nợ.
- Mang theo `assets/fonts/` khi deploy. Next output tracing đã khai báo các TTF cho route PDF; kiểm tra artifact nếu dùng cấu hình đóng gói riêng.
- Không yêu cầu Chromium hay dịch vụ PDF bên ngoài. Dependencies runtime: `pdf-lib`, `@pdf-lib/fontkit`.

## Kiểm thử

`node --test tests/*.test.cjs`, `npx tsc --noEmit`, `npm run build`.

`tests/payment-request.test.cjs`: mẫu 28 triệu × 50% + VAT8% =15,12 triệu; snapshot; validation; sửa/tính lại; khóa tiền khi đã thu; thu một phần; export 401/403/404/409; file PDF A4/nhúng font; nội dung dài; Supabase mock (không phải kiểm thử DB Supabase thật).

Đặt biến `PAYMENT_REQUEST_SAMPLE_DIR` trỏ tới thư mục có sẵn ngoài Git để ghi PDF kiểm thử. Cần kiểm tra raster PDF ngoài việc trích text: text đúng không bảo đảm font hiển thị đầy đủ.
