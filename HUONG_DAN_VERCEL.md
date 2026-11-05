# Chạy thử trên Vercel

Đây là bản demo CHỈ ĐỌC cho bản đồ 6 phường và danh sách 126 tổ trưởng. Không hỗ trợ lưu bình chọn, bình luận hoặc quản trị; đây không phải lỗi.

1. Trong GitHub repo, thêm `vercel.json` và toàn bộ thư mục `vercel-preview/` vào thư mục gốc. Không xóa `app.py`, `static/` và `data/`.
2. Vercel → New Project → import repo → Root Directory chọn `./` (root).
3. Framework Preset: `Other`; Output Directory: `vercel-preview`; Build Command: để mặc định/không bật Override; Install Command không cần; Environment Variables: không cần.
4. Deploy. Kiểm tra bản đồ, lọc theo phường và 126 tổ trưởng.

Vercel đọc `vercel.json` nên thông số Output Directory đã được chỉ định trong repo.

Muốn người dùng Vote/bình luận chung: cần triển khai backend có phiên ẩn danh tự động (không cần đăng nhập để bình chọn), duyệt bình luận, cơ sở dữ liệu bền vững và HTTPS. Không dùng SQLite cục bộ hoặc /tmp của Vercel để lưu phiếu vì không đảm bảo tồn tại lâu dài.
