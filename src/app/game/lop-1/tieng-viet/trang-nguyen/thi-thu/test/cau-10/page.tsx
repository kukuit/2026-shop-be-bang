import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateFindLettersInImageQuestion } from '../../_exam/question-generators'
import { VIETNAMESE_ALPHABET } from '../../_exam/vietnamese-data'
import type { GeneratedExamQuestion } from '../../_exam/types'
import QuestionTenTestClient from './QuestionTenTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 10 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra generator chọn nhiều chữ cái trong hình của câu 10.',
  robots: { index: false, follow: false },
}

function targetSetKey(letters: readonly string[]): string {
  return [...letters].sort((left, right) => VIETNAMESE_ALPHABET.indexOf(left as typeof VIETNAMESE_ALPHABET[number])
    - VIETNAMESE_ALPHABET.indexOf(right as typeof VIETNAMESE_ALPHABET[number])).join('|')
}

export default function QuestionTenTestPage() {
  const visitSeed = randomUUID()
  const usedTargetSetKeys = new Set<string>()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-ten:${index}`
    const question = generateFindLettersInImageQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeTargetSetKeys: Array.from(usedTargetSetKeys),
    })
    const targetLetters = question.data?.targetLetters as string[]
    usedTargetSetKeys.add(targetSetKey(targetLetters))
    return { ...question, number: 10 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={10} />
    <QuestionTenTestClient questions={questions} />
  </>
}
