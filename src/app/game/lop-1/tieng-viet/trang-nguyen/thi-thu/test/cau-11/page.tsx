import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { NUMBER_CARD_VALUES, generateRecognizeNumberOnCardQuestion } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionElevenTestClient from './QuestionElevenTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 11 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra generator nhìn số trên thẻ và nhập đáp án của câu 11.',
  robots: { index: false, follow: false },
}

export default function QuestionElevenTestPage() {
  const visitSeed = randomUUID()
  const usedNumbers = new Set<number>()
  const questions = Array.from({ length: NUMBER_CARD_VALUES.length - 1 }, (_, index) => {
    const seed = `${visitSeed}:question-eleven:${index}`
    const question = generateRecognizeNumberOnCardQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeNumbers: Array.from(usedNumbers),
    })
    const targetValue = question.data?.targetValue
    if (typeof targetValue === 'number') usedNumbers.add(targetValue)
    return { ...question, number: 11 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={11} />
    <QuestionElevenTestClient questions={questions} />
  </>
}
