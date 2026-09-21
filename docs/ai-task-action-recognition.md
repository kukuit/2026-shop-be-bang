# Action Recognition + Personalization

Module: `src/modules/ai-task/action-recognition/`. Chat gửi text/voice qua API đã có;
server lấy UID từ `requireAuth`, gọi `recognizeAction`, `buildActionPlan`, rồi dùng
`prepareIntent` / confirmation / `persistTask` hiện tại. Recognition không ghi Task.

## Phạm vi MVP

- Registry gồm create, list, search, detail, update, reschedule, progress, complete,
  cancel, delete, note, priority và restore để giữ luồng khôi phục cũ.
- Câu lệnh rõ ràng ưu tiên trước context và personal pattern. Parser AI hiện có
  trích xuất tên/giờ/ngày/trường cần đổi; các trường đi qua Zod và kiểm tra owner,
  phiên bản, cây công việc trước khi lưu. Không có tên người/nghiệp vụ đặc biệt
  trong module.
- Target dùng tên thực, task cuối hoặc thứ tự danh sách vừa hiển thị. Không tự
  chọn một task khi tên trùng, context hết hạn hoặc ID không thuộc tài khoản.
- Ghi chú nối vào mô tả; tiến độ dùng trường `completionPercent` có sẵn, được giữ
  khi công việc đang làm. Không cần migration Task. 100% không tự bỏ xác nhận.
- Form confirmation hiện tại cho sửa dữ liệu, bao gồm tiến độ. Hủy công việc khác
  xóa vào thùng rác. Hủy đề xuất không tạo tín hiệu xác nhận.

## Context và lưu trữ

`sessionStorage[ai-task-action-context:<uid>]` chứa lastTaskId, danh sách ID theo
thứ tự hiển thị, action/query/group/parent và message gần nhất. TTL 2 giờ; không
chia sẻ giữa tài khoản/tab. “Xóa ngữ cảnh” xóa cả context bản nháp và context action.
ID trong browser luôn được đối chiếu lại với danh sách task thuộc UID trên server.

Firestore dưới namespace hiện tại:

```
demo/ai-task/users/<authenticated-uid>/assistantMemory/actionRecognition/
  intentPatterns/<sha256-normalized-pattern>
  correctionEvents/<assistant-message-id>
  confirmationEvents/<assistant-message-id>
```

Mỗi lần chat chỉ đọc document pattern tương ứng; không scan toàn bộ personal memory.
Pattern giữ tối đa 5 ví dụ; số, giờ, ngày được thay placeholder nhưng giữ từ chỉ
hành động/câu hỏi. Điểm correction +3, action cũ -2 (sàn 0), confirmation +1.
Điểm tối đa 1000/action; confidence là heuristic có giới hạn, không phải xác suất
đã được hiệu chuẩn. Pattern chỉ được dùng như prior khi câu không có intent rõ.

Feedback đọc recognition từ message đã lưu trên server, không nhận prediction,
UID hay điểm từ client. Transaction và event ID đảm bảo retry không học lặp.
Task được lưu trước feedback; lỗi memory không biến một lần lưu task thành lỗi.
Retry xác nhận/turn có thể ghi lại feedback còn thiếu. Không học từ proposal đã
hủy hoặc một lần ghi task thất bại. Không tự suy ra alias từ tên xuất hiện.

`PersonalEntityPattern`, `matchEntity` và resolver alias là điểm mở rộng cho
entity memory (task/parent/group). Chưa bật học alias, routines hoặc preferences
tự động; cần thêm luồng xác nhận alias trước khi ghi các loại memory đó.

## Thêm action

1. Bổ sung `actionDefinitions` (không dùng enum đóng).
2. Khai báo ánh xạ trong `legacyActions`, prompt và adapter `buildActionPlan` khi
   dùng được schema hiện tại; nếu không, thêm validation và executor riêng.
3. Giữ nhận diện là hàm không ghi dữ liệu. Mutation phải qua confirmation và
   validation phía server, bất kể confidence.
4. Thêm kiểm tra nhận diện, target, owner, confirmation và retry learning.

## Kiểm tra

- `npm run typecheck`
- `npm run test:ai-task` — hồi quy service/API cũ.
- `npm run test:ai-task:recognition` — intent, prior, normalization, TTL, owner,
  target, progress, note, correction, confirmation, retry và hủy đề xuất.
- `node scripts/test-ai-task-browser.cjs --recognition-only` — Next trên cổng
  3252 và Chrome headless/CDP cổng 9352. Auth, LLM, Firestore đều giả lập, không
  ghi dữ liệu thật. Test desktop/mobile, correction→create→confirm, reload→dời
  “nó”, progress, note và pattern đã học. Ảnh ở
  `node_modules/.cache/ai-task-browser/recognition-*.png`.

Các test giả lập kiểm chứng pipeline và UI, không thay thế đánh giá chất lượng
ngôn ngữ/ngày giờ với model và tài khoản thực tế. Không log text/score ra UI
production. Chưa triển khai lên production.
