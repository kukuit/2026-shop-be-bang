import type { Metadata } from 'next'
import { randomUUID } from 'node:crypto'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateQuestion34TestRound } from '../../_exam/question34-knowledge'
import QuestionT34SubN4TestClient from './QuestionT34SubN4TestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu T34 · N4 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Nghe tên con vật và tìm chữ cái trên bông hoa mà con vật đậu lên.',
  robots: { index: false, follow: false },
}

export default function QuestionT34SubN4TestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-t34-sub-n4:${index}`
    return generateQuestion34TestRound({ seedHash: stableHash(seed), random: createSeededRandom(seed) })
  })

  return <>
    <TestQuestionHeader questionNumber={34} questionLabel="Mẫu câu T34 · N4" />
    <QuestionT34SubN4TestClient initialQuestions={questions} />
  </>
}
