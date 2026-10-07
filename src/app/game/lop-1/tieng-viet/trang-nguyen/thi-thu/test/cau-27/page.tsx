import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateQuestion27 } from '../../_exam/question-generators'
import type { ExamQuestion } from '../../_exam/types'
import ClassificationTestClient from '../_components/ClassificationTestClient'
import { previewQuestion } from '../_components/preview-question'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 27 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Chọn âm chung xuất hiện trong ba từ bằng combobox và nghe các từ.',
  robots: { index: false, follow: false },
}

export default function QuestionTwentySevenTestPage() {
  const visitSeed = randomUUID()
  const recentCombinationKeys: string[] = []
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-twenty-seven:${index}`
    const generated = generateQuestion27({ seedHash: stableHash(seed), random: createSeededRandom(seed), recentCombinationKeys })
    recentCombinationKeys.push(String(generated.data?.selectionKey))
    return { ...previewQuestion(generated), number: 27 } satisfies ExamQuestion
  })

  return <><TestQuestionHeader questionNumber={27} /><ClassificationTestClient
    questions={questions}
    title="Kiểm tra generator câu 27"
    description="Chọn âm chung có trong cả ba từ; âm có thể ở đầu, giữa hoặc cuối từ. Nút loa phát lần lượt từng từ."
  /></>
}
