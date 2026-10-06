'use client'

import type { ReactNode } from 'react'
import type { ExamQuestion } from '../../_exam/types'
import ExamAudioButton from '../ExamAudioButton'
import styles from '../exam.module.css'

export type QuestionRendererProps = {
  question: ExamQuestion
  answer?: import('../../_exam/types').ExamAnswer
  disabled: boolean
  playingId: string | null
  onAnswer(questionId: string, answer: import('../../_exam/types').ExamAnswer): void
  onPlayAudio(id: string, src: string | readonly string[]): void
}

export default function QuestionFrame({ question, children, playingId, onPlayAudio }: QuestionRendererProps & { children: ReactNode }) {
  const promptAudioId = `${question.id}:prompt`
  return <section id={`question-${question.number}`} data-question-id={question.id} data-question-number={question.number} className={`exam-question ${styles.examQuestion}`} aria-labelledby={`${question.id}-title`}>
    <div className={styles.questionHeading}>
      <div className="min-w-0">
        <h2 id={`${question.id}-title`} className={styles.questionTitle}>Câu hỏi {question.number}</h2>
        <p className={styles.questionPrompt}>{question.prompt}</p>
      </div>
      {question.promptVoice && <ExamAudioButton
        active={playingId === promptAudioId}
        label={`Nghe nội dung câu ${question.number}`}
        onClick={() => onPlayAudio(promptAudioId, question.promptVoice!)}
      />}
    </div>
    {children}
  </section>
}
