export const TOAN_1_BAI_2_LEARNING_KEYS = {
  RECOGNIZE_NUMBER_6: 'recognize-number-6',
  RECOGNIZE_NUMBER_7: 'recognize-number-7',
  RECOGNIZE_NUMBER_8: 'recognize-number-8',
  RECOGNIZE_NUMBER_9: 'recognize-number-9',
  RECOGNIZE_NUMBER_10: 'recognize-number-10',
  NUMBER_TO_QUANTITY: 'number-to-quantity-6-10',
  SEQUENCE_FORWARD: 'sequence-forward-0-10',
  SEQUENCE_BACKWARD: 'sequence-backward-0-10',
  COUNT_BY_ATTRIBUTE: 'count-by-attribute-0-10',
  COMPLETE_QUANTITY: 'complete-quantity-0-10',
  ORDER_NUMBERS: 'order-numbers-0-10',
} as const

export const TOAN_1_BAI_2 = {
  lessonId: 'toan-1-bai-2',
  gradeId: 'lop-1',
  gradeLabel: 'Lớp 1',
  subjectId: 'toan',
  subjectLabel: 'Toán',
  lessonNumber: 2,
  title: 'Các số 6, 7, 8, 9, 10',
  learningGoals: [
    { key: TOAN_1_BAI_2_LEARNING_KEYS.RECOGNIZE_NUMBER_6, title: 'Nhận biết số 6' },
    { key: TOAN_1_BAI_2_LEARNING_KEYS.RECOGNIZE_NUMBER_7, title: 'Nhận biết số 7' },
    { key: TOAN_1_BAI_2_LEARNING_KEYS.RECOGNIZE_NUMBER_8, title: 'Nhận biết số 8' },
    { key: TOAN_1_BAI_2_LEARNING_KEYS.RECOGNIZE_NUMBER_9, title: 'Nhận biết số 9' },
    { key: TOAN_1_BAI_2_LEARNING_KEYS.RECOGNIZE_NUMBER_10, title: 'Nhận biết số 10' },
    { key: TOAN_1_BAI_2_LEARNING_KEYS.NUMBER_TO_QUANTITY, title: 'Ghép số với số lượng từ 6 đến 10' },
    { key: TOAN_1_BAI_2_LEARNING_KEYS.SEQUENCE_FORWARD, title: 'Dãy số xuôi từ 0 đến 10' },
    { key: TOAN_1_BAI_2_LEARNING_KEYS.SEQUENCE_BACKWARD, title: 'Dãy số ngược từ 10 đến 0' },
    { key: TOAN_1_BAI_2_LEARNING_KEYS.COUNT_BY_ATTRIBUTE, title: 'Đếm theo đặc điểm' },
    { key: TOAN_1_BAI_2_LEARNING_KEYS.COMPLETE_QUANTITY, title: 'Thêm cho đủ số lượng' },
    { key: TOAN_1_BAI_2_LEARNING_KEYS.ORDER_NUMBERS, title: 'Sắp xếp các số' },
  ],
} as const

export type Toan1Bai2LearningKey = (typeof TOAN_1_BAI_2.learningGoals)[number]['key']
