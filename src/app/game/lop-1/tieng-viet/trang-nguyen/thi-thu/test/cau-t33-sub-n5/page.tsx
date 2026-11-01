import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateQuestion33 } from '../../_exam/question-generators'
import type { ExamQuestion } from '../../_exam/types'
import ClassificationTestClient from '../_components/ClassificationTestClient'
import { previewQuestion } from '../_components/preview-question'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu T33 · N5 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Xem hoạt ảnh bé gái đi hái quả và chọn chữ cái trên quả.',
  robots: { index: false, follow: false },
}

export default function QuestionT33SubN5TestPage() {
  const visitSeed = randomUUID()
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-t33-sub-n5:${index}`
    const generated = generateQuestion33({ seedHash: stableHash(seed), random: createSeededRandom(seed) })
    return { ...previewQuestion(generated), number: 33 } satisfies ExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={33} questionLabel="Mẫu câu T33 · N5" />
    <ClassificationTestClient
      questions={questions}
      title="Kiểm tra câu T33 · N5"
      description="Mỗi lượt tạo 10 biến thể: chọn ngẫu nhiên táo, cam, xoài hoặc lê; bé gái đi đến hái một trong sáu quả mang chữ cái."
    />
  </>
}
