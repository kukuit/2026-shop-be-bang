import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateAlphabetOrderQuestion } from '../../_exam/question-generators'
import type { TestExamQuestion } from '../_components/test-types'
import ClassificationTestClient from '../_components/ClassificationTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 22 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra sắp xếp 5 chữ cái theo đúng bảng chữ cái tiếng Việt.',
  robots: { index: false, follow: false },
}

export default function QuestionTwentyTwoTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-twenty-two:${index}`
    const generated = generateAlphabetOrderQuestion({ seedHash: stableHash(seed), random: createSeededRandom(seed) })
    const { correctAnswer, ...visibleQuestion } = generated
    return { ...visibleQuestion, testAnswer: correctAnswer, number: 22 } satisfies TestExamQuestion
  })

  return <><TestQuestionHeader questionNumber={22} /><ClassificationTestClient
    questions={questions}
    title="Kiểm tra generator câu 22"
    description="Kéo các ô chữ sang trái hoặc phải để sắp xếp; thứ tự có thể chỉnh lại trước khi nộp bài."
  /></>
}
