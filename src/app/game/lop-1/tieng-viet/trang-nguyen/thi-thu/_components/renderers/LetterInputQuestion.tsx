'use client'

import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import LetterCard from './LetterCard'
import { sanitizeSingleVietnameseLetter } from '../../_exam/answer-utils'
import type { LetterCardData } from '../../_exam/types'
import styles from '../exam.module.css'

export default function LetterInputQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const card = question.data?.target as LetterCardData | undefined
  const allowedLetters = Array.isArray(question.data?.allowedLetters)
    ? question.data.allowedLetters.filter((letter): letter is string => typeof letter === 'string')
    : []
  const displayedAnswer = typeof answer === 'string' ? answer : ''

  return <QuestionFrame {...props}>
    {card && <div className={styles.letterCardStage}><LetterCard card={card} /></div>}
    <div className={styles.numberCardAnswerRow}>
      <label htmlFor={`${question.id}-letter-answer`}>chữ</label>
      <input
        id={`${question.id}-letter-answer`}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={2}
        disabled={disabled}
        value={displayedAnswer}
        onChange={event => onAnswer(question.id, sanitizeSingleVietnameseLetter(event.target.value, allowedLetters))}
        className={styles.numberCardAnswerInput}
        aria-label={`Nhập chữ cái cho câu ${question.number}`}
      />
    </div>
  </QuestionFrame>
}
