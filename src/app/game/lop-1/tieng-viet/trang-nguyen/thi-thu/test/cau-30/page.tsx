import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateQuestion30 } from '../../_exam/question-generators'
import type { ExamQuestion, Question30Data } from '../../_exam/types'
import ClassificationTestClient from '../_components/ClassificationTestClient'
import { previewQuestion } from '../_components/preview-question'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 30 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kéo thả chữ cái thích hợp vào chỗ trống theo màu của từng loại quả.',
  robots: { index: false, follow: false },
}

export default function QuestionThirtyTestPage() {
  const visitSeed = randomUUID()
  const recentSelectionSignatures: string[] = []
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-thirty:${index}`
    const generated = generateQuestion30({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      recentSelectionSignatures,
    })
    recentSelectionSignatures.push((generated.data as Question30Data).selectionSignature)
    if (recentSelectionSignatures.length > 2) recentSelectionSignatures.shift()
    return { ...previewQuestion(generated), number: 30 } satisfies ExamQuestion
  })

  return <><TestQuestionHeader questionNumber={30} /><ClassificationTestClient
    questions={questions}
    title="Kiểm tra câu 30"
    description="Kéo hoặc chạm chữ cái từ kho phía dưới vào chỗ trống. Mỗi chữ chỉ dùng một lần; có thể kéo chữ khỏi ô để trả về kho. Nút loa từng dòng bật khi đủ voice."
  /></>
}
