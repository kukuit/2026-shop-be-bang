'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import type { ExamAnswer, ExamAnswers, GeneratedExamQuestion } from '../../_exam/types'
import { useExamAudio } from '../../_hooks/useExamAudio'
import TestQuestionRenderer from '../_components/TestQuestionRenderer'
import styles from '../../_components/exam.module.css'

export default function QuestionSevenTestClient({ questions }: { questions: GeneratedExamQuestion[] }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<ExamAnswers>({})
  const { playingId, play, stop } = useExamAudio()
  const displayQuestions = useMemo(() => questions.map(({ correctAnswer, ...question }) => ({ ...question, testAnswer: correctAnswer })), [questions])

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
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Kiểm tra generator câu 7</h1>
          <p className="mt-1 text-sm leading-6 text-slate-700">Mỗi lượt tạo 10 câu tìm con vật theo tên được đọc. Bấm loa câu hỏi để nghe hướng dẫn và tên con vật; đáp án chỉ hiển thị hình.</p>
        </div>
        <button type="button" onClick={regenerate} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 font-bold text-white hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
          <RefreshCw size={17} /> Tạo lại 10 câu
        </button>
      </section>

      <section className={styles.mainPanel}>
        <div className={styles.questionList}>
          {displayQuestions.map((question, index) => {
            const generated = questions[index]
            const data = generated.data as { targetWord?: string } | undefined
            const promptVoices = Array.isArray(generated.promptVoice) ? generated.promptVoice : []
            const animalVoiceFile = promptVoices[1]?.slice(promptVoices[1].lastIndexOf('/') + 1)

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
                <span>Generator: <strong className="text-slate-800">FIND_ANIMAL_BY_NAME</strong></span>
                <span>Con vật được đọc: <strong className="text-slate-800">{data?.targetWord}</strong></span>
                <span>Voice: <strong className="text-emerald-700">dau-la-con → {animalVoiceFile}</strong></span>
              </div>
            </div>
          })}
        </div>
      </section>
    </div>
  </main>
}
