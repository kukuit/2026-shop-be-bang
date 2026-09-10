# Image performance notes

Theo yêu cầu người dùng, giữ số thứ tự này để trao đổi tiếp.

- #1 — Đã xử lý: avatar GameShell hiển thị 34×34 nhưng nguồn 1254×1254 (~315 KiB). Đã bỏ unoptimized tại GameShell; các preload ảnh gốc là hạng mục riêng, chưa thay đổi.
- #2 — Đã xử lý: bỏ unoptimized cho ba ảnh ready, thêm sizes 223px/132px/129px trong GameLoadingScreen.tsx; giữ priority và tỷ lệ ảnh.
- #3 — Đã xử lý: bỏ unoptimized cho thumbnail chat trong ChatWidget.tsx, thêm sizes="220px" làm giới hạn bảo thủ theo khung chat 328px và bong bóng tối đa 75%; giữ lazy loading mặc định. Chưa đo dung lượng tải thực tế.
- #4 — Chưa xử lý: PNG optimize giữ nguyên kích thước pixel; giảm byte tải mạng nhưng không giảm số pixel texture. Sprite sheet cần giữ hoặc cập nhật đồng bộ tọa độ frame khi resize.

## Phân tích #2

GameLoadingScreen.tsx:80,85,90 dùng ba ảnh đơn, không phải sprite. Ảnh xuất hiện ngay khi loading, không đợi ready=true. Component được dùng chung cho bốn game và một số loading fallback.

Khung hình có max-w-sm (384 CSS px với Tailwind mặc định). Avatar rộng 58% (tối đa ~223 px), Cappy 34.4% (~132 px), Wolf 33.6% (~129 px). Nguồn tương ứng 1103×1426 (~189 KiB), 1149×1369 (~241 KiB), 1177×1337 (~275 KiB).

Đề xuất: bỏ unoptimized cho ba ảnh, thêm sizes tương ứng 223px/132px/129px làm giới hạn bảo thủ; có thể tinh chỉnh responsive theo cả chiều rộng và chiều cao GameShell sau khi đo. Giữ width/height nguồn để bảo toàn tỉ lệ. priority không tự nó là lỗi vì ảnh hiển thị ngay; nên giữ lúc đầu, chỉ đổi ưu tiên sau khi đo waterfall/LCP. Chỉ bỏ unoptimized mà không có sizes có thể vẫn khiến Next chọn ảnh quá lớn dựa trên width nguồn.

Đã sửa #2. Chưa đo byte đầu ra, LCP hay độ trễ chuyển đổi ảnh lần đầu.
