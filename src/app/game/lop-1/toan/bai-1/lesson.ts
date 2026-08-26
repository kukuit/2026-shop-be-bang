export const TOAN_1_BAI_1_LEARNING_KEYS = {
  RECOGNIZE_NUMBER_0: 'recognize-number-0',
  RECOGNIZE_NUMBER_1: 'recognize-number-1',
  RECOGNIZE_NUMBER_2: 'recognize-number-2',
  RECOGNIZE_NUMBER_3: 'recognize-number-3',
  RECOGNIZE_NUMBER_4: 'recognize-number-4',
  RECOGNIZE_NUMBER_5: 'recognize-number-5',
} as const

export const TOAN_1_BAI_1 = {
  lessonId: 'toan-1-bai-1',
  gradeId: 'lop-1',
  gradeLabel: 'Lớp 1',
  subjectId: 'toan',
  subjectLabel: 'Toán',
  lessonNumber: 1,
  title: 'Nhận biết số từ 0 đến 5',
  learningGoals: [
    { key: TOAN_1_BAI_1_LEARNING_KEYS.RECOGNIZE_NUMBER_0, title: 'Nhận biết số 0' },
    { key: TOAN_1_BAI_1_LEARNING_KEYS.RECOGNIZE_NUMBER_1, title: 'Nhận biết số 1' },
    { key: TOAN_1_BAI_1_LEARNING_KEYS.RECOGNIZE_NUMBER_2, title: 'Nhận biết số 2' },
    { key: TOAN_1_BAI_1_LEARNING_KEYS.RECOGNIZE_NUMBER_3, title: 'Nhận biết số 3' },
    { key: TOAN_1_BAI_1_LEARNING_KEYS.RECOGNIZE_NUMBER_4, title: 'Nhận biết số 4' },
    { key: TOAN_1_BAI_1_LEARNING_KEYS.RECOGNIZE_NUMBER_5, title: 'Nhận biết số 5' },
  ],
} as const

export type Toan1Bai1LearningKey = (typeof TOAN_1_BAI_1.learningGoals)[number]['key']

