import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import TestQuestionHeader from '../_components/TestQuestionHeader'
import { createSeededRandom, stableHash } from '../../_exam/shuffle'
import {
  generateObjectImageWithAudioQuestion,
  getObjectWithNameCombinationKey,
  MATCH_OBJECT_WITH_NAME_POOL_IDS,
} from '../../_exam/question-generators'
import type { ObjectSoundMatchData } from '../../_exam/types'
import type { TestExamQuestion } from '../_components/test-types'
import AudioMatchTestClient from '../_components/AudioMatchTestClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test câu 19 · Thi thử Trạng Nguyên Tiếng Việt lớp 1',
  description: 'Kiểm tra ghép hình đồ vật với tên gọi được đọc.',
  robots: { index: false, follow: false },
}

export default function QuestionNineteenTestPage() {
  const visitSeed = randomUUID()
  const usedObjectIds = new Set<string>()
  const usedCombinations = new Set<string>()
  const questions = Array.from({ length: 10 }, (_, index) => {
    if (MATCH_OBJECT_WITH_NAME_POOL_IDS.length - usedObjectIds.size < 3) usedObjectIds.clear()
    const seed = `${visitSeed}:question-nineteen:${index}`
    const question = generateObjectImageWithAudioQuestion({
      seedHash: stableHash(seed),
      random: createSeededRandom(seed),
      excludeObjectIds: Array.from(usedObjectIds),
      excludeCombinations: Array.from(usedCombinations),
    })
    const data = question.data as ObjectSoundMatchData
    for (const item of data.leftItems) usedObjectIds.add(item.objectId)
    usedCombinations.add(getObjectWithNameCombinationKey(data.leftItems.map(item => item.objectId)))
    const { correctAnswer, ...visibleQuestion } = question
    return {
      ...visibleQuestion,
      testAnswer: correctAnswer,
      number: 19,
      data: {
        ...data,
        leftItems: data.leftItems.map(({ matchKey: _matchKey, word: _word, voice: _voice, ...item }) => item),
        rightItems: data.rightItems.map(({ matchKey: _matchKey, ...item }) => item),
      },
    } satisfies TestExamQuestion
  })

  return <>
    <TestQuestionHeader questionNumber={19} />
    <AudioMatchTestClient
      questions={questions}
      title="Kiểm tra generator câu 19"
      description="Nghe tên gọi bằng các loa bên phải, rồi kéo riêng chấm tròn cạnh mỗi hình đồ vật để nối."
    />
  </>
}
