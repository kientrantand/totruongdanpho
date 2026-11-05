# V3.1 – Bình chọn và bình luận ẩn danh, không cần đăng nhập

## Dữ liệu lưu ở đâu?

- `data/to_truong_126.json`: 126 tổ trưởng ban đầu (Trường Thi 26, Đông A 12, Thành Nam 11, Nam Định 62, Mỹ Lộc 15; Thiên Trường 0).
- `data/votes.sqlite3`: **chỉ sinh ra khi chạy `app.py`**, lưu danh sách đã nhập/điều chỉnh, phiếu, bình luận và phiên quản trị. GitHub không có file này (nằm trong `.gitignore`). Cần sao lưu dữ liệu này thường xuyên.
- `vercel-preview/data/to_truong_126.json`: bản sao phục vụ tra cứu trên Vercel demo; không đồng bộ ngược với SQLite.

## Điểm mới

- Vào website -> chọn tổ trưởng -> đánh giá ngay; không có đăng nhập cho người bình chọn.
- Mỗi trình duyệt được cấp cookie `tdp_session` ngẫu nhiên, tồn tại tối đa 180 ngày, không công khai tên người bình chọn.
- Một phiên trình duyệt có một lựa chọn cho mỗi tổ trưởng, được đổi/hủy; **không xác thực được một người là một phiếu**. Xóa cookie, ẩn danh hoặc đổi thiết bị có thể tạo một danh tính khác.
- Bình luận đăng ẩn danh nhưng chờ quản trị viên duyệt, hạn chế tần suất gửi.
- **Chỉ quản trị viên cần đăng nhập**, ở mục Quản trị trên giao diện. Mật khẩu admin tạo trong lần chạy đầu.
- Hai bảng xếp hạng chỉ hiển thị sau 5 phiếu/tổ trưởng; biểu đồ từng người sau 3 phiếu.

## Chạy trên Windows

Cài Python 3.10+, chạy `start_windows.bat`. Mở `http://127.0.0.1:8765/` và trên cùng Wi-Fi sử dụng địa chỉ LAN do máy chủ in ra. Không để mở trực tiếp Internet nếu chưa triển khai HTTPS, giám sát lạm dụng và bảo vệ dữ liệu.

## Giữ dữ liệu V3 trước đó

Sao lưu `data/votes.sqlite3`, dừng server cũ, sau đó chép file SQLite sang vị trí tương ứng của V3.1. Bản V3.1 **không xóa** các phiếu/bình luận cũ. Không đưa file này lên GitHub.

## GitHub + Vercel

Đưa **nội dung thư mục này** lên gốc repository. `vercel.json` xuất `vercel-preview/` ở chế độ **chỉ xem**. Bản demo tĩnh không thể ghi phiếu/bình luận và không có đăng nhập admin đang hoạt động. Muốn bỏ phiếu trên Internet phải chạy backend qua server có lưu trữ bền vững hoặc chuyển API sang serverless + PostgreSQL. SQLite trên thư mục local Vercel không bảo đảm lưu lâu dài.

## Cảnh báo

Đây là đánh giá chủ quan về người thật. Khi công khai cần kiểm duyệt bình luận, cho phép phản hồi/báo cáo, minh bạch phương pháp và không dùng làm kết luận thực tế về cá nhân. Cơ chế bình chọn không đăng nhập không chống được hành vi tạo nhiều phiếu có chủ đích.
