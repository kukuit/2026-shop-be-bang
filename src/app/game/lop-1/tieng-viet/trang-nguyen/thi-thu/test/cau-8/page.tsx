import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateFindObjectByNameQuestion } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionEightTestClient from './QuestionEightTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 8 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Trang kiểm tra 10 biến thể random nhìn hình chọn đồ vật của câu 8.',
  robots: { index: false, follow: false },
}

export default function QuestionEightTestPage() {
  const visitSeed = randomUUID()
  const usedObjectIds = new Set<string>()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-eight:${index}`
    const question = generateFindObjectByNameQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeObjectIds: Array.from(usedObjectIds),
    })
    const targetObjectId = question.data?.targetObjectId
    if (typeof targetObjectId === 'string') usedObjectIds.add(targetObjectId)
    return { ...question, number: 8 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={8} />
    <QuestionEightTestClient questions={questions} />
  </>
}
