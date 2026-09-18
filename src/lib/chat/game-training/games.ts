/** Update when game titles or gameplay change. */
export const GAME_CATALOG_TRAINING = `
#Hệ thống game hiện tại có các game:

- Bắn bóng (còn gọi là Bắn bong bóng):
  - Đây là khung game bắn đáp án có thể tái sử dụng cho nhiều bài học; nội dung câu hỏi và đáp án thay đổi theo bài, không giới hạn ở một bài nhận biết số cụ thể.
  - Mỗi lượt có 10 màn. Bé đọc câu hỏi, ngắm và bắn vào bong bóng mang đáp án đúng. Các bong bóng đáp án bay trên màn hình và vị trí được thay đổi để bé quan sát.
  - Game có nhiều loại đạn, hiệu ứng bắn và tiếng nổ bong bóng. Trả lời đúng được cộng 10 điểm; bắn sai bị trừ 2 điểm nhưng tổng điểm không xuống dưới 0.
  - Có voice mở đầu, voice động viên khi đúng, voice nhắc thử lại khi sai, âm thanh bắn súng, âm thanh bong bóng và voice chúc mừng khi hoàn thành.
  - Sói xuất hiện ở đúng 4 màn được chọn ngẫu nhiên trong nhóm màn 3 đến 10. Sói ẩn nấp rồi bắn tên làm vỡ một bong bóng và cười, tạo thêm thử thách nhưng không thay đổi đáp án của câu hỏi.

- Đào vàng:
  - Đây là khung game chọn đáp án bằng cần câu, dùng cho cả Toán, Tiếng Việt và Tiếng Anh. Bé đọc hoặc nghe yêu cầu rồi thả móc câu vào đáp án đúng; nội dung số, chữ hoặc từ vựng phụ thuộc bài đang chọn.
  - Game có 10 màn. Mỗi màn hiển thị một nhiệm vụ và nhiều lựa chọn; bé canh hướng móc câu để kéo đáp án lên.
  - Kéo đúng được cộng 10 điểm; kéo sai bị trừ 2 điểm nhưng tổng điểm không xuống dưới 0.
  - Có voice hướng dẫn mở đầu, âm thanh thả và kéo dây, tiếng nhận vật, voice phản hồi đúng hoặc sai và voice chúc mừng khi hoàn thành.
  - Sói xuất hiện ở đúng 4 màn được chọn ngẫu nhiên trong nhóm màn 3 đến 10. Sói chạy vào lấy một lựa chọn sai. Bé có thể dùng móc câu bắt Sói; game ghi lại số lần bắt được Sói và có voice tiếng Sói cười.

- Đua xe:
  - Đây là khung game chọn đáp án theo làn đường, có thể thay câu hỏi để dùng cho nhiều bài học. Bé điều khiển xe sang trái hoặc phải để đi qua cổng mang đáp án đúng.
  - Game có 10 màn. Câu hỏi có thể yêu cầu đếm đồ vật, ghép số với số lượng hoặc tìm số còn thiếu trong dãy. Có thể điều khiển bằng phím trái/phải hoặc thao tác vuốt.
  - Chọn đúng được cộng 10 điểm và xe tăng tốc; chọn sai bị trừ 2 điểm, xe chậm lại và bé được thử lại, tổng điểm không xuống dưới 0.
  - Game hiện có nhạc nền, hiệu ứng chuyển động, rung va chạm và phản hồi điểm trực quan; chưa có bộ voice đọc và phản hồi bằng lời như Bắn bong bóng, Đào vàng và Kéo thả số.
  - Game Đua xe hiện không có Sói.

- Kéo thả (Kéo thả số ở bài Toán):
  - Đây là khung game kéo thả đáp án dùng cho cả Toán, Tiếng Việt và Tiếng Anh. Với Toán, bé kéo ô số vào nhóm đồ vật, vị trí còn thiếu hoặc sắp xếp dãy số; nội dung chữ và từ vựng thay đổi theo bài ngôn ngữ đang chọn.
  - Game có 10 màn với dạng đếm, điền số còn thiếu, sắp xếp và thử thách kết hợp. Câu hỏi được làm mới khi chơi lại và có thể điều chỉnh theo tiến trình học của bé.
  - Hoàn thành đúng toàn bộ yêu cầu của một màn được cộng 10 điểm; mỗi lần thả sai bị trừ 2 điểm nhưng tổng điểm không xuống dưới 0.
  - Có Cappy đồng hành, voice hướng dẫn mở đầu, âm thanh kéo thả, voice phản hồi đúng hoặc sai, voice Sói cười và voice chúc mừng khi hoàn thành.
  - Sói xuất hiện ở đúng 4 màn thử thách được chọn ngẫu nhiên trong giai đoạn màn 3 đến 10. Sói có thể lấy một ô số không phải đáp án đúng trong thời gian ngắn rồi mang đi, tạo thêm thử thách cho bé.

- Nhặt trứng (còn gọi là săn trứng):
  - Hiện có tại Toán lớp 1, bài 2. Bé bấm lắc xúc xắc, đếm số chấm rồi chọn một quả trứng có ô số kề cạnh khớp với kết quả xúc xắc.
  - Mục tiêu là nhặt đủ 6 trứng vào giỏ. Nhặt đúng cộng 10 điểm; chọn sai trừ 2 điểm, không thấp hơn 0, và được thử lại. Điểm tối đa 60.
  - Có giọng hướng dẫn, phản hồi đúng/sai, gợi ý sau thời gian chờ, hiệu ứng chúc mừng, chơi lại và xáo trộn số cùng trứng.

- Luyện tập phép cộng trong phạm vi 10:
  - Đây là một phần luyện tập Toán lớp 1 dùng game Bắn bóng. Mỗi lượt có 10 màn với phép cộng ngẫu nhiên có tổng không quá 10; bé bắn bong bóng mang kết quả đúng.
  - Không giới thiệu đây là bài học được đánh số hoặc một thể loại game mới.
`.trim()
