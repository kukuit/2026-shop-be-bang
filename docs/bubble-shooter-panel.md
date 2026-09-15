# Bảng câu hỏi dùng chung

Ảnh tạo bằng skill imagegen từ `panel-1.png`:

- `public/games/bubble-shooter/images/question-panel-shared.png`: bảng vàng, lá xanh, ô tròn trống ở dưới phải.
- `public/games/bubble-shooter/images/voice-speaker-shared.png`: loa vàng và sóng xanh riêng.

Ảnh bảng đã được imagegen xóa nền caro và thay bằng nền alpha trong suốt.

`BubbleMathScene` dùng hai asset trên cho các game bắn bóng. Nút loa nằm ở tâm ô
tròn của mẫu (x = 91,8% chiều rộng; y = 77,8% chiều cao), tách khỏi nội dung câu hỏi.
Có `voiceSequence`, `instructionVoice`, `voice` hoặc nội dung `voiceFallback`:
nút hoạt động khi đang chơi. Không có voice: nút mờ và không nhận bấm.
Nút không nhận bấm khi đang hiện đáp án, tạm dừng hoặc chưa bắt đầu.
Nghe lại dùng `playQuestionVoice`, dừng chuỗi cũ trước khi bắt đầu chuỗi mới.

Các kiểm tra tự động: TypeScript, lint, `test-vietnamese-a.cjs`,
`test-toan-2-bai-1.cjs`, `test-math-voices.cjs`. Chưa kiểm tra trực quan trên mobile.
