import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateRotatedLetterQuestion } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionFifteenTestClient from './QuestionFifteenTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 15 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra generator tìm chữ cái bị xoay ngược.',
  robots: { index: false, follow: false },
}

export default function QuestionFifteenTestPage() {
  const visitSeed = randomUUID()
  const usedTargets = new Set<string>()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-fifteen:${index}`
    const question = generateRotatedLetterQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeTargets: Array.from(usedTargets),
    })
    usedTargets.add(String(question.correctAnswer))
    return { ...question, number: 15 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={15} />
    <QuestionFifteenTestClient questions={questions} />
  </>
}
