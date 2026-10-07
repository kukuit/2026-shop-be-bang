import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateFindLetterInAnimalNameQuestion, TAG_NAME_COMMON_VOICE } from '../../_exam/question-generators'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionFiveTestClient from './QuestionFiveTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 5 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Trang kiểm tra 10 biến thể random của câu 5.',
  robots: { index: false, follow: false },
}

export default function QuestionFiveTestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-five:${index}`
    return {
      ...generateFindLetterInAnimalNameQuestion({
        seedHash: stableHash(seed),
        random: createSeededRandom(seed),
      }),
      number: 5,
    } satisfies GeneratedExamQuestion
  })
  const commonVoiceAvailable = existsSync(resolve(process.cwd(), 'public', TAG_NAME_COMMON_VOICE.replace(/^\//, '')))

  return <>
    <TestQuestionHeader questionNumber={5} />
    <QuestionFiveTestClient questions={questions} commonVoiceAvailable={commonVoiceAvailable} />
  </>
}
