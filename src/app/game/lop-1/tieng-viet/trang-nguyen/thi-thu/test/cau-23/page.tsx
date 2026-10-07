import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateVehicleOrderQuestion } from '../../_exam/question-generators'
import type { TestExamQuestion } from '../_components/test-types'
import ClassificationTestClient from '../_components/ClassificationTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 23 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra sắp xếp hình theo thứ tự đọc.',
  robots: { index: false, follow: false },
}

export default function QuestionTwentyThreeTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-twenty-three:${index}`
    const generated = generateVehicleOrderQuestion({ seedHash: stableHash(seed), random: createSeededRandom(seed) })
    const { correctAnswer, ...visibleQuestion } = generated
    return { ...visibleQuestion, testAnswer: correctAnswer, number: 23 } satisfies TestExamQuestion
  })

  return <><TestQuestionHeader questionNumber={23} /><ClassificationTestClient
    questions={questions}
    title="Kiểm tra generator câu 23"
    description="Nghe thứ tự đọc, rồi kéo các con vật, đồ dùng, hoa, quả hoặc phương tiện vào đúng vị trí. Mỗi lượt tạo 10 câu mới."
  /></>
}
