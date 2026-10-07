import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateFindTargetLetterInObjectQuestion } from '../../_exam/question-generators'
import QuestionOneTestClient from './QuestionOneTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 1 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Trang kiểm tra 10 biến thể random của câu 1.',
  robots: { index: false, follow: false },
}

export default function QuestionOneTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seedHash = stableHash(`${visitSeed}:question-one:${index}`)
    return {
      ...generateFindTargetLetterInObjectQuestion({
        seedHash,
        random: createSeededRandom(`${visitSeed}:question-one:${index}`),
        difficulty: index % 2 === 0 ? 'easy' : 'medium',
      }),
      number: index + 1,
    }
  })

  return <>
    <TestQuestionHeader questionNumber={1} />
    <QuestionOneTestClient questions={questions} />
  </>
}
