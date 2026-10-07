import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateIdentifyToneQuestion } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionSixTestClient from './QuestionSixTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 6 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Trang kiểm tra 10 biến thể random của câu 6 nhận biết thanh.',
  robots: { index: false, follow: false },
}

export default function QuestionSixTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-six:${index}`
    return {
      ...generateIdentifyToneQuestion({
        seedHash: stableHash(seed),
        random: createSeededRandom(seed),
      }),
      number: 6,
    } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={6} />
    <QuestionSixTestClient questions={questions} />
  </>
}
