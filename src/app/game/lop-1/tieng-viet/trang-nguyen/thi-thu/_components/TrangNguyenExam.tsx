'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Grid2X2, LoaderCircle, X } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { fetchWithAuthRetry } from '@/lib/auth/client-fetch'
import { isQuestionAnswered } from '../_exam/answer-utils'
import { MOCK_EXAM_DURATION_SECONDS, MOCK_EXAM_ID, MOCK_EXAM_VERSION } from '../_exam/config'
import type { ExamAnswers, ExamAttempt, ExamAttemptStatus, ExamDefinition, ExamQuestion, ExamAnswer } from '../_exam/types'
import ExamResult from './ExamResult'
import ExamHeader from './ExamHeader'
import ExamSidebar from './ExamSidebar'
import ExamStartOverlay from './ExamStartOverlay'
import ExamTimer from './ExamTimer'
import QuestionRenderer from './QuestionRenderer'
import QuestionNavigator from './QuestionNavigator'
import SubmitExamDialog from './SubmitExamDialog'
import { useExamAudio } from '../_hooks/useExamAudio'
import styles from './exam.module.css'

type LoadState = 'loading' | 'ready' | 'error'
type ApiAttemptResponse = { attempt?: ExamAttempt | null; exam?: ExamDefinition; message?: string }
const QUESTIONS_PER_PAGE = 5

async function enterExamFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
  } catch (error) {
    console.warn('Fullscreen is unavailable', error)
  }
}

function storageKey(userId?: string) {
  return `shop-be-bang:trang-nguyen-mock-v2:${userId ?? 'guest'}`
}

function readLocalAttempt(userId?: string): ExamAttempt | null {
  try {
    const value = localStorage.getItem(storageKey(userId))
    if (!value) return null
    const attempt = JSON.parse(value) as ExamAttempt
    if (!attempt || attempt.examId !== MOCK_EXAM_ID || attempt.examVersion !== MOCK_EXAM_VERSION
      || typeof attempt.seed !== 'string' || !Array.isArray(attempt.questionIds)) return null
    return attempt
  } catch {
    return null
  }
}

function writeLocalAttempt(attempt: ExamAttempt, userId?: string) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(attempt)) } catch {}
}

function removeLocalAttempt(userId?: string) {
  try { localStorage.removeItem(storageKey(userId)) } catch {}
}

function messageFrom(body: ApiAttemptResponse, fallback: string) {
  return typeof body.message === 'string' ? body.message : fallback
}

async function loadGeneratedQuestions(seed: string, examVersion: string): Promise<ExamDefinition> {
  const query = new URLSearchParams({ seed, examVersion })
  const response = await fetch(`/api/exams/trang-nguyen?${query.toString()}`, { cache: 'no-store' })
  const body = await response.json() as ApiAttemptResponse
  if (!response.ok || !body.exam) throw new Error(messageFrom(body, 'Chưa khôi phục được đề thi.'))
  return body.exam
}

function examMatchesAttempt(exam: ExamDefinition, attempt: ExamAttempt) {
  return exam.id === attempt.examId && exam.examVersion === attempt.examVersion
    && exam.seed === attempt.seed
    && exam.questions.length === attempt.questionIds.length
    && exam.questions.every((question, index) => question.id === attempt.questionIds[index])
}

export default function TrangNguyenExam() {
  const { user, loading: authLoading } = useAuth()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [answers, setAnswers] = useState<ExamAnswers>({})
  const [now, setNow] = useState(() => Date.now())
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showStartConfirm, setShowStartConfirm] = useState(false)
  const [showNavigator, setShowNavigator] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)
  const isSubmittingRef = useRef(false)
  const attemptRef = useRef<ExamAttempt | null>(null)
  const answersRef = useRef<ExamAnswers>({})
  const mainColumnRef = useRef<HTMLDivElement>(null)
  const pendingScrollQuestion = useRef<number | null>(null)
  const { playingId, play, stop } = useExamAudio()

  useEffect(() => { attemptRef.current = attempt }, [attempt])
  useEffect(() => { answersRef.current = answers }, [answers])

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    const restore = async () => {
      setLoadState('loading')
      setLoadError(null)
      try {
        let remoteAttempt: ExamAttempt | null = null
        if (user) {
          const response = await fetchWithAuthRetry('/api/exams/trang-nguyen', { cache: 'no-store' })
          const body = await response.json() as ApiAttemptResponse
          if (!response.ok) throw new Error(messageFrom(body, 'Chưa tải được bài thi đã nộp.'))
          remoteAttempt = body.attempt ?? null
        }
        const localAttempt = readLocalAttempt(user?.id)
        const canResumeLocal = Boolean(localAttempt?.status === 'in_progress'
          && (!remoteAttempt || localAttempt.id !== remoteAttempt.id || localAttempt.startedAt > remoteAttempt.startedAt))
        const saved = canResumeLocal ? localAttempt : remoteAttempt ?? (!user ? localAttempt : null)
        let restoredQuestions: ExamQuestion[] = []
        if (saved?.status === 'in_progress') {
          const exam = await loadGeneratedQuestions(saved.seed, saved.examVersion)
          if (!examMatchesAttempt(exam, saved)) throw new Error('Mã câu hỏi trong bản nháp không khớp đề thi.')
          restoredQuestions = exam.questions
        }
        if (cancelled) return
        setAttempt(saved)
        attemptRef.current = saved
        setQuestions(restoredQuestions)
        setAnswers(saved?.answers ?? {})
        answersRef.current = saved?.answers ?? {}
        if (saved) writeLocalAttempt(saved, user?.id)
        setLoadState('ready')
      } catch (error) {
        if (cancelled) return
        const localAttempt = readLocalAttempt(user?.id)
        if (localAttempt?.status === 'in_progress') {
          try {
            const exam = await loadGeneratedQuestions(localAttempt.seed, localAttempt.examVersion)
            if (!examMatchesAttempt(exam, localAttempt)) throw new Error('Mã câu hỏi trong bản nháp không khớp đề thi.')
            setAttempt(localAttempt)
            attemptRef.current = localAttempt
            setQuestions(exam.questions)
            setAnswers(localAttempt.answers ?? {})
            answersRef.current = localAttempt.answers ?? {}
            setActionError('Đang tiếp tục từ bản lưu trên thiết bị. Bài làm chỉ được lưu lên tài khoản khi bé nộp bài.')
            setLoadState('ready')
            return
          } catch {}
        }
        setLoadError(error instanceof Error ? error.message : 'Chưa tải được bài thi đã lưu.')
        setLoadState('error')
      }
    }
    void restore()
    return () => { cancelled = true }
  }, [authLoading, user])

  useEffect(() => {
    if (attempt?.status !== 'in_progress') return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [attempt?.id, attempt?.status])

  const remainingSeconds = useMemo(() => {
    if (!attempt || attempt.status !== 'in_progress') return MOCK_EXAM_DURATION_SECONDS
    return Math.max(0, Math.ceil((attempt.expiresAt - now) / 1000))
  }, [attempt, now])
  const answeredCount = useMemo(() => questions.filter(question => isQuestionAnswered(question, answers[question.id])).length, [answers, questions])
  const editable = attempt?.status === 'in_progress' && remainingSeconds > 0 && !submitting
  const totalPages = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_PAGE))
  const pageQuestions = useMemo(() => questions.slice(currentPage * QUESTIONS_PER_PAGE, (currentPage + 1) * QUESTIONS_PER_PAGE), [currentPage, questions])

  const startExam = useCallback(async () => {
    if (starting) return
    setStarting(true)
    setActionError(null)
    await enterExamFullscreen()
    try {
      let nextAttempt: ExamAttempt
      let exam: ExamDefinition
      if (user) {
        const response = await fetchWithAuthRetry('/api/exams/trang-nguyen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
        })
        const body = await response.json() as ApiAttemptResponse
        if (!response.ok || !body.attempt || !body.exam) throw new Error(messageFrom(body, 'Chưa bắt đầu được bài thi.'))
        nextAttempt = body.attempt
        exam = body.exam
      } else {
        const seed = crypto.randomUUID()
        exam = await loadGeneratedQuestions(seed, MOCK_EXAM_VERSION)
        const startedAt = Date.now()
        nextAttempt = {
          id: crypto.randomUUID(),
          examType: 'trang-nguyen-tieng-viet',
          grade: 1,
          subject: 'tieng-viet',
          mode: 'thi-thu',
          examId: MOCK_EXAM_ID,
          examVersion: MOCK_EXAM_VERSION,
          questionIds: exam.questions.map(question => question.id),
          seed,
          answers: {},
          status: 'in_progress',
          durationSeconds: exam.durationSeconds,
          startedAt,
          expiresAt: startedAt + exam.durationSeconds * 1000,
          submittedAt: null,
          score: null,
          correctCount: null,
          elapsedSeconds: null,
          createdAt: startedAt,
          updatedAt: startedAt,
        }
      }
      if (!examMatchesAttempt(exam, nextAttempt)) throw new Error('Đề thi trả về không khớp phiên thi.')
      setAttempt(nextAttempt)
      attemptRef.current = nextAttempt
      setQuestions(exam.questions)
      setAnswers({})
      answersRef.current = {}
      setCurrentPage(0)
      setCurrentQuestion(1)
      setShowStartConfirm(false)
      writeLocalAttempt(nextAttempt, user?.id)
      setLoadState('ready')
      stop()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Chưa bắt đầu được bài thi. Bé thử lại nhé.')
    } finally {
      setStarting(false)
    }
  }, [starting, stop, user])

  const updateAnswer = useCallback((questionId: string, answer: ExamAnswer) => {
    if (!editable) return
    const nextAnswers = { ...answersRef.current, [questionId]: answer }
    answersRef.current = nextAnswers
    setAnswers(nextAnswers)
    if (attemptRef.current) writeLocalAttempt({ ...attemptRef.current, answers: nextAnswers, updatedAt: Date.now() }, user?.id)
    setActionError(null)
  }, [editable, user?.id])

  const submitExam = useCallback(async () => {
    const currentAttempt = attemptRef.current
    if (!currentAttempt || currentAttempt.status !== 'in_progress' || isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSubmitting(true)
    setActionError(null)
    setShowSubmitDialog(false)
    stop()
    try {
      let completed: ExamAttempt
      if (user) {
        const response = await fetchWithAuthRetry('/api/exams/trang-nguyen', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit',
            attempt: {
              id: currentAttempt.id, examId: currentAttempt.examId, examVersion: currentAttempt.examVersion,
              questionIds: currentAttempt.questionIds, seed: currentAttempt.seed, durationSeconds: currentAttempt.durationSeconds,
              startedAt: currentAttempt.startedAt, expiresAt: currentAttempt.expiresAt,
            },
            answers: answersRef.current,
          }),
        })
        const body = await response.json() as ApiAttemptResponse
        if (!response.ok || !body.attempt) throw new Error(messageFrom(body, 'Chưa nộp được bài thi.'))
        completed = body.attempt
      } else {
        const submittedAt = Date.now()
        const response = await fetch('/api/exams/trang-nguyen/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seed: currentAttempt.seed, examVersion: currentAttempt.examVersion, answers: answersRef.current }),
        })
        const body = await response.json() as { score?: number; correctCount?: number; message?: string }
        if (!response.ok || typeof body.score !== 'number' || typeof body.correctCount !== 'number')
          throw new Error(body.message ?? 'Chưa chấm được bài thi. Kiểm tra kết nối rồi thử lại nhé.')
        const status: ExamAttemptStatus = submittedAt >= currentAttempt.expiresAt ? 'expired' : 'submitted'
        completed = {
          ...currentAttempt,
          answers: answersRef.current,
          status,
          submittedAt,
          score: body.score,
          correctCount: body.correctCount,
          elapsedSeconds: Math.max(0, Math.min(currentAttempt.durationSeconds, Math.floor((submittedAt - currentAttempt.startedAt) / 1000))),
          updatedAt: submittedAt,
        }
      }
      setAttempt(completed)
      attemptRef.current = completed
      setAnswers(completed.answers ?? answersRef.current)
      writeLocalAttempt(completed, user?.id)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Chưa nộp được bài thi.')
    } finally {
      isSubmittingRef.current = false
      setSubmitting(false)
    }
  }, [stop, user])

  useEffect(() => {
    if (attempt?.status === 'in_progress' && remainingSeconds <= 0 && !isSubmittingRef.current) void submitExam()
  }, [attempt?.status, remainingSeconds, submitExam])

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
  }, [loadState, attempt?.id, currentPage, pageQuestions])

  useEffect(() => {
    const number = pendingScrollQuestion.current
    if (number === null || !pageQuestions.some(question => question.number === number)) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`question-${number}`)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
      pendingScrollQuestion.current = null
    })
    return () => window.cancelAnimationFrame(frame)
  }, [currentPage, pageQuestions])

  useEffect(() => {
    if (attempt?.status !== 'in_progress') return
    const persistDraftLocally = () => {
      const current = attemptRef.current
      if (!current || current.status !== 'in_progress') return
      writeLocalAttempt({ ...current, answers: answersRef.current, updatedAt: Date.now() }, user?.id)
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
  }, [attempt?.status, user])

  const changePage = useCallback((nextPage: number) => {
    const safePage = Math.max(0, Math.min(totalPages - 1, nextPage))
    if (safePage === currentPage) return
    pendingScrollQuestion.current = null
    setCurrentPage(safePage)
    setCurrentQuestion(safePage * QUESTIONS_PER_PAGE + 1)
    mainColumnRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [currentPage, totalPages])

  const navigateToQuestion = useCallback((number: number) => {
    if (!questions.some(question => question.number === number)) return
    const targetPage = Math.floor((number - 1) / QUESTIONS_PER_PAGE)
    setCurrentQuestion(number)
    setShowNavigator(false)
    if (targetPage === currentPage) {
      document.getElementById(`question-${number}`)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
      return
    }
    pendingScrollQuestion.current = number
    setCurrentPage(targetPage)
  }, [currentPage, questions])

  const beginNewExam = useCallback(() => {
    removeLocalAttempt(user?.id)
    setAttempt(null)
    attemptRef.current = null
    setQuestions([])
    setAnswers({})
    answersRef.current = {}
    setCurrentPage(0)
    setCurrentQuestion(1)
    setShowStartConfirm(false)
    setActionError(null)
    stop()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [stop, user?.id])

  const totalSeconds = attempt?.durationSeconds ?? MOCK_EXAM_DURATION_SECONDS

  if (loadState === 'loading') {
    return <><ExamHeader /><main className={`${styles.examPage} grid place-items-center px-4`}><p className="flex items-center gap-3 font-semibold text-[#555]"><LoaderCircle className="animate-spin" />Đang tải bài thi đã lưu…</p></main></>
  }
  if (loadState === 'error') {
    return <><ExamHeader /><main className={`${styles.examPage} grid place-items-center px-4`}><section className="max-w-lg rounded-lg border border-[#e8c9c6] bg-white p-6 text-center"><h1 className="text-xl font-semibold text-[#333]">Chưa mở được bài thi</h1><p role="alert" className="mt-2 text-sm text-red-700">{loadError}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 min-h-11 rounded-full bg-[#c72029] px-5 font-bold text-white">Tải lại trang</button></section></main></>
  }

  if (attempt && attempt.status !== 'in_progress') return <><ExamHeader /><ExamResult attempt={attempt} onNewExam={beginNewExam} /></>

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

      <div className={styles.examLayout}>
        <div ref={mainColumnRef} className={styles.mainColumn}>
          {questions.length > 0 ? <>
            <section className={styles.mainPanel}>
              {actionError && !showSubmitDialog && <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded border border-[#ead6b5] bg-[#fffaf0] px-3 py-2.5 text-sm font-semibold text-[#725b31]"><span>{actionError}</span>{attempt?.status === 'in_progress' && remainingSeconds === 0 && <button type="button" onClick={() => void submitExam()} disabled={submitting} className="shrink-0 underline">Thử nộp lại</button>}</div>}
              <div className={styles.questionList}>
                {pageQuestions.map(question => <QuestionRenderer
                  key={question.id}
                  question={question}
                  answer={answers[question.id]}
                  disabled={isReadOnly}
                  playingId={playingId}
                  onAnswer={updateAnswer}
                  onPlayAudio={play}
                />)}
              </div>
            </section>
            <nav className={styles.examPagination} aria-label="Phân trang câu hỏi">
              <button type="button" className={styles.paginationButton} disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}>
                <ChevronLeft size={18} />Trang trước
              </button>
              <span className={styles.paginationCurrent} aria-current="page" aria-label={`Trang ${currentPage + 1}`}>{currentPage + 1}</span>
              <button type="button" className={styles.paginationButton} disabled={currentPage >= totalPages - 1} onClick={() => changePage(currentPage + 1)}>
                Trang sau<ChevronRight size={18} />
              </button>
            </nav>
          </> : <section className={styles.startPreview}>
            <h1>Thi thử Trạng Nguyên Tiếng Việt lớp 1</h1>
            <p>Bài thi gồm 30 câu hỏi. Bé có 30 phút để hoàn thành bài thi.</p>
            <button type="button" className={styles.startButton} onClick={() => { setActionError(null); setShowStartConfirm(true) }}>Bắt đầu làm bài</button>
          </section>}
        </div>

        {questions.length > 0 && <ExamSidebar
          questions={questions}
          answers={answers}
          currentQuestion={currentQuestion}
          remainingSeconds={preview ? totalSeconds : remainingSeconds}
          disabled={!attempt || !editable}
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
            <button type="button" disabled={!editable} onClick={() => { setShowNavigator(false); setShowSubmitDialog(true) }} className="mt-5 min-h-12 w-full rounded-xl bg-red-700 px-5 font-extrabold text-white hover:bg-red-800 disabled:opacity-50">NỘP BÀI</button>
          </div>
        </section>
      </div>}
      {showSubmitDialog && <SubmitExamDialog answeredCount={answeredCount} submitting={submitting} error={actionError} onCancel={() => { setShowSubmitDialog(false); setActionError(null) }} onSubmit={() => void submitExam()} />}
    </main>
    </>
  )
}
