/** Keep this example in sync with the corresponding lesson route. */
export const GAME_LINK_EXAMPLE = `- Nếu người dùng nói “chơi Đào vàng” hoặc “gửi link Đào vàng” mà chưa chỉ rõ bài học, trả lời ngắn gọn và gửi /game/lop-1/toan/bai-1/gold-mining. Nếu đã chỉ rõ lớp, môn hoặc bài học, gửi route Đào vàng tương ứng trong danh sách bên dưới.`

/** Update when lessons are added or game routes change. */
export const GAME_LESSON_ROUTES_TRAINING = `
#Tất cả đường dẫn chơi game chính xác:
- Demo Cappy World 3D: /game/demo-3d. Từ Home World, bé qua cầu đến vùng Tiếng Việt (/game/demo-3d/tieng-viet), xuống thuyền ra đảo Toán (/game/demo-3d/toan), hoặc nhảy lên đài phóng và xác nhận bay đến Vũ trụ Tiếng Anh 3D (/game/demo-3d/tieng-anh). Tại Vũ trụ Tiếng Anh, hành tinh bài 1 và 2 dẫn đến trang bài tương ứng; các hành tinh khóa chưa chơi được.
- Hiện có 9 bài học có game: Toán lớp 1 bài 1 và bài 2, Tiếng Việt lớp 1 tuần 1 đến tuần 4, Tiếng Anh lớp 1 bài 1 và bài 2, Toán lớp 2 bài 1; ngoài ra có luyện tập phép cộng đến 10.
- Mỗi bài trên có Bắn bóng, Kéo thả, Đào vàng, Đua xe. Riêng Toán lớp 1 bài 2 có thêm Nhặt trứng. Luyện cộng đến 10 dùng game Bắn bóng, không phải một thể loại game riêng.
- Toán lớp 1, bài 1 “Các số từ 0 đến 5”, trang chọn trò chơi:
/game/lop-1/toan/bai-1
- Toán lớp 1, bài 1, Đào vàng — luyện nhìn hình và đếm số:
/game/lop-1/toan/bai-1/gold-mining
- Toán lớp 1, bài 1, Đua xe — nhận biết số từ 0 đến 5:
/game/lop-1/toan/bai-1/racing
- Toán lớp 1, bài 1, Kéo thả số — nhận biết, đếm và sắp xếp số từ 0 đến 5:
/game/lop-1/toan/bai-1/drag-drop
- Toán lớp 1, bài 1, Bắn bong bóng — nhận biết số từ 0 đến 5:
/game/lop-1/toan/bai-1/bubble-shooter
- Toán lớp 1, bài 2 “Các số 6, 7, 8, 9, 10”, trang chọn trò chơi:
/game/lop-1/toan/bai-2
- Toán lớp 1, bài 2, Đào vàng — đếm và nhận biết các số 6 đến 10:
/game/lop-1/toan/bai-2/gold-mining
- Toán lớp 1, bài 2, Đua xe — số lượng, dãy số và ghép số với số lượng:
/game/lop-1/toan/bai-2/racing
- Toán lớp 1, bài 2, Kéo thả số — đếm, dãy số, sắp xếp và thêm cho đủ:
/game/lop-1/toan/bai-2/drag-drop
- Toán lớp 1, bài 2, Bắn bong bóng — luyện tổng hợp các số 6 đến 10:
/game/lop-1/toan/bai-2/bubble-shooter
- Toán lớp 1, luyện tập phép cộng trong phạm vi 10:
/game/lop-1/toan/luyen-tap/cong-den-10
- Toán lớp 1, bài 2, Nhặt trứng (còn gọi là săn trứng) — lắc xúc xắc và nhặt đủ 6 trứng:
/game/lop-1/toan/bai-2/egg-hunt
- Tiếng Việt lớp 1, tuần 1 “A, B, C, E, Ê”, trang chọn trò chơi — nội dung tổng hợp Bài 1–5: nhận biết a/b/c/e/ê, hoa/thường, nghe và tìm chữ trong từ; dấu huyền/sắc; ghép và đọc ba/bà/ba ba, ca/cà/cá, bè/bé/bế. Truyện “Búp bê và dế mèn” được lưu metadata, chưa đưa vào câu hỏi:
/game/lop-1/tieng-viet/tuan-1
- Tiếng Việt lớp 1, tuần 1, Bắn bóng:
/game/lop-1/tieng-viet/tuan-1/bubble-shooter
- Tiếng Việt lớp 1, tuần 1, Kéo thả:
/game/lop-1/tieng-viet/tuan-1/drag-drop
- Tiếng Việt lớp 1, tuần 1, Đào vàng:
/game/lop-1/tieng-viet/tuan-1/gold-mining
- Tiếng Việt lớp 1, tuần 1, Đua xe:
/game/lop-1/tieng-viet/tuan-1/racing
- Tiếng Việt lớp 1, tuần 2 “O, Ô, Ơ, D, Đ”, trang chọn trò chơi — nội dung tổng hợp Bài 6–10; nhận biết chữ và hoa/thường, tìm chữ trong tiếng/từ, dấu hỏi/nặng/ngã, đọc tiếng/từ/câu ngắn. Truyện “Đàn kiến con ngoan ngoãn” chỉ có metadata, chưa đưa vào câu hỏi hay narration:
/game/lop-1/tieng-viet/tuan-2
- Tiếng Việt lớp 1, tuần 2, Bắn bóng:
/game/lop-1/tieng-viet/tuan-2/bubble-shooter
- Tiếng Việt lớp 1, tuần 2, Kéo thả:
/game/lop-1/tieng-viet/tuan-2/drag-drop
- Tiếng Việt lớp 1, tuần 2, Đào vàng:
/game/lop-1/tieng-viet/tuan-2/gold-mining
- Tiếng Việt lớp 1, tuần 2, Đua xe:
/game/lop-1/tieng-viet/tuan-2/racing
- Tiếng Việt lớp 1, tuần 3 “I, K, H, L, U, Ư, CH, KH”, trang chọn trò chơi — nội dung tổng hợp Bài 11–15; nhận biết và ghép chữ hoa/thường, phân biệt i/k, h/l, u/ư, ch/kh như phụ âm đầu, tìm chữ trong tiếng/từ, ghép và đọc tiếng/từ/câu ngắn. Truyện “Con quạ thông minh” chỉ có metadata, chưa đưa vào câu hỏi hay narration:
/game/lop-1/tieng-viet/tuan-3
- Tiếng Việt lớp 1, tuần 3, Bắn bóng:
/game/lop-1/tieng-viet/tuan-3/bubble-shooter
- Tiếng Việt lớp 1, tuần 3, Kéo thả:
/game/lop-1/tieng-viet/tuan-3/drag-drop
- Tiếng Việt lớp 1, tuần 3, Đào vàng:
/game/lop-1/tieng-viet/tuan-3/gold-mining
- Tiếng Việt lớp 1, tuần 3, Đua xe:
/game/lop-1/tieng-viet/tuan-3/racing
- Tiếng Việt lớp 1, tuần 4 “M, N, G, GI, GH, NH, NG, NGH”, trang chọn trò chơi — nội dung tổng hợp Bài 16–20; nhận biết và ghép chữ hoa/thường, phân biệt m/n, g/gi, gh/nh, ng/ngh, tìm âm đầu trong tiếng/từ, ghép tiếng và đọc tiếng/từ/câu ngắn. Truyện “Cô chủ không biết quý tình bạn” chỉ lưu metadata, chưa đưa vào câu hỏi hay narration. Các câu nghe chờ bổ sung voice thu âm:
/game/lop-1/tieng-viet/tuan-4
- Tiếng Việt lớp 1, tuần 4, Bắn bóng:
/game/lop-1/tieng-viet/tuan-4/bubble-shooter
- Tiếng Việt lớp 1, tuần 4, Kéo thả:
/game/lop-1/tieng-viet/tuan-4/drag-drop
- Tiếng Việt lớp 1, tuần 4, Đào vàng:
/game/lop-1/tieng-viet/tuan-4/gold-mining
- Tiếng Việt lớp 1, tuần 4, Đua xe:
/game/lop-1/tieng-viet/tuan-4/racing
- Toán lớp 2, bài 1 “Ôn tập các số đến 100”, trang chọn trò chơi — nhận biết, đọc viết số đến 100; chục và đơn vị; lập và phân tích số; so sánh, thứ tự số; bảng số 1–100; ước lượng và đếm; lập số có hai chữ số:
/game/lop-2/toan/bai-1
- Toán lớp 2, bài 1, Bắn bóng:
/game/lop-2/toan/bai-1/bubble-shooter
- Toán lớp 2, bài 1, Kéo thả:
/game/lop-2/toan/bai-1/drag-drop
- Toán lớp 2, bài 1, Đào vàng:
/game/lop-2/toan/bai-1/gold-mining
- Toán lớp 2, bài 1, Đua xe:
/game/lop-2/toan/bai-1/racing
- Tiếng Anh lớp 1, bài 1 “In the school playground”, trang chọn trò chơi — học ball, Bill, book, bike, chào hỏi “Hi, I’m + tên” và tạm biệt “Bye, + tên”:
/game/lop-1/tieng-anh/bai-1
- Tiếng Anh lớp 1, bài 1, Đào vàng:
/game/lop-1/tieng-anh/bai-1/gold-mining
- Tiếng Anh lớp 1, bài 1, Đua xe:
/game/lop-1/tieng-anh/bai-1/racing
- Tiếng Anh lớp 1, bài 1, Kéo thả:
/game/lop-1/tieng-anh/bai-1/drag-drop
- Tiếng Anh lớp 1, bài 1, Bắn bong bóng (Bắn bóng):
/game/lop-1/tieng-anh/bai-1/bubble-shooter

#Các trang chọn lớp, môn và bài học:
- Tiếng Anh lớp 1, bài 2 “In the dining room”, đã có đủ 4 game. Có 10 mục tiêu: nhận biết cup, cake, cat, car, chữ C/c, âm /k/, ghép từ với hình, nghe và chọn, hiểu và hoàn thành “I have a + noun”. Câu hỏi và đáp án random mỗi lượt; ball, bike, book chỉ ôn tập hoặc làm đáp án nhiễu, không có mục tiêu riêng trong bài 2:
/game/lop-1/tieng-anh/bai-2
- Tiếng Anh lớp 1, bài 2, Bắn bóng:
/game/lop-1/tieng-anh/bai-2/bubble-shooter
- Tiếng Anh lớp 1, bài 2, Kéo thả:
/game/lop-1/tieng-anh/bai-2/drag-drop
- Tiếng Anh lớp 1, bài 2, Đào vàng:
/game/lop-1/tieng-anh/bai-2/gold-mining
- Tiếng Anh lớp 1, bài 2, Đua xe:
/game/lop-1/tieng-anh/bai-2/racing
- Trang tổng hợp trò chơi học tập:
/game
- Lớp 1, trang chọn môn:
/game/lop-1
- Toán lớp 1, trang chọn bài học:
/game/lop-1/toan
- Tiếng Anh lớp 1, trang chọn bài học:
/game/lop-1/tieng-anh
- Tiếng Việt lớp 1, trang chọn tuần học (tuần 1 đã có game):
/game/lop-1/tieng-viet
- Lớp 2, trang chọn môn:
/game/lop-2
- Toán lớp 2, trang chọn bài học (bài 1 đã có game):
/game/lop-2/toan

#Các route đã có nhưng nội dung đang chuẩn bị:
Không giới thiệu các trang dưới đây là game đã chơi được. Nếu người dùng hỏi, nói rõ nội dung đang chuẩn bị; không tự tạo route game con.
- Toán lớp 1, bài 3:
/game/lop-1/toan/bai-3
- Tiếng Việt lớp 1: các tuần 5 đến 17 đang chuẩn bị, chưa có game con để chơi. Tuần 1, 2, 3 và 4 có đủ 4 trò chơi, 25 câu mỗi lượt. Tuần 3 và 4 hiện còn thiếu một phần voice thu âm nên dạng nghe đang chờ bổ sung voice; các dạng câu chữ vẫn chơi được. Tiếng Anh lớp 1: các bài 3 đến 16 đang chuẩn bị, chưa có game con để chơi.
- Toán lớp 2: các bài 2 đến 10 đang chuẩn bị, chưa có game con để chơi.
- Toán lớp 2, bài 2:
/game/lop-2/toan/bai-2
- Tiếng Anh lớp 2:
/game/lop-2/tieng-anh
- Tiếng Việt lớp 2:
/game/lop-2/tieng-viet
- Lớp 3:
/game/lop-3
- Lớp 4:
/game/lop-4
- Lớp 5:
/game/lop-5
`.trim()
