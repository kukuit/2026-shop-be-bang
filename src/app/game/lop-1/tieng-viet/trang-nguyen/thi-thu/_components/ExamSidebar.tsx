'use client'

import { Send } from 'lucide-react'
import type { ExamAnswers, ExamQuestion } from '../_exam/types'
import ExamTimer from './ExamTimer'
import QuestionNavigator from './QuestionNavigator'
import styles from './exam.module.css'

export default function ExamSidebar({
  questions,
  answers,
  currentQuestion,
  remainingSeconds,
  disabled,
  onNavigate,
  onSubmit,
}: {
  questions: ExamQuestion[]
  answers: ExamAnswers
  currentQuestion: number
  remainingSeconds: number
  disabled: boolean
  onNavigate(number: number): void
  onSubmit(): void
}) {
  return (
    <aside className={styles.examSidebar}>
      <div className={styles.sidebarCard}>
        <ExamTimer remainingSeconds={remainingSeconds} />
        <div className={styles.sidebarQuestions}>
          <p className={styles.sidebarHeading}>Câu hỏi</p>
          <QuestionNavigator questions={questions} answers={answers} currentQuestion={currentQuestion} disabled={disabled} onNavigate={onNavigate} />
        </div>
        <button type="button" disabled={disabled} onClick={onSubmit} className={styles.submitButton}>
          <Send size={16} /> Nộp bài
        </button>
      </div>
    </aside>
  )
}

