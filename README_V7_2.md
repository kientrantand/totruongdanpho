# E-TDP V7.2 – Bình luận theo từng tổ trưởng

## Lỗi được sửa
- API `/api/comments?leader_id=...` và `/api/public/comments?leader_id=...` chỉ truy vấn và trả nội dung của đúng `leader_id`, trả thêm mã/tên/địa bàn tổ trưởng để đối chiếu.
- Client bỏ hiệu lực kết quả của yêu cầu cũ nếu đã chuyển hồ sơ. Từ chối phản hồi hoặc dòng bình luận có `leader_id` khác.
- Mỗi hồ sơ có tiêu đề xác định rõ "Bình luận dành riêng cho: ..." và mã tổ trưởng.
- Trang duyệt bình luận hiển thị tên và mã tổ trưởng nhận bình luận.
- Không thay đổi Supabase, votes, quy tắc khóa phiếu, quyền quản trị.

## Cập nhật
Thay `app.py`, `static/app.js`, `static/style.css`, `static/index.html` vào đúng đường dẫn trong repository. Commit lên nhánh `main`, kiểm tra bản Production mới là Ready trên Vercel.

## Rà soát dữ liệu cũ
Chạy file `sql/03_KIEM_TRA_BINH_LUAN_THEO_TO_TRUONG.sql` trong Supabase SQL Editor nếu vẫn có bình luận xuất hiện nhầm. **Đây chỉ là câu lệnh SELECT**. Nếu `app.comments.leader_id` đã sai từ trước, thay giao diện không thể tự biết bình luận đó vốn dành cho ai; cần đối chiếu từng bình luận trước khi sửa dữ liệu.

Không cần chạy lại SQL tạo bảng, không xóa bình luận hoặc thay đổi mật khẩu/biến DATABASE_URL.
