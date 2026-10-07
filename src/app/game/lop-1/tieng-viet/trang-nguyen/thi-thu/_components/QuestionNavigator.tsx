'use client'

import { memo } from 'react'
import { isQuestionAnswered } from '../_exam/answer-utils'
import type { ExamAnswers, ExamQuestion } from '../_exam/types'
import styles from './exam.module.css'

function QuestionNavigator({
  questions,
  answers,
  currentQuestion,
  disabled,
  onNavigate,
  statuses,
}: {
  questions: ExamQuestion[]
  answers: ExamAnswers
  currentQuestion: number
  disabled: boolean
  onNavigate(number: number): void
  statuses?: Record<number, 'correct' | 'wrong' | 'unanswered'>
}) {
  return (
    <nav aria-label="Điều hướng câu hỏi" className={styles.questionNavigator}>
      {questions.map(question => {
        const number = question.number
        const answered = isQuestionAnswered(question, answers[question.id])
        const status = statuses?.[number]
        const statusClass = status === 'correct'
          ? ' !border-emerald-300 !bg-emerald-100 !text-emerald-900'
          : status === 'wrong'
            ? ' !border-red-300 !bg-red-100 !text-red-900'
            : status === 'unanswered'
              ? ' !border-slate-300 !bg-slate-100 !text-slate-600'
              : ''
        return <button
          key={question.id}
          type="button"
          aria-label={`Đi tới câu ${number}${status ? status === 'correct' ? ', đúng' : status === 'wrong' ? ', sai' : ', bỏ trống' : answered ? ', đã trả lời' : ', chưa trả lời'}`}
          aria-current={currentQuestion === number ? 'location' : undefined}
          disabled={disabled}
          onClick={() => onNavigate(number)}
          className={`${styles.questionNumber} ${answered ? styles.questionNumberAnswered : ''} ${currentQuestion === number ? styles.questionNumberCurrent : ''}${statusClass}`}
        >{number}</button>
      })}
    </nav>
  )
}

export default memo(QuestionNavigator)

