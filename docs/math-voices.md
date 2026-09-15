# Voice toán dùng chung

Thư mục: `public/games/general/voices/toan/`.
URL khi chạy: `/games/general/voices/toan/<tên-file>.mp3`.

## Đọc số

| File | Nội dung |
| --- | --- |
| khong.mp3 | Không |
| mot.mp3 | Một |
| hai.mp3 | Hai |
| ba.mp3 | Ba |
| bon.mp3 | Bốn |
| nam.mp3 | Năm |
| sau.mp3 | Sáu |
| bay.mp3 | Bảy |
| tam.mp3 | Tám |
| chin.mp3 | Chín |
| muoi.mp3 | Mười |
| muoi-hang-chuc.mp3 | Mươi |
| mot-hang-don-vi.mp3 | Mốt |
| tu.mp3 | Tư |
| lam.mp3 | Lăm |
| tram.mp3 | Trăm |

## Cụm câu hỏi

| File | Nội dung |
| --- | --- |
| hay-keo-cach-doc-dung.mp3 | Hãy kéo cách đọc đúng của số trên bảng vào ô. |
| gom-may-chuc-va-may-don-vi.mp3 | Gồm mấy chục và mấy đơn vị? |
| hay-keo-cach-phan-tich-dung-cua-so.mp3 | Hãy kéo cách phân tích đúng của số |
| hay-keo-cac-the-de-tao-so.mp3 | Hãy kéo các thẻ để tạo số |
| hay-chon-so.mp3 | Hãy chọn số |
| so.mp3 | Số |
| co-may-chuc.mp3 | Có mấy chục? |
| co-may-don-vi.mp3 | Có mấy đơn vị? |
| chuc-va.mp3 | Chục và |
| don-vi-la-so-nao.mp3 | Đơn vị là số nào? |
| bang-may-cong.mp3 | Bằng mấy cộng |
| bang.mp3 | Bằng |
| cong-may.mp3 | Cộng mấy? |
| hay-tim-so-lon-hon.mp3 | Hãy tìm số lớn hơn |
| hay-tim-so-be-hon.mp3 | Hãy tìm số bé hơn |
| va-be-hon.mp3 | Và bé hơn |
| hay-tim-so-be-nhat.mp3 | Hãy chọn số bé nhất trong các đáp án. |
| hay-tim-so-lon-nhat.mp3 | Hãy chọn số lớn nhất trong các đáp án. |

File `hay_tim-so-be-nhat.mp3` đã được chuẩn hóa thành `hay-tim-so-be-nhat.mp3`.
Các file nhạc nền, phản hồi đúng/sai, thắng, hướng dẫn chung vẫn ở thư mục cha.
`input-.mp3` và `input-1.mp3` giữ nguyên vì chưa xác định nội dung từ tên file.

## Dùng lại trong game toán

`src/components/games/general/math-voice.ts` xuất `createMathVoiceSequence(text)`.
Truyền câu tiếng Việt có số viết bằng chữ. Hàm ưu tiên cụm dài nhất, trả về
mảng `{ src, text }` theo thứ tự phát. Nếu câu chứa nội dung chưa có bản thu,
hàm trả về `undefined` để caller dùng TTS đọc cả câu.

```ts
const voiceSequence = createMathVoiceSequence('Hãy chọn số hai mươi tư.')
// hay-chon-so.mp3 → hai.mp3 → muoi-hang-chuc.mp3 → tu.mp3
```

Phân biệt: 11 = mười + một; 14 = mười + bốn; 15 = mười + lăm;
21 = hai + mươi + mốt; 24 = hai + mươi + tư; 25 = hai + mươi + lăm;
100 = một + trăm. Hàm ghép voice không tự chuyển chữ số sang chữ.

Bubble-shooter Toán lớp 2 bài 1 đã gắn `voiceSequence` vào từng câu hỏi,
tự phát khi hiện câu và có nút loa để nghe lại. `QuestionVoicePlayer` phát
tuần tự, dùng TTS cho từng đoạn nếu file báo lỗi, dừng chuỗi cũ khi nghe lại
hoặc đổi câu, tuân theo mute/pause của game.
Kéo thả Toán lớp 2 bài 1 cũng dùng `voiceSequence` cho tự phát và nút nghe lại,
gồm bốn cụm bổ sung ở trên. Câu hỏi cách đọc không phát số trên bảng để tránh lộ đáp án.
Tất cả bản thu phát ở tốc độ 1×. Trong cùng số ghép, từ sau được gọi phát
khi từ trước còn khoảng 0,15 giây (kiểm tra media time mỗi 20ms). Không nối sớm
giữa số và cụm hướng dẫn. Độ nối thực tế còn phụ thuộc thời gian tải/phát MP3
của trình duyệt. Pause/stop/nghe lại quản lý cả phần đuôi còn phát của từ trước.
Nút nghe lại dùng ảnh loa riêng tại ô tròn góc dưới phải của bảng dùng chung.
Xem `docs/bubble-shooter-panel.md` về asset, trạng thái nút và phần nền ảnh còn cần hoàn thiện.

Game khác dùng Phaser có thể thêm `voiceSequence` vào kiểu câu hỏi và truyền
cho `playQuestionVoice`. Game ngoài Phaser có thể dùng
`QuestionVoicePlayer.playSequence(sequence)` và quản lý stop/mute/pause theo vòng đời game.

Kiểm tra: `node scripts/test-math-voices.cjs`.
