export const TIENG_ANH_1_BAI_1_LEARNING_KEYS = {
  RECOGNIZE_BALL: 'recognize-ball',
  RECOGNIZE_BILL: 'recognize-bill',
  RECOGNIZE_BOOK: 'recognize-book',
  RECOGNIZE_BIKE: 'recognize-bike',
  GREETING_HI_IM: 'greeting-hi-im',
  FAREWELL_BYE: 'farewell-bye',
} as const

export const TIENG_ANH_1_BAI_1 = {
  lessonId: 'tieng-anh-1-bai-1', gradeId: 'lop-1', gradeLabel: 'Lớp 1',
  subjectId: 'tieng-anh', subjectLabel: 'Tiếng Anh', lessonNumber: 1,
  title: 'In the school playground',
  learningGoals: [
    { key: TIENG_ANH_1_BAI_1_LEARNING_KEYS.RECOGNIZE_BALL, title: 'Nhận biết và hiểu từ "ball"' },
    { key: TIENG_ANH_1_BAI_1_LEARNING_KEYS.RECOGNIZE_BILL, title: 'Nhận biết tên "Bill"' },
    { key: TIENG_ANH_1_BAI_1_LEARNING_KEYS.RECOGNIZE_BOOK, title: 'Nhận biết và hiểu từ "book"' },
    { key: TIENG_ANH_1_BAI_1_LEARNING_KEYS.RECOGNIZE_BIKE, title: 'Nhận biết và hiểu từ "bike"' },
    { key: TIENG_ANH_1_BAI_1_LEARNING_KEYS.GREETING_HI_IM, title: 'Hiểu và sử dụng mẫu "Hi, I’m + tên"' },
    { key: TIENG_ANH_1_BAI_1_LEARNING_KEYS.FAREWELL_BYE, title: 'Hiểu và sử dụng mẫu "Bye, + tên"' },
  ],
} as const

export type TiengAnh1Bai1LearningKey = (typeof TIENG_ANH_1_BAI_1.learningGoals)[number]['key']
