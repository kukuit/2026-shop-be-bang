export const VOCABULARY_3000_LEARNING_KEY = 'vocabulary-word-match'

export const VOCABULARY_3000_LESSON = {
  lessonId: 'vocabulary-3000',
  gradeId: 'self-study',
  gradeLabel: 'Tự học',
  subjectId: 'tieng-anh',
  subjectLabel: 'Tiếng Anh',
  lessonNumber: 1,
  title: 'Vocabulary 3000',
  learningGoals: [
    { key: VOCABULARY_3000_LEARNING_KEY, title: 'Nhận biết và ghi nhớ từ vựng tiếng Anh' },
  ],
} as const

export type Vocabulary3000LearningKey = typeof VOCABULARY_3000_LEARNING_KEY
