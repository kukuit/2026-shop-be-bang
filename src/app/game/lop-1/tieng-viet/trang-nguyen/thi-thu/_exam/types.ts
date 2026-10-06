export type ExamQuestionType =
  | 'single-choice'
  | 'image-choice'
  | 'audio-choice'
  | 'multi-select'
  | 'text-input'
  | 'number-input'
  | 'matching'
  | 'categorize'
  | 'sorting'
  | 'select-input'
  | 'video-select'
  | 'drag-to-slot'

export type ExamAnswer = string | string[] | Record<string, string>
export type ExamAnswers = Record<string, ExamAnswer>
export type ExamOptionLabel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export type ExamVisual = {
  type: 'emoji' | 'letter-card' | 'icon' | 'image' | 'shape'
  value: string
  label?: string
  accent?: string
  rotation?: number
}

export type ExamOption = {
  id: string
  label?: ExamOptionLabel
  text?: string
  visual?: ExamVisual
  voice?: string
}

export type ExamQuestion = {
  id: string
  templateId: `T${string}`
  number: number
  type: ExamQuestionType
  prompt: string
  promptVoice?: string
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
