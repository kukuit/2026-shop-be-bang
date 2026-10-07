import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateLowerUpperMatchQuestion, getLowerUpperMatchCombinationKey } from '../../_exam/question-generators'
import type { GeneratedExamQuestion, LowerUpperMatchData } from '../../_exam/types'
import type { TestExamQuestion } from '../_components/test-types'
import QuestionSeventeenTestClient from './QuestionSeventeenTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 17 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra generator ghép chữ in thường với chữ in hoa tương ứng.',
  robots: { index: false, follow: false },
}

export default function QuestionSeventeenTestPage() {
  const visitSeed = randomUUID()
  const usedCombinations = new Set<string>()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-seventeen:${index}`
    const question = generateLowerUpperMatchQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeCombinations: Array.from(usedCombinations),
    })
    const data = question.data as LowerUpperMatchData
    usedCombinations.add(getLowerUpperMatchCombinationKey(data.leftBackgroundId, data.rightBackgroundId, data.letters))
    const { correctAnswer, ...visibleQuestion } = question
    const visibleItems = (items: LowerUpperMatchData['leftItems']) => items.map(({ matchKey: _matchKey, ...item }) => item)
    return {
      ...visibleQuestion,
      testAnswer: correctAnswer,
      number: 17,
      data: {
        ...data,
        leftItems: visibleItems(data.leftItems),
        rightItems: visibleItems(data.rightItems),
      },
    } satisfies TestExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={17} />
    <QuestionSeventeenTestClient questions={questions} />
  </>
}
