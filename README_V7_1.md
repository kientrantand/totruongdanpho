# E-TDP V7.1 — Font hệ thống Apple, đọc bình luận và phân quyền

Cơ sở phát triển: bản V7.0 Flask + Supabase PostgreSQL. **Không chạy lại SQL, không nhập lại danh sách tổ trưởng, không thay đổi biến DATABASE_URL/ADMIN_PASSWORD.**

## Các thay đổi

1. Font: dùng `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", "Helvetica Neue", Arial, sans-serif`. Trên máy Apple hệ thống sẽ dùng San Francisco; trên Windows/Android dùng font hệ thống tương ứng. Không chứa, nhúng, phát hành hoặc chuyển giao file font của Apple.
2. Hồ sơ tổ trưởng có nút **Đọc bình luận (N)** ngay phía trên; nhấn đưa tới phần văn bản bình luận, không phải tự cuộn qua trò chơi.
3. API bình luận: khách xem nội dung **đã duyệt** và bình luận riêng đang chờ của chính phiên mình. Quản trị xem **mọi trạng thái** (đã duyệt / chờ duyệt / ẩn / từ chối) ngay trong hồ sơ. Phần này không công bố danh tính người bình luận.
4. Quản trị viên có thể bình chọn một lần và bình luận như khách (cùng quy tắc khóa đánh giá); đồng thời thêm/sửa/import tổ trưởng, duyệt, ẩn, từ chối, xóa bình luận. Quyền này kiểm tra tại Flask API, không dựa vào việc ẩn hiện nút.
5. Mục quản trị vẫn chỉ hiển thị cho tài khoản quản trị. Khách chỉ tra cứu, gọi điện, đánh giá, chơi game, bình luận và báo cáo bình luận.

## Cập nhật GitHub/Vercel

Thay đúng 4 file, giữ đúng đường dẫn:

```
app.py
static/app.js
static/style.css
static/index.html
```

Giữ nguyên `vercel.json`, `requirements.txt`, `data/`, `static/game.js`, `static/assets/`, bí mật và Supabase.
Commit & Push nhánh main → Vercel Production Ready → Ctrl+Shift+R. Trang sẽ hiện **E-TDP v7.1**.

## Kiểm tra quyền và bình luận sau triển khai

- Mở một tổ trưởng có 3 bình luận được duyệt → nhấn **Đọc bình luận (3)** → đọc được văn bản của cả ba.
- Không cần đăng nhập để xem các bình luận đã duyệt. Bình luận mới người dùng gửi vẫn chỉ được công khai **sau khi quản trị duyệt**.
- Đăng nhập quản trị → mở hồ sơ của cùng tổ trưởng → thấy cả các bình luận chờ duyệt/ẩn/từ chối, có nút xử lý; hoặc vào mục Quản trị → Duyệt bình luận.
- Quản trị có thể đánh giá, xác nhận khóa một phiếu riêng và bình luận. Quy tắc *mỗi phiên 1 phiếu đã khóa* vẫn giữ nguyên.
- Mở cửa sổ ẩn danh / tài khoản khách → không hiện nút Quản trị và các endpoint `/api/admin/*` phải trả 403 khi không có quyền.
- Xem `/api/health` để xác nhận có dữ liệu. Phiên bản này không tự sửa/xóa bất kỳ bình luận, phiếu hay tổ trưởng trong Supabase.

### Giới hạn

Nếu API trả về ba bình luận nhưng nội dung vẫn trống trên bản Production, cần xem Response của `/api/comments?leader_id=...` ở DevTools; không thể xác minh dữ liệu thật nếu không có kết nối Supabase của chủ dự án. Người dùng không có tài khoản sẽ được cấp phiên trình duyệt ẩn danh; xóa cookie có thể tạo phiên mới, không xác nhận được danh tính duy nhất.
