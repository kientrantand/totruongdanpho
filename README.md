# Tổ trưởng dân phố – Bản đồ và bình chọn (V3.1)

Website tra cứu và bình chọn tổ trưởng tại **6 phường**: Trường Thi, Đông A, Thành Nam, Nam Định, Thiên Trường, Mỹ Lộc. Bỏ Hồng Quang và Vị Khê. Có sẵn **126 tổ trưởng** thuộc 5 phường, Thiên Trường sẽ nhập sau.

## Chức năng

- Bản đồ GeoJSON, nhấn phường để lọc; nếu GIS không tải được vẫn có nút chọn phường.
- Tra cứu họ tên, tổ/xóm, phường; **không công khai số điện thoại**.
- **Người xem không cần đăng nhập để bỏ phiếu** với 4 mức, một lựa chọn cho mỗi tổ trưởng trên mỗi phiên trình duyệt (được đổi/hủy).
- Bình luận ẩn danh, **quản trị viên duyệt trước khi công khai**; có báo cáo nội dung.
- Bảng xếp hạng dùng số phiếu tối thiểu 5/tổ trưởng; tỷ lệ từng tổ trưởng được công khai sau 3 phiếu.
- **Chỉ quản trị viên cần đăng nhập** để quản lý danh sách, duyệt bình luận, xuất CSV.

## Chạy trên Windows / Android cùng Wi-Fi

1. Cài Python 3.10+, giải nén ZIP, chạy `start_windows.bat` (hoặc `python app.py --host 127.0.0.1`).
2. Lần đầu chạy, lưu mật khẩu quản trị được in trong cửa sổ CMD.
3. Trên Windows mở `http://127.0.0.1:8765/`, điện thoại mở địa chỉ LAN mà terminal hiển thị.
4. Người bình chọn chỉ cần mở trang web; không yêu cầu mã hoặc tài khoản. Mục Quản trị dành riêng cho người có mật khẩu.

## Cấu trúc dữ liệu

- `data/to_truong_126.json`: dữ liệu khởi tạo 126 tổ trưởng, có trong GitHub, không chứa số điện thoại.
- `data/votes.sqlite3`: sinh ra khi chạy Python và được bỏ qua bởi `.gitignore`; **đây mới là dữ liệu đang sử dụng** khi chạy máy chủ, gồm tổ trưởng chỉnh sửa, phiếu, bình luận và phiên người dùng. Sao lưu riêng.
- `vercel-preview/data/to_truong_126.json`: bản sao chỉ để demo tĩnh trên Vercel; không tự đồng bộ với SQLite.

## GitHub và Vercel

Đưa **nội dung** thư mục dự án lên gốc repository GitHub. `vercel.json` xuất `vercel-preview/` chỉ để xem bản đồ, tìm tên và phường; **Vercel demo không nhận phiếu hoặc bình luận**, dù máy chủ Python V3.1 đã hỗ trợ bình chọn ẩn danh không đăng nhập. Muốn Vote và bình luận dùng chung qua Internet cần host chạy backend có HTTPS và lưu trữ **bền vững** (ví dụ VPS, Render + persistent disk, hoặc chuyển serverless + PostgreSQL).

## Hạn chế & an toàn

Mã ẩn danh trong cookie chỉ giới hạn theo trình duyệt, không bảo đảm mỗi cá nhân một phiếu; xóa cookie hoặc đổi thiết bị có thể bình chọn lại. Cần cơ chế chống gian lận mạnh hơn khi triển khai công khai. Nội dung đánh giá là ý kiến chủ quan, không phải xác nhận về cá nhân; cần quy chế kiểm duyệt, báo cáo, gỡ bỏ, và xử lý dữ liệu cá nhân phù hợp.

## Dữ liệu bản đồ

Các GeoJSON được nạp qua Internet từ dự án `thanglequoc/vietnamese-provinces-database` (MIT), theo các mã 13777, 13693, 13699, 13669, 13684, 13708. Khi mất mạng, vẫn chọn được phường bằng nút.

Xem [HUONG_DAN_V3_1.md](HUONG_DAN_V3_1.md) và [HUONG_DAN_VERCEL.md](HUONG_DAN_VERCEL.md) để biết cách nâng cấp và triển khai.
