import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateHearIdentifyQuestions } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import HearIdentifyTestClient from '../_components/HearIdentifyTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 4 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra generator nghe phát âm và chọn chữ của câu 4.',
  robots: { index: false, follow: false },
}

export default function QuestionFourTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:hear-identify:${index}`
    const [, question4] = generateHearIdentifyQuestions({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
    })
    return { ...question4, number: 4 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={4} />
    <HearIdentifyTestClient questions={questions} questionNumber={4} />
  </>
}
