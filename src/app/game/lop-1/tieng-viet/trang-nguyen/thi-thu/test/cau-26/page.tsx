import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateQuestion26 } from '../../_exam/question-generators'
import type { ExamQuestion } from '../../_exam/types'
import ClassificationTestClient from '../_components/ClassificationTestClient'
import { previewQuestion } from '../_components/preview-question'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 26 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Chọn đáp án phân tích từ theo hình minh họa bằng combobox.',
  robots: { index: false, follow: false },
}

export default function QuestionTwentySixTestPage() {
  const visitSeed = randomUUID()
  const recentSelectionKeys: string[] = []
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-twenty-six:${index}`
    const generated = generateQuestion26({ seedHash: stableHash(seed), random: createSeededRandom(seed), recentSelectionKeys })
    recentSelectionKeys.push(String(generated.data?.selectionKey))
    return { ...previewQuestion(generated), number: 26 } satisfies ExamQuestion
  })

  return <><TestQuestionHeader questionNumber={26} /><ClassificationTestClient
    questions={questions}
    title="Kiểm tra generator câu 26"
    description="Dùng cùng pool hình, kiểu phân tích và combobox của câu 25."
  /></>
}
