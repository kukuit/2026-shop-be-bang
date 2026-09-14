export const TOAN_2_BAI_1_LEARNING_KEYS = {
  RECOGNIZE_NUMBERS_100: 'RECOGNIZE_NUMBERS_100',
  READ_WRITE_NUMBERS_100: 'READ_WRITE_NUMBERS_100',
  TENS_ONES: 'TENS_ONES',
  COMPOSE_NUMBER: 'COMPOSE_NUMBER',
  DECOMPOSE_NUMBER: 'DECOMPOSE_NUMBER',
  COMPARE_NUMBERS_100: 'COMPARE_NUMBERS_100',
  ORDER_NUMBERS_100: 'ORDER_NUMBERS_100',
  NUMBER_CHART_100: 'NUMBER_CHART_100',
  ESTIMATE_AND_COUNT: 'ESTIMATE_AND_COUNT',
  FORM_TWO_DIGIT_NUMBERS: 'FORM_TWO_DIGIT_NUMBERS',
} as const
const K = TOAN_2_BAI_1_LEARNING_KEYS
export const TOAN_2_BAI_1 = {
  lessonId: 'toan-2-bai-1', gradeId: 'lop-2', gradeLabel: 'Lớp 2',
  subjectId: 'toan', subjectLabel: 'Toán', lessonNumber: 1,
  title: 'Ôn tập các số đến 100',
  learningGoals: [
    { key: K.RECOGNIZE_NUMBERS_100, title: 'Nhận biết các số đến 100' },
    { key: K.READ_WRITE_NUMBERS_100, title: 'Đọc và viết các số đến 100' },
    { key: K.TENS_ONES, title: 'Số chục và số đơn vị' },
    { key: K.COMPOSE_NUMBER, title: 'Lập số từ chục và đơn vị' },
    { key: K.DECOMPOSE_NUMBER, title: 'Phân tích số' },
    { key: K.COMPARE_NUMBERS_100, title: 'So sánh các số đến 100' },
    { key: K.ORDER_NUMBERS_100, title: 'Thứ tự các số đến 100' },
    { key: K.NUMBER_CHART_100, title: 'Bảng số 1–100' },
    { key: K.ESTIMATE_AND_COUNT, title: 'Ước lượng và đếm' },
    { key: K.FORM_TWO_DIGIT_NUMBERS, title: 'Lập số có hai chữ số' },
  ],
} as const
export type MathGoal = (typeof TOAN_2_BAI_1.learningGoals)[number]['key']

export const TOAN_2_MATH_LESSONS = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1, lessonId: `toan-2-bai-${index + 1}`,
  title: index === 0 ? TOAN_2_BAI_1.title : `Bài ${index + 1}`,
  href: `/game/lop-2/toan/bai-${index + 1}`, available: index === 0,
  games: index === 0 ? ['bubble-shooter', 'gold-mining', 'racing', 'drag-drop'] : [],
  requiredGames: index === 0 ? 2 : 0,
}))
