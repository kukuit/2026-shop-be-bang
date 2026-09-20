# Rà soát và đánh giá khi hoàn thành

Module `/demo/ai-task` dùng `TaskWorkflow` dưới Provider chung. Các màn giữ nguyên thiết kế và 5 nhãn trạng thái MVP. Key hoàn thành vẫn là `done`, không thêm enum `completed`.

## Hoàn thành

- `useTaskCompletion().requestCompletion` mở `CompleteTaskDialog`; mọi nơi mới có thao tác hoàn thành cần gọi hook này hoặc dùng `TaskForm` chung.
- `TaskForm` chặn lượt lưu chuyển sang `done` (kể cả tạo mới với trạng thái hoàn thành). Giữ nguyên bản nháp khi hủy đánh giá. Chat có đề xuất chuyển sang `done` tự mở hộp thoại sau khi tải thông tin cha; sau khi hủy, có thể mở lại bằng nút cập nhật trong đề xuất. Chưa xác nhận thì chưa lưu task.
- Lịch và Rà soát đều dùng cùng hộp thoại. Rà soát giữ nguyên popup phía dưới; việc đã hoàn thành mờ dần rồi rời danh sách.
- Slider 0–100, bước 1%. Ban đầu hiển thị `—%`, vị trí 50% với opacity 0.55. Chạm thumb/track, kéo, bấm marker hoặc phím điều hướng mới tạo đánh giá. Tab lấy focus đơn thuần không tạo đánh giá. Marker có thể bấm; hỗ trợ bàn phím.
- Ghi chú hoàn thành riêng với mô tả task. Không bắt buộc nhập đánh giá hoặc ghi chú. Lỗi lưu giữ nguyên thông tin trong dialog để thử lại; nút khóa khi đang lưu.

## Lưu trữ và tương thích

`taskInputSchema` bổ sung `completionPercent?: number | null` (số nguyên 0–100) và `completionNote?: string | null` (tối đa 5000 ký tự). Không thêm endpoint; `saveTask` và `confirm` dùng transaction chung hiện có.

`completedAt` đã có sẵn và vẫn do `FieldValue.serverTimestamp()` ghi khi chuyển sang `done`; client không gửi được field này. Task hoàn thành 0%, 68% hoặc không đánh giá đều hợp lệ. Không sử dụng đánh giá này làm progress của việc đang làm.

- Khi chuyển sang `done`, thiếu đánh giá hoặc note trống sẽ lưu `null`.
- Khi chỉnh nội dung task đã hoàn thành, giữ đánh giá và thời điểm hoàn thành cũ.
- Khi mở lại task hoặc chuyển khỏi `done`, xóa đánh giá, ghi chú hoàn thành và thời điểm hoàn thành của lần đóng cũ. Lần hoàn thành kế tiếp được đánh giá lại.
- Task cũ thiếu các field vẫn đọc được, không cần migration. Không tự gán 50%/100% cho dữ liệu cũ.
- Giữ kiểm tra ownership, version, nhóm, cây task và idempotency hiện có. Không sửa parser AI để AI tự sinh đánh giá; đây là lựa chọn của người dùng.
- Kết quả được hiển thị ở popup Lịch, form sửa, thẻ kết quả Chat; chỉ khi task đã hoàn thành.

## Quy tắc rà soát MVP

Logic nằm tại `_lib/task-review.ts`, không đổi trạng thái task theo thời gian:

1. Deadline đã tới/quá hạn; xếp việc quá hạn lâu hơn lên trước.
2. Thời gian dự kiến hoàn thành đã tới (`deadline` hoặc start + duration).
3. Đã bắt đầu hoặc đang làm và 24 giờ chưa cập nhật.
4. Vẫn Mới tạo sau giờ bắt đầu ít nhất 1 giờ.
5. Không có timeline và 7 ngày không được tạo/cập nhật. Loại task cha không timeline chỉ dùng làm nhóm.

Luôn loại việc hoàn thành, hủy và xóa mềm. Context dùng nhóm và đầy đủ các tổ tiên.

## Nhắc nhẹ, không chen ngang

- Đọc task lúc mở và sau cập nhật; khi trang đang hiển thị kiểm tra mỗi phút. Quay lại tab cũng làm mới dữ liệu. Đây là nhắc trong ứng dụng, không phải push notification khi đóng trình duyệt.
- Lần đầu trong ngày có việc cần chú ý có thể mở Rà soát sau 1,5 giây; tối đa một lần trong session của tab. Nếu đang nhập, ghi âm, tạo/sửa/xác nhận, có dialog hoặc đang lưu thì chỉ giữ banner. Không chờ người dùng dừng gõ rồi bất ngờ mở modal.
- Quay lại sau 3 giờ nghỉ ưu tiên banner, không bật modal.
- Đóng X chặn tự mở lại trong session. “Để sau” ẩn nhắc 3 giờ. Khóa storage có user ID, độc lập giữa tài khoản; ngày lấy theo giờ Việt Nam. Không lưu dismiss vào Firestore.
- Task vừa đi qua thời gian dự kiến hoàn thành tạo toast nhẹ với Đã xong/Xem sau. Đã xong mở hộp thoại đánh giá, không lưu ngay. Không dùng toast dồn dập cho toàn bộ việc đã quá hạn từ trước; những việc đó nằm trong Rà soát.
- Nếu storage không khả dụng vẫn giữ giới hạn trong lần mount hiện tại. Không tự ghi trạng thái khi nhắc.

## Kiểm tra

- `npm run typecheck`
- `npm run test:ai-task`
- `node scripts/test-ai-task-completion.cjs`: lưu thật vào Firestore giả lập; null/0/50/68/100, note, timestamp, retry, version, mở lại, Chat, quy tắc rà soát.
- `node scripts/test-ai-task-workflow-browser.cjs`: Next port 3252 và Chrome headless CDP port 9352, auth và database giả lập. Kiểm tra review/form/chat/toast, slider ghost, chạm thumb, marker, note-only, lưu lỗi/retry, hủy, snooze, đang nhập chat, desktop/mobile. Ảnh ở `node_modules/.cache/ai-task-workflow/`.
- `node scripts/test-ai-task-calendar-browser.cjs`: hồi quy giao diện Lịch với phản hồi API giả lập.

Không cần và không chạy migration hoặc ghi dữ liệu tài khoản thật để kiểm thử.
