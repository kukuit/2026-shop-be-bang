import { VOCABULARY_3000_LEARNING_KEY } from '@/app/game/vocabulary/lesson'
import { GAME_IDS, LESSON_IDS } from '@/components/games/general/tracking'
import type { CountGroup, DragDropGameConfig, DragDropLevel } from '@/components/games/drag-drop/types'
import type { VocabularyGameMode, VocabularyQuestion, VocabularyWord } from './types'
import { generateVocabularyQuestions } from './question-generator'
import { getVocabularySpriteCell } from './sprite'

function getAnswerValue(question: VocabularyQuestion, optionId: string) {
  const option = question.options.find((candidate) => candidate.id === optionId)
  if (!option) throw new Error(`Missing vocabulary option ${optionId} for ${question.id}`)
  return option.label
}

function createGroup(question: VocabularyQuestion, mode: VocabularyGameMode): CountGroup {
  if (mode === 'word-meaning') return { id: question.targetWordId, icon: question.targetLabel, count: 1, label: question.targetLabel }
  if (mode === 'audio-word') return {
    id: question.targetWordId,
    icon: '?',
    count: 1,
    label: 'ô nghe',
    audio: { url: question.targetAudioUrl, text: question.targetLabel, language: 'en-US' },
  }
  if (!question.targetImage) throw new Error(`Question ${question.id} has no image asset.`)
  if (question.targetImage.type === 'single') return {
    id: question.targetWordId,
    icon: '🖼️',
    count: 1,
    label: question.targetMeaning,
    imageSrc: question.targetImage.url,
    imageAlt: question.targetMeaning,
  }
  const cell = getVocabularySpriteCell(question.targetImage.sheet, question.targetImage.index)
  return {
    id: question.targetWordId,
    icon: '🖼️',
    count: 1,
    label: question.targetMeaning,
    imageSrc: cell.src,
    imageAlt: question.targetMeaning,
    imageCrop: { row: cell.row, column: cell.column, rows: cell.rows, columns: cell.columns },
    imageAspectRatio: 1,
  }
}

export function createVocabularyDragDropLevels(questions: readonly VocabularyQuestion[], mode: VocabularyGameMode): DragDropLevel[] {
  const levels: DragDropLevel[] = []
  let batch: VocabularyQuestion[] = []
  let batchKey = ''
  const flush = () => {
    if (!batch.length) return
    const first = batch[0]
    const start = questions.indexOf(batch[0]) + 1
    const end = start + batch.length - 1
    const answerDomain = first.options.map((option) => getAnswerValue(first, option.id))
    if (new Set(answerDomain.map((answer) => answer.normalize('NFC').toLocaleLowerCase('vi'))).size !== answerDomain.length) {
      throw new Error(`Duplicate answer labels in ${first.id}.`)
    }
    const answers: Record<string, string> = {}
    const learningKeys: Record<string, typeof VOCABULARY_3000_LEARNING_KEY> = {}
    for (const question of batch) {
      const values = question.options.map((option) => getAnswerValue(question, option.id))
      if (values.join('\u0000') !== answerDomain.join('\u0000')) throw new Error(`Matching choices changed within ${batchKey}.`)
      answers[question.targetWordId] = getAnswerValue(question, question.correctOptionId)
      learningKeys[question.targetWordId] = VOCABULARY_3000_LEARNING_KEY
    }
    levels.push({
      id: levels.length + 1,
      questionId: `vocabulary-${mode}-${start}-${end}`,
      type: 'matching',
      answerTrayColumns: answerDomain.length,
      title: mode === 'word-image' ? 'Kéo từ vào hình' : mode === 'audio-word' ? 'Nghe và kéo từ' : 'Ghép từ với nghĩa',
      instruction: `Kéo thẻ vào ô đúng · Bàn phím: Enter chọn thẻ, Tab tới ô, Enter ghép. Câu ${start}–${end}/${questions.length}`,
      groups: batch.map((question) => createGroup(question, mode)),
      answers,
      answerDomain,
      learningKeys,
    })
    batch = []
    batchKey = ''
  }

  questions.forEach((question) => {
    const key = `${question.category}|${question.partOfSpeech}|${question.frequencyTier}`
    if (batch.length && (key !== batchKey || question.screenId !== batch[0].screenId || batch.length >= 3)) flush()
    batchKey = key
    batch.push(question)
  })
  flush()
  return levels
}

export function createVocabularyDragDropConfig({
  words,
  gameMode,
  questionCount,
  weakWordIds = [],
  getLastPlayedAt,
  speechSynthesisAvailable = false,
  onAnswer,
  onGroupAudio,
  completionContent,
  onChangeActivity,
}: {
  words: readonly VocabularyWord[]
  gameMode: VocabularyGameMode
  questionCount: number
  weakWordIds?: readonly string[]
  getLastPlayedAt?: () => Readonly<Record<string, string>>
  speechSynthesisAvailable?: boolean
  onAnswer?: DragDropGameConfig['onAnswer']
  onGroupAudio?: DragDropGameConfig['onGroupAudio']
  completionContent?: DragDropGameConfig['completionContent']
  onChangeActivity?: DragDropGameConfig['onChangeActivity']
}): DragDropGameConfig {
  const initialQuestions = generateVocabularyQuestions({ words, gameMode, questionCount, weakWordIds, lastPlayedAt: getLastPlayedAt?.(), speechSynthesisAvailable })
  const initialLevels = createVocabularyDragDropLevels(initialQuestions, gameMode)
  if (!initialLevels.length) throw new Error('There are no valid vocabulary questions for this selection.')
  const screenLayout: Array<{ category: string; partOfSpeech: string; frequencyTier: number; count: number }> = []
  let previousScreenId = ''
  for (const question of initialQuestions) {
    const previous = screenLayout[screenLayout.length - 1]
    if (previous && previousScreenId === question.screenId) previous.count += 1
    else screenLayout.push({ category: question.category, partOfSpeech: question.partOfSpeech, frequencyTier: question.frequencyTier, count: 1 })
    previousScreenId = question.screenId
  }
  const generateLevels = () => {
    const questions = generateVocabularyQuestions({ words, gameMode, questionCount, weakWordIds, lastPlayedAt: getLastPlayedAt?.(), speechSynthesisAvailable, screenLayout })
    const levels = createVocabularyDragDropLevels(questions, gameMode)
    return levels.length === initialLevels.length ? levels : initialLevels
  }
  return {
    lessonId: LESSON_IDS.VOCABULARY_3000,
    gameId: GAME_IDS.DRAG_DROP,
    totalRounds: questionCount,
    maxRounds: initialLevels.length,
    scorePerCorrectTarget: 10,
    wolfEnabled: false,
    keyboardMatching: true,
    answerDomain: initialLevels[0].answerDomain ?? [],
    supportedTargets: [VOCABULARY_3000_LEARNING_KEY],
    initialLevels,
    loadLevels: () => generateLevels(),
    awaitLevelReload: true,
    answerTrayColumns: 'auto',
    answerNoun: gameMode === 'word-meaning' ? 'nghĩa tiếng Việt' : 'từ tiếng Anh',
    completionReturnPath: '/game/vocabulary/drag-drop',
    onAnswer,
    onGroupAudio,
    completionContent,
    onChangeActivity,
  }
}
