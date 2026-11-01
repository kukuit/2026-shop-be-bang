import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateFindLetterPairInAnimalNameQuestion } from '../../_exam/question-generators'
import type { ExamQuestion } from '../../_exam/types'
import ClassificationTestClient from '../_components/ClassificationTestClient'
import { previewQuestion } from '../_components/preview-question'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu T32 · N2 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Chọn thẻ tên con vật có đủ hai chữ cái được hỏi.',
  robots: { index: false, follow: false },
}

export default function QuestionT32SubN2TestPage() {
  const visitSeed = randomUUID()
  const recentTargetPairs: string[] = []
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-t32-sub-n2:${index}`
    const generated = generateFindLetterPairInAnimalNameQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeTargetPairs: recentTargetPairs,
    })
    const targetLetters = generated.data?.targetLetters
    if (Array.isArray(targetLetters) && targetLetters.every(letter => typeof letter === 'string')) {
      recentTargetPairs.push(targetLetters.join('|'))
    }
    return { ...previewQuestion(generated), number: 32 } satisfies ExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={32} questionLabel="Mẫu câu T32 · N2" />
    <ClassificationTestClient
      questions={questions}
      title="Kiểm tra câu T32 · N2"
      description="Chọn thẻ tên con vật có cả hai chữ được hỏi. Mỗi lượt tạo 10 cặp chữ khác nhau, kèm voice câu hỏi và bốn thẻ tên."
    />
  </>
}
