import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { FLOWER_NAME_MANIFEST, generateFindFlowerByImageQuestion } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionNineTestClient from './QuestionNineTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 9 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra tám biến thể random nhìn hình, nghe voice và chọn tên hoa của câu 9.',
  robots: { index: false, follow: false },
}

export default function QuestionNineTestPage() {
  const visitSeed = randomUUID()
  const usedFlowerIds = new Set<string>()
  const questions = Array.from({ length: FLOWER_NAME_MANIFEST.items.length }, (_, index) => {
    const seed = `${visitSeed}:question-nine:${index}`
    const question = generateFindFlowerByImageQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeFlowerIds: Array.from(usedFlowerIds),
    })
    const targetFlowerId = question.data?.targetFlowerId
    if (typeof targetFlowerId === 'string') usedFlowerIds.add(targetFlowerId)
    return { ...question, number: 9 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={9} />
    <QuestionNineTestClient questions={questions} />
  </>
}
