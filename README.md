# E-TDP — Bản đồ 6 phường và đánh giá tổ trưởng dân phố (V6.0)

Ứng dụng Flask + Supabase PostgreSQL, triển khai trên Vercel. Giữ dữ liệu 126 tổ trưởng ban đầu, tra cứu bản đồ, danh sách theo phường, bảng xếp hạng, quản trị Excel, bình luận có kiểm duyệt và trò chơi **Vượt ải tổ trưởng**.

**Để nâng cấp từ V5.4:** xem [README_V6.md](README_V6.md). Chỉ cần cập nhật 4 file trong `static/`, không chạy lại SQL và không thay biến môi trường.

Với cài đặt mới, cần tạo bảng Supabase theo các file hướng dẫn SQL của phiên bản trước và thiết lập hai biến server-only `DATABASE_URL`, `ADMIN_PASSWORD`. Không đưa các biến này vào GitHub.

Dữ liệu thật và phiếu bình chọn được lưu ở Supabase, không nằm trong GitHub. File `data/to_truong_126.json` là dữ liệu nguồn ban đầu, không phải nơi lưu thay đổi thời gian thực. Bản chạy thử trên trình duyệt cần API/DB mới có thể ghi phiếu.
