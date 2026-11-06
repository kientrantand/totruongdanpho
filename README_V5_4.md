# E-TDP V5.4 — Khắc phục 3 yêu cầu giao diện và số điện thoại

## Nội dung thay đổi

1. **Công khai số điện thoại liên hệ**: `/api/public/leaders` và `/api/leaders` trả thêm `phone`, `phone_alt` của **tổ trưởng đang hoạt động**. Thẻ tra cứu và cửa sổ hồ sơ hiển thị số điện thoại (nhấn để gọi được trên Android). Không hiển thị số nếu Supabase chưa có dữ liệu. API không cấp thông tin phiên đăng nhập, mã quản trị hay các bản ghi đã ẩn.
2. **Font sans-serif**: thống nhất Arial/Helvetica cho toàn website, xử lý các tiêu đề từng bị sử dụng font trọng lượng quá đậm/giãn chữ không tự nhiên.
3. **Xóa tiêu đề thừa**: đã xóa toàn bộ khối bắt đầu bằng “HỆ THỐNG TỔ TRƯỞNG DÂN PHỐ · 6 PHƯỜNG / Bản đồ & trải nghiệm phối hợp” xuất hiện *phía trên bản đồ*. Vẫn giữ tiêu đề ngắn bên trong khung bản đồ để biết chức năng.
4. **Bản đồ**: tối ưu độ cao, nhãn đơn dòng dễ đọc hơn, loại bỏ chữ “PHƯỜNG” lặp trên 6 nhãn và giữ các nhãn tách khỏi SVG để tránh mờ. Địa giới không bị kéo giãn hay thay đổi.
5. Có nhãn phiên bản `E-TDP v5.4` trên thanh đầu trang giúp phân biệt bản Production.

## Cập nhật GitHub

Nếu đang ở V5.3, hãy đưa đúng các file trong ZIP cập nhật vào **thư mục gốc** của repository:
- `app.py` (thay thế)
- `static/app.js` (thay thế)
- `static/style.css` (thay thế)
- `static/index.html` (thay thế)

Commit/Push lên `main` → kiểm tra Vercel **Ready** → mở trang và nhấn Ctrl+Shift+R. Có thể truy cập `/static/app.js?v=5.4` để kiểm tra phiên bản triển khai.

## Số điện thoại vẫn trống?

Điều này là do bản ghi trong Supabase chưa được khôi phục. Kiểm tra an toàn trong SQL Editor:

```sql
SELECT count(*) AS tong,
       count(NULLIF(trim(coalesce(phone,'')),'')) AS co_so_chinh,
       count(NULLIF(trim(coalesce(phone_alt,'')),'')) AS co_so_phu
FROM app.leaders WHERE active = true;
```

Không cần chạy lại file khôi phục nếu dữ liệu đã có. Nếu thiếu, khôi phục từ file Excel/SQL riêng cung cấp trong các tin nhắn trước. **Không đẩy Excel chứa số điện thoại lên GitHub.**

## Quyền riêng tư

Vì bạn yêu cầu số điện thoại hiển thị cho mọi khách truy cập, API công khai sẽ cung cấp thông tin liên hệ của toàn bộ tổ trưởng đang hoạt động. Chỉ áp dụng khi có quyền công bố và người liên quan đã được thông báo/đồng ý theo quy định áp dụng. Nếu chưa bảo đảm điều này, nên giữ kho GitHub ở chế độ Private, chưa công bố website cho công chúng.
