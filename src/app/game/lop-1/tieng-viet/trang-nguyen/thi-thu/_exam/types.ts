export type ExamQuestionType =
  | 'single-choice'
  | 'image-choice'
  | 'audio-choice'
  | 'multi-select'
  | 'text-input'
  | 'number-input'
  | 'hidden-letter-input'
  | 'rotated-letter-input'
  | 'matching'
  | 'drag-match'
  | 'categorize'
  | 'sorting'
  | 'select-input'
  | 'video-select'
  | 'animated-select'
  | 'drag-to-slot'
  | 'drag-fill'

export type FindTargetObjectTheme = 'star' | 'balloon' | 'gift' | 'candy'
export type LetterBoardSlot = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type LetterBoardDecoration = 'sun' | 'flower' | 'apple' | 'cloud' | 'heart' | 'star' | 'leaf' | 'candy'
export type LetterBoardLetter = { letter: string; slot: LetterBoardSlot; rotation: number }
export type LetterBoardData = { letters: LetterBoardLetter[]; decorations: LetterBoardDecoration[] }
export type NumberCardDecoration = 'flower' | 'heart' | 'leaf' | 'spiral' | 'star' | 'cloud' | 'butterfly'
export type NumberCardData = { value: number; decorations: NumberCardDecoration[]; color: string }
export type LetterCardShape = 'circle' | 'flower-round' | 'rounded-blob'
export type LetterCardDecorationIcon = 'star' | 'heart' | 'flower' | 'leaf' | 'spiral' | 'dot'
export type LetterCardDecorationPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type LetterCardDecoration = { icon: LetterCardDecorationIcon; position: LetterCardDecorationPosition }
export type LetterCardData = {
  letter: string
  shape: LetterCardShape
  color: string
  borderColor: string
  decorations: LetterCardDecoration[]
}
export type CountLetterBoardItem = {
  id: string
  kind: 'letter' | 'number' | 'icon'
  value: string
  x: number
  y: number
  size: number
  rotation: number
  color: string
  zIndex: number
}
export type HiddenLetterRelation = 'inside'
export type HiddenLetterSceneItem = {
  id: string
  value: string
  x: number
  y: number
  size: number
  rotation: number
  color: string
  zIndex: number
}
export type HiddenLetterContainerScene = {
  id: string
  label: string
  category: 'object' | 'flower' | 'animal'
  imageId: string
  voice: string
  visual: ExamVisual
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}
export type HiddenLetterSceneData = {
  relation: HiddenLetterRelation
  container: HiddenLetterContainerScene
  letters: HiddenLetterSceneItem[]
}
export type RotatedLetterBoardStyle = 'scallop' | 'rounded-square' | 'double-border'
export type RotatedLetterBoardItem = {
  id: string
  letter: string
  x: number
  y: number
  size: number
  rotation: 0 | 180
  color: string
}

export type ExamAnswer = string | string[] | Record<string, string>
export type ExamAnswers = Record<string, ExamAnswer>
export type ExamOptionLabel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type ExamSpriteCrop = {
  spriteSheet: string
  x: number
  y: number
  width: number
  height: number
  sheetWidth: number
  sheetHeight: number
}

export type ExamVisual = {
  type: 'emoji' | 'letter-card' | 'icon' | 'image' | 'shape' | 'star-letter' | 'bubble-letter' | 'object-letter'
  value: string
  label?: string
  accent?: string
  rotation?: number
  objectTheme?: FindTargetObjectTheme
  objectVariant?: string
  sprite?: ExamSpriteCrop
}

export type AnimatedQuestion24TargetMode = 'flower' | 'fruit'
export type AnimatedQuestion24Motion = 'fly' | 'run' | 'jump' | 'walk'
export type AnimatedQuestion24Actor = {
  id: string
  manifestId: 'animal'
  imageId: string
  label: string
  start: { x: number; y: number }
  visual: ExamVisual
}
export type AnimatedQuestion24Target = {
  id: string
  targetType: AnimatedQuestion24TargetMode
  manifestId: 'flower' | 'fruit'
  imageId: string
  label: string
  letter: string
  x: number
  y: number
  visual: ExamVisual
}
export type AnimatedQuestion24Data = {
  generator: 'ANIMATED_ACTOR_TO_LETTER_TARGET'
  subType: 'actor-to-letter-target'
  targetMode: AnimatedQuestion24TargetMode
  motion: AnimatedQuestion24Motion
  durationMs: number
  actor: AnimatedQuestion24Actor
  targets: AnimatedQuestion24Target[]
  destination: { x: number; y: number }
  options: string[]
  voice: string[]
}

export type ExamOption = {
  id: string
  label?: ExamOptionLabel
  text?: string
  visual?: ExamVisual
  voice?: string
}

export type SameLetterMatchAsset = {
  id: string
  label: string
  category: 'animal' | 'object'
  imageId: string
  manifest: 'animal' | 'object'
  voice: string
  visual: ExamVisual
}

export type SameLetterMatchItem = {
  id: string
  asset: SameLetterMatchAsset
  letter: string
}

export type SameLetterMatchData = {
  generator: 'MATCH_SAME_LETTER_TWO_GROUPS'
  subType: 'same-letter-two-groups'
  leftAsset: SameLetterMatchAsset
  rightAsset: SameLetterMatchAsset
  letters: string[]
  leftItems: SameLetterMatchItem[]
  rightItems: SameLetterMatchItem[]
  voiceSequence: string[]
  questionVoiceAvailable: boolean
  combinationKey: string
}

export type Question25Category = 'fruit' | 'object' | 'animal' | 'flower'
export type Question25AnalysisMode = 'initial' | 'rhyme' | 'tone' | 'contains-letter'
export type Question25Tone = 'ngang' | 'sắc' | 'huyền' | 'hỏi' | 'ngã' | 'nặng'
export type Question25ManifestId = 'fruit' | 'object' | 'animal' | 'flower'

export type Question25WordKnowledgeItem = {
  id: string
  category: Question25Category
  word: string
  imageId: string
  manifestId: Question25ManifestId
  initial?: string
  rhyme?: string
  tone?: Question25Tone
  /** NFC grapheme letters with tone marks removed, preserving ă/â/ê/ô/ơ/ư. */
  letters: string[]
}

export type ImageWordAnalysisData = {
  generator: 'ANALYZE_WORD_FROM_IMAGE'
  subType: 'image-word-analysis'
  category: Question25Category
  categoryLabel: string
  item: Question25WordKnowledgeItem
  analysisMode: Question25AnalysisMode
  analysisValue: string
  sentencePrefix: string
  sentenceVoice?: string[]
  selectionKey: string
  choices: string[]
}

export type ImageResemblesLetterAsset = {
  id: string
  manifestId: 'real-object-letter-shapes'
  imageId: string
  resemblesLetter: string
}

export type ImageResemblesLetterData = {
  generator: 'IMAGE_RESEMBLES_LETTER'
  subType: 'image-resembles-letter'
  sentencePrefix: string
  asset: ImageResemblesLetterAsset
  selectionKey: string
  choices: string[]
}

export type Question30FruitId = 'tao' | 'cam' | 'chuoi' | 'dua-hau' | 'xoai' | 'nho' | 'dua' | 'le'
export type FruitColorId = 'red' | 'green' | 'yellow' | 'orange' | 'purple' | 'pink'

export type Question30FruitMeta = {
  id: string
  label: string
  imageId: string
  voice: string
}

export type Question30ColorMeta = {
  id: FruitColorId
  label: string
  hex: string
  rgb: readonly [number, number, number]
  voice: string
}

export type Question30Item = {
  id: string
  fruit: Question30FruitMeta
  color: Question30ColorMeta
  /** The letter is intentionally visible on the fruit as the exercise clue. */
  letter: string
  voiceSequence: string[]
  voiceAvailable: boolean
}

export type Question30Data = {
  generator: 'FILL_FRUIT_COLOR_LETTER'
  subType: 'fruit-color-letter'
  items: Question30Item[]
  letterBank: string[]
  combinationKey: string
  selectionSignature: string
}

export type CommonSoundCategory =
  | 'object'
  | 'animal'
  | 'flower'
  | 'fruit'
  | 'vegetable'
  | 'tuber'
  | 'transportation'
  | 'word'

export type CommonSoundWordItem = {
  id: string
  word: string
  initial: string
  category: CommonSoundCategory
  voice: string
  imageId?: string
  manifestId?: Question25ManifestId
}

export type CommonSoundData = {
  generator: 'FIND_COMMON_SOUND'
  subType: 'common-sound'
  words: CommonSoundWordItem[]
  targetSound: string
  sentencePrefix: string
  selectionKey: string
  voiceSequence: string[]
  choices: string[]
}

export type LowerUpperMatchItem = {
  id: string
  displayLetter: string
  matchKey: string
  backgroundId: string
  backgroundLabel: string
  visual: ExamVisual
}

export type LowerUpperMatchData = {
  generator: 'MATCH_LOWER_UPPER_CASE'
  subType: 'lowercase-uppercase'
  leftBackgroundId: string
  rightBackgroundId: string
  letters: string[]
  leftItems: LowerUpperMatchItem[]
  rightItems: LowerUpperMatchItem[]
  combinationKey: string
  voiceSequence: string[]
  questionVoiceAvailable: boolean
}

export type ImageSoundMatchItemLeft = {
  id: string
  soundId: string
  letter: string
  imageId: string
  visual: ExamVisual
}

export type ImageSoundMatchItemRight = {
  id: string
  soundId: string
  audioId: string
  audioPath: string
}

export type ImageSoundMatchData = {
  generator: 'MATCH_IMAGE_WITH_SOUND'
  subType: 'image-to-audio'
  leftItems: ImageSoundMatchItemLeft[]
  rightItems: ImageSoundMatchItemRight[]
  questionVoiceAvailable: boolean
  combinationKey: string
}

export type ObjectSoundMatchItemLeft = {
  id: string
  objectId: string
  imageId: string
  word: string
  voice: string
  matchKey: string
  visual: ExamVisual
}

export type ObjectSoundMatchItemRight = {
  id: string
  objectId: string
  voice: string
  matchKey: string
}

export type ObjectSoundMatchData = {
  generator: 'MATCH_OBJECT_WITH_NAME'
  subType: 'object-image-to-audio'
  leftItems: ObjectSoundMatchItemLeft[]
  rightItems: ObjectSoundMatchItemRight[]
  questionVoiceAvailable: boolean
  combinationKey: string
}

export type ClassificationManifestId = 'vegetable' | 'tuber' | 'fruit' | 'animal' | 'flower'

export type ClassificationItem = {
  id: string
  kind: 'text' | 'image'
  value?: string
  image?: { manifestId: ClassificationManifestId; imageId: string }
  groupId: string
  decoration?: { type?: 'flower' | 'ball' }
  color?: string
}

export type ClassificationDragDropData = {
  generator: 'CLASSIFY_NUMBER_AND_LETTER' | 'CLASSIFY_CATEGORY_PAIRS'
  subType: 'number-vs-letter' | 'category-vs-category'
  note: string
  items: ClassificationItem[]
  groups: Array<{ id: string; label: string }>
  voiceSequence: string[]
  maxItemsPerGroup: number
  acceptIncorrectPlacement: boolean
}

export type AlphabetOrderData = {
  generator: 'ORDER_VIETNAMESE_ALPHABET'
  subType: 'alphabet-order'
  items: Array<{ id: string; value: string }>
  allowedLetters: string[]
}

export type VehicleOrderData = {
  generator: 'ORDER_VEHICLES'
  subType: 'vehicle-order'
  category: 'transportation' | 'animal' | 'object' | 'flower' | 'fruit'
  categoryLabel: string
  readoutText: string
  items: Array<{ id: string; text: string; voice: string; visual: ExamVisual }>
}

export type ExamQuestion = {
  id: string
  templateId: `T${string}`
  subType?: string
  number: number
  type: ExamQuestionType
  prompt: string
  promptVoice?: string | string[]
  explanation?: string
  knowledgeKey?: string
  difficulty: 1 | 2 | 3
  options?: ExamOption[]
  content?: {
    type: 'text' | 'visual' | 'visuals'
    text?: string
    visual?: ExamVisual
    visuals?: ExamVisual[]
  }
  data?: Record<string, unknown>
}

export type GeneratedExamQuestion = ExamQuestion & { correctAnswer: ExamAnswer }

export type ExamDefinition = {
  id: string
  examVersion: string
  seed: string
  title: string
  durationSeconds: number
  totalQuestions: number
  questions: ExamQuestion[]
}

export type GeneratedExamDefinition = Omit<ExamDefinition, 'questions'> & { questions: GeneratedExamQuestion[] }
export type ExamAttemptStatus = 'in_progress' | 'submitted' | 'expired'

export type ExamAttempt = {
  id: string
  userId?: string
  examType: 'trang-nguyen-tieng-viet'
  grade: 1
  subject: 'tieng-viet'
  mode: 'thi-thu'
  examId: string
  examVersion: string
  questionIds: string[]
  seed: string
  answers: ExamAnswers
  status: ExamAttemptStatus
  durationSeconds: number
  startedAt: number
  expiresAt: number
  submittedAt: number | null
  score: number | null
  correctCount: number | null
  elapsedSeconds: number | null
  createdAt: number
  updatedAt: number
}
