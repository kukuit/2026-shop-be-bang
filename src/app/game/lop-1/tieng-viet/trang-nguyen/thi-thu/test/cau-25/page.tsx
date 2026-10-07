import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateQuestion25 } from '../../_exam/question-generators'
import type { ExamQuestion } from '../../_exam/types'
import ClassificationTestClient from '../_components/ClassificationTestClient'
import { previewQuestion } from '../_components/preview-question'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 25 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Chọn đáp án phân tích từ theo hình minh họa bằng combobox.',
  robots: { index: false, follow: false },
}

export default function QuestionTwentyFiveTestPage() {
  const visitSeed = randomUUID()
  const recentSelectionKeys: string[] = []
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-twenty-five:${index}`
    const generated = generateQuestion25({ seedHash: stableHash(seed), random: createSeededRandom(seed), recentSelectionKeys })
    recentSelectionKeys.push(String(generated.data?.selectionKey))
    return { ...previewQuestion(generated), number: 25 } satisfies ExamQuestion
  })

  return <><TestQuestionHeader questionNumber={25} /><ClassificationTestClient
    questions={questions}
    title="Kiểm tra generator câu 25"
    description="Chọn đáp án phân tích từ trong hình. Câu hỏi đổi nhóm, từ và dạng phân tích qua mỗi lượt."
  /></>
}
