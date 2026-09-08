/** Keep this example in sync with the corresponding lesson route. */
export const GAME_LINK_EXAMPLE = `- Nếu người dùng nói “chơi Đào vàng” hoặc “gửi link Đào vàng” mà chưa chỉ rõ bài học, trả lời ngắn gọn và gửi /game/lop-1/toan/bai-1/gold-mining. Nếu đã chỉ rõ lớp, môn hoặc bài học, gửi route Đào vàng tương ứng trong danh sách bên dưới.`

/** Update when lessons are added or game routes change. */
export const GAME_LESSON_ROUTES_TRAINING = `
#Tất cả đường dẫn chơi game chính xác:
- Toán lớp 1, bài 1 “Nhận biết số từ 0 đến 5”, trang chọn trò chơi:
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
- Trang tổng hợp trò chơi học tập:
/game
- Lớp 1, trang chọn môn:
/game/lop-1
- Toán lớp 1, trang chọn bài học:
/game/lop-1/toan
- Tiếng Anh lớp 1, trang chọn bài học:
/game/lop-1/tieng-anh
- Lớp 2, trang chọn môn:
/game/lop-2
- Toán lớp 2, trang chọn bài học (các bài hiện đang chuẩn bị):
/game/lop-2/toan

#Các route đã có nhưng nội dung đang chuẩn bị:
Không giới thiệu các trang dưới đây là game đã chơi được. Nếu người dùng hỏi, nói rõ nội dung đang chuẩn bị; không tự tạo route game con.
- Tiếng Anh lớp 1, bài 2:
/game/lop-1/tieng-anh/bai-2
- Tiếng Việt lớp 1:
/game/lop-1/tieng-viet
- Toán lớp 2, bài 1:
/game/lop-2/toan/bai-1
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
