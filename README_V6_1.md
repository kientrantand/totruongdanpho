# E-TDP V6.1 — Chọn, xác nhận, khóa phiếu. Game chỉ để giải trí

## Quy tắc mới

1. Người dùng tìm tổ trưởng và nhấn **một mức trải nghiệm**.
2. Website hiển thị **bảng xác nhận** giải thích rõ: chỉ một phiếu và **không thể đổi/hủy sau xác nhận**. Có thể quay lại để chọn mức khác **trước khi xác nhận**.
3. Sau khi nhấn **Xác nhận và khóa đánh giá**, giao diện gửi một lần `POST /api/vote` với `{leader_id, level, confirmed:true}`. PostgreSQL lưu phiếu đầu tiên, không cập nhật phiếu đã có.
4. Các lựa chọn đánh giá bị khóa. Phần bình luận ẩn danh và trò chơi **Vượt ải tổ trưởng** được mở. Chơi bao nhiêu lần cũng không gửi thêm phiếu.
5. `DELETE /api/vote/<id>` trả lỗi 403; yêu cầu POST thứ hai cùng người và tổ trưởng trả lỗi 409. Đây là thực thi phía máy chủ, không chỉ ẩn nút trên giao diện.

## Cập nhật từ V6.0

Thay chính xác 5 file `app.py`, `static/app.js`, `static/game.js`, `static/style.css`, `static/index.html` theo cấu trúc thư mục hiện hữu. Không đưa file ZIP chưa giải nén vào GitHub.

Đẩy commit mới lên `main`, kiểm tra Vercel Deployment **Ready** và nhãn **E-TDP v6.1**. Trang không cần thêm biến môi trường hoặc chạy lại SQL. PostgreSQL đang sử dụng được giữ nguyên; **phiếu đã có từ các phiên bản cũ cũng bị khóa**.

### Lưu ý

- Một người dùng ẩn danh được nhận diện theo cookie phiên; không thể bảo đảm một người thực không tạo phiên mới bằng cách xóa cookie/đổi trình duyệt. Đây là hạn chế chống bình chọn lặp, không phải khả năng được giải quyết bằng mã khóa này.
- Phiếu không thể sửa/hủy bằng API dành cho người bình chọn; quản trị dữ liệu SQL vẫn có thể tác động nếu có quyền cơ sở dữ liệu.
- Bản cập nhật đã kiểm tra trong môi trường giả lập, chưa tự cập nhật repository hoặc Supabase Production của bạn.
