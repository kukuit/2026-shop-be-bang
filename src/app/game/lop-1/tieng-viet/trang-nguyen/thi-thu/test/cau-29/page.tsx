import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateQuestion29 } from '../../_exam/question-generators'
import type { ExamQuestion, ImageResemblesLetterData } from '../../_exam/types'
import ClassificationTestClient from '../_components/ClassificationTestClient'
import { previewQuestion } from '../_components/preview-question'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 29 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Nhìn hình và chọn chữ cái có hình dáng tương ứng.',
  robots: { index: false, follow: false },
}

export default function QuestionTwentyNineTestPage() {
  const visitSeed = randomUUID()
  const recentAssetIds: string[] = []
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-twenty-nine:${index}`
    const generated = generateQuestion29({ seedHash: stableHash(seed), random: createSeededRandom(seed), recentAssetIds })
    recentAssetIds.push((generated.data as ImageResemblesLetterData).asset.imageId)
    if (recentAssetIds.length > 2) recentAssetIds.shift()
    return { ...previewQuestion(generated), number: 29 } satisfies ExamQuestion
  })

  return <><TestQuestionHeader questionNumber={29} /><ClassificationTestClient
    questions={questions}
    title="Kiểm tra câu 29"
    description="Nhìn hình, chọn chữ mà hình ảnh gợi nhớ. Các hình thay đổi ngẫu nhiên."
  /></>
}
