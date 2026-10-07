import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateNumberLetterClassifyQuestion } from '../../_exam/question-generators'
import type { ClassificationDragDropData } from '../../_exam/types'
import type { TestExamQuestion } from '../_components/test-types'
import ClassificationTestClient from '../_components/ClassificationTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 20 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra phân loại chữ số và chữ cái bằng thao tác kéo thả.',
  robots: { index: false, follow: false },
}

export default function QuestionTwentyTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-twenty:${index}`
    const generated = generateNumberLetterClassifyQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
    })
    const data = generated.data as ClassificationDragDropData
    const { correctAnswer, ...visibleQuestion } = generated
    return {
      ...visibleQuestion,
      testAnswer: correctAnswer,
      number: 20,
      data: { ...data, items: data.items.map(({ groupId: _groupId, ...item }) => item) },
    } satisfies TestExamQuestion
  })

  return <><TestQuestionHeader questionNumber={20} /><ClassificationTestClient
    questions={questions}
    title="Kiểm tra generator câu 20"
    description="Mỗi câu có 3 chữ số và 3 chữ cái trên nền hoa hoặc bóng ngẫu nhiên. Kéo thẻ vào hai nhóm; mỗi nhóm nhận tối đa 3 thẻ."
  /></>
}
