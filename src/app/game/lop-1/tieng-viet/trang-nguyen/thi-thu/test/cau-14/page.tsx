import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateFindHiddenLetterQuestion } from '../../_exam/question-generators'
import type { GeneratedExamQuestion, HiddenLetterSceneData } from '../../_exam/types'
import QuestionFourteenTestClient from './QuestionFourteenTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 14 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra generator tìm chữ cái trốn trong hoặc quanh đồ vật, hoa và con vật.',
  robots: { index: false, follow: false },
}

export default function QuestionFourteenTestPage() {
  const visitSeed = randomUUID()
  const usedCombinations = new Set<string>()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-fourteen:${index}`
    const question = generateFindHiddenLetterQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeCombinations: Array.from(usedCombinations),
    })
    const scene = question.data?.scene as HiddenLetterSceneData
    usedCombinations.add(`${question.correctAnswer}:${scene.container.id}:${scene.relation}`)
    return { ...question, number: 14 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={14} />
    <QuestionFourteenTestClient questions={questions} />
  </>
}
