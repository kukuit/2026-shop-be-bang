'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import type { ExamAnswer, ExamAnswers, LowerUpperMatchData } from '../../_exam/types'
import type { TestExamQuestion } from '../_components/test-types'
import { useExamAudio } from '../../_hooks/useExamAudio'
import TestQuestionRenderer from '../_components/TestQuestionRenderer'
import styles from '../../_components/exam.module.css'

export default function QuestionSeventeenTestClient({ questions }: { questions: TestExamQuestion[] }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<ExamAnswers>({})
  const { playingId, play, stop } = useExamAudio()

  const regenerate = () => {
    stop()
    setAnswers({})
    router.refresh()
  }

  const updateAnswer = (questionId: string, answer: ExamAnswer) => {
    setAnswers(current => ({ ...current, [questionId]: answer }))
  }

  return <main className={`${styles.examPage} px-3 py-5 sm:px-5 sm:py-8`}>
    <div className="mx-auto max-w-5xl">
      <section className="mb-5 flex flex-col justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:p-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Kiểm tra generator câu 17</h1>
          <p className="mt-1 text-sm leading-6 text-slate-700">Mỗi lượt có ba chữ thường bên trái và chữ hoa tương ứng bên phải trên hai nền con vật khác nhau. Kéo cả thẻ bên trái sang thẻ bên phải; dùng nút × để bỏ cặp đã chọn.</p>
        </div>
        <button type="button" onClick={regenerate} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 font-bold text-white hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
          <RefreshCw size={17} /> Tạo lại 10 câu
        </button>
      </section>

      <section className={styles.mainPanel}>
        <div className={styles.questionList}>
          {questions.map(question => {
            const data = question.data as LowerUpperMatchData
            return <div key={question.id} className="scroll-mt-4">
              <TestQuestionRenderer
                question={question}
                answer={answers[question.id]}
                disabled={false}
                playingId={playingId}
                onAnswer={updateAnswer}
                onPlayAudio={play}
              />
              <div className="-mt-3 mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 sm:text-sm">
                <span>Nền trái: <strong className="text-slate-800">{data.leftBackgroundId}</strong></span>
                <span>Nền phải: <strong className="text-slate-800">{data.rightBackgroundId}</strong></span>
                <span>Ba chữ: <strong className="text-slate-800">{data.letters.join(', ')}</strong></span>
                <span>Voice câu hỏi: <strong className={data.questionVoiceAvailable ? 'text-emerald-700' : 'text-amber-700'}>{data.questionVoiceAvailable ? 'đã có voice' : 'chưa có voice'}</strong></span>
              </div>
            </div>
          })}
        </div>
      </section>
    </div>
  </main>
}
