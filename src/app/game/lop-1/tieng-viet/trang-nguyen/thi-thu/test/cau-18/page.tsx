import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import {
  generateImageWithSoundMatchQuestion,
  getImageWithSoundCombinationKey,
  MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS,
} from '../../_exam/question-generators'
import type { ImageSoundMatchData } from '../../_exam/types'
import type { TestExamQuestion } from '../_components/test-types'
import AudioMatchTestClient from '../_components/AudioMatchTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 18 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra ghép hình khủng long chữ với âm thanh chữ cái.',
  robots: { index: false, follow: false },
}

export default function QuestionEighteenTestPage() {
  const visitSeed = randomUUID()
  const usedSoundIds = new Set<string>()
  const usedCombinations = new Set<string>()
  const questions = Array.from({ length: 10 }, (_, index) => {
    if (MATCH_IMAGE_WITH_SOUND_SINGLE_SOUNDS.length - usedSoundIds.size < 3) {
      usedSoundIds.clear()
    }
    const seed = `${visitSeed}:question-eighteen:${index}`
    const question = generateImageWithSoundMatchQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeSoundIds: Array.from(usedSoundIds),
      excludeCombinations: Array.from(usedCombinations),
    })
    const data = question.data as ImageSoundMatchData
    for (const item of data.leftItems) usedSoundIds.add(item.soundId)
    usedCombinations.add(getImageWithSoundCombinationKey(data.leftItems.map(item => item.soundId)))
    const { correctAnswer, ...visibleQuestion } = question
    return { ...visibleQuestion, testAnswer: correctAnswer, number: 18 } satisfies TestExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={18} />
    <AudioMatchTestClient
      questions={questions}
      title="Kiểm tra generator câu 18"
      description="Nghe từng loa bên phải, rồi chỉ kéo chấm tròn cạnh hình khủng long để ghép âm tương ứng. Voice hướng dẫn sẽ được thêm khi có bản thu."
    />
  </>
}
