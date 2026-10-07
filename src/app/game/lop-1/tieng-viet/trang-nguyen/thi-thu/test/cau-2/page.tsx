import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateFindTargetLetterInObjectImageQuestion } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionTwoTestClient from './QuestionTwoTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 2 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Trang kiểm tra 10 biến thể random của câu 2.',
  robots: { index: false, follow: false },
}

export default function QuestionTwoTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-two:${index}`
    return {
      ...generateFindTargetLetterInObjectImageQuestion({
        seedHash: stableHash(seed),
        random: createSeededRandom(seed),
      }),
      number: 2,
    } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={2} />
    <QuestionTwoTestClient questions={questions} />
  </>
}
