# Bối cảnh kỹ thuật để phân tích và phát triển Toán lớp 1 - Bài 2

Tài liệu này dùng làm đầu vào cho ChatGPT/Codex trước khi viết code cho route mới:

`/game/lop-1/toan/bai-2/`

## Yêu cầu dành cho AI

Hãy đọc toàn bộ tài liệu này và các file được liệt kê, sau đó:

1. Phân tích kiến trúc game hiện tại và đề xuất cách tái sử dụng engine/gameplay cho Bài 2, không sao chép nguyên component rồi đổi tên.
2. Tách dữ liệu bài học khỏi engine ở những nơi đang gắn cứng Bài 1.
3. Thiết kế `lesson.ts`, learning keys, bộ sinh câu hỏi và các route game cho Bài 2.
4. Giữ nguyên trải nghiệm chung: màn hình dọc 9:16, 10 màn, điểm đúng `+10`, sai `-2` nhưng không âm, âm thanh, pause/restart, completion và tracking.
5. Đảm bảo session/progress của Bài 2 dùng `lessonId` và learning key riêng, tuyệt đối không ghi vào `toan-1-bai-1`.
6. Trước khi code, nêu rõ nội dung/chủ đề sư phạm của Bài 2. Nếu đề bài chưa cung cấp nội dung Bài 2 thì phải hỏi, không tự đoán kiến thức cần dạy.
7. Sau khi có nội dung Bài 2, lập kế hoạch theo file, chỉ ra phần dùng chung, phần cần cấu hình hóa và tiêu chí kiểm thử.

## Nguồn training chatbot hiện tại

File chatbot dành riêng cho khu vực game:

`src/lib/chat/game-training.ts`

File này mô tả luật chơi, giọng trả lời và link chính xác của các game. Khi thêm Bài 2 cần cập nhật danh sách game/link tại đây. API chọn training theo ngữ cảnh nằm trong:

`src/app/api/chat/route.ts`

## Bài học đã đăng ký

Bài 1 hiện có metadata tại:

`src/app/game/lop-1/toan/bai-1/lesson.ts`

- `lessonId`: `toan-1-bai-1`
- Tên: Nhận biết số từ 0 đến 5
- Learning keys: `recognize-number-0` đến `recognize-number-5`

Catalog và type dùng chung:

- `src/components/games/general/tracking/lesson-catalog.ts`
- `src/components/games/general/tracking/learning-keys.ts`
- `src/components/games/general/tracking/types.ts`
- `src/components/games/general/tracking/constants.ts`

Khi thêm Bài 2, cần tạo định nghĩa bài học mới và đăng ký vào catalog. Cần xem lại thiết kế `LearningKey`: type hiện được suy ra từ union trong catalog, nhưng helper `getRecognizeNumberKey` đang phụ thuộc trực tiếp learning keys của Bài 1.

## Bốn game hiện có

### 1. Bắn bong bóng

Route hiện tại:

`/game/lop-1/toan/luyen-tap/cong-den-10`

Các file chính:

- `src/components/games/bubble-shooter/PhaserGame.tsx`: React wrapper, nhận event điểm/màn/completion từ Phaser.
- `src/components/games/bubble-shooter/scenes/BubbleMathScene.ts`: scene và vòng đời gameplay.
- `src/components/games/bubble-shooter/systems/QuestionSystem.ts`: sinh/chọn câu hỏi.
- `src/components/games/bubble-shooter/types/game.ts`: `MathQuestion` và `LessonData`.
- `src/components/games/bubble-shooter/systems/ScoreSystem.ts`: cộng/trừ điểm.

Gameplay:

- Người chơi đọc câu hỏi và bắn bong bóng chứa đáp án đúng.
- Có 10 màn; đáp án/bong bóng thay đổi vị trí.
- Đúng cộng 10, sai trừ 2 và điểm không xuống dưới 0.
- Có nhiều loại đạn, hiệu ứng bắn/nổ, voice mở đầu/phản hồi/hoàn thành.
- Sói xuất hiện đúng 4 lần trong nhóm màn 3-10, phá một bong bóng để tăng thử thách.

Mô hình câu hỏi hiện tại:

```ts
interface MathQuestion {
  text: string
  answer: number
  options: number[]
}

interface LessonData {
  id: string
  title: string
  type: 'math-addition'
  questions: MathQuestion[]
}
```

Nếu không truyền `LessonData`, `QuestionSystem` tự sinh phép cộng có tổng không quá 10. Game này hiện chưa nối đầy đủ vào tracker/adaptive chung như ba game Bài 1; đây là khoảng trống cần xử lý nếu dùng cho Bài 2.

### 2. Kéo thả số

Route hiện tại:

`/game/lop-1/toan/bai-1/drag-drop`

Các file chính:

- `src/components/games/drag-drop/DragDropGame.tsx`: toàn bộ UI và gameplay React.
- `src/components/games/drag-drop/types.ts`: schema level.
- `src/components/games/drag-drop/levels.ts`: 10 level, randomizer và adaptive generator.

Gameplay:

- Kéo ô số vào nhóm đồ vật, ô trống của dãy số hoặc sắp xếp dãy.
- 10 màn gồm `count`, `sequence`, `sort`, `mixed`.
- Một màn có thể có nhiều target; chỉ hoàn thành khi điền đúng toàn bộ.
- Đúng cả màn cộng 10; mỗi lần thả sai trừ 2, không âm.
- Cappy đồng hành; có voice, âm thanh kéo thả và completion.
- Sói xuất hiện đúng 4 màn ngẫu nhiên từ màn 3-10 và có thể lấy một ô số không phải đáp án đúng.

Schema chính:

```ts
type DragDropLevel = {
  id: number
  type: 'count' | 'sequence' | 'sort' | 'mixed'
  title: string
  instruction: string
  groups?: CountGroup[]
  sequence?: SequenceCell[]
  answers: Record<string, NumberValue>
}
```

Giới hạn hiện tại: `NumberValue` bị khóa ở `0 | 1 | 2 | 3 | 4 | 5`; component và generator gắn cứng `LESSON_IDS.TOAN_1_BAI_1`. Muốn dùng cho nội dung khác phải cấu hình hóa value domain, lesson id, learning-key mapping và level provider.

### 3. Đào vàng

Route hiện tại:

`/game/lop-1/toan/bai-1/gold-mining`

Các file chính:

- `src/components/games/gold-miner/GoldMinerGame.tsx`: React wrapper.
- `src/components/games/gold-miner/GoldMinerScene.ts`: Phaser scene/state machine.
- `src/components/games/gold-miner/types.ts`: câu hỏi và state.
- `src/components/games/gold-miner/levels.ts`: 10 câu hỏi và adaptive generator.

Gameplay:

- Nhìn nhóm đồ vật, đếm số lượng và canh cần câu vào vật mang số đúng.
- 10 màn, số lựa chọn tăng dần.
- Đúng cộng 10; sai trừ 2, không âm.
- Có âm thanh thả/kéo dây, nhận vật, voice phản hồi và hoàn thành.
- Sói xuất hiện đúng 4 màn ngẫu nhiên từ màn 3-10, lấy một đáp án sai; người chơi có thể dùng móc bắt Sói.

Schema chính:

```ts
type GoldMinerQuestion = {
  id: string
  objectType: TaskObject
  count: number
  correctAnswer: number
  choices: number[]
}
```

Giới hạn hiện tại: câu hỏi chỉ mô hình hóa bài đếm; domain đáp án là 0-5; scene gắn cứng lesson/tracking của Bài 1. Nếu Bài 2 không phải dạng đếm, cần thiết kế question renderer/config phù hợp thay vì ép nội dung vào trường `count`.

### 4. Đua xe

Route hiện tại:

`/game/lop-1/toan/bai-1/racing`

Các file chính:

- `src/components/games/racing/RacingGame.tsx`: React wrapper.
- `src/components/games/racing/RacingScene.ts`: Phaser scene và xử lý điều khiển/va chạm.
- `src/components/games/racing/types.ts`: discriminated union cho câu hỏi.
- `src/components/games/racing/lessons/toan-1-bai-1.ts`: bộ sinh 10 câu Bài 1.

Gameplay:

- Xe chạy trên 3 làn; người chơi chuyển trái/phải để đi qua cổng đáp án đúng.
- Điều khiển bằng phím trái/phải hoặc vuốt.
- 10 màn với 3 dạng: đếm đồ vật, ghép số với số lượng, tìm số còn thiếu.
- Đúng cộng 10 và xe tăng tốc; sai trừ 2, xe chậm lại và được thử lại; điểm không âm.
- Có nhạc nền, chuyển động, rung va chạm và điểm trực quan.
- Hiện không có Sói; voice bằng lời chưa đầy đủ như ba game còn lại.

Schema chính là union:

```ts
type RacingQuestion =
  | { type: 'count'; object: string; quantity: number; options: number[]; answer: number; skill: 'recognize_quantity' | 'recognize_zero' }
  | { type: 'numberToQuantity'; number: number; object: string; quantities: number[]; answer: number; skill: 'number_to_quantity' }
  | { type: 'missingNumber'; sequence: Array<number | null>; options: number[]; answer: number; skill: 'missing_number' }
```

Đây là game đã tách file lesson rõ nhất, nhưng scene vẫn import trực tiếp generator Bài 1 và gắn cứng `LESSON_IDS.TOAN_1_BAI_1`. Nên đưa lesson/config vào constructor hoặc props khi tái sử dụng.

## Hạ tầng dùng chung bắt buộc giữ

- `src/components/games/general/GameShell.tsx`: khung dọc 9:16, người chơi, mute, pause, restart, điểm và tiến độ.
- `src/components/games/general/GameCompletion.tsx`: màn hoàn thành và chờ lưu tracking.
- `src/components/games/general/GameProgress.tsx`: tiến độ màn.
- `src/components/games/general/GameVoiceManager.ts`: quản lý voice.
- `src/components/games/general/useBackgroundMusic.ts`: nhạc nền.
- `src/components/games/general/tracking/game-session.ts`: gom kết quả và lưu session.
- `src/components/games/general/tracking/firestore-game-repository.ts`: gọi API session/progress.
- `src/components/games/general/adaptive.ts`: trộn câu hỏi nhắm vào learning target yếu.

Adaptive chỉ bật khi:

`NEXT_PUBLIC_GAME_ADAPTIVE_ENABLED=true`

Tỷ lệ mặc định là 0.4 và có thể đổi qua `NEXT_PUBLIC_GAME_ADAPTIVE_RATIO`. Target yếu hiện được xác định khi có ít nhất 2 lần thử và accuracy dưới 60%.

## Tracking và dữ liệu

Mỗi session hoàn thành cần có:

- `sessionId`, `lessonId`, `gameId`
- `score`, tổng câu, số đúng, số sai
- thời lượng và thời điểm bắt đầu
- từng kết quả: `learningKey`, đúng/sai, đáp án đúng/chọn, thời gian phản hồi, số lần thử

API liên quan:

- `src/app/api/game-tracking/sessions/route.ts`
- `src/app/api/game-tracking/progress/route.ts`

Khi làm Bài 2 phải kiểm tra validation server chấp nhận lesson id và learning keys mới thông qua lesson catalog.

## Kiến trúc nên hướng tới cho Bài 2

Không tạo bốn bản sao engine. Mỗi game nên nhận một cấu hình bài học, ví dụ:

```ts
type GameLessonConfig<Question> = {
  lessonId: LessonId
  gameId: GameId
  totalRounds: number
  questions: Question[] | (() => Question[])
  supportedTargets: readonly LearningKey[]
  createQuestionForTarget: (target: LearningKey, index: number) => Question
  introVoice?: string
}
```

Route Bài 1 và Bài 2 chỉ chọn config/dataset tương ứng rồi truyền vào engine. Với Phaser, truyền config vào scene qua constructor/init data; không import trực tiếp file lesson trong scene. Với React game, truyền config qua props.

## Các câu hỏi phải chốt trước khi code Bài 2

1. Tên chính xác và mục tiêu kiến thức của Toán lớp 1 - Bài 2 là gì?
2. Bài 2 dùng cả 4 game hay chỉ một số game?
3. Mỗi game vẫn 10 màn hay có số màn khác?
4. Đáp án thuộc miền nào (0-5, 0-10, hình dạng, so sánh, phép tính...)?
5. Có asset/voice mới hay tạm tái sử dụng asset hiện tại?
6. Route mong muốn là trang tổng hợp `/game/lop-1/toan/bai-2/` cùng các route con, hay chỉ một game trực tiếp tại route này?

## Tiêu chí hoàn thành tối thiểu

- Bài 1 vẫn chạy và tracking không thay đổi.
- Bài 2 có metadata, lesson id, learning goals và learning keys riêng.
- Các route Bài 2 không import dataset Bài 1 ngoài phần engine dùng chung.
- Mỗi game hiển thị đúng 10 câu/màn theo nội dung Bài 2 đã được duyệt.
- Đúng/sai, điểm, restart, mute, pause và completion hoạt động.
- Session Bài 2 được lưu với đúng `lessonId` và learning keys.
- Adaptive (khi bật) chỉ lấy tiến trình của Bài 2 và chỉ tạo target game hỗ trợ.
- Link Bài 2 được thêm vào `/game`, sitemap nếu cần, và `src/lib/chat/game-training.ts`.
- TypeScript/build/lint/tests của dự án đều đạt.

