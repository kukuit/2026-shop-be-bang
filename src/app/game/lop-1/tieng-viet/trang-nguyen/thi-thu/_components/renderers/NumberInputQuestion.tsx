'use client'

import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'
import NumberCard from './NumberCard'
import type { NumberCardData } from '../../_exam/types'
import styles from '../exam.module.css'

export default function NumberInputQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const grid = question.data?.grid as string[] | undefined
  const numberCardQuestion = question.data?.generator === 'RECOGNIZE_NUMBER_ON_CARD'
  const numberCard = numberCardQuestion ? question.data?.card as NumberCardData | undefined : undefined
  const displayedAnswer = typeof answer === 'string' ? answer : ''
  const maxLength = numberCard ? String(numberCard.value).length : 3
  return <QuestionFrame {...props}>
    {numberCard && <div className={styles.numberCardStage}><NumberCard card={numberCard} /></div>}
    {question.content?.type === 'visuals' && question.content.visuals && <div className="my-4 flex flex-wrap justify-center gap-1 rounded-xl bg-slate-50 p-4">{question.content.visuals.map((visual, index) => <QuestionVisual key={index} visual={visual} compact />)}</div>}
    {grid && <div className="my-4 mx-auto grid max-w-xs grid-cols-4 gap-2 rounded-xl bg-slate-50 p-4" aria-label="Bảng chữ cái cần đếm">{grid.map((letter, index) => <span key={`${letter}-${index}`} className={`grid h-12 place-items-center rounded-lg bg-white text-xl font-black shadow-sm ${letter === question.data?.targetLetter ? 'text-blue-700' : 'text-slate-700'}`}>{letter}</span>)}</div>}
    {numberCardQuestion ? <div className={styles.numberCardAnswerRow}>
      <label htmlFor={`${question.id}-number-answer`}>số</label>
      <input
        id={`${question.id}-number-answer`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={maxLength}
        disabled={disabled}
        value={displayedAnswer}
        onChange={event => onAnswer(question.id, event.target.value.replace(/\D/g, '').slice(0, maxLength))}
        className={styles.numberCardAnswerInput}
        aria-label={`Nhập số cho câu ${question.number}`}
      />
    </div> : <label className="mt-4 block max-w-xs">
      <span className="mb-2 block text-sm font-bold text-slate-700">Nhập số</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        disabled={disabled}
        value={typeof answer === 'string' ? answer : ''}
        onChange={event => { if (/^\d*$/.test(event.target.value)) onAnswer(question.id, event.target.value) }}
        className={styles.numberCardAnswerInput}
        aria-label={`Nhập số cho câu ${question.number}`}
      />
    </label>}
  </QuestionFrame>
}
