# Lịch công việc

Route: `/demo/ai-task/calendar`. Navigation: Chat → Công việc → Tổng quan → Lịch.

Chỉ bổ sung FE: đọc toàn bộ cây qua `resource=tree&view=all`; dùng nhóm từ Provider. Không thay schema, API, parser, confirmation hoặc service lưu task. Mở lịch và chuyển view không ghi task. Chỉnh sửa/hoàn thành là thao tác chủ động qua `saveTask` hiện có, kèm version và requestId; không đụng yêu cầu đang chờ trong Chat.

- Desktop mặc định Tuần; mobile mặc định Ngày. Có Tháng, Hôm nay, trước/sau; toàn bộ lịch dùng giờ Việt Nam.
- Ngày giờ bắt đầu cụ thể nằm trên timeline 24 giờ, mở sẵn từ 06:00. Trùng giờ được chia cột; thiếu giờ kết thúc chỉ dùng chiều cao hiển thị tối thiểu, không tạo duration/end giả.
- Start + end khác ngày hiển thị thành thanh ngang, tách đoạn theo tuần. Ngày hiển thị tiến độ ngày x/y. Chỉ có deadline nằm trên ngày deadline trong vùng phía trên.
- Không có ngày bắt đầu và deadline: Chưa xếp lịch. Task cha không lịch có con chỉ làm context; cha có lịch riêng vẫn hiện. Task hoàn thành/hủy vẫn hiện; task xóa mềm không hiện.
- Tháng tối đa 3 hàng event mỗi ô, `+N việc` mở Ngày. Màu lấy từ nhóm; ưu tiên/hạn dùng dấu nhỏ.
- Popup hiển thị nội dung, nhóm, cha, lịch, ưu tiên, trạng thái, ghi chú; sửa bằng TaskForm chung. Escape/Đóng trả về lịch.

## Giới hạn độ chính xác thời gian

Model hiện tại không có `startClock` hoặc cờ lưu việc người dùng có chọn giờ. Timestamp được coi là ngày giờ thật (kể cả 00:00); không suy đoán 00:00 là cả ngày, không thể khôi phục giờ đã bị parser mặc định trước đây. Giá trị chỉ có ngày và cờ `withinDay` cũ được hiển thị cả ngày; form hiện tại lưu datetime và chuẩn hóa `withinDay=false`. Muốn phân biệt chính xác hơn cần một yêu cầu dữ liệu riêng, ngoài phạm vi FE này.

## Kiểm tra

- `npm run typecheck`
- `npm run test:ai-task` (hồi quy service hiện có, database giả lập)
- `node scripts/test-ai-task-calendar.cjs` (phân loại, múi giờ, cha/con, trạng thái, trùng giờ, chia thanh, chuyển ngày/tháng)
- `node scripts/test-ai-task-calendar-browser.cjs`: cần Next port 3252 và Chrome headless CDP port 9352 với profile riêng. Test chặn toàn bộ auth/task API bằng fixture, không ghi tài khoản thật. Kiểm tra desktop/mobile, navigation, popup, sửa, hoàn thành, Escape, không tràn trang và `+N việc`. Ảnh tại `node_modules/.cache/ai-task-calendar/`.

Chưa kiểm thử với dữ liệu tài khoản thật; browser test calendar dùng phản hồi API giả lập. Việc lưu thực tế được kiểm tra riêng bởi bộ test service hiện có.
