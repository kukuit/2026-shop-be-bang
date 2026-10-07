import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateHearIdentifyQuestions } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import HearIdentifyTestClient from '../_components/HearIdentifyTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 3 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra generator nghe phát âm và chọn chữ của câu 3.',
  robots: { index: false, follow: false },
}

export default function QuestionThreeTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:hear-identify:${index}`
    const [question3] = generateHearIdentifyQuestions({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
    })
    return { ...question3, number: 3 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={3} />
    <HearIdentifyTestClient questions={questions} questionNumber={3} />
  </>
}
