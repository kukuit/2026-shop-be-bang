import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateQuestion24 } from '../../_exam/question-generators'
import type { TestExamQuestion } from '../_components/test-types'
import ClassificationTestClient from '../_components/ClassificationTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 24 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Quan sát hoạt ảnh, rồi chọn chữ trên mục tiêu nơi nhân vật dừng lại.',
  robots: { index: false, follow: false },
}

export default function QuestionTwentyFourTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-twenty-four:${index}`
    const generated = generateQuestion24({ seedHash: stableHash(seed), random: createSeededRandom(seed) })
    const { correctAnswer, ...visibleQuestion } = generated
    return { ...visibleQuestion, testAnswer: correctAnswer, number: 24 } satisfies TestExamQuestion
  })

  return <><TestQuestionHeader questionNumber={24} /><ClassificationTestClient
    questions={questions}
    title="Kiểm tra generator câu 24"
    description="Xem hoạt ảnh nhân vật di chuyển đến mục tiêu, rồi chọn chữ tương ứng. Mỗi lượt tạo 10 câu mới."
  /></>
}
