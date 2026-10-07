import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateCountTargetLetterQuestion } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionThirteenTestClient from './QuestionThirteenTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 13 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra generator đếm chữ cái trong bảng nhiều chữ, số và hình của câu 13.',
  robots: { index: false, follow: false },
}

export default function QuestionThirteenTestPage() {
  const visitSeed = randomUUID()
  const usedLetters = new Set<string>()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-thirteen:${index}`
    const question = generateCountTargetLetterQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeTargetLetters: Array.from(usedLetters),
    })
    const target = question.data?.targetLetter
    if (typeof target === 'string') usedLetters.add(target)
    return { ...question, number: 13 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={13} />
    <QuestionThirteenTestClient questions={questions} />
  </>
}
