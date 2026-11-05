# Bản đồ tra cứu tổ trưởng dân phố · Nam Định (V3)

Ứng dụng web dùng trên Windows và Android qua trình duyệt. Có **6 phường**: Trường Thi, Đông A, Thành Nam, Nam Định, Thiên Trường và Mỹ Lộc. Không hiện Hồng Quang và Vị Khê. **126 tổ trưởng** trong 5 phường đã có dữ liệu; Thiên Trường để trống, thêm ở mục Quản trị.

## Chức năng

- Bản đồ GeoJSON tương tác, nhấp phường để lọc danh sách, có lựa chọn dự phòng khi không kết nối GIS.
- Tra cứu họ tên, tổ/xóm, phường; công khai thông tin cơ bản, **không công khai số điện thoại**.
- Vote 4 mức, mỗi mã được một phiếu/tổ trưởng; chỉnh sửa phiếu được.
- Bình luận ẩn danh đối với người xem; duyệt trước khi công khai, có báo cáo nội dung.
- Xếp hạng theo tỷ lệ phiếu khi >= 5 lượt/tổ trưởng, số phiếu chi tiết khi >= 3.
- Quản trị viên thêm/sửa/ẩn tổ trưởng, cấp/khóa mã, duyệt bình luận, xuất CSV.

## Chạy thử tại Windows

1. Cài Python 3.10 trở lên.
2. Chạy `start_windows.bat` hoặc `python app.py --host 127.0.0.1`.
3. Lần đầu chạy, đọc **mật khẩu quản trị** duy nhất trên cửa sổ CMD.
4. Vào `http://127.0.0.1:8765`. Từ mạng Wi-Fi nội bộ dùng địa chỉ LAN của máy Windows.
5. Chế độ khách có thể xem bản đồ/danh bạ; để Vote/bình luận phải nhận mã riêng từ quản trị viên.

## GitHub không tự chạy backend

Đưa nguồn lên GitHub là lưu trữ mã. **GitHub Pages chỉ chạy HTML/CSS/JS**, không chạy được server Python và SQLite; vì vậy không thể đồng bộ phiếu/bình luận trên Pages riêng lẻ. Muốn công khai Internet phải triển khai Python server trên VPS/Render/Railway có HTTPS **và lưu trữ bền vững** (`TDP_DB_PATH` là biến môi trường chỉ vị trí tệp SQLite), sau đó trỏ tên miền.

```bash
git init
git add .
git commit -m "Website bản đồ 6 phường và bình chọn tổ trưởng V3"
git branch -M main
git remote add origin https://github.com/<TEN-TAI-KHOAN>/<TEN-REPO>.git
git push -u origin main
```

Không dùng `<...>` trong terminal; thay bằng địa chỉ repo thật của bạn. Chọn repository **Private** trước khi rà soát quyền công khai thông tin.

## Dữ liệu cá nhân

`data/to_truong_126.json` trong repo **đã xóa số điện thoại**, chỉ giữ tên, địa bàn, mã bản ghi và tên địa bàn cũ. Không commit file SQLite (chứa phiếu, mã tài khoản, bình luận và các số điện thoại được quản trị viên thêm). Dữ liệu cũ của bản V2 có thể nâng cấp bằng cách dừng ứng dụng và sao lưu rồi sao chép `data/votes.sqlite3` từ V2 sang bản này; giữ file chỉ trên máy chủ riêng. **Không đưa SQLite lên GitHub**.

Trước khi phát hành công khai: kiểm tra căn cứ xử lý dữ liệu cá nhân, sự đồng ý/cơ sở pháp lý phù hợp, quy chế kiểm duyệt, quy trình yêu cầu chỉnh sửa/xóa thông tin, chống spam, sao lưu/khôi phục và HTTPS. Hệ thống đánh giá chủ quan không phải kết luận về tính cách hay đạo đức cá nhân.

## Nguồn bản đồ

Phía trình duyệt tải sáu GeoJSON theo mã: 13777, 13693, 13699, 13669, 13684, 13708 từ dự án `thanglequoc/vietnamese-provinces-database`, giấy phép MIT. Tham chiếu: https://github.com/thanglequoc/vietnamese-provinces-database/tree/master/json/geojson/37_ninh_binh/wards. Bản đồ yêu cầu kết nối Internet để tải ranh giới; nếu tải thất bại vẫn có sáu nút chọn phường.

## Mở rộng

Nhập danh sách Thiên Trường qua Quản trị → Thêm tổ trưởng và chọn chính xác `phường Thiên Trường`. Bộ đếm và bản đồ tự cập nhật.

## Gợi ý triển khai lên Render sau khi đẩy GitHub

- Kết nối repository GitHub ở Render → tạo **Web Service** sử dụng Python.
- Build command: không cần cài thư viện; có thể để `echo ready`.
- Start command: `python app.py --host 0.0.0.0 --no-browser --secure-cookies`.
- Render cấp biến `PORT` cho app. Cần cấu hình **Persistent Disk** gắn vào thư mục (ví dụ `/var/data`) và biến `TDP_DB_PATH=/var/data/votes.sqlite3` để dữ liệu không mất khi triển khai lại. Persistent Disk có thể phát sinh phí.
- Xem log lần khởi tạo để lưu mật khẩu quản trị. Chuyển toàn bộ truy cập ngoài Internet sang HTTPS.
- Không thử nghiệm bằng số điện thoại thật và không công khai repository cho tới khi kiểm tra đầy đủ quy định bảo vệ dữ liệu cá nhân.

> Không nên dùng dịch vụ hosting miễn phí chỉ có lưu trữ tạm thời cho dữ liệu Vote/bình luận thật. Với quy mô lớn, nên dùng cơ sở dữ liệu PostgreSQL quản trị riêng và bổ sung log kiểm toán, backup, giới hạn truy cập nâng cao.
