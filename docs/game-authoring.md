# Note thêm bài học `/game`

## Nguyên tắc

Giữ nguyên cấu trúc game; thêm câu hỏi random, voice, mục tiêu bài học qua dữ liệu/config. Sau khi hoàn tất phải cập nhật hướng dẫn chatbot-game. Quy tắc áp dụng cho các lần code sau nằm tại `AGENTS.md` ở gốc repository.

## Cấu trúc đã kiểm tra ngày 2026-09-18

| Thành phần | Vị trí và vai trò |
| --- | --- |
| Route bài học | `src/app/game/<lop>/<mon>/bai-N/`: metadata/mục tiêu trong `lesson.ts`, nội dung trong `content.ts` ở các mẫu mới; `page.tsx` và route game con nối vào component dùng chung. |
| Engine dùng lại | `src/components/games/bubble-shooter`, `drag-drop`, `gold-miner`, `racing`; `egg-hunt` là trò bổ sung ở Toán 1 bài 2, không mặc định thêm vào mọi bài. Slug route Đào vàng là `gold-mining`. |
| Câu hỏi ngôn ngữ | `src/components/games/general/learning-question.ts`: `id`, `goalKey`, `answer`, `options`, voice và thông tin kỹ năng/chế độ nhập, trả lời. |
| Mẫu Tiếng Anh | `src/components/games/english/vocabulary-lesson.ts`, `question-generator.ts`, `create-game-configs.ts`; cấu hình từng bài tại `english/tieng-anh-1-bai-N.ts`. |
| Mẫu Toán | `src/app/game/lop-2/toan/bai-1/{lesson,content,config}.ts`; các bài Toán 1 còn dùng config/lesson riêng ở từng engine. |
| Voice và tài nguyên | `public/games/lessons/<lop>/<mon>/bai-N/`; cơ chế phát dùng chung tại `src/components/games/general/`. Voice Toán xem thêm `docs/math-voices.md`. |
| Danh mục tracking | `src/components/games/general/tracking/lesson-catalog.ts`: `LESSON_CATALOG`, `LESSON_IDS`, kiểu `LessonId` và `LearningKey`. |
| Bản đồ và tiến độ | `src/components/games/lesson-map/{data,englishData,vietnameseData,progress-config}.ts`; Toán lớp 2 dùng `TOAN_2_MATH_LESSONS` trong `src/app/game/lop-2/toan/bai-1/lesson.ts`. |
| Điều hướng | `src/components/games/navigation/catalog.ts` và trang chọn bài/môn tương ứng: rà soát nơi cần đăng ký hoặc đổi trạng thái bài. |
| Chatbot-game | `src/lib/chat/game-training/index.ts` ghép `base.ts`, `games.ts`, `lesson-routes.ts`; `src/lib/chat/constants.ts` dùng nội dung này cho chatbot game. |

Đánh giá: đủ rõ để thêm bài có cùng dạng với mẫu hiện tại mà không sửa engine. Chưa phải một template thống nhất cho mọi môn: Toán và ngôn ngữ có adapter khác nhau; đăng ký bài, tiến độ và chatbot vẫn cần cập nhật nhiều file thủ công. Không giả định chỉ thêm `content.ts` là bài tự xuất hiện ở mọi nơi. Đây là đánh giá cấu trúc mã nguồn, không phải xác nhận toàn bộ game đã chạy đúng trên trình duyệt.

## Quy trình thêm bài

1. Chọn mẫu cùng môn và dạng kiến thức. Tiếng Anh từ vựng/câu đơn: xem `docs/tieng-anh-1-bai-2.md` và bài tương ứng. Toán: xem `docs/toan-2-bai-1.md`. Tiếng Việt: xem `src/app/game/lop-1/tieng-viet/bai-1/` và `src/components/games/vietnamese/tieng-viet-1-bai-1.ts`.
2. Khai báo ID, tên và mục tiêu bài trong `lesson.ts`; đăng ký catalog để có kiểu ID/key hợp lệ. Không đổi key của bài cũ.
3. Tạo pool/generator câu hỏi. Dùng `loadQuestions`/`loadLevels` theo vòng đời hiện có để tạo lượt mới; xáo trộn câu và lựa chọn, giữ đúng quan hệ đáp án–voice–mục tiêu. Không bắt buộc hai lượt random phải khác nhau tuyệt đối.
4. Bảo đảm bao phủ mục tiêu theo số vòng và game được chọn. Factory Tiếng Anh hiện đặt 10 vòng, Đua xe lấy 3 lựa chọn và các game khác lấy 4; không mặc định factory phù hợp với mọi số mục tiêu hoặc dạng kiến thức mới.
5. Bổ sung voice và tài nguyên riêng của bài; kiểm tra file tồn tại, nội dung đọc đúng và cơ chế dừng/phát lại hoạt động. Không tự tạo hệ thống audio khác.
6. Nối config vào engine có sẵn qua route `page.tsx`/`GameClient.tsx` theo mẫu. Với dữ liệu ban đầu và random, giữ vòng đời render/hydration hiện có.
7. Cập nhật danh mục, bản đồ, trạng thái phát hành và tiến độ. Chỉ khai báo game đã có route chơi thực tế; giữ nguyên điều kiện hoàn thành của các bài đã phát hành.
8. Cập nhật `src/lib/chat/game-training/lesson-routes.ts`: tổng số bài nếu có, tên/mục tiêu, trang chọn game và các route con. Bỏ bài mới khỏi danh sách đang chuẩn bị; sửa cả khoảng bài đang chuẩn bị nếu cần. Rà soát `games.ts`/`base.ts` để tránh mô tả mâu thuẫn. Không giới thiệu game chưa triển khai.

## Checklist hoàn tất

- Route bài và từng game mở được; nội dung đúng bài, không sót ID/title/voice của mẫu.
- Câu hỏi random và đáp án đúng được giữ lại sau khi chọn/xáo trộn lựa chọn; goal key thuộc bài, số vòng và phân bố mục tiêu đúng thiết kế.
- Voice/ảnh được tải đúng; nghe thử voice, phát lại và chuyển câu trên trình duyệt.
- Chơi thử, trả lời đúng/sai, hoàn tất và chơi lại; kiểm tra tracking đúng lesson/game/mục tiêu và tiến độ hiển thị đúng.
- Bản đồ/trang chọn bài và chatbot cùng phản ánh trạng thái phát hành, tên bài, mục tiêu và các route thực tế.
- Chạy `npm run typecheck` khi có thay đổi code. Chọn kiểm tra liên quan: `node scripts/test-game-voices.cjs`, `node scripts/test-math-voices.cjs`, `node scripts/test-chat-learning-progress.cjs`, `npm run test:game-me`. `node scripts/test-english-1-bai-2.cjs` chỉ kiểm tra mẫu Tiếng Anh bài 2, không tự kiểm tra mọi bài mới.
- Ghi lại kết quả, giới hạn và kiểm tra chưa thực hiện; không coi kiểm tra tĩnh hoặc audio mock là thay thế nghe/chơi thực tế.
