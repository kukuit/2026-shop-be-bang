# Danh sách đường dẫn ảnh còn tồn đọng

Danh sách mới theo yêu cầu người dùng, độc lập với #1–#4 trong image-performance-notes.md. Các số #1–#3 trong trao đổi hiện tại chỉ danh sách này.

- #1 — Đã xử lý: toàn bộ URL thumbnail trong src đã chuyển sang optimize, gồm bốn vị trí lỗi, hai thumbnail đào vàng và fallback động trong chat. Đã kiểm tra 16 tham chiếu thumbnail tĩnh đều có file đích.
- #2 — Đã xử lý theo yêu cầu người dùng: xóa page và layout của /products, gỡ liên kết menu/contact và mục sitemap. Sáu tham chiếu ảnh cam cùng metadata cũ được loại bỏ theo trang.
- #3 — Đã xử lý: chuyển logo GameAuthHeader, loading GameEntry và atlas tiếng Anh sang URL optimize; xác nhận file đích tồn tại. Giữ nguyên kích thước và tọa độ atlas.

## Phân tích #1

Đã kiểm tra source và file local hiện tại:

- src/app/game/lop-1/toan/bai-2/page.tsx:8–9.
- src/app/game/lop-1/tieng-anh/bai-1/page.tsx:8–9.

Hai trang cùng tham chiếu thumbnail-v2.png của bubble-shooter và drag-drop; hai file nguồn không tồn tại. Tổng cộng bốn vị trí sử dụng bị lỗi. Chưa xác minh HTTP production.

File thay thế đã tồn tại:

- /games/bubble-shooter/images/optimize/thumbnail/thumbnail.png — 411818 byte.
- /games/drag-drop/images/optimize/thumbnail/thumbnail.png — 464289 byte.

LessonGameGrid.tsx:74 đã dùng next/image, fill và sizes, không có unoptimized; các byte trên là dung lượng nguồn, không phải dung lượng trình duyệt chắc chắn tải. Sửa bốn URL sẽ khôi phục nguồn ảnh hợp lệ, không cần sửa logic game hoặc tạo ảnh mới.

Hai trang còn dùng thumbnail đào vàng bản gốc ở dòng 10: file vẫn tồn tại, không phải ảnh lỗi; có thể chuyển sang /games/gold-mining/images/optimize/thumbnail/thumbnail.jpg. Thumbnail đua xe dòng 11 đã dùng optimize.

Sau bước phân tích: đã sửa toàn bộ URL thumbnail còn sót theo yêu cầu người dùng. Nội dung phân tích phía trên ghi nhận trạng thái trước khi sửa; thumbnail bắn bóng/kéo thả và đào vàng ở cả hai trang hiện đã dùng optimize. Fallback động của chat cũng dùng optimize; file của game mới phụ thuộc asset được bổ sung sau này.

## Phân tích #2

src/app/products/page.tsx:32,39,46,53,60,67 còn dùng orange-1.jpg, orange-2.jpg, orange-3.jpg, orange-syrup.jpg, orange-wine.jpg, orange-dried.jpg trong /images/products. Không có các file này hoặc bản optimize tương ứng trong public hiện tại.

Trang vẫn mô tả sáu sản phẩm cam: cam tươi, nước ép, mứt, siro, rượu và cam sấy. Trong khi src/app/page.tsx dùng bốn sản phẩm quần áo với product-0001.webp đến product-0004.webp. Không nên tự thay ảnh quần áo vào thẻ bán cam.

Route /products vẫn có page và được tham chiếu trong HeaderTop, trang contact và sitemap. Metadata trong products/layout.tsx vẫn dùng thương hiệu Cam 7 Hùng, domain camhuuco.vn và ảnh OG orange-1.jpg. Chưa kiểm tra HTTP production.

Component ảnh đã dùng next/image, fill, sizes và lazy loading; vấn đề chính là nguồn ảnh thiếu và nội dung cũ còn tồn tại. Nếu giữ shop quần áo, cần cập nhật đồng bộ danh mục, mô tả, giá, ảnh và metadata theo nội dung được chọn. Nếu giữ danh mục cam, cần khôi phục đúng ảnh rồi tối ưu. Không có thay đổi mã ứng dụng trong bước phân tích #2.

## Phân tích #3

Quét literal URL trong src hiện tại còn ba ảnh gốc đã có bản optimize:

| Vị trí | Nguồn → optimize (byte) | Kích thước hai bản |
| --- | --- | --- |
| GameAuthHeader.tsx:27 — /images/logo.png | 863530 → 384875 | 1024×1024 |
| GameEntry.tsx:28 — /games/general/images/loading-cappy-adventure.png | 66565 → 16255 | 224×224 |
| tieng-anh/bai-1/images.ts:3 — vocabulary.png | 1161563 → 222957 | 1298×1212 |

Logo dùng Next Image không có unoptimized, hiển thị 44×44; số byte nguồn không phải số byte browser chắc chắn tải. Đổi sang optimize đồng bộ nguồn với HeaderTop.

Loading GameEntry hiển thị 112×112, priority unoptimized. Bản optimize 224×224 (~16 KiB) đủ pixel cho DPR 2; đổi URL đã giảm trực tiếp dung lượng nguồn ~75.6%. Có thể giữ unoptimized vì file nhỏ và đã đúng kích thước 2x, đồng bộ URL với các loading khác.

Atlas được tải trực tiếp qua Phaser/SVG, không qua Next Image. Đổi URL giảm ~80.8% byte nguồn. Hai bản cùng kích thước nên không cần đổi sourceWidth/sourceHeight hoặc frame coordinates chỉ vì nén; cần đối chiếu trực quan để xác nhận bố cục và chất lượng, không thể chứng minh điều này chỉ bằng kích thước. Không resize/crop atlas trong bước này.

Đề xuất đổi đúng ba URL sang /images/optimize/ tương ứng; chưa sửa source ở bước phân tích. Quét literal không bao gồm mọi URL động hoặc dữ liệu ngoài repository.

Sau phân tích đã đổi ba URL theo yêu cầu. Rà ảnh chưa có bản optimize với ngưỡng >200 KiB: 10 ảnh trong public/games/phaser/images (~12,49 MiB tổng) không có tham chiếu URL tĩnh trong src; icon-1024.png ~376 KiB cũng không có tham chiếu URL tĩnh. Bốn ảnh sản phẩm WebP đang dùng khoảng 150 KiB/file, không có bản optimize riêng. Danh sách byte/file/tham chiếu được lưu tại images-without-optimize.json. Kết quả quét source không thay thế đo request runtime.
