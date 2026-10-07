import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateCategoryPairClassificationQuestion, type Category21 } from '../../_exam/question-generators'
import type { TestExamQuestion } from '../_components/test-types'
import ClassificationTestClient from '../_components/ClassificationTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 21 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra phân loại hình ảnh theo cặp nhóm bằng thao tác kéo thả.',
  robots: { index: false, follow: false },
}

export default function QuestionTwentyOneTestPage() {
  const visitSeed = randomUUID()
  const recentPairKeys: string[] = []
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-twenty-one:${index}`
    const generated = generateCategoryPairClassificationQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      recentPairKeys,
    })
    const data = generated.data as { groups: Array<{ id: string }> }
    const pairKey = data.groups.map(group => group.id as Category21).sort().join('-')
    recentPairKeys.push(pairKey)
    const { correctAnswer, ...visibleQuestion } = generated
    return { ...visibleQuestion, testAnswer: correctAnswer, number: 21 } satisfies TestExamQuestion
  })

  return <><TestQuestionHeader questionNumber={21} /><ClassificationTestClient
    questions={questions}
    title="Kiểm tra generator câu 21"
    description="Mỗi câu ghép 3 hình từ mỗi nhóm. Thả sai thì hình quay về vùng nguồn; nhóm nhận tối đa 3 hình."
  /></>
}
