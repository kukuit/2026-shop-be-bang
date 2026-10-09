'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import type { ExamAnswer, ExamAnswers, ExamQuestion } from '../_exam/types'
import type { SubmittedTrangNguyenAttempt } from '../_lib/local-attempt'
import { isQuestionAnswered } from '../_exam/answer-utils'
import QuestionRenderer from './QuestionRenderer'
import QuestionNavigator from './QuestionNavigator'
import { useExamAudio } from '../_hooks/useExamAudio'
import styles from './exam.module.css'

const QUESTIONS_PER_PAGE = 5

function answerLabels(question: ExamQuestion) {
  const labels = new Map<string, string>()
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return }
    if (!value || typeof value !== 'object') return
    const item = value as Record<string, unknown>
    if (typeof item.id === 'string') {
      const text = [item.text, item.label, item.word, item.letter, item.value]
        .find(candidate => typeof candidate === 'string' && candidate.length > 0)
      if (typeof text === 'string') labels.set(item.id, text)
    }
    Object.values(item).forEach(visit)
  }
  visit(question.options)
  visit(question.data)
  visit(question.content)
  return labels
}

function answerText(question: ExamQuestion, answer: ExamAnswer | null, labels: Map<string, string>) {
  if (answer === null || (typeof answer === 'string' && !answer.trim())
    || (Array.isArray(answer) && answer.length === 0)
    || (!Array.isArray(answer) && typeof answer === 'object' && Object.keys(answer).length === 0)) return 'Chưa trả lời'
  const valueText = (value: string) => labels.get(value) ?? question.options?.find(option => option.id === value)?.text
    ?? question.options?.find(option => option.id === value)?.label ?? value
  if (typeof answer === 'string') return valueText(answer)
  if (Array.isArray(answer)) return answer.map(valueText).join(', ')
  return Object.entries(answer).map(([key, value]) => `${valueText(key)} → ${valueText(value)}`).join('; ')
}

export default function AttemptReview({ attempt, onBack }: { attempt: SubmittedTrangNguyenAttempt; onBack(): void }) {
  const [filter, setFilter] = useState<'all' | 'wrong'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const { playingId, play, volume, setVolume } = useExamAudio()
  const answers: ExamAnswers = useMemo(() => Object.fromEntries(
    attempt.questions.filter(question => question.userAnswer !== null).map(question => [question.id, question.userAnswer!]),
  ), [attempt.questions])
  const filteredQuestions = filter === 'wrong'
    ? attempt.questions.filter(question => !question.isCorrect && isQuestionAnswered(question.snapshot, question.userAnswer ?? undefined))
    : attempt.questions
  const pageCount = Math.max(1, Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE))
  const visibleQuestions = filteredQuestions.slice((currentPage - 1) * QUESTIONS_PER_PAGE, currentPage * QUESTIONS_PER_PAGE)
  const navigate = (number: number) => {
    const index = filteredQuestions.findIndex(question => question.order === number)
    if (index < 0) return
    setCurrentPage(Math.floor(index / QUESTIONS_PER_PAGE) + 1)
    setCurrentQuestion(number)
    window.setTimeout(() => document.getElementById(`review-question-${number}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }
  const changePage = (page: number) => {
    if (page < 1 || page > pageCount) return
    const next = filteredQuestions[(page - 1) * QUESTIONS_PER_PAGE]
    setCurrentPage(page)
    if (next) setCurrentQuestion(next.order)
  }

  return (
    <main className={styles.examPage}>
      <div className={styles.examLayout}>
        <section className={styles.mainColumn}>
          <div className={styles.mainPanel}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-black text-slate-900">Xem lại bài thi</h1>
                <p className="mt-1 text-sm text-slate-600">Câu đúng màu xanh, câu sai màu đỏ, câu bỏ trống màu xám.</p>
              </div>
              <button type="button" onClick={onBack} className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">Về trang thi thử</button>
            </div>
            <div className="mb-5 flex gap-2" role="group" aria-label="Lọc câu hỏi">
              <button type="button" onClick={() => { setFilter('all'); setCurrentPage(1) }} aria-pressed={filter === 'all'} className={`rounded-full px-4 py-2 text-sm font-bold ${filter === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'}`}>Tất cả ({attempt.questions.length})</button>
              <button type="button" onClick={() => { setFilter('wrong'); setCurrentPage(1); setCurrentQuestion(attempt.questions.find(question => !question.isCorrect && isQuestionAnswered(question.snapshot, question.userAnswer ?? undefined))?.order ?? 1) }} aria-pressed={filter === 'wrong'} className={`rounded-full px-4 py-2 text-sm font-bold ${filter === 'wrong' ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-700'}`}>Câu sai ({attempt.wrongCount})</button>
            </div>
            <QuestionNavigator
              questions={filteredQuestions.map(item => item.snapshot)}
              answers={answers}
              currentQuestion={currentQuestion}
              disabled={false}
              onNavigate={navigate}
              statuses={Object.fromEntries(attempt.questions.map(question => [question.order, !isQuestionAnswered(question.snapshot, question.userAnswer ?? undefined) ? 'unanswered' : question.isCorrect ? 'correct' : 'wrong']))}
            />
            {visibleQuestions.length === 0 ? <p className="rounded-xl bg-slate-50 p-6 text-center font-semibold text-slate-600">Không có câu sai trong bài thi này.</p> : <div className={`${styles.questionList} ${styles.reviewQuestionList}`}>
              {visibleQuestions.map(result => {
                const labels = answerLabels(result.snapshot)
                return <article id={`review-question-${result.order}`} key={result.id} className={`${styles.reviewQuestion} rounded-xl border border-slate-200 bg-white p-3 sm:p-5`}>
                  <div className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-extrabold ${!isQuestionAnswered(result.snapshot, result.userAnswer ?? undefined) ? 'bg-slate-100 text-slate-600' : result.isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                    {!isQuestionAnswered(result.snapshot, result.userAnswer ?? undefined) ? <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-300 text-xs text-white">{result.order}</span> : result.isCorrect ? <CheckCircle2 size={19} /> : <XCircle size={19} />}
                    {!isQuestionAnswered(result.snapshot, result.userAnswer ?? undefined) ? `Câu ${result.order} · Chưa hoàn thành` : result.isCorrect ? `Câu ${result.order} · Trả lời đúng` : `Câu ${result.order} · Trả lời sai`}
                  </div>
                  <QuestionRenderer
                    question={result.snapshot}
                    answer={result.userAnswer ?? undefined}
                    disabled
                    playingId={playingId}
                    audioVolume={volume}
                    onAudioVolumeChange={setVolume}
                    onAnswer={() => {}}
                    onPlayAudio={play}
                  />
                  <div className="mt-4 grid gap-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2">
                    <p className="text-slate-700"><strong>Bé chọn:</strong> {answerText(result.snapshot, result.userAnswer, labels)}</p>
                    <p className="font-semibold text-emerald-800"><strong>Đáp án đúng:</strong> {answerText(result.snapshot, result.correctAnswer, labels)}</p>
                  </div>
                </article>
              })}
            </div>}
            <nav className={styles.examPagination} aria-label="Phân trang xem lại">
              <button type="button" className={styles.paginationButton} disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}><ArrowLeft size={14} /><span>Trang trước</span></button>
              <span className={styles.paginationCurrent} aria-current="page">{currentPage} / {pageCount}</span>
              <button type="button" className={styles.paginationButton} disabled={currentPage >= pageCount} onClick={() => changePage(currentPage + 1)}><span>Trang sau</span><ArrowRight size={14} /></button>
            </nav>
          </div>
        </section>
        <aside className={styles.examSidebar}>
          <div className={styles.sidebarCard}>
            <h2 className="text-center text-lg font-black text-slate-800">Kết quả</h2>
            <p className="mt-3 text-center text-3xl font-black text-blue-800">{attempt.score} điểm</p>
            <p className="mt-1 text-center text-sm font-bold text-emerald-800">{attempt.correctCount}/{attempt.questions.length} câu đúng</p>
            <div className="mt-5"><QuestionNavigator questions={filteredQuestions.map(item => item.snapshot)} answers={answers} currentQuestion={currentQuestion} disabled={false} onNavigate={navigate} statuses={Object.fromEntries(attempt.questions.map(question => [question.order, !isQuestionAnswered(question.snapshot, question.userAnswer ?? undefined) ? 'unanswered' : question.isCorrect ? 'correct' : 'wrong']))} /></div>
          </div>
        </aside>
      </div>
    </main>
  )
}
