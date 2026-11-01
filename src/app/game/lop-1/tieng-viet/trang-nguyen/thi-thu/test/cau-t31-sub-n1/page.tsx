import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import { generateIdentifySchoolEventQuestion } from '../../_exam/question-generators'
import { SCHOOL_EVENTS } from '../../_exam/question31-knowledge'
import type { ExamQuestion } from '../../_exam/types'
import ClassificationTestClient from '../_components/ClassificationTestClient'
import { previewQuestion } from '../_components/preview-question'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu T31 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Xem thử câu nhận biết sự kiện ở trường qua hình ảnh và voice.',
  robots: { index: false, follow: false },
}

export default function QuestionT31TestPage() {
  const visitSeed = randomUUID()
  const startEventIndex = Math.floor(createSeededRandom(visitSeed)() * SCHOOL_EVENTS.length)
  const questions = Array.from({ length: 10 }, (_, index) => {
    const seed = `${visitSeed}:question-t31:${index}`
    const seededRandom = createSeededRandom(seed)
    const targetIndex = (startEventIndex + index) % SCHOOL_EVENTS.length
    let firstRandomValue = true
    const random = () => {
      if (firstRandomValue) {
        firstRandomValue = false
        return (targetIndex + 0.5) / SCHOOL_EVENTS.length
      }
      return seededRandom()
    }
    const generated = generateIdentifySchoolEventQuestion({ seedHash: stableHash(seed), random })
    return { ...previewQuestion(generated), number: 31 } satisfies ExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={31} questionLabel="Mẫu câu T31" />
    <ClassificationTestClient
      questions={questions}
      title="Kiểm tra câu T31"
      description="Tạo 10 biến thể có đủ bốn sự kiện; mỗi đáp án phát voice tương ứng."
    />
  </>
}
