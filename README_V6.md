> **LƯU Ý:** Hướng dẫn này dành cho V6.0. Từ **V6.1**, phiếu được ghi ngay khi xác nhận cảm xúc, không được đổi/hủy; game chỉ để giải trí. Xem [README_V6_1.md](README_V6_1.md).

# E-TDP V6.0 — Vượt ải tổ trưởng

## Điểm mới

Thay minigame **bắn bóng** trong V5.4 bằng **Vượt ải tổ trưởng — Hành trình một tờ giấy**.

- Có bốn mức trải nghiệm và bốn nhân vật ông lớn tuổi hoạt hình tương ứng; nhân vật không mô phỏng người thật.
- Mức 1: con đường thuận lợi, không chướng ngại. Mức 2: 1 chướng ngại. Mức 3: 2 chướng ngại. Mức 4: 3 chướng ngại và thời tiết mưa. Độ khó chỉ tạo sắc thái vui nhộn, không ngăn người dùng đánh giá.
- Nhấn **Bắt đầu vượt ải** rồi chạm vào game, bấm **Nhảy**, hoặc phím **Space / ↑** để giúp tờ giấy vượt vật cản. Khi tờ giấy đến điểm tiếp nhận, game gọi API bình chọn hiện hữu của E-TDP.
- Nút **Đánh giá nhanh, không chơi** vẫn có để hỗ trợ người dùng không thuận tiện chơi game.
- Chơi lại cùng mức không làm tăng phiếu; đổi mức dùng cơ chế cập nhật phiếu duy nhất trong PostgreSQL.
- Bình luận ẩn danh chỉ mở khi người dùng đã có phiếu. Bình luận tiếp tục chờ quản trị duyệt.
- Giao diện game thích ứng màn hình nhỏ; tiết giảm hoạt họa để tránh giật trên điện thoại.

## File thay đổi từ V5.4

1. `static/game.js` — thay toàn bộ minigame, giữ API JavaScript `window.TDPGame` nhưng thay phương thức thành `start`, `jump`, `setLevel`.
2. `static/app.js` — giao diện hồ sơ, nút điều khiển và kết nối gửi phiếu sau khi tới đích; thẻ phiên bản **E-TDP v6.0**.
3. `static/style.css` — CSS game mới và responsive.
4. `static/index.html` — đổi query version tệp tĩnh thành `v=6.0.1` để trình duyệt tải bản mới.

**Không cần chỉnh** `app.py`, `vercel.json`, `DATABASE_URL`, `ADMIN_PASSWORD`, các bảng Supabase hay dữ liệu 126 tổ trưởng.

## Cập nhật GitHub / Vercel

1. Sao lưu hoặc tạo branch/tag của bản V5.4 hiện hành.
2. Giải nén ZIP **bản cập nhật**; sao chép nguyên cấu trúc `static/` để ghi đè chính xác 4 file trên. Không đẩy nguyên ZIP vào repository.
3. Commit với mô tả `E-TDP V6: Vuot ai to truong` và Push nhánh `main`.
4. Trong Vercel → Deployments, chờ bản mới nhất trở thành **Ready**. Không Redeploy commit cũ.
5. Mở website (cửa sổ riêng tư hoặc Ctrl+Shift+R), kiểm tra thanh trên cùng có **E-TDP v6.0**.
6. Tìm một tổ trưởng → chọn mức trải nghiệm → **Bắt đầu vượt ải**. Sau khi giấy đến nơi, kiểm tra thông báo và số phiếu trong Supabase.

## Kiểm thử đã thực hiện

- `node --check` với hai file JavaScript.
- `python -m py_compile app.py`.
- Chromium giả lập với API thử nghiệm, giao diện desktop 1440px và Android 390px.
- Đã thử hoàn thành hành trình, ghi phiếu, chơi lại không tăng phiếu, đổi mức, gửi đánh giá nhanh và mở form bình luận sau khi đã có phiếu.

**Phạm vi:** Kiểm thử với API giả lập. Chưa chạy trực tiếp trên website Production hoặc Supabase riêng của người sử dụng.

## Lưu ý

Đây là trò chơi minh họa, không phản ánh diện mạo hoặc tính cách thực tế của bất kỳ tổ trưởng nào. Mọi đánh giá mang tính chủ quan. Phiên ẩn danh không bảo đảm xác thực một người duy nhất; nên bổ sung chống bot và kiểm soát lạm dụng trước khi mở rộng công khai.
