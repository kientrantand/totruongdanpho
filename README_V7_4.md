# E-TDP V7.4 — Quy tắc duyệt và xóa bình luận

## Thay đổi
- Người gửi ẩn danh chỉ có thể hủy bình luận của mình khi `pending` (chờ duyệt); đã duyệt thì API trả về 403 dù cố gọi trực tiếp.
- Quản trị chọn **Duyệt**: trạng thái `approved`, giao diện **Đã công khai**, chỉ còn nút **Xóa bình luận này**.
- Quản trị **Từ chối** hoặc **Xóa bình luận này**: trạng thái `rejected`, giao diện **Đã bị xóa**; khách không xem được nữa, quản trị vẫn thấy nội dung.
- `hidden` là bình luận đã ẩn, có thể duyệt lại hoặc từ chối; `rejected` là trạng thái kết thúc.
- Cột **Bình luận** trong danh sách theo phường hiển thị số bình luận được duyệt. Bấm vào để xem 5 bình luận mỗi lần, nút **Hiển thị thêm bình luận**.
- Checkbox **Danh sách phường** bên cạnh thanh tìm kiếm thay thế menu riêng.

## Cập nhật GitHub
Thay `app.py`, `static/app.js`, `static/style.css` của repository, sau đó commit/push. `static/index.html`, `static/game.js` không cần thay.

## Lưu ý
Không cần thay schema PostgreSQL: dùng các trạng thái `pending`, `approved`, `hidden`, `rejected` đã hỗ trợ. `rejected` có nhãn người dùng **Đã bị xóa**, dữ liệu lưu lại để quản trị kiểm tra. Không chạy SQL xóa bình luận.

Sau khi Vercel triển khai, kiểm tra tình huống: khách gửi bình luận -> chờ duyệt (có thể tự hủy) -> quản trị duyệt (khách không còn nút tự hủy) -> quản trị xóa (khách không xem được, quản trị còn nhãn Đã bị xóa).
