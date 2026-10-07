import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateFillLetterInBlankQuestion, LETTER_INPUT_ALLOWED_LETTERS } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionTwelveTestClient from './QuestionTwelveTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 12 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra generator nhìn chữ cái trên thẻ và nhập lại chữ của câu 12.',
  robots: { index: false, follow: false },
}

export default function QuestionTwelveTestPage() {
  const visitSeed = randomUUID()
  const usedLetters = new Set<string>()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-twelve:${index}`
    const question = generateFillLetterInBlankQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeLetters: Array.from(usedLetters),
    })
    const target = question.data?.target as { letter?: string } | undefined
    if (target?.letter && LETTER_INPUT_ALLOWED_LETTERS.includes(target.letter as typeof LETTER_INPUT_ALLOWED_LETTERS[number]))
      usedLetters.add(target.letter)
    return { ...question, number: 12 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={12} />
    <QuestionTwelveTestClient questions={questions} />
  </>
}
