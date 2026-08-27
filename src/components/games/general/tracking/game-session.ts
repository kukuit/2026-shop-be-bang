import type {
  AnswerValue,
  GameId,
  GameQuestionResult,
  GameTrackingRepository,
  LearningKey,
  LessonId,
} from './types'

type TrackerOptions = { lessonId: LessonId; gameId: GameId; repository: GameTrackingRepository }
type ActiveQuestion = {
  learningKey: LearningKey
  expectedAnswer?: AnswerValue
  startedAt: number
  attempt: number
}

const devLog = (label: string, value: unknown) => {
  if (process.env.NODE_ENV === 'development') console.info(`[GameTracking] ${label}`, value)
}

export class GameTracker {
  private readonly results: GameQuestionResult[] = []
  private startedAt = Date.now()
  private question?: ActiveQuestion
  private finished = false

  constructor(private readonly options: TrackerOptions) {
    devLog('Start', { lessonId: options.lessonId, gameId: options.gameId })
  }

  startQuestion(input: { learningKey: LearningKey; expectedAnswer?: AnswerValue }) {
    this.question = { ...input, startedAt: Date.now(), attempt: 1 }
  }

  recordAnswer(input: {
    learningKey: LearningKey
    correct: boolean
    expectedAnswer?: AnswerValue
    selectedAnswer?: AnswerValue
    responseTime?: number
    attempt?: number
  }) {
    const active = this.question?.learningKey === input.learningKey ? this.question : undefined
    const result: GameQuestionResult = {
      ...input,
      responseTime:
        input.responseTime ?? (active ? Math.max(0, Date.now() - active.startedAt) : undefined),
      attempt: input.attempt ?? active?.attempt ?? 1,
    }
    this.results.push(result)
    if (active) {
      active.attempt += 1
      active.startedAt = Date.now()
    }
    devLog('Answer', result)
  }

  async finishSession(score: number) {
    if (this.finished) return
    this.finished = true
    const sessionId = crypto.randomUUID()
    const correctCount = this.results.filter((result) => result.correct).length
    const session = {
      sessionId,
      lessonId: this.options.lessonId,
      gameId: this.options.gameId,
      score,
      totalQuestions: this.results.length,
      correctCount,
      wrongCount: this.results.filter((result) => !result.correct).length,
      duration: Math.max(0, Date.now() - this.startedAt),
      startedAt: this.startedAt,
      results: [...this.results],
    }
    try {
      const saved = await this.options.repository.saveSession(session)
      devLog('Session saved', { ...saved, lessonId: session.lessonId, gameId: session.gameId })
    } catch (error) {
      this.finished = false
      console.error('[GameTracking] Could not save session; gameplay was not interrupted.', error)
    }
  }
}
