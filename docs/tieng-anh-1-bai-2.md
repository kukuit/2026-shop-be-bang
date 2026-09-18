# Tiếng Anh 1 – Bài 2: In the dining room

Route `/game/lop-1/tieng-anh/bai-2` có bubble-shooter, drag-drop, gold-mining, racing.

10 learning goals giữ nguyên key, name, description yêu cầu trong lesson.ts. Mỗi câu ghi một goalKey theo tracking hiện có. Ball, bike, book chỉ làm nhiễu hoặc ôn mẫu câu, không tạo mục tiêu từ vựng mới.

Pool có 37 biến thể. Mỗi lượt chọn ngẫu nhiên một biến thể cho mỗi mục tiêu, xáo trộn thứ tự câu và đáp án bằng Fisher–Yates. Luôn giữ đáp án đúng khi chọn 3 đáp án cho đua xe hoặc 4 đáp án cho game khác. Kéo thả hydrate bằng dữ liệu cố định rồi tải lượt random qua loadLevels theo vòng đời game hiện có.

## Thêm bài mới cùng dạng

1. Khai báo learning goals và metadata trong lesson.ts.
2. Khai báo vocabulary (word, symbol, goalKey), review, chữ/âm, mẫu câu và mapping mục tiêu; gọi createVocabularyQuestionPool trong content.ts, không cần viết lại từng câu.
3. Thêm ảnh và thu voice: voiceRoot chứa `<word>.wav` và `<sentenceVoicePrefix><word>.wav`.
4. Gọi createEnglishGameConfigs tạo đủ 4 config, nối page/GameClient theo Bài 2. Đăng ký lesson-catalog, progress-config, lesson map và chatbot. Không sửa engine hoặc tracking.

Template hỗ trợ nhận biết từ, ghép hình, nghe từ/câu, hiểu câu, điền danh từ, chữ hoa/thường và âm đầu. Kiến thức dạng khác cần template mới; vẫn dùng lại 4 bộ chuyển đổi game.

## Âm thanh

Thư mục public/games/lessons/lop-1/tieng-anh/bai-2/voices có 8 WAV tạo bằng Microsoft Zira Desktop (en-US), rate -2:

- cup.wav, cake.wav, cat.wav, car.wav: đọc từ.
- i-have-a-cup.wav, i-have-a-cake.wav, i-have-a-cat.wav, i-have-a-car.wav: đọc “I have a <word>.”

Đây là giọng tổng hợp. Thay bằng bản thu cùng tên/định dạng không cần sửa game. Câu âm /k/ yêu cầu nghe từ và nhận biết âm đầu, không dùng tên chữ C thay cho âm /k/.

## Ảnh

Built-in image_gen tạo public/games/lessons/lop-1/tieng-anh/bai-2/images/vocabulary.png. Atlas thực tế 1254×1254, bốn ô 627×627: cat, car, cup, cake. Không sửa ảnh Bài 1.

Cả 4 game dùng bản tối ưu tại public/games/lessons/lop-1/tieng-anh/bai-2/images/optimize/vocabulary.png, cùng kích thước và vị trí các hình.

Prompt: “Use case: illustration-story. Create ONE vocabulary sprite atlas for a Vietnamese grade 1 English learning game, based on the user's reference (blue friendly cat, green toy car, white cup with blue rim, yellow cupcake with cherry). Square 1024x1024 image, plain white background, strict 2x2 equal grid with NO drawn grid lines: top-left one blue sitting cat; top-right one green toy car; bottom-left one white teacup with blue rim and handle; bottom-right one yellow cupcake with red cherry. Each object entirely contained within its own quadrant with generous 60 pixel padding, centered. Bright simple children's textbook watercolor cartoon, clean outlines, recognizable silhouettes. No text, no letters, no numbers, no other objects. This is a single atlas asset.”

## Kiểm tra

- npm run typecheck
- node scripts/test-english-1-bai-2.cjs
- node scripts/test-chat-learning-progress.cjs
