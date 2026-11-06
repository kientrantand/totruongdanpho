# E-TDP V5.3 — Sửa bản đồ và khôi phục số điện thoại

- Bản đồ: chiếu cùng tỷ lệ 2 trục để giữ đúng hình dáng địa giới, tự tính khung nhìn theo ranh giới thực tế, sửa nhãn DOM không bị cắt và tránh chồng lấp; giảm chiều cao bản đồ trên màn hình ngắn.
- Quản trị: hiện cả số điện thoại chính và số phụ khi đã có dữ liệu trong Supabase. API công khai vẫn **không** cấp số điện thoại.
- Mã nguồn GitHub **không chứa số điện thoại cá nhân**. Không đẩy các tệp SQL/Excel riêng chứa số điện thoại lên GitHub.

## Khôi phục 126 số điện thoại

Mở **Quản trị → Danh sách tổ trưởng → Import Excel**, chọn tệp `Khoi_phuc_SDT_126_to_truong_E-TDP.xlsx` được cung cấp **riêng**, nhấn **Xem trước**, kiểm tra kết quả, sau đó **Xác nhận lưu**. Tệp có ID của từng người, 125 số chính hợp lệ và 5 số phụ; 1 số thiếu trong nguồn giữ trống để kiểm tra. Có thể dùng phương án SQL trong tài khoản Supabase để chỉ bổ sung những ô điện thoại còn trống, không thay dữ liệu khác.

Nếu bạn đã sửa tên/địa bàn ở Supabase sau lần nhập 126 người, ưu tiên phương án SQL để không ghi đè những chỉnh sửa đó.

Không phải thay DATABASE_URL, không tạo lại 126 tổ trưởng, không chạy lại SQL tạo bảng. Sao lưu PostgreSQL trước khi nhập dữ liệu quan trọng.
