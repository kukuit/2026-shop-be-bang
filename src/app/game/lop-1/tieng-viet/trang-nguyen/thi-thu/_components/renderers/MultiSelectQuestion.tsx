'use client'

import QuestionFrame, { type QuestionRendererProps } from './QuestionFrame'
import QuestionVisual from './QuestionVisual'
import LetterBoard from './LetterBoard'
import type { LetterBoardData } from '../../_exam/types'
import styles from '../exam.module.css'

export default function MultiSelectQuestion(props: QuestionRendererProps) {
  const { question, answer, disabled, onAnswer } = props
  const selected = Array.isArray(answer) ? answer : []
  const visuals = question.content?.type === 'visuals' ? question.content.visuals : []
  const letterBoardQuestion = question.data?.generator === 'RECOGNIZE_LETTERS_IN_IMAGE'
  const letterBoard = letterBoardQuestion ? question.data?.board as LetterBoardData | undefined : undefined
  return <QuestionFrame {...props}>
    {letterBoard && <div className={styles.letterBoardStage}><LetterBoard board={letterBoard} /></div>}
    {visuals && visuals.length > 0 && <div className="my-4 flex flex-wrap justify-center gap-2 rounded-xl bg-slate-50 p-4">{visuals.map((visual, index) => <QuestionVisual key={`${visual.value}-${index}`} visual={visual} />)}</div>}
    <div role="group" aria-label={`Chọn nhiều đáp án cho câu ${question.number}`} className={`${letterBoardQuestion ? 'mt-4 grid gap-1 sm:grid-cols-1' : 'mt-4 grid gap-2 sm:grid-cols-2'}`}>
      {(question.options ?? []).map(option => {
        const checked = selected.includes(option.id)
        const checkbox = <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-label={option.text ?? `Đáp án ${option.label}`}
          onChange={() => onAnswer(question.id, checked ? selected.filter(id => id !== option.id) : [...selected, option.id])}
          className="h-5 w-5 accent-blue-600"
        />
        const content = <>
          {checkbox}
          <span className="w-7 shrink-0 font-bold">{option.label}.</span>
          {option.visual && <QuestionVisual visual={option.visual} compact />}
          {option.text && (!option.visual || option.visual.value.normalize('NFC') !== option.text.normalize('NFC')) && <span className="text-lg font-semibold">{option.text}</span>}
        </>
        if (letterBoardQuestion) return <div key={option.id} className={`${styles.letterBoardAnswerRow} ${checked ? styles.letterBoardAnswerRowChecked : ''} ${disabled ? styles.letterBoardAnswerRowDisabled : ''}`}>
          {content}
        </div>
        return <label key={option.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${checked ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'} ${disabled ? 'cursor-default opacity-70' : ''}`}>
          {content}
        </label>
      })}
    </div>
  </QuestionFrame>
}
