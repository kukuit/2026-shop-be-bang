export const ENGLISH_1_LESSON_2_LEARNING_GOALS = [
    {
        "key":  "recognize_cup",
        "name":  "Nhận biết từ cup",
        "description":  "Bé nhận biết từ cup qua hình ảnh, chữ viết hoặc giọng đọc."
    },
    {
        "key":  "recognize_cake",
        "name":  "Nhận biết từ cake",
        "description":  "Bé nhận biết từ cake qua hình ảnh, chữ viết hoặc giọng đọc."
    },
    {
        "key":  "recognize_cat",
        "name":  "Nhận biết từ cat",
        "description":  "Bé nhận biết từ cat qua hình ảnh, chữ viết hoặc giọng đọc."
    },
    {
        "key":  "recognize_car",
        "name":  "Nhận biết từ car",
        "description":  "Bé nhận biết từ car qua hình ảnh, chữ viết hoặc giọng đọc."
    },
    {
        "key":  "recognize_letter_c",
        "name":  "Nhận biết chữ C/c",
        "description":  "Bé nhận biết chữ C viết hoa và c viết thường."
    },
    {
        "key":  "recognize_c_sound",
        "name":  "Nhận biết âm của chữ C",
        "description":  "Bé nhận biết âm /k/ trong các từ cup, cake, cat, car."
    },
    {
        "key":  "match_word_picture",
        "name":  "Ghép từ với hình",
        "description":  "Bé ghép đúng từ cup, cake, cat, car với hình ảnh tương ứng."
    },
    {
        "key":  "listen_and_identify",
        "name":  "Nghe và chọn từ đúng",
        "description":  "Bé nghe từ hoặc câu ngắn và chọn đúng hình hoặc từ tương ứng."
    },
    {
        "key":  "understand_i_have_a",
        "name":  "Hiểu mẫu câu I have a...",
        "description":  "Bé hiểu ý nghĩa mẫu câu I have a + danh từ."
    },
    {
        "key":  "complete_i_have_a",
        "name":  "Hoàn thành câu I have a...",
        "description":  "Bé chọn đúng danh từ để hoàn thành câu I have a ___."
    }
] as const
export const TIENG_ANH_1_BAI_2 = {
 lessonId: 'tieng-anh-1-bai-2', gradeId: 'lop-1', gradeLabel: 'Lớp 1',
 subjectId: 'tieng-anh', subjectLabel: 'Tiếng Anh', lessonNumber: 2, title: 'In the dining room',
 reviewVocabulary: ['ball', 'bike', 'book'],
 learningGoals: ENGLISH_1_LESSON_2_LEARNING_GOALS.map(goal => ({ ...goal, title: goal.name })),
} as const