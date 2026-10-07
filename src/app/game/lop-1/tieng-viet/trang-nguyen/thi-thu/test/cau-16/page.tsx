import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateSameLetterTwoGroupsQuestion, getSameLetterMatchCombinationKey } from '../../_exam/question-generators'
import type { GeneratedExamQuestion, SameLetterMatchData } from '../../_exam/types'
import QuestionSixteenTestClient from './QuestionSixteenTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 16 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra generator ghép hai nhóm hình có chữ cái giống nhau.',
  robots: { index: false, follow: false },
}

export default function QuestionSixteenTestPage() {
  const visitSeed = randomUUID()
  const usedCombinations = new Set<string>()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-sixteen:${index}`
    const question = generateSameLetterTwoGroupsQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeCombinations: Array.from(usedCombinations),
    })
    const data = question.data as SameLetterMatchData
    usedCombinations.add(getSameLetterMatchCombinationKey(data.leftAsset.id, data.rightAsset.id, data.letters))
    return { ...question, number: 16 } satisfies GeneratedExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={16} />
    <QuestionSixteenTestClient questions={questions} />
  </>
}
