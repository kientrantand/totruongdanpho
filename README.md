# E-TDP V6.1 — Bản đồ 6 phường, tra cứu và bình chọn tổ trưởng dân phố

Website Flask + Supabase PostgreSQL triển khai trên Vercel, gồm bản đồ tra cứu, kết quả xếp hạng, số liên hệ, nhập Excel quản trị, bình luận ẩn danh cần duyệt và mini-game **Vượt ải tổ trưởng**.

**Quan trọng nhất ở V6.1:** người dùng chọn mức trải nghiệm → thấy bước xác nhận → bấm **Xác nhận và khóa đánh giá**. Hệ thống ghi một phiếu ngay, không cho đổi mức hay hủy. Game chỉ để giải trí, chơi lại không phát sinh phiếu. [Đọc hướng dẫn cập nhật V6.1](README_V6_1.md).

Phiếu và danh sách tổ trưởng hoạt động được lưu trên Supabase, **không** lưu trong GitHub. Bạn không cần chạy SQL mới nếu nâng cấp trực tiếp từ V6.0. Biến máy chủ `DATABASE_URL` và `ADMIN_PASSWORD` được cấu hình riêng trên Vercel, không đưa vào repository.

Mỗi phiếu được khóa theo **phiên trình duyệt ẩn danh**. Việc xóa cookie, đổi trình duyệt hoặc thiết bị có thể tạo phiên khác, vì vậy không thể bảo đảm một người thật chỉ có một phiếu. Các nhận xét công khai là quan điểm cá nhân, không phải kết luận về tổ trưởng.
