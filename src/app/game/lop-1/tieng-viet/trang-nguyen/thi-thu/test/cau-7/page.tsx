import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateFindAnimalByNameQuestion } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionSevenTestClient from './QuestionSevenTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 7 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Trang kiểm tra 10 biến thể random của câu 7 tìm con vật theo tên được đọc.',
  robots: { index: false, follow: false },
}

export default function QuestionSevenTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-seven:${index}`
    return {
      ...generateFindAnimalByNameQuestion({
        seedHash: stableHash(seed),
        random: createSeededRandom(seed),
      }),
      number: 7,
    } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={7} />
    <QuestionSevenTestClient questions={questions} />
  </>
}
