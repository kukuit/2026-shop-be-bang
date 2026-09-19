# Hướng dẫn cho các lần code trong repository

## Chuẩn engine `bubble-shooter` đã được duyệt

Người dùng đã xác nhận OK toàn bộ các chỉnh sửa engine bắn bóng trong phiên này, bao gồm bản sửa dấu check cho bài Tiếng Việt. Đây là chuẩn dùng chung cho bài cũ và bài mới, không phải tùy chỉnh riêng của Tiếng Anh 1 bài 2.

- Tất cả bài bắn bóng cũ và mới dùng `src/components/games/bubble-shooter/PhaserGame.tsx` và `BubbleMathScene`; cấu hình bài chỉ cung cấp nội dung, mục tiêu, voice và tài nguyên riêng. Không thêm cấu hình bảng/font/vị trí nút loa riêng cho từng bài.
- Khung game chuẩn là 720 × 1280. Bảng câu hỏi rộng 672, cao 200, left 24, mép trên 77.5 theo tọa độ game; giữ nguyên các thông số này khi thêm bài.
- Dùng ảnh `/games/bubble-shooter/images/optimize/question-panel-shared.png`. Ảnh phải đúng tỷ lệ 672:200 để không ép méo viền, lá và ô tròn của nút loa.
- Chữ câu hỏi dùng Nunito đóng gói tại `public/games/fonts/Nunito.ttf`, qua `general/question-typography.ts`; tải font trước khi Phaser đo chữ. Giữ màu chữ và dấu check xanh đã duyệt. Dàn dòng/co chữ theo vùng an toàn của bảng, không cắt nội dung hoặc để tràn viền; không tự đổi kích thước bảng khi gặp câu dài.
- Bảng dùng size cuối cùng 672 × 200, không dùng lại chiều cao thử nghiệm 280. Với câu chữ thông thường, dùng `fitQuestionWords` để xuống dòng và co theo cả chiều rộng lẫn chiều cao; chừa chỗ cho dấu tiếng Việt, viền chữ và dấu check. Câu dài có thể cần nhiều dòng (bao gồm 3 dòng); không cố định một cỡ chữ lớn cho mọi câu.
- Giữ bảng màu chữ hiện có: xanh dương `#2563eb`, xanh lá `#22c55e`, tím `#a855f7`, cam `#f59e0b`, xanh ngọc `#0891b2`; dấu hỏi màu `#ef2f36`. Nhánh câu nghe giữ màu xanh dương. Không đổi màu hoặc kiểu trình bày riêng của nội dung hình/số khi thêm bài.
- Tất cả nhánh câu hỏi phải dùng `renderQuestionCheck` trong `BubbleMathScene`: câu chữ/phép tính, câu nghe (`voice`/audio), câu ảnh, nhận biết số (`recognizeNumber`) và hoàn thành số lượng (`completeQuantity`). Khi trả lời đúng, hiện đúng một dấu `✓` xanh `#22c55e`, cỡ 44px, đậm, font `Arial Black, Arial, sans-serif`, viền trắng 4px và bóng xanh hiện có. Dấu check là phần riêng bên phải nội dung, không ghép vào chuỗi câu hỏi; giữ trong bảng và tránh nút voice. Nhánh có `return` sớm vẫn phải vẽ check khi `showCheck` là true. Xóa check khi chuyển câu/chơi lại; không dùng kiểu check riêng theo bài hoặc dạng câu.
- Nút voice nằm giữa ô tròn trên ảnh bảng: tâm tại (1220, 300) trên ảnh 1344 × 400, icon 46 × 46 trên khung game chuẩn, vùng bấm 44 × 44. Vị trí và kích thước thuộc engine dùng chung.
- Icon voice dùng `/games/bubble-shooter/images/voice-speaker-shared.png`; bảng dùng ảnh trong `optimize` như trên. Giữ viền vàng, nền kem, lá xanh và tỷ lệ tự nhiên của ô tròn; không kéo méo ảnh để khớp bảng.
- Luôn hiện nút voice trong bảng. Nếu câu không có `voice`, `instructionVoice`, `voiceSequence` hoặc `voiceFallback` hợp lệ thì làm mờ, tô xám và không gắn tương tác. Voice mở đầu/phản hồi của game không được coi là voice của câu hỏi. Nếu có voice, phát lại qua cơ chế chung hiện có; không tạo hệ thống audio riêng.
- Trạng thái không có voice dùng alpha 0.28 và tint `#999999`. Chỉ phát lại khi game đã bắt đầu, không tạm dừng và câu đang ở trạng thái `PLAYING`; không cho bấm phát lại khi đã hiện check đúng. Dọn nút cũ khi dựng câu mới để không chồng icon hoặc listener.
- Phạm vi kế thừa hiện có: Toán 1 bài 1, bài 2, luyện tập cộng đến 10; Tiếng Anh 1 bài 1, bài 2; Tiếng Việt 1 bài 1; Toán 2 bài 1. Đã bỏ `questionLayout` riêng của Toán 2 bài 1; không đưa ngoại lệ này trở lại khi thêm nội dung.
- Khi sửa giao diện chung, rà soát cả bài cũ (Toán, Tiếng Anh, Tiếng Việt và luyện tập), giữ nguyên nội dung, cách tính điểm và tracking. Các thay đổi về chuẩn giao diện cần được người dùng xác nhận trước khi cập nhật các thông số đã chốt trong mục này.
- Kiểm tra hồi quy khi sửa engine: câu ngắn/dài và dấu tiếng Việt; đúng/sai rồi chuyển câu/chơi lại; check ở đủ 5 nhánh kể trên; voice có/không có, phát lại và tạm dừng; ảnh optimize tải đúng và không méo. Chạy typecheck và các kiểm tra nội dung/voice liên quan theo `docs/game-authoring.md`. Kiểm tra mô phỏng không thay thế chơi thử trên trình duyệt; báo rõ phần chưa kiểm tra.

## Chuẩn engine `drag-drop` đã được duyệt

Người dùng đã duyệt engine kéo thả sau khi chỉnh Tiếng Anh 1 bài 2 và áp dụng thử Toán 2 bài 1. Áp dụng chung cho mọi bài kéo thả cũ và mới.

- Dùng `src/components/games/drag-drop/DragDropGame.tsx`, `DragDropGame.module.css` và `FittedTileContent.tsx`. Không sao chép engine, viết CSS ghi đè theo bài hoặc sửa engine mỗi lần thêm nội dung cùng dạng. Phần nới ô đáp án dài của Toán 2 bài 1 đã chuyển vào engine; CSS tại route chỉ còn bọc bố cục ngoài.
- Bài mới khai báo mục tiêu, danh sách/pool câu hỏi và đáp án, hình, voice trong dữ liệu/config theo `DragDropGameConfig` và `DragDropLevel`. Dùng adapter hiện có cho môn/dạng tương ứng; `initialLevels` dùng dữ liệu ban đầu ổn định, `loadLevels` tạo lượt random mới. Gắn đúng `lessonId`, `gameId`, `learningKeys`, kiểu câu, phương thức nhập/trả lời và đáp án từng target; không đổi điểm, luật kéo thả, Cappy/Sói, âm thanh chung hoặc tracking.
- Font chữ là Nunito như bắn bóng. Title phía trên 18–22px, hướng dẫn 15–18px, tự xuống dòng và có giãn dòng dễ đọc. Bỏ emoji/icon trang trí khỏi phần chữ phía trên; giữ hình/ký hiệu mang nội dung trong bảng. Giữ tùy chọn `hideQuestionText` của những dạng bài cũ cần ẩn chữ, không tự đổi mục tiêu hoặc cách hỏi của bài.
- Chữ trong bảng dùng màu từng từ như bắn bóng: `#2563eb`, `#22c55e`, `#a855f7`, `#f59e0b`, `#0891b2`; dấu hỏi đỏ. Chữ câu hỏi thông thường cỡ 18–26px; không áp cỡ chữ lớn của nhóm đồ vật đếm lên câu chữ/số. Giữ khung câu hỏi rộng đầy vùng chứa như đã duyệt, không đổi sang khung co theo độ dài câu.
- Ô dấu hỏi/nhận đáp án nằm bên phải trong dạng nhóm thông thường. Ô nhận đáp án chữ dài được nới theo engine (rộng 42%, cao 64px, giới hạn theo khung); xác định từ tập lựa chọn, không thay đổi kích thước dựa riêng vào đáp án đúng. Dạng điền chữ (`textMatch`) giữ ô trống đúng vị trí trong từ; dãy số và thêm cho đủ giữ cấu trúc riêng hiện có.
- Voice chỉ xuất hiện ở một vị trí: nếu có nút trong bảng thì ẩn nút phía trên. Nút trong và ngoài bảng đều 48 × 48px, icon loa 28px. Với nhóm có một dấu `?` làm nội dung bên trái và có voice, thay dấu đó bằng nút voice trong bảng; giữ ô thả đáp án bên phải. Không thay số, chữ hoặc ảnh có ý nghĩa bằng nút loa. Câu nghe tiếp tục dùng nút trong bảng theo cơ chế hiện có.
- Nhận voice từ `voice`, `instructionVoice`, `voiceSequence`, `voiceFallback`; dùng `QuestionVoicePlayer` và cơ chế `spokenInstruction` hiện có, không tạo hệ thống audio theo bài. Nút bị vô hiệu hóa khi chưa bắt đầu, tắt âm, tạm dừng, chuyển câu hoặc hoàn thành. Câu không có voice không tạo nút phát rỗng.
- Khay 4 đáp án giữ một hàng 4 cột. Với 6 đáp án: chữ/số ngắn hoặc hình dùng 6 cột; nếu có chữ dài hơn 3 ký tự thì dùng 2 hàng × 3 cột, ô cao hơn để dễ đọc. Đo chữ đã chuẩn hóa NFC; khóa dùng để tra ảnh không được coi là chữ dài. Các tập đáp án khác tiếp tục dùng bố cục engine phù hợp, không tự bỏ lựa chọn.
- Nội dung ô đáp án, ô đã thả đúng, khung đang kéo và ô Sói mang đều phải nằm gọn, căn giữa và có padding. Dùng `FittedTileContent` để đo cả chiều rộng/cao và thu tỷ lệ, đo lại khi kích thước/font thay đổi. Ô đáp án và ô đã điền được xuống dòng theo từ trước khi co; animation kéo giữ nội dung gọn trong khung, không để chữ/hình tràn, không cắt mất đáp án.
- Đã áp dụng cùng engine cho 6 màn: Toán 1 bài 1, Toán 1 bài 2, Tiếng Anh 1 bài 1, Tiếng Anh 1 bài 2, Tiếng Việt 1 bài 1 và Toán 2 bài 1. Thay đổi dùng chung phải kiểm tra các dạng câu cũ, không chỉ bài đang chỉnh.
- Khi thêm bài mới vẫn phải tạo route/config và đăng ký danh mục, bản đồ, tiến độ, chatbot theo quy trình bên dưới; dữ liệu nội dung không tự đăng ký các phần này. Nếu dạng kiến thức mới chưa được hỗ trợ, báo rõ phạm vi cần mở rộng thay vì tự đổi engine.
- Kiểm tra: 4/6 đáp án ngắn/dài/hình; dấu tiếng Việt; nội dung trong khay, lúc kéo và sau khi thả; ô đáp án rộng; title dài; vị trí voice không trùng, phát lại/tạm dừng; đúng/sai, chuyển câu, chơi lại và tracking. Chạy typecheck cùng kiểm tra nội dung/voice liên quan. Báo riêng phần kiểm tra tự động và phần chưa chơi thử trên trình duyệt.

## Chuẩn engine đào vàng (`gold-mining`) đã được duyệt

Người dùng đã duyệt game `/game/lop-1/tieng-anh/bai-2/gold-mining` làm chuẩn engine đào vàng dùng chung.

- Slug route là `gold-mining`; mã nguồn engine nằm tại `src/components/games/gold-miner/`, dùng `GoldMinerGame.tsx`, `GoldMinerScene.ts` và config chung. Không tạo bản engine/giao diện/CSS riêng theo bài.
- Cả 6 màn hiện có đã dùng engine này: Toán 1 bài 1, Toán 1 bài 2, Tiếng Anh 1 bài 1, Tiếng Anh 1 bài 2, Tiếng Việt 1 bài 1, Toán 2 bài 1. Giữ nền, bảng câu hỏi, bố cục mỏ, móc kéo, Sói, animation, luật chơi, điểm số, vòng đời, âm thanh và tracking hiện tại.
- Bài mới cùng dạng chỉ bổ sung mục tiêu, danh
  p án và lựa chọn, hình và voice qua `GoldMinerGameConfig`/`GoldMinerQuestion`, adapter môn học và `loadQuestions` hiện có. Gắn đúng `learningKey`, `lessonId`, kiểu câu/phương thức nhập-trả lời. Giữ quan hệ đáp án–hình–voice khi random; không sửa engine để thêm nội dung cùng dạng.
- Bảng câu hỏi dùng `QUESTION_FONT` từ `general/question-typography.ts`: Nunito đóng gói trong dự án, cùng font với drag-drop/bubble-shooter. `GoldMinerGame` đợi `loadQuestionFont()` trước khi tạo Phaser để đo chữ đúng. Chuẩn hóa chữ NFC để hiển thị dấu tiếng Việt.
- Giữ màu chữ bảng `#4a250f`, chữ đậm và căn giữa như đã duyệt; không tự áp màu từng từ của game khác vào đào vàng. Vùng chữ `TASK_TEXT_BOUNDS` là 212 × 208 theo tọa độ game, wrap rộng 204, padding ngang 4/dọc 10 và giãn dòng 4.
- `fitTaskText()` đo lại mỗi câu: reset scale, thử cỡ chữ từ 50 xuống 22px theo bước 2; nếu vẫn vượt vùng chữ thì co đồng đều theo cả chiều rộng/cao. Không cắt nội dung, không để tràn bảng hoặc tự tăng kích thước bảng vì câu dài. Nội dung rất dài có thể bị thu nhỏ nhiều; phải kiểm tra khả năng đọc thực tế.
- Câu ảnh và câu nghe tiếp tục dùng nhánh trình bày, nút voice và cơ chế phát lại hiện có của engine. Voice tiếng Anh tạo theo mục kỹ thuật Microsoft Zira bên dưới; không viết hệ thống phát audio riêng theo bài.
- Tạo route/config và đăng ký danh mục, bản đồ, tiến độ, chatbot theo quy trình thêm bài. Nếu kiến thức mới chưa được engine hỗ trợ thì nêu rõ phạm vi cần mở rộng, không âm thầm đổi cấu trúc chung.
- Khi sửa engine, kiểm tra câu tiếng Anh/Việt ngắn và dài, dấu tiếng Việt, câu ảnh/nghe/đếm, đáp án trên vàng/đá, kéo đúng/sai, Sói, chuyển câu, hoàn thành/chơi lại và tracking. Chạy typecheck, kiểm tra nội dung và voice liên quan; phân biệt kiểm tra tự động với chơi/nghe thực tế. Người dùng duyệt mẫu bài 2 không thay thế kiểm tra trực quan toàn bộ bài cũ.

## Chuẩn engine đua xe (`racing`) đã được duyệt

Người dùng đã duyệt engine tại `/game/lop-1/tieng-anh/bai-2/racing`, gồm cơ chế chờ intro/câu hỏi trước khi vật thể di chuyển. Đây là chuẩn dùng chung, không phải tùy chỉnh riêng theo bài.

- Dùng `src/components/games/racing/RacingGame.tsx`, `RacingScene.ts` và các thành phần engine hiện có. Cả 6 màn đang có dùng chung engine này: Toán 1 bài 1, bài 2; Tiếng Anh 1 bài 1, bài 2; Tiếng Việt 1 bài 1; Toán 2 bài 1. Không sao chép engine hoặc tạo giao diện/vòng đời riêng khi thêm bài.
- Khi intro đang đọc, hiển thị “Bé ơi cùng cappy đua xe chọn đúng đáp án nhé” bằng chữ nhiều màu trong bảng. Đường và animation xe vẫn chạy, bé vẫn điều khiển đổi làn được. Chưa đưa vật thể đáp án vào đường đua. Intro kết thúc mới chuyển sang câu hỏi; không chặn game vô hạn nếu intro không phát được, không có hoặc tắt âm.
- Mỗi lượt thả vật thể: tạo vật thể tại điểm xuất phát, cho đứng yên để bé đọc/nghe. Có voice thì đợi toàn bộ voice câu hỏi kết thúc (kể cả chuỗi, fallback và thời gian đợi voice phản hồi trước đó). Không có voice hoặc đang tắt âm thì giữ vật thể đứng yên 2,5 giây rồi mới di chuyển ở tốc độ bình thường. Không quay lại cơ chế vừa nghe vừa rơi hoặc chạy chậm 25% trong thời gian đọc.
- Trong lúc vật thể chờ, đường và điều khiển xe vẫn hoạt động; Sói chỉ bắt đầu lịch hành động sau khi hết thời gian chờ. Tạm dừng phải giữ nguyên thời gian chờ còn lại; chuyển câu, chơi lại và hủy scene phải dọn trạng thái cũ. Dùng `QuestionVoicePlayer`, `VoiceChannel` và cơ chế voice chung, không đoán thời lượng bằng timeout cố định để thay sự kiện/trạng thái kết thúc voice.
- Font câu hỏi Nunito, màu chữ và cách dàn chữ dùng phần chung đã duyệt; giữ bảng, xe, làn đường, vật thể, animation, điểm số, phản hồi, tracking và luật chơi hiện có. Chỉ thêm mục tiêu, câu hỏi, lựa chọn, hình/voice và config/adapter của bài.

### Sinh câu hỏi riêng cho nhịp đua xe

- **Bắt buộc random câu hỏi mỗi lượt chơi/chơi lại** qua `loadQuestions`/generator hiện có: chọn biến thể trong pool, xáo trộn thứ tự câu và lựa chọn/làn. Giữ đáp án đúng, đáp án nhiễu hợp lệ, mapping hình–voice, learning key và độ bao phủ mục tiêu theo thiết kế. Không dùng một danh sách cố định lặp lại; random không có nghĩa hai lượt phải khác tuyệt đối.
- Câu hỏi racing phải ngắn, rõ, đọc hiểu nhanh và thường chỉ cần một bước trả lời để bé kịp chọn vật thể rơi. Ưu tiên từ/hình, nhận biết, số hoặc phép tính ngắn, câu lệnh đơn; tránh đoạn văn dài, nhiều điều kiện, tính toán nhiều bước và đáp án chữ dài khó đọc trên vật thể.
- Generator/adapter racing phải có cách chọn biến thể hoặc prompt ngắn phù hợp tốc độ phản xạ, không bê nguyên câu dài của kéo thả/đào vàng. Dùng pool hoặc biến thể dành cho racing khi cần, giữ nguyên kiến thức và mục tiêu; không chỉ cắt chuỗi, bỏ điều kiện quan trọng hoặc thu chữ thật nhỏ để ép câu dài vào bảng.
- Mỗi câu có đúng 3 lựa chọn phù hợp 3 làn, bao gồm đáp án đúng và nhiễu hợp lệ, không trùng. Nếu rút gọn câu chữ thì voice phải khớp cách hỏi thực tế và không lộ đáp án. Không tự bỏ mục tiêu khó để chỉ còn câu dễ; nếu mục tiêu không thể hỏi ngắn trong dạng đã hỗ trợ thì báo rõ giới hạn và phạm vi cần mở rộng.
- Quy tắc sinh câu ngắn áp dụng khi thêm/cập nhật nội dung racing. Không âm thầm sửa mục tiêu, voice hoặc dữ liệu tiến độ bài cũ chỉ vì chuẩn hóa engine. Nội dung bài mới vẫn phải đăng ký route, danh mục, bản đồ, tiến độ và chatbot theo quy trình chung.
- Kiểm tra intro, voice câu hỏi, câu không voice/tắt âm, pause/resume, chơi lại; vật thể đứng yên đúng lúc và bắt đầu chạy đúng lúc; điều khiển đổi làn khi chờ; câu hỏi ngắn, random, đúng/sai và tracking. Chạy typecheck, kiểm tra nội dung và voice liên quan; báo rõ phần chưa chơi/nghe thực tế trên trình duyệt.

Đọc file này trước khi thực hiện mỗi yêu cầu code. Khi làm việc với `/game`, đọc thêm `docs/game-authoring.md` và tài liệu của bài học gần nhất cùng môn/dạng câu hỏi.

## Khi thêm bài học mới trong `/game`

### Voice tiếng Anh dùng lại kỹ thuật của Tiếng Anh 1 bài 2

- Chuẩn tạo voice tiếng Anh: giọng tổng hợp **Microsoft Zira Desktop (en-US)** trên Windows, **Rate = -2**, xuất sẵn thành file **WAV**. Tham chiếu `docs/tieng-anh-1-bai-2.md`; máy hiện tại đã kiểm tra có giọng này. Đây là TTS tạo tài nguyên trước khi chơi, không phải bản thu người thật hay gọi dịch vụ tạo voice lúc chơi.
- Dùng PowerShell với `System.Speech.Synthesis.SpeechSynthesizer`: nạp `System.Speech`, chọn chính xác `Microsoft Zira Desktop`, đặt `Rate = -2`, dùng `SetOutputToWaveFile` và `Speak` để xuất từng nội dung, đóng output rồi `Dispose` khi xong. Kiểm tra giọng đã cài trước khi chạy; nếu thiếu thì báo rõ, không âm thầm đổi giọng/tốc độ.
- Lưu tại `public/games/lessons/<lop>/tieng-anh/bai-N/voices/`. Với template từ vựng, dùng `<word>.wav` đọc từ và `<sentenceVoicePrefix><word>.wav` đọc trọn câu; nối qua `voiceRoot`, `sentencePrefix`, `sentenceVoicePrefix` trong `createVocabularyQuestionPool`. Giữ đúng mapping nội dung câu hỏi–file voice khi random.
- Mẫu bài 2 có 8 file: `cup.wav`, `cake.wav`, `cat.wav`, `car.wav` và `i-have-a-cup.wav`, `i-have-a-cake.wav`, `i-have-a-cat.wav`, `i-have-a-car.wav`; nhóm sau đọc “I have a <word>.” Bài mới dùng từ/mẫu câu đúng mục tiêu của bài, không sao chép nguyên nội dung bài 2.
- Lời hướng dẫn tiếng Việt tiếp tục dùng file chung trong `/games/general/voices/`. Phần tiếng Anh dùng file của bài; phát bằng cơ chế voice chung của từng engine, giữ thứ tự hướng dẫn rồi nội dung, phát lại/tạm dừng/dừng khi chuyển câu. Không tạo hệ thống audio riêng.
- Câu hỏi âm đầu phải dùng âm/từ đúng thiết kế: ví dụ bài 2 nghe từ để nhận biết /k/, không dùng tên chữ C thay âm /k/. Với nội dung phát âm mới, nghe kiểm tra giọng tổng hợp trước khi dùng.
- Sau khi tạo: kiểm tra file tồn tại, nội dung và tên file khớp câu hỏi, nghe thử từ/câu ở tốc độ đã chọn và kiểm tra phát lại trong game; chạy kiểm tra voice/nội dung liên quan. Ghi rõ nếu chưa nghe thử. Có thể thay bằng bản thu tốt hơn cùng tên/định dạng mà không sửa engine.

### Quy tắc chung

- Giữ nguyên cấu trúc game hiện có: tái sử dụng engine, giao diện, luật chơi, vòng đời, tính điểm, âm thanh chung và tracking. Không nhân bản hoặc refactor engine chỉ để thêm bài.
- Phần nội dung mới chỉ gồm câu hỏi được random mỗi lượt, voice tương ứng và mục tiêu bài học; thêm ảnh riêng nếu nội dung cần. Dùng config/adapter hiện có để nối nội dung vào game.
- Được thêm các file route, config và đăng ký bài cần thiết theo mẫu hiện có. Không hiểu “giữ nguyên cấu trúc” là bỏ qua danh mục bài, bản đồ hoặc tiến độ.
- Mỗi câu phải gắn đúng mục tiêu của bài. Random phải giữ đáp án đúng, đáp án nhiễu hợp lệ và độ bao phủ mục tiêu theo thiết kế bài; không thay đổi mục tiêu hoặc dữ liệu tiến độ của bài cũ.
- Voice phải khớp câu hỏi thực tế và dùng cơ chế phát voice hiện có.
- Sau khi thêm xong, bắt buộc cập nhật hướng dẫn chatbot-game tại `src/lib/chat/game-training/lesson-routes.ts`: tên bài, mục tiêu, game đã có, đường dẫn chính xác và trạng thái đã chơi được/đang chuẩn bị. Rà soát `games.ts` và `base.ts` trong cùng thư mục nếu thông tin liên quan thay đổi.
- Kiểm tra theo checklist trong `docs/game-authoring.md`; báo rõ phần đã kiểm tra và phần chưa kiểm tra.
- Nếu dạng kiến thức mới chưa được hỗ trợ, nêu rõ giới hạn và phạm vi cần mở rộng. Không tự đổi cấu trúc game chung trong yêu cầu chỉ thêm bài.
