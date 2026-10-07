import type { ExamAnswer, ExamQuestion } from '../../_exam/types'

export type TestExamQuestion = ExamQuestion & {
  testAnswer?: ExamAnswer
  testTrailingVoice?: string
}
