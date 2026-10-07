'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Grid2X2, LoaderCircle, X } from 'lucide-react'
import { isQuestionAnswered } from '../_exam/answer-utils'
import { MOCK_EXAM_DURATION_SECONDS, MOCK_EXAM_ID, MOCK_EXAM_VERSION } from '../_exam/config'
import { generateMockTrangNguyenExam, sanitizeGeneratedExam } from '../_exam/exam-generator'
import type { ExamAnswer, ExamAnswers, ExamQuestion } from '../_exam/types'
import {
  LOCAL_ATTEMPT_VERSION,
  TRANG_NGUYEN_EXAM_KEY,
  loadLocalAttempt,
  removeLocalAttempt,
  saveLocalAttempt,
} from '../_lib/local-attempt'
import type { LocalTrangNguyenAttempt, SubmittedTrangNguyenAttempt } from '../_lib/local-attempt'
import ExamResult from './ExamResult'
import ExamHeader from './ExamHeader'
import ExamSidebar from './ExamSidebar'
import ExamStartOverlay from './ExamStartOverlay'
import ExamTimer from './ExamTimer'
import QuestionRenderer from './QuestionRenderer'
import QuestionNavigator from './QuestionNavigator'
import SubmitExamDialog from './SubmitExamDialog'
import AttemptReview from './AttemptReview'
import { useExamAudio } from '../_hooks/useExamAudio'
import styles from './exam.module.css'

type LoadState = 'loading' | 'ready' | 'error'
type AttemptApiResponse = { attempt?: SubmittedTrangNguyenAttempt | null; message?: string }
const QUESTIONS_PER_PAGE = 5
const EXAM_LANDING_PATH = '/game/lop-1/tieng-viet/trang-nguyen/thi-thu'
const SUBMIT_ERROR_MESSAGE = 'Chưa thể nộp bài. Bài làm của bé vẫn được lưu trên thiết bị. Hãy thử lại.'

async function enterExamFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
  } catch (error) {
    console.warn('Fullscreen is unavailable', error)
  }
}

function toAnswers(attempt: LocalTrangNguyenAttempt | null): ExamAnswers {
  if (!attempt) return {}
  return Object.fromEntries(attempt.questions
    .filter(question => question.userAnswer !== null)
    .map(question => [question.id, question.userAnswer!]))
}

function buildSubmitPayload(attempt: LocalTrangNguyenAttempt) {
  const { id, ...payload } = attempt
  return { ...payload, attemptId: id, submittedAt: new Date().toISOString() }
}

function createLocalAttempt(): LocalTrangNguyenAttempt {
  const id = crypto.randomUUID()
  const seed = crypto.randomUUID()
  const exam = sanitizeGeneratedExam(generateMockTrangNguyenExam({ seed, examVersion: MOCK_EXAM_VERSION }))
  const startedAt = new Date().toISOString()
  return {
    id,
    version: LOCAL_ATTEMPT_VERSION,
    status: 'IN_PROGRESS',
    examKey: TRANG_NGUYEN_EXAM_KEY,
    examId: MOCK_EXAM_ID,
    examVersion: MOCK_EXAM_VERSION,
    seed,
    startedAt,
    durationSeconds: exam.durationSeconds,
    currentPage: 1,
    questions: exam.questions.map((question, index) => ({
      id: question.id,
      order: index + 1,
      questionType: question.type,
      learningKey: question.knowledgeKey,
      snapshot: question,
      userAnswer: null,
      answeredAt: null,
    })),
  }
}

export default function TrangNguyenExam({ attemptId }: { attemptId?: string }) {
  const router = useRouter()
  const [loadState, setLoadState] = useState<LoadState>(attemptId ? 'loading' : 'ready')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<LocalTrangNguyenAttempt | null>(null)
  const [submittedResult, setSubmittedResult] = useState<SubmittedTrangNguyenAttempt | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showStartConfirm, setShowStartConfirm] = useState(false)
  const [showNavigator, setShowNavigator] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [reviewing, setReviewing] = useState(false)
  const attemptRef = useRef<LocalTrangNguyenAttempt | null>(null)
  const startingRef = useRef(false)
  const isSubmittingRef = useRef(false)
  const autoSubmitAttemptRef = useRef<string | null>(null)
  const pendingQuestionNavigationRef = useRef<number | null>(null)
  const { playingId, play, stop, volume, setVolume } = useExamAudio()

  const questions = useMemo(() => attempt?.questions.map(question => question.snapshot) ?? [], [attempt])
  const answers = useMemo(() => toAnswers(attempt), [attempt])
  const currentPage = attempt?.currentPage ?? 1
  const pageCount = Math.ceil(questions.length / QUESTIONS_PER_PAGE)
  const visibleQuestions = useMemo(() => questions.slice((currentPage - 1) * QUESTIONS_PER_PAGE, currentPage * QUESTIONS_PER_PAGE), [currentPage, questions])
  const answeredCount = useMemo(() => questions.filter(question => isQuestionAnswered(question, answers[question.id])).length, [answers, questions])
  const startedAtMs = attempt ? Date.parse(attempt.startedAt) : now
  const remainingSeconds = attempt
    ? Math.max(0, attempt.durationSeconds - Math.floor((now - startedAtMs) / 1000))
    : MOCK_EXAM_DURATION_SECONDS
  const editable = attempt?.status === 'IN_PROGRESS' && remainingSeconds > 0 && !submitting
  const canSubmit = attempt?.status === 'IN_PROGRESS' && !submitting

  useEffect(() => { attemptRef.current = attempt }, [attempt])

  useEffect(() => {
    if (!attemptId) {
      setAttempt(null)
      attemptRef.current = null
      setSubmittedResult(null)
      setLoadError(null)
      setLoadState('ready')
      setReviewing(false)
      return
    }

    let cancelled = false
    const restore = async () => {
      setLoadState('loading')
      setLoadError(null)
      setActionError(null)
      setAttempt(null)
      attemptRef.current = null
      setSubmittedResult(null)
      setReviewing(false)
      const local = loadLocalAttempt(attemptId)
      if (local) {
        if (local.status === 'SUBMITTING') {
          try {
            const response = await fetch('/api/exams/trang-nguyen/attempts/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(buildSubmitPayload(local)),
            })
            const body = await response.json() as AttemptApiResponse
            if (!response.ok || !body.attempt) throw new Error('pending submit could not be confirmed')
            removeLocalAttempt(local.id)
            if (cancelled) return
            setSubmittedResult(body.attempt)
            setLoadState('ready')
            return
          } catch {
            const restored: LocalTrangNguyenAttempt = { ...local, status: 'IN_PROGRESS' }
            saveLocalAttempt(restored)
            if (cancelled) return
            setActionError(SUBMIT_ERROR_MESSAGE)
            setAttempt(restored)
            attemptRef.current = restored
            setCurrentQuestion((restored.currentPage - 1) * QUESTIONS_PER_PAGE + 1)
            setLoadState('ready')
            return
          }
        }
        const restored = local
        if (cancelled) return
        setAttempt(restored)
        attemptRef.current = restored
        setCurrentQuestion((restored.currentPage - 1) * QUESTIONS_PER_PAGE + 1)
        setLoadState('ready')
        return
      }

      try {
        const response = await fetch(`/api/exams/trang-nguyen/attempts/${encodeURIComponent(attemptId)}`, { cache: 'no-store' })
        const body = await response.json() as AttemptApiResponse
        if (!response.ok || !body.attempt) throw new Error(body.message ?? 'Phiên thi không tồn tại hoặc đã hết hạn.')
        if (cancelled) return
        setSubmittedResult(body.attempt)
        setLoadState('ready')
      } catch (error) {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : 'Phiên thi không tồn tại hoặc đã hết hạn.')
        setLoadState('error')
      }
    }
    void restore()
    return () => { cancelled = true }
  }, [attemptId])

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [attempt?.id, attempt?.status])

  const persistAttempt = useCallback((next: LocalTrangNguyenAttempt) => {
    attemptRef.current = next
    setAttempt(next)
    if (!saveLocalAttempt(next)) setActionError('Không lưu được bài làm trên thiết bị. Hãy kiểm tra dung lượng trình duyệt trước khi tiếp tục.')
  }, [])

  const startExam = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true
    setStarting(true)
    setActionError(null)
    await enterExamFullscreen()
    try {
      const nextAttempt = createLocalAttempt()
      if (!saveLocalAttempt(nextAttempt)) throw new Error('Không lưu được đề thi trên thiết bị. Hãy kiểm tra dung lượng trình duyệt rồi thử lại.')
      stop()
      setShowStartConfirm(false)
      router.push(`${EXAM_LANDING_PATH}/${nextAttempt.id}`)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Chưa tạo được đề thi. Bé thử lại nhé.')
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }, [router, stop])

  const updateAnswer = useCallback((questionId: string, answer: ExamAnswer) => {
    const current = attemptRef.current
    if (!current || current.status !== 'IN_PROGRESS' || remainingSeconds <= 0 || submitting) return
    const next: LocalTrangNguyenAttempt = {
      ...current,
      questions: current.questions.map(question => question.id === questionId
        ? { ...question, userAnswer: answer, answeredAt: new Date().toISOString() }
        : question),
    }
    persistAttempt(next)
    setActionError(null)
  }, [persistAttempt, remainingSeconds, submitting])

  const submitExam = useCallback(async () => {
    const currentAttempt = attemptRef.current
    if (!currentAttempt || currentAttempt.status !== 'IN_PROGRESS' || isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSubmitting(true)
    setActionError(null)
    setShowSubmitDialog(false)
    stop()
    const submittingAttempt: LocalTrangNguyenAttempt = { ...currentAttempt, status: 'SUBMITTING' }
    persistAttempt(submittingAttempt)
    try {
      const response = await fetch('/api/exams/trang-nguyen/attempts/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSubmitPayload(submittingAttempt)),
      })
      const body = await response.json() as AttemptApiResponse
      if (!response.ok || !body.attempt) throw new Error(SUBMIT_ERROR_MESSAGE)
      removeLocalAttempt(currentAttempt.id)
      attemptRef.current = null
      setAttempt(null)
      setSubmittedResult(body.attempt)
      setReviewing(false)
    } catch {
      const restored: LocalTrangNguyenAttempt = { ...submittingAttempt, status: 'IN_PROGRESS' }
      persistAttempt(restored)
      setActionError(SUBMIT_ERROR_MESSAGE)
    } finally {
      isSubmittingRef.current = false
      setSubmitting(false)
    }
  }, [persistAttempt, stop])

  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS' || remainingSeconds > 0 || isSubmittingRef.current
      || autoSubmitAttemptRef.current === attempt.id) return
    autoSubmitAttemptRef.current = attempt.id
    void submitExam()
  }, [attempt?.id, attempt?.status, remainingSeconds, submitExam])

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-question-number]'))
    if (!nodes.length || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
      const number = visible?.target.getAttribute('data-question-number')
      if (number) setCurrentQuestion(Number(number))
    }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.1, 0.25, 0.5] })
    nodes.forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [loadState, attempt?.id, visibleQuestions])

  useEffect(() => {
    const pendingNumber = pendingQuestionNavigationRef.current
    if (pendingNumber === null || !visibleQuestions.some(question => question.number === pendingNumber)) return
    pendingQuestionNavigationRef.current = null
    document.getElementById(`question-${pendingNumber}`)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [visibleQuestions])

  useEffect(() => {
    if (attempt?.status !== 'IN_PROGRESS') return
    const persistDraftLocally = () => {
      const current = attemptRef.current
      if (current?.status === 'IN_PROGRESS') saveLocalAttempt(current)
    }
    const warnBeforeExit = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
      persistDraftLocally()
    }
    window.addEventListener('beforeunload', warnBeforeExit)
    window.addEventListener('pagehide', persistDraftLocally)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeExit)
      window.removeEventListener('pagehide', persistDraftLocally)
    }
  }, [attempt?.status])

  const navigateToQuestion = useCallback((number: number) => {
    if (!questions.some(question => question.number === number)) return
    const targetPage = Math.floor((number - 1) / QUESTIONS_PER_PAGE) + 1
    pendingQuestionNavigationRef.current = number
    setCurrentQuestion(number)
    setShowNavigator(false)
    const current = attemptRef.current
    if (current && current.currentPage !== targetPage) persistAttempt({ ...current, currentPage: targetPage })
    const node = document.getElementById(`question-${number}`)
    if (node) {
      pendingQuestionNavigationRef.current = null
      node.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    }
  }, [persistAttempt, questions])

  const navigateToPage = useCallback((page: number) => {
    if (page < 1 || page > pageCount || page === currentPage) return
    const firstQuestionNumber = (page - 1) * QUESTIONS_PER_PAGE + 1
    pendingQuestionNavigationRef.current = firstQuestionNumber
    setCurrentQuestion(firstQuestionNumber)
    const current = attemptRef.current
    if (current) persistAttempt({ ...current, currentPage: page })
  }, [currentPage, pageCount, persistAttempt])

  const totalSeconds = attempt?.durationSeconds ?? MOCK_EXAM_DURATION_SECONDS

  if (loadState === 'loading') {
    return <><ExamHeader /><main className={`${styles.examPage} grid place-items-center px-4`}><p className="flex items-center gap-3 font-semibold text-[#555]"><LoaderCircle className="animate-spin" />Đang mở phiên thi…</p></main></>
  }
  if (loadState === 'error') {
    return <><ExamHeader /><main className={`${styles.examPage} grid place-items-center px-4`}><section className="max-w-lg rounded-lg border border-[#e8c9c6] bg-white p-6 text-center"><h1 className="text-xl font-semibold text-[#333]">Không mở được phiên thi</h1><p role="alert" className="mt-2 text-sm text-red-700">{loadError}</p><div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-full bg-[#c72029] px-5 font-bold text-white">Thử tải lại</button><button type="button" onClick={() => router.push(EXAM_LANDING_PATH)} className="min-h-11 rounded-full border border-[#d8cecc] px-5 font-semibold text-[#6f6664]">Về trang thi thử</button></div></section></main></>
  }

  if (submittedResult) return <><ExamHeader />{reviewing
    ? <AttemptReview attempt={submittedResult} onBack={() => setReviewing(false)} />
    : <ExamResult attempt={submittedResult} onReview={() => setReviewing(true)} onNewExam={() => void startExam()} starting={starting} error={actionError} />}</>

  const preview = !attempt
  const isReadOnly = preview || !editable

  return (
    <>
      <ExamHeader />
      <main className={styles.examPage}>
        {questions.length > 0 && <div className={`lg:hidden px-3 py-2 ${styles.mobileExamBar}`}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <ExamTimer compact remainingSeconds={preview ? totalSeconds : remainingSeconds} />
            <span className="whitespace-nowrap text-sm font-semibold text-[#555]">{answeredCount}/30</span>
            <button type="button" onClick={() => setShowNavigator(true)} aria-label="Mở danh sách câu hỏi" className="grid h-10 w-10 shrink-0 place-items-center rounded border border-[#ddd] bg-white text-[#555] hover:bg-[#fafafa]"><Grid2X2 size={19} /></button>
          </div>
        </div>}

        <div className={`${styles.examLayout} ${questions.length === 0 ? styles.examIntroLayout : ''}`}>
          <div className={styles.mainColumn}>
            {questions.length > 0 ? <>
              <section className={styles.mainPanel}>
                {actionError && <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded border border-[#ead6b5] bg-[#fffaf0] px-3 py-2.5 text-sm font-semibold text-[#725b31]"><span>{actionError}</span>{attempt?.status === 'IN_PROGRESS' && remainingSeconds === 0 && <button type="button" onClick={() => void submitExam()} disabled={submitting} className="shrink-0 underline">Nộp lại</button>}</div>}
                <div className={styles.questionList}>
                  {visibleQuestions.map(question => <QuestionRenderer
                    key={question.id}
                    question={question}
                    answer={answers[question.id]}
                    disabled={isReadOnly}
                    playingId={playingId}
                    audioVolume={volume}
                    onAudioVolumeChange={setVolume}
                    onAnswer={updateAnswer}
                    onPlayAudio={play}
                  />)}
                </div>
              </section>
              <nav className={styles.examPagination} aria-label="Phân trang bài thi">
                <button type="button" className={styles.paginationButton} disabled={currentPage <= 1} onClick={() => navigateToPage(currentPage - 1)}><ArrowLeft size={14} aria-hidden="true" /><span>Trang trước</span></button>
                <span className={styles.paginationCurrent} aria-current="page" aria-label={`Trang ${currentPage} trên ${pageCount}`}>{currentPage}</span>
                <button type="button" className={styles.paginationButton} disabled={currentPage >= pageCount} onClick={() => navigateToPage(currentPage + 1)}><span>Trang sau</span><ArrowRight size={14} aria-hidden="true" /></button>
              </nav>
            </> : <section className={styles.startPreview}>
              <h1>Thi thử Trạng Nguyên Tiếng Việt lớp 1</h1>
              <p>Bài thi gồm 30 câu hỏi. Bé có 30 phút để hoàn thành bài thi.</p>
              {actionError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{actionError}</p>}
              <button type="button" className={styles.startButton} onClick={() => { setActionError(null); setShowStartConfirm(true) }}>Bắt đầu thi</button>
            </section>}
          </div>

          {questions.length > 0 && <ExamSidebar
            questions={questions}
            answers={answers}
            currentQuestion={currentQuestion}
            remainingSeconds={preview ? totalSeconds : remainingSeconds}
            disabled={!canSubmit}
            onNavigate={navigateToQuestion}
            onSubmit={() => setShowSubmitDialog(true)}
          />}
        </div>

        {!attempt && showStartConfirm && <ExamStartOverlay onStart={() => void startExam()} onCancel={() => { setShowStartConfirm(false); setActionError(null) }} starting={starting} error={actionError} />}
        {showNavigator && <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/40 lg:hidden" onMouseDown={event => { if (event.target === event.currentTarget) setShowNavigator(false) }}>
          <section role="dialog" aria-modal="true" aria-label="Danh sách câu hỏi và nộp bài" className="max-h-[82dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:p-6">
            <div className="mx-auto max-w-lg">
              <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black">Danh sách câu hỏi</h2><p className="mt-0.5 text-sm text-slate-500">Đã trả lời {answeredCount}/30 câu</p></div><button type="button" onClick={() => setShowNavigator(false)} aria-label="Đóng danh sách câu hỏi" className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"><X size={20} /></button></div>
              <QuestionNavigator questions={questions} answers={answers} currentQuestion={currentQuestion} disabled={!editable} onNavigate={navigateToQuestion} />
              <button type="button" disabled={!canSubmit} onClick={() => { setShowNavigator(false); setShowSubmitDialog(true) }} className="mt-5 min-h-12 w-full rounded-xl bg-red-700 px-5 font-extrabold text-white hover:bg-red-800 disabled:opacity-50">NỘP BÀI</button>
            </div>
          </section>
        </div>}
        {showSubmitDialog && <SubmitExamDialog answeredCount={answeredCount} submitting={submitting} error={actionError} onCancel={() => { setShowSubmitDialog(false); setActionError(null) }} onSubmit={() => void submitExam()} />}
      </main>
    </>
  )
}
