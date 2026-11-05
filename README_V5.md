# V5.0 – Bản đồ 6 phường và Vote bắn bóng mềm

## Cập nhật từ V4

Giữ nguyên Supabase PostgreSQL và các bảng hiện có. Không chạy lại SQL, không import lại 126 tổ trưởng. Các file thay đổi: `app.py`, `static/index.html`, `static/app.js`, `static/style.css` và thêm `static/game.js`, `static/assets/mascots/mascot-{1..4}.svg`.

### Triển khai Vercel

1. Sao lưu mã nguồn V4, sau đó sao chép nội dung bộ V5 lên đúng gốc repository GitHub (không thêm thư mục lồng).
2. Commit và Push. Vercel tự build nếu đã nối GitHub; giữ framework Flask, root `./`.
3. Không thay `DATABASE_URL`, `ADMIN_PASSWORD` đã thiết lập trên Vercel.
4. Kiểm tra `/api/health` (dự kiến `ok=true`, `leaders=126`), trang chủ, tìm kiếm, trò chơi và bình luận.

### Luồng Vote

1. Chọn phường → gõ 2 ký tự trở lên → chọn tổ trưởng.
2. Chọn mức 1–4, kéo ngắm trên canvas và nhấn **BẮN BÓNG**.
3. Khi bóng mềm chạm mascot, frontend gọi `POST /api/vote`. Database lưu theo khóa duy nhất `(participant_id,leader_id)`, cập nhật phiếu cũ khi đổi mức; không cộng phiếu cho bóng sau.
4. Khi phiếu được lưu thành công, mở khung bình luận. Backend kiểm tra đã có phiếu trước khi nhận bình luận ẩn danh; bình luận chờ duyệt.

### Lưu ý

- Một phiên trình duyệt không tương đương một người thật; người dùng có thể thay thiết bị/xóa cookie. Để công khai rộng rãi nên bổ sung giới hạn tốc độ ở gateway, chống bot và cơ chế ngăn thao túng kết quả.
- Trò chơi có bắn bóng mềm vào nhân vật hoạt hình hư cấu, không phải người thật.
- Bản đồ GeoJSON lấy từ nguồn bên ngoài. Nếu tải thất bại vẫn có 6 nút chọn phường.
- Phông Be Vietnam Pro tải từ Google Fonts khi có Internet, fallback Segoe UI.
- Chưa cập nhật trực tiếp GitHub hay Vercel; bản này là mã nguồn sẵn để upload.
