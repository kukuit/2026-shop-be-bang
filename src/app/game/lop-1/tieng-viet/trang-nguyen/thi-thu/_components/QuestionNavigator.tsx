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
}: {
  questions: ExamQuestion[]
  answers: ExamAnswers
  currentQuestion: number
  disabled: boolean
  onNavigate(number: number): void
}) {
  return (
    <nav aria-label="Điều hướng câu hỏi" className={styles.questionNavigator}>
      {questions.map(question => {
        const number = question.number
        const answered = isQuestionAnswered(question, answers[question.id])
        return <button
          key={question.id}
          type="button"
          aria-label={`Đi tới câu ${number}${answered ? ', đã trả lời' : ', chưa trả lời'}`}
          aria-current={currentQuestion === number ? 'location' : undefined}
          disabled={disabled}
          onClick={() => onNavigate(number)}
          className={`${styles.questionNumber} ${answered ? styles.questionNumberAnswered : ''} ${currentQuestion === number ? styles.questionNumberCurrent : ''}`}
        >{number}</button>
      })}
    </nav>
  )
}

export default memo(QuestionNavigator)

