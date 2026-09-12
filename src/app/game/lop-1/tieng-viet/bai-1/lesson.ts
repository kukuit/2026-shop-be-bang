export const TIENG_VIET_1_BAI_1_LEARNING_KEYS = {
  RECOGNIZE_A: 'RECOGNIZE_A',
  RECOGNIZE_A_CASE: 'RECOGNIZE_A_CASE',
  LISTEN_A: 'LISTEN_A',
  FIND_A_IN_TEXT: 'FIND_A_IN_TEXT',
  MATCH_A: 'MATCH_A',
} as const

export const TIENG_VIET_1_BAI_1 = {
  lessonId: 'tieng-viet-1-bai-1', gradeId: 'lop-1', gradeLabel: 'Lớp 1',
  subjectId: 'tieng-viet', subjectLabel: 'Tiếng Việt', lessonNumber: 1,
  title: 'Bài 1: A a',
  learningGoals: [
    { key: 'RECOGNIZE_A', title: 'Nhận biết chữ a' },
    { key: 'RECOGNIZE_A_CASE', title: 'Nhận biết chữ A và a' },
    { key: 'LISTEN_A', title: 'Nghe âm a và chọn chữ' },
    { key: 'FIND_A_IN_TEXT', title: 'Tìm chữ a trong từ' },
    { key: 'MATCH_A', title: 'Ghép và điền chữ a' },
  ],
} as const

export type VietnameseAGoal = keyof typeof TIENG_VIET_1_BAI_1_LEARNING_KEYS
